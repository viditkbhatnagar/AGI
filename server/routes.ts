import type { Express } from "express";
import express from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { auth } from "./middleware/auth";
import { requireAdmin, requireStudent, requireAuth, requireAdminAccess, requireTeacher, requireTeachingAccess } from "./middleware/require-auth";

// Controllers
import * as authController from "./controllers/auth-controller";
import * as adminController from "./controllers/admin-controller";
import * as studentController from "./controllers/student-controller";
import * as teacherController from "./controllers/teacher-controller";
import * as courseController from "./controllers/course-controller";
import * as sandboxCourseController from "./controllers/sandboxCourse-controller";
import * as enrollmentController from "./controllers/enrollment-controller";
import * as liveClassController from "./controllers/liveclass-controller";
import * as recordingController from "./controllers/recording-controller";
import * as contactController from "./controllers/contact-controller";
import * as documentProxyController from "./controllers/document-proxy-controller";
import * as feedbackController from "./controllers/feedback-controller";
import * as certificateController from "./controllers/certificate-controller";
import * as loginHistoryController from "./controllers/loginHistory-controller";
import quizRepositoryRoutes from "./routes/quizRepository";

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

  // STUDENT FINAL EXAMINATIONS ROUTES
  app.get("/api/student/final-examinations", auth, requireStudent, studentController.getStudentFinalExaminations);
  app.get("/api/student/final-exam/:courseSlug/attempt/:attemptNumber", auth, requireStudent, studentController.getStudentAttemptDetails);

  // CONTACT FORM ROUTE
  app.post("/api/contact", auth, requireStudent, contactController.submitContactForm);

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
    requireAdminAccess,
    courseController.listCourses
  );
  app.get("/api/admin/dashboard", auth, requireAdminAccess, adminController.getDashboardStats);
  app.get("/api/admin/students", auth, requireAdminAccess, adminController.getAllStudents);
  app.get("/api/admin/students/:id", auth, requireAdminAccess, adminController.getStudent);
  app.post("/api/admin/students", auth, requireAdmin, adminController.createStudent);
  app.post("/api/admin/teachers", auth, requireAdmin, adminController.createTeacher);
  app.put("/api/admin/students/:id", auth, requireAdmin, adminController.updateStudent);
  app.delete("/api/admin/students/:id", auth, requireAdmin, adminController.deleteStudent);
  app.put("/api/admin/students/:studentId/toggle-access", auth, requireAdmin, adminController.toggleStudentAccess);

  // LOGIN HISTORY ROUTES (Admin only)
  app.get("/api/admin/login-history/students", auth, requireAdminAccess, loginHistoryController.getStudentsLoginHistory);
  app.get("/api/admin/login-history/teachers", auth, requireAdminAccess, loginHistoryController.getTeachersLoginHistory);

  // TEACHER ROUTES
  app.get("/api/teacher/dashboard", auth, requireTeacher, teacherController.getTeacherDashboard);
  app.get("/api/teacher/courses", auth, requireTeacher, teacherController.getTeacherCourses);
  app.get("/api/teacher/students", auth, requireTeacher, teacherController.getTeacherStudents);
  app.get("/api/teacher/live-classes", auth, requireTeacher, teacherController.getTeacherLiveClasses);
  app.get("/api/teacher/recordings", auth, requireTeacher, teacherController.getTeacherRecordings);
  app.get("/api/teacher/exam-results", auth, requireTeacher, teacherController.getTeacherExamResults);
  app.get("/api/teacher/exam-results/:studentId/:courseSlug/:attemptNumber", auth, requireTeacher, teacherController.getTeacherExamSubmission);
  app.post("/api/teacher/exam-results/update-score", auth, requireTeacher, teacherController.updateTeacherExamScore);
  app.post("/api/teacher/exam-results/update-feedback", auth, requireTeacher, teacherController.updateTeacherExamFeedback);
  app.post("/api/admin/certificate-issuance", auth, requireAdmin, teacherController.updateCertificateIssuance);

  // TEACHER MANAGEMENT ROUTES (Admin only)
  app.get("/api/admin/teachers", auth, requireAdminAccess, teacherController.getAllTeachers);
  app.get("/api/admin/teacher-assignments", auth, requireAdminAccess, teacherController.getAllTeacherAssignments);
  app.post("/api/admin/teacher-assignments", auth, requireAdmin, teacherController.assignTeacherToCourse);
  app.delete("/api/admin/teacher-assignments", auth, requireAdmin, teacherController.removeTeacherFromCourse);
  app.put("/api/admin/teachers/:id", auth, requireAdmin, adminController.updateTeacher);
  app.delete("/api/admin/teachers/:id", auth, requireAdmin, adminController.deleteTeacher);

  // COURSE ROUTES
  app.get("/api/courses", auth, courseController.getAllCourses);
  app.get("/api/courses/:slug", auth, courseController.getCourse);
  app.get("/api/courses/:slug/quizzes", auth, requireAdminAccess, async (req: any, res: any) => {
    try {
      const { slug } = req.params;
      const Quiz = (await import('./models/quiz')).default;
      const quizzes = await Quiz.find({ courseSlug: slug }).sort({ moduleIndex: 1 });
      res.json(quizzes);
    } catch (error) {
      console.error('Get course quizzes error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });
  app.post("/api/courses", auth, requireAdmin, courseController.createCourse);
  app.put("/api/courses/:slug", auth, requireAdmin, courseController.updateCourse);
  app.put("/api/courses/:slug/reorder-modules", auth, requireAdmin, courseController.reorderModules);
  app.delete("/api/courses/:slug", auth, requireAdmin, courseController.deleteCourse);

  // SANDBOX COURSE ROUTES
  app.get("/api/sandbox-courses", auth, requireAdminAccess, sandboxCourseController.getAllSandboxCourses);
  app.get("/api/sandbox-courses/:slug", auth, requireAdminAccess, sandboxCourseController.getSandboxCourse);
  app.get("/api/sandbox-courses/:slug/quizzes", auth, requireAdminAccess, async (req: any, res: any) => {
    try {
      const { slug } = req.params;
      const Quiz = (await import('./models/quiz')).default;
      const quizzes = await Quiz.find({ courseSlug: slug, isSandbox: true }).sort({ moduleIndex: 1 });
      res.json(quizzes);
    } catch (error) {
      console.error('Get sandbox course quizzes error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });
  app.post("/api/sandbox-courses", auth, requireAdmin, sandboxCourseController.createSandboxCourse);
  app.put("/api/sandbox-courses/:slug", auth, requireAdmin, sandboxCourseController.updateSandboxCourse);
  app.put("/api/sandbox-courses/:slug/reorder-modules", auth, requireAdmin, sandboxCourseController.reorderSandboxModules);
  app.delete("/api/sandbox-courses/:slug", auth, requireAdmin, sandboxCourseController.deleteSandboxCourse);
  app.post("/api/sandbox-courses/copy-to-courses", auth, requireAdmin, sandboxCourseController.copyToMainCourses);
  app.post("/api/sandbox-courses/hybrid-copy", auth, requireAdmin, sandboxCourseController.hybridCopyModules);

  // DOCUMENT PROXY ROUTES (for previewing Cloudinary documents)
  // Note: No auth required since iframe requests can't include headers, but this endpoint 
  // is only accessible from admin pages which are already authenticated
  app.get("/api/document-proxy", documentProxyController.proxyDocument);

  // ENROLLMENT ROUTES
  app.get("/api/enrollments", auth, requireAdminAccess, enrollmentController.getAllEnrollments);
  app.get("/api/enrollments/course/:courseSlug", auth, requireAdminAccess, enrollmentController.getEnrollmentsByCourse);
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

  // QUIZ REPOSITORY ROUTES
  app.use("/api/quiz-repository", quizRepositoryRoutes);

  // LIVE CLASS ROUTES
  app.get("/api/live-classes", auth, requireAdminAccess, liveClassController.getAllLiveClasses);
  app.get("/api/live-classes/:id", auth, requireAdminAccess, liveClassController.getLiveClassById);
  app.get("/api/live-classes/upcoming", auth, requireAdminAccess, liveClassController.getUpcomingLiveClasses);
  app.get("/api/live-classes/course/:courseSlug", auth, requireAdminAccess, liveClassController.getLiveClassesByCourse);
  app.get("/api/live-classes/course/:courseSlug/module/:moduleIndex", auth, requireAuth, liveClassController.getLiveClassesByCourseAndModule);
  app.get("/api/student/live-classes", auth, requireStudent, liveClassController.getStudentLiveClasses);
  app.post("/api/live-classes", auth, requireAdmin, liveClassController.createLiveClass);
  app.put("/api/live-classes/:id", auth, requireAdmin, liveClassController.updateLiveClass);
  app.delete("/api/live-classes/:id", auth, requireAdmin, liveClassController.deleteLiveClass);

  // RECORDING ROUTES
  // Admin recording routes
  app.get("/api/recordings", auth, requireAdminAccess, recordingController.getAllRecordings);
  app.get("/api/recordings/:id", auth, recordingController.getRecording);
  app.get("/api/recordings/course/:courseSlug", auth, requireAdminAccess, recordingController.getRecordingsByCourse);
  app.post("/api/recordings", auth, requireAdmin, recordingController.createRecording);
  app.put("/api/recordings/:id", auth, requireAdmin, recordingController.updateRecording);
  app.delete("/api/recordings/:id", auth, requireAdmin, recordingController.deleteRecording);

  // Student recording routes
  app.get("/api/student/recordings", auth, requireStudent, recordingController.getStudentRecordings);
  app.get("/api/student/recordings/course/:courseSlug", auth, requireStudent, recordingController.getStudentRecordingsByCourse);
  app.get("/api/recordings/course/:courseSlug/module/:moduleIndex", auth, requireAuth, recordingController.getRecordingsByCourseAndModule);

  // QUIZ SCORES ROUTES (Admin)
  app.get("/api/admin/quiz-scores", auth, requireAdminAccess, adminController.getAllStudentsQuizScores);

  // FINAL EXAMINATION ROUTES
  const finalExamController = await import("./controllers/finalExamination-controller");

  // Admin final exam routes
  app.get("/api/admin/final-exams", auth, requireAdminAccess, finalExamController.getAllFinalExams);
  app.get("/api/admin/final-exams/:courseSlug", auth, requireAdminAccess, finalExamController.getFinalExamByCourse);
  app.post("/api/admin/final-exams", auth, requireAdmin, finalExamController.createOrUpdateFinalExam);
  app.delete("/api/admin/final-exams/:courseSlug", auth, requireAdmin, finalExamController.deleteFinalExam);

  // Student final exam routes
  app.get("/api/student/final-exam/:courseSlug", auth, requireStudent, finalExamController.getStudentFinalExam);
  app.post("/api/student/final-exam/submit", auth, requireStudent, finalExamController.submitFinalExamAttempt);
  app.get("/api/student/final-exam/:courseSlug/attempts", auth, requireStudent, finalExamController.getStudentFinalExamAttempts);

  // Admin final exam results routes
  app.get("/api/admin/exam-results", auth, requireAdminAccess, finalExamController.getAllStudentExamResults);
  app.post("/api/admin/exam-results/update-score", auth, requireAdmin, finalExamController.updateStudentExamScore);
  app.get("/api/admin/exam-results/:studentId/:courseSlug/:attemptNumber", auth, requireAdminAccess, finalExamController.getStudentExamSubmission);

  // CERTIFICATE ROUTES
  // Student certificate routes
  app.get("/api/student/certificates", auth, requireStudent, certificateController.getStudentCertificates);
  app.get("/api/student/certificates/:courseSlug", auth, requireStudent, certificateController.getCourseCertificates);

  // Admin certificate routes
  app.get("/api/admin/certificates", auth, requireAdminAccess, certificateController.getAllIssuedCertificates);
  app.get("/api/admin/certifier/test", auth, requireAdmin, certificateController.testCertifierConnection);

  // FEEDBACK ROUTES
  // Student feedback routes
  app.get("/api/student/feedback/data", auth, requireStudent, feedbackController.getStudentFeedbackData);
  app.get("/api/student/feedback/:courseSlug/data", auth, requireStudent, feedbackController.getCourseFeedbackData);
  app.post("/api/student/feedback/:courseSlug/submit", auth, requireStudent, feedbackController.submitCourseFeedback);
  app.get("/api/student/feedback/:courseSlug/status", auth, requireStudent, feedbackController.checkCourseFeedbackStatus);

  // Admin feedback routes
  app.get("/api/admin/feedbacks", auth, requireAdminAccess, feedbackController.getAllFeedbacks);
  app.get("/api/admin/feedback-stats", auth, requireAdminAccess, feedbackController.getFeedbackStats);

  const httpServer = createServer(app);

  return httpServer;
}
