import { Request, Response, NextFunction } from 'express';
import { Enrollment } from '../models/enrollment';
import storage from '../storage';

export const enrollStudent = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = req.body; // { studentId, courseSlug, validUntil }
    const enroll = await Enrollment.create(data);
    res.status(201).json(enroll);
  } catch (err) {
    next(err);
  }
};

export const getEnrollment = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { studentId } = req.params;
    const enroll = await Enrollment.findOne({ studentId }).lean();
    if (!enroll) return res.status(404).json({ message: 'Enrollment not found' });
    res.json(enroll);
  } catch (err) {
    next(err);
  }
};

export const markModuleComplete = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { studentId, moduleIndex } = req.body;
    await Enrollment.updateOne(
      { studentId },
      { $addToSet: { completedModules: moduleIndex } }
    );
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
};

export const recordQuizAttempt = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { studentId, moduleIndex, score } = req.body;
    await Enrollment.updateOne(
      { studentId },
      { $push: { quizAttempts: { moduleIndex, score, attemptDate: new Date() } } }
    );
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
};

// Alias for consistency with admin routes
export const createEnrollment = enrollStudent;

/**
 * Get all enrollments
 */
export const getAllEnrollments = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const enrollments = await Enrollment.find().lean();
    res.json(enrollments);
  } catch (err) {
    next(err);
  }
};