import { BackgroundPaths } from "@/components/ui/background-paths";

export default function LandingPage() {
  const handleGetStarted = () => {
    window.location.href = "/login";
  };

  const quotes = [
    "Access focused, industry-aligned courses designed to prepare you for professional certifications that validate expertise in your field",
    "Advance through structured modules that take you from fundamentals to mastery",
  ];

  return (
    <BackgroundPaths
      title="Build the Skills Employers Actually Want"
      subtitle="Your Professional Certification Training Platform"
      description="Choose your path. Explore certifications including CHRM, CPPM, CSCP, and more. Each program is built to validate real expertise and move your career forward."
      quotes={quotes}
      onGetStarted={handleGetStarted}
    />
  );
}

