import { Request, Response } from 'express';
import { Enrollment } from '../models/enrollment';
import { Student } from '../models/student';
import { Course } from '../models/course';
import { User } from '../models/user';
import certifierService from '../services/certifier';
import { sendEmail } from '../utils/mailer';
import { renderCertificateIssuedHtml } from '../utils/emailTemplates';
import mongoose from 'mongoose';
import path from 'path';

// Dynamic group selection is now handled in the Certifier service
// Groups are automatically selected based on course name:
// - Courses with "director" → AGI-Director group (01k7s2jdz7x947af5s80xpfqnm)
// - Courses with "manager" → AGI-Manager group (01k7rrxc2fddy1bkbsx0rt3tgv)
// - Courses with "professional" → AGI-Professional group (01k6fv17x6fw24jgpnvbqervt6)
// - Default → AGI-Professional group (01k6fv17x6fw24jgpnvbqervt6)

/**
 * Issue a certificate for a passed final exam
 * This is called internally when a student passes their final exam
 */
export const issueCertificateForPassedExam = async (
  studentId: mongoose.Types.ObjectId,
  courseSlug: string,
  attemptNumber: number,
  score: number,
  gradedBy: string
): Promise<{ success: boolean; message: string; certificateId?: string }> => {
  try {
    console.log(`🎓 Attempting to issue certificate for student ${studentId}, course ${courseSlug}, attempt ${attemptNumber}`);

    // Group ID will be dynamically selected by the Certifier service based on course name
    // We pass a placeholder that will be overridden by the service
    const certifierGroupId = 'dynamic'; // This will be replaced by selectGroupId() in the service

    // Get student and course details
    const [student, course, enrollment] = await Promise.all([
      Student.findById(studentId).populate('userId'),
      Course.findOne({ slug: courseSlug }),
      Enrollment.findOne({ studentId, courseSlug })
    ]);

    if (!student || !course || !enrollment) {
      return {
        success: false,
        message: 'Student, course, or enrollment not found'
      };
    }

    const user = student.userId as any;
    if (!user || !user.email) {
      return {
        success: false,
        message: 'Student user details not found'
      };
    }

    // Check if certificate already exists for this attempt
    const existingCertificate = enrollment.certificates.find(
      cert => cert.courseSlug === courseSlug && cert.attemptNumber === attemptNumber
    );

    if (existingCertificate) {
      console.log(`ℹ️  Certificate already exists for this attempt: ${existingCertificate.certificateId}`);
      console.log(`🔄 Score changed or re-grading detected - issuing new certificate`);
      
      // Mark existing certificate as superseded
      existingCertificate.status = 'superseded';
      existingCertificate.metadata = {
        ...existingCertificate.metadata,
        supersededAt: new Date().toISOString(),
        supersededReason: 'Score updated or re-graded'
      };
    }

    // Issue certificate via Certifier.io
    const certifierResponse = await certifierService.issueCertificate(
      certifierGroupId,
      {
        name: student.name,
        email: user.email,
        courseTitle: course.title,
        courseSlug: courseSlug,
        completionDate: new Date().toISOString().split('T')[0],
        score: score
      }
    );

    if (!certifierResponse.success) {
      console.error(`❌ Failed to issue certificate via Certifier.io:`, certifierResponse.error);
      return {
        success: false,
        message: certifierResponse.error || 'Failed to issue certificate via Certifier.io'
      };
    }

    // Store certificate details in enrollment
    const certificateData = {
      certificateId: certifierResponse.certificateId!,
      certificateUrl: certifierResponse.certificateUrl!,
      issuedAt: new Date(),
      issuedBy: gradedBy,
      courseSlug: courseSlug,
      courseName: course.title,
      studentName: student.name,
      studentEmail: user.email,
      finalScore: score,
      attemptNumber: attemptNumber,
      certifierGroupId: certifierGroupId,
      status: 'issued' as const,
      metadata: {
        verificationUrl: certifierResponse.certificateUrl
      }
    };

    enrollment.certificates.push(certificateData);
    await enrollment.save();

    // Send certificate email notification to student
    try {
      const dashboardUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
      const emailHtml = renderCertificateIssuedHtml({
        studentName: student.name,
        courseTitle: course.title,
        certificateUrl: certifierResponse.certificateUrl!,
        finalScore: score,
        issuedDate: new Date(),
        dashboardUrl
      });

      console.log(`📧 Attempting to send certificate email to ${user.email}...`);
      
      const emailResult = await sendEmail(
        [{ email: user.email, name: student.name }],
        `🎓 Certificate Issued - ${course.title}`,
        emailHtml
      );

      console.log(`✅ Certificate email sent successfully to ${user.email} for course: ${course.title}`);
    } catch (emailError) {
      console.error('❌ Failed to send certificate email:', emailError);
      // Don't fail certificate issuance if email fails
    }

    console.log(`✅ Certificate issued successfully:`, {
      certificateId: certifierResponse.certificateId,
      student: student.name,
      course: course.title,
      score: score
    });

    return {
      success: true,
      message: 'Certificate issued successfully',
      certificateId: certifierResponse.certificateId
    };

  } catch (error: any) {
    console.error('❌ Error issuing certificate:', error);
    return {
      success: false,
      message: error.message || 'Internal error while issuing certificate'
    };
  }
};

