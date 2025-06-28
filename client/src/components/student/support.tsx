import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Mail, MessageSquare, Phone, MapPin, GraduationCap } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

export function Support() {
  const [supportType, setSupportType] = useState<string>("technical");
  const [name, setName] = useState<string>("");
  const [email, setEmail] = useState<string>("");
  const [message, setMessage] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  
  const { toast } = useToast();
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      // Validate form data
      if (!name.trim() || !email.trim() || !message.trim()) {
        toast({
          title: "Error",
          description: "Please fill in all required fields.",
          variant: "destructive",
        });
        setIsSubmitting(false);
        return;
      }

      // Submit contact form
      const response = await apiRequest('POST', '/api/contact', {
        supportType,
        name: name.trim(),
        email: email.trim(),
        message: message.trim()
      });

      const result = await response.json();

      if (result.success) {
        toast({
          title: "Message sent successfully!",
          description: result.message,
        });
        
        // Reset form
        setName("");
        setEmail("");
        setMessage("");
        setSupportType("technical");
      } else {
        throw new Error(result.message || 'Failed to send message');
      }
      
    } catch (error: any) {
      console.error('Contact form error:', error);
      toast({
        title: "Error sending message",
        description: error.message || "Please try again or contact us directly.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <div className="p-4 md:p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Contact Us</h1>
        <p className="text-gray-500 mt-1">We'd love to hear from you! Whether you have questions about our programs, need assistance with your application, or want to learn more about our expansion into the US market, our team is here to help.</p>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card>
            <CardContent>
              <form onSubmit={handleSubmit}>
                <div className="mb-4">
                  <Label htmlFor="supportType">Support Type</Label>
                  <RadioGroup 
                    id="supportType" 
                    value={supportType} 
                    onValueChange={setSupportType}
                    className="flex flex-col space-y-1 mt-2"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="technical" id="technical" />
                      <Label htmlFor="technical" className="cursor-pointer">Technical Support</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="course" id="course" />
                      <Label htmlFor="course" className="cursor-pointer">Course Content</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="billing" id="billing" />
                      <Label htmlFor="billing" className="cursor-pointer">Billing/Enrollment</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="other" id="other" />
                      <Label htmlFor="other" className="cursor-pointer">Other</Label>
                    </div>
                  </RadioGroup>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Full Name</Label>
                    <Input 
                      id="name" 
                      value={name} 
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Your name"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input 
                      id="email" 
                      type="email" 
                      value={email} 
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Your email"
                      required
                    />
                  </div>
                </div>
                
                <div className="space-y-2 mb-4">
                  <Label htmlFor="message">Message</Label>
                  <Textarea 
                    id="message" 
                    value={message} 
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Describe your issue in detail"
                    rows={5}
                    required
                  />
                </div>
                
                <Button type="submit" className="w-full sm:w-auto" disabled={isSubmitting}>
                  {isSubmitting ? "Sending Message..." : "Send Message"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
        
        <div>
          <Card>
            <CardHeader>
              <CardTitle>Contact Information</CardTitle>
              <CardDescription>
                Other ways to reach our support team
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start">
                <Mail className="h-5 w-5 text-primary mr-3 mt-0.5" />
                <div>
                  <h4 className="font-medium">Email Support</h4>
                  <p className="text-sm text-gray-500">info@ciafs.global</p>
                  <p className="text-xs text-gray-500 mt-1">Responses within 24 hours</p>
                </div>
              </div>
              
              <div className="flex items-start">
                <Phone className="h-5 w-5 text-primary mr-3 mt-0.5" />
                <div>
                  <h4 className="font-medium">Phone Support</h4>
                  <p className="text-sm text-gray-500">+27(0)870 585 058</p>
                  <p className="text-xs text-gray-500 mt-1">Mon-Fri, 9am-5pm EST</p>
                </div>
              </div>
              
              <div className="flex items-start">
                <MapPin className="h-5 w-5 text-primary mr-3 mt-0.5" />
                <div>
                  <h4 className="font-medium">Address</h4>
                  <p className="text-sm text-gray-500">5214 F Diamond Heights Blvd</p>
                  <p className="text-xs text-gray-500 mt-1">San Francisco, California, 94131, USA</p>
                </div>
              </div>
              
              <div className="flex items-start">
                <GraduationCap className="h-5 w-5 text-primary mr-3 mt-0.5" />
                <div>
                  <h4 className="font-medium">Campuses</h4>
                  <p className="text-sm text-gray-500">Spaces Works (California)</p>
                  <p className="text-xs text-gray-500 mt-1">3031 Tisch Way #110</p>
                  <p className="text-xs text-gray-500">Plaza West, San Jose CA 95128</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default Support;
