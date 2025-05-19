import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { HelpCircle, Mail, MessageSquare, Phone } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

export function Support() {
  const [supportType, setSupportType] = useState<string>("technical");
  const [name, setName] = useState<string>("");
  const [email, setEmail] = useState<string>("");
  const [message, setMessage] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  
  const { toast } = useToast();
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    // Simulate API call
    setTimeout(() => {
      toast({
        title: "Support request submitted",
        description: "We'll get back to you as soon as possible.",
      });
      
      // Reset form
      setMessage("");
      setIsSubmitting(false);
    }, 1000);
  };
  
  return (
    <div className="p-4 md:p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Support</h1>
        <p className="text-gray-500 mt-1">Get help with your courses or technical issues</p>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Contact Support</CardTitle>
              <CardDescription>
                Fill out the form below and we'll get back to you as soon as possible.
              </CardDescription>
            </CardHeader>
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
                  {isSubmitting ? "Submitting..." : "Submit Support Request"}
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
                  <p className="text-sm text-gray-500">support@agi.online</p>
                  <p className="text-xs text-gray-500 mt-1">Responses within 24 hours</p>
                </div>
              </div>
              
              <div className="flex items-start">
                <Phone className="h-5 w-5 text-primary mr-3 mt-0.5" />
                <div>
                  <h4 className="font-medium">Phone Support</h4>
                  <p className="text-sm text-gray-500">+1 (800) 123-4567</p>
                  <p className="text-xs text-gray-500 mt-1">Mon-Fri, 9am-5pm EST</p>
                </div>
              </div>
              
              <div className="flex items-start">
                <MessageSquare className="h-5 w-5 text-primary mr-3 mt-0.5" />
                <div>
                  <h4 className="font-medium">Live Chat</h4>
                  <p className="text-sm text-gray-500">Available on our website</p>
                  <p className="text-xs text-gray-500 mt-1">Business hours only</p>
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <div className="bg-gray-50 p-4 rounded-lg w-full">
                <div className="flex items-center mb-2">
                  <HelpCircle className="h-5 w-5 text-primary mr-2" />
                  <h4 className="font-medium">FAQs</h4>
                </div>
                <p className="text-sm text-gray-600 mb-3">
                  Find quick answers to common questions in our knowledge base.
                </p>
                <Button variant="outline" className="w-full">
                  Visit Help Center
                </Button>
              </div>
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default Support;
