import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Courses } from "@/components/admin/courses";
import { Helmet } from "react-helmet-async";

export default function CoursesPage() {
  return (
    <DashboardLayout>
      <Helmet>
        <title>Courses | AGI.online</title>
        <meta name="description" content="Manage courses, add new content, and track student enrollments." />
      </Helmet>
      <Courses />
    </DashboardLayout>
  );
}
