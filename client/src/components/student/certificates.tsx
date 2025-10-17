import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ExternalLink, Award, Calendar, Trophy, Download, Eye } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Certificate {
  _id: string;
  certificateId: string;
  certificateUrl: string;
  issuedAt: string;
  issuedBy: string;
  courseSlug: string;
  courseName: string;
  studentName: string;
  studentEmail: string;
  finalScore: number;
  attemptNumber: number;
  certifierGroupId: string;
  status: 'issued' | 'revoked' | 'expired';
  metadata?: {
    templateId?: string;
    verificationUrl?: string;
    expiresAt?: string;
  };
}

interface CertificatesResponse {
  certificates: Certificate[];
  total: number;
}

export function StudentCertificates() {
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchCertificates();
  }, []);

  const fetchCertificates = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/student/certificates', {
        credentials: 'include',
      });

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Please log in to view your certificates');
        }
        throw new Error(`Failed to fetch certificates: ${response.status}`);
      }

      const data: CertificatesResponse = await response.json();
      setCertificates(data.certificates || []);
    } catch (err) {
      console.error('Error fetching certificates:', err);
      setError(err instanceof Error ? err.message : 'Failed to load certificates');
    } finally {
      setLoading(false);
    }
  };

  const handleViewCertificate = (certificate: Certificate) => {
    window.open(certificate.certificateUrl, '_blank', 'noopener,noreferrer');
  };

  const handleDownloadCertificate = async (certificate: Certificate) => {
    try {
      // For now, we'll just open the certificate URL
      // In the future, we could implement a proper download endpoint
      window.open(certificate.certificateUrl, '_blank', 'noopener,noreferrer');
      
      toast({
        title: "Certificate Opening",
        description: "Your certificate is opening in a new tab. You can download it from there.",
      });
    } catch (err) {
      toast({
        title: "Download Failed", 
        description: "Failed to open certificate for download",
        variant: "destructive",
      });
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'issued':
        return 'default';
      case 'revoked':
        return 'destructive';
      case 'expired':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">My Certificates</h1>
          <p className="text-muted-foreground">
            Your digital certificates earned from completed courses
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(3)].map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Skeleton className="h-3 w-full" />
                  <Skeleton className="h-3 w-2/3" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">My Certificates</h1>
          <p className="text-muted-foreground">
            Your digital certificates earned from completed courses
          </p>
        </div>

        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>

        <Button onClick={fetchCertificates} variant="outline">
          Try Again
        </Button>
      </div>
    );
  }

  if (certificates.length === 0) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">My Certificates</h1>
          <p className="text-muted-foreground">
            Your digital certificates earned from completed courses
          </p>
        </div>

        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Award className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No certificates yet</h3>
            <p className="text-sm text-muted-foreground text-center max-w-sm">
              Complete your final exams with a score of 60% or higher to earn digital certificates for your achievements.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">My Certificates</h1>
        <p className="text-muted-foreground">
          Your digital certificates earned from completed courses ({certificates.length} total)
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {certificates.map((certificate) => (
          <Card key={certificate._id} className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <Trophy className="h-5 w-5 text-yellow-600" />
                  <Badge variant={getStatusBadgeVariant(certificate.status)} className="text-xs">
                    {certificate.status.charAt(0).toUpperCase() + certificate.status.slice(1)}
                  </Badge>
                </div>
              </div>
              <CardTitle className="text-lg">{certificate.courseName}</CardTitle>
              <CardDescription className="text-sm">
                Certificate #{certificate.certificateId.slice(-8)}
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <Trophy className="h-3 w-3" />
                    Score
                  </div>
                  <div className="font-medium">{certificate.finalScore}%</div>
                </div>
                <div>
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <Calendar className="h-3 w-3" />
                    Issued
                  </div>
                  <div className="font-medium text-xs">
                    {formatDate(certificate.issuedAt)}
                  </div>
                </div>
              </div>

              <div className="text-xs text-muted-foreground">
                Issued by: {certificate.issuedBy}
                <br />
                Attempt: #{certificate.attemptNumber}
              </div>

              <div className="flex gap-2 pt-2">
                <Button
                  size="sm"
                  onClick={() => handleViewCertificate(certificate)}
                  className="flex-1"
                >
                  <Eye className="h-3 w-3 mr-1" />
                  View
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleDownloadCertificate(certificate)}
                >
                  <Download className="h-3 w-3 mr-1" />
                  Download
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleViewCertificate(certificate)}
                >
                  <ExternalLink className="h-3 w-3" />
                </Button>
              </div>

              {certificate.metadata?.verificationUrl && (
                <div className="text-xs text-muted-foreground pt-1 border-t">
                  <a 
                    href={certificate.metadata.verificationUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:underline flex items-center gap-1"
                  >
                    <ExternalLink className="h-3 w-3" />
                    Verify Certificate
                  </a>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Summary Card */}
      <Card className="mt-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Award className="h-5 w-5" />
            Certificate Summary
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{certificates.length}</div>
            <div className="text-sm text-muted-foreground">Total Certificates</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">
              {certificates.filter(c => c.status === 'issued').length}
            </div>
            <div className="text-sm text-muted-foreground">Active Certificates</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-orange-600">
              {Math.round(
                certificates.reduce((sum, cert) => sum + cert.finalScore, 0) / certificates.length
              ) || 0}%
            </div>
            <div className="text-sm text-muted-foreground">Average Score</div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
