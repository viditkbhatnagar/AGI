import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Login from "@/pages/login";
import { AuthProvider, useAuth } from "@/lib/auth-provider";
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

// Admin Pages
import AdminDashboard from "@/pages/admin/dashboard";
import AdminStudents from "@/pages/admin/students";
import AdminCourses from "@/pages/admin/courses";
import AdminEnrollments from "@/pages/admin/enrollments";
import AdminLiveClasses from "@/pages/admin/live-classes";
import AdminRecordings from "@/pages/admin/recordings";
import AddStudent from "@/pages/admin/AddStudent";
import AddCourse from "@/pages/admin/AddCourse";
import EditCourse from "@/pages/admin/EditCourse";
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
      <Route path="/student/live-classes" component={StudentLiveClasses} />
      <Route path="/student/recordings" component={StudentRecordings} />
      <Route path="/student/profile" component={StudentProfile} />
      <Route path="/student/support" component={StudentSupport} />
      <Route path="/student/debug" component={StudentDebug} />
      
      {/* Admin Routes */}
      <Route path="/admin/students/new" component={AddStudent} />
      <Route path="/admin/courses/new" component={AddCourse} />
      <Route path="/admin/courses/edit/:slug" component={EditCourse} />
      <Route path="/admin/live-classes/new" component={ScheduleLiveClass} />
      <Route path="/admin/students" component={AdminStudents} />
      <Route path="/admin/courses" component={AdminCourses} />
      <Route path="/admin/enrollments" component={AdminEnrollments} />
      <Route path="/admin/live-classes" component={AdminLiveClasses} />
      <Route path="/admin/recordings" component={AdminRecordings} />
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
    } else if (userRole === "admin") {
      setLocation("/admin");
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
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
