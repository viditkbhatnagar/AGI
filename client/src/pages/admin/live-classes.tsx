import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { LiveClasses } from "@/components/admin/live-classes";
import { Helmet } from "react-helmet-async";

export default function LiveClassesPage() {
  return (
    <DashboardLayout>
      <Helmet>
        <title>Live Classes | AGI.online</title>
        <meta name="description" content="Schedule and manage live classes for courses and students." />
      </Helmet>
      <LiveClasses />
    </DashboardLayout>
  );
}
