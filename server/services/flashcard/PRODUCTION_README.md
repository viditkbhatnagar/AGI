# Production Flashcard Generator

A complete, production-ready flashcard generation system that extracts content from Google Drive, OneDrive, and Cloudinary documents to generate the **TOP 10 most important questions** for each module.

## Features

### Document Extraction
- **Google Drive**: Docs, Slides, Sheets, PDFs (via export API)
- **OneDrive/SharePoint**: Documents (with Gemini fallback for auth-required content)
- **Cloudinary**: Uploaded PDFs and documents
- **Local files**: Text, Markdown, JSON

### AI-Powered Generation
- Uses Gemini AI (gemini-2.0-flash) for intelligent question generation
- Two-stage pipeline: Content Analysis → Flashcard Generation
- Generates exactly 10 high-quality flashcards per module
- Balanced difficulty distribution (30% easy, 40% medium, 30% hard)
- Bloom's Taxonomy classification for each question

### Quality Assurance
- Evidence-based answers with source citations
- Confidence scoring for each card
- Review flagging for low-confidence cards
- Duplicate detection and removal

## API Endpoints

### Base URL: `/api/v2/flashcards`

#### Generate Flashcards
```http
POST /api/v2/flashcards/generate
Content-Type: application/json

{
  "courseSlug": "introduction-to-accounting",
  "moduleIndex": 0,
  "isSandbox": false,
  "cardCount": 10
}
```

**Response:**
```json
{
  "success": true,
  "deck_id": "deck_introduction-to-accounting::modules::0_1702742400000",
  "cards": [...],
  "card_count": 10,
  "metadata": {
    "module_id": "introduction-to-accounting::modules::0",
    "module_title": "Introduction to Accounting",
    "documentsProcessed": 3,
    "videosProcessed": 2,
    "extractionMethods": {
      "export": 2,
      "gemini": 3
    },
    "processingTimeMs": 5000
  }
}
```

#### Get Flashcards
```http
GET /api/v2/flashcards/:courseSlug/:moduleIndex
```

Query params:
- `regenerate=true` - Generate new flashcards if none exist

#### Get Module Content Info
```http
GET /api/v2/flashcards/content/:courseSlug/:moduleIndex
```

Returns information about documents, videos, and recordings in the module.

#### List Courses
```http
GET /api/v2/flashcards/courses
```

#### List Modules
```http
GET /api/v2/flashcards/modules/:courseSlug
```

#### Health Check
```http
GET /api/v2/flashcards/health
```

## Configuration

### Required Environment Variables

```bash
# Gemini AI (required)
GEMINI_API_KEY=your-gemini-api-key
GEMINI_MODEL=gemini-2.0-flash  # optional, defaults to gemini-2.0-flash

# MongoDB (required)
MONGODB_URI=mongodb://localhost:27017/agi
```

### Optional Environment Variables

```bash
# For enhanced Google Drive access (service account)
GOOGLE_SERVICE_ACCOUNT_KEY={"type":"service_account",...}

# For OneDrive/SharePoint access (Microsoft Graph)
MS_GRAPH_CLIENT_ID=your-client-id
MS_GRAPH_CLIENT_SECRET=your-client-secret
MS_GRAPH_TENANT_ID=your-tenant-id
```

## Testing

### Run the Test Script

```bash
# Test with auto-detected course
npx tsx server/services/flashcard/testProductionGenerator.ts

# Test with specific course and module
npx tsx server/services/flashcard/testProductionGenerator.ts introduction-to-accounting 0
```

### Test Output

The test script will:
1. List available courses
2. Fetch module content from database
3. Extract content from all documents
4. Generate 10 flashcards
5. Display statistics and sample cards

## Flashcard Format

Each flashcard includes:

```typescript
{
  card_id: "card_1",
  q: "What is the accounting equation?",
  a: "Assets = Liabilities + Owner's Equity. This fundamental equation shows the relationship between what a company owns, owes, and the owner's investment.",
  difficulty: "easy" | "medium" | "hard",
  bloom_level: "Remember" | "Understand" | "Apply" | "Analyze" | "Evaluate" | "Create",
  evidence: [{
    chunk_id: "source_id",
    source_file: "Accounting Basics.pdf",
    loc: "page 5",
    excerpt: "The accounting equation states that Assets = Liabilities + Owner's Equity"
  }],
  sources: [{
    type: "pdf",
    file: "Accounting Basics.pdf",
    loc: "page 5"
  }],
  confidence_score: 0.95,
  rationale: "Tests fundamental understanding of the core accounting principle",
  review_required: false
}
```

## Document Extraction Methods

### 1. Direct Export (Google Workspace)
- Works for publicly shared Google Docs, Slides, Sheets
- Exports to plain text format
- Fastest and most reliable method

### 2. PDF Parsing
- Uses `pdf-parse` library
- Works for PDFs from any source
- Extracts text content from all pages

### 3. Gemini AI Fallback
- Used when direct extraction fails
- Generates educational content based on document title
- Provides comprehensive coverage of expected topics

### 4. Fallback Content
- Last resort when all other methods fail
- Generates placeholder content with study recommendations

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Production Generator                      │
├─────────────────────────────────────────────────────────────┤
│  1. Content Fetcher                                          │
│     └── Fetches module data from MongoDB                     │
│                                                              │
│  2. Document Extractor                                       │
│     ├── Google Drive extraction                              │
│     ├── OneDrive extraction                                  │
│     ├── Cloudinary extraction                                │
│     └── Gemini AI fallback                                   │
│                                                              │
│  3. Chunk Converter                                          │
│     └── Splits content into processable chunks               │
│                                                              │
│  4. AI Generator (Gemini)                                    │
│     ├── Stage A: Content Analysis                            │
│     │   └── Identifies key topics and concepts               │
│     └── Stage B: Flashcard Generation                        │
│         └── Creates 10 high-quality questions                │
│                                                              │
│  5. Deck Store                                               │
│     └── Persists flashcards to file system                   │
└─────────────────────────────────────────────────────────────┘
```

## Troubleshooting

### "No content found in module"
- Ensure the module has documents, videos, or recordings
- Check that document URLs are valid

### "Could not extract content"
- Verify Google Drive documents are publicly shared
- Check that GEMINI_API_KEY is configured for fallback extraction

### "GEMINI_API_KEY not configured"
- Set the GEMINI_API_KEY environment variable
- Ensure the API key has access to the Gemini API

### Low confidence scores
- Review the source documents for quality
- Ensure documents contain educational content
- Check that document titles are descriptive

## Files

- `productionGenerator.ts` - Main generation logic
- `productionDocumentExtractor.ts` - Document extraction
- `productionController.ts` - API controllers
- `productionRoutes.ts` - Express routes
- `contentFetcher.ts` - Database content fetching
- `testProductionGenerator.ts` - Test script
