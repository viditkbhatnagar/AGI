import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { LiveClasses } from "@/components/student/live-classes";
import { Helmet } from "react-helmet-async";

export default function LiveClassesPage() {
  return (
    <DashboardLayout>
      <Helmet>
        <title>Live Classes | AGI</title>
        <meta name="description" content="View and join scheduled live classes for your enrolled courses." />
      </Helmet>
      <LiveClasses />
    </DashboardLayout>
  );
}
