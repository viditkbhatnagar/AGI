import { Request, Response } from 'express';
import { User } from '../models/user';
import { Student } from '../models/student';
import { TeacherAssignment } from '../models/teacher-assignment';
import { Course } from '../models/course';
import { Enrollment } from '../models/enrollment';
import { LiveClass } from '../models/liveclass';
import { Recording } from '../models/recording';
import FinalExamination from '../models/finalExamination';
import mongoose from 'mongoose';

// Get teacher dashboard data
export const getTeacherDashboard = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Not authenticated' });
    }

    const teacherId = new mongoose.Types.ObjectId(req.user.id);
    
    // Get teacher's assigned courses
    const assignments = await TeacherAssignment.find({ teacherId }).populate('teacherId', 'username email');
    const courseSlugs = assignments.map(a => a.courseSlug);

    // Get course details
    const courses = await Course.find({ slug: { $in: courseSlugs } });

    // Get students enrolled in teacher's courses
    const enrollments = await Enrollment.find({ courseSlug: { $in: courseSlugs } })
      .populate('studentId', 'name phone pathway');

    // Get upcoming live classes for teacher's courses
    const upcomingLiveClasses = await LiveClass.find({
      courseSlug: { $in: courseSlugs },
      startTime: { $gt: new Date() }
    }).sort({ startTime: 1 }).limit(5);

    // Get recent recordings for teacher's courses
    const recentRecordings = await Recording.find({ 
      courseSlug: { $in: courseSlugs },
      isVisible: true 
    }).sort({ uploadedAt: -1 }).limit(10);

    // Aggregate stats
    const totalStudents = enrollments.length;
    const totalCourses = courses.length;
    const totalLiveClasses = await LiveClass.countDocuments({ courseSlug: { $in: courseSlugs } });

    res.json({
      assignments,
      courses,
      enrollments,
      upcomingLiveClasses,
      recentRecordings,
      stats: {
        totalStudents,
        totalCourses,
        totalLiveClasses,
        totalUpcoming: upcomingLiveClasses.length
      }
    });
  } catch (error) {
    console.error('Teacher dashboard error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get teacher's assigned courses
export const getTeacherCourses = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Not authenticated' });
    }

    const teacherId = new mongoose.Types.ObjectId(req.user.id);
    const assignments = await TeacherAssignment.find({ teacherId });
    const courseSlugs = assignments.map(a => a.courseSlug);
    
    const courses = await Course.find({ slug: { $in: courseSlugs } });
    
    res.json(courses);
  } catch (error) {
    console.error('Get teacher courses error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get students enrolled in teacher's courses
export const getTeacherStudents = async (req: Request, res: Response) => {
  try {
    // Disable caching
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');
    
    if (!req.user) {
      return res.status(401).json({ message: 'Not authenticated' });
    }

    const teacherId = new mongoose.Types.ObjectId(req.user.id);
    const assignments = await TeacherAssignment.find({ teacherId });
    const courseSlugs = assignments.map(a => a.courseSlug);

    // Check if a specific course is requested
    const courseFilter = req.query.course as string;
    console.log('=== DEBUG TEACHER STUDENTS API ===');
    console.log('User ID:', req.user.id);
    console.log('Course filter requested:', courseFilter);
    console.log('Teacher assigned courses:', courseSlugs);
    console.log('Request query params:', req.query);
    console.log('Request URL:', req.url);
    
    const filteredCourseSlugs = courseFilter 
      ? courseSlugs.filter(slug => slug === courseFilter)
      : courseSlugs;
    
    console.log('Filtered course slugs:', filteredCourseSlugs);

    const enrollments = await Enrollment.find({ courseSlug: { $in: filteredCourseSlugs } })
      .populate('studentId');
    
    console.log('Found enrollments:', enrollments.length);

    // Group by student to avoid duplicates
    const studentMap = new Map();
    enrollments.forEach(enrollment => {
      const student = enrollment.studentId;
      if (student && !studentMap.has(student._id.toString())) {
        studentMap.set(student._id.toString(), {
          ...(student as any).toObject(),
          courses: [enrollment.courseSlug]
        });
      } else if (student) {
        const existing = studentMap.get(student._id.toString());
        if (!existing.courses.includes(enrollment.courseSlug)) {
          existing.courses.push(enrollment.courseSlug);
        }
      }
    });

    const students = Array.from(studentMap.values());
    console.log('Final students count:', students.length);
    console.log('=== END DEBUG ===');
    res.json(students);
  } catch (error) {
    console.error('Get teacher students error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get live classes for teacher's courses
export const getTeacherLiveClasses = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Not authenticated' });
    }

    const teacherId = new mongoose.Types.ObjectId(req.user.id);
    const assignments = await TeacherAssignment.find({ teacherId });
    const courseSlugs = assignments.map(a => a.courseSlug);

    const liveClasses = await LiveClass.find({ courseSlug: { $in: courseSlugs } })
      .sort({ startTime: -1 });

    res.json(liveClasses);
  } catch (error) {
    console.error('Get teacher live classes error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get recordings for teacher's courses
export const getTeacherRecordings = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Not authenticated' });
    }

    const teacherId = new mongoose.Types.ObjectId(req.user.id);
    const assignments = await TeacherAssignment.find({ teacherId });
    const courseSlugs = assignments.map(a => a.courseSlug);

    const recordings = await Recording.find({ 
      courseSlug: { $in: courseSlugs },
      isVisible: true 
    }).sort({ uploadedAt: -1 });

    res.json(recordings);
  } catch (error) {
    console.error('Get teacher recordings error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get exam results for teacher's courses
export const getTeacherExamResults = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Not authenticated' });
    }

    const teacherId = new mongoose.Types.ObjectId(req.user.id);
    
    // Get teacher's assigned courses
    const assignments = await TeacherAssignment.find({ teacherId });
    const courseSlugs = assignments.map(a => a.courseSlug);

    if (courseSlugs.length === 0) {
      return res.json([]);
    }

    // Get enrollments for teacher's courses with final exam attempts
    const enrollments = await Enrollment.find({ 
      courseSlug: { $in: courseSlugs },
      finalExamAttempts: { $exists: true, $ne: [] }
    }).populate('studentId', 'name email phone');

    // Get course details
    const courses = await Course.find({ slug: { $in: courseSlugs } });
    const courseMap = new Map(courses.map(c => [c.slug, c]));

    // Get final exams for courses
    const finalExams = await FinalExamination.find({ courseSlug: { $in: courseSlugs } });
    const examMap = new Map(finalExams.map((e: any) => [e.courseSlug, e]));

    // Build exam results for teacher's students
    const examResults = [];
    
    for (const enrollment of enrollments) {
      const student = enrollment.studentId as any;
      const course = courseMap.get(enrollment.courseSlug);
      const finalExam = examMap.get(enrollment.courseSlug);
      
      if (!student || !course) continue;
      
      const finalExamAttempts = enrollment.finalExamAttempts || [];
      const latestAttempt = finalExamAttempts.length > 0 
        ? finalExamAttempts[finalExamAttempts.length - 1] 
        : null;

      // Determine final exam type
      let finalExamType = null;
      if (finalExam) {
        const hasEssay = (finalExam as any).questions.some((q: any) => q.type === 'essay');
        const hasMcq = (finalExam as any).questions.some((q: any) => q.type === 'mcq');
        
        if (hasEssay && hasMcq) finalExamType = 'mixed';
        else if (hasEssay) finalExamType = 'essay';
        else if (hasMcq) finalExamType = 'mcq';
      }

      examResults.push({
        studentId: student._id,
        studentName: student.name,
        courseSlug: enrollment.courseSlug,
        courseName: course.title,
        hasFinalExam: !!finalExam,
        finalExamType,
        examTitle: (finalExam as any)?.title,
        latestAttempt: latestAttempt ? {
          attemptNumber: latestAttempt.attemptNumber,
          score: latestAttempt.score,
          passed: latestAttempt.passed,
          attemptedAt: latestAttempt.attemptedAt,
          requiresManualGrading: latestAttempt.requiresManualGrading || false,
          mcqTotal: finalExam ? (finalExam as any).questions.filter((q: any) => q.type === 'mcq').length : 0,
          essayTotal: finalExam ? (finalExam as any).questions.filter((q: any) => q.type === 'essay').length : 0,
          answers: latestAttempt.answers || [],
          gradedBy: latestAttempt.gradedBy,
          gradedAt: latestAttempt.gradedAt
        } : null,
        allAttempts: finalExamAttempts.map(attempt => ({
          attemptNumber: attempt.attemptNumber,
          score: attempt.score,
          passed: attempt.passed,
          attemptedAt: attempt.attemptedAt,
          requiresManualGrading: attempt.requiresManualGrading || false,
          gradedBy: attempt.gradedBy,
          gradedAt: attempt.gradedAt
        })),
        totalAttempts: finalExamAttempts.length
      });
    }

    // Filter for exams that require manual grading or can be graded by teachers
    const gradableResults = examResults.filter(result => 
      result.hasFinalExam && (
        (result.latestAttempt?.requiresManualGrading && !result.latestAttempt.gradedBy) ||
        result.latestAttempt
      )
    );

    res.json(gradableResults);
  } catch (error) {
    console.error('Get teacher exam results error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get specific student exam submission for teacher grading
export const getTeacherExamSubmission = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Not authenticated' });
    }

    const { studentId, courseSlug, attemptNumber } = req.params;
    const teacherId = new mongoose.Types.ObjectId(req.user.id);
    
    // Verify teacher is assigned to this course
    const assignment = await TeacherAssignment.findOne({ teacherId, courseSlug });
    if (!assignment) {
      return res.status(403).json({ message: 'Not authorized to grade this course' });
    }

    // Find the enrollment
    const enrollment = await Enrollment.findOne({
      studentId,
      courseSlug
    }).populate('studentId');

    if (!enrollment) {
      return res.status(404).json({ message: 'Enrollment not found' });
    }

    // Find the specific attempt
    const attempts = enrollment.finalExamAttempts || [];
    const attempt = attempts.find(a => a.attemptNumber === parseInt(attemptNumber));

    if (!attempt) {
      return res.status(404).json({ message: 'Exam attempt not found' });
    }

    // Get the final exam for question details
    const finalExam = await FinalExamination.findOne({ courseSlug });
    if (!finalExam) {
      return res.status(404).json({ message: 'Final exam not found' });
    }

    // Prepare detailed submission view
    const submission = {
      student: {
        name: (enrollment.studentId as any).name,
        id: enrollment.studentId._id
      },
      course: courseSlug,
      exam: {
        title: finalExam.title,
        description: finalExam.description
      },
      attempt: {
        attemptNumber: attempt.attemptNumber,
        attemptedAt: attempt.attemptedAt,
        score: attempt.score,
        passed: attempt.passed,
        requiresManualGrading: attempt.requiresManualGrading,
        gradedBy: attempt.gradedBy,
        gradedAt: attempt.gradedAt
      },
      questionsAndAnswers: (finalExam as any).questions.map((question: any, index: number) => {
        const answer = attempt.answers?.[index];
        
        if (question.type === 'mcq') {
          return {
            type: 'mcq',
            questionText: question.text,
            choices: question.choices,
            correctIndex: question.correctIndex,
            studentAnswer: answer,
            isCorrect: answer === question.correctIndex
          };
        } else {
          return {
            type: 'essay',
            questionDocument: question.questionDocument,
            allowedAnswerFormats: question.allowedAnswerFormats,
            studentAnswer: answer
          };
        }
      })
    };

    res.status(200).json(submission);
  } catch (error) {
    console.error('Get teacher exam submission error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Update student exam score (teacher grading)
export const updateTeacherExamScore = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Not authenticated' });
    }

    const { studentId, courseSlug, attemptNumber, score, passed } = req.body;
    const teacherId = new mongoose.Types.ObjectId(req.user.id);
    const teacher = await User.findById(teacherId);
    
    if (!teacher) {
      return res.status(404).json({ message: 'Teacher not found' });
    }

    // Verify teacher is assigned to this course
    const assignment = await TeacherAssignment.findOne({ teacherId, courseSlug });
    if (!assignment) {
      return res.status(403).json({ message: 'Not authorized to grade this course' });
    }

    // Validate score
    if (typeof score !== 'number' || score < 0 || score > 100) {
      return res.status(400).json({ message: 'Score must be a number between 0 and 100' });
    }

    // Find the enrollment
    const enrollment = await Enrollment.findOne({ studentId, courseSlug });
    if (!enrollment) {
      return res.status(404).json({ message: 'Enrollment not found' });
    }

    // Find and update the specific attempt
    const attempts = enrollment.finalExamAttempts || [];
    const attemptIndex = attempts.findIndex(a => a.attemptNumber === attemptNumber);
    
    if (attemptIndex === -1) {
      return res.status(404).json({ message: 'Exam attempt not found' });
    }

    // Update the attempt with teacher's grading
    attempts[attemptIndex].score = score;
    attempts[attemptIndex].passed = passed;
    attempts[attemptIndex].requiresManualGrading = false;
    attempts[attemptIndex].gradedBy = teacher.username;
    attempts[attemptIndex].gradedAt = new Date();

    enrollment.finalExamAttempts = attempts;
    await enrollment.save();

    res.status(200).json({ 
      message: 'Score updated successfully',
      updatedAttempt: attempts[attemptIndex]
    });
  } catch (error) {
    console.error('Update teacher exam score error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Admin functions for managing teacher assignments

// Assign teacher to course
export const assignTeacherToCourse = async (req: Request, res: Response) => {
  try {
    const { teacherId, courseSlug } = req.body;
    
    if (!req.user) {
      return res.status(401).json({ message: 'Not authenticated' });
    }

    // Check if teacher exists and has teacher role
    const teacher = await User.findById(teacherId);
    if (!teacher || teacher.role !== 'teacher') {
      return res.status(400).json({ message: 'Invalid teacher ID' });
    }

    // Check if course exists
    const course = await Course.findOne({ slug: courseSlug });
    if (!course) {
      return res.status(400).json({ message: 'Course not found' });
    }

    // Create assignment (will fail if duplicate due to unique index)
    const assignment = new TeacherAssignment({
      teacherId: new mongoose.Types.ObjectId(teacherId),
      courseSlug,
      assignedBy: new mongoose.Types.ObjectId(req.user.id)
    });

    await assignment.save();
    
    res.status(201).json({ message: 'Teacher assigned to course successfully', assignment });
  } catch (error) {
    if ((error as any).code === 11000) {
      return res.status(400).json({ message: 'Teacher is already assigned to this course' });
    }
    console.error('Assign teacher to course error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Remove teacher from course
export const removeTeacherFromCourse = async (req: Request, res: Response) => {
  try {
    const { teacherId, courseSlug } = req.body;
    
    await TeacherAssignment.findOneAndDelete({
      teacherId: new mongoose.Types.ObjectId(teacherId),
      courseSlug
    });
    
    res.json({ message: 'Teacher removed from course successfully' });
  } catch (error) {
    console.error('Remove teacher from course error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get all teacher assignments (admin only)
export const getAllTeacherAssignments = async (req: Request, res: Response) => {
  try {
    const assignments = await TeacherAssignment.find()
      .populate('teacherId', 'username email')
      .populate('assignedBy', 'username email')
      .sort({ assignedAt: -1 });
    
    res.json(assignments);
  } catch (error) {
    console.error('Get all teacher assignments error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get teachers list (admin only)
export const getAllTeachers = async (req: Request, res: Response) => {
  try {
    // Get all teachers
    const teachers = await User.find({ role: 'teacher' })
      .select('username email accessEnabled createdAt')
      .sort({ createdAt: -1 });
    
    // Get all teacher assignments
    const assignments = await TeacherAssignment.find()
      .populate('teacherId', 'username email')
      .populate('assignedBy', 'username email');
    
    // Get all enrollments to calculate student counts
    const enrollments = await Enrollment.find()
      .populate('studentId', 'name');
    
    // Group assignments by teacher
    const assignmentsByTeacher = new Map();
    assignments.forEach(assignment => {
      const teacherId = (assignment.teacherId as any)._id.toString();
      if (!assignmentsByTeacher.has(teacherId)) {
        assignmentsByTeacher.set(teacherId, []);
      }
      assignmentsByTeacher.get(teacherId).push(assignment);
    });
    
    // Group enrollments by course
    const enrollmentsByCourse = new Map();
    enrollments.forEach(enrollment => {
      const courseSlug = enrollment.courseSlug;
      if (!enrollmentsByCourse.has(courseSlug)) {
        enrollmentsByCourse.set(courseSlug, []);
      }
      enrollmentsByCourse.get(courseSlug).push(enrollment);
    });
    
    // Enhance teachers with additional information
    const enhancedTeachers = teachers.map(teacher => {
      const teacherId = (teacher as any)._id.toString();
      const teacherAssignments = assignmentsByTeacher.get(teacherId) || [];
      
      // Get unique courses assigned to this teacher
      const assignedCourses = [...new Set(teacherAssignments.map((a: any) => a.courseSlug))];
      
      // Calculate total students across all assigned courses
      let totalStudents = 0;
      assignedCourses.forEach(courseSlug => {
        const courseEnrollments = enrollmentsByCourse.get(courseSlug) || [];
        totalStudents += courseEnrollments.length;
      });
      
      return {
        ...(teacher as any).toObject(),
        assignedCourses,
        studentCount: totalStudents
      };
    });
    
    res.json(enhancedTeachers);
  } catch (error) {
    console.error('Get all teachers error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};
