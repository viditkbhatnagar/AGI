import { AdminLayout } from "@/components/admin/layout/admin-layout";
import { Courses } from "@/components/admin/courses";
import { Helmet } from "react-helmet-async";

export default function CoursesPage() {
  return (
    <AdminLayout>
      <Helmet>
        <title>Courses | AGI.online</title>
        <meta name="description" content="Manage courses, add new content, and track student enrollments." />
      </Helmet>
      <Courses />
    </AdminLayout>
  );
}
