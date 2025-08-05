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
      return `https://docs.google.com/spreadsheets/d/${id}/preview?rm=minimal&gid=${page-1}`;
    }
  }
  
  // For PDFs and other document types, try to add page parameter
  if (url.toLowerCase().includes('.pdf')) {
    return url + (url.includes('?') ? '&' : '?') + `page=${page}`;
  }
  
  return url;
}

// Detect document type and estimate pages
function getDocumentTypeAndPages(url: string): { type: 'slides' | 'document' | 'spreadsheet' | 'pdf', estimatedPages: number } {
  if (url.includes('/presentation/')) {
    return { type: 'slides', estimatedPages: 10 }; // Default estimate for slides
  }
  if (url.includes('/document/')) {
    return { type: 'document', estimatedPages: 5 }; // Default estimate for docs
  }
  if (url.includes('/spreadsheets/')) {
    return { type: 'spreadsheet', estimatedPages: 3 }; // Default estimate for sheets
  }
  if (url.toLowerCase().includes('.pdf')) {
    return { type: 'pdf', estimatedPages: 10 }; // Default estimate for PDFs
  }
  return { type: 'document', estimatedPages: 1 };
}

import { useQuery, useQueries } from "@tanstack/react-query";
import { useQueryClient } from "@tanstack/react-query";
import throttle from "lodash/throttle";
import { useEffect, useState, useRef } from "react";
import ReactPlayer from "react-player";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import {
  ArrowLeft,
  BookOpen,
  Check,
  ChevronRight,
  ChevronDown,
  ChevronLeft,
  Clock,
  FileText,
  Lock,
  Play,
  Video,
  ArrowUp,
  ArrowDown
} from "lucide-react";
import { Link } from "wouter";
import { Badge } from "@/components/ui/badge";
import { formatDate, formatDateTime, formatWatchTime } from "@/lib/utils";
import { useParams } from "wouter";

import QuizForm from "@/components/student/QuizForm";
import FinalExamForm from "@/components/student/FinalExamForm";
import FinalExamResults from "@/components/student/FinalExamResults";

interface CourseDetailProps {
  slug: string;
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

  // const courseProgress = totalModules > 0
  // ? Math.round((completedModulesCount / totalModules) * 100)
  // : 0;

  // Determine which module is the current one (first not completed)
  const currentModuleIndex = course?.modules.findIndex((m: any) => !m.isCompleted) ?? -1;

  const [selectedVideoUrl, setSelectedVideoUrl] = useState<string | null>(null);
  const [selectedDocUrl, setSelectedDocUrl] = useState<string | null>(null);
  const [selectedVideoIndex, setSelectedVideoIndex] = useState<number>(0);
  const lastSentRef = useRef<number>(0);
  
  // Document navigation state
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [currentDocType, setCurrentDocType] = useState<'slides' | 'document' | 'spreadsheet' | 'pdf' | null>(null);
  const [baseDocUrl, setBaseDocUrl] = useState<string>('');
  const [isDocLoading, setIsDocLoading] = useState<boolean>(false);

  // Media container ref for scrolling into view
  const mediaRef = useRef<HTMLDivElement>(null);

  // Quiz state and handlers
  const [quizModuleIndex, setQuizModuleIndex] = useState<number | null>(null);
  const [quizQuestions, setQuizQuestions] = useState<any[]>([]);

