import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { StudentFeedback } from "@/components/student/feedback";
import { Helmet } from "react-helmet-async";

export default function FeedbackPage() {
  return (
    <DashboardLayout>
      <Helmet>
        <title>Feedback | AGI.online</title>
        <meta name="description" content="Provide feedback about your courses and teachers." />
      </Helmet>
      <StudentFeedback />
    </DashboardLayout>
  );
}
