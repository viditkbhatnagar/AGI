import type { Express } from "express";
import express from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { auth } from "./middleware/auth";
import { requireAdmin, requireStudent, requireAuth } from "./middleware/require-auth";

// Controllers
import * as authController from "./controllers/auth-controller";
import * as adminController from "./controllers/admin-controller";
import * as studentController from "./controllers/student-controller";
import * as courseController from "./controllers/course-controller";
import * as enrollmentController from "./controllers/enrollment-controller";
import * as liveClassController from "./controllers/liveclass-controller";
import * as recordingController from "./controllers/recording-controller";

export async function registerRoutes(app: Express): Promise<Server> {
  // AUTH ROUTES
  app.post("/api/auth/login", authController.login);
  app.post("/api/auth/register", auth, requireAdmin, authController.register);
  app.get("/api/auth/me", auth, authController.getCurrentUser);
  app.post("/api/auth/change-password", auth, authController.changePassword);

  // STUDENT ROUTES
  app.get("/api/student/dashboard", auth, requireStudent, studentController.getDashboard);
  // Per‐course dashboard view
  app.get(
    "/api/student/dashboard/:slug",
    auth,
    requireStudent,
    studentController.getDashboardByCourse
  );
  app.post("/api/student/watch-time", auth, requireStudent, studentController.recordWatchTime);
  app.post(
    "/api/student/view-document",
    auth,
    requireStudent,
    studentController.recordDocumentView
  );
  app.get("/api/student/profile", auth, requireStudent, studentController.getProfile);
  app.put("/api/student/profile", auth, requireStudent, studentController.updateProfile);
  app.put("/api/student/notify-settings", auth, requireStudent, studentController.updateNotifySettings);
  app.get("/api/student/courses", auth, requireStudent, studentController.getCourses);
  app.get("/api/student/courses/:slug", auth, requireStudent, studentController.getCourseDetail);

  // QUIZ ROUTES
  app.get(
    "/api/student/quiz/:slug/:moduleIndex",
    auth,
    requireStudent,
    studentController.getQuiz
  );

  // ADMIN ROUTES
  // List all courses for admin dropdown
  app.get(
    '/api/admin/courses',
    auth,
    requireAdmin,
    courseController.listCourses
  );
  app.get("/api/admin/dashboard", auth, requireAdmin, adminController.getDashboardStats);
  app.get("/api/admin/students", auth, requireAdmin, adminController.getAllStudents);
  app.get("/api/admin/students/:id", auth, requireAdmin, adminController.getStudent);
  app.post("/api/admin/students", auth, requireAdmin, adminController.createStudent);
  app.put("/api/admin/students/:id", auth, requireAdmin, adminController.updateStudent);
  app.delete("/api/admin/students/:id", auth, requireAdmin, adminController.deleteStudent);

  // COURSE ROUTES
  app.get("/api/courses", auth, courseController.getAllCourses);
  app.get("/api/courses/:slug", auth, courseController.getCourse);
  app.post("/api/courses", auth, requireAdmin, courseController.createCourse);
  app.put("/api/courses/:slug", auth, requireAdmin, courseController.updateCourse);
  app.delete("/api/courses/:slug", auth, requireAdmin, courseController.deleteCourse);

  // ENROLLMENT ROUTES
  app.get("/api/enrollments", auth, requireAdmin, enrollmentController.getAllEnrollments);
  app.get("/api/enrollments/course/:courseSlug", auth, requireAdmin, enrollmentController.getEnrollmentsByCourse);
  app.get("/api/enrollments/student/:studentId", auth, requireAuth, enrollmentController.getEnrollmentsByStudent);
  app.post("/api/enrollments", auth, requireAdmin, enrollmentController.createEnrollment);
  app.put("/api/enrollments/:id", auth, requireAdmin, enrollmentController.updateEnrollment);
  app.delete("/api/enrollments/:id", auth, requireAdmin, enrollmentController.deleteEnrollment);
  app.post("/api/student/module-complete", auth, requireStudent, enrollmentController.completeModule);
  app.get(
    '/api/student/quiz/:slug/:moduleIndex',
    auth,
    requireStudent,
    studentController.getQuiz
  );
  app.post(
    "/api/student/quiz-attempt",
    auth,
    requireStudent,
    studentController.submitQuizAttempt
  );

  // Returns array of { createdAt, score }
  app.get(
    '/api/student/quiz-attempts/:slug/:moduleIndex',
    auth,
    requireStudent,
    studentController.getQuizAttempts
  );

  // LIVE CLASS ROUTES
  app.get("/api/live-classes", auth, requireAdmin, liveClassController.getAllLiveClasses);
  app.get("/api/live-classes/:id", auth, requireAdmin, liveClassController.getLiveClassById);
  app.get("/api/live-classes/upcoming", auth, requireAdmin, liveClassController.getUpcomingLiveClasses);
  app.get("/api/live-classes/course/:courseSlug", auth, requireAdmin, liveClassController.getLiveClassesByCourse);
  app.get("/api/student/live-classes", auth, requireStudent, liveClassController.getStudentLiveClasses);
  app.post("/api/live-classes", auth, requireAdmin, liveClassController.createLiveClass);
  app.put("/api/live-classes/:id", auth, requireAdmin, liveClassController.updateLiveClass);
  app.delete("/api/live-classes/:id", auth, requireAdmin, liveClassController.deleteLiveClass);

  // RECORDING ROUTES
  // Admin recording routes
  app.get("/api/recordings", auth, requireAdmin, recordingController.getAllRecordings);
  app.get("/api/recordings/:id", auth, recordingController.getRecording);
  app.get("/api/recordings/course/:courseSlug", auth, requireAdmin, recordingController.getRecordingsByCourse);
  app.post("/api/recordings", auth, requireAdmin, recordingController.createRecording);
  app.put("/api/recordings/:id", auth, requireAdmin, recordingController.updateRecording);
  app.delete("/api/recordings/:id", auth, requireAdmin, recordingController.deleteRecording);
  
  // Student recording routes
  app.get("/api/student/recordings", auth, requireStudent, recordingController.getStudentRecordings);
  app.get("/api/student/recordings/course/:courseSlug", auth, requireStudent, recordingController.getStudentRecordingsByCourse);

  const httpServer = createServer(app);

  return httpServer;
}
