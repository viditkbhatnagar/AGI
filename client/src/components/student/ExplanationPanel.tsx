import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Sparkles,
  X,
  Loader2,
  RefreshCw,
  BookOpen,
  AlertCircle,
  ChevronRight,
  Lightbulb
} from 'lucide-react';

interface ExplanationPanelProps {
  isOpen: boolean;
  onClose: () => void;
  documentUrl: string;
  documentTitle: string;
  pageNumber: number;
}

export function ExplanationPanel({
  isOpen,
  onClose,
  documentUrl,
  documentTitle,
  pageNumber
}: ExplanationPanelProps) {
  const [explanation, setExplanation] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastExplainedPage, setLastExplainedPage] = useState<number | null>(null);

  // Fetch explanation when panel opens or page changes
  useEffect(() => {
    if (isOpen && pageNumber !== lastExplainedPage) {
      fetchExplanation();
    }
  }, [isOpen, pageNumber]);

  // Clear explanation when page changes
  useEffect(() => {
    if (pageNumber !== lastExplainedPage && lastExplainedPage !== null) {
      setExplanation(null);
      setError(null);
    }
  }, [pageNumber, lastExplainedPage]);

  const fetchExplanation = async () => {
    if (!documentUrl) {
      setError('No document URL provided');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Not authenticated');
      }

      const response = await fetch('/api/documents/explain', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          documentUrl,
          pageNumber,
          documentTitle
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Failed to get explanation: ${response.status}`);
      }

      const data = await response.json();
      setExplanation(data.explanation);
      setLastExplainedPage(pageNumber);
    } catch (err: any) {
      console.error('Error fetching explanation:', err);
      setError(err.message || 'Failed to generate explanation. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div className="w-full bg-white flex flex-col h-[75vh]">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2.5 bg-gradient-to-r from-violet-500 to-purple-500 text-white rounded-t-2xl">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4" />
          <div>
            <h3 className="font-semibold text-sm">AI Explanation</h3>
            <p className="text-[10px] text-white/70">Page {pageNumber}</p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={onClose}
          className="text-white hover:bg-white/20 h-7 w-7 p-0"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Content */}
      <ScrollArea className="flex-1">
        <div className="p-4">
          {/* Loading State */}
          {isLoading && (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="relative">
                <div className="w-16 h-16 rounded-full bg-gradient-to-r from-violet-500 to-purple-500 animate-pulse"></div>
                <Loader2 className="absolute inset-0 m-auto h-8 w-8 text-white animate-spin" />
              </div>
              <p className="mt-4 text-sm text-slate-600 font-medium">Analyzing page content...</p>
              <p className="text-xs text-slate-400 mt-1">This may take a few seconds</p>
            </div>
          )}

          {/* Error State */}
          {error && !isLoading && (
            <div className="rounded-xl bg-red-50 border border-red-100 p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h4 className="text-sm font-medium text-red-800">Unable to explain</h4>
                  <p className="text-sm text-red-600 mt-1">{error}</p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={fetchExplanation}
                    className="mt-3 border-red-200 text-red-700 hover:bg-red-100"
                  >
                    <RefreshCw className="h-3 w-3 mr-2" />
                    Try Again
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Explanation Content */}
          {explanation && !isLoading && (
            <div className="space-y-4">
              {/* Document Info */}
              <div className="flex items-center gap-2 text-xs text-slate-500 pb-2 border-b border-slate-100">
                <BookOpen className="h-3.5 w-3.5" />
                <span className="truncate">{documentTitle || 'Document'}</span>
                <ChevronRight className="h-3 w-3" />
                <span>Page {pageNumber}</span>
              </div>

              {/* Main Explanation */}
              <div className="prose prose-sm max-w-none">
                <div className="rounded-xl bg-gradient-to-br from-violet-50 to-purple-50 p-4 border border-violet-100">
                  <div className="flex items-center gap-2 mb-3">
                    <Lightbulb className="h-4 w-4 text-violet-600" />
                    <span className="text-sm font-semibold text-violet-800">Explanation</span>
                  </div>
                  <div className="text-slate-700 text-sm leading-relaxed whitespace-pre-wrap">
                    {explanation}
                  </div>
                </div>
              </div>

              {/* Refresh Button */}
              <div className="flex justify-center pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={fetchExplanation}
                  className="text-xs"
                >
                  <RefreshCw className="h-3 w-3 mr-2" />
                  Regenerate Explanation
                </Button>
              </div>
            </div>
          )}

          {/* Initial State (no explanation yet, not loading, no error) */}
          {!explanation && !isLoading && !error && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-violet-100 to-purple-100 flex items-center justify-center mb-4">
                <Sparkles className="h-8 w-8 text-violet-500" />
              </div>
              <h4 className="text-lg font-semibold text-slate-800 mb-2">
                Get AI Explanation
              </h4>
              <p className="text-sm text-slate-500 max-w-xs mb-4">
                Click below to get an AI-powered explanation of the content on this page.
              </p>
              <Button
                onClick={fetchExplanation}
                className="bg-gradient-to-r from-violet-500 to-purple-500 hover:from-violet-600 hover:to-purple-600"
              >
                <Sparkles className="h-4 w-4 mr-2" />
                Explain This Page
              </Button>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Footer Tips */}
      {explanation && !isLoading && (
        <div className="px-3 py-2 bg-slate-50 border-t border-slate-100 rounded-b-2xl">
          <p className="text-[10px] text-slate-500 text-center">
            💡 Change page number below and click Explain again
          </p>
        </div>
      )}
    </div>
  );
}

export default ExplanationPanel;
