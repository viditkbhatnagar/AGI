import { Request, Response } from 'express';
import { Student } from '../models/student';
import { Course } from '../models/course';
import { Enrollment } from '../models/enrollment';
import { LiveClass } from '../models/liveclass';
import mongoose from 'mongoose';
import Quiz from '../models/quiz';
import { Description } from '@radix-ui/react-toast';
import { format, startOfMonth } from 'date-fns';

// Get student dashboard data
export const getDashboard = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Not authenticated' });
    }

    // Find student by user ID
    const userObjectId = new mongoose.Types.ObjectId(req.user.id);
    const student = await Student.findOne({ userId: userObjectId });
    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }

    // Fetch this student's enrollments (we'll display the first one)
    const enrollments = await Enrollment.find({ studentId: student._id });
    if (enrollments.length === 0) {
      return res.status(200).json({ message: 'No courses enrolled' });
    }
    const enrollment = enrollments[0];

    // Load course details
    const course = await Course.findOne({ slug: enrollment.courseSlug });
    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }


    const enrollmentCompletedModules = enrollment.completedModules || [];
    const completedSet = new Set(
      enrollmentCompletedModules.map((m) => m.moduleIndex)
    );

    // Gather student’s existing records
    const watchRecords = student.watchTime   || [];
    const docRecords   = student.docViews    || [];
    // Now read quiz attempts from enrollment, not student
    const quizRecords  = enrollment.quizAttempts || [];

    // Compute per-module data (including percentComplete and completion status)
    // Gather module data asynchronously to allow awaiting quiz fetches
    const moduleData = await Promise.all(
      course.modules.map(async (module, idx) => {
        // Video progress
        const totalVideos = module.videos.length;
        const watchedVideos = new Set(
          watchRecords
            .filter(wt => wt.moduleIndex === idx)
            .map(wt => wt.videoIndex)
        ).size;
        const percentWatched = totalVideos
          ? (watchedVideos / totalVideos) * 100
          : 0;

        // Document progress
        const totalDocs = module.documents.length;
        const viewedDocs = docRecords.filter(dv => dv.moduleIndex === idx).length;
        const percentViewed = totalDocs
          ? (viewedDocs / totalDocs) * 100
          : 0;

        // Quiz progress
        const quizDone = quizRecords.some(qa => qa.moduleIndex === idx);
        const quizPercent = quizDone ? 100 : 0;

        // Quiz attempt statistics for this module
        const moduleAttempts = quizRecords.filter(a => a.moduleIndex === idx);
        const quizAttempts = moduleAttempts.length;
        // Last attempt score (most recent) - use attemptedAt timestamp
        const lastQuizScore = moduleAttempts.length
          ? moduleAttempts
              .sort((a, b) =>
                (b.attemptedAt as any) - (a.attemptedAt as any)
              )[0].score
          : null;
        const avgQuizScore = quizAttempts > 0
          ? Math.max(...moduleAttempts.map(a => a.score))
          : 0;

        // Final completion percentage
        const percentComplete = Math.round(
          (percentWatched + percentViewed + quizPercent) / 3
        );

        // Dynamically fetch quiz for this module, if any
        let quiz: any = null;
        if (module.quizId) {
          if (mongoose.Types.ObjectId.isValid(module.quizId as any)) {
            // Normal case: quizId is a real ObjectId string
            quiz = await Quiz.findById(module.quizId);
          } else {
            // Legacy seed data used a slug‑style string (e.g. "cscp-module-1-quiz")
            quiz = await Quiz.findOne({ courseSlug: course.slug, moduleIndex: idx });
          }
        } else {
          // Fallback – look up by course + module
          quiz = await Quiz.findOne({ courseSlug: course.slug, moduleIndex: idx });
        }
        const isCompleted = completedSet.has(idx);
        return {
          title: module.title,
          videos: module.videos,
          documents: module.documents,
          quizId: module.quizId,
          percentComplete,
          isCompleted,
          completedAt: (enrollmentCompletedModules.find(c => c.moduleIndex === idx)?.completedAt) || null,
          // Attach the quiz questions array
          questions: quiz?.questions || [],
          quizAttempts,
          avgQuizScore,
          lastQuizScore
        };
      })
    );
    // Now, add isLocked property based on previous module's completion (using completedSet)
    const modules = moduleData.map((mod, idx, arr) => ({
      ...mod,
      isLocked: idx > 0 && !completedSet.has(idx - 1)
    }));

    // Build pie‑chart data: best quiz score per module
    const quizScores = modules
      .filter(m => m.quizAttempts > 0)
      .map(m => ({ title: m.title, score: m.avgQuizScore }));



    //Overall course progress & counts
    // const totalModules     = modules.length;
    // const completedModulesCount = modules.filter(m => m.percentComplete === 100).length;
    // const courseProgress   = totalModules
    //   ? Math.round(modules.reduce((sum, m) => sum + m.percentComplete, 0) / totalModules)
    //   : 0;

    //Overall course progress and counts
    const totalModules         = modules.length;
    const completedModulesCount = modules.filter(m => m.isCompleted).length;
    const courseProgress       = totalModules > 0
     ? Math.round((completedModulesCount / totalModules) * 100)
    : 0;
    // count how many docs they've viewed across all modules
    const totalDocViews = student.docViews.length;


    // Compute average quiz score across all *completed* modules
    const completedQuizScores = modules
      .filter(m => m.isCompleted && m.quizAttempts > 0)
      .map(m => m.avgQuizScore);
    const rawQuizScores = enrollment.quizAttempts.map(a => a.score);

    const quizPerformance =
      rawQuizScores.length > 0
        ? Math.round(rawQuizScores.reduce((sum, s) => sum + s, 0) / rawQuizScores.length)
        : null;

    

    // Total & this-week watch time
    const totalWatchTime = watchRecords.reduce((sum, r) => sum + r.duration, 0);
    const startOfWeek = new Date();
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
    startOfWeek.setHours(0, 0, 0, 0);
    const thisWeekWatchTime = watchRecords
      .filter(r => new Date(r.date) >= startOfWeek)
      .reduce((sum, r) => sum + r.duration, 0);

    // Compute daily watch time (in minutes) grouped by date
    const watchTimeByDate: Record<string, number> = {};
    (watchRecords || []).forEach(({ date, duration }) => {
      const dayKey = format(new Date(date), 'yyyy-MM-dd');
      watchTimeByDate[dayKey] = (watchTimeByDate[dayKey] || 0) + duration;
    });
    const dailyWatchTime = Object.entries(watchTimeByDate)
      .map(([date, seconds]) => ({ date, minutes: Math.round(seconds / 60) }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Build lookup for documents viewed per date
    const docViewsByDate: Record<string, number> = {};
    (docRecords || []).forEach(({ date }) => {
      const dayKey = format(new Date(date), 'yyyy-MM-dd');
      docViewsByDate[dayKey] = (docViewsByDate[dayKey] || 0) + 1;
    });

    // Compute attendance for the past 7 days based on watchTime or docViews
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const attendance: { date: string; present: boolean }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const key = format(d, 'yyyy-MM-dd');
      const present = Boolean((watchTimeByDate[key] || 0) > 0 || (docViewsByDate[key] || 0) > 0);
      attendance.push({ date: key, present });
    }
    const presentCount = attendance.filter(d => d.present).length;
    const weeklyAttendanceRate = Math.round((presentCount / 7) * 100);

    // Monthly attendance: present days from 1st through today
    const monthStart = startOfMonth(today);
    const daysSoFar = today.getDate();
    let presentThisMonth = 0;
    for (let d = new Date(monthStart); d <= today; d.setDate(d.getDate() + 1)) {
      const key = format(d, 'yyyy-MM-dd');
      if ((watchTimeByDate[key] || 0) > 0 || (docViewsByDate[key] || 0) > 0) {
        presentThisMonth++;
      }
    }
    const monthlyAttendanceRate = Math.round((presentThisMonth / daysSoFar) * 100);

    // Upcoming live classes (for this course)
    const upcomingLiveClasses = await LiveClass.find({
      studentIds: student._id,
      //startTime:  { $gte: new Date() },
      status:     'scheduled'
    })
      .sort({ startTime: -1 })
      .limit(3);

    // Certification progress (capped at 100%)
    const certificationProgress = Math.min(courseProgress, 100);

    // Return the dashboard payload
    return res.status(200).json({
      student: {
        id:      student._id,
        name:    student.name,
        pathway: student.pathway
      },
      course: {
        slug:            course.slug,
        title:           course.title,
        type:            course.type,
        description:     course.description || '',
        enrollment: {
          enrollDate: enrollment.enrollDate,
          validUntil: enrollment.validUntil
        },
        progress:        courseProgress,
        totalModules,
        completedModules: completedModulesCount,
        modules
      },
      courseProgress:      courseProgress,
      completedModules:    `${completedModulesCount} of ${totalModules}`,
      quizPerformance,
      watchTime: {
        total:     formatWatchTime(totalWatchTime),
        thisWeek:  formatWatchTime(thisWeekWatchTime)
      },
      watchTimeInMinutes:       totalWatchTime,
      watchTimeThisWeekInMinutes: thisWeekWatchTime,
      dailyWatchTime,
      certificationProgress,
      upcomingLiveClasses,
      quizScores,    // pie chart data from modules above
      documentsViewed :totalDocViews, // total documents viewed
      // attendance data
      attendance,
      weeklyAttendanceRate,
      monthlyAttendanceRate
    });
  } catch (error) {
    console.error('Get student dashboard error:', error);
    return res.status(500).json({ message: 'Server error' });
  }
};

