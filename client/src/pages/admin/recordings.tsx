import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { AdminRecordings } from "@/components/admin/recordings";
import { Helmet } from "react-helmet-async";

export default function Recordings() {
  return (
    <DashboardLayout>
      <Helmet>
        <title>Recordings | Admin Dashboard</title>
        <meta name="description" content="Manage course recordings and live class recordings." />
      </Helmet>
      <AdminRecordings />
    </DashboardLayout>
  );
} 