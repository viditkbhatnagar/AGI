import { pgTable, text, serial, integer, boolean, timestamp, uuid, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// User Schema
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  role: text("role", { enum: ["admin", "student"] }).notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  email: true,
  password: true,
  role: true,
});

// Student Schema
export const students = pgTable("students", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  name: text("name").notNull(),
  phone: text("phone"),
  address: text("address"),
  dob: timestamp("dob"),
  pathway: text("pathway", { enum: ["standalone", "with-mba"] }).notNull(),
  courseProgress: jsonb("course_progress"),
  quizSummary: jsonb("quiz_summary"),
  certificateReady: jsonb("certificate_ready"),
  watchTime: jsonb("watch_time"),
});

export const insertStudentSchema = createInsertSchema(students).pick({
  userId: true,
  name: true,
  phone: true,
  address: true,
  dob: true,
  pathway: true,
});

// Course Schema
export const courses = pgTable("courses", {
  id: serial("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  title: text("title").notNull(),
  type: text("type", { enum: ["standalone", "with-mba"] }).notNull(),
  liveClassConfig: jsonb("live_class_config"),
  mbaModules: jsonb("mba_modules"),
  modules: jsonb("modules"),
});

export const insertCourseSchema = createInsertSchema(courses).pick({
  slug: true,
  title: true,
  type: true,
  liveClassConfig: true,
  mbaModules: true,
  modules: true,
});

// Enrollment Schema
export const enrollments = pgTable("enrollments", {
  id: serial("id").primaryKey(),
  studentId: integer("student_id").notNull().references(() => students.id),
  courseSlug: text("course_slug").notNull().references(() => courses.slug),
  enrollDate: timestamp("enroll_date").notNull(),
  validUntil: timestamp("valid_until").notNull(),
  completedModules: jsonb("completed_modules"),
  quizAttempts: jsonb("quiz_attempts"),
  finalExamAttempts: jsonb("final_exam_attempts"),
});

// Final Examination Schema
export const finalExaminations = pgTable("final_examinations", {
  id: serial("id").primaryKey(),
  courseSlug: text("course_slug").notNull().unique().references(() => courses.slug),
  title: text("title").notNull(),
  description: text("description"),
  questions: jsonb("questions").notNull(),
  passingScore: integer("passing_score").notNull().default(70),
  maxAttempts: integer("max_attempts").notNull().default(3),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertEnrollmentSchema = createInsertSchema(enrollments).pick({
  studentId: true,
  courseSlug: true,
  enrollDate: true,
  validUntil: true,
});

// LiveClass Schema
export const liveClasses = pgTable("live_classes", {
  id: serial("id").primaryKey(),
  courseSlug: text("course_slug").notNull().references(() => courses.slug),
  title: text("title").notNull(),
  description: text("description"),
  meetLink: text("meet_link"),
  startTime: timestamp("start_time").notNull(),
  endTime: timestamp("end_time").notNull(),
  status: text("status", { enum: ["scheduled", "completed", "cancelled"] }).notNull(),
});

export const insertLiveClassSchema = createInsertSchema(liveClasses).pick({
  courseSlug: true,
  title: true,
  description: true,
  meetLink: true,
  startTime: true,
  endTime: true,
  status: true,
});

// Sandbox Course Schema
export const sandboxCourses = pgTable("sandbox_courses", {
  id: serial("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  title: text("title").notNull(),
  type: text("type", { enum: ["standalone", "with-mba"] }).notNull(),
  liveClassConfig: jsonb("live_class_config"),
  mbaModules: jsonb("mba_modules"),
  modules: jsonb("modules"),
});

export const insertSandboxCourseSchema = createInsertSchema(sandboxCourses).pick({
  slug: true,
  title: true,
  type: true,
  liveClassConfig: true,
  mbaModules: true,
  modules: true,
});

// Recordings Schema
export const recordings = pgTable("recordings", {
  id: serial("id").primaryKey(),
  courseSlug: text("course_slug").notNull().references(() => courses.slug),
  classDate: timestamp("class_date").notNull(), // Date the class was taught
  title: text("title").notNull(),
  description: text("description"),
  fileUrl: text("file_url").notNull(), // Google Drive link
  uploadedBy: integer("uploaded_by").notNull().references(() => users.id),
  uploadedAt: timestamp("uploaded_at").notNull(),
  isVisible: boolean("is_visible").notNull().default(true),
});

export const insertRecordingSchema = createInsertSchema(recordings).pick({
  courseSlug: true,
  classDate: true,
  title: true,
  description: true,
  fileUrl: true,
  uploadedBy: true,
  uploadedAt: true,
  isVisible: true,
});

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Student = typeof students.$inferSelect;
export type InsertStudent = z.infer<typeof insertStudentSchema>;

export type Course = typeof courses.$inferSelect;
export type InsertCourse = z.infer<typeof insertCourseSchema>;

export type SandboxCourse = typeof sandboxCourses.$inferSelect;
export type InsertSandboxCourse = z.infer<typeof insertSandboxCourseSchema>;

export type Enrollment = typeof enrollments.$inferSelect;
export type InsertEnrollment = z.infer<typeof insertEnrollmentSchema>;

export type LiveClass = typeof liveClasses.$inferSelect;
export type InsertLiveClass = z.infer<typeof insertLiveClassSchema>;

export type Recording = typeof recordings.$inferSelect;
export type InsertRecording = z.infer<typeof insertRecordingSchema>;

// Extended schema types based on MongoDB collections
export type ModuleVideo = {
  id: string;
  title: string;
  duration: number;
  url: string;
  watched?: boolean;
  watchedTime?: number;
};

export type ModuleDocument = {
  id: string;
  title: string;
  type: 'link' | 'upload';
  // For link-based documents (backward compatibility)
  url?: string;
  // For uploaded documents (new functionality)
  fileUrl?: string;
  fileName?: string;
  fileSize?: number;
  fileType?: string;
  publicId?: string;
  read?: boolean;
};

export type SandboxModuleDocument = {
  id: string;
  title: string;
  fileUrl: string; // Cloudinary URL for uploaded files
  fileName: string;
  fileSize: number;
  fileType: string;
  publicId: string; // Cloudinary public ID for management
  read?: boolean;
};

export type ModuleQuiz = {
  id: string;
  title: string;
  questions: {
    id: string;
    text: string;
    options: string[];
    correctAnswer: number;
  }[];
};

export type Module = {
  title: string;
  videos: ModuleVideo[];
  documents: ModuleDocument[];
  quizId: string | null;
};

export type LiveClassConfig = {
  enabled: boolean;
  frequency: 'weekly' | 'biweekly' | 'monthly';
  dayOfWeek: string;
  durationMin: number;
};

export type WatchTimeRecord = {
  date: string;
  moduleId: string;
  videoId: string;
  duration: number;
};

export type QuizAttempt = {
  quizId: string;
  date: string;
  score: number;
  maxScore: number;
  passed: boolean;
};

export type FinalExamAttempt = {
  examId: string;
  attemptedAt: string;
  score?: number; // Optional for essay questions, set by admin later
  maxScore: number;
  passed?: boolean; // Optional for essay questions, determined after grading
  attemptNumber: number;
  answers: (number | {
    type: 'file' | 'text';
    content: string; // For text answers or file URL
    fileName?: string; // For file uploads
  })[];
  requiresManualGrading: boolean;
  gradedBy?: string; // Admin who graded this attempt
  gradedAt?: string; // When it was graded
};

// Final Exam Question Types
export type FinalExamMCQQuestion = {
  type: 'mcq';
  text: string;
  choices: string[];
  correctIndex: number;
};

export type FinalExamEssayQuestion = {
  type: 'essay';
  questionDocument: {
    title: string;
    url: string;
    type: 'word' | 'pdf' | 'ppt' | 'image' | 'excel' | 'csv' | 'textbox';
    fileName: string;
  };
  allowedAnswerFormats: ('word' | 'powerpoint' | 'pdf' | 'excel' | 'csv' | 'image')[];
};

export type FinalExamQuestion = FinalExamMCQQuestion | FinalExamEssayQuestion;

export type FinalExamination = {
  id: string;
  courseSlug: string;
  title: string;
  description?: string;
  questions: FinalExamQuestion[];
  createdAt: string;
  updatedAt: string;
};
