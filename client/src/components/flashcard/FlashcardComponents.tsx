/**
 * Flashcard Generation Hook & Components
 * 
 * React snippets demonstrating:
 * 1. Job generation and status polling
 * 2. Flashcard display with flip animation
 * 3. Media playback with timestamp support
 * 
 * Copy these into your React app and adapt as needed.
 */

import React, { useState, useEffect, useCallback, useRef } from "react";

// =============================================================================
// TYPES
// =============================================================================

interface GenerateJobParams {
    mode: "single_module" | "course" | "all_courses";
    target: {
        module_id?: string;
        course_id?: string;
    };
    settings?: {
        regenerate?: boolean;
        card_count?: number;
    };
}

interface JobStatus {
    jobId: string;
    status: "pending" | "active" | "completed" | "failed";
    progress?: number;
    result?: {
        generated_count: number;
        verified_count: number;
        deck_id: string;
        warnings: string[];
    };
    error?: string;
}

interface Flashcard {
    card_id: string;
    question: string;
    answer: string;
    rationale?: string;
    evidence?: Array<{
        chunk_id: string;
        text: string;
        start_sec?: number;
        end_sec?: number;
        source_file?: string;
    }>;
    verified: boolean;
    confidence?: number;
    bloom_level?: string;
}

interface Deck {
    deck_id: string;
    module_id: string;
    module_title: string;
    cards: Flashcard[];
    card_count: number;
    verification_rate: number;
}

interface SignedPlayUrl {
    playUrl: string;
    start_sec: number;
    expiry_at: string;
    is_proxy: boolean;
}

// =============================================================================
// API HELPERS
// =============================================================================

const API_BASE = process.env.REACT_APP_API_BASE || "";

async function apiCall<T>(
    path: string,
    options: RequestInit = {}
): Promise<T> {
    const response = await fetch(`${API_BASE}${path}`, {
        headers: {
            "Content-Type": "application/json",
            ...options.headers,
        },
        ...options,
    });

    if (!response.ok) {
        const error = await response.json().catch(() => ({ error: "Request failed" }));
        throw new Error(error.error || `HTTP ${response.status}`);
    }

    return response.json();
}

// =============================================================================
// 1. GENERATION HOOK
// =============================================================================

/**
 * Hook for generating flashcards with status polling.
 * 
 * @example
 * const { generate, status, deck, isLoading, error, cancel } = useFlashcardGeneration();
 * 
 * // Start generation
 * await generate({ mode: "single_module", target: { module_id: "mod-123" } });
 * 
 * // Status updates automatically via polling
 * console.log(status?.progress); // 0-100
 * console.log(deck?.cards); // After completion
 */
export function useFlashcardGeneration() {
    const [jobId, setJobId] = useState<string | null>(null);
    const [status, setStatus] = useState<JobStatus | null>(null);
    const [deck, setDeck] = useState<Deck | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<Error | null>(null);

    const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
    const isMountedRef = useRef(true);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            isMountedRef.current = false;
            if (pollIntervalRef.current) {
                clearInterval(pollIntervalRef.current);
            }
        };
    }, []);

    // Poll for job status
    const pollStatus = useCallback(async (id: string) => {
        try {
            const jobStatus = await apiCall<JobStatus>(
                `/api/flashcards/orchestrator/jobs/${id}`
            );

            if (!isMountedRef.current) return;

            setStatus(jobStatus);

            // Check if done
            if (jobStatus.status === "completed") {
                clearInterval(pollIntervalRef.current!);
                pollIntervalRef.current = null;
                setIsLoading(false);

                // Fetch the deck
                if (jobStatus.result?.deck_id) {
                    const moduleId = jobStatus.result.deck_id.split("::")[0];
                    const deckData = await apiCall<Deck>(
                        `/api/modules/${moduleId}/flashcards`
                    );
                    setDeck(deckData);
                }
            } else if (jobStatus.status === "failed") {
                clearInterval(pollIntervalRef.current!);
                pollIntervalRef.current = null;
                setIsLoading(false);
                setError(new Error(jobStatus.error || "Job failed"));
            }
        } catch (err) {
            if (!isMountedRef.current) return;
            console.error("Poll failed:", err);
        }
    }, []);

    // Start generation
    const generate = useCallback(async (params: GenerateJobParams) => {
        setIsLoading(true);
        setError(null);
        setDeck(null);
        setStatus(null);

        try {
            const response = await apiCall<{ jobId: string; statusUrl: string }>(
                "/api/flashcards/orchestrator/generate",
                {
                    method: "POST",
                    body: JSON.stringify(params),
                }
            );

            setJobId(response.jobId);

            // Start polling
            pollIntervalRef.current = setInterval(() => {
                pollStatus(response.jobId);
            }, 2000); // Poll every 2 seconds

            // Initial poll
            await pollStatus(response.jobId);

        } catch (err) {
            setIsLoading(false);
            setError(err instanceof Error ? err : new Error("Generation failed"));
        }
    }, [pollStatus]);

    // Cancel polling
    const cancel = useCallback(() => {
        if (pollIntervalRef.current) {
            clearInterval(pollIntervalRef.current);
            pollIntervalRef.current = null;
        }
        setIsLoading(false);
    }, []);

    // Retry after error
    const retry = useCallback(async (params: GenerateJobParams) => {
        setError(null);
        await generate(params);
    }, [generate]);

    return {
        generate,
        status,
        deck,
        isLoading,
        error,
        cancel,
        retry,
        jobId,
    };
}

