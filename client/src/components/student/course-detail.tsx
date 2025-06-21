// Convert Google Drive share URL into an embeddable preview URL
function toGooglePreviewUrl(url: string) {
  const match = url.match(/\/d\/([^\/]+)/);
  if (match) {
    const id = match[1];
    // Presentation (Slides)
    if (url.includes('/presentation/')) {
      return `https://docs.google.com/presentation/d/${id}/preview`;
    }
    // Document (Docs)
    if (url.includes('/document/')) {
      return `https://docs.google.com/document/d/${id}/preview`;
    }
    // Spreadsheet (Sheets)
    if (url.includes('/spreadsheets/')) {
      return `https://docs.google.com/spreadsheets/d/${id}/preview`;
    }
  }
  return url;
}

import { useQuery, useQueries } from "@tanstack/react-query";
import { useQueryClient } from "@tanstack/react-query";
import throttle from "lodash/throttle";
import { useEffect, useState, useRef } from "react";
import ReactPlayer from "react-player";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ProgressRing } from "@/components/ui/progress-ring";
import {
  ArrowLeft,
  BookOpen,
  Check,
  ChevronRight,
  ChevronDown,
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
  const completedCount = modulesArray.filter(m => m.isCompleted).length;
  const totalModules = modulesArray.length;
  const completedModulesCount = modulesArray.filter(m => m.isCompleted).length;
  // Use the fetched course’s slug for quiz requests
  const courseSlug = course?.slug;
  // Per-module quiz attempts queries (move hooks out of render loop)
  const attemptsQueries = useQueries({
    queries: modulesArray.map((m, idx) => ({
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
      const attempts = q.data?.attempts ?? [];
      return attempts.length > 0
        ? Math.max(...attempts.map(a => a.score))
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
  const currentModuleIndex = course?.modules.findIndex(m => !m.isCompleted) ?? -1;

  const [selectedVideoUrl, setSelectedVideoUrl] = useState<string | null>(null);
  const [selectedDocUrl, setSelectedDocUrl] = useState<string | null>(null);
  const [selectedVideoIndex, setSelectedVideoIndex] = useState<number>(0);
  const lastSentRef = useRef<number>(0);

  // Media container ref for scrolling into view
  const mediaRef = useRef<HTMLDivElement>(null);

  // Quiz state and handlers
  const [quizModuleIndex, setQuizModuleIndex] = useState<number | null>(null);
  const [quizQuestions, setQuizQuestions] = useState<any[]>([]);

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
    queryClient.invalidateQueries(['studentDashboard']);
    // Removed automatic modal close so student can review results
  };

  const [expanded, setExpanded] = useState<boolean[]>([]);
  useEffect(() => {
    if (course?.modules) {
      setExpanded(course.modules.map(() => true));
    }
  }, [course]);

  useEffect(() => {
    if ((selectedVideoUrl || selectedDocUrl) && mediaRef.current) {
      mediaRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [selectedVideoUrl, selectedDocUrl]);

  
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
    queryClient.invalidateQueries(['studentDashboard']);
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
    queryClient.invalidateQueries(['studentDashboard']);
    // convert to embeddable URL for iframe
    const embedUrl = toGooglePreviewUrl(docUrl);
    setSelectedDocUrl(embedUrl);
  };
  
  return (
    <div className="p-4 md:p-6">
      {selectedVideoUrl && (
        <div ref={mediaRef} className="mb-6 relative pt-[56.25%]"> {/* 16:9 */}
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
            }}
          />
        </div>
      )}
      {selectedDocUrl && (
        <div ref={mediaRef} className="mb-6">
          <iframe
            src={selectedDocUrl}
            className="border w-full h-[60vh] md:h-[70vh]"
            allow="fullscreen"
          />
        </div>
      )}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
        <div>
          <Link href="/student/courses">
            <Button variant="outline" size="sm" className="mb-2">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Courses
            </Button>
          </Link>
          <h1 className="text-2xl font-bold text-gray-800">{course?.title}</h1>
          {course?.description && (
            <p className="mt-1 text-gray-600">{course.description}</p>
          )}
        </div>
      </div>
      
      {/* Progress Overview */}
      <Card className="mb-6">
        <div className="px-5 py-4 border-b border-gray-200">
          <h2 className="font-inter text-lg font-medium text-gray-800">Course Progress</h2>
        </div>
        <CardContent className="p-5">
          <div className="flex flex-col md:flex-row items-start">
            <div className="w-full md:w-1/4 mb-4 md:mb-0 flex justify-center">
              <ProgressRing value={course?.progress ?? 0} size={144} />
            </div>
            <div className="w-full md:w-3/4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-gray-500">Modules Completed</p>
                  <p className="text-lg font-semibold text-gray-800">
                    {completedCount} of {totalModules} modules
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {(course?.progress ?? 0) < 100 
                      ? "Keep going! You're making great progress."
                      : "Congratulations! You've completed all modules."}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Overall Progress</p>
                  <p className="text-lg font-semibold text-gray-800">{watchTime?.total}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    You've watched {(course?.progress ?? 0) ? Math.round(course.progress) : 0}% of course content.
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Quiz Performance</p>
                  {quizPerformance !== null ? (
                    <>
                      <p className="text-lg font-semibold text-gray-800">
                        {quizPerformance}% average score
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        Your Best Score from Each attempt is used to calculate this average.
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        Based on {bestScores.length} completed {bestScores.length > 1 ? 'quizzes' : 'quiz'}.
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        Calculation: (
                        {bestScores.map((s, i) => (
                          <span key={i}>
                            {s}%{i < bestScores.length - 1 ? ' + ' : ''}
                          </span>
                        ))}
                        ) / {bestScores.length} = {quizPerformance}%
                      </p>
                    </>
                  ) : (
                    <p className="text-lg font-semibold text-gray-800">
                      No quizzes attempted yet
                    </p>
                  )}
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Course Valid Until</p>
                  <p className="text-lg font-semibold text-gray-800">
                    {formatDate(course?.enrollment.validUntil)}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {course?.enrollment?.validUntil
                      ? `You have access for ${Math.ceil(
                          (new Date(course.enrollment.validUntil).getTime() - new Date().getTime()) /
                          (1000 * 60 * 60 * 24 * 30)
                        )} more months.`
                      : ""}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Modules List */}
      <Card>
        <div className="px-5 py-4 border-b border-gray-200">
          <h2 className="font-inter text-lg font-medium text-gray-800">Course Modules</h2>
        </div>
        <div className="divide-y divide-gray-200">
          {course?.modules.map((module, index) => {
            // Use pre-fetched attemptsQueries result for this module
            const { data: attemptsDataModule, isLoading: attemptsLoadingModule, error: attemptsErrorModule }
              = attemptsQueries[index] ?? {};
            const moduleAttempts = (attemptsDataModule?.attempts ?? [])
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
            return (
              <div key={index} className={`p-5 ${module.isLocked ? 'opacity-60' : ''} ${index === 2 ? 'bg-primary-50' : ''}`}>
                <div className="flex items-start">
                  <div className="flex-shrink-0 mt-1">
                    <span className={`flex items-center justify-center h-8 w-8 rounded-full ${
                      module.isCompleted 
                        ? 'bg-green-500 text-white' 
                        : module.isLocked 
                          ? 'bg-gray-300 text-white'
                          : 'bg-primary text-white'
                    }`}>
                      {module.isCompleted ? (
                        <Check className="h-5 w-5" />
                      ) : module.isLocked ? (
                        <Lock className="h-5 w-5" />
                      ) : (
                        <Play className="h-5 w-5" />
                      )}
                    </span>
                  </div>
                  <div className="ml-4 flex-1">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setExpanded(prev => {
                              const next = [...prev];
                              next[index] = !next[index];
                              return next;
                            });
                          }}
                        >
                          {expanded[index] ? <ChevronDown /> : <ChevronRight />}
                        </Button>
                        <h3 className="text-lg font-medium text-gray-800 ml-2">{module.title}</h3>
                      </div>
                      <div className="mt-2 md:mt-0">
                        {module.isCompleted && (
                          <span className="inline-flex items-center px-2 py-1 text-xs font-medium rounded bg-green-100 text-green-800">
                            <Check className="h-3 w-3 mr-1" />
                            Completed
                          </span>
                        )}
                      </div>
                    </div>
                    <p className="text-gray-500 text-sm mt-1">
                      {module.isCompleted
                        ? `Completed on ${formatDate(module.completedAt)}`
                        : module.isLocked
                          ? `Locked - Complete previous module to unlock`
                          : `In progress - ${module.percentComplete}% complete`}
                    </p>
                    
                    {expanded[index] && (
                      module.isLocked
                        ? (
                          <p className="mt-4 text-gray-500 italic">
                            Locked - Complete previous module to unlock
                          </p>
                        ) : (
                          <>
                            {/* Progress bar */}
                            <div className="mt-2">
                              <div className="w-full h-2 bg-gray-200 rounded-full">
                                <div
                                  className="h-full bg-primary rounded-full"
                                  style={{ width: `${module.percentComplete}%` }}
                                />
                              </div>
                            </div>
                            {/* Resources tiles */}
                            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-6">
                              {/* Videos Section */}
                              <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-lg">
                                <h5 className="text-lg font-semibold text-blue-800 mb-3">Videos</h5>
                                <div className="space-y-2 max-h-40 overflow-y-auto">
                                  {module.videos.map((video, vidIdx) => (
                                    <div key={vidIdx} className="flex justify-between items-center bg-white p-3 rounded-md shadow-sm">
                                      <span className="text-gray-800 truncate">{video.title ?? `Video ${vidIdx + 1}`}</span>
                                      <Button
                                        onClick={() => {
                                          setSelectedVideoUrl(video.url);
                                          setSelectedVideoIndex(vidIdx);
                                          lastSentRef.current = 0;
                                        }}
                                      >
                                        Continue
                                      </Button>
                                    </div>
                                  ))}
                                </div>
                              </div>
                              {/* Documents Section */}
                              <div className="bg-gradient-to-br from-green-50 to-green-100 p-4 rounded-lg">
                                <h5 className="text-lg font-semibold text-green-800 mb-3">Reading Materials</h5>
                                <div className="space-y-2 max-h-40 overflow-y-auto">
                                  {module.documents.map((doc, docIdx) => (
                                    <div key={docIdx} className="flex justify-between items-center bg-white p-3 rounded-md shadow-sm">
                                      <span className="text-gray-800 truncate">{doc.title ?? `Document ${docIdx + 1}`}</span>
                                      <Button onClick={() => handleDocPreview(doc.url)}>
                                        Preview
                                      </Button>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </div>
                            {/* Quiz Section */}
                            <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-4 rounded-lg mt-4">
                              <div className="flex items-center justify-between mb-3">
                                <h5 className="text-lg font-semibold text-purple-800 m-0">Quiz</h5>
                                <Button onClick={() => handleTakeQuiz(index)}>
                                  {module.lastQuizScore !== null ? 'Retake Quiz' : 'Take Quiz'}
                                </Button>
                              </div>
                              <div className="overflow-x-auto">
                                {module.isLocked ? (
                                  <p>Locked – complete previous module to unlock</p>
                                ) : module.percentComplete < 65 ? (
                                  <p className="text-gray-600">
                                    Reach at least 65 % progress in this module to unlock the quiz.
                                  </p>
                                ) : (
                                  <>
                                    {attemptsLoadingModule && <p className="text-sm text-gray-500">Loading recent attempts...</p>}
                                    {attemptsErrorModule && <p className="text-sm text-red-500">Error loading attempts.</p>}
                                    {!attemptsLoadingModule && orderedAttempts.length > 0 && (
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
                                                    {`Your Last 5 Quiz Scores For Module ${index + 1}: ${module.title}`}
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
                                                    const totalQuestions = course.modules[index].questions.length;
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
                                                    const totalQuestions = course.modules[index].questions.length;
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
                                  </>
                                )}
                              </div>
                            </div>
                          </>
                        )
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </Card>
      {/* Quiz Modal/Form */}
      {quizModuleIndex !== null && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
          onClick={() => setQuizModuleIndex(null)}
        >
          <div
            className="bg-white rounded-lg p-6 max-w-2xl w-full relative"
            onClick={e => e.stopPropagation()}
          >
            <button
              onClick={() => setQuizModuleIndex(null)}
              className="absolute top-2 right-2 text-gray-500 hover:text-gray-700"
            >
              &#x2715;
            </button>
            <QuizForm
              questions={quizQuestions}
              onSubmit={handleQuizSubmit}
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
          <div className="flex flex-col md:flex-row items-start">
            <div className="w-full md:w-1/4 mb-4 md:mb-0 flex justify-center">
              <Skeleton className="h-36 w-36 rounded-full" />
            </div>
            <div className="w-full md:w-3/4">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i}>
                    <Skeleton className="h-4 w-32 mb-2" />
                    <Skeleton className="h-6 w-40 mb-1" />
                    <Skeleton className="h-3 w-48" />
                  </div>
                ))}
              </div>
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
