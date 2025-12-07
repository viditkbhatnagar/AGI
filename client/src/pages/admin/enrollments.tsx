import { AdminLayout } from "@/components/admin/layout/admin-layout";
import { Enrollments } from "@/components/admin/enrollments";
import { Helmet } from "react-helmet-async";

export default function EnrollmentsPage() {
  return (
    <AdminLayout>
      <Helmet>
        <title>Enrollments | AGI</title>
        <meta name="description" content="Manage student enrollments, track progress, and extend access periods." />
      </Helmet>
      <Enrollments />
    </AdminLayout>
  );
}
