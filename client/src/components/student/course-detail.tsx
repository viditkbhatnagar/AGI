// Convert Google Drive share URL into an embeddable preview URL
function toGooglePreviewUrl(url: string, page: number = 1) {
  const match = url.match(/\/d\/([^\/]+)/);
  if (match) {
    const id = match[1];
    // Presentation (Slides) - support slide navigation
    if (url.includes('/presentation/')) {
      // Use rm=minimal for better navigation and add slide parameter
      return `https://docs.google.com/presentation/d/${id}/embed?start=false&loop=false&rm=minimal&slide=id.g${page}`;
    }
    // Document (Docs) - Use embed with page parameter if possible
    if (url.includes('/document/')) {
      return `https://docs.google.com/document/d/${id}/preview?rm=minimal&page=${page}`;
    }
    // Spreadsheet (Sheets) - support sheet navigation
    if (url.includes('/spreadsheets/')) {
      return `https://docs.google.com/spreadsheets/d/${id}/preview?rm=minimal&gid=${page - 1}`;
    }
  }

  // For PDFs and other document types, try to add page parameter
  if (url.toLowerCase().includes('.pdf')) {
    return url + (url.includes('?') ? '&' : '?') + `page=${page}`;
  }

  return url;
}
// Detect document type and estimate pages
function getDocumentTypeAndPages(url: string | undefined): { type: 'slides' | 'document' | 'spreadsheet' | 'pdf', estimatedPages: number } {
  if (!url) {
    return { type: 'pdf', estimatedPages: 5 }; // Default for undefined URLs
  }

  console.log('🔍 Detecting document type for URL:', url);

  // Check file extension first
  const extension = url.toLowerCase().split('.').pop() || '';

  // PDF files
  if (extension === 'pdf' || url.toLowerCase().includes('.pdf')) {
    console.log('📄 Detected: PDF document');
    return { type: 'pdf', estimatedPages: 10 };
  }

  // PowerPoint files
  if (['ppt', 'pptx'].includes(extension) || url.includes('/presentation/')) {
    console.log('📊 Detected: PowerPoint presentation');
    return { type: 'slides', estimatedPages: 20 };
  }

  // Excel files
  if (['xls', 'xlsx', 'csv'].includes(extension) || url.includes('/spreadsheets/')) {
    console.log('📉 Detected: Excel spreadsheet');
    return { type: 'spreadsheet', estimatedPages: 5 };
  }

  // Word files
  if (['doc', 'docx'].includes(extension) || url.includes('/document/')) {
    console.log('📄 Detected: Word document');
    return { type: 'document', estimatedPages: 10 };
  }

  // Handle Cloudinary documents - limit page navigation since Office Online doesn't support it well
  if (url.includes('res.cloudinary.com')) {
    console.log('🌤️ Detected: Cloudinary document (generic)');
    // For Office documents on Cloudinary, disable page navigation
    return { type: 'document', estimatedPages: 1 };
  }

  // Default fallback
  console.log('📁 Detected: Generic document');
  return { type: 'document', estimatedPages: 5 };
}

import { useQuery, useQueries } from "@tanstack/react-query";
import { useQueryClient } from "@tanstack/react-query";
import throttle from "lodash/throttle";
import { useEffect, useState, useRef, useCallback } from "react";
import ReactPlayer from "react-player";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ArrowLeft,
  BookOpen,
  Check,
  ChevronRight,
  ChevronDown,
  ChevronLeft,
  Clock,
  FileText,
  FileSpreadsheet,
  FileImage,
  File,
  Monitor,
  Presentation,
  Lock,
  Play,
  Video,
  VideoIcon,
  Film,
  ArrowUp,
  ArrowDown,
  CalendarDays,
  Loader2,
  Trophy,
  Target,
  Sparkles,
  PlayCircle,
  Award,
  Zap,
  GraduationCap,
  Layers,
  X,
  Phone,
  Mic
} from "lucide-react";
import { Link } from "wouter";
import { Badge } from "@/components/ui/badge";
import { formatDate, formatDateTime, formatWatchTime } from "@/lib/utils";
import { useParams } from "wouter";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

import QuizForm from "@/components/student/QuizForm";
import FinalExamForm from "@/components/student/FinalExamForm";
import FinalExamResults from "@/components/student/FinalExamResults";
import { DocumentViewer } from "@/components/student/DocumentViewers";
import { FlashcardViewer } from "@/components/student/FlashcardViewer";
import { ExplanationPanel } from "@/components/student/ExplanationPanel";
import { VoiceAgentModal } from "@/components/student/VoiceAgentModal";

// Function to get appropriate icon based on file type
function getDocumentIcon(document: any): React.ComponentType<any> {
  const fileName = document.fileName || document.title || '';
  const fileType = document.fileType || '';
  const url = document.fileUrl || document.url || '';

  // Check file extension from fileName or URL
  const extension = fileName.toLowerCase().split('.').pop() ||
    url.toLowerCase().split('.').pop() || '';

  // Check MIME type if available
  const mimeType = fileType.toLowerCase();

  // PDF files
  if (extension === 'pdf' || mimeType.includes('pdf')) {
    return File; // PDF icon
  }

  // PowerPoint files
  if (['ppt', 'pptx'].includes(extension) ||
    mimeType.includes('presentation') ||
    mimeType.includes('powerpoint')) {
    return Presentation; // PowerPoint icon
  }

  // Excel files  
  if (['xls', 'xlsx', 'csv'].includes(extension) ||
    mimeType.includes('spreadsheet') ||
    mimeType.includes('excel') ||
    mimeType.includes('csv')) {
    return FileSpreadsheet; // Excel icon
  }

  // Word files
  if (['doc', 'docx'].includes(extension) ||
    mimeType.includes('document') ||
    mimeType.includes('word')) {
    return FileText; // Word icon
  }

  // Image files
  if (['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'].includes(extension) ||
    mimeType.includes('image')) {
    return FileImage; // Image icon
  }

  // Default to generic file icon
  return FileText;
}

// Function to get appropriate icon color based on file type
function getDocumentIconColor(document: any): string {
  const fileName = document.fileName || document.title || '';
  const fileType = document.fileType || '';
  const url = document.fileUrl || document.url || '';

  const extension = fileName.toLowerCase().split('.').pop() ||
    url.toLowerCase().split('.').pop() || '';
  const mimeType = fileType.toLowerCase();

  // PDF files - red
  if (extension === 'pdf' || mimeType.includes('pdf')) {
    return 'text-red-600';
  }

  // PowerPoint files - orange
  if (['ppt', 'pptx'].includes(extension) ||
    mimeType.includes('presentation') ||
    mimeType.includes('powerpoint')) {
    return 'text-orange-600';
  }

  // Excel files - green
  if (['xls', 'xlsx', 'csv'].includes(extension) ||
    mimeType.includes('spreadsheet') ||
    mimeType.includes('excel') ||
    mimeType.includes('csv')) {
    return 'text-green-600';
  }

  // Word files - blue
  if (['doc', 'docx'].includes(extension) ||
    mimeType.includes('document') ||
    mimeType.includes('word')) {
    return 'text-blue-600';
  }

  // Image files - purple
  if (['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'].includes(extension) ||
    mimeType.includes('image')) {
    return 'text-purple-600';
  }

  // Default - gray
  return 'text-gray-600';
}

interface CourseDetailProps {
  slug: string;
}

// Progress Ring Component
function ProgressRing({ progress, size = 120, strokeWidth = 8 }: { progress: number; size?: number; strokeWidth?: number }) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (progress / 100) * circumference;

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg className="transform -rotate-90" width={size} height={size}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
          stroke="currentColor"
          fill="transparent"
          className="text-white/20"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
          stroke="currentColor"
          fill="transparent"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="text-white transition-all duration-700 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-bold text-white">{Math.round(progress)}%</span>
        <span className="text-xs text-white/70">Complete</span>
      </div>
    </div>
  );
}

