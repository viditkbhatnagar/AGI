import { Redirect } from "wouter";
import { useAuth } from "@/lib/auth-provider";
import { AnimatedLoginPage } from "@/components/ui/animated-characters-login-page";

export default function Login() {
  const { isAuthenticated, isLoading, userRole } = useAuth();

  if (isAuthenticated && !isLoading) {
    const redirectPath = userRole === 'admin' || userRole === 'superadmin' ? '/admin' :
      userRole === 'teacher' ? '/teacher' : '/student';
    return <Redirect to={redirectPath} />;
  }

  return <AnimatedLoginPage />;
}
