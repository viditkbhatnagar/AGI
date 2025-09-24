import { Request, Response } from 'express';
import FinalExamination from '../models/finalExamination';
import { Course } from '../models/course';
import { Enrollment } from '../models/enrollment';
import { Student } from '../models/student';
import mongoose from 'mongoose';

// Admin: Create or update final examination for a course
export const createOrUpdateFinalExam = async (req: Request, res: Response) => {
  try {
    const { courseSlug, title, description, questions } = req.body;

    // Validate course exists
    const course = await Course.findOne({ slug: courseSlug });
    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    // Check if final exam already exists for this course
    let finalExam = await FinalExamination.findOne({ courseSlug });

    if (finalExam) {
      // Update existing exam
      finalExam.title = title || finalExam.title;
      finalExam.description = description !== undefined ? description : finalExam.description;
      finalExam.questions = questions || finalExam.questions;
      
      await finalExam.save();
      res.status(200).json({ message: 'Final examination updated successfully', finalExam });
    } else {
      // Create new exam
      finalExam = new FinalExamination({
        courseSlug,
        title,
        description,
        questions
      });
      
      await finalExam.save();
      res.status(201).json({ message: 'Final examination created successfully', finalExam });
    }
  } catch (error) {
    console.error('Create/Update final exam error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Admin: Get final examination by course slug
export const getFinalExamByCourse = async (req: Request, res: Response) => {
  try {
    const { courseSlug } = req.params;
    
    const finalExam = await FinalExamination.findOne({ courseSlug });
    if (!finalExam) {
      return res.status(404).json({ message: 'Final examination not found for this course' });
    }
    
    res.status(200).json(finalExam);
  } catch (error) {
    console.error('Get final exam error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Admin: Delete final examination
export const deleteFinalExam = async (req: Request, res: Response) => {
  try {
    const { courseSlug } = req.params;
    
    const result = await FinalExamination.deleteOne({ courseSlug });
    if (result.deletedCount === 0) {
      return res.status(404).json({ message: 'Final examination not found' });
    }
    
    res.status(200).json({ message: 'Final examination deleted successfully' });
  } catch (error) {
    console.error('Delete final exam error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Admin: Get all final examinations
export const getAllFinalExams = async (req: Request, res: Response) => {
  try {
    const finalExams = await FinalExamination.find().sort({ createdAt: -1 });
    res.status(200).json(finalExams);
  } catch (error) {
    console.error('Get all final exams error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Student: Get final exam for a course
export const getStudentFinalExam = async (req: Request, res: Response) => {
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
    
    // Find enrollment
    const enrollment = await Enrollment.findOne({
      studentId: student._id,
      courseSlug
    });
    
    if (!enrollment) {
      return res.status(404).json({ message: 'Enrollment not found' });
    }
    
    // Get final exam
    const finalExam = await FinalExamination.findOne({ courseSlug });
    if (!finalExam) {
      return res.status(404).json({ message: 'Final examination not available for this course' });
    }
    
    // Get attempts for scoring information
    const attempts = enrollment.finalExamAttempts || [];
    
    // Return exam without correct answers for MCQ
    const examForStudent = {
      _id: finalExam._id,
      title: finalExam.title,
      description: finalExam.description,
      questions: finalExam.questions.map(q => {
        if (q.type === 'mcq') {
          return {
            type: 'mcq',
            text: q.text,
            choices: q.choices
          };
        } else {
          return {
            type: 'essay',
            questionDocument: q.questionDocument,
            allowedAnswerFormats: q.allowedAnswerFormats
          };
        }
      }),
      attempts: attempts.map(a => ({
        score: a.score,
        attemptedAt: a.attemptedAt,
        attemptNumber: a.attemptNumber,
        requiresManualGrading: a.requiresManualGrading,
        passed: a.passed
      }))
    };
    
    res.status(200).json(examForStudent);
  } catch (error) {
    console.error('Get student final exam error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Student: Submit final exam attempt
export const submitFinalExamAttempt = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Not authenticated' });
    }

    const { courseSlug, answers } = req.body;
    
    if (!Array.isArray(answers)) {
      return res.status(400).json({ message: 'Invalid answers format' });
    }
    
    // Find student
    const student = await Student.findOne({ userId: req.user.id });
    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }
    
    // Find enrollment
    const enrollment = await Enrollment.findOne({
      studentId: student._id,
      courseSlug
    });
    
    if (!enrollment) {
      return res.status(404).json({ message: 'Enrollment not found' });
    }

    // Get final exam
    const finalExam = await FinalExamination.findOne({ courseSlug });
    if (!finalExam) {
      return res.status(404).json({ message: 'Final examination not available' });
    }
    
    // Validate answers length
    if (answers.length !== finalExam.questions.length) {
      return res.status(400).json({ 
        message: 'Invalid number of answers',
        expected: finalExam.questions.length,
        received: answers.length
      });
    }
    
    // Get current attempts count
    const attempts = enrollment.finalExamAttempts || [];
    const attemptCount = attempts.length;
    
    // Score the exam (only MCQ questions can be auto-graded)
    let correctCount = 0;
    let mcqCount = 0;
    let essayCount = 0;
    let autoGradedScore = null;
    
    finalExam.questions.forEach((question, index) => {
      if (question.type === 'mcq') {
        mcqCount++;
        if (typeof answers[index] === 'number' && answers[index] === question.correctIndex) {
          correctCount++;
        }
      } else if (question.type === 'essay') {
        essayCount++;
        // Essay questions need manual grading
      }
    });
    
    // Calculate auto-graded score for MCQ questions
    const requiresManualGrading = essayCount > 0;
    if (mcqCount > 0 && essayCount === 0) {
      // Pure MCQ exam - auto-grade immediately
      autoGradedScore = Math.round((correctCount / mcqCount) * 100);
    } else if (mcqCount > 0 && essayCount > 0) {
      // Mixed exam - store MCQ score for admin reference
      autoGradedScore = Math.round((correctCount / mcqCount) * 100);
    }
    
    // Record the attempt
    const newAttempt = {
      examId: (finalExam._id as any).toString(),
      score: autoGradedScore || undefined, // Will be undefined for pure essay exams
      maxScore: 100,
      attemptedAt: new Date(),
      passed: autoGradedScore !== null ? autoGradedScore >= 70 : undefined, // Default 70% passing for MCQ
      attemptNumber: attemptCount + 1,
      requiresManualGrading,
      answers
    };
    
    enrollment.finalExamAttempts = [...attempts, newAttempt];
    await enrollment.save();
    
    // Prepare response with detailed results
    const results = {
      score: autoGradedScore,
      maxScore: 100,
      percentage: autoGradedScore,
      passed: newAttempt.passed,
      attemptNumber: attemptCount + 1,
      mcqCorrect: correctCount,
      mcqTotal: mcqCount,
      essayTotal: essayCount,
      requiresManualGrading,
      message: requiresManualGrading 
        ? 'Submission received. Your exam will be graded manually by an administrator.'
        : 'Exam auto-graded successfully!',
      // Include question-by-question feedback for MCQ only
      questionResults: finalExam.questions.map((q, idx) => {
        if (q.type === 'mcq') {
          return {
            type: 'mcq',
            questionText: q.text,
            yourAnswer: typeof answers[idx] === 'number' ? q.choices[answers[idx]] : 'Not answered',
            correctAnswer: q.choices[q.correctIndex],
            isCorrect: answers[idx] === q.correctIndex
          };
        } else {
          return {
            type: 'essay',
            submitted: answers[idx] ? true : false,
            requiresManualGrading: true
          };
        }
      })
    };
    
    res.status(200).json(results);
  } catch (error) {
    console.error('Submit final exam attempt error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Student: Get final exam attempts history
export const getStudentFinalExamAttempts = async (req: Request, res: Response) => {
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
    
    // Find enrollment
    const enrollment = await Enrollment.findOne({
      studentId: student._id,
      courseSlug
    });
    
    if (!enrollment) {
      return res.status(404).json({ message: 'Enrollment not found' });
    }
    
    const attempts = enrollment.finalExamAttempts || [];
    
    res.status(200).json({
      courseSlug,
      attempts: attempts.map(a => ({
        score: a.score,
        maxScore: a.maxScore,
        percentage: a.score ? Math.round((a.score / a.maxScore) * 100) : 0,
        passed: a.passed,
        attemptedAt: a.attemptedAt,
        attemptNumber: a.attemptNumber
      }))
    });
  } catch (error) {
    console.error('Get student final exam attempts error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Admin: Get all student exam results for results page
export const getAllStudentExamResults = async (req: Request, res: Response) => {
  try {
    // Get all enrollments with student data
    const enrollments = await Enrollment.find()
      .populate('studentId');

    // Get all courses
    const courses = await Course.find();
    const courseMap = new Map();
    courses.forEach(course => {
      courseMap.set(course.slug, course);
    });

    // Get all final exams
    const finalExams = await FinalExamination.find();
    const examMap = new Map();
    finalExams.forEach(exam => {
      examMap.set(exam.courseSlug, exam);
    });

    // Format the results
    const results = enrollments.map(enrollment => {
      const student = enrollment.studentId;
      const courseSlug = enrollment.courseSlug;
      const course = courseMap.get(courseSlug);
      const finalExam = examMap.get(courseSlug);
      const finalExamAttempts = enrollment.finalExamAttempts || [];
      
      // Get the latest attempt
      const latestAttempt = finalExamAttempts.length > 0 
        ? finalExamAttempts[finalExamAttempts.length - 1] 
        : null;

      // Determine exam type
      let finalExamType = null;
      if (finalExam) {
        const hasEssay = finalExam.questions.some((q: any) => q.type === 'essay');
        const hasMCQ = finalExam.questions.some((q: any) => q.type === 'mcq');
        if (hasEssay && hasMCQ) {
          finalExamType = 'mixed';
        } else if (hasEssay) {
          finalExamType = 'essay';
        } else {
          finalExamType = 'mcq';
        }
      }

      return {
        studentId: student._id,
        studentName: (student as any).name,
        courseSlug: courseSlug,
        courseName: course?.title || courseSlug,
        hasFinalExam: !!finalExam,
        finalExamType,
        examTitle: finalExam?.title,
        latestAttempt: latestAttempt ? {
          attemptNumber: latestAttempt.attemptNumber,
          score: latestAttempt.score,
          passed: latestAttempt.passed,
          attemptedAt: latestAttempt.attemptedAt,
          requiresManualGrading: latestAttempt.requiresManualGrading || false,
          mcqCorrect: undefined, // Would need to be calculated from answers
          mcqTotal: finalExam ? finalExam.questions.filter((q: any) => q.type === 'mcq').length : 0,
          essayTotal: finalExam ? finalExam.questions.filter((q: any) => q.type === 'essay').length : 0,
          answers: latestAttempt.answers || [],
          gradedBy: latestAttempt.gradedBy,
          gradedAt: latestAttempt.gradedAt,
          feedback: latestAttempt.feedback
        } : null,
        allAttempts: finalExamAttempts.map(attempt => ({
          attemptNumber: attempt.attemptNumber,
          score: attempt.score,
          passed: attempt.passed,
          attemptedAt: attempt.attemptedAt,
          requiresManualGrading: attempt.requiresManualGrading || false,
          gradedBy: attempt.gradedBy,
          gradedAt: attempt.gradedAt,
          feedback: attempt.feedback
        })),
        totalAttempts: finalExamAttempts.length
      };
    });

    res.status(200).json(results);
  } catch (error) {
    console.error('Get all student exam results error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Admin: Update student exam score
export const updateStudentExamScore = async (req: Request, res: Response) => {
  try {
    const { studentId, courseSlug, attemptNumber, score, passed, feedback } = req.body;

    if (!req.user) {
      return res.status(401).json({ message: 'Not authenticated' });
    }

    // Find the enrollment
    const enrollment = await Enrollment.findOne({
      studentId,
      courseSlug
    });

    if (!enrollment) {
      return res.status(404).json({ message: 'Enrollment not found' });
    }

    // Find the specific attempt
    const attempts = enrollment.finalExamAttempts || [];
    const attemptIndex = attempts.findIndex(a => a.attemptNumber === attemptNumber);

    if (attemptIndex === -1) {
      return res.status(404).json({ message: 'Exam attempt not found' });
    }

    // Update the attempt
    attempts[attemptIndex].score = score;
    attempts[attemptIndex].passed = passed;
    attempts[attemptIndex].gradedBy = req.user.username || req.user.email;
    attempts[attemptIndex].gradedAt = new Date();
    if (feedback !== undefined) {
      attempts[attemptIndex].feedback = feedback;
    }

    enrollment.finalExamAttempts = attempts;
    await enrollment.save();

    res.status(200).json({ 
      message: 'Score updated successfully',
      updatedAttempt: attempts[attemptIndex]
    });
  } catch (error) {
    console.error('Update student exam score error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Admin: Get specific student's exam submission for viewing
export const getStudentExamSubmission = async (req: Request, res: Response) => {
  try {
    const { studentId, courseSlug, attemptNumber } = req.params;

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
      questionsAndAnswers: finalExam.questions.map((question, index) => {
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
    console.error('Get student exam submission error:', error);
    res.status(500).json({ message: 'Server error' });
  }
}; 