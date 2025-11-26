import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Login from "@/pages/login";
import { AuthProvider, useAuth } from "@/lib/auth-provider";
import { PermissionsProvider } from "@/lib/permissions-provider";
import { useEffect } from "react";

// Student Pages
import StudentDashboard from "@/pages/student/dashboard";
import StudentCourses from "@/pages/student/courses";
import StudentCourseDetail from "@/pages/student/course-detail";
import StudentLiveClasses from "@/pages/student/live-classes";
import StudentRecordings from "@/pages/student/recordings";
import StudentSupport from "@/pages/student/support";
import StudentProfile from "@/pages/student/profile";
import StudentDebug from "@/pages/student/debug";
import StudentFeedback from "@/pages/student/feedback";
import StudentFinalExaminations from "@/pages/student/final-examinations";

// Teacher Pages
import TeacherDashboard from "./pages/teacher/dashboard";
import TeacherStudents from "./pages/teacher/students";
import TeacherCourses from "./pages/teacher/courses";
import TeacherLiveClasses from "./pages/teacher/live-classes";
import TeacherRecordings from "./pages/teacher/recordings";
import TeacherExamResults from "./pages/teacher/exam-results";
import TeacherChangePassword from "./pages/teacher/change-password";

// Admin Pages
import AdminDashboard from "@/pages/admin/dashboard";
import AdminStudents from "@/pages/admin/students";
import AdminCourses from "@/pages/admin/courses";
import AdminSandboxCourses from "@/pages/admin/sandbox-courses";
import AdminEnrollments from "@/pages/admin/enrollments";
import AdminLiveClasses from "@/pages/admin/live-classes";
import AdminRecordings from "@/pages/admin/recordings";
import AdminQuizScores from "@/pages/admin/quiz-scores";
import AdminExamResults from "@/pages/admin/exam-results";
import AdminFeedbacks from "@/pages/admin/feedbacks";
import AdminLastLogins from "@/pages/admin/last-logins";
import QuizRepositoryPage from "@/pages/admin/quiz-repository";

import AddStudent from "@/pages/admin/AddStudent";
import AddTeacher from "@/pages/admin/AddTeacher";
import AddCourse from "@/pages/admin/AddCourse";
import AddSandboxCourse from "@/pages/admin/AddSandboxCourse";
import EditCourse from "@/pages/admin/EditCourse";
import EditSandboxCourse from "@/pages/admin/EditSandboxCourse";
import CourseEditPage from "@/pages/admin/course-edit";
import SandboxCourseEditPage from "@/pages/admin/sandbox-course-edit";
import ScheduleLiveClass from "@/pages/admin/ScheduleLiveClass";

function Router() {
  return (
    <Switch>
      {/* Auth Routes */}
      <Route path="/login" component={Login} />

      {/* Student Routes */}
      <Route path="/student" component={StudentDashboard} />
      <Route path="/student/courses" component={StudentCourses} />
      <Route path="/student/courses/:slug" component={StudentCourseDetail} />
      <Route path="/student/final-examinations" component={StudentFinalExaminations} />
      <Route path="/student/live-classes" component={StudentLiveClasses} />
      <Route path="/student/recordings" component={StudentRecordings} />
      <Route path="/student/profile" component={StudentProfile} />
      <Route path="/student/feedback" component={StudentFeedback} />
      <Route path="/student/support" component={StudentSupport} />
      <Route path="/student/debug" component={StudentDebug} />

      {/* Teacher Routes */}
      <Route path="/teacher" component={TeacherDashboard} />
      <Route path="/teacher/students" component={TeacherStudents} />
      <Route path="/teacher/courses" component={TeacherCourses} />
      <Route path="/teacher/live-classes" component={TeacherLiveClasses} />
      <Route path="/teacher/recordings" component={TeacherRecordings} />
      <Route path="/teacher/exam-results" component={TeacherExamResults} />
      <Route path="/teacher/change-password" component={TeacherChangePassword} />

      {/* Admin Routes */}
      <Route path="/admin/students/new" component={AddStudent} />
      <Route path="/admin/teachers/new" component={AddTeacher} />
      <Route path="/admin/courses/new" component={AddCourse} />
      <Route path="/admin/courses/edit/:slug" component={EditCourse} />
      <Route path="/admin/courses/reorder/:slug" component={CourseEditPage} />
      <Route path="/admin/sandbox-courses/new" component={AddSandboxCourse} />
      <Route path="/admin/sandbox-courses/edit/:slug" component={EditSandboxCourse} />
      <Route path="/admin/sandbox-courses/reorder/:slug" component={SandboxCourseEditPage} />
      <Route path="/admin/live-classes/new" component={ScheduleLiveClass} />
      <Route path="/admin/students" component={AdminStudents} />
      <Route path="/admin/courses" component={AdminCourses} />
      <Route path="/admin/sandbox-courses" component={AdminSandboxCourses} />
      <Route path="/admin/quiz-repository" component={QuizRepositoryPage} />
      <Route path="/admin/enrollments" component={AdminEnrollments} />
      <Route path="/admin/live-classes" component={AdminLiveClasses} />
      <Route path="/admin/recordings" component={AdminRecordings} />
      <Route path="/admin/quiz-scores" component={AdminQuizScores} />
      <Route path="/admin/exam-results" component={AdminExamResults} />
      <Route path="/admin/feedbacks" component={AdminFeedbacks} />
      <Route path="/admin/last-logins" component={AdminLastLogins} />
      <Route path="/admin" component={AdminDashboard} />

      {/* Default Route - Redirect based on user role */}
      <Route path="/">
        <RoleBasedRedirect />
      </Route>

      {/* Fallback to 404 */}
      <Route component={NotFound} />
    </Switch>
  );
}

function RoleBasedRedirect() {
  const [_, setLocation] = useLocation();
  const { isAuthenticated, userRole } = useAuth();

  useEffect(() => {
    if (!isAuthenticated) {
      setLocation("/login");
    } else if (userRole === "admin" || userRole === "superadmin") {
      setLocation("/admin");
    } else if (userRole === "teacher") {
      setLocation("/teacher");
    } else {
      setLocation("/student");
    }
  }, [isAuthenticated, userRole, setLocation]);

  return null;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <PermissionsProvider>
          <TooltipProvider>
            <Toaster />
            <Router />
          </TooltipProvider>
        </PermissionsProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
