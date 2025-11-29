import { BackgroundPaths } from "@/components/ui/background-paths";

export default function BackgroundPathsDemo() {
  const navigateToLogin = () => {
    window.location.href = '/login';
  };

  return (
    <BackgroundPaths
      title="Professional Certification Platform"
      subtitle="Welcome to AGI.online"
      description="Transform your career with industry-recognized certifications. Access comprehensive courses, interactive modules, live classes, and earn digital certificates that validate your expertise worldwide."
      buttonText="Begin Your Journey"
      onButtonClick={navigateToLogin}
    />
  );
}

