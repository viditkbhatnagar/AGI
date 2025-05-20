import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth-provider";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { AlertCircle, Loader2, Save } from "lucide-react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Eye, EyeOff } from "lucide-react";

// Form validation schema
const profileSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  phone: z.string().min(10, "Phone number must be at least 10 characters"),
  address: z.string().min(5, "Address must be at least 5 characters"),
});

// Change‑password validation
const passwordSchema = z.object({
  oldPassword: z.string().min(8, "Old password is required"),
  newPassword: z
    .string()
    .min(8, "Must be at least 8 characters")
    .regex(/(?=.*[A-Z])/, "Require an uppercase letter")
    .regex(/(?=.*[a-z])/, "Require a lowercase letter")
    .regex(/(?=.*\d)/, "Require a number"),
  confirmPassword: z.string(),
}).refine(
  (data) => data.newPassword === data.confirmPassword,
  { path: ["confirmPassword"], message: "Passwords do not match" }
);

type ProfileFormValues = z.infer<typeof profileSchema>;
type PasswordFormValues = z.infer<typeof passwordSchema>;

// Profile data structure from API
interface ProfileData {
  id: string;
  name: string;
  phone: string | null;
  address: string | null;
  dob: string | null;
  pathway: 'standalone' | 'with-mba';
  notifySettings?: {
    courseProgress: boolean;
    quizSummary: boolean;
    certificateReady: boolean;
  };
}

export function Profile() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [studentData, setStudentData] = useState<ProfileData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isChangingPw, setIsChangingPw] = useState(false);
  const [showPw, setShowPw] = useState(false);
  
  // Fetch profile data from API
  const fetchProfileData = async () => {
    if (!user?.id) return;
    
    setIsLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/student/profile', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log('Profile data:', data);
      setStudentData(data);
      setError(null);
    } catch (err) {
      console.error('Error fetching profile data:', err);
      setError(err instanceof Error ? err : new Error('Failed to fetch profile data'));
    } finally {
      setIsLoading(false);
    }
  };
  
  // Fetch profile data on component mount
  useEffect(() => {
    if (user?.id) {
      fetchProfileData();
    }
  }, [user?.id]);
  
  // Setup form with validation
  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: "",
      phone: "",
      address: "",
    },
  });

  const pwForm = useForm<PasswordFormValues>({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      oldPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });
  
  // Update form values when student data is loaded
  useEffect(() => {
    if (studentData) {
      form.reset({
        name: studentData.name || "",
        phone: studentData.phone || "",
        address: studentData.address || "",
      });
    }
  }, [studentData, form]);
  
  // Handle form submission
  const onSubmit = async (data: ProfileFormValues) => {
    setIsSaving(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/student/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(data)
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || "Failed to update profile");
      }
      
      // Show success message
      toast({
        title: "Profile updated",
        description: "Your profile has been updated successfully",
      });
      
      setIsEditing(false);
      fetchProfileData(); // Refresh data
    } catch (error) {
      // Show error message
      toast({
        title: "Error updating profile",
        description: error instanceof Error ? error.message : "Failed to update profile",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const onPasswordChange = async (data: PasswordFormValues) => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          currentPassword: data.oldPassword,
          newPassword: data.newPassword,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Failed to change password");
      }
      toast({
        title: "Password updated",
        description: "Your password has been changed successfully",
      });
      setIsChangingPw(false);
      pwForm.reset();
    } catch (err) {
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to change password",
        variant: "destructive",
      });
    }
  };
  
  if (isLoading) {
    return (
      <div className="p-6 flex justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="p-4 md:p-6">
        <h1 className="text-2xl font-bold text-gray-800 mb-6">My Profile</h1>
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>
            {error.message || "Failed to load profile data. Please try again later."}
          </AlertDescription>
        </Alert>
        <Button onClick={fetchProfileData}>Retry</Button>
      </div>
    );
  }
  
  return (
    <div className="p-4 md:p-6">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">My Profile</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 w-full">
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Personal Information</CardTitle>
          <CardDescription>
            Manage your personal details and contact information
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isEditing ? (
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="grid grid-cols-1 sm:grid-cols-2 gap-6"
              >
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Full Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Your full name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone Number</FormLabel>
                      <FormControl>
                        <Input placeholder="Your phone number" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="address"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Address</FormLabel>
                      <FormControl>
                        <Input placeholder="Your address" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <div className="flex gap-4 sm:col-span-2">
                  <Button 
                    type="submit" 
                    disabled={isSaving}
                  >
                    {isSaving ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="mr-2 h-4 w-4" />
                        Save Changes
                      </>
                    )}
                  </Button>
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setIsEditing(false)}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </Form>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <h3 className="font-medium text-sm text-gray-500">Full Name</h3>
                <p className="mt-1">{studentData?.name || "-"}</p>
              </div>
              
              <div>
                <h3 className="font-medium text-sm text-gray-500">Email Address</h3>
                <p className="mt-1">{user?.email || "-"}</p>
              </div>
              
              <div>
                <h3 className="font-medium text-sm text-gray-500">Phone Number</h3>
                <p className="mt-1">{studentData?.phone || "-"}</p>
              </div>
              
              <div>
                <h3 className="font-medium text-sm text-gray-500">Address</h3>
                <p className="mt-1">{studentData?.address || "-"}</p>
              </div>
              
              <div>
                <h3 className="font-medium text-sm text-gray-500">Date of Birth</h3>
                <p className="mt-1">
                  {studentData?.dob ? new Date(studentData.dob).toLocaleDateString() : "-"}
                </p>
              </div>
              
              <div>
                <h3 className="font-medium text-sm text-gray-500">Program Pathway</h3>
                <p className="mt-1">
                  {studentData?.pathway === 'standalone' ? 'Standalone Program' : 'Program with MBA'}
                </p>
              </div>
              
              <div className="sm:col-span-2">
                <Button onClick={() => setIsEditing(true)}>
                  Edit Profile
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

  {/* Change Password card */}
  <Card className="w-full">
    <CardHeader>
      <CardTitle>Change Password</CardTitle>
      <CardDescription>Update your account password</CardDescription>
    </CardHeader>
    <CardContent>
      {isChangingPw ? (
        <Form {...pwForm}>
          <form onSubmit={pwForm.handleSubmit(onPasswordChange)} className="space-y-4">
            {["oldPassword","newPassword","confirmPassword"].map((field,i)=>(
              <FormField
                key={field}
                control={pwForm.control}
                name={field as keyof PasswordFormValues}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {field.name === "oldPassword" ? "Old Password" :
                       field.name === "newPassword" ? "New Password" : "Confirm Password"}
                    </FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          {...field}
                          type={showPw ? "text" : "password"}
                          placeholder="********"
                        />
                        {i===1 && (
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            className="absolute top-0 right-0 h-full"
                            onClick={() => setShowPw(!showPw)}
                          >
                            {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </Button>
                        )}
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            ))}
            <div className="flex gap-4">
              <Button type="submit">Update Password</Button>
              <Button variant="outline" type="button" onClick={() => setIsChangingPw(false)}>
                Cancel
              </Button>
            </div>
          </form>
        </Form>
      ) : (
        <Button onClick={() => setIsChangingPw(true)}>Change Password</Button>
      )}
    </CardContent>
  </Card>
  </div>
    </div>
  );
}

export default Profile;