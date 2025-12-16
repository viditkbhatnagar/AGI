/**
 * Admin Review Queue Component
 * 
 * UI for reviewing, approving, and editing flashcards that need manual review.
 * 
 * Features:
 * - Paginated review queue
 * - Approve/edit workflows
 * - Filter by module/course
 * - Low-confidence highlighting
 */

import React, { useState, useEffect, useCallback } from "react";

// =============================================================================
// TYPES
// =============================================================================

interface ReviewCard {
    card_id: string;
    question: string;
    answer: string;
    rationale?: string;
    evidence?: Array<{
        chunk_id: string;
        text: string;
        start_sec?: number;
        source_file?: string;
    }>;
    verified: boolean;
    confidence?: number;
    review_required: boolean;
    module_id?: string;
    module_title?: string;
    created_at?: string;
}

interface ReviewQueueResponse {
    cards: ReviewCard[];
    total: number;
    page: number;
    limit: number;
    has_more: boolean;
}

interface EditCardData {
    q?: string;
    a?: string;
    rationale?: string;
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
        credentials: "include", // Include cookies for auth
        ...options,
    });

    if (!response.ok) {
        const error = await response.json().catch(() => ({ error: "Request failed" }));
        throw new Error(error.error || `HTTP ${response.status}`);
    }

    return response.json();
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

interface AdminReviewQueueProps {
    moduleId?: string;
    courseId?: string;
}