/**
 * Get all certificates for a student
 */
export const getStudentCertificates = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Not authenticated' });
    }

    // Find student
    const student = await Student.findOne({ userId: req.user.id });
    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }

    // Get all enrollments with certificates
    const enrollments = await Enrollment.find({ 
      studentId: student._id,
      certificates: { $exists: true, $ne: [] }
    }).select('courseSlug certificates');

    // Flatten certificates from all enrollments
    const allCertificates = enrollments.flatMap(enrollment => 
      enrollment.certificates.map(cert => ({
        ...cert.toObject(),
        _id: cert._id
      }))
    );

    // Sort by most recent first
    allCertificates.sort((a, b) => 
      new Date(b.issuedAt).getTime() - new Date(a.issuedAt).getTime()
    );

    res.status(200).json({
      certificates: allCertificates,
      total: allCertificates.length
    });

  } catch (error) {
    console.error('Get student certificates error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Get certificates for a specific course (student view)
 */
export const getCourseCertificates = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Not authenticated' });
    }

    const { courseSlug } = req.params;

    // Find student
    const student = await Student.findOne({ userId: req.user.id });
    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }

    // Get enrollment with certificates for this course
    const enrollment = await Enrollment.findOne({ 
      studentId: student._id,
      courseSlug: courseSlug
    }).select('certificates');

    if (!enrollment) {
      return res.status(404).json({ message: 'Enrollment not found' });
    }

    // Filter certificates for this course
    const courseCertificates = enrollment.certificates.filter(
      cert => cert.courseSlug === courseSlug
    );

    // Sort by most recent first
    courseCertificates.sort((a, b) => 
      new Date(b.issuedAt).getTime() - new Date(a.issuedAt).getTime()
    );

    res.status(200).json({
      certificates: courseCertificates,
      total: courseCertificates.length
    });

  } catch (error) {
    console.error('Get course certificates error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Admin/Teacher: Get all issued certificates
 */
export const getAllIssuedCertificates = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Not authenticated' });
    }

    const { courseSlug, status, page = 1, limit = 50 } = req.query;
    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);

    // Build query
    const matchQuery: any = {
      certificates: { $exists: true, $ne: [] }
    };

    if (courseSlug) {
      matchQuery['certificates.courseSlug'] = courseSlug;
    }

    // Get enrollments with certificates
    const enrollments = await Enrollment.find(matchQuery)
      .select('studentId courseSlug certificates')
      .populate({
        path: 'studentId',
        select: 'name userId',
        populate: {
          path: 'userId',
          select: 'email'
        }
      })
      .skip(skip)
      .limit(parseInt(limit as string));

    // Flatten and format certificates
    const allCertificates = [];
    for (const enrollment of enrollments) {
      for (const cert of enrollment.certificates) {
        // Filter by status if specified
        if (status && cert.status !== status) continue;

        allCertificates.push({
          ...cert.toObject(),
          student: {
            name: (enrollment.studentId as any).name,
            email: (enrollment.studentId as any).userId.email
          }
        });
      }
    }

    // Sort by most recent first
    allCertificates.sort((a, b) => 
      new Date(b.issuedAt).getTime() - new Date(a.issuedAt).getTime()
    );

    res.status(200).json({
      certificates: allCertificates,
      total: allCertificates.length,
      page: parseInt(page as string),
      limit: parseInt(limit as string)
    });

  } catch (error) {
    console.error('Get all certificates error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Test Certifier.io connection and get available groups
 */
export const testCertifierConnection = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Not authenticated' });
    }

    // Check if user is admin
    const user = await User.findById(req.user.id);
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ message: 'Admin access required' });
    }

    // Test connection
    const isConnected = await certifierService.verifyConnection();
    
    // Get available groups
    const groups = await certifierService.getGroups();

    res.status(200).json({
      connected: isConnected,
      groups: groups,
      dynamicGroupSelection: {
        'director/directors': '01k7s2jdz7x947af5s80xpfqnm', // AGI-Director
        'manager/managers': '01k7rrxc2fddy1bkbsx0rt3tgv', // AGI-Manager
        'professional/professionals': '01k6fv17x6fw24jgpnvbqervt6', // AGI-Professional
        'default': '01k6fv17x6fw24jgpnvbqervt6' // AGI-Professional (default)
      },
      message: isConnected 
        ? 'Certifier.io connection successful with dynamic group selection' 
        : 'Certifier.io connection failed'
    });

  } catch (error) {
    console.error('Test certifier connection error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export default {
  issueCertificateForPassedExam,
  getStudentCertificates,
  getCourseCertificates,
  getAllIssuedCertificates,
  testCertifierConnection
};
