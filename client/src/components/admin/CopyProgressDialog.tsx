import React, { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  CheckCircle, 
  XCircle, 
  Loader2, 
  AlertCircle,
  Copy,
  ArrowRight,
  ExternalLink
} from "lucide-react";

// Types based on design document
interface CopyResult {
  sandboxSlug: string;
  success: boolean;
  newCourseSlug?: string;
  error?: string;
  duplicateHandled?: boolean;
  errorType?: 'NETWORK_ERROR' | 'VALIDATION_ERROR' | 'DATABASE_ERROR' | 'NOT_FOUND' | 'UNKNOWN_ERROR';
}

interface CopyProgress {
  total: number;
  completed: number;
  current?: string;
  results: CopyResult[];
}

interface CopyProgressDialogProps {
  isOpen: boolean;
  progress: CopyProgress;
  onClose: () => void;
}

// Helper functions for error type handling
const getErrorTypeLabel = (errorType: string): string => {
  switch (errorType) {
    case 'NETWORK_ERROR': return 'Network';
    case 'VALIDATION_ERROR': return 'Validation';
    case 'DATABASE_ERROR': return 'Database';
    case 'NOT_FOUND': return 'Not Found';
    case 'UNKNOWN_ERROR': return 'Unknown';
    default: return 'Error';
  }
};

const getErrorTypeBadgeClass = (errorType: string): string => {
  switch (errorType) {
    case 'NETWORK_ERROR': return 'bg-orange-50 text-orange-700 border-orange-200';
    case 'VALIDATION_ERROR': return 'bg-yellow-50 text-yellow-700 border-yellow-200';
    case 'DATABASE_ERROR': return 'bg-purple-50 text-purple-700 border-purple-200';
    case 'NOT_FOUND': return 'bg-blue-50 text-blue-700 border-blue-200';
    case 'UNKNOWN_ERROR': return 'bg-gray-50 text-gray-700 border-gray-200';
    default: return 'bg-red-50 text-red-700 border-red-200';
  }
};

const getErrorTypeDescription = (errorType: string): string => {
  switch (errorType) {
    case 'NETWORK_ERROR': return 'Connection or timeout issue. Please check your network and try again.';
    case 'VALIDATION_ERROR': return 'Invalid course data. Please check the course content and try again.';
    case 'DATABASE_ERROR': return 'Database operation failed. Please try again later.';
    case 'NOT_FOUND': return 'The sandbox course could not be found.';
    case 'UNKNOWN_ERROR': return 'An unexpected error occurred. Please try again or contact support.';
    default: return 'Please try again or contact support if the issue persists.';
  }
};

