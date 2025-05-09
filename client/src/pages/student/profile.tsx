import Profile from '@/components/student/profile';
import DashboardLayout from '@/components/layout/dashboard-layout';
import { Helmet } from 'react-helmet-async';

export default function ProfilePage() {
  return (
    <>
      <Helmet>
        <title>Profile - AGI.online</title>
        <meta name="description" content="Manage your profile information" />
      </Helmet>
      <DashboardLayout>
        <Profile />
      </DashboardLayout>
    </>
  );
}