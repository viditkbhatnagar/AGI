import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { StudentCertificates } from "@/components/student/certificates";
import { Helmet } from "react-helmet-async";

export default function Certificates() {
  return (
    <DashboardLayout>
      <Helmet>
        <title>My Certificates | AGI.online</title>
        <meta name="description" content="View and download your digital certificates earned from completed courses." />
      </Helmet>
      <StudentCertificates />
    </DashboardLayout>
  );
}
