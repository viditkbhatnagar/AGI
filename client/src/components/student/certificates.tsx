import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ExternalLink, Award, Calendar, Trophy, Download, Eye } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { RetroTvError } from "@/components/ui/retro-tv-error";

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

  if (loading) {
    return (
      <div className="p-6 md:p-8 max-w-5xl mx-auto font-display">
        <div className="mb-8">
          <Skeleton className="h-8 w-48 mb-2" />
          <Skeleton className="h-5 w-72" />
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="rounded-2xl border-2 border-slate-200 p-5">
              <div className="flex items-center gap-3 mb-4">
                <Skeleton className="size-12 rounded-xl" />
                <div className="flex-1">
                  <Skeleton className="h-5 w-32 mb-2" />
                  <Skeleton className="h-4 w-24" />
                </div>
              </div>
              <Skeleton className="h-4 w-full mb-2" />
              <Skeleton className="h-4 w-2/3 mb-4" />
              <div className="flex gap-2">
                <Skeleton className="h-9 flex-1 rounded-lg" />
                <Skeleton className="h-9 w-24 rounded-lg" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 md:p-8 max-w-5xl mx-auto font-display">
        <div className="mb-8">
          <h1 className="font-heading text-2xl md:text-3xl font-bold text-slate-800 mb-2">My Certificates</h1>
          <p className="text-slate-500">
            Your digital certificates earned from completed courses
          </p>
        </div>

        <div className="rounded-2xl bg-gradient-to-br from-red-50 via-rose-50/80 to-orange-50 border border-red-100/50 overflow-hidden">
          <RetroTvError 
            errorCode="ERR" 
            errorMessage={error.includes('401') ? 'UNAUTHORIZED' : 'LOAD FAILED'} 
          />
          <div className="text-center pb-8">
            <p className="text-slate-600 mb-4">{error}</p>
            <Button 
              onClick={fetchCertificates} 
              className="bg-[#18548b] hover:bg-[#134775] text-white rounded-xl px-6"
            >
              Try Again
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (certificates.length === 0) {
    return (
      <div className="p-6 md:p-8 max-w-5xl mx-auto font-display">
        <div className="mb-8">
          <h1 className="font-heading text-2xl md:text-3xl font-bold text-slate-800 mb-2">My Certificates</h1>
          <p className="text-slate-500">
            Your digital certificates earned from completed courses
          </p>
        </div>

        <div className="rounded-2xl bg-gradient-to-br from-amber-50 via-yellow-50/80 to-orange-50 border border-amber-100/50 overflow-hidden">
          <RetroTvError 
            errorCode="0" 
            errorMessage="NO CERTIFICATES" 
          />
          <div className="text-center pb-8 px-6">
            <h3 className="text-xl font-bold text-slate-800 mb-2">No Certificates Yet</h3>
            <p className="text-slate-600 max-w-md mx-auto">
              Complete your final exams with a passing score to earn digital certificates for your achievements.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto font-display">
      {/* Header */}
      <div className="mb-8">
        <h1 className="font-heading text-2xl md:text-3xl font-bold text-slate-800 mb-2">My Certificates</h1>
        <p className="text-slate-500">
          You have earned <span className="font-semibold text-[#18548b]">{certificates.length}</span> certificate{certificates.length !== 1 ? 's' : ''}
        </p>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="rounded-2xl bg-gradient-to-br from-emerald-50 to-green-50 border border-emerald-100/50 p-4 text-center">
          <div className="size-10 mx-auto mb-2 rounded-xl bg-emerald-100 flex items-center justify-center">
            <Award className="size-5 text-emerald-600" />
          </div>
          <div className="text-2xl font-bold text-emerald-600">{certificates.length}</div>
          <div className="text-xs text-slate-500">Total Earned</div>
        </div>
        <div className="rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100/50 p-4 text-center">
          <div className="size-10 mx-auto mb-2 rounded-xl bg-blue-100 flex items-center justify-center">
            <Trophy className="size-5 text-blue-600" />
          </div>
          <div className="text-2xl font-bold text-blue-600">
            {certificates.filter(c => c.status === 'issued').length}
          </div>
          <div className="text-xs text-slate-500">Active</div>
        </div>
        <div className="rounded-2xl bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-100/50 p-4 text-center">
          <div className="size-10 mx-auto mb-2 rounded-xl bg-amber-100 flex items-center justify-center">
            <Trophy className="size-5 text-amber-600" />
          </div>
          <div className="text-2xl font-bold text-amber-600">
            {Math.round(
              certificates.reduce((sum, cert) => sum + cert.finalScore, 0) / certificates.length
            ) || 0}%
          </div>
          <div className="text-xs text-slate-500">Avg Score</div>
        </div>
      </div>

      {/* Certificate Cards */}
      <div className="space-y-4">
        {certificates.map((certificate, index) => (
          <div 
            key={certificate._id} 
            className="rounded-2xl border-2 border-slate-200 bg-white hover:border-[#18548b]/40 hover:shadow-lg transition-all duration-300 overflow-hidden"
          >
            <div className="p-5">
              <div className="flex items-start gap-4">
                {/* Certificate Number */}
                <div className="flex-shrink-0 size-12 rounded-xl bg-gradient-to-br from-amber-100 to-yellow-100 flex items-center justify-center">
                  <Trophy className="size-6 text-amber-600" />
                </div>
                
                {/* Certificate Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="min-w-0">
                      <h3 className="font-heading text-lg font-bold text-slate-800 truncate">
                        {certificate.courseName}
                      </h3>
                      <p className="text-sm text-slate-500">
                        Certificate #{certificate.certificateId.slice(-8)}
                      </p>
                    </div>
                    <Badge 
                      className={`text-xs font-medium ${
                        certificate.status === 'issued' 
                          ? 'bg-emerald-100 text-emerald-700 border-emerald-200' 
                          : certificate.status === 'revoked'
                            ? 'bg-red-100 text-red-700 border-red-200'
                            : 'bg-slate-100 text-slate-700 border-slate-200'
                      }`}
                    >
                      {certificate.status.charAt(0).toUpperCase() + certificate.status.slice(1)}
                    </Badge>
                  </div>
                  
                  {/* Stats Grid */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                    <div className="p-2 bg-slate-50 rounded-lg">
                      <div className="flex items-center gap-1 text-xs text-slate-400 mb-0.5">
                        <Trophy className="size-3" />
                        Score
                      </div>
                      <div className="text-sm font-bold text-slate-700">{certificate.finalScore}%</div>
                    </div>
                    <div className="p-2 bg-slate-50 rounded-lg">
                      <div className="flex items-center gap-1 text-xs text-slate-400 mb-0.5">
                        <Calendar className="size-3" />
                        Issued
                      </div>
                      <div className="text-sm font-bold text-slate-700">{formatDate(certificate.issuedAt)}</div>
                    </div>
                    <div className="p-2 bg-slate-50 rounded-lg">
                      <div className="text-xs text-slate-400 mb-0.5">Issued By</div>
                      <div className="text-sm font-medium text-slate-700 truncate">{certificate.issuedBy}</div>
                    </div>
                    <div className="p-2 bg-slate-50 rounded-lg">
                      <div className="text-xs text-slate-400 mb-0.5">Attempt</div>
                      <div className="text-sm font-bold text-slate-700">#{certificate.attemptNumber}</div>
                    </div>
                  </div>
                  
                  {/* Action Buttons */}
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => handleViewCertificate(certificate)}
                      className="bg-[#18548b] hover:bg-[#134775] text-white rounded-lg"
                    >
                      <Eye className="size-4 mr-1.5" />
                      View Certificate
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDownloadCertificate(certificate)}
                      className="rounded-lg border-slate-200 hover:border-[#18548b] hover:text-[#18548b]"
                    >
                      <Download className="size-4 mr-1.5" />
                      Download
                    </Button>
                    {certificate.metadata?.verificationUrl && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => window.open(certificate.metadata!.verificationUrl, '_blank')}
                        className="rounded-lg text-slate-500 hover:text-[#18548b]"
                      >
                        <ExternalLink className="size-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
