import { Request, Response, NextFunction } from 'express';
import { Course } from '../models/course';
import storage from '../storage';

export const createCourse = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const course = await Course.create(req.body);
    res.status(201).json(course);
  } catch (err) {
    next(err);
  }
};

export const getAllCourses = async (_: Request, res: Response, next: NextFunction) => {
  try {
    const courses = await Course.find().lean();
    res.json(courses);
  } catch (err) {
    next(err);
  }
};

export const getCourseBySlug = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const course = await Course.findOne({ slug: req.params.slug }).lean();
    if (!course) return res.status(404).json({ message: 'Course not found' });
    res.json(course);
  } catch (err) {
    next(err);
  }
};