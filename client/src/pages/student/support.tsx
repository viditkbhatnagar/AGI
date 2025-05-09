import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Support } from "@/components/student/support";
import { Helmet } from "react-helmet-async";

export default function SupportPage() {
  return (
    <DashboardLayout>
      <Helmet>
        <title>Support | AGI.online</title>
        <meta name="description" content="Get help with your courses or technical issues from our support team." />
      </Helmet>
      <Support />
    </DashboardLayout>
  );
}
