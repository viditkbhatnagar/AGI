import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { CourseDetail } from "@/components/student/course-detail";
import { Helmet } from "react-helmet-async";
import { useParams } from "wouter";

export default function CourseDetailPage() {
  const { slug } = useParams();
  
  return (
    <DashboardLayout>
      <Helmet>
        <title>Course Details | AGI</title>
        <meta name="description" content="View detailed information about your course, modules, and progress." />
      </Helmet>
      <CourseDetail slug={slug || ''} />
    </DashboardLayout>
  );
}