export function CopyProgressDialog({
  isOpen,
  progress,
  onClose,
}: CopyProgressDialogProps) {
  const isComplete = progress.completed === progress.total;
  const hasErrors = progress.results.some(result => !result.success);
  const successCount = progress.results.filter(result => result.success).length;
  const failureCount = progress.results.filter(result => !result.success).length;
  
  // Auto-redirect countdown state
  const [redirectCountdown, setRedirectCountdown] = useState<number | null>(null);
  
  // Calculate progress percentage
  const progressPercentage = progress.total > 0 ? (progress.completed / progress.total) * 100 : 0;

  // Auto-redirect effect when operation completes successfully
  useEffect(() => {
    if (isComplete && successCount > 0 && !hasErrors) {
      // Start 3-second countdown for auto-redirect
      setRedirectCountdown(3);
      
      const timer = setInterval(() => {
        setRedirectCountdown(prev => {
          if (prev === null || prev <= 1) {
            clearInterval(timer);
            onClose(); // This will trigger the redirect in the parent component
            return null;
          }
          return prev - 1;
        });
      }, 1000);
      
      return () => clearInterval(timer);
    } else {
      setRedirectCountdown(null);
    }
  }, [isComplete, successCount, hasErrors, onClose]);

  // Get status badge variant and text
  const getStatusInfo = () => {
    if (!isComplete) {
      return { variant: "secondary" as const, text: "In Progress", icon: Loader2 };
    }
    if (hasErrors && successCount === 0) {
      return { variant: "destructive" as const, text: "Failed", icon: XCircle };
    }
    if (hasErrors && successCount > 0) {
      return { variant: "secondary" as const, text: "Partial Success", icon: AlertCircle };
    }
    return { variant: "default" as const, text: "Completed", icon: CheckCircle };
  };

  const statusInfo = getStatusInfo();
  const StatusIcon = statusInfo.icon;

  // Handle close - only allow closing when complete
  const handleClose = () => {
    if (isComplete) {
      onClose();
    }
  };

  // Get result icon and styling
  const getResultIcon = (result: CopyResult) => {
    if (result.success) {
      return <CheckCircle className="h-5 w-5 text-green-600" />;
    }
    return <XCircle className="h-5 w-5 text-red-600" />;
  };

  const getResultBadge = (result: CopyResult) => {
    if (result.success) {
      return (
        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
          Success
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
        Failed
      </Badge>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Copy className="h-5 w-5" />
            Copy Progress
          </DialogTitle>
          <DialogDescription>
            Copying sandbox courses to main courses tab. Please wait for the operation to complete.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 flex flex-col space-y-6 min-h-0">
          {/* Overall Progress Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <StatusIcon 
                  className={`h-5 w-5 ${!isComplete ? 'animate-spin' : ''} ${
                    statusInfo.variant === 'destructive' ? 'text-red-600' : 
                    statusInfo.variant === 'default' ? 'text-green-600' : 'text-blue-600'
                  }`} 
                />
                <span className="font-medium">{statusInfo.text}</span>
              </div>
              <Badge variant={statusInfo.variant}>
                {progress.completed} of {progress.total}
              </Badge>
            </div>

            {/* Progress Bar */}
            <div className="space-y-2">
              <Progress value={progressPercentage} className="h-2" />
              <div className="flex justify-between text-sm text-gray-600">
                <span>
                  {isComplete ? 'Operation complete' : `Processing: ${progress.current || 'Preparing...'}`}
                </span>
                <span>{Math.round(progressPercentage)}%</span>
              </div>
            </div>

            {/* Summary Stats */}
            {isComplete && (
              <div className="space-y-3">
                <div className="flex gap-4 p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span className="text-sm font-medium text-green-700">
                      {successCount} Successful
                    </span>
                  </div>
                  {failureCount > 0 && (
                    <div className="flex items-center gap-2">
                      <XCircle className="h-4 w-4 text-red-600" />
                      <span className="text-sm font-medium text-red-700">
                        {failureCount} Failed
                      </span>
                    </div>
                  )}
                </div>
                
                {/* Auto-redirect notification */}
                {redirectCountdown !== null && successCount > 0 && !hasErrors && (
                  <div className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <ExternalLink className="h-4 w-4 text-blue-600" />
                    <span className="text-sm text-blue-700">
                      Redirecting to courses page in {redirectCountdown} seconds...
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Individual Results */}
          {progress.results.length > 0 && (
            <div className="flex-1 min-h-0">
              <h4 className="font-medium mb-3">Course Copy Results</h4>
              <ScrollArea className="h-full border rounded-lg">
                <div className="divide-y">
                  {progress.results.map((result, index) => (
                    <div key={result.sandboxSlug} className="p-4">
                      <div className="flex items-start gap-3">
                        {getResultIcon(result)}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="font-medium text-gray-900 truncate">
                                {result.sandboxSlug}
                              </span>
                              {result.success && result.newCourseSlug && (
                                <>
                                  <ArrowRight className="h-4 w-4 text-gray-400 flex-shrink-0" />
                                  <span className="text-sm text-gray-600 truncate">
                                    {result.newCourseSlug}
                                  </span>
                                </>
                              )}
                            </div>
                            {getResultBadge(result)}
                          </div>

                          {/* Success Details */}
                          {result.success && (
                            <div className="space-y-1">
                              <p className="text-sm text-green-700">
                                Course successfully copied to main courses tab
                              </p>
                              {result.duplicateHandled && (
                                <p className="text-sm text-blue-600">
                                  Duplicate name detected - suffix added automatically
                                </p>
                              )}
                            </div>
                          )}

                          {/* Error Details */}
                          {!result.success && result.error && (
                            <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-md">
                              <div className="flex items-start gap-2">
                                <AlertCircle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-1">
                                    <p className="text-sm font-medium text-red-800">Error Details:</p>
                                    {result.errorType && (
                                      <Badge 
                                        variant="outline" 
                                        className={`text-xs ${getErrorTypeBadgeClass(result.errorType)}`}
                                      >
                                        {getErrorTypeLabel(result.errorType)}
                                      </Badge>
                                    )}
                                  </div>
                                  <p className="text-sm text-red-700">{result.error}</p>
                                  {result.errorType && (
                                    <p className="text-xs text-red-600 mt-1">
                                      {getErrorTypeDescription(result.errorType)}
                                    </p>
                                  )}
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          )}
        </div>

        <DialogFooter>
          {isComplete && successCount > 0 ? (
            <div className="flex gap-2 w-full sm:w-auto">
              <Button 
                onClick={() => {
                  setRedirectCountdown(null); // Cancel auto-redirect
                  handleClose();
                }}
                variant="outline"
                className="flex-1 sm:flex-none"
              >
                Stay Here
              </Button>
              <Button 
                onClick={onClose}
                className="flex-1 sm:flex-none"
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                {redirectCountdown !== null ? `View Courses (${redirectCountdown})` : 'View Copied Courses'}
              </Button>
            </div>
          ) : (
            <Button 
              onClick={handleClose}
              disabled={!isComplete}
              className="w-full sm:w-auto"
            >
              {isComplete ? 'Close' : 'Please wait...'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}