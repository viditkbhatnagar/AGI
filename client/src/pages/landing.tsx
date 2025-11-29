import { BackgroundPaths } from "@/components/ui/background-paths";

export default function LandingPage() {
  const handleGetStarted = () => {
    window.location.href = "/login";
  };

  const quotes = [
    "Transform your career with industry-recognized certifications",
    "Access comprehensive courses and interactive modules",
    "Earn digital certificates that validate your expertise worldwide",
  ];

  return (
    <BackgroundPaths
      subtitle="Professional Certification Platform"
      description="Choose from standalone professional certifications like CHRM, CPPM, CSCP, or comprehensive MBA-integrated programs. Each course is structured with progressive modules, ensuring mastery at every step."
      quotes={quotes}
      onGetStarted={handleGetStarted}
    />
  );
}