// =============================================================================
// 2. FLASHCARD COMPONENT WITH FLIP
// =============================================================================

interface FlashcardProps {
    card: Flashcard;
    onPlayEvidence?: (evidence: Flashcard["evidence"][0], card: Flashcard) => void;
}

/**
 * Flashcard component with flip animation and evidence play buttons.
 * 
 * @example
 * <FlashcardComponent
 *   card={myCard}
 *   onPlayEvidence={(ev, card) => handlePlayEvidence(ev)}
 * />
 */
export function FlashcardComponent({ card, onPlayEvidence }: FlashcardProps) {
    const [isFlipped, setIsFlipped] = useState(false);

    const handleFlip = () => {
        setIsFlipped(!isFlipped);
    };

    return (
        <div className="flashcard-container">
            <div
                className={`flashcard ${isFlipped ? "flipped" : ""}`}
                onClick={handleFlip}
            >
                {/* Front - Question */}
                <div className="flashcard-face flashcard-front">
                    <div className="flashcard-content">
                        <span className="flashcard-label">Question</span>
                        <p className="flashcard-text">{card.question}</p>

                        {/* Confidence badge */}
                        {card.confidence !== undefined && (
                            <span
                                className={`confidence-badge ${card.confidence >= 0.8 ? "high" :
                                        card.confidence >= 0.6 ? "medium" : "low"
                                    }`}
                            >
                                {Math.round(card.confidence * 100)}% confident
                            </span>
                        )}
                    </div>
                    <span className="flip-hint">Click to flip</span>
                </div>

                {/* Back - Answer */}
                <div className="flashcard-face flashcard-back">
                    <div className="flashcard-content">
                        <span className="flashcard-label">Answer</span>
                        <p className="flashcard-text">{card.answer}</p>

                        {card.rationale && (
                            <div className="flashcard-rationale">
                                <strong>Why:</strong> {card.rationale}
                            </div>
                        )}

                        {/* Evidence list with play buttons */}
                        {card.evidence && card.evidence.length > 0 && (
                            <div className="evidence-list">
                                <span className="evidence-label">Sources:</span>
                                {card.evidence.map((ev, i) => (
                                    <div key={i} className="evidence-item">
                                        <span className="evidence-text">
                                            {ev.text.substring(0, 100)}...
                                        </span>
                                        {ev.start_sec !== undefined && onPlayEvidence && (
                                            <button
                                                className="play-button"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    onPlayEvidence(ev, card);
                                                }}
                                            >
                                                ▶ {formatTime(ev.start_sec)}
                                            </button>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                    <span className="flip-hint">Click to flip back</span>
                </div>
            </div>

            {/* Verification status */}
            <div className={`verification-status ${card.verified ? "verified" : "unverified"}`}>
                {card.verified ? "✓ Verified" : "⚠ Needs Review"}
            </div>

            <style>{flashcardStyles}</style>
        </div>
    );
}

// Helper to format seconds to MM:SS
function formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
}

const flashcardStyles = `
  .flashcard-container {
    perspective: 1000px;
    margin: 16px;
  }

  .flashcard {
    width: 400px;
    height: 280px;
    position: relative;
    transform-style: preserve-3d;
    transition: transform 0.6s ease;
    cursor: pointer;
  }

  .flashcard.flipped {
    transform: rotateY(180deg);
  }

  .flashcard-face {
    position: absolute;
    width: 100%;
    height: 100%;
    backface-visibility: hidden;
    border-radius: 12px;
    padding: 20px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    display: flex;
    flex-direction: column;
  }

  .flashcard-front {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
  }

  .flashcard-back {
    background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
    color: white;
    transform: rotateY(180deg);
  }

  .flashcard-content {
    flex: 1;
    overflow-y: auto;
  }

  .flashcard-label {
    font-size: 12px;
    text-transform: uppercase;
    opacity: 0.8;
  }

  .flashcard-text {
    font-size: 18px;
    line-height: 1.5;
    margin: 12px 0;
  }

  .flip-hint {
    font-size: 12px;
    opacity: 0.6;
    text-align: center;
  }

  .confidence-badge {
    display: inline-block;
    padding: 4px 8px;
    border-radius: 12px;
    font-size: 11px;
    font-weight: bold;
  }

  .confidence-badge.high { background: rgba(0,255,0,0.3); }
  .confidence-badge.medium { background: rgba(255,200,0,0.3); }
  .confidence-badge.low { background: rgba(255,0,0,0.3); }

  .evidence-list {
    margin-top: 12px;
    font-size: 12px;
  }

  .evidence-item {
    padding: 8px;
    background: rgba(255,255,255,0.1);
    border-radius: 6px;
    margin: 4px 0;
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .play-button {
    background: rgba(255,255,255,0.2);
    border: none;
    color: white;
    padding: 4px 10px;
    border-radius: 4px;
    cursor: pointer;
    font-size: 11px;
  }

  .play-button:hover {
    background: rgba(255,255,255,0.3);
  }

  .verification-status {
    text-align: center;
    padding: 8px;
    font-size: 12px;
    margin-top: 8px;
  }

  .verification-status.verified { color: #28a745; }
  .verification-status.unverified { color: #ffc107; }
`;

// =============================================================================
// 3. MEDIA PLAYER HOOK
// =============================================================================

/**
 * Hook for playing media at a specific timestamp.
 * 
 * @example
 * const { getPlayUrl, playAtTime, videoRef } = useMediaPlayer();
 * 
 * // Get signed URL and play
 * await playAtTime({
 *   fileId: "gdrive-abc123",
 *   provider: "google_drive",
 *   startSec: 65,
 * });
 */
export function useMediaPlayer() {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<Error | null>(null);
    const videoRef = useRef<HTMLVideoElement | null>(null);

    const getPlayUrl = useCallback(async (params: {
        fileId: string;
        provider: "google_drive" | "onedrive" | "local";
        startSec?: number;
        moduleId?: string;
    }): Promise<SignedPlayUrl> => {
        const queryParams = new URLSearchParams({
            file_id: params.fileId,
            provider: params.provider,
            start: String(params.startSec || 0),
        });

        if (params.moduleId) {
            queryParams.append("module_id", params.moduleId);
        }

        return apiCall<SignedPlayUrl>(`/api/media/play?${queryParams}`);
    }, []);

    const playAtTime = useCallback(async (params: {
        fileId: string;
        provider: "google_drive" | "onedrive" | "local";
        startSec?: number;
        moduleId?: string;
    }) => {
        setIsLoading(true);
        setError(null);

        try {
            const result = await getPlayUrl(params);

            // If we have a video ref, set the source and seek
            if (videoRef.current) {
                videoRef.current.src = result.playUrl;
                videoRef.current.load();

                videoRef.current.onloadedmetadata = () => {
                    if (videoRef.current && result.start_sec > 0) {
                        videoRef.current.currentTime = result.start_sec;
                        videoRef.current.play();
                    }
                };
            } else {
                // Open in new window/tab
                window.open(result.playUrl, "_blank");
            }

            setIsLoading(false);
            return result;
        } catch (err) {
            setIsLoading(false);
            setError(err instanceof Error ? err : new Error("Failed to get play URL"));
            throw err;
        }
    }, [getPlayUrl]);

    return {
        getPlayUrl,
        playAtTime,
        videoRef,
        isLoading,
        error,
    };
}

// =============================================================================
// EXAMPLE: COMPLETE GENERATION FLOW
// =============================================================================

/**
 * Example component showing the complete generation flow.
 */
export function FlashcardGenerationDemo({ moduleId }: { moduleId: string }) {
    const {
        generate,
        status,
        deck,
        isLoading,
        error,
        cancel,
        retry,
    } = useFlashcardGeneration();

    const { playAtTime, videoRef } = useMediaPlayer();

    const handleGenerate = () => {
        generate({
            mode: "single_module",
            target: { module_id: moduleId },
            settings: { card_count: 10 },
        });
    };

    const handlePlayEvidence = async (
        evidence: Flashcard["evidence"][0],
        card: Flashcard
    ) => {
        if (!evidence.source_file || evidence.start_sec === undefined) return;

        try {
            await playAtTime({
                fileId: evidence.source_file,
                provider: "google_drive", // Adjust based on your data
                startSec: evidence.start_sec,
                moduleId,
            });
        } catch (err) {
            console.error("Failed to play evidence:", err);
        }
    };

    return (
        <div className="generation-demo">
            <h2>Flashcard Generator</h2>

            {/* Actions */}
            <div className="actions">
                <button
                    onClick={handleGenerate}
                    disabled={isLoading}
                >
                    {isLoading ? "Generating..." : "Generate Flashcards"}
                </button>

                {isLoading && (
                    <button onClick={cancel}>Cancel</button>
                )}
            </div>

            {/* Progress */}
            {status && isLoading && (
                <div className="progress">
                    <div className="progress-bar">
                        <div
                            className="progress-fill"
                            style={{ width: `${status.progress || 0}%` }}
                        />
                    </div>
                    <span>{status.status} ({status.progress || 0}%)</span>
                </div>
            )}

            {/* Error */}
            {error && (
                <div className="error">
                    <p>Error: {error.message}</p>
                    <button onClick={() => retry({
                        mode: "single_module",
                        target: { module_id: moduleId },
                    })}>
                        Retry
                    </button>
                </div>
            )}

            {/* Results */}
            {deck && (
                <div className="results">
                    <h3>{deck.module_title}</h3>
                    <p>
                        {deck.card_count} cards, {Math.round(deck.verification_rate * 100)}% verified
                    </p>

                    <div className="cards-grid">
                        {deck.cards.map((card) => (
                            <FlashcardComponent
                                key={card.card_id}
                                card={card}
                                onPlayEvidence={handlePlayEvidence}
                            />
                        ))}
                    </div>
                </div>
            )}

            {/* Hidden video player for media */}
            <video
                ref={videoRef}
                controls
                style={{ display: deck ? "block" : "none", marginTop: 20, maxWidth: "100%" }}
            />

            <style>{demoStyles}</style>
        </div>
    );
}

const demoStyles = `
  .generation-demo {
    padding: 20px;
    font-family: system-ui, sans-serif;
  }

  .actions {
    margin: 20px 0;
  }

  .actions button {
    padding: 12px 24px;
    font-size: 16px;
    margin-right: 10px;
    border: none;
    border-radius: 8px;
    cursor: pointer;
  }

  .actions button:first-child {
    background: #667eea;
    color: white;
  }

  .actions button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .progress {
    margin: 20px 0;
  }

  .progress-bar {
    height: 20px;
    background: #eee;
    border-radius: 10px;
    overflow: hidden;
  }

  .progress-fill {
    height: 100%;
    background: linear-gradient(90deg, #667eea, #764ba2);
    transition: width 0.3s ease;
  }

  .error {
    background: #fee;
    color: #c00;
    padding: 16px;
    border-radius: 8px;
    margin: 20px 0;
  }

  .cards-grid {
    display: flex;
    flex-wrap: wrap;
    gap: 20px;
    margin-top: 20px;
  }
`;

// =============================================================================
// EXPORTS
// =============================================================================

export default FlashcardGenerationDemo;
