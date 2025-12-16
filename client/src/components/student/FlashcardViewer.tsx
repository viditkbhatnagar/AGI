import { useState, useEffect, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
    ChevronLeft,
    ChevronRight,
    Check,
    X,
    Brain,
    Sparkles,
    Loader2,
    AlertCircle,
    FileText,
    Cpu,
    Lightbulb,
    Target,
    BookOpen,
    Zap
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";

interface Flashcard {
    card_id: string;
    front: string;
    back: string;
    type: "concept" | "application" | "scenario";
    difficulty: "easy" | "medium" | "hard";
    tags: string[];
    review_required: boolean;
    confidence_score?: number;
}

interface FlashcardDeck {
    deck_id: string;
    module_id: string;
    course_id: string;
    cards: Flashcard[];
    stats: {
        total_generated: number;
        last_updated: string;
    };
}

interface FlashcardViewerProps {
    moduleIndex: number;
    courseSlug: string;
    onClose?: () => void;
}

export function FlashcardViewer({ moduleIndex, courseSlug, onClose }: FlashcardViewerProps) {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isFlipped, setIsFlipped] = useState(false);
    const [sessionStats, setSessionStats] = useState({
        correct: 0,
        incorrect: 0,
        total: 0
    });

    const queryClient = useQueryClient();

    // Construct the module ID used by the backend
    // Note: This matches the logic in server/services/flashcard/contentFetcher.ts
    const moduleId = `${courseSlug}::modules::${moduleIndex}`;

    // Fetch flashcards
    const { data: deck, isLoading, error } = useQuery<FlashcardDeck | null>({
        queryKey: ['flashcards', courseSlug, moduleIndex],
        queryFn: async () => {
            const token = localStorage.getItem('token');
            const headers: Record<string, string> = {};
            if (token) {
                headers['Authorization'] = `Bearer ${token}`;
            }
            
            const res = await fetch(`/api/modules/${encodeURIComponent(moduleId)}/flashcards`, {
                credentials: "include",
                headers,
            });
            
            // Return null for 404 (no flashcards yet) - this shows the "Generate" button
            if (res.status === 404) {
                return null;
            }
            
            if (!res.ok) {
                throw new Error("Failed to fetch flashcards");
            }
            
            return res.json();
        },
        // Don't refetch too often
        staleTime: 1000 * 60 * 5,
    });

    // State for generation error and progress
    const [generationError, setGenerationError] = useState<string | null>(null);
    const [generationStep, setGenerationStep] = useState(0);
    const [generationMessage, setGenerationMessage] = useState("");

    // Generation steps for the animated UI
    const generationSteps = [
        { icon: FileText, label: "Scanning Documents", message: "Reading through your module materials..." },
        { icon: BookOpen, label: "Extracting Content", message: "Extracting key information from PDFs..." },
        { icon: Cpu, label: "AI Analysis", message: "GPT-5 is analyzing the core concepts..." },
        { icon: Lightbulb, label: "Identifying Topics", message: "Finding the most important interview topics..." },
        { icon: Target, label: "Crafting Questions", message: "Creating high-quality interview questions..." },
        { icon: Zap, label: "Finalizing", message: "Preparing your personalized flashcards..." },
    ];

    // Simulate progress through steps
    const simulateProgress = useCallback(() => {
        let step = 0;
        const interval = setInterval(() => {
            if (step < generationSteps.length - 1) {
                step++;
                setGenerationStep(step);
                setGenerationMessage(generationSteps[step].message);
            }
        }, 8000); // Change step every 8 seconds
        return () => clearInterval(interval);
    }, []);

    // Generate flashcards mutation
    const generateMutation = useMutation({
        mutationFn: async () => {
            setGenerationError(null);
            setGenerationStep(0);
            setGenerationMessage(generationSteps[0].message);
            
            // Start progress simulation
            const cleanup = simulateProgress();
            
            // Use fetch directly with timeout
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 300000); // 5 minute timeout
            
            try {
                const token = localStorage.getItem('token');
                const headers: Record<string, string> = {
                    'Content-Type': 'application/json',
                };
                if (token) {
                    headers['Authorization'] = `Bearer ${token}`;
                }
                
                const res = await fetch("/api/flashcards/generate-from-module", {
                    method: "POST",
                    headers,
                    body: JSON.stringify({
                        moduleIndex: moduleIndex,
                        courseSlug: courseSlug
                    }),
                    credentials: "include",
                    signal: controller.signal,
                });
                
                clearTimeout(timeoutId);
                cleanup();
                
                if (!res.ok) {
                    const err = await res.json().catch(() => ({ message: "Failed to generate flashcards" }));
                    throw new Error(err.message || "Failed to generate flashcards");
                }
                return res.json();
            } catch (error) {
                clearTimeout(timeoutId);
                cleanup();
                if (error instanceof Error && error.name === 'AbortError') {
                    throw new Error("Generation timed out. Please try again.");
                }
                throw error;
            }
        },
        onSuccess: () => {
            setGenerationStep(generationSteps.length);
            queryClient.invalidateQueries({ queryKey: ['flashcards', courseSlug, moduleIndex] });
        },
        onError: (error: Error) => {
            console.error("Flashcard generation failed:", error);
            setGenerationError(error.message || "Failed to generate flashcards");
        }
    });

    // Reset state when deck changes
    useEffect(() => {
        setCurrentIndex(0);
        setIsFlipped(false);
        setSessionStats({ correct: 0, incorrect: 0, total: 0 });
    }, [deck]);

    // Handle keyboard navigation
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === " " || e.key === "Enter") {
                e.preventDefault();
                setIsFlipped(prev => !prev);
            } else if (e.key === "ArrowLeft") {
                handlePrev();
            } else if (e.key === "ArrowRight") {
                handleNext();
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [deck, currentIndex]);

    const handleNext = () => {
        if (!deck?.cards) return;
        setIsFlipped(false);
        setCurrentIndex(prev => (prev + 1) % deck.cards.length);
    };

    const handlePrev = () => {
        if (!deck?.cards) return;
        setIsFlipped(false);
        setCurrentIndex(prev => (prev - 1 + deck.cards.length) % deck.cards.length);
    };

    const handleRate = (correct: boolean) => {
        setSessionStats(prev => ({
            ...prev,
            correct: prev.correct + (correct ? 1 : 0),
            incorrect: prev.incorrect + (correct ? 0 : 1),
            total: prev.total + 1
        }));
        handleNext();
    };

    // Poll for updates if deck is missing but we just generated?
    // We'll leave that for a more advanced implementation

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center h-full p-12">
                <Loader2 className="h-12 w-12 text-indigo-600 animate-spin mb-4" />
                <p className="text-gray-600 font-medium">Loading flashcards...</p>
            </div>
        );
    }

    // Show error only for actual errors (not 404/no data)
    if (error && deck !== null) {
        return (
            <div className="flex flex-col items-center justify-center h-full p-12">
                <Alert variant="destructive" className="max-w-md">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                        Could not load flashcards. Please try again later.
                    </AlertDescription>
                </Alert>
            </div>
        );
    }

    // Show "No Flashcards Yet" UI if deck is null or empty (including 404 response)
    if (!deck || !deck.cards || deck.cards.length === 0) {
        // Show enhanced generation progress UI when generating
        if (generateMutation.isPending) {
            const CurrentIcon = generationSteps[generationStep]?.icon || Loader2;
            const progressPercent = ((generationStep + 1) / generationSteps.length) * 100;
            
            return (
                <div className="flex flex-col items-center justify-center p-8 text-center h-full min-h-[500px] bg-gradient-to-br from-indigo-50 via-white to-purple-50">
                    {/* Animated Brain Icon */}
                    <div className="relative mb-8">
                        <div className="h-24 w-24 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center shadow-lg animate-pulse">
                            <Brain className="h-12 w-12 text-white" />
                        </div>
                        <div className="absolute -top-2 -right-2 h-8 w-8 bg-yellow-400 rounded-full flex items-center justify-center shadow-md animate-bounce">
                            <Sparkles className="h-4 w-4 text-yellow-800" />
                        </div>
                    </div>

                    {/* Main Title */}
                    <h3 className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent mb-2">
                        Creating Your Flashcards
                    </h3>
                    <p className="text-gray-500 max-w-md mb-8">
                        Our AI is analyzing your module content to create personalized interview preparation cards
                    </p>

                    {/* Progress Steps */}
                    <div className="w-full max-w-md mb-8">
                        <div className="flex justify-between mb-2">
                            {generationSteps.map((step, idx) => {
                                const StepIcon = step.icon;
                                const isActive = idx === generationStep;
                                const isComplete = idx < generationStep;
                                return (
                                    <div 
                                        key={idx} 
                                        className={`flex flex-col items-center transition-all duration-500 ${
                                            isActive ? 'scale-110' : isComplete ? 'opacity-60' : 'opacity-30'
                                        }`}
                                    >
                                        <div className={`h-10 w-10 rounded-full flex items-center justify-center mb-1 transition-all duration-500 ${
                                            isActive 
                                                ? 'bg-indigo-600 text-white shadow-lg ring-4 ring-indigo-200' 
                                                : isComplete 
                                                    ? 'bg-green-500 text-white' 
                                                    : 'bg-gray-200 text-gray-400'
                                        }`}>
                                            {isComplete ? (
                                                <Check className="h-5 w-5" />
                                            ) : isActive ? (
                                                <StepIcon className="h-5 w-5 animate-pulse" />
                                            ) : (
                                                <StepIcon className="h-5 w-5" />
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                        
                        {/* Progress Bar */}
                        <Progress value={progressPercent} className="h-2 bg-gray-200" />
                    </div>

                    {/* Current Step Info */}
                    <div className="bg-white rounded-xl shadow-lg p-6 max-w-md w-full border border-indigo-100">
                        <div className="flex items-center mb-3">
                            <div className="h-10 w-10 bg-indigo-100 rounded-lg flex items-center justify-center mr-3">
                                <CurrentIcon className="h-5 w-5 text-indigo-600 animate-pulse" />
                            </div>
                            <div className="text-left">
                                <p className="font-semibold text-gray-800">
                                    {generationSteps[generationStep]?.label || "Processing..."}
                                </p>
                                <p className="text-sm text-gray-500">
                                    Step {generationStep + 1} of {generationSteps.length}
                                </p>
                            </div>
                        </div>
                        <p className="text-gray-600 text-sm italic">
                            "{generationMessage || generationSteps[0].message}"
                        </p>
                    </div>

                    {/* Fun Facts */}
                    <div className="mt-6 text-xs text-gray-400 max-w-sm">
                        <p className="flex items-center justify-center">
                            <Lightbulb className="h-3 w-3 mr-1 text-yellow-500" />
                            Did you know? Our AI analyzes real interview patterns to create the most relevant questions.
                        </p>
                    </div>
                </div>
            );
        }

        // Default "No Flashcards" UI
        return (
            <div className="flex flex-col items-center justify-center p-12 text-center h-full bg-gradient-to-br from-gray-50 to-indigo-50">
                <div className="relative mb-6">
                    <div className="h-20 w-20 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-full flex items-center justify-center">
                        <Brain className="h-10 w-10 text-indigo-600" />
                    </div>
                    <div className="absolute -bottom-1 -right-1 h-8 w-8 bg-indigo-600 rounded-full flex items-center justify-center">
                        <Sparkles className="h-4 w-4 text-white" />
                    </div>
                </div>
                
                <h3 className="text-2xl font-bold text-gray-900 mb-2">Ready to Ace Your Interview?</h3>
                <p className="text-gray-500 max-w-md mb-4">
                    Generate AI-powered flashcards tailored to help you master the key concepts and crush your next interview.
                </p>
                
                {/* Features */}
                <div className="flex flex-wrap justify-center gap-3 mb-8 max-w-md">
                    <Badge variant="secondary" className="bg-green-100 text-green-700 border-green-200">
                        <Target className="h-3 w-3 mr-1" /> Interview-Focused
                    </Badge>
                    <Badge variant="secondary" className="bg-blue-100 text-blue-700 border-blue-200">
                        <BookOpen className="h-3 w-3 mr-1" /> From Your Materials
                    </Badge>
                    <Badge variant="secondary" className="bg-purple-100 text-purple-700 border-purple-200">
                        <Cpu className="h-3 w-3 mr-1" /> GPT-4 Powered
                    </Badge>
                </div>

                {generationError && (
                    <Alert variant="destructive" className="max-w-md mb-4">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>{generationError}</AlertDescription>
                    </Alert>
                )}

                <Button
                    onClick={() => generateMutation.mutate()}
                    disabled={generateMutation.isPending}
                    size="lg"
                    className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
                >
                    <Sparkles className="mr-2 h-5 w-5" />
                    Generate Interview Flashcards
                </Button>
                
                <p className="text-xs text-gray-400 mt-4 flex items-center">
                    <Zap className="h-3 w-3 mr-1 text-yellow-500" />
                    Takes about 1 minute to analyze and create personalized cards
                </p>
            </div>
        );
    }

    const currentCard = deck.cards[currentIndex];
    const progress = ((currentIndex + 1) / deck.cards.length) * 100;

    return (
        <div className="flex flex-col h-full w-full max-w-5xl mx-auto p-4 md:p-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h2 className="text-2xl font-bold text-gray-800 flex items-center">
                        <Brain className="h-6 w-6 mr-2 text-indigo-600" />
                        Flashcards
                    </h2>
                    <p className="text-sm text-gray-500 mt-1">
                        Card {currentIndex + 1} of {deck.cards.length}
                    </p>
                </div>

                <div className="flex items-center space-x-4">
                    <div className="text-right hidden sm:block">
                        <p className="text-xs font-medium text-gray-500">SESSION SCORE</p>
                        <p className="text-sm font-bold text-gray-800">
                            {sessionStats.total > 0
                                ? `${Math.round((sessionStats.correct / sessionStats.total) * 100)}%`
                                : "NA"}
                        </p>
                    </div>
                    {onClose && (
                        <Button variant="ghost" size="icon" onClick={onClose}>
                            <X className="h-5 w-5" />
                        </Button>
                    )}
                </div>
            </div>

            {/* Progress Bar */}
            <div className="mb-6">
                <Progress value={progress} className="h-2 bg-gray-100" />
            </div>

            {/* Flashcard Area */}
            <div className="flex-1 flex flex-col justify-center min-h-[300px]">
                <div
                    className="relative w-full aspect-[16/10] md:aspect-[2/1] perspective-1000 cursor-pointer group"
                    onClick={() => setIsFlipped(!isFlipped)}
                >
                    <div
                        className={`
              relative w-full h-full transition-all duration-500 transform-style-3d shadow-xl rounded-2xl
              ${isFlipped ? "rotate-y-180" : ""}
            `}
                    >
                        {/* Front of Card */}
                        <div className="absolute w-full h-full backface-hidden bg-white border-2 border-indigo-50 rounded-2xl p-8 flex flex-col items-center justify-center text-center hover:border-indigo-200 transition-colors">
                            <Badge
                                variant="outline"
                                className={`mb-6 ${currentCard.difficulty === 'easy' ? 'bg-green-50 text-green-700 border-green-200' :
                                        currentCard.difficulty === 'medium' ? 'bg-yellow-50 text-yellow-700 border-yellow-200' :
                                            'bg-red-50 text-red-700 border-red-200'
                                    }`}
                            >
                                {currentCard.type.toUpperCase()} • {currentCard.difficulty.toUpperCase()}
                            </Badge>
                            <h3 className="text-xl md:text-3xl font-medium text-gray-800 leading-relaxed max-w-3xl">
                                {currentCard.front}
                            </h3>
                            <p className="absolute bottom-6 text-sm text-gray-400 font-medium animate-pulse">
                                Click or Press Space to Flip
                            </p>
                        </div>

                        {/* Back of Card */}
                        <div className="absolute w-full h-full backface-hidden rotate-y-180 bg-indigo-50 border-2 border-indigo-200 rounded-2xl p-8 flex flex-col items-center justify-center text-center">
                            <h3 className="text-lg md:text-2xl font-medium text-gray-800 leading-relaxed max-w-3xl">
                                {currentCard.back}
                            </h3>
                        </div>
                    </div>
                </div>
            </div>

            {/* Controls */}
            <div className="mt-8 flex items-center justify-between max-w-2xl mx-auto w-full">
                <Button
                    variant="ghost"
                    size="lg"
                    onClick={(e) => { e.stopPropagation(); handlePrev(); }}
                    className="text-gray-500 hover:text-gray-700"
                >
                    <ChevronLeft className="h-6 w-6 mr-1" />
                    Prev
                </Button>

                {isFlipped ? (
                    <div className="flex items-center space-x-4 animate-in fade-in slide-in-from-bottom-4 duration-300">
                        <Button
                            size="lg"
                            onClick={(e) => { e.stopPropagation(); handleRate(false); }}
                            className="bg-red-100 hover:bg-red-200 text-red-700 border-transparent px-8"
                        >
                            <X className="h-5 w-5 mr-2" />
                            Incorrect
                        </Button>
                        <Button
                            size="lg"
                            onClick={(e) => { e.stopPropagation(); handleRate(true); }}
                            className="bg-green-100 hover:bg-green-200 text-green-700 border-transparent px-8"
                        >
                            <Check className="h-5 w-5 mr-2" />
                            Correct
                        </Button>
                    </div>
                ) : (
                    <div className="w-40" /> /* Spacer to keep Prev/Next aligned */
                )}

                <Button
                    variant="ghost"
                    size="lg"
                    onClick={(e) => { e.stopPropagation(); handleNext(); }}
                    className="text-gray-500 hover:text-gray-700"
                >
                    Next
                    <ChevronRight className="h-6 w-6 ml-1" />
                </Button>
            </div>

            <style dangerouslySetInnerHTML={{
                __html: `
        .perspective-1000 {
          perspective: 1000px;
        }
        .transform-style-3d {
          transform-style: preserve-3d;
        }
        .backface-hidden {
          backface-visibility: hidden;
        }
        .rotate-y-180 {
          transform: rotateY(180deg);
        }
      `}} />
        </div>
    );
}
