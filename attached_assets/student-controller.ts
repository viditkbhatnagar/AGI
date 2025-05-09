import { Request, Response, NextFunction } from 'express';
import { Student } from '../models/student';
import { Enrollment } from '../models/enrollment';
import { Course } from '../models/course';
import { LiveClass } from '../models/liveclass';
import storage from '../storage';

export const getProfile = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.session.userId;
    const student = await Student.findById(id).populate('enrollment').lean();
    if (!student) return res.status(404).json({ message: 'Student not found' });
    res.json(student);
  } catch (err) {
    next(err);
  }
};

export const updateProfile = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.session.userId;
    const updates = req.body;
    const student = await Student.findByIdAndUpdate(id, updates, { new: true }).lean();
    if (!student) return res.status(404).json({ message: 'Student not found' });
    res.json(student);
  } catch (err) {
    next(err);
  }
};

export const getCourseProgress = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.session.userId;
    const enrollment = await Enrollment.findOne({ studentId: id }).lean();
    if (!enrollment) return res.status(404).json({ message: 'Enrollment not found' });

    const course = await Course.findOne({ slug: enrollment.courseSlug }).lean();
    const total = course?.modules.length ?? 0;
    res.json({
      completedModules: enrollment.completedModules,
      totalModules: total
    });
  } catch (err) {
    next(err);
  }
};

export const getWatchTime = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.session.userId;
    const student = await Student.findById(id).lean();
    res.json(student?.watchTime || []);
  } catch (err) {
    next(err);
  }
};

export const markModuleComplete = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const studentId = req.session.userId;
    const { moduleIndex } = req.body;
    if (moduleIndex === undefined) {
      return res.status(400).json({ message: 'moduleIndex is required' });
    }
    await Enrollment.updateOne({ studentId }, { $addToSet: { completedModules: moduleIndex } });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
};

export const recordQuizAttempt = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const studentId = req.session.userId;
    const { moduleIndex, score } = req.body;
    if (moduleIndex === undefined || score === undefined) {
      return res.status(400).json({ message: 'moduleIndex and score are required' });
    }
    await Enrollment.updateOne(
      { studentId },
      { $push: { quizAttempts: { moduleIndex, score, attemptDate: new Date() } } }
    );
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
};

export const getLiveClasses = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const studentId = req.session.userId;
    const classes = await LiveClass.find({ studentIds: studentId }).lean();
    res.json(classes);
  } catch (err) {
    next(err);
  }
};

export const getEnrollment = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const studentId = req.session.userId;
    const enrollment = await Enrollment.findOne({ studentId }).lean();
    if (!enrollment) {
      return res.status(404).json({ message: 'Enrollment not found' });
    }
    res.json(enrollment);
  } catch (err) {
    next(err);
  }
};

export const getAvailableCourses = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const courses = await Course.find().lean();
    res.json(courses);
  } catch (err) {
    next(err);
  }
};