// Mini Progress Ring for Module Cards
function MiniProgressRing({ progress, size = 40 }: { progress: number; size?: number }) {
  // Clamp progress to 0-100
  const clampedProgress = Math.min(100, Math.max(0, progress));
  const radius = (size - 4) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (clampedProgress / 100) * circumference;
  const color = clampedProgress === 100 ? '#22c55e' : clampedProgress > 0 ? '#3b82f6' : '#e2e8f0';

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg className="transform -rotate-90" width={size} height={size}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={4}
          stroke="#e2e8f0"
          fill="transparent"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={4}
          stroke={color}
          fill="transparent"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-500"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        {clampedProgress === 100 ? (
          <Check className="h-4 w-4 text-green-500" />
        ) : (
          <span className="text-[10px] font-bold text-slate-600">{Math.round(clampedProgress)}%</span>
        )}
      </div>
    </div>
  );
}

export function CourseDetail({ slug }: CourseDetailProps) {
  const queryClient = useQueryClient();
  const { data, isLoading, error } = useQuery({
    queryKey: ['courseDetail', slug],
    queryFn: async () => {
      const token = localStorage.getItem("token");
      if (!token) throw new Error("Not authenticated");
      const res = await fetch(`/api/student/courses/${slug}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error(`Error ${res.status}: ${res.statusText}`);
      return res.json();
    }
  });

  const course = data?.course ?? data;
  const watchTime = data?.watchTime;
  // Compute dynamic summary stats from modules
  const modulesArray = course?.modules || [];
  const completedCount = modulesArray.filter((m: any) => m.isCompleted).length;
  const totalModules = modulesArray.length;
  const completedModulesCount = modulesArray.filter((m: any) => m.isCompleted).length;
  // Use the fetched course's slug for quiz requests
  const courseSlug = course?.slug;
  // Per-module quiz attempts queries (move hooks out of render loop)
  const attemptsQueries = useQueries({
    queries: modulesArray.map((m: any, idx: number) => ({
      queryKey: ['quizAttempts', courseSlug, idx],
      queryFn: async () => {
        const token = localStorage.getItem("token");
        if (!token) throw new Error("Not authenticated");
        const res = await fetch(
          `/api/student/quiz-attempts/${courseSlug}/${idx}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (!res.ok) throw new Error('Failed to load attempts');
        return res.json(); // { attempts: [...] }
      },
      enabled: m.quizAttempts > 0,
    }))
  });
  // Compute quiz performance as the average of each module's best attempt
  const bestScores = attemptsQueries
    .map((q) => {
      const attempts = (q.data as any)?.attempts ?? [];
      return attempts.length > 0
        ? Math.max(...attempts.map((a: any) => a.score))
        : null;
    })
    .filter((s): s is number => s !== null);
  const quizPerformance = bestScores.length > 0
    ? Math.round(bestScores.reduce((sum, s) => sum + s, 0) / bestScores.length)
    : null;

  // Determine which module is the current one (first not completed)
  const currentModuleIndex = course?.modules.findIndex((m: any) => !m.isCompleted) ?? -1;

  const [selectedVideoUrl, setSelectedVideoUrl] = useState<string | null>(null);
  const [selectedDocUrl, setSelectedDocUrl] = useState<string | null>(null);
  const [selectedRecordingUrl, setSelectedRecordingUrl] = useState<string | null>(null);
  const [selectedVideoIndex, setSelectedVideoIndex] = useState<number>(0);
  const lastSentRef = useRef<number>(0);

  // Document navigation state
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [currentDocType, setCurrentDocType] = useState<'slides' | 'document' | 'spreadsheet' | 'pdf' | null>(null);
  const [baseDocUrl, setBaseDocUrl] = useState<string>('');
  const [isDocLoading, setIsDocLoading] = useState<boolean>(false);
  const [docLoadFailed, setDocLoadFailed] = useState<boolean>(false);
  const [selectedDocument, setSelectedDocument] = useState<any>(null);

  // Media container ref for scrolling into view
  const mediaRef = useRef<HTMLDivElement>(null);

  // Quiz state and handlers
  const [quizModuleIndex, setQuizModuleIndex] = useState<number | null>(null);
  const [quizQuestions, setQuizQuestions] = useState<any[]>([]);

  // Flashcard state
  const [selectedFlashcardModule, setSelectedFlashcardModule] = useState<{ index: number, title: string } | null>(null);

  // Final Exam state and handlers
  const [showFinalExam, setShowFinalExam] = useState(false);
  const [finalExamData, setFinalExamData] = useState<any>(null);
  const [finalExamResults, setFinalExamResults] = useState<any>(null);

  // Selected module for expanded view
  const [selectedModuleIndex, setSelectedModuleIndex] = useState<number | null>(null);

  // AI Learning Features state
  const [showExplanationPanel, setShowExplanationPanel] = useState(false);
  const [showVoiceAgentModal, setShowVoiceAgentModal] = useState(false);

  // Check URL params for showFinalExam
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('showFinalExam') === 'true' && completedCount === totalModules) {
      setShowFinalExam(true);
      // Remove the param from URL
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, [completedCount, totalModules]);

  // Fetch last 5 quiz attempts for the current quiz module when quizModal is open
  const {
    data: attemptsData,
    isLoading: attemptsLoading,
    error: attemptsError,
  } = useQuery({
    queryKey: ['quizAttempts', courseSlug, quizModuleIndex],
    queryFn: async () => {
      if (quizModuleIndex === null) return { attempts: [] };
      const token = localStorage.getItem("token");
      const res = await fetch(
        `/api/student/quiz-attempts/${courseSlug}/${quizModuleIndex}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (!res.ok) throw new Error('Failed to load attempts');
      return res.json(); // expects { attempts: [...] }
    },
    enabled: quizModuleIndex !== null,
  });


  const quizAttempts = attemptsData?.attempts ?? [];

  const handleTakeQuiz = async (moduleIndex: number) => {
    // Clear video and document content when opening quiz modal
    clearVideoContent();
    clearDocumentContent();

    const token = localStorage.getItem("token");
    if (!token) return;
    const res = await fetch(`/api/student/quiz/${courseSlug}/${moduleIndex}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) {
      console.error("Failed to load quiz");
      // Notify if quiz missing/unavailable
      showNotice('No quiz is available for this module.');
      return;
    }
    const { questions } = await res.json();
    if (!questions || !Array.isArray(questions) || questions.length === 0) {
      showNotice('No quiz is available for this module.');
      return;
    }
    const mapped = questions.map((q: any) => ({
      prompt: q.text ?? q.prompt,
      options: q.choices ?? q.options,
      correctIndex: q.correctIndex
    }));
    setQuizQuestions(mapped);
    setQuizModuleIndex(moduleIndex);
  };



  const handleQuizSubmit = async (answers: number[]) => {
    if (quizModuleIndex === null) return;
    const token = localStorage.getItem("token");
    if (!token) return;
    await fetch("/api/student/quiz-attempt", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        slug: courseSlug,
        moduleIndex: quizModuleIndex,
        answers,
      }),
    });
    queryClient.invalidateQueries({ queryKey: ['studentDashboard'] });
    queryClient.invalidateQueries({ queryKey: ['courseDetail', slug] });
    // Removed automatic modal close so student can review results
  };

  // Final Exam handlers
  const handleTakeFinalExam = useCallback(async () => {
    // Clear video, document, and quiz content when opening final exam
    clearVideoContent();
    clearDocumentContent();
    setQuizModuleIndex(null);
    setQuizQuestions([]);

    const token = localStorage.getItem("token");
    if (!token) return;

    try {
      const res = await fetch(`/api/student/final-exam/${courseSlug}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!res.ok) {
        const errorData = await res.json();
        alert(errorData.message || "Failed to load final examination");
        return;
      }

      const examData = await res.json();
      setFinalExamData(examData);
      setShowFinalExam(true);
    } catch (error) {
      console.error("Error loading final exam:", error);
      alert("Failed to load final examination");
    }
  }, [courseSlug]);

  const handleFinalExamSubmit = async (answers: (number | { type: 'file' | 'text'; content: string; fileName?: string })[]) => {
    const token = localStorage.getItem("token");
    if (!token) return;

    try {
      const res = await fetch("/api/student/final-exam/submit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          courseSlug,
          answers,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        alert(errorData.message || "Failed to submit final examination");
        return;
      }

      const results = await res.json();
      setFinalExamResults(results);
      setShowFinalExam(false);
      queryClient.invalidateQueries({ queryKey: ['studentDashboard'] });
      queryClient.invalidateQueries({ queryKey: ['courseDetail', slug] });
    } catch (error) {
      console.error("Error submitting final exam:", error);
      alert("Failed to submit final examination");
    }
  };

  const handleFinalExamCancel = () => {
    setShowFinalExam(false);
    setFinalExamData(null);
  };

  // Trigger final exam load when showFinalExam becomes true
  useEffect(() => {
    if (showFinalExam && !finalExamData) {
      handleTakeFinalExam();
    }
  }, [showFinalExam, finalExamData, handleTakeFinalExam]);

  const [expanded, setExpanded] = useState<boolean[]>([]);
  // State for active tab
  const [activeTab, setActiveTab] = useState<'modules' | 'resources'>('modules');
  const [selectedContent, setSelectedContent] = useState<{
    type: 'video' | 'document' | 'quiz' | null;
    moduleIndex?: number;
    contentIndex?: number;
    content?: any;
  }>({ type: null });
  // State for selected module to show description on right side
  const [selectedModule, setSelectedModule] = useState<{
    index: number;
    title: string;
    description?: string;
  } | null>(null);
  // Inline notice for missing content
  const [notice, setNotice] = useState<string | null>(null);
  const noticeTimerRef = useRef<number | null>(null);
  const showNotice = (message: string) => {
    setNotice(message);
    if (noticeTimerRef.current) {
      window.clearTimeout(noticeTimerRef.current);
    }
    noticeTimerRef.current = window.setTimeout(() => setNotice(null), 4000);
  };

  useEffect(() => {
    if (course?.modules) {
      setExpanded(course.modules.map(() => false)); // Start with all collapsed
    }
  }, [course]);

  useEffect(() => {
    if ((selectedVideoUrl || selectedDocUrl) && mediaRef.current) {
      // Scroll within the right content area only, not the entire page
      const rightContentArea = mediaRef.current.closest('.overflow-y-auto');
      if (rightContentArea) {
        rightContentArea.scrollTop = 0;
      }
    }
  }, [selectedVideoUrl, selectedDocUrl]);

  // Keyboard navigation for documents
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      if (selectedDocUrl && !event.metaKey && !event.ctrlKey) {
        if (event.key === 'ArrowLeft') {
          event.preventDefault();
          goToPrevPage();
        } else if (event.key === 'ArrowRight') {
          event.preventDefault();
          goToNextPage();
        }
      }
    };

    if (selectedDocUrl) {
      document.addEventListener('keydown', handleKeyPress);
    }

    return () => {
      document.removeEventListener('keydown', handleKeyPress);
    };
  }, [selectedDocUrl, currentPage, totalPages]);


  if (isLoading) {
    return <CourseDetailSkeleton />;
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 p-6">
        <div className="max-w-7xl mx-auto">
          <Link href="/student/courses">
            <Button variant="outline" size="sm" className="mb-6">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Courses
            </Button>
          </Link>
          <div className="rounded-2xl bg-white border border-red-200 p-8 text-center">
            <div className="size-16 rounded-full bg-red-100 mx-auto mb-4 flex items-center justify-center">
              <X className="size-8 text-red-500" />
            </div>
            <h2 className="text-xl font-bold text-slate-800 mb-2">Error Loading Course</h2>
            <p className="text-slate-500">Unable to load course data. Please try again later.</p>
          </div>
        </div>
      </div>
    );
  }

  // Helper to open the next unwatched video (or first video) in a new tab
  const openNextVideo = (videos: Array<{ url: string; watched?: boolean }>) => {
    if (!videos || !videos.length) return;
    // find the first unwatched video, or fallback to the first
    const nextVideo = videos.find(v => !v.watched) ?? videos[0];
    setSelectedVideoUrl(nextVideo.url);
  };

  // Record watch time to backend (throttled)
  const recordWatchTime = async (secondsDelta: number) => {
    const token = localStorage.getItem("token");
    if (!token) return;
    await fetch("/api/student/watch-time", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        slug,
        moduleIndex: currentModuleIndex,
        videoIndex: selectedVideoIndex,
        duration: secondsDelta,
      }),
    });
    // Refresh data for dynamic progress update
    queryClient.invalidateQueries({ queryKey: ['studentDashboard'] });
    queryClient.invalidateQueries({ queryKey: ['courseDetail', slug] });
  };
  const recordWatchTimeThrottled = throttle((playedSeconds: number) => {
    const delta = playedSeconds - lastSentRef.current;
    if (delta > 1) {
      recordWatchTime(delta);
      lastSentRef.current = playedSeconds;
    }
  }, 10000);

  const handleDocPreview = async (docUrl: string | undefined, document?: any) => {
    const token = localStorage.getItem("token");
    if (!token || !docUrl) return;

    console.log('📄 Document preview requested:', { docUrl, document, timestamp: new Date().toISOString() });

    // Store document metadata for the viewer
    setSelectedDocument(document);

    // Detect document type and set up navigation
    const { type, estimatedPages } = getDocumentTypeAndPages(docUrl);
    setCurrentDocType(type);
    setTotalPages(estimatedPages);
    setCurrentPage(1);
    setBaseDocUrl(docUrl);
    setDocLoadFailed(false);
    setIsDocLoading(true);

    // Add a small delay to ensure the component has time to initialize loading state
    await new Promise(resolve => setTimeout(resolve, 100));

    // send original URL to backend
    await fetch("/api/student/view-document", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        slug,
        moduleIndex: currentModuleIndex,
        docUrl,
      }),
    });
    queryClient.invalidateQueries({ queryKey: ['studentDashboard'] });
    queryClient.invalidateQueries({ queryKey: ['courseDetail', slug] });

    // For PDFs, try to get the actual page count from backend
    if (docUrl.toLowerCase().includes('.pdf')) {
      try {
        const pageCountResponse = await fetch(
          `/api/documents/page-count?documentUrl=${encodeURIComponent(docUrl)}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        if (pageCountResponse.ok) {
          const { pageCount } = await pageCountResponse.json();
          if (pageCount && pageCount > 0) {
            setTotalPages(pageCount);
            console.log(`📄 Actual PDF page count: ${pageCount}`);
          }
        }
      } catch (error) {
        console.log('Could not fetch PDF page count, using estimate');
      }
    }

    // Use the original URL without modifications to avoid 400 errors
    console.log('🌤️ Using original Cloudinary URL without transformations');

    // Set document URL with a small delay to ensure loading state is visible
    setTimeout(() => {
      setSelectedDocUrl(docUrl);
      // Keep setup loading for a bit longer to ensure viewer is ready
      setTimeout(() => {
        setIsDocLoading(false);
      }, 300);
    }, 200);

    console.log('✅ Document preview URL set:', { finalUrl: docUrl, type });
  };

  // Navigate to specific page
  const navigateToPage = (page: number) => {
    if (page < 1 || page > totalPages || !baseDocUrl) return;
    setCurrentPage(page);
    setIsDocLoading(true);

    // Clear the URL first to force iframe reload
    setSelectedDocUrl('');

    // Use a small delay to ensure the iframe is cleared before setting new URL
    setTimeout(() => {
      let embedUrl;

      // Check if it's a Cloudinary document
      if (baseDocUrl.includes('res.cloudinary.com')) {
        console.log('🔄 Navigating Cloudinary document to page:', page);

        // Determine file type from URL
        const isPDF = baseDocUrl.toLowerCase().includes('.pdf');
        const isOfficeDoc = baseDocUrl.toLowerCase().match(/\.(doc|docx|xls|xlsx|ppt|pptx)$/);

        if (isPDF) {
          // For PDFs, use direct Cloudinary URL with inline flag (page navigation may not work)
          let pdfUrl = baseDocUrl;
          if (!pdfUrl.includes('fl_inline')) {
            const urlParts = pdfUrl.split('/upload/');
            if (urlParts.length === 2) {
              pdfUrl = `${urlParts[0]}/upload/fl_inline/${urlParts[1]}`;
            }
          }
          embedUrl = pdfUrl;
        } else if (isOfficeDoc) {
          // For Office documents, use Microsoft Office Online viewer (doesn't support page navigation)
          embedUrl = `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(baseDocUrl)}`;
        } else {
          // For other documents, use direct URL
          embedUrl = baseDocUrl;
        }
      } else {
        console.log('🔄 Navigating Google Drive document to page:', page);
        // For Google Drive documents, use the existing Google preview logic with page navigation
        embedUrl = toGooglePreviewUrl(baseDocUrl, page);
      }

      // Force refresh the iframe by adding a timestamp parameter
      const urlWithTimestamp = embedUrl + (embedUrl.includes('?') ? '&' : '?') + `t=${Date.now()}`;
      setSelectedDocUrl(urlWithTimestamp);
      console.log('✅ Page navigation URL set:', { page, finalUrl: urlWithTimestamp });

      // Remove loading state after a delay
      setTimeout(() => setIsDocLoading(false), 1000);
    }, 100);
  };

  // Navigate to previous page
  const goToPrevPage = () => {
    if (currentPage > 1) {
      navigateToPage(currentPage - 1);
    }
  };

  // Navigate to next page
  const goToNextPage = () => {
    if (currentPage < totalPages) {
      navigateToPage(currentPage + 1);
    }
  };

  // Helper function to clear all open content
  const clearAllContent = () => {
    setSelectedVideoUrl(null);
    setSelectedDocUrl(null);
    setSelectedContent({ type: null });
    setSelectedModule(null);
    setSelectedVideoIndex(0);
    lastSentRef.current = 0;
    setCurrentPage(1);
    setTotalPages(1);
    setCurrentDocType(null);
    setBaseDocUrl('');
    setIsDocLoading(false);
    setQuizModuleIndex(null);
    setQuizQuestions([]);
    setSelectedFlashcardModule(null);
    setSelectedModuleIndex(null);
  };

  // Helper function to clear document content only
  const clearDocumentContent = () => {
    setSelectedDocUrl(null);
    setCurrentPage(1);
    setTotalPages(1);
    setCurrentDocType(null);
    setBaseDocUrl('');
    setIsDocLoading(false);
    setDocLoadFailed(false);
    setSelectedDocument(null);
    // Close AI learning features
    setShowExplanationPanel(false);
    setShowVoiceAgentModal(false);
  };

  // Helper function to clear video content only
  const clearVideoContent = () => {
    setSelectedVideoUrl(null);
    setSelectedVideoIndex(0);
    lastSentRef.current = 0;
  };

  // Helper function to clear quiz content only
  const clearQuizContent = () => {
    setSelectedContent({ type: null });
    setQuizModuleIndex(null);
    setQuizQuestions([]);
  };

  // Helper function to clear flashcard content only
  const clearFlashcardContent = () => {
    setSelectedFlashcardModule(null);
  };

  // Helper function to clear recording content only
  const clearRecordingContent = () => {
    setSelectedRecordingUrl(null);
  };

  // Get "Up Next" recommendation
  const getUpNextContent = () => {
    if (currentModuleIndex === -1 || !course?.modules) return null;
    const currentModule = course.modules[currentModuleIndex];
    if (!currentModule) return null;

    // Check for unwatched videos first
    const unwatchedVideo = currentModule.videos?.find((v: any) => !v.watched);
    if (unwatchedVideo) {
      return {
        type: 'video' as const,
        title: unwatchedVideo.title || 'Continue Video',
        moduleTitle: currentModule.title,
        moduleIndex: currentModuleIndex,
        content: unwatchedVideo
      };
    }

    // Check for unviewed documents
    const unviewedDoc = currentModule.documents?.find((d: any) => !d.viewed);
    if (unviewedDoc) {
      return {
        type: 'document' as const,
        title: unviewedDoc.title || 'Continue Reading',
        moduleTitle: currentModule.title,
        moduleIndex: currentModuleIndex,
        content: unviewedDoc
      };
    }

    // Check for quiz
    const hasQuiz = (Array.isArray(currentModule?.questions) && currentModule.questions.length > 0) ||
      (!!currentModule && typeof currentModule.quizId !== 'undefined' && !!currentModule.quizId);
    if (hasQuiz && !currentModule.lastQuizScore) {
      return {
        type: 'quiz' as const,
        title: 'Take Module Quiz',
        moduleTitle: currentModule.title,
        moduleIndex: currentModuleIndex,
        content: currentModule
      };
    }

    return null;
  };

  const upNextContent = getUpNextContent();

  // Check if final exam is available
  const isFinalExamEligible = completedCount === totalModules && totalModules > 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50">
      {/* Hero Header Section */}
      <div className="relative overflow-hidden bg-gradient-to-r from-[#18548b] via-[#1a6ab0] to-[#2563eb]">
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '24px 24px' }} />
        <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-white/5 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />

        <div className="relative max-w-7xl mx-auto px-4 py-6">
          {/* Back Button */}
          <Link href="/student/courses">
            <Button variant="ghost" size="sm" className="text-white/80 hover:text-white hover:bg-white/10 mb-4">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Courses
            </Button>
          </Link>

          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
            {/* Course Info */}
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <Badge className="bg-white/20 text-white border-0 text-xs">
                  <GraduationCap className="h-3 w-3 mr-1" />
                  {course?.type || 'Professional Certificate'}
                </Badge>
                {isFinalExamEligible && (
                  <Badge className="bg-amber-400/90 text-amber-900 border-0 text-xs animate-pulse">
                    <Trophy className="h-3 w-3 mr-1" />
                    Ready for Final Exam
                  </Badge>
                )}
              </div>
              <h1 className="text-2xl lg:text-3xl font-bold text-white mb-2">{course?.title || 'My Course'}</h1>
              <p className="text-white/70 text-sm max-w-xl line-clamp-2">{course?.description}</p>
            </div>

            {/* Progress Ring */}
            <div className="flex items-center gap-6">
              <ProgressRing progress={course?.progress ?? 0} />
            </div>
          </div>
        </div>
      </div>

      {/* Stats Strip */}
      <div className="bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {/* Modules Card */}
            <div className="rounded-xl bg-gradient-to-br from-blue-50 to-indigo-50 p-3 border border-blue-100/50">
              <div className="flex items-center gap-2 mb-1">
                <div className="size-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
                  <Layers className="size-4 text-blue-600" />
                </div>
                <span className="text-xs font-medium text-slate-500">Modules</span>
              </div>
              <p className="text-xl font-bold text-slate-800">{completedCount} / {totalModules}</p>
              <p className="text-xs text-slate-500">{completedCount === totalModules ? 'All Complete!' : 'In Progress'}</p>
            </div>

            {/* Progress Card */}
            <div className="rounded-xl bg-gradient-to-br from-emerald-50 to-teal-50 p-3 border border-emerald-100/50">
              <div className="flex items-center gap-2 mb-1">
                <div className="size-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                  <Target className="size-4 text-emerald-600" />
                </div>
                <span className="text-xs font-medium text-slate-500">Progress</span>
              </div>
              <p className="text-xl font-bold text-emerald-600">{Math.round(course?.progress ?? 0)}%</p>
              <p className="text-xs text-slate-500">Content Watched</p>
            </div>

            {/* Quiz Average Card */}
            <div className="rounded-xl bg-gradient-to-br from-violet-50 to-purple-50 p-3 border border-violet-100/50">
              <div className="flex items-center gap-2 mb-1">
                <div className="size-8 rounded-lg bg-violet-500/10 flex items-center justify-center">
                  <Zap className="size-4 text-violet-600" />
                </div>
                <span className="text-xs font-medium text-slate-500">Quiz Avg</span>
              </div>
              <p className="text-xl font-bold text-violet-600">{quizPerformance ?? '--'}%</p>
              <p className="text-xs text-slate-500">{bestScores.length > 0 ? `${bestScores.length} quiz${bestScores.length > 1 ? 'es' : ''} taken` : 'No quizzes yet'}</p>
            </div>

            {/* Validity Card */}
            <div className="rounded-xl bg-gradient-to-br from-amber-50 to-orange-50 p-3 border border-amber-100/50">
              <div className="flex items-center gap-2 mb-1">
                <div className="size-8 rounded-lg bg-amber-500/10 flex items-center justify-center">
                  <CalendarDays className="size-4 text-amber-600" />
                </div>
                <span className="text-xs font-medium text-slate-500">Valid Until</span>
              </div>
              <p className="text-lg font-bold text-slate-800">
                {new Date(course?.enrollment?.validUntil || '').toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric'
                })}
              </p>
              <p className="text-xs text-slate-500">
                {course?.enrollment?.validUntil
                  ? `${Math.max(0, Math.ceil((new Date(course.enrollment.validUntil).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24 * 30)))} months left`
                  : "No expiry"}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-5">
        {/* Notice */}
        {notice && (
          <div className="mb-4">
            <Alert className="border-amber-200 bg-amber-50">
              <Sparkles className="h-4 w-4 text-amber-600" />
              <AlertTitle className="text-amber-800">Notice</AlertTitle>
              <AlertDescription className="text-amber-700">{notice}</AlertDescription>
            </Alert>
          </div>
        )}

        <div className="flex flex-col lg:flex-row gap-5">
          {/* Left Column - Module Grid & Up Next */}
          <div className="lg:w-[380px] flex-shrink-0 space-y-4">
            {/* Up Next Card */}
            {upNextContent && !selectedVideoUrl && !selectedDocUrl && !showFinalExam && quizModuleIndex === null && !selectedFlashcardModule && (
              <div className="rounded-2xl bg-gradient-to-br from-[#18548b] to-[#2563eb] p-4 text-white shadow-lg relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2" />
                <div className="relative z-10">
                  <div className="flex items-center gap-2 mb-3">
                    <Sparkles className="size-4" />
                    <span className="text-xs font-bold uppercase tracking-wider text-white/80">Up Next</span>
                  </div>
                  <h3 className="font-semibold mb-1">{upNextContent.title}</h3>
                  <p className="text-xs text-white/70 mb-3">{upNextContent.moduleTitle}</p>
                  <Button
                    size="sm"
                    className="w-full bg-white text-[#18548b] hover:bg-white/90 font-semibold"
                    onClick={() => {
                      if (upNextContent.type === 'video') {
                        clearDocumentContent();
                        clearQuizContent();
                        setSelectedVideoUrl(upNextContent.content.url);
                      } else if (upNextContent.type === 'document') {
                        clearVideoContent();
                        clearQuizContent();
                        const doc = upNextContent.content;
                        const docUrl = doc.type === 'upload' ? doc.fileUrl : doc.url;
                        if (docUrl) handleDocPreview(docUrl, doc);
                      } else if (upNextContent.type === 'quiz') {
                        handleTakeQuiz(upNextContent.moduleIndex);
                      }
                    }}
                  >
                    <PlayCircle className="size-4 mr-2" />
                    Continue
                  </Button>
                </div>
              </div>
            )}

            {/* Final Exam Floating Card */}
            {isFinalExamEligible && !showFinalExam && (
              <div className="rounded-2xl bg-gradient-to-br from-amber-400 via-orange-400 to-amber-500 p-4 text-white shadow-lg relative overflow-hidden">
                <div className="absolute top-0 right-0 w-24 h-24 bg-white/20 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2" />
                <div className="relative z-10">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="size-10 rounded-xl bg-white/20 flex items-center justify-center">
                      <Trophy className="size-5" />
                    </div>
                    <div>
                      <h3 className="font-bold">Final Examination</h3>
                      <p className="text-xs text-white/80">All modules completed!</p>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    className="w-full bg-white text-amber-600 hover:bg-white/90 font-semibold"
                    onClick={handleTakeFinalExam}
                  >
                    <Award className="size-4 mr-2" />
                    Take Final Exam
                  </Button>
                </div>
              </div>
            )}

            {/* Module Grid */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wider">Course Modules</h2>
                <span className="text-xs text-slate-400">{totalModules} modules</span>
              </div>

              <div className="grid grid-cols-1 gap-2">
                {course?.modules.map((module: any, moduleIndex: number) => {
                  const isSelected = selectedModuleIndex === moduleIndex;
                  
                  // Use backend-calculated percentComplete (now correctly capped at 100%)
                  // with a fallback dynamic calculation for safety
                  const getModuleProgress = () => {
                    // Prefer backend value if available and valid
                    if (typeof module.percentComplete === 'number' && module.percentComplete >= 0 && module.percentComplete <= 100) {
                      return module.percentComplete;
                    }
                    
                    // Fallback: calculate dynamically
                    const videos = module.videos || [];
                    const documents = module.documents || [];
                    const hasQuiz = (module.questions?.length > 0) || module.quizId;
                    
                    let totalItems = 0;
                    let completedItems = 0;
                    
                    if (videos.length > 0) {
                      totalItems += videos.length;
                      completedItems += videos.filter((v: any) => v.watched).length;
                    }
                    
                    if (documents.length > 0) {
                      totalItems += documents.length;
                      completedItems += documents.filter((d: any) => d.viewed).length;
                    }
                    
                    if (hasQuiz) {
                      totalItems += 1;
                      if (module.lastQuizScore !== null && module.lastQuizScore !== undefined) {
                        completedItems += 1;
                      }
                    }
                    
                    if (totalItems === 0) return module.isCompleted ? 100 : 0;
                    return Math.min(100, Math.round((completedItems / totalItems) * 100));
                  };
                  
                  const moduleProgress = getModuleProgress();
                  const isCompleted = module.isCompleted || moduleProgress === 100;
                  const isCurrent = moduleIndex === currentModuleIndex;

                  return (
                    <div
                      key={moduleIndex}
                      className={`
                        rounded-xl border transition-all duration-200 cursor-pointer
                        ${isSelected
                          ? 'bg-white border-blue-200 shadow-md ring-2 ring-blue-500/20'
                          : 'bg-white border-slate-200 hover:border-slate-300 hover:shadow-sm'
                        }
                        ${isCurrent && !isSelected ? 'border-l-4 border-l-blue-500' : ''}
                      `}
                      onClick={() => {
                        if (isSelected) {
                          setSelectedModuleIndex(null);
                        } else {
                          clearAllContent();
                          setSelectedModuleIndex(moduleIndex);
                          setSelectedModule({
                            index: moduleIndex,
                            title: module.title,
                            description: module.description
                          });
                        }
                      }}
                    >
                      {/* Module Header */}
                      <div className="p-3 flex items-center gap-3">
                        <MiniProgressRing progress={moduleProgress} />
                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium text-slate-800 text-sm truncate">{module.title}</h3>
                          <div className="flex items-center gap-2 mt-0.5">
                            {module.videos?.length > 0 && (
                              <span className="text-[10px] text-slate-400 flex items-center gap-0.5">
                                <Video className="size-3" />
                                {module.videos.length}
                              </span>
                            )}
                            {module.documents?.length > 0 && (
                              <span className="text-[10px] text-slate-400 flex items-center gap-0.5">
                                <FileText className="size-3" />
                                {module.documents.length}
                              </span>
                            )}
                            {(module.questions?.length > 0 || module.quizId) && (
                              <span className="text-[10px] text-slate-400 flex items-center gap-0.5">
                                <BookOpen className="size-3" />
                                Quiz
                              </span>
                            )}
                          </div>
                        </div>
                        <ChevronDown className={`size-4 text-slate-400 transition-transform ${isSelected ? 'rotate-180' : ''}`} />
                      </div>

                      {/* Expanded Content */}
                      {isSelected && (
                        <div className="px-3 pb-3 border-t border-slate-100 pt-2 space-y-2">
                          {/* Module Description */}
                          {module.description && (
                            <p className="text-xs text-slate-500 mb-2 line-clamp-2">{module.description}</p>
                          )}

                          {/* Videos */}
                          {module.videos?.length > 0 && (
                            <div className="space-y-1">
                              <p className="text-[10px] font-bold text-slate-400 uppercase">Videos</p>
                              {module.videos.map((video: any, vidIdx: number) => (
                                <button
                                  key={vidIdx}
                                  className="w-full flex items-center gap-2 p-2 rounded-lg bg-blue-50/50 hover:bg-blue-100/50 transition-colors text-left"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    clearDocumentContent();
                                    clearQuizContent();
                                    clearFlashcardContent();
                                    setSelectedVideoUrl(video.url);
                                    setSelectedVideoIndex(vidIdx);
                                    lastSentRef.current = 0;
                                  }}
                                >
                                  <div className={`size-6 rounded-full flex items-center justify-center ${video.watched ? 'bg-green-500' : 'bg-blue-500'}`}>
                                    {video.watched ? <Check className="size-3 text-white" /> : <Play className="size-3 text-white" />}
                                  </div>
                                  <span className="text-xs text-slate-700 flex-1 truncate">{video.title || `Video ${vidIdx + 1}`}</span>
                                </button>
                              ))}
                            </div>
                          )}

                          {/* Documents */}
                          {module.documents?.length > 0 && (
                            <div className="space-y-1">
                              <p className="text-[10px] font-bold text-slate-400 uppercase">Materials</p>
                              {module.documents.map((doc: any, docIdx: number) => {
                                const DocIcon = getDocumentIcon(doc);
                                const iconColor = getDocumentIconColor(doc);
                                return (
                                  <button
                                    key={docIdx}
                                    className="w-full flex items-center gap-2 p-2 rounded-lg bg-emerald-50/50 hover:bg-emerald-100/50 transition-colors text-left"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      clearVideoContent();
                                      clearQuizContent();
                                      clearFlashcardContent();
                                      const documentUrl = doc.type === 'upload' ? doc.fileUrl : doc.url;
                                      if (documentUrl) handleDocPreview(documentUrl, doc);
                                    }}
                                  >
                                    <div className={`size-6 rounded-full flex items-center justify-center ${doc.viewed ? 'bg-green-500' : 'bg-slate-200'}`}>
                                      {doc.viewed ? <Check className="size-3 text-white" /> : <DocIcon className={`size-3 ${iconColor}`} />}
                                    </div>
                                    <span className="text-xs text-slate-700 flex-1 truncate">{doc.title || `Document ${docIdx + 1}`}</span>
                                  </button>
                                );
                              })}
                            </div>
                          )}

                          {/* Quiz & Flashcards */}
                          <div className="flex gap-2 pt-1">
                            {(module.questions?.length > 0 || module.quizId) && (
                              <button
                                className="flex-1 flex items-center justify-center gap-1.5 p-2 rounded-lg bg-violet-50 hover:bg-violet-100 transition-colors"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  clearVideoContent();
                                  clearDocumentContent();
                                  clearFlashcardContent();
                                  setSelectedContent({ type: 'quiz', moduleIndex, content: module });
                                }}
                              >
                                <BookOpen className="size-3.5 text-violet-600" />
                                <span className="text-xs font-medium text-violet-700">Quiz</span>
                              </button>
                            )}
                            <button
                              className="flex-1 flex items-center justify-center gap-1.5 p-2 rounded-lg bg-indigo-50 hover:bg-indigo-100 transition-colors"
                              onClick={(e) => {
                                e.stopPropagation();
                                clearVideoContent();
                                clearDocumentContent();
                                clearQuizContent();
                                setSelectedFlashcardModule({ index: moduleIndex, title: module.title });
                              }}
                            >
                              <Layers className="size-3.5 text-indigo-600" />
                              <span className="text-xs font-medium text-indigo-700">Flashcards</span>
                            </button>
                          </div>

                          {/* Live Classes & Recordings */}
                          <div className="flex gap-2">
                            <LiveClassesForModule courseSlug={courseSlug} moduleIndex={moduleIndex} />
                            <RecordingsForModule
                              courseSlug={courseSlug}
                              moduleIndex={moduleIndex}
                              onRecordingClick={(recordingUrl: string) => {
                                clearDocumentContent();
                                clearQuizContent();
                                clearVideoContent();
                                // Handle different recording URL types (SharePoint, Google Drive)
                                let embedUrl = recordingUrl;
                                if (recordingUrl.includes('drive.google.com')) {
                                  embedUrl = recordingUrl.replace('/view', '/preview');
                                }
                                setSelectedRecordingUrl(embedUrl);
                              }}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right Column - Content Area */}
          <div className="flex-1 min-w-0">
            {/* Video Player */}
            {selectedVideoUrl && (
              <div className="rounded-2xl bg-white border border-slate-200 shadow-sm overflow-hidden">
                <div className="bg-gradient-to-r from-blue-500 to-indigo-500 px-4 py-3 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-white">
                    <PlayCircle className="size-5" />
                    <span className="font-medium text-sm">Now Playing</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-white hover:bg-white/20"
                    onClick={clearVideoContent}
                  >
                    <X className="size-4" />
                  </Button>
                </div>
                <div ref={mediaRef} className="relative pt-[56.25%]">
                  <ReactPlayer
                    url={selectedVideoUrl}
                    controls
                    width="100%"
                    height="100%"
                    className="absolute top-0 left-0"
                    onProgress={({ playedSeconds }) => {
                      recordWatchTimeThrottled(playedSeconds);
                    }}
                    onEnded={() => {
                      const finalDelta = lastSentRef.current ? lastSentRef.current : 0;
                      if (finalDelta > 0) recordWatchTime(finalDelta);
                      queryClient.invalidateQueries({ queryKey: ['courseDetail', slug] });
                    }}
                  />
                </div>
              </div>
            )}

            {/* Recording Player (SharePoint/Google Drive) */}
            {selectedRecordingUrl && (
              <div className="rounded-2xl bg-white border border-slate-200 shadow-sm overflow-hidden mb-4">
                <div className="bg-gradient-to-r from-red-500 to-orange-500 px-4 py-3 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-white">
                    <PlayCircle className="size-5" />
                    <span className="font-medium text-sm">Live Class Recording</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-white hover:bg-white/20"
                    onClick={clearRecordingContent}
                  >
                    <X className="size-4" />
                  </Button>
                </div>
                <div className="aspect-video bg-gray-100">
                  <iframe
                    className="w-full h-full border-0"
                    src={selectedRecordingUrl}
                    title="Live Class Recording"
                    allowFullScreen
                    allow="autoplay; encrypted-media"
                  />
                </div>
              </div>
            )}

            {/* Document Viewer with Explanation Panel */}
            {selectedDocUrl && (
              <div className="flex gap-4">
                {/* Document Viewer */}
                <div className={`rounded-2xl bg-white border border-slate-200 shadow-sm overflow-hidden flex-1 transition-all duration-300 ${showExplanationPanel ? 'w-[60%]' : 'w-full'}`}>
                  <div className="bg-gradient-to-r from-emerald-500 to-teal-500 px-4 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-white">
                      <FileText className="size-5" />
                      <span className="font-medium text-sm">Reading Material</span>
                      {currentPage > 0 && (
                        <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full">
                          Page {currentPage}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {/* AI Explain Button */}
                      {baseDocUrl && baseDocUrl.toLowerCase().includes('.pdf') && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className={`text-white hover:bg-white/20 text-xs ${showExplanationPanel ? 'bg-white/20' : ''}`}
                          onClick={() => setShowExplanationPanel(!showExplanationPanel)}
                        >
                          <Sparkles className="size-4 mr-1" />
                          {showExplanationPanel ? 'Hide' : 'Explain'}
                        </Button>
                      )}
                      {/* Voice Chat Button */}
                      {baseDocUrl && baseDocUrl.toLowerCase().includes('.pdf') && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-white hover:bg-white/20 text-xs"
                          onClick={() => setShowVoiceAgentModal(true)}
                        >
                          <Mic className="size-4 mr-1" />
                          Voice Chat
                        </Button>
                      )}
                      {baseDocUrl && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-white hover:bg-white/20 text-xs"
                          onClick={() => window.open(baseDocUrl, '_blank', 'noopener,noreferrer')}
                        >
                          Open in New Tab
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-white hover:bg-white/20"
                        onClick={clearDocumentContent}
                      >
                        <X className="size-4" />
                      </Button>
                    </div>
                  </div>

                  {isDocLoading ? (
                    <div className="h-[60vh] flex items-center justify-center">
                      <div className="text-center">
                        <Loader2 className="size-12 animate-spin mx-auto mb-4 text-emerald-600" />
                        <p className="text-slate-600 font-medium">Loading document...</p>
                      </div>
                    </div>
                  ) : (
                    <DocumentViewer
                      fileUrl={selectedDocUrl}
                      fileName={selectedDocument?.fileName || selectedDocument?.title}
                      fileType={selectedDocument?.fileType}
                    />
                  )}

                  {/* AI Features Page Selector */}
                  {baseDocUrl && baseDocUrl.toLowerCase().includes('.pdf') && totalPages > 1 && (
                    <div className="flex items-center justify-center gap-3 py-2 px-4 bg-gradient-to-r from-violet-50 to-purple-50 border-t border-violet-100">
                      <Sparkles className="size-4 text-violet-500" />
                      <span className="text-sm text-slate-600">For AI features, select page:</span>
                      <input
                        type="number"
                        min={1}
                        max={totalPages}
                        value={currentPage}
                        onChange={(e) => {
                          const page = parseInt(e.target.value, 10);
                          if (page >= 1 && page <= totalPages) {
                            setCurrentPage(page);
                          }
                        }}
                        className="w-16 h-8 text-center text-sm border border-violet-200 rounded-md focus:ring-2 focus:ring-violet-300 focus:border-violet-400"
                      />
                      <span className="text-sm text-slate-500">of {totalPages}</span>
                    </div>
                  )}
                </div>

                {/* Explanation Panel - Side by Side */}
                {showExplanationPanel && baseDocUrl && baseDocUrl.toLowerCase().includes('.pdf') && (
                  <div className="w-[350px] flex-shrink-0 rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                    <ExplanationPanel
                      isOpen={showExplanationPanel}
                      onClose={() => setShowExplanationPanel(false)}
                      documentUrl={baseDocUrl}
                      documentTitle={selectedDocument?.title || selectedDocument?.fileName || 'Document'}
                      pageNumber={currentPage}
                    />
                  </div>
                )}
              </div>
            )}

            {/* Flashcard Viewer */}
            {selectedFlashcardModule && (
              <div className="rounded-2xl bg-white border border-slate-200 shadow-sm overflow-hidden h-[600px]">
                <FlashcardViewer
                  moduleIndex={selectedFlashcardModule.index}
                  courseSlug={courseSlug}
                  onClose={() => clearFlashcardContent()}
                />
              </div>
            )}

            {/* Quiz Section */}
            {selectedContent.type === 'quiz' && selectedContent.content && (
              <div className="rounded-2xl bg-white border border-slate-200 shadow-sm overflow-hidden">
                <div className="bg-gradient-to-r from-violet-500 to-purple-500 px-4 py-3 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-white">
                    <BookOpen className="size-5" />
                    <span className="font-medium text-sm">{selectedContent.content?.title || `Module ${(selectedContent.moduleIndex || 0) + 1}`} Quiz</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-white hover:bg-white/20"
                    onClick={() => setSelectedContent({ type: null })}
                  >
                    <X className="size-4" />
                  </Button>
                </div>

                <div className="p-5">
                  {/* Take Quiz Button */}
                  {quizModuleIndex === null && (
                    <div className="rounded-xl bg-gradient-to-br from-violet-50 to-purple-50 p-4 mb-4 border border-violet-100">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="size-10 rounded-xl bg-violet-500/10 flex items-center justify-center">
                            <Zap className="size-5 text-violet-600" />
                          </div>
                          <div>
                            <h4 className="font-semibold text-slate-800">Module Quiz</h4>
                            <p className="text-xs text-slate-500">Test your knowledge</p>
                          </div>
                        </div>
                        <Button
                          className="bg-violet-600 hover:bg-violet-700"
                          onClick={() => handleTakeQuiz(selectedContent.moduleIndex || 0)}
                        >
                          {selectedContent.content.lastQuizScore !== null ? 'Retake Quiz' : 'Take Quiz'}
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Quiz Attempts History */}
                  {(() => {
                    const moduleIndex = selectedContent.moduleIndex || 0;
                    const moduleTitle = selectedContent.content.title;
                    const attemptsQuery = attemptsQueries[moduleIndex];
                    const moduleAttempts = ((attemptsQuery?.data as any)?.attempts ?? [])
                      .slice()
                      .sort((a: any, b: any) =>
                        new Date(b.attemptedAt).getTime() - new Date(a.attemptedAt).getTime()
                      );

                    const descendingAttempts = moduleAttempts.slice().sort(
                      (a: any, b: any) => new Date(b.attemptedAt).getTime() - new Date(a.attemptedAt).getTime()
                    );

                    const orderedAttempts = moduleAttempts.slice().reverse();

                    if (moduleAttempts && moduleAttempts.length > 0) {
                      return (
                        <div className="mt-4">
                          <h4 className="text-sm font-semibold text-slate-700 mb-3">Quiz History</h4>
                          {attemptsQuery?.isLoading && <p className="text-sm text-slate-500">Loading attempts...</p>}
                          {!attemptsQuery?.isLoading && orderedAttempts.length > 0 && (
                            <div className="overflow-x-auto">
                              <table className="w-full text-sm border border-slate-200 rounded-lg overflow-hidden">
                                <thead>
                                  <tr className="bg-slate-50">
                                    <th className="px-3 py-2 text-left text-xs font-semibold text-slate-600">Date</th>
                                    {descendingAttempts.map((attempt: any, idx: number) => (
                                      <th key={attempt.attemptedAt + '-header'} className="px-3 py-2 text-center text-xs font-semibold text-slate-600">
                                        {new Date(attempt.attemptedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                      </th>
                                    ))}
                                    <th className="px-3 py-2 text-center text-xs font-semibold text-slate-600 bg-green-50">Best</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  <tr>
                                    <td className="px-3 py-2 text-slate-700 font-medium">Score</td>
                                    {descendingAttempts.map((attempt: any, idx: number) => {
                                      const scoreClass = attempt.score >= 80
                                        ? 'text-green-600 bg-green-50'
                                        : attempt.score >= 40
                                          ? 'text-amber-600 bg-amber-50'
                                          : 'text-red-600 bg-red-50';
                                      return (
                                        <td key={attempt.attemptedAt + '-score'} className={`px-3 py-2 text-center font-bold ${scoreClass}`}>
                                          {attempt.score}%
                                        </td>
                                      );
                                    })}
                                    <td className="px-3 py-2 text-center font-bold text-green-600 bg-green-50">
                                      {Math.max(...orderedAttempts.map((a: any) => a.score))}%
                                    </td>
                                  </tr>
                                </tbody>
                              </table>
                            </div>
                          )}
                        </div>
                      );
                    }
                    return null;
                  })()}

                  {/* Active Quiz */}
                  {quizModuleIndex !== null && quizQuestions.length > 0 && (
                    <div className="mt-4 border-t border-slate-200 pt-4">
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="text-lg font-semibold text-slate-800">
                          Answer the Questions
                        </h4>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setQuizModuleIndex(null);
                            setQuizQuestions([]);
                          }}
                        >
                          Close Quiz
                        </Button>
                      </div>
                      <QuizForm
                        questions={quizQuestions}
                        onSubmit={handleQuizSubmit}
                      />
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Final Exam Display */}
            {showFinalExam && finalExamData && (
              <div className="rounded-2xl bg-white border border-slate-200 shadow-sm overflow-hidden">
                <div className="bg-gradient-to-r from-amber-500 to-orange-500 px-4 py-3 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-white">
                    <Trophy className="size-5" />
                    <span className="font-medium text-sm">Final Examination</span>
                  </div>
                </div>
                <div className="p-5">
                  <FinalExamForm
                    title={finalExamData.title}
                    description={finalExamData.description}
                    questions={finalExamData.questions}
                    onSubmit={handleFinalExamSubmit}
                    onCancel={handleFinalExamCancel}
                  />
                </div>
              </div>
            )}

            {/* Final Exam Results Display */}
            {finalExamResults && (
              <div className="rounded-2xl bg-white border border-slate-200 shadow-sm overflow-hidden">
                <div className="bg-gradient-to-r from-emerald-500 to-green-500 px-4 py-3 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-white">
                    <Award className="size-5" />
                    <span className="font-medium text-sm">Exam Results</span>
                  </div>
                </div>
                <div className="p-5">
                  <FinalExamResults
                    score={finalExamResults.score}
                    maxScore={finalExamResults.maxScore}
                    percentage={finalExamResults.percentage}
                    passed={finalExamResults.passed}
                    attemptNumber={finalExamResults.attemptNumber}
                    correctAnswers={finalExamResults.correctAnswers}
                    totalQuestions={finalExamResults.totalQuestions}
                    questionResults={finalExamResults.questionResults}
                    onClose={() => setFinalExamResults(null)}
                    requiresManualGrading={finalExamResults.requiresManualGrading}
                  />
                </div>
              </div>
            )}

            {/* Default State - Welcome Message */}
            {!selectedVideoUrl && !selectedDocUrl && !showFinalExam && !finalExamResults && !selectedFlashcardModule && selectedContent.type !== 'quiz' && (
              <div className="rounded-2xl bg-white border border-slate-200 p-8 text-center">
                <div className="max-w-md mx-auto">
                  <div className="size-20 rounded-2xl bg-gradient-to-br from-blue-100 to-indigo-100 mx-auto mb-4 flex items-center justify-center">
                    <PlayCircle className="size-10 text-blue-600" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-800 mb-2">Ready to Learn?</h3>
                  <p className="text-slate-500 mb-4">
                    Select a module from the left to start watching videos, reading materials, or taking quizzes.
                  </p>
                  {upNextContent && (
                    <Button
                      className="bg-[#18548b] hover:bg-[#134775]"
                      onClick={() => {
                        if (upNextContent.type === 'video') {
                          clearDocumentContent();
                          clearQuizContent();
                          setSelectedVideoUrl(upNextContent.content.url);
                        } else if (upNextContent.type === 'document') {
                          clearVideoContent();
                          clearQuizContent();
                          const doc = upNextContent.content;
                          const docUrl = doc.type === 'upload' ? doc.fileUrl : doc.url;
                          if (docUrl) handleDocPreview(docUrl, doc);
                        } else if (upNextContent.type === 'quiz') {
                          handleTakeQuiz(upNextContent.moduleIndex);
                        }
                      }}
                    >
                      <PlayCircle className="size-4 mr-2" />
                      Continue Learning
                    </Button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Voice Agent Modal */}
      <VoiceAgentModal
        isOpen={showVoiceAgentModal}
        onClose={() => setShowVoiceAgentModal(false)}
        documentUrl={baseDocUrl}
        documentTitle={selectedDocument?.title || selectedDocument?.fileName || 'Document'}
        pageNumber={currentPage}
      />
    </div>
  );
}

function CourseDetailSkeleton() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50">
      {/* Hero Skeleton */}
      <div className="bg-gradient-to-r from-slate-300 to-slate-400 animate-pulse">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <Skeleton className="h-8 w-32 mb-4 bg-white/20" />
          <div className="flex items-center justify-between">
            <div>
              <Skeleton className="h-8 w-64 mb-2 bg-white/20" />
              <Skeleton className="h-4 w-96 bg-white/20" />
            </div>
            <Skeleton className="size-[120px] rounded-full bg-white/20" />
          </div>
        </div>
      </div>

      {/* Stats Skeleton */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="grid grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-24 rounded-xl" />
            ))}
          </div>
        </div>
      </div>

      {/* Content Skeleton */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex gap-6">
          <div className="w-[380px] space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-20 rounded-xl" />
            ))}
          </div>
          <div className="flex-1">
            <Skeleton className="h-[400px] rounded-2xl" />
          </div>
        </div>
      </div>
    </div>
  );
}

