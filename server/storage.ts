import {
  users,
  students,
  courses,
  enrollments,
  liveClasses,
  type User,
  type InsertUser,
  type Student,
  type InsertStudent,
  type Course,
  type InsertCourse,
  type Enrollment,
  type InsertEnrollment,
  type LiveClass,
  type InsertLiveClass
} from "@shared/schema";

// Modify the interface with CRUD methods for all models
export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, user: Partial<User>): Promise<User | undefined>;
  deleteUser(id: number): Promise<boolean>;

  // Student operations
  getStudent(id: number): Promise<Student | undefined>;
  getStudentByUserId(userId: number): Promise<Student | undefined>;
  getAllStudents(): Promise<Student[]>;
  createStudent(student: InsertStudent): Promise<Student>;
  updateStudent(id: number, student: Partial<Student>): Promise<Student | undefined>;
  deleteStudent(id: number): Promise<boolean>;

  // Course operations
  getCourse(id: number): Promise<Course | undefined>;
  getCourseBySlug(slug: string): Promise<Course | undefined>;
  getAllCourses(): Promise<Course[]>;
  createCourse(course: InsertCourse): Promise<Course>;
  updateCourse(id: number, course: Partial<Course>): Promise<Course | undefined>;
  deleteCourse(id: number): Promise<boolean>;

  // Enrollment operations
  getEnrollment(id: number): Promise<Enrollment | undefined>;
  getEnrollmentsByStudent(studentId: number): Promise<Enrollment[]>;
  getEnrollmentsByCourse(courseSlug: string): Promise<Enrollment[]>;
  getAllEnrollments(): Promise<Enrollment[]>;
  createEnrollment(enrollment: InsertEnrollment): Promise<Enrollment>;
  updateEnrollment(id: number, enrollment: Partial<Enrollment>): Promise<Enrollment | undefined>;
  deleteEnrollment(id: number): Promise<boolean>;

  // LiveClass operations
  getLiveClass(id: number): Promise<LiveClass | undefined>;
  getLiveClassesByCourse(courseSlug: string): Promise<LiveClass[]>;
  getUpcomingLiveClasses(): Promise<LiveClass[]>;
  getAllLiveClasses(): Promise<LiveClass[]>;
  createLiveClass(liveClass: InsertLiveClass): Promise<LiveClass>;
  updateLiveClass(id: number, liveClass: Partial<LiveClass>): Promise<LiveClass | undefined>;
  deleteLiveClass(id: number): Promise<boolean>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private students: Map<number, Student>;
  private courses: Map<number, Course>;
  private enrollments: Map<number, Enrollment>;
  private liveClasses: Map<number, LiveClass>;

  private userIdCounter: number;
  private studentIdCounter: number;
  private courseIdCounter: number;
  private enrollmentIdCounter: number;
  private liveClassIdCounter: number;

  constructor() {
    this.users = new Map();
    this.students = new Map();
    this.courses = new Map();
    this.enrollments = new Map();
    this.liveClasses = new Map();

    this.userIdCounter = 1;
    this.studentIdCounter = 1;
    this.courseIdCounter = 1;
    this.enrollmentIdCounter = 1;
    this.liveClassIdCounter = 1;
  }

  // USER OPERATIONS
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.email === email,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.userIdCounter++;
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  async updateUser(id: number, userData: Partial<User>): Promise<User | undefined> {
    const user = this.users.get(id);
    if (!user) return undefined;

    const updatedUser = { ...user, ...userData };
    this.users.set(id, updatedUser);
    return updatedUser;
  }

  async deleteUser(id: number): Promise<boolean> {
    return this.users.delete(id);
  }

  // STUDENT OPERATIONS
  async getStudent(id: number): Promise<Student | undefined> {
    return this.students.get(id);
  }

  async getStudentByUserId(userId: number): Promise<Student | undefined> {
    return Array.from(this.students.values()).find(
      (student) => student.userId === userId,
    );
  }

  async getAllStudents(): Promise<Student[]> {
    return Array.from(this.students.values());
  }

  async createStudent(insertStudent: InsertStudent): Promise<Student> {
    const id = this.studentIdCounter++;
    const student: Student = { ...insertStudent, id };
    this.students.set(id, student);
    return student;
  }

  async updateStudent(id: number, studentData: Partial<Student>): Promise<Student | undefined> {
    const student = this.students.get(id);
    if (!student) return undefined;

    const updatedStudent = { ...student, ...studentData };
    this.students.set(id, updatedStudent);
    return updatedStudent;
  }

  async deleteStudent(id: number): Promise<boolean> {
    return this.students.delete(id);
  }

  // COURSE OPERATIONS
  async getCourse(id: number): Promise<Course | undefined> {
    return this.courses.get(id);
  }

  async getCourseBySlug(slug: string): Promise<Course | undefined> {
    return Array.from(this.courses.values()).find(
      (course) => course.slug === slug,
    );
  }

  async getAllCourses(): Promise<Course[]> {
    return Array.from(this.courses.values());
  }

  async createCourse(insertCourse: InsertCourse): Promise<Course> {
    const id = this.courseIdCounter++;
    const course: Course = { ...insertCourse, id };
    this.courses.set(id, course);
    return course;
  }

  async updateCourse(id: number, courseData: Partial<Course>): Promise<Course | undefined> {
    const course = this.courses.get(id);
    if (!course) return undefined;

    const updatedCourse = { ...course, ...courseData };
    this.courses.set(id, updatedCourse);
    return updatedCourse;
  }

  async deleteCourse(id: number): Promise<boolean> {
    return this.courses.delete(id);
  }

  // ENROLLMENT OPERATIONS
  async getEnrollment(id: number): Promise<Enrollment | undefined> {
    return this.enrollments.get(id);
  }

  async getEnrollmentsByStudent(studentId: number): Promise<Enrollment[]> {
    return Array.from(this.enrollments.values()).filter(
      (enrollment) => enrollment.studentId === studentId,
    );
  }

  async getEnrollmentsByCourse(courseSlug: string): Promise<Enrollment[]> {
    return Array.from(this.enrollments.values()).filter(
      (enrollment) => enrollment.courseSlug === courseSlug,
    );
  }

  async getAllEnrollments(): Promise<Enrollment[]> {
    return Array.from(this.enrollments.values());
  }

  async createEnrollment(insertEnrollment: InsertEnrollment): Promise<Enrollment> {
    const id = this.enrollmentIdCounter++;
    const enrollment: Enrollment = { ...insertEnrollment, id };
    this.enrollments.set(id, enrollment);
    return enrollment;
  }

  async updateEnrollment(id: number, enrollmentData: Partial<Enrollment>): Promise<Enrollment | undefined> {
    const enrollment = this.enrollments.get(id);
    if (!enrollment) return undefined;

    const updatedEnrollment = { ...enrollment, ...enrollmentData };
    this.enrollments.set(id, updatedEnrollment);
    return updatedEnrollment;
  }

  async deleteEnrollment(id: number): Promise<boolean> {
    return this.enrollments.delete(id);
  }

  // LIVE CLASS OPERATIONS
  async getLiveClass(id: number): Promise<LiveClass | undefined> {
    return this.liveClasses.get(id);
  }

  async getLiveClassesByCourse(courseSlug: string): Promise<LiveClass[]> {
    return Array.from(this.liveClasses.values()).filter(
      (liveClass) => liveClass.courseSlug === courseSlug,
    );
  }

  async getUpcomingLiveClasses(): Promise<LiveClass[]> {
    const now = new Date();
    return Array.from(this.liveClasses.values()).filter(
      (liveClass) => liveClass.startTime > now && liveClass.status === 'scheduled',
    );
  }

  async getAllLiveClasses(): Promise<LiveClass[]> {
    return Array.from(this.liveClasses.values());
  }

  async createLiveClass(insertLiveClass: InsertLiveClass): Promise<LiveClass> {
    const id = this.liveClassIdCounter++;
    const liveClass: LiveClass = { ...insertLiveClass, id };
    this.liveClasses.set(id, liveClass);
    return liveClass;
  }

  async updateLiveClass(id: number, liveClassData: Partial<LiveClass>): Promise<LiveClass | undefined> {
    const liveClass = this.liveClasses.get(id);
    if (!liveClass) return undefined;

    const updatedLiveClass = { ...liveClass, ...liveClassData };
    this.liveClasses.set(id, updatedLiveClass);
    return updatedLiveClass;
  }

  async deleteLiveClass(id: number): Promise<boolean> {
    return this.liveClasses.delete(id);
  }
}

export const storage = new MemStorage();
