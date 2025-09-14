import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { AdminFeedbacks } from "@/components/admin/feedbacks";
import { Helmet } from "react-helmet-async";

export default function FeedbacksPage() {
  return (
    <DashboardLayout>
      <Helmet>
        <title>Student Feedbacks | AGI.online</title>
        <meta name="description" content="View student feedback about courses and teachers." />
      </Helmet>
      <AdminFeedbacks />
    </DashboardLayout>
  );
}
