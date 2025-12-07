import { AdminLayout } from "@/components/admin/layout/admin-layout";
import { AdminFeedbacks } from "@/components/admin/feedbacks";
import { Helmet } from "react-helmet-async";

export default function FeedbacksPage() {
  return (
    <AdminLayout>
      <Helmet>
        <title>Student Feedbacks | AGI.online</title>
        <meta name="description" content="View student feedback about courses and teachers." />
      </Helmet>
      <AdminFeedbacks />
    </AdminLayout>
  );
}
