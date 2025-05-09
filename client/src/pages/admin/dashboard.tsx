import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { AdminDashboard } from "@/components/admin/dashboard";
import { Helmet } from "react-helmet-async";

export default function Dashboard() {
  return (
    <DashboardLayout>
      <Helmet>
        <title>Admin Dashboard | AGI.online</title>
        <meta name="description" content="Manage students, courses, and enrollments from the admin dashboard." />
      </Helmet>
      <AdminDashboard />
    </DashboardLayout>
  );
}
