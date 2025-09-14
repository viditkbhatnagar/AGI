import DashboardLayout from "@/components/layout/dashboard-layout";
import { SandboxCourses } from "@/components/admin/sandbox-courses";

export default function SandboxCoursesPage() {
  return (
    <DashboardLayout>
      <SandboxCourses />
    </DashboardLayout>
  );
}