/**
 * GET /api/student/dashboard/:slug
 * Fetch course-specific dashboard data for the logged-in student
 */
export const getDashboardByCourse = async (req: Request, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ message: 'Not authenticated' });

    const { slug } = req.params;
    const userObjectId = new mongoose.Types.ObjectId(req.user.id);
    const student = await Student.findOne({ userId: userObjectId });
    if (!student) return res.status(404).json({ message: 'Student not found' });

    // Find the specific enrollment
    const enrollment = await Enrollment.findOne({ studentId: student._id, courseSlug: slug });
    if (!enrollment) return res.status(404).json({ message: 'Enrollment not found' });

    // Load course details
    const course = await Course.findOne({ slug });
    if (!course) return res.status(404).json({ message: 'Course not found' });

    // Reuse logic from getDashboard:
    // Gather records
    const watchRecords = student.watchTime || [];
    const docRecords   = student.docViews   || [];
    const quizRecords  = enrollment.quizAttempts || [];

    // Prepare completedModules set
    const completedSet = new Set(enrollment.completedModules.map(m => m.moduleIndex));

    // Build per-module data
    const moduleData = await Promise.all(
      course.modules.map(async (module, idx) => {
        // same computation as getDashboard...
        const totalVideos = module.videos.length;
        const watchedVideos = new Set(
          watchRecords.filter(wt => wt.moduleIndex === idx).map(wt => wt.videoIndex)
        ).size;
        const percentWatched = totalVideos ? (watchedVideos / totalVideos) * 100 : 0;

        const totalDocs = module.documents.length;
        const viewedDocs = docRecords.filter(dv => dv.moduleIndex === idx).length;
        const percentViewed = totalDocs ? (viewedDocs / totalDocs) * 100 : 0;

        const quizDone = quizRecords.some(qa => qa.moduleIndex === idx);
        const quizPercent = quizDone ? 100 : 0;

        const moduleAttempts = quizRecords.filter(a => a.moduleIndex === idx);
        const quizAttempts = moduleAttempts.length;
        const lastQuizScore = quizAttempts
          ? moduleAttempts.sort((a, b) => (b.attemptedAt as any) - (a.attemptedAt as any))[0].score
          : null;
        const avgQuizScore = quizAttempts > 0 ? Math.max(...moduleAttempts.map(a => a.score)) : 0;

        const percentComplete = Math.round((percentWatched + percentViewed + quizPercent) / 3);
        let quiz: any = null;
        if (module.quizId) {
          if (mongoose.Types.ObjectId.isValid(module.quizId as any)) {
            quiz = await Quiz.findById(module.quizId);
          } else {
            quiz = await Quiz.findOne({ courseSlug: course.slug, moduleIndex: idx });
          }
        } else {
          quiz = await Quiz.findOne({ courseSlug: course.slug, moduleIndex: idx });
        }

        return {
          title: module.title,
          videos: module.videos,
          documents: module.documents,
          quizId: module.quizId,
          percentComplete,
          isCompleted: completedSet.has(idx),
          completedAt: (enrollment.completedModules.find(c => c.moduleIndex === idx)?.completedAt) || null,
          questions: quiz?.questions || [],
          quizAttempts,
          avgQuizScore,
          lastQuizScore,
          isLocked: idx > 0 && !completedSet.has(idx - 1),
        };
      })
    );

    // Overall stats
    const totalModules = moduleData.length;
    const completedModulesCount = moduleData.filter(m => m.isCompleted).length;
    const courseProgress = totalModules ? Math.round((completedModulesCount / totalModules) * 100) : 0;
    const rawQuizScores = quizRecords.map(a => a.score);
    const quizPerformance = rawQuizScores.length
      ? Math.round(rawQuizScores.reduce((sum, s) => sum + s, 0) / rawQuizScores.length)
      : null;

    // Watch time
    const totalWatchTime = watchRecords.reduce((sum, r) => sum + r.duration, 0);
    const startOfWeek = new Date();
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
    startOfWeek.setHours(0, 0, 0, 0);
    const thisWeekWatchTime = watchRecords
      .filter(r => new Date(r.date) >= startOfWeek)
      .reduce((sum, r) => sum + r.duration, 0);
    const dailyWatchTime = Object.entries(
      watchRecords.reduce((acc, { date, duration }) => {
        const dayKey = format(new Date(date), 'yyyy-MM-dd');
        acc[dayKey] = (acc[dayKey] || 0) + duration;
        return acc;
      }, {} as Record<string, number>)
    ).map(([date, seconds]) => ({ date, minutes: Math.round(seconds / 60) }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // --- attendance (past 7 days) ---
    // Build lookup for documents viewed per date
    const watchTimeByDate: Record<string, number> = {};
    (watchRecords || []).forEach(({ date, duration }) => {
      const dayKey = format(new Date(date), 'yyyy-MM-dd');
      watchTimeByDate[dayKey] = (watchTimeByDate[dayKey] || 0) + duration;
    });
    const docViewsByDate: Record<string, number> = {};
    (docRecords || []).forEach(({ date }) => {
      const dayKey = format(new Date(date), 'yyyy-MM-dd');
      docViewsByDate[dayKey] = (docViewsByDate[dayKey] || 0) + 1;
    });
    // Compute attendance for the past 7 days based on watchTime or docViews
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const attendance: { date: string; present: boolean }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const key = format(d, 'yyyy-MM-dd');
      const present = Boolean((watchTimeByDate[key] || 0) > 0 || (docViewsByDate[key] || 0) > 0);
      attendance.push({ date: key, present });
    }
    const presentCount = attendance.filter(d => d.present).length;
    const weeklyAttendanceRate = Math.round((presentCount / 7) * 100);

    // Monthly attendance: present days from 1st through today
    const monthStart = startOfMonth(today);
    const daysSoFar = today.getDate();
    let presentThisMonth = 0;
    for (let d = new Date(monthStart); d <= today; d.setDate(d.getDate() + 1)) {
      const key = format(d, 'yyyy-MM-dd');
      if ((watchTimeByDate[key] || 0) > 0 || (docViewsByDate[key] || 0) > 0) {
        presentThisMonth++;
      }
    }
    const monthlyAttendanceRate = Math.round((presentThisMonth / daysSoFar) * 100);

    // Upcoming live classes for this course
    const upcomingLiveClasses = await LiveClass.find({
      studentIds: student._id,
      status: 'scheduled'
    }).sort({ startTime: -1 }).limit(3);

    const totalDocViews = docRecords.length;

    return res.status(200).json({
      student: {
        id: student._id,
        name: student.name,
        pathway: student.pathway
      },
      course: {
        slug: course.slug,
        title: course.title,
        type: course.type,
        description: course.description || '',
        enrollment: {
          enrollDate: enrollment.enrollDate,
          validUntil: enrollment.validUntil
        },
        progress: courseProgress,
        totalModules,
        completedModules: completedModulesCount,
        modules: moduleData
      },
      courseProgress,
      completedModules: `${completedModulesCount} of ${totalModules}`,
      quizPerformance,
      watchTime: {
        total: formatWatchTime(totalWatchTime),
        thisWeek: formatWatchTime(thisWeekWatchTime)
      },
      watchTimeInMinutes: totalWatchTime,
      watchTimeThisWeekInMinutes: thisWeekWatchTime,
      dailyWatchTime,
      certificationProgress: Math.min(courseProgress, 100),
      upcomingLiveClasses,
      quizScores: moduleData.map(m => ({ title: m.title, score: m.avgQuizScore })),
      documentsViewed: totalDocViews,
      attendance,
      weeklyAttendanceRate,
      monthlyAttendanceRate
    });
  } catch (error) {
    console.error('Get student dashboard by course error:', error);
    return res.status(500).json({ message: 'Server error' });
  }
};

