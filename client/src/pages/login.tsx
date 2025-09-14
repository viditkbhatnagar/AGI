import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/lib/auth-provider";
import { Loader2 } from "lucide-react";
import { Redirect } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import Logo from "@components/layout/AGI Logo.png";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { isAuthenticated, login, isLoading, userRole } = useAuth();
  const { toast } = useToast();
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password) {
      toast({
        title: "Validation error",
        description: "Please enter both email and password",
        variant: "destructive",
      });
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      await login(email, password);
    } catch (error) {
      console.error("Login error:", error);
      // The toast is already shown in the login function
    } finally {
      setIsSubmitting(false);
    }
  };
  
  if (isAuthenticated && !isLoading) {
    const redirectPath = userRole === 'admin' || userRole === 'superadmin' ? '/admin' :
                        userRole === 'teacher' ? '/teacher' : '/student';
    return <Redirect to={redirectPath} />;
  }
  
  return (
    <div className="relative min-h-screen flex items-center justify-center p-6">
      {/* full‑bleed background image */}
      <div
        className="absolute inset-0 -z-10 bg-cover bg-center"
        style={{
          backgroundImage:
            "url('https://npr.brightspotcdn.com/dims3/default/strip/false/crop/6395x4263+0+0/resize/1920/quality/60/format/jpeg/?url=http%3A%2F%2Fnpr-brightspot.s3.amazonaws.com%2Fcf%2Fab%2F3ede29c84de8befabea8ff3fafcb%2Fgettyimages-2206503756.jpg')",
        }}
      />
      {/* dark overlay to keep text legible */}
      <div className="absolute inset-0 -z-30 bg-black/20" />
      <Card
        className="w-full max-w-2xl border border-gray-200 bg-white/80 backdrop-blur-lg shadow-2xl animate-fadein rounded-2xl"
      >
        <CardHeader className="flex flex-col items-center gap-3 bg-white/60 rounded-t-2xl">
          <img
            src={Logo}
            alt="AGI Logo"
            className="h-28 w-auto drop-shadow-md"
          />
          <h1 className="text-3xl font-semibold text-[#2E3A59]">
            Welcome Back
          </h1>
          <p className="text-center text-sm text-[#2E3A59]/80 max-w-sm">
            Enhance your career with <span className="font-medium">global
            certifications</span>. Sign in to continue learning.
          </p>
        </CardHeader>

        <CardContent className="space-y-6 py-8 px-8">
          <form className="space-y-6" onSubmit={handleSubmit}>
            {/* email */}
            <div className="space-y-2">
              <label
                htmlFor="email"
                className="block text-sm font-medium text-[#2E3A59]"
              >
                Email address
              </label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                className="rounded-xl bg-white/60 backdrop-blur placeholder-gray-500 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-[#375BBE]"
              />
            </div>

            {/* password */}
            <div className="space-y-2">
              <label
                htmlFor="password"
                className="block text-sm font-medium text-[#2E3A59]"
              >
                Password
              </label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="rounded-xl bg-white/60 backdrop-blur placeholder-gray-500 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-[#375BBE]"
              />
            </div>

            {/* submit */}
            <Button
              type="submit"
              className="w-full transform rounded-xl bg-[#375BBE] py-3 text-lg font-semibold text-white shadow-md transition
                         hover:scale-[1.02] hover:bg-[#28479a] active:scale-95"
              disabled={isSubmitting || isLoading}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Signing in…
                </>
              ) : (
                "Sign in"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* keyframes */}
      <style jsx>{`
        @keyframes fadein {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fadein {
          animation: fadein 0.6s ease-out;
        }
      `}</style>
    </div>
  );
}