// Live Classes component for each module
interface LiveClassesForModuleProps {
  courseSlug: string;
  moduleIndex: number;
}

function LiveClassesForModule({ courseSlug, moduleIndex }: LiveClassesForModuleProps) {
  // Fetch live classes for this specific module
  const { data: liveClasses = [] } = useQuery({
    queryKey: ['liveClasses', courseSlug, moduleIndex],
    queryFn: async () => {
      const token = localStorage.getItem("token");
      const url = `/api/live-classes/course/${courseSlug}/module/${moduleIndex}`;

      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!res.ok) {
        return [];
      }

      const data = await res.json();
      return data;
    },
  });

  // Function to check if live class button should be enabled
  const isLiveClassEnabled = (liveClass: any): boolean => {
    const now = Date.now();
    const startTime = new Date(liveClass.startTime).getTime();
    const endTime = new Date(liveClass.endTime).getTime();

    // Enable 30 minutes before start time
    const enableTime = startTime - (30 * 60 * 1000);
    // Disable 15 minutes after end time
    const disableTime = endTime + (15 * 60 * 1000);

    return now >= enableTime && now <= disableTime;
  };

  // Function to get live class button text
  const getLiveClassButtonText = (liveClass: any): string => {
    const now = Date.now();
    const startTime = new Date(liveClass.startTime).getTime();
    const endTime = new Date(liveClass.endTime).getTime();

    if (now < startTime) {
      const timeUntilStart = startTime - now;
      if (timeUntilStart <= 30 * 60 * 1000) { // 30 minutes or less
        return 'Join Soon';
      }
      return 'Scheduled';
    } else {
      // Always show "Join Now" for both during and after the class
      return 'Join Now';
    }
  };

  // Don't show the section if no live classes are scheduled
  if (!liveClasses || liveClasses.length === 0) {
    return null;
  }

  return (
    <div className="flex-1">
      {liveClasses.slice(0, 1).map((liveClass: any, idx: number) => {
        const isEnabled = isLiveClassEnabled(liveClass);
        const buttonText = getLiveClassButtonText(liveClass);

        return (
          <button
            key={idx}
            className={`w-full flex items-center justify-center gap-1.5 p-2 rounded-lg transition-colors ${isEnabled
                ? 'bg-orange-100 hover:bg-orange-200'
                : 'bg-slate-100 cursor-not-allowed'
              }`}
            disabled={!isEnabled}
            onClick={(e) => {
              e.stopPropagation();
              if (isEnabled && liveClass.meetLink) {
                window.open(liveClass.meetLink, '_blank');
              }
            }}
          >
            <CalendarDays className={`size-3.5 ${isEnabled ? 'text-orange-600' : 'text-slate-400'}`} />
            <span className={`text-xs font-medium ${isEnabled ? 'text-orange-700' : 'text-slate-500'}`}>
              {buttonText}
            </span>
          </button>
        );
      })}
    </div>
  );
}