// Record watch time
export const recordWatchTime = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Not authenticated' });
    }

    const { moduleIndex, videoIndex, duration } = req.body;

    if (typeof moduleIndex !== 'number' || typeof videoIndex !== 'number' || typeof duration !== 'number') {
      return res.status(400).json({ message: 'Invalid input data' });
    }

    // Find student
    const userObjectId = new mongoose.Types.ObjectId(req.user.id);
    const student = await Student.findOne({ userId: userObjectId });
    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }

    // Record watch time segment
    await Student.updateOne(
      { userId: userObjectId },
      {
        $push: {
          watchTime: {
            date: new Date(),
            moduleIndex,
            videoIndex,
            duration
          }
        }
      }
    );

    res.status(200).json({ message: 'Watch time recorded successfully' });
  } catch (error) {
    console.error('Record watch time error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Record document view
export const recordDocumentView = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Not authenticated' });
    }

    const { moduleIndex, docUrl } = req.body;
    if (typeof moduleIndex !== 'number' || typeof docUrl !== 'string') {
      return res.status(400).json({ message: 'Invalid input data' });
    }

    // Find student
    const userObjectId = new mongoose.Types.ObjectId(req.user.id);
    const student = await Student.findOne({ userId: userObjectId });
    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }
    // Add document view record if not already viewed
    await Student.updateOne(
      { userId: userObjectId, 'docViews.docUrl': { $ne: docUrl } },
      { $push: { docViews: { date: new Date(), moduleIndex, docUrl } } }
    );

    res.status(200).json({ message: 'Document view recorded successfully' });
  } catch (error) {
    console.error('Record document view error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get student profile
export const getProfile = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Not authenticated' });
    }

    // Find student by user ID
    const userObjectId = new mongoose.Types.ObjectId(req.user.id);
    const student = await Student.findOne({ userId: userObjectId });
    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }
    
    res.status(200).json({
      id: student._id,
      name: student.name,
      phone: student.phone,
      address: student.address,
      dob: student.dob,
      pathway: student.pathway,
      notifySettings: student.notifySettings
    });
  } catch (error) {
    console.error('Get student profile error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Update student profile
export const updateProfile = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Not authenticated' });
    }

    const { name, phone, address } = req.body;
    
    // Find student
    const userObjectId = new mongoose.Types.ObjectId(req.user.id);
    const student = await Student.findOne({ userId: userObjectId });
    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }
    
    // Update fields
    if (name) student.name = name;
    if (phone) student.phone = phone;
    if (address) student.address = address;
    
    await student.save();
    
    res.status(200).json({
      message: 'Profile updated successfully',
      student: {
        id: student._id,
        name: student.name,
        phone: student.phone,
        address: student.address
      }
    });
  } catch (error) {
    console.error('Update student profile error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Update notification settings
export const updateNotifySettings = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Not authenticated' });
    }

    const { courseProgress, quizSummary, certificateReady } = req.body;
    
    // Find student
    const userObjectId = new mongoose.Types.ObjectId(req.user.id);
    const student = await Student.findOne({ userId: userObjectId });
    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }
    
    // Update notification settings
    if (courseProgress) {
      student.notifySettings.courseProgress = courseProgress;
    }
    
    if (quizSummary) {
      student.notifySettings.quizSummary = quizSummary;
    }
    
    if (certificateReady) {
      student.notifySettings.certificateReady = certificateReady;
    }
    
    await student.save();
    
    res.status(200).json({
      message: 'Notification settings updated successfully',
      notifySettings: student.notifySettings
    });
  } catch (error) {
    console.error('Update notification settings error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get enrolled courses
export const getCourses = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Not authenticated' });
    }

    // Fetch the student
    const userObjectId = new mongoose.Types.ObjectId(req.user.id);
    const student = await Student.findOne({ userId: userObjectId });
    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }

    // Grab all watch‐time, doc‐view and quiz‐attempt records
    const watchRecords = student.watchTime || [];
    const docRecords   = student.docViews   || [];
    const quizRecords  = student.quizAttempts || [];

    // Get all enrollments for this student
    const enrollments = await Enrollment.find({ studentId: student._id });
    const enrolledCourses: any[] = [];

    for (const enrollment of enrollments) {
      const course = await Course.findOne({ slug: enrollment.courseSlug });
      if (!course) continue;

      // Process each module
      const modules = course.modules.map((module, idx) => {
        // Video progress
        const totalVideos = module.videos.length;
        const watchedVideos = new Set(
          watchRecords
            .filter(wt => wt.moduleIndex === idx)
            .map(wt => wt.videoIndex)
        ).size;
        const percentWatched = totalVideos > 0
          ? (watchedVideos / totalVideos) * 100
          : 0;

        // Document progress
        const totalDocs = module.documents.length;
        const viewedDocs = docRecords.filter(dv => dv.moduleIndex === idx).length;
        const percentViewed = totalDocs > 0
          ? (viewedDocs / totalDocs) * 100
          : 0;

        // Quiz progress
        const quizDone = quizRecords.some(qa => qa.moduleIndex === idx);
        const quizPercent = quizDone ? 100 : 0;

        // Final per‐module completion
        const percentComplete = Math.round(
          (percentWatched + percentViewed + quizPercent) / 3
        );

        return {
          title: module.title,
          videoCount: totalVideos,
          documentCount: totalDocs,
          percentComplete
        };
      });

      // Overall course progress = average of module percents
      const totalModules = modules.length;
      const progress = totalModules > 0
        ? Math.round(
            modules.reduce((sum, m) => sum + m.percentComplete, 0) / totalModules
          )
        : 0;

      enrolledCourses.push({
        id: course._id,
        slug: course.slug,
        title: course.title,
        description:    course.description || '',
        type: course.type,
        progress,
        modules,
        enrollment: {
          id:               enrollment._id,
          enrollDate:       enrollment.enrollDate,
          validUntil:       enrollment.validUntil,
          completedModules: enrollment.completedModules
        }
      });
    }

    return res.status(200).json(enrolledCourses);
  } catch (error) {
    console.error('Get enrolled courses error:', error);
    return res.status(500).json({ message: 'Server error' });
  }
};