  // Final Exam state and handlers
  const [showFinalExam, setShowFinalExam] = useState(false);
  const [finalExamData, setFinalExamData] = useState<any>(null);
  const [finalExamResults, setFinalExamResults] = useState<any>(null);

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
      return;
    }
    const { questions } = await res.json();
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
  const handleTakeFinalExam = async () => {
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
  };

  const handleFinalExamSubmit = async (answers: number[]) => {
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
  }, [showFinalExam, finalExamData]);

  const [expanded, setExpanded] = useState<boolean[]>([]);
  // State for active tab
  const [activeTab, setActiveTab] = useState<'modules' | 'resources'>('modules');
  const [selectedContent, setSelectedContent] = useState<{
    type: 'video' | 'document' | 'quiz' | null;
    moduleIndex?: number;
    contentIndex?: number;
    content?: any;
  }>({ type: null });

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
      <div className="p-6">
        <div className="mb-6">
          <Link href="/student/courses">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Courses
            </Button>
          </Link>
        </div>
        <Card>
          <CardContent className="p-6">
            <p className="text-red-500">Error loading course data. Please try again later.</p>
          </CardContent>
        </Card>
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

  const handleDocPreview = async (docUrl: string) => {
    const token = localStorage.getItem("token");
    if (!token) return;
    
    // Detect document type and set up navigation
    const { type, estimatedPages } = getDocumentTypeAndPages(docUrl);
    setCurrentDocType(type);
    setTotalPages(estimatedPages);
    setCurrentPage(1);
    setBaseDocUrl(docUrl);
    
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
    // convert to embeddable URL for iframe with page 1
    const embedUrl = toGooglePreviewUrl(docUrl, 1);
    setSelectedDocUrl(embedUrl);
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
      const embedUrl = toGooglePreviewUrl(baseDocUrl, page);
      // Force refresh the iframe by adding a timestamp parameter
      const urlWithTimestamp = embedUrl + (embedUrl.includes('?') ? '&' : '?') + `t=${Date.now()}`;
      setSelectedDocUrl(urlWithTimestamp);
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
    setSelectedVideoIndex(0);
    lastSentRef.current = 0;
    setCurrentPage(1);
    setTotalPages(1);
    setCurrentDocType(null);
    setBaseDocUrl('');
    setIsDocLoading(false);
    setQuizModuleIndex(null);
    setQuizQuestions([]);
  };

  // Helper function to clear document content only
  const clearDocumentContent = () => {
    setSelectedDocUrl(null);
    setCurrentPage(1);
    setTotalPages(1);
    setCurrentDocType(null);
    setBaseDocUrl('');
    setIsDocLoading(false);
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
  
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <Link href="/student/courses">
              <Button variant="outline" size="sm" className="mr-4">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Courses
              </Button>
            </Link>
            <h1 className="text-2xl font-bold text-gray-800">{course?.title || 'My Course'}</h1>
          </div>
        </div>
      </div>

      {/* Course Progress Tab */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="space-y-3">
          {/* Progress Bar */}
          <div className="w-full">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-bold text-gray-700">Course Progress</span>
              <span className="text-sm font-semibold text-blue-600">{(course?.progress ?? 0) ? Math.round(course.progress) : 0}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all duration-300 ease-in-out"
                style={{ width: `${course?.progress ?? 0}%` }}
              ></div>
            </div>
          </div>
          
          {/* Data Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-2">
            {/* Modules Completed */}
            <div className="text-center">
              <p className="text-sm font-medium text-gray-500 mb-1">Modules Completed</p>
              <p className="text-xl font-bold text-gray-800">
                {completedCount} / {totalModules}
              </p>
              <p className="text-xs text-gray-600">
                {(course?.progress ?? 0) < 100 ? "In Progress" : "Completed"}
              </p>
            </div>
            
            {/* Overall Progress */}
            <div className="text-center">
              <p className="text-sm font-medium text-gray-500 mb-1">Content Watched</p>
              <p className="text-xl font-bold text-blue-600">
                {(course?.progress ?? 0) ? Math.round(course.progress) : 0}%
              </p>
              <p className="text-xs text-gray-600">
                Total Progress
              </p>
            </div>
            
            {/* Quiz Performance */}
            <div className="text-center">
              <p className="text-sm font-medium text-gray-500 mb-1">Quiz Average</p>
              {quizPerformance !== null ? (
                <>
                  <p className="text-xl font-bold text-green-600">
                    {quizPerformance}%
                  </p>
                  <p className="text-xs text-gray-600">
                    {bestScores.length} quiz{bestScores.length > 1 ? 'es' : ''} taken
                  </p>
                </>
              ) : (
                <>
                  <p className="text-xl font-bold text-gray-400">
                    --
                  </p>
                  <p className="text-xs text-gray-600">
                    No quizzes yet
                  </p>
                </>
              )}
            </div>
            
            {/* Course Valid Until */}
            <div className="text-center">
              <p className="text-sm font-medium text-gray-500 mb-1">Valid Until</p>
              <p className="text-lg font-bold text-gray-800">
                {new Date(course?.enrollment?.validUntil || '').toLocaleDateString('en-US', { 
                  month: 'short', 
                  day: 'numeric', 
                  year: 'numeric' 
                })}
              </p>
              <p className="text-xs text-gray-600">
                {course?.enrollment?.validUntil
                  ? `${Math.ceil(
                      (new Date(course.enrollment.validUntil).getTime() - new Date().getTime()) /
                      (1000 * 60 * 60 * 24 * 30)
                    )} months left`
                  : "No expiry"}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Layout */}
      <div className="flex h-[calc(100vh-160px)] overflow-hidden">
        {/* Left Sidebar - Content Navigator */}
        <div className="w-80 bg-white border-r border-gray-200 flex flex-col h-full">
          <div className="p-4 border-b border-gray-200 flex-shrink-0">
            <h2 className="text-lg font-semibold text-gray-800">Content Navigator</h2>
          </div>
          
          <div className="flex-1 overflow-y-auto overflow-x-hidden">
            {course?.modules.map((module: any, moduleIndex: number) => {
              // Calculate video progress based on actual watch time or completion status
              const videoProgress = module.videos && module.videos.length > 0 
                ? Math.round((module.videos.filter((v: any) => v.watched || v.completed || v.isCompleted).length / module.videos.length) * 100)
                : 0;
              
              // Calculate document progress based on viewing status
              const documentsProgress = module.documents && module.documents.length > 0
                ? Math.round((module.documents.filter((d: any) => d.viewed || d.completed || d.isCompleted).length / module.documents.length) * 100)
                : 0;
                
              // Use module's overall progress as fallback for videos if no individual tracking
              const videoProgressFallback = module.videos && module.videos.length > 0 && videoProgress === 0
                ? Math.min(100, Math.round(module.percentComplete || 0))
                : Math.min(100, videoProgress);
                
              // Quiz progress based on attempts or completion
              const quizProgress = module.quizAttempts > 0 || module.lastQuizScore !== null ? 100 : 0;

              return (
                <div key={moduleIndex} className="border-b border-gray-100">
                  <div className="p-4">
                    <div 
                      className="flex items-center cursor-pointer"
                      onClick={() => {
                        // Clear any open content when switching modules
                        clearAllContent();
                        
                        setExpanded(prev => {
                          const next = [...prev];
                          next[moduleIndex] = !next[moduleIndex];
                          return next;
                        });
                      }}
                    >
                      {expanded[moduleIndex] ? (
                        <ChevronDown className="h-4 w-4 mr-2 text-gray-500" />
                      ) : (
                        <ChevronRight className="h-4 w-4 mr-2 text-gray-500" />
                      )}
                      <h3 className="font-medium text-gray-800">{module.title}</h3>
                    </div>
                    
                    {expanded[moduleIndex] && (
                      <div className="mt-3 ml-6 space-y-2">
                        {/* Video Section */}
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <div className="flex items-center justify-between py-2 cursor-pointer hover:bg-gray-50 rounded px-2">
                              <div className="flex items-center">
                                <Video className="h-4 w-4 mr-2 text-blue-600" />
                                <span className="text-sm text-gray-700">VIDEO</span>
                                <ChevronDown className="h-3 w-3 ml-1 text-gray-400" />
                              </div>
                              <span className="text-sm text-gray-500">{videoProgressFallback}%</span>
                            </div>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent className="w-64" align="start">
                            {module.videos && module.videos.length > 0 ? (
                              module.videos.map((video: any, vidIdx: number) => (
                                <DropdownMenuItem
                                  key={vidIdx}
                                  className="cursor-pointer"
                                  onClick={() => {
                                    // Clear document and quiz when playing video
                                    clearDocumentContent();
                                    clearQuizContent();
                                    
                                    // Set video
                                    setSelectedVideoUrl(video.url);
                                    setSelectedVideoIndex(vidIdx);
                                    lastSentRef.current = 0;
                                  }}
                                >
                                  <div className="flex items-center justify-between w-full">
                                    <div className="flex items-center">
                                      <Play className="h-4 w-4 mr-2 text-blue-600" />
                                      <span className="text-sm">{video.title || `Video ${vidIdx + 1}`}</span>
                                    </div>
                                    {video.watched && (
                                      <Check className="h-3 w-3 text-green-600" />
                                    )}
                                  </div>
                                </DropdownMenuItem>
                              ))
                            ) : (
                              <DropdownMenuItem disabled>
                                <span className="text-sm text-gray-500">No videos available</span>
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                        
                        {/* Reading Materials Section */}
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <div className="flex items-center justify-between py-2 cursor-pointer hover:bg-gray-50 rounded px-2">
                              <div className="flex items-center">
                                <FileText className="h-4 w-4 mr-2 text-green-600" />
                                <span className="text-sm text-gray-700">READING MATERIALS</span>
                                <ChevronDown className="h-3 w-3 ml-1 text-gray-400" />
                              </div>
                            </div>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent className="w-64" align="start">
                            {module.documents && module.documents.length > 0 ? (
                              module.documents.map((doc: any, docIdx: number) => (
                                <DropdownMenuItem
                                  key={docIdx}
                                  className="cursor-pointer"
                                  onClick={() => {
                                    // Clear video and quiz when opening document
                                    clearVideoContent();
                                    clearQuizContent();
                                    
                                    // Open document
                                    handleDocPreview(doc.url);
                                  }}
                                >
                                  <div className="flex items-center justify-between w-full">
                                    <div className="flex items-center">
                                      <FileText className="h-4 w-4 mr-2 text-green-600" />
                                      <span className="text-sm">{doc.title || `Document ${docIdx + 1}`}</span>
                                    </div>
                                    {doc.viewed && (
                                      <Check className="h-3 w-3 text-green-600" />
                                    )}
                                  </div>
                                </DropdownMenuItem>
                              ))
                            ) : (
                              <DropdownMenuItem disabled>
                                <span className="text-sm text-gray-500">No reading materials available</span>
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                        
                        {/* Quizzes Section */}
                        <div 
                          className="flex items-center justify-between py-2 cursor-pointer hover:bg-gray-50 rounded px-2"
                          onClick={() => {
                            if (module.percentComplete >= 65) {
                              // Clear video and document when opening quiz
                              clearVideoContent();
                              clearDocumentContent();
                              
                              setSelectedContent({
                                type: 'quiz',
                                moduleIndex,
                                content: module
                              });
                            }
                          }}
                        >
                          <div className="flex items-center">
                            <BookOpen className="h-4 w-4 mr-2 text-purple-600" />
                            <span className="text-sm text-gray-700">QUIZZES</span>
                          </div>
                          <span className="text-sm text-gray-500">{quizProgress}%</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Content Area */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden h-full">
          {/* Content Display Area */}
          <div className="p-6 min-h-full">
            {/* Media Player Area */}
            {selectedVideoUrl && (
              <div ref={mediaRef} className="mb-6 relative pt-[56.25%]">
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
                    // Refresh progress when video ends
                    queryClient.invalidateQueries({ queryKey: ['courseDetail', slug] });
                  }}
                />
              </div>
            )}
            
            {selectedDocUrl && (
              <div ref={mediaRef} className="mb-6">
                {/* Document Header */}
                <div className="bg-white border border-gray-200 rounded-t-lg p-4 flex items-center justify-between">
                  <div className="flex items-center">
                    <span className="text-sm text-gray-600 font-medium">Reading Material</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSelectedDocUrl(null);
                      setCurrentPage(1);
                      setTotalPages(1);
                      setCurrentDocType(null);
                      setBaseDocUrl('');
                      setIsDocLoading(false);
                    }}
                  >
                    ✕
                  </Button>
                </div>
                {/* Document Viewer */}
                <div className="relative">
                  {isDocLoading && (
                    <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center z-10 border-l border-r border-b border-gray-200 rounded-b-lg">
                      <div className="text-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                        <p className="text-sm text-gray-600">Loading document...</p>
                      </div>
                    </div>
                  )}
                  <iframe
                    src={selectedDocUrl}
                    className="border-l border-r border-b border-gray-200 rounded-b-lg w-full h-[60vh] md:h-[70vh]"
                    allow="fullscreen"
                    onLoad={() => setIsDocLoading(false)}
                  />
                </div>
              </div>
            )}



            {selectedContent.type === 'quiz' && selectedContent.content && (
              <Card className="mb-6">
                <div className="px-5 py-4 border-b border-gray-200">
                  <h3 className="text-lg font-medium text-gray-800">{selectedContent.content?.title || `Module ${(selectedContent.moduleIndex || 0) + 1}`} Quiz</h3>
                </div>
                <CardContent className="p-5">
                  <div className="p-4 bg-purple-50 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <BookOpen className="h-5 w-5 mr-3 text-purple-600" />
                        <span className="text-gray-800">Module Quiz</span>
                      </div>
                      <Button
                        onClick={() => handleTakeQuiz(selectedContent.moduleIndex || 0)}
                        disabled={selectedContent.content.percentComplete < 65}
                      >
                        {selectedContent.content.lastQuizScore !== null ? 'Retake Quiz' : 'Take Quiz'}
                      </Button>
                    </div>
                    {selectedContent.content.percentComplete < 65 && (
                      <p className="text-sm text-gray-600 mt-2">
                        Reach at least 65% progress in this module to unlock the quiz.
                      </p>
                    )}
                  </div>
                  
                  {/* Quiz Scores Table */}
                  {(() => {
                    const moduleIndex = selectedContent.moduleIndex || 0;
                    const moduleTitle = selectedContent.content.title;
                    const attemptsQuery = attemptsQueries[moduleIndex];
                    const moduleAttempts = ((attemptsQuery?.data as any)?.attempts ?? [])
                      .slice()
                      .sort((a: any, b: any) =>
                        new Date(b.attemptedAt).getTime() - new Date(a.attemptedAt).getTime()
                      );
                    
                    // Sort attempts freshest first
                    const descendingAttempts = moduleAttempts.slice().sort(
                      (a: any, b: any) => new Date(b.attemptedAt).getTime() - new Date(a.attemptedAt).getTime()
                    );
                    
                    // Reverse so oldest attempt is first, newest last
                    const orderedAttempts = moduleAttempts.slice().reverse();

                    if (moduleAttempts && moduleAttempts.length > 0) {
                      return (
                        <div className="mt-6">
                          {attemptsQuery?.isLoading && <p className="text-sm text-gray-500">Loading recent attempts...</p>}
                          {!attemptsQuery?.isLoading && orderedAttempts.length > 0 && (
                            <>
                              {(() => {
                                // Compute best score for this module's attempts (for use in table)
                                const bestScore = orderedAttempts.length
                                  ? Math.max(...orderedAttempts.map((a: any) => a.score))
                                  : 0;
                                return (
                                  <table className="w-full text-sm text-left border border-gray-200 table-auto bg-gray-50">
                                    <thead>
                                      <tr>
                                        <th
                                          colSpan={descendingAttempts.length + 2}
                                          className="bg-gray-200 px-2 py-2 text-gray-1000 font-bold text-center"
                                        >
                                          {`Your Last 5 Quiz Scores For ${moduleTitle}`}
                                        </th>
                                      </tr>
                                      <tr>
                                        <th className="border-t border-gray-200 px-2 py-1 font-medium text-center">Date</th>
                                        {descendingAttempts.map((attempt: any, idx: number) => (
                                          <th
                                            key={attempt.attemptedAt + '-date-header'}
                                            className="border-t border-l border-gray-200 px-2 py-1 font-medium text-center"
                                          >
                                            {new Date(attempt.attemptedAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}, {new Date(attempt.attemptedAt).toLocaleDateString([], { month: 'long', day: 'numeric', year: 'numeric' })}
                                          </th>
                                        ))}
                                        <th className="border-t border-l border-gray-200 px-2 py-1 font-medium text-center">
                                          Your Best
                                        </th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      <tr className="border-t border-gray-200">
                                        <td className="border-t border-gray-200 px-2 py-1 text-center font-medium">Scores</td>
                                        {descendingAttempts.map((attempt: any, idx: number) => {
                                          const totalQuestions = course.modules[moduleIndex].questions.length;
                                          const correctCount = Math.round((attempt.score / 100) * totalQuestions);
                                          const scoreClass = attempt.score >= 80
                                            ? 'text-green-600'
                                            : attempt.score >= 40
                                              ? 'text-yellow-600'
                                              : 'text-red-600';
                                          return (
                                            <td
                                              key={attempt.attemptedAt + '-score'}
                                              className={`border-l border-gray-200 px-2 py-1 text-center font-bold ${scoreClass}`}
                                            >
                                              {attempt.score}% ({correctCount} of {totalQuestions})
                                              {idx === 0 && (
                                                <strong className="text-gray-800 block mt-1">Your last score</strong>
                                              )}
                                              {(() => {
                                                // No delta for the very newest score (first column)
                                                if (idx === 0) return null;

                                                // If this is the oldest score shown (right‑most column) there's nothing earlier to compare with
                                                if (idx === descendingAttempts.length - 1) return null;

                                                // Compare this attempt with the one that was taken immediately before it (the cell to the right)
                                                const referenceScore = descendingAttempts[idx + 1].score;
                                                const currentScore = attempt.score;
                                                const diff = currentScore - referenceScore;

                                                // Show explicit "No change" text when the scores are identical
                                                if (diff === 0) {
                                                  return (
                                                    <div className="text-xs text-gray-500 mt-1">
                                                      No change
                                                    </div>
                                                  );
                                                }

                                                const isUp = diff > 0;
                                                const Icon = isUp ? ArrowUp : ArrowDown;
                                                const colorClass = isUp ? 'text-green-600' : 'text-red-600';

                                                return (
                                                  <div className={`text-xs ${colorClass} flex items-center justify-center mt-1`}>
                                                    <Icon className="inline-block h-4 w-4" />
                                                    <span className="ml-1">
                                                      {Math.abs(diff)}% {isUp ? 'higher' : 'lower'} than last time
                                                    </span>
                                                  </div>
                                                );
                                              })()}
                                              {idx === descendingAttempts.length - 1 && (
                                                <div className="text-xs text-gray-500 mt-1">
                                                  Considering this as threshold
                                                </div>
                                              )}
                                            </td>
                                          );
                                        })}
                                        {(() => {
                                          // Compute best attempt object and best date string
                                          const bestAttempt = orderedAttempts.reduce(
                                            (prev: any, curr: any) => curr.score > prev.score ? curr : prev,
                                            orderedAttempts[0]
                                          );
                                          const bestScore = orderedAttempts.length
                                            ? Math.max(...orderedAttempts.map((a: any) => a.score))
                                            : 0;
                                          const totalQuestions = course.modules[moduleIndex].questions.length;
                                          const correctCount = Math.round((bestScore / 100) * totalQuestions);
                                          const scoreClass = bestScore >= 80
                                            ? 'text-green-600'
                                            : bestScore >= 40
                                              ? 'text-yellow-600'
                                              : 'text-red-600';
                                          let bestDateStr = '';
                                          if (bestAttempt && bestAttempt.attemptedAt) {
                                            const bestDate = new Date(bestAttempt.attemptedAt);
                                            bestDateStr = `${bestDate.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}, ${bestDate.toLocaleDateString([], { month: 'long', day: 'numeric', year: 'numeric' })}`;
                                          }
                                          return (
                                            <td className={`border-l border-gray-200 px-2 py-1 text-center font-bold ${scoreClass}`}>
                                              <div className={`font-bold ${scoreClass}`}>
                                                {bestScore}% ({correctCount} of {totalQuestions})
                                              </div>
                                              <strong><div className="text-sm font-bold text-gray-900 mt-1">
                                                Scored On - {bestDateStr}
                                              </div>
                                              </strong>
                                            </td>
                                          );
                                        })()}
                                      </tr>
                                    </tbody>
                                  </table>
                                );
                              })()}
                            </>
                          )}
                        </div>
                      );
                    }
                    return null;
                  })()}
                  
                  {/* Inline Quiz Display */}
                  {quizModuleIndex !== null && quizQuestions.length > 0 && (
                    <div className="mt-6 border-t border-gray-200 pt-6">
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="text-lg font-semibold text-gray-800">
                          {selectedContent.content?.title || `Module ${(selectedContent.moduleIndex || 0) + 1}`} Quiz
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
                      <div className="quiz-container">
                        <QuizForm
                          questions={quizQuestions}
                          onSubmit={handleQuizSubmit}
                        />
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Default Content - Updates and Announcements */}
            {!selectedContent.type && !selectedVideoUrl && !selectedDocUrl && (
              <div className="grid grid-cols-1 lg:grid-cols-1 gap-6">
                {/* Updates */}
                <Card>
                  <div className="px-5 py-4 border-b border-gray-200">
                    <h3 className="text-lg font-medium text-gray-800">Updates</h3>
                  </div>
                  <CardContent className="p-5">
                    <p className="text-gray-600">There are no current updates for {course?.title || 'My Course'}</p>
                  </CardContent>
                </Card>

                {/* Announcements */}
                {/* <Card>
                  <div className="px-5 py-4 border-b border-gray-200">
                    <h3 className="text-lg font-medium text-gray-800">Announcements</h3>
                  </div>
                  <CardContent className="p-5">
                    <div className="space-y-4">
                      <div>
                        <h4 className="text-lg font-semibold text-gray-800 mb-2">Welcome Derek!</h4>
                        <p className="text-sm text-gray-500 mb-2">Posted Oct 7, 2020 4:38 PM</p>
                        <p className="text-gray-600 mb-2">
                          This course features videos, reading materials, and quizzes to help you learn at your own pace.
                        </p>
                        <p className="text-gray-600">Enjoy!</p>
                      </div>
                    </div>
                  </CardContent>
                </Card> */}
              </div>
            )}
          </div>
        </div>
      </div>



      {/* Final Exam Modal */}
      {showFinalExam && finalExamData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-6xl max-h-[95vh] overflow-y-auto">
            <FinalExamForm
              title={finalExamData.title}
              description={finalExamData.description}
              questions={finalExamData.questions}
              passingScore={finalExamData.passingScore}
              remainingAttempts={finalExamData.remainingAttempts}
              onSubmit={handleFinalExamSubmit}
              onCancel={handleFinalExamCancel}
            />
          </div>
        </div>
      )}

      {/* Final Exam Results Modal */}
      {finalExamResults && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-6xl max-h-[95vh] overflow-y-auto p-6">
            <FinalExamResults
              score={finalExamResults.score}
              maxScore={finalExamResults.maxScore}
              percentage={finalExamResults.percentage}
              passed={finalExamResults.passed}
              passingScore={finalExamResults.passingScore}
              attemptNumber={finalExamResults.attemptNumber}
              remainingAttempts={finalExamResults.remainingAttempts}
              correctAnswers={finalExamResults.correctAnswers}
              totalQuestions={finalExamResults.totalQuestions}
              questionResults={finalExamResults.questionResults}
              onClose={() => setFinalExamResults(null)}
              onRetry={finalExamResults.remainingAttempts > 0 ? () => {
                setFinalExamResults(null);
                setShowFinalExam(true);
              } : undefined}
            />
          </div>
        </div>
      )}
    </div>
  );
}

function CourseDetailSkeleton() {
  return (
    <div className="p-4 md:p-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
        <div>
          <Skeleton className="h-9 w-32 mb-2" />
          <Skeleton className="h-8 w-64" />
        </div>
      </div>
      
      <Card className="mb-6">
        <div className="px-5 py-4 border-b border-gray-200">
          <Skeleton className="h-6 w-40" />
        </div>
        <CardContent className="p-5">
          <div className="space-y-3">
            {/* Progress Bar Skeleton */}
            <div className="w-full">
              <div className="flex items-center justify-between mb-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-12" />
              </div>
              <Skeleton className="w-full h-2 rounded-full" />
            </div>
            
            {/* Data Grid Skeleton */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-2">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="text-center">
                  <Skeleton className="h-4 w-24 mx-auto mb-2" />
                  <Skeleton className="h-6 w-16 mx-auto mb-1" />
                  <Skeleton className="h-3 w-20 mx-auto" />
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <div className="px-5 py-4 border-b border-gray-200">
          <Skeleton className="h-6 w-40" />
        </div>
        <div className="divide-y divide-gray-200">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="p-5">
              <div className="flex items-start">
                <Skeleton className="h-8 w-8 rounded-full" />
                <div className="ml-4 flex-1">
                  <div className="flex flex-col md:flex-row justify-between">
                    <div className="w-full md:w-2/3">
                      <Skeleton className="h-6 w-48 mb-2" />
                      <Skeleton className="h-4 w-64 mb-4" />
                    </div>
                    <Skeleton className="h-9 w-28 mt-2 md:mt-0" />
                  </div>
                  <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-2">
                    {[1, 2, 3].map((j) => (
                      <Skeleton key={j} className="h-5 w-28" />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

export default CourseDetail;