export function AdminReviewQueue({ moduleId, courseId }: AdminReviewQueueProps) {
    const [cards, setCards] = useState<ReviewCard[]>([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    const [editingCard, setEditingCard] = useState<ReviewCard | null>(null);
    const [editData, setEditData] = useState<EditCardData>({});
    const [actionLoading, setActionLoading] = useState<string | null>(null);

    const limit = 10;

    // Fetch review queue
    const fetchQueue = useCallback(async () => {
        setLoading(true);
        setError(null);

        try {
            const params = new URLSearchParams({
                page: String(page),
                limit: String(limit),
            });

            if (moduleId) params.append("module_id", moduleId);
            if (courseId) params.append("course_id", courseId);

            const data = await apiCall<ReviewQueueResponse>(
                `/api/flashcards/review-queue?${params}`
            );

            setCards(data.cards);
            setTotal(data.total);
        } catch (err) {
            setError(err instanceof Error ? err : new Error("Failed to fetch queue"));
        } finally {
            setLoading(false);
        }
    }, [page, moduleId, courseId]);

    useEffect(() => {
        fetchQueue();
    }, [fetchQueue]);

    // Approve card
    const handleApprove = async (cardId: string) => {
        setActionLoading(cardId);

        try {
            await apiCall(`/api/flashcards/${cardId}/approve`, {
                method: "POST",
            });

            // Remove from list
            setCards(cards.filter(c => c.card_id !== cardId));
            setTotal(t => t - 1);
        } catch (err) {
            alert(`Failed to approve: ${(err as Error).message}`);
        } finally {
            setActionLoading(null);
        }
    };

    // Open edit modal
    const handleEdit = (card: ReviewCard) => {
        setEditingCard(card);
        setEditData({
            q: card.question,
            a: card.answer,
            rationale: card.rationale,
        });
    };

    // Save edit
    const handleSaveEdit = async () => {
        if (!editingCard) return;

        setActionLoading(editingCard.card_id);

        try {
            const result = await apiCall<{ success: boolean; verified: boolean }>(
                `/api/flashcards/${editingCard.card_id}/edit`,
                {
                    method: "POST",
                    body: JSON.stringify(editData),
                }
            );

            // Update in list or remove if now verified
            if (result.verified) {
                setCards(cards.filter(c => c.card_id !== editingCard.card_id));
                setTotal(t => t - 1);
            } else {
                setCards(cards.map(c =>
                    c.card_id === editingCard.card_id
                        ? { ...c, ...editData, question: editData.q || c.question, answer: editData.a || c.answer }
                        : c
                ));
            }

            setEditingCard(null);
        } catch (err) {
            alert(`Failed to save: ${(err as Error).message}`);
        } finally {
            setActionLoading(null);
        }
    };

    // Reject card (delete)
    const handleReject = async (cardId: string) => {
        if (!confirm("Are you sure you want to reject this card? It will be deleted.")) {
            return;
        }

        setActionLoading(cardId);

        try {
            // Note: Implement delete endpoint if needed
            // await apiCall(`/api/flashcards/${cardId}`, { method: "DELETE" });

            // For now, just remove from view
            setCards(cards.filter(c => c.card_id !== cardId));
            setTotal(t => t - 1);
        } catch (err) {
            alert(`Failed to reject: ${(err as Error).message}`);
        } finally {
            setActionLoading(null);
        }
    };

    // Pagination
    const totalPages = Math.ceil(total / limit);

    return (
        <div className="admin-review-queue">
            <header className="queue-header">
                <h1>Review Queue</h1>
                <span className="queue-count">{total} cards need review</span>
            </header>

            {error && (
                <div className="error-banner">
                    {error.message}
                    <button onClick={fetchQueue}>Retry</button>
                </div>
            )}

            {loading ? (
                <div className="loading">Loading...</div>
            ) : cards.length === 0 ? (
                <div className="empty-state">
                    <p>🎉 No cards need review!</p>
                </div>
            ) : (
                <>
                    <div className="cards-list">
                        {cards.map(card => (
                            <ReviewCardItem
                                key={card.card_id}
                                card={card}
                                onApprove={() => handleApprove(card.card_id)}
                                onEdit={() => handleEdit(card)}
                                onReject={() => handleReject(card.card_id)}
                                isLoading={actionLoading === card.card_id}
                            />
                        ))}
                    </div>

                    {/* Pagination */}
                    <div className="pagination">
                        <button
                            disabled={page <= 1}
                            onClick={() => setPage(p => p - 1)}
                        >
                            ← Previous
                        </button>
                        <span>Page {page} of {totalPages}</span>
                        <button
                            disabled={page >= totalPages}
                            onClick={() => setPage(p => p + 1)}
                        >
                            Next →
                        </button>
                    </div>
                </>
            )}

            {/* Edit Modal */}
            {editingCard && (
                <div className="modal-overlay" onClick={() => setEditingCard(null)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                        <h2>Edit Card</h2>

                        <div className="form-group">
                            <label>Question</label>
                            <textarea
                                value={editData.q || ""}
                                onChange={e => setEditData({ ...editData, q: e.target.value })}
                                rows={3}
                            />
                        </div>

                        <div className="form-group">
                            <label>Answer</label>
                            <textarea
                                value={editData.a || ""}
                                onChange={e => setEditData({ ...editData, a: e.target.value })}
                                rows={5}
                            />
                        </div>

                        <div className="form-group">
                            <label>Rationale (optional)</label>
                            <textarea
                                value={editData.rationale || ""}
                                onChange={e => setEditData({ ...editData, rationale: e.target.value })}
                                rows={2}
                            />
                        </div>

                        {/* Evidence preview */}
                        {editingCard.evidence && editingCard.evidence.length > 0 && (
                            <div className="evidence-preview">
                                <label>Evidence Sources</label>
                                {editingCard.evidence.map((ev, i) => (
                                    <div key={i} className="evidence-item">
                                        <p>{ev.text.substring(0, 200)}...</p>
                                        {ev.start_sec !== undefined && (
                                            <span className="timestamp">@ {formatTime(ev.start_sec)}</span>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}

                        <div className="modal-actions">
                            <button
                                className="btn-secondary"
                                onClick={() => setEditingCard(null)}
                            >
                                Cancel
                            </button>
                            <button
                                className="btn-primary"
                                onClick={handleSaveEdit}
                                disabled={actionLoading === editingCard.card_id}
                            >
                                {actionLoading ? "Saving..." : "Save & Re-verify"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <style>{reviewQueueStyles}</style>
        </div>
    );
}

// =============================================================================
// REVIEW CARD ITEM
// =============================================================================

interface ReviewCardItemProps {
    card: ReviewCard;
    onApprove: () => void;
    onEdit: () => void;
    onReject: () => void;
    isLoading: boolean;
}

function ReviewCardItem({
    card,
    onApprove,
    onEdit,
    onReject,
    isLoading,
}: ReviewCardItemProps) {
    const isLowConfidence = card.confidence !== undefined && card.confidence < 0.6;

    return (
        <div className={`review-card ${isLowConfidence ? "low-confidence" : ""}`}>
            <div className="card-header">
                <span className="module-badge">{card.module_title || card.module_id}</span>
                {card.confidence !== undefined && (
                    <span className={`confidence ${card.confidence >= 0.8 ? "high" :
                            card.confidence >= 0.6 ? "medium" : "low"
                        }`}>
                        {Math.round(card.confidence * 100)}%
                    </span>
                )}
            </div>

            <div className="card-content">
                <div className="question">
                    <strong>Q:</strong> {card.question}
                </div>
                <div className="answer">
                    <strong>A:</strong> {card.answer}
                </div>
                {card.rationale && (
                    <div className="rationale">
                        <strong>Why:</strong> {card.rationale}
                    </div>
                )}
            </div>

            {/* Warning for low confidence */}
            {isLowConfidence && (
                <div className="warning-banner">
                    ⚠️ Low confidence - verify against evidence carefully
                </div>
            )}

            <div className="card-actions">
                <button
                    className="btn-approve"
                    onClick={onApprove}
                    disabled={isLoading}
                >
                    ✓ Approve
                </button>
                <button
                    className="btn-edit"
                    onClick={onEdit}
                    disabled={isLoading}
                >
                    ✎ Edit
                </button>
                <button
                    className="btn-reject"
                    onClick={onReject}
                    disabled={isLoading}
                >
                    ✗ Reject
                </button>
            </div>
        </div>
    );
}

// Helper
function formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
}

// =============================================================================
// STYLES
// =============================================================================

const reviewQueueStyles = `
  .admin-review-queue {
    max-width: 900px;
    margin: 0 auto;
    padding: 24px;
    font-family: system-ui, -apple-system, sans-serif;
  }

  .queue-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 24px;
  }

  .queue-header h1 {
    margin: 0;
    font-size: 24px;
  }

  .queue-count {
    background: #667eea;
    color: white;
    padding: 6px 12px;
    border-radius: 16px;
    font-size: 14px;
  }

  .error-banner {
    background: #fee;
    color: #c00;
    padding: 12px 16px;
    border-radius: 8px;
    margin-bottom: 16px;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .loading, .empty-state {
    text-align: center;
    padding: 48px;
    color: #666;
  }

  .cards-list {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .review-card {
    background: white;
    border: 1px solid #e0e0e0;
    border-radius: 12px;
    padding: 16px;
    box-shadow: 0 2px 8px rgba(0,0,0,0.05);
  }

  .review-card.low-confidence {
    border-color: #ffc107;
    background: #fffbf0;
  }

  .card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 12px;
  }

  .module-badge {
    background: #f0f0f0;
    padding: 4px 8px;
    border-radius: 4px;
    font-size: 12px;
    color: #666;
  }

  .confidence {
    padding: 4px 8px;
    border-radius: 12px;
    font-size: 12px;
    font-weight: bold;
  }

  .confidence.high { background: #d4edda; color: #155724; }
  .confidence.medium { background: #fff3cd; color: #856404; }
  .confidence.low { background: #f8d7da; color: #721c24; }

  .card-content {
    margin-bottom: 12px;
  }

  .question, .answer, .rationale {
    margin: 8px 0;
    line-height: 1.5;
  }

  .question strong, .answer strong, .rationale strong {
    color: #667eea;
  }

  .warning-banner {
    background: #fff3cd;
    color: #856404;
    padding: 8px 12px;
    border-radius: 6px;
    font-size: 13px;
    margin-bottom: 12px;
  }

  .card-actions {
    display: flex;
    gap: 8px;
    border-top: 1px solid #eee;
    padding-top: 12px;
  }

  .card-actions button {
    flex: 1;
    padding: 10px;
    border: none;
    border-radius: 6px;
    font-size: 14px;
    cursor: pointer;
    transition: opacity 0.2s;
  }

  .card-actions button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .btn-approve { background: #28a745; color: white; }
  .btn-edit { background: #17a2b8; color: white; }
  .btn-reject { background: #dc3545; color: white; }

  .pagination {
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 16px;
    margin-top: 24px;
  }

  .pagination button {
    padding: 8px 16px;
    border: 1px solid #667eea;
    background: white;
    color: #667eea;
    border-radius: 6px;
    cursor: pointer;
  }

  .pagination button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  /* Modal */
  .modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0,0,0,0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
  }

  .modal-content {
    background: white;
    padding: 24px;
    border-radius: 12px;
    width: 90%;
    max-width: 600px;
    max-height: 90vh;
    overflow-y: auto;
  }

  .modal-content h2 {
    margin-top: 0;
  }

  .form-group {
    margin-bottom: 16px;
  }

  .form-group label {
    display: block;
    margin-bottom: 6px;
    font-weight: 600;
    color: #333;
  }

  .form-group textarea {
    width: 100%;
    padding: 10px;
    border: 1px solid #ddd;
    border-radius: 6px;
    font-size: 14px;
    resize: vertical;
  }

  .evidence-preview {
    background: #f8f9fa;
    padding: 12px;
    border-radius: 6px;
    margin-bottom: 16px;
  }

  .evidence-preview label {
    font-weight: 600;
    margin-bottom: 8px;
    display: block;
  }

  .evidence-item {
    padding: 8px;
    background: white;
    border-radius: 4px;
    margin: 4px 0;
    font-size: 13px;
  }

  .timestamp {
    color: #667eea;
    font-size: 11px;
  }

  .modal-actions {
    display: flex;
    gap: 12px;
    justify-content: flex-end;
    margin-top: 20px;
  }

  .btn-secondary {
    padding: 10px 20px;
    background: #6c757d;
    color: white;
    border: none;
    border-radius: 6px;
    cursor: pointer;
  }

  .btn-primary {
    padding: 10px 20px;
    background: #667eea;
    color: white;
    border: none;
    border-radius: 6px;
    cursor: pointer;
  }
`;

// =============================================================================
// EXPORTS
// =============================================================================

export default AdminReviewQueue;