/**
 * GET /api/student/courses/:slug
 * Fetch detailed view for a single course (modules, progress, quiz, docs, videos)
 */
export const getCourseDetail = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Not authenticated' });
    }

    const { slug } = req.params;
    const userObjectId = new mongoose.Types.ObjectId(req.user.id);
    const student = await Student.findOne({ userId: userObjectId });
    if (!student) return res.status(404).json({ message: 'Student not found' });

    // Find enrollment for requested course slug
    const enrollment = await Enrollment.findOne({ studentId: student._id, courseSlug: slug });
    if (!enrollment) return res.status(404).json({ message: 'Enrollment not found' });

    const course = await Course.findOne({ slug });
    if (!course) return res.status(404).json({ message: 'Course not found' });

    // Per-module logic, similar to getDashboard, but for this enrollment/course only
    const enrollmentCompletedModules = enrollment.completedModules || [];
    const completedSet = new Set(
      enrollmentCompletedModules.map((m: any) => m.moduleIndex)
    );

    // Gather student’s existing records
    const watchRecords = student.watchTime   || [];
    const docRecords   = student.docViews    || [];
    // Now read quiz attempts from enrollment, not student
    const quizRecords  = enrollment.quizAttempts || [];

    // Compute per-module data (including percentComplete and completion status)
    const moduleData = await Promise.all(
      course.modules.map(async (module: any, idx: number) => {
        // Video progress
        const totalVideos = module.videos.length;
        const watchedVideos = new Set(
          watchRecords
            .filter((wt: any) => wt.moduleIndex === idx)
            .map((wt: any) => wt.videoIndex)
        ).size;
        const percentWatched = totalVideos
          ? (watchedVideos / totalVideos) * 100
          : 0;

        // Document progress
        const totalDocs = module.documents.length;
        const viewedDocs = docRecords.filter((dv: any) => dv.moduleIndex === idx).length;
        const percentViewed = totalDocs
          ? (viewedDocs / totalDocs) * 100
          : 0;

        // Quiz progress
        const quizDone = quizRecords.some((qa: any) => qa.moduleIndex === idx);
        const quizPercent = quizDone ? 100 : 0;

        // Quiz attempt statistics for this module
        const moduleAttempts = quizRecords.filter((a: any) => a.moduleIndex === idx);
        const quizAttempts = moduleAttempts.length;
        const lastQuizScore = moduleAttempts.length
          ? moduleAttempts
              .sort((a: any, b: any) =>
                (b.attemptedAt as any) - (a.attemptedAt as any)
              )[0].score
          : null;
        const avgQuizScore = quizAttempts > 0
          ? Math.max(...moduleAttempts.map((a: any) => a.score))
          : 0;

        // Final completion percentage
        const percentComplete = Math.round(
          (percentWatched + percentViewed + quizPercent) / 3
        );

        // Dynamically fetch quiz for this module, if any
        let quiz: any = null;
        if (module.quizId) {
          if (mongoose.Types.ObjectId.isValid(module.quizId as any)) {
            quiz = await Quiz.findById(module.quizId);
          } else {
            quiz = await Quiz.findOne({ courseSlug: course.slug, moduleIndex: idx });
          }
        } else {
          quiz = await Quiz.findOne({ courseSlug: course.slug, moduleIndex: idx });
        }
        const isCompleted = completedSet.has(idx);
        return {
          title: module.title,
          videos: module.videos,
          documents: module.documents,
          quizId: module.quizId,
          percentComplete,
          isCompleted,
          completedAt: (enrollmentCompletedModules.find((c: any) => c.moduleIndex === idx)?.completedAt) || null,
          questions: quiz?.questions || [],
          quizAttempts,
          avgQuizScore,
          lastQuizScore
        };
      })
    );
    // Add isLocked property based on previous module's completion (using completedSet)
    const modules = moduleData.map((mod, idx, arr) => ({
      ...mod,
      isLocked: idx > 0 && !completedSet.has(idx - 1)
    }));

    // Overall course progress and counts
    const totalModules         = modules.length;
    const completedModulesCount = modules.filter((m: any) => m.isCompleted).length;
    const courseProgress       = totalModules > 0
     ? Math.round((completedModulesCount / totalModules) * 100)
    : 0;

    // Compute average quiz score across all *completed* modules
    const rawQuizScores = enrollment.quizAttempts.map((a: any) => a.score);
    const quizPerformance =
      rawQuizScores.length > 0
        ? Math.round(rawQuizScores.reduce((sum: number, s: number) => sum + s, 0) / rawQuizScores.length)
        : null;

    return res.status(200).json({
      slug: course.slug,
      title: course.title,
      description: course.description,
      type: course.type,
      enrollment: {
        enrollDate: enrollment.enrollDate,
        validUntil: enrollment.validUntil,
      },
      modules,
      progress: courseProgress,
      quizPerformance,
      completedModules: completedModulesCount,
      totalModules,
    });
  } catch (error) {
    console.error('Get course detail error:', error);
    return res.status(500).json({ message: 'Server error' });
  }
};

