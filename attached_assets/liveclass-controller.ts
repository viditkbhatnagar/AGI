import { Request, Response, NextFunction } from 'express';
import { LiveClass } from '../models/liveclass';
import storage from '../storage';

export const createLiveClass = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const liveClass = await LiveClass.create(req.body);
    res.status(201).json(liveClass);
  } catch (err) {
    next(err);
  }
};

export const getAllLiveClasses = async (_: Request, res: Response, next: NextFunction) => {
  try {
    const list = await LiveClass.find().lean();
    res.json(list);
  } catch (err) {
    next(err);
  }
};

export const getLiveClassesForStudent = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const studentId = req.session.userId;
    const list = await LiveClass.find({ studentIds: studentId }).lean();
    res.json(list);
  } catch (err) {
    next(err);
  }
};

export const getLiveClassesForTeacher = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const teacherId = req.session.userId;
    const list = await LiveClass.find({ teacherId }).lean();
    res.json(list);
  } catch (err) {
    next(err);
  }
};