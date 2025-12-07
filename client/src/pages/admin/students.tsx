import { AdminLayout } from "@/components/admin/layout/admin-layout";
import { Students } from "@/components/admin/students";
import { Helmet } from "react-helmet-async";

export default function StudentsPage() {
  return (
    <AdminLayout>
      <Helmet>
        <title>Students | AGI</title>
        <meta name="description" content="Manage student accounts, view their progress, and update their information." />
      </Helmet>
      <Students />
    </AdminLayout>
  );
}