// Helper function to format watch time from seconds to hours and minutes
function formatWatchTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  
  return `${hours}h ${minutes}m`;
}

// Fetch quiz questions for a given courseSlug and moduleIndex
export const getQuiz = async (req: Request, res: Response) => {
  try {
    const { slug, moduleIndex } = req.params;
    const moduleIdx = parseInt(moduleIndex, 10);
    if (isNaN(moduleIdx)) {
      return res.status(400).json({ message: 'Invalid moduleIndex' });
    }
    const quiz = await Quiz.findOne({ courseSlug: slug, moduleIndex: moduleIdx });
    if (!quiz) {
      return res.status(404).json({ message: 'Quiz not found' });
    }
    return res.status(200).json({ questions: quiz.questions });
  } catch (error) {
    console.error('Get quiz error:', error);
    return res.status(500).json({ message: 'Server error' });
  }
};

// Record a student's quiz attempt, score it, and save to enrollment
export const submitQuizAttempt = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Not authenticated' });
    }
    const { slug, moduleIndex, answers } = req.body;
    const moduleIdx = parseInt(moduleIndex, 10);
    if (typeof slug !== 'string' || isNaN(moduleIdx) || !Array.isArray(answers)) {
      return res.status(400).json({ message: 'Invalid input data' });
    }
    // Find student
    const userObjectId = new mongoose.Types.ObjectId(req.user.id);
    const student = await Student.findOne({ userId: userObjectId });
    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }

    // Find the student's enrollment for this course
    const enrollment = await Enrollment.findOne({
      studentId: student._id,
      courseSlug: slug
    });
    if (!enrollment) {
      return res.status(404).json({ message: 'Enrollment not found' });
    }

    // Load quiz for scoring
    const quiz = await Quiz.findOne({ courseSlug: slug, moduleIndex: moduleIdx });
    if (!quiz) {
      return res.status(404).json({ message: 'Quiz not found' });
    }
    // Score the answers
    const total = quiz.questions.length;
    let correct = 0;
    quiz.questions.forEach((q, idx) => {
      if (answers[idx] === q.correctIndex) correct++;
    });
    const score = Math.round((correct / total) * 100);

    // Record the student's quiz attempt on the enrollment
    enrollment.quizAttempts.push({
      quizId: quiz._id.toString(),
      score,
      maxScore: quiz.questions.length,
      attemptedAt: new Date(),
      passed: score >= Math.round(quiz.questions.length * 0.7),
      moduleIndex: moduleIdx // for dashboard compatibility
    });
    await enrollment.save();

    // Mark module completed in enrollment if not already
    await Enrollment.updateOne(
      { studentId: student._id, courseSlug: slug, 'completedModules.moduleIndex': { $ne: moduleIdx } },
      { $push: { completedModules: { moduleIndex: moduleIdx, completed: true, completedAt: new Date() } } }
    );

    return res.status(200).json({ score, moduleIndex: moduleIdx });
  } catch (error) {
    console.error('Submit quiz attempt error:', error);
    return res.status(500).json({ message: 'Server error' });
  }
};

// GET /api/student/quiz-attempts/:slug/:moduleIndex
export const getQuizAttempts = async (req: Request, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ message: 'Not authenticated' });

    const { slug, moduleIndex } = req.params;
    const modIdx = parseInt(moduleIndex, 10);
    if (isNaN(modIdx)) return res.status(400).json({ message: 'Invalid moduleIndex' });

    const student = await Student.findOne({ userId: new mongoose.Types.ObjectId(req.user.id) });
    if (!student) return res.status(404).json({ message: 'Student not found' });

    const enrollment = await Enrollment.findOne({ studentId: student._id, courseSlug: slug });
    if (!enrollment) return res.status(404).json({ message: 'Enrollment not found' });

    // filter, sort, slice last 5 attempts
    const attempts = (enrollment.quizAttempts || [])
      .filter(a => a.moduleIndex === modIdx)
      .sort((a, b) => b.attemptedAt.getTime() - a.attemptedAt.getTime())
      .slice(0, 5)
      .map(a => ({ attemptedAt: a.attemptedAt, score: a.score }));

    return res.status(200).json({ attempts });
  } catch (err) {
    console.error('Get quiz attempts error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
};