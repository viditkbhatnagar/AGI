import { Request, Response } from 'express';
import FinalExamination from '../models/finalExamination';
import { Course } from '../models/course';
import { Enrollment } from '../models/enrollment';
import { Student } from '../models/student';
import mongoose from 'mongoose';

// Admin: Create or update final examination for a course
export const createOrUpdateFinalExam = async (req: Request, res: Response) => {
  try {
    const { courseSlug, title, description, questions, passingScore, maxAttempts, isActive } = req.body;

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
      finalExam.passingScore = passingScore !== undefined ? passingScore : finalExam.passingScore;
      finalExam.maxAttempts = maxAttempts !== undefined ? maxAttempts : finalExam.maxAttempts;
      finalExam.isActive = isActive !== undefined ? isActive : finalExam.isActive;
      
      await finalExam.save();
      res.status(200).json({ message: 'Final examination updated successfully', finalExam });
    } else {
      // Create new exam
      finalExam = new FinalExamination({
        courseSlug,
        title,
        description,
        questions,
        passingScore: passingScore || 70,
        maxAttempts: maxAttempts || 3,
        isActive: isActive !== undefined ? isActive : true
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

// Student: Get final exam for a course (if eligible)
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
    
    // Check if student has completed all modules
    const course = await Course.findOne({ slug: courseSlug });
    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }
    
    const totalModules = course.modules.length;
    const completedModules = enrollment.completedModules.filter(m => m.completed).length;
    
    if (completedModules < totalModules) {
      return res.status(403).json({ 
        message: 'You must complete all modules before attempting the final examination',
        totalModules,
        completedModules
      });
    }
    
    // Get final exam
    const finalExam = await FinalExamination.findOne({ courseSlug, isActive: true });
    if (!finalExam) {
      return res.status(404).json({ message: 'Final examination not available for this course' });
    }
    
    // Check attempts
    const attempts = enrollment.finalExamAttempts || [];
    const attemptCount = attempts.length;
    
    if (attemptCount >= finalExam.maxAttempts) {
      return res.status(403).json({ 
        message: 'Maximum attempts reached',
        maxAttempts: finalExam.maxAttempts,
        attemptCount,
        attempts: attempts.map(a => ({
          score: a.score,
          maxScore: a.maxScore,
          passed: a.passed,
          attemptedAt: a.attemptedAt,
          attemptNumber: a.attemptNumber
        }))
      });
    }
    
    // Return exam without correct answers
    const examForStudent = {
      _id: finalExam._id,
      title: finalExam.title,
      description: finalExam.description,
      questions: finalExam.questions.map(q => ({
        text: q.text,
        choices: q.choices
      })),
      passingScore: finalExam.passingScore,
      maxAttempts: finalExam.maxAttempts,
      attemptCount,
      remainingAttempts: finalExam.maxAttempts - attemptCount
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
    
    // Check if student has completed all modules
    const course = await Course.findOne({ slug: courseSlug });
    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }
    
    const totalModules = course.modules.length;
    const completedModules = enrollment.completedModules.filter(m => m.completed).length;
    
    if (completedModules < totalModules) {
      return res.status(403).json({ 
        message: 'You must complete all modules before attempting the final examination' 
      });
    }
    
    // Get final exam
    const finalExam = await FinalExamination.findOne({ courseSlug, isActive: true });
    if (!finalExam) {
      return res.status(404).json({ message: 'Final examination not available' });
    }
    
    // Check attempts
    const attempts = enrollment.finalExamAttempts || [];
    const attemptCount = attempts.length;
    
    if (attemptCount >= finalExam.maxAttempts) {
      return res.status(403).json({ 
        message: 'Maximum attempts reached',
        maxAttempts: finalExam.maxAttempts,
        attemptCount
      });
    }
    
    // Validate answers length
    if (answers.length !== finalExam.questions.length) {
      return res.status(400).json({ 
        message: 'Invalid number of answers',
        expected: finalExam.questions.length,
        received: answers.length
      });
    }
    
    // Score the exam
    let correctCount = 0;
    const totalQuestions = finalExam.questions.length;
    
    finalExam.questions.forEach((question, index) => {
      if (answers[index] === question.correctIndex) {
        correctCount++;
      }
    });
    
    const score = Math.round((correctCount / totalQuestions) * 100);
    const passed = score >= finalExam.passingScore;
    
    // Record the attempt
    const newAttempt = {
      examId: finalExam._id.toString(),
      score,
      maxScore: totalQuestions,
      attemptedAt: new Date(),
      passed,
      attemptNumber: attemptCount + 1
    };
    
    enrollment.finalExamAttempts = [...attempts, newAttempt];
    await enrollment.save();
    
    // Prepare response with detailed results
    const results = {
      score,
      maxScore: totalQuestions,
      percentage: score,
      passed,
      passingScore: finalExam.passingScore,
      attemptNumber: attemptCount + 1,
      remainingAttempts: finalExam.maxAttempts - (attemptCount + 1),
      correctAnswers: correctCount,
      totalQuestions,
      // Include question-by-question feedback
      questionResults: finalExam.questions.map((q, idx) => ({
        questionText: q.text,
        yourAnswer: q.choices[answers[idx]] || 'Not answered',
        correctAnswer: q.choices[q.correctIndex],
        isCorrect: answers[idx] === q.correctIndex
      }))
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
        percentage: Math.round((a.score / a.maxScore) * 100),
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