import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { TeacherDashboard } from "@/components/teacher/dashboard";
import { Helmet } from "react-helmet-async";

export default function TeacherDashboardPage() {
  return (
    <DashboardLayout>
      <Helmet>
        <title>Teacher Dashboard | AGI.online</title>
        <meta name="description" content="Manage your courses, students, and teaching activities." />
      </Helmet>
      <TeacherDashboard />
    </DashboardLayout>
  );
}