// Component to show recordings for a specific module
interface RecordingsForModuleProps {
  courseSlug: string;
  moduleIndex: number;
  onRecordingClick: (recordingUrl: string) => void;
}

function RecordingsForModule({ courseSlug, moduleIndex, onRecordingClick }: RecordingsForModuleProps) {
  // Fetch recordings for this specific module
  const { data: recordings = [] } = useQuery({
    queryKey: ['recordings', courseSlug, moduleIndex],
    queryFn: async () => {
      const token = localStorage.getItem("token");
      const url = `/api/recordings/course/${courseSlug}/module/${moduleIndex}`;

      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!res.ok) {
        return [];
      }

      const data = await res.json();
      return data;
    },
  });

  // Don't show the section if no recordings are available
  if (!recordings || recordings.length === 0) {
    return null;
  }

  return (
    <div className="flex-1">
      <button
        className="w-full flex items-center justify-center gap-1.5 p-2 rounded-lg bg-red-50 hover:bg-red-100 transition-colors"
        onClick={(e) => {
          e.stopPropagation();
          if (recordings[0]?.fileUrl) {
            onRecordingClick(recordings[0].fileUrl);
          }
        }}
      >
        <Film className="size-3.5 text-red-600" />
        <span className="text-xs font-medium text-red-700">
          {recordings.length} Recording{recordings.length > 1 ? 's' : ''}
        </span>
      </button>
    </div>
  );
}

export default CourseDetail;
