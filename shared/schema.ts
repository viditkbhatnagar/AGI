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

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Student = typeof students.$inferSelect;
export type InsertStudent = z.infer<typeof insertStudentSchema>;

export type Course = typeof courses.$inferSelect;
export type InsertCourse = z.infer<typeof insertCourseSchema>;

export type Enrollment = typeof enrollments.$inferSelect;
export type InsertEnrollment = z.infer<typeof insertEnrollmentSchema>;

export type LiveClass = typeof liveClasses.$inferSelect;
export type InsertLiveClass = z.infer<typeof insertLiveClassSchema>;

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
  url: string;
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
