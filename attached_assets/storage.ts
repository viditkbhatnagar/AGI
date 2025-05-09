// server/storage.ts
import { Types } from 'mongoose';
import { User } from './models/user';
import { Student } from './models/student';
import { Course } from './models/course';
import { Enrollment } from './models/enrollment';
import { LiveClass } from './models/liveclass';

class Storage {
  //
  // ── AUTH / USERS ──────────────────────────────────────────────────────────────
  //

  /** Create a new user (admin or student account) */
  async createUser(data: {
    username: string;
    passwordHash: string;
    role: 'admin' | 'student';
  }) {
    const user = new User(data);
    await user.save();
    return user.toObject();
  }

  /** Look up a user by username */
  async getUserByUsername(username: string) {
    return await User.findOne({ username }).lean() || undefined;
  }

  //
  // ── STUDENTS ───────────────────────────────────────────────────────────────────
  //

  /** Create a new student + enrollment record */
  async createStudent(data: {
    name: string;
    phone: string;
    address?: string;
    dob: Date;
    pathway: 'standalone' | 'with-mba';
    courseSlug: string;
    validUntil: Date;
  }) {
    // 1) create the enrollment stub
    const enrollment = await Enrollment.create({
      studentId: null,
      courseSlug: data.courseSlug,
      enrollDate: new Date(),
      validUntil: data.validUntil,
      completedModules: [],
      quizAttempts: []
    });

    // 2) create the student and link the enrollment
    const student = new Student({
      name: data.name,
      phone: data.phone,
      address: data.address,
      dob: data.dob,
      pathway: data.pathway,
      enrollment: enrollment._id,
      eventLogs: [],
      reminders: [],
      certificate: {},
      notifySettings: {
        courseProgress: { frequencyDays: 3 },
        quizSummary:    { frequencyDays: 7 },
        certificateReady:{ enabled: true }
      },
      watchTime: []
    });
    await student.save();

    // 3) back-fill the enrollment.studentId
    enrollment.studentId
    await enrollment.save();

    return student.toObject();
  }

  /** Get one student by their MongoDB _id */
  async getStudentById(id: string) {
    return await Student.findById(id).lean() || undefined;
  }

  /** Get all students */
  async getAllStudents() {
    return await Student.find().lean();
  }

  /** Update the logged-in student’s profile */
  async updateStudentProfile(id: string, updates: Partial<any>) {
    return await Student.findByIdAndUpdate(id, updates, { new: true }).lean() || undefined;
  }

  //
  // ── COURSES ────────────────────────────────────────────────────────────────────
  //

  /** Create a new course (standalone or with-mba) */
  async createCourse(data: any) {
    const c = new Course(data);
    await c.save();
    return c.toObject();
  }

  /** List all courses */
  async getAllCourses() {
    return await Course.find().lean();
  }

  /** Lookup a course by its slug */
  async getCourseBySlug(slug: string) {
    return await Course.findOne({ slug }).lean() || undefined;
  }

  //
  // ── ENROLLMENTS ────────────────────────────────────────────────────────────────
  //

  /** Find the enrollment record for a given student */
  async getEnrollmentByStudentId(studentId: string) {
    const e = await Enrollment.findOne({ studentId: new Types.ObjectId(studentId) }).lean();
    return e || undefined;
  }

  /** Mark that the student has completed module at index */
  async markModuleComplete(studentId: string, moduleIndex: number) {
    await Enrollment.updateOne(
      { studentId: new Types.ObjectId(studentId) },
      { $addToSet: { completedModules: moduleIndex } }
    );
  }

  /** Record one quiz attempt */
  async recordQuizAttempt(studentId: string, moduleIndex: number, score: number) {
    await Enrollment.updateOne(
      { studentId: new Types.ObjectId(studentId) },
      { $push: { quizAttempts: { moduleIndex, score, attemptDate: new Date() } } }
    );
  }

  //
  // ── LIVE CLASSES ───────────────────────────────────────────────────────────────
  //

  /** Schedule a new live class */
  async createLiveClass(data: {
    courseSlug: string;
    teacherId: string;
    studentIds: string[];
    startsAt: Date;
    durationMin?: number;
  }) {
    const lc = new LiveClass({
      courseSlug: data.courseSlug,
      teacherId: new Types.ObjectId(data.teacherId),
      studentIds: data.studentIds.map(id => new Types.ObjectId(id)),
      startsAt: data.startsAt,
      durationMin: data.durationMin ?? 150
    });
    await lc.save();
    return lc.toObject();
  }

  /** List all live-classes */
  async getAllLiveClasses() {
    return await LiveClass.find().lean();
  }

  /** Get only the live-classes a given student is enrolled in */
  async getLiveClassesForStudent(studentId: string) {
    return await LiveClass.find({ studentIds: Types.ObjectId }).lean();
  }

  /** Get only the live-classes a given teacher is scheduled for */
  async getLiveClassesForTeacher(teacherId: string) {
    return await LiveClass.find({ teacherId: new Types.ObjectId(teacherId) }).lean();
  }

  //
  // ── WATCH TIME ────────────────────────────────────────────────────────────────
  //

  /** Append some watch‐time for a given student/module */
  async recordWatchTime(studentId: string, moduleIndex: number, minutesWatched: number) {
    await Student.updateOne(
      { _id: new Types.ObjectId(studentId) },
      { $push: { watchTime: { moduleIndex, minutesWatched } } }
    );
  }

  /** Pull back all watchTime entries */
  async getStudentWatchTime(studentId: string) {
    const s = await Student.findById(studentId).lean();
    return s?.watchTime || [];
  }

  //
  // ── PROGRESS SUMMARY ─────────────────────────────────────────────────────────────
  //

  /** Returns how many modules are done vs total modules for that course */
  async getCourseProgress(studentId: string) {
    const e = await Enrollment.findOne({ studentId: new Types.ObjectId(studentId) }).lean();
    const completed = e?.completedModules || [];
    const c = await Course.findOne({ slug: e?.courseSlug }).lean();
    const total = c?.modules?.length ?? 0;
    return { completedModules: completed, totalModules: total };
  }

  /** Alias: fetch a single student by ID */
  async getStudent(id: string) {
    return await this.getStudentById(id);
  }

  /** Alias: update a student by ID */
  async updateStudent(id: string, updates: Partial<any>) {
    return await this.updateStudentProfile(id, updates);
  }

  /** Delete a student by ID */
  async deleteStudent(id: string) {
    return await Student.findOneAndDelete({ _id: new Types.ObjectId(id) }).lean() || undefined;
  }

  /** Alias: list all live classes */
  async getLiveClasses() {
    return await this.getAllLiveClasses();
  }
}

export default new Storage();