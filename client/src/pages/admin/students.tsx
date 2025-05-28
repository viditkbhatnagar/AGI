import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Students } from "@/components/admin/students";
import { Helmet } from "react-helmet-async";

export default function StudentsPage() {
  return (
    <DashboardLayout>
      <Helmet>
        <title>Students | AGI</title>
        <meta name="description" content="Manage student accounts, view their progress, and update their information." />
      </Helmet>
      <Students />
    </DashboardLayout>
  );
}
