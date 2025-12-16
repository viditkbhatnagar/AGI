-- =============================================================================
-- Flashcard Deck and Cards Tables Migration
-- 
-- Database: PostgreSQL (primary) / SQLite (testing)
-- Created: 2025-12-01
-- Purpose: Persistent storage for AI-generated flashcard decks and cards
-- =============================================================================

-- =============================================================================
-- TABLE: flashcard_decks
-- =============================================================================

CREATE TABLE IF NOT EXISTS flashcard_decks (
    deck_id VARCHAR(255) PRIMARY KEY,
    module_id VARCHAR(255) NOT NULL,
    course_id VARCHAR(255),
    module_title VARCHAR(500),
    generated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    model_version VARCHAR(100),
    raw_model_output_url VARCHAR(1000),
    verified_rate REAL,
    warnings JSONB DEFAULT '[]'::jsonb,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for fast queries by module_id (most common query pattern)
CREATE INDEX IF NOT EXISTS idx_flashcard_decks_module_id 
    ON flashcard_decks(module_id);

-- Index for ordering by generated_at
CREATE INDEX IF NOT EXISTS idx_flashcard_decks_generated_at 
    ON flashcard_decks(generated_at DESC);

-- Index for course-level queries
CREATE INDEX IF NOT EXISTS idx_flashcard_decks_course_id 
    ON flashcard_decks(course_id);

-- =============================================================================
-- TABLE: flashcards
-- =============================================================================

CREATE TABLE IF NOT EXISTS flashcards (
    card_id VARCHAR(255) PRIMARY KEY,
    deck_id VARCHAR(255) NOT NULL REFERENCES flashcard_decks(deck_id) ON DELETE CASCADE,
    question TEXT NOT NULL,
    answer TEXT NOT NULL,
    difficulty VARCHAR(20) NOT NULL CHECK (difficulty IN ('easy', 'medium', 'hard')),
    bloom_level VARCHAR(20) NOT NULL CHECK (bloom_level IN ('Remember', 'Understand', 'Apply', 'Analyze', 'Evaluate', 'Create')),
    evidence_json JSONB DEFAULT '[]'::jsonb,
    sources_json JSONB DEFAULT '[]'::jsonb,
    confidence_score REAL CHECK (confidence_score >= 0 AND confidence_score <= 1),
    rationale TEXT,
    review_required BOOLEAN DEFAULT FALSE,
    verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for fast lookups by deck_id (fetch all cards for a deck)
CREATE INDEX IF NOT EXISTS idx_flashcards_deck_id 
    ON flashcards(deck_id);

-- Index for ordering cards within a deck
CREATE INDEX IF NOT EXISTS idx_flashcards_created_at 
    ON flashcards(created_at);

-- Index for finding cards needing review
CREATE INDEX IF NOT EXISTS idx_flashcards_review_required 
    ON flashcards(review_required) WHERE review_required = TRUE;

-- =============================================================================
-- TRIGGER: Update updated_at timestamp on row update
-- =============================================================================

-- Function to update timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger for flashcard_decks
DROP TRIGGER IF EXISTS update_flashcard_decks_updated_at ON flashcard_decks;
CREATE TRIGGER update_flashcard_decks_updated_at
    BEFORE UPDATE ON flashcard_decks
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger for flashcards
DROP TRIGGER IF EXISTS update_flashcards_updated_at ON flashcards;
CREATE TRIGGER update_flashcards_updated_at
    BEFORE UPDATE ON flashcards
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- COMMENTS
-- =============================================================================

COMMENT ON TABLE flashcard_decks IS 'Stores metadata for AI-generated flashcard decks';
COMMENT ON TABLE flashcards IS 'Stores individual flashcard questions and answers';
COMMENT ON COLUMN flashcard_decks.deck_id IS 'Unique identifier format: deck_{module_id}_{timestamp}';
COMMENT ON COLUMN flashcard_decks.raw_model_output_url IS 'URL/path to raw LLM output logs for debugging';
COMMENT ON COLUMN flashcard_decks.verified_rate IS 'Percentage of cards that passed verification (0.0 to 1.0)';
COMMENT ON COLUMN flashcards.evidence_json IS 'JSON array of evidence objects with chunk_id, excerpt, source_file';
COMMENT ON COLUMN flashcards.sources_json IS 'JSON array of source references with type, file, loc';
