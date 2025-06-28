import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { StudentRecordings } from "@/components/student/recordings";
import { Helmet } from "react-helmet-async";

export default function Recordings() {
  return (
    <DashboardLayout>
      <Helmet>
        <title>Course Recordings | Student Dashboard</title>
        <meta name="description" content="Access your course recordings and live class recordings." />
      </Helmet>
      <StudentRecordings />
    </DashboardLayout>
  );
} 