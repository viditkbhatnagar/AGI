import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { StudentDashboard } from "@/components/student/dashboard";
import { Helmet } from "react-helmet-async";

export default function Dashboard() {
  return (
    <DashboardLayout>
      <Helmet>
        <title>Student Dashboard | AGI.online</title>
        <meta name="description" content="View your course progress, completed modules, and upcoming live classes." />
      </Helmet>
      <StudentDashboard />
    </DashboardLayout>
  );
}
