import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { StudentCourses } from "@/components/student/courses";
import { Helmet } from "react-helmet-async";

export default function Courses() {
  return (
    <DashboardLayout>
      <Helmet>
        <title>My Courses | AGI</title>
        <meta name="description" content="View all your enrolled courses, track progress, and continue learning." />
      </Helmet>
      <StudentCourses />
    </DashboardLayout>
  );
}
