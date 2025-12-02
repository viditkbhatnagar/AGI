import { useState } from "react";
import { Helmet } from "react-helmet-async";
import { AdminLayout } from "@/components/admin/layout/admin-layout";
import { AdminDashboardNew } from "@/components/admin/admin-dashboard-new";

export default function Dashboard() {
  return (
    <AdminLayout>
      <Helmet>
        <title>Admin Dashboard | AGI.online</title>
        <meta name="description" content="Manage students, courses, and enrollments from the admin dashboard." />
      </Helmet>
      <AdminDashboardNew />
    </AdminLayout>
  );
}
