import { Router } from 'express';
import { ensureAuthenticated, requireRole } from '../middleware/auth';
import {
  createStudent,
  listStudents,
} from '../controllers/admin-controller';
import {
  createCourse,
  getAllCourses,
  getCourseBySlug,
} from '../controllers/course-controller';
import { createEnrollment,
    getEnrollment,
    getAllEnrollments,
    markModuleComplete,
    recordQuizAttempt } from '../controllers/enrollment-controller';
import {
  createLiveClass,
  getAllLiveClasses,
  getLiveClassesForTeacher,
} from '../controllers/liveclass-controller';

const router = Router();

// All admin routes require admin role
router.use(ensureAuthenticated, requireRole('admin'));

// Student management
router.post('/students', createStudent);
router.get ('/students', listStudents);

// Course management
router.post('/courses', createCourse);
router.get ('/courses', getAllCourses);
router.get ('/courses/:slug', getCourseBySlug);

// Enrollment management
router.post('/enrollments', createEnrollment);
router.get ('/enrollments', getAllEnrollments);

// Live-class scheduling
router.post('/live-classes', createLiveClass);
router.get ('/live-classes', getAllLiveClasses);
router.get ('/live-classes/teacher/:teacherId', getLiveClassesForTeacher);

export default router;