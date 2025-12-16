# Vector Database & Transcription Setup Guide

This document covers the setup and configuration for the Flashcard Orchestrator's vector database integration, embeddings, and transcription services.

## Environment Variables

### Vector Database Configuration

```bash
# Provider selection (required)
VECTOR_DB_PROVIDER=qdrant  # Options: qdrant | pinecone

# Qdrant Configuration (if VECTOR_DB_PROVIDER=qdrant)
QDRANT_URL=http://localhost:6333
QDRANT_API_KEY=your-qdrant-api-key  # Optional for local, required for cloud
QDRANT_COLLECTION_NAME=flashcard_chunks

# Pinecone Configuration (if VECTOR_DB_PROVIDER=pinecone)
PINECONE_API_KEY=your-pinecone-api-key
PINECONE_ENV=us-east-1  # Your Pinecone environment
PINECONE_INDEX=flashcard-chunks

# Common
EMBEDDING_DIMENSION=768  # Must match your embedding model
```

### Embedding Configuration

```bash
# Provider selection (required)
EMBEDDING_PROVIDER=gemini  # Options: gemini | openai | local

# Gemini Configuration (if EMBEDDING_PROVIDER=gemini)
GEMINI_API_KEY=your-gemini-api-key
GEMINI_EMBEDDING_MODEL=text-embedding-004  # Optional, default: text-embedding-004

# OpenAI Configuration (if EMBEDDING_PROVIDER=openai)
OPENAI_API_KEY=your-openai-api-key
OPENAI_EMBEDDING_MODEL=text-embedding-3-small  # Optional

# Local Configuration (if EMBEDDING_PROVIDER=local)
LOCAL_EMBEDDING_URL=http://localhost:8080/embed
LOCAL_EMBEDDING_MODEL=all-MiniLM-L6-v2
```

### Transcription Configuration

```bash
# Provider selection (required)
TRANSCRIBE_PROVIDER=whisper  # Options: whisper | google_stt

# Whisper Configuration (if TRANSCRIBE_PROVIDER=whisper)
WHISPER_BINARY_PATH=whisper  # Path to whisper executable
WHISPER_MODEL=base  # Options: tiny, base, small, medium, large
WHISPER_LANGUAGE=en

# Google STT Configuration (if TRANSCRIBE_PROVIDER=google_stt)
GOOGLE_STT_KEYFILE=/path/to/service-account.json
GOOGLE_STT_LANGUAGE=en-US

# Temp directory for transcription files
TRANSCRIPTION_TEMP_DIR=/tmp/transcription
```

## Quick Start

### 1. Qdrant Setup (Recommended for Development)

```bash
# Run Qdrant locally with Docker
docker run -p 6333:6333 -p 6334:6334 \
  -v $(pwd)/qdrant_storage:/qdrant/storage:z \
  qdrant/qdrant

# Set environment variables
export VECTOR_DB_PROVIDER=qdrant
export QDRANT_URL=http://localhost:6333
```

### 2. Pinecone Setup (Recommended for Production)

1. Create account at https://www.pinecone.io/
2. Create an index with dimension matching your embedding model (768 for Gemini)
3. Set environment variables:

```bash
export VECTOR_DB_PROVIDER=pinecone
export PINECONE_API_KEY=your-api-key
export PINECONE_INDEX=flashcard-chunks
```

### 3. Embedding Setup

#### Option A: Gemini (Recommended)
```bash
export EMBEDDING_PROVIDER=gemini
export GEMINI_API_KEY=your-gemini-api-key
```

#### Option B: OpenAI
```bash
export EMBEDDING_PROVIDER=openai
export OPENAI_API_KEY=your-openai-api-key
```

#### Option C: Local (sentence-transformers)

Run the embedding microservice:

```bash
# Using Docker
docker run -p 8080:8080 sentence-transformers/all-MiniLM-L6-v2

# Or using Python
pip install sentence-transformers flask
python embedding_server.py
```

Sample `embedding_server.py`:
```python
from flask import Flask, request, jsonify
from sentence_transformers import SentenceTransformer

app = Flask(__name__)
model = SentenceTransformer('all-MiniLM-L6-v2')

@app.route('/embed', methods=['POST'])
def embed():
    data = request.json
    texts = data.get('texts', [])
    embeddings = model.encode(texts).tolist()
    return jsonify({'embeddings': embeddings})

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8080)
```

### 4. Whisper Setup

#### Option A: whisper.cpp (Recommended for speed)

```bash
# Clone and build
git clone https://github.com/ggerganov/whisper.cpp
cd whisper.cpp
make

# Download model
bash ./models/download-ggml-model.sh base

# Set path
export WHISPER_BINARY_PATH=/path/to/whisper.cpp/main
export WHISPER_MODEL=base
```

#### Option B: OpenAI Whisper (Python)

```bash
pip install openai-whisper

export WHISPER_BINARY_PATH=whisper
export WHISPER_MODEL=base
```

#### Option C: Docker

```bash
docker run -v /path/to/audio:/data openai/whisper \
  whisper /data/audio.mp3 --model base --output_format json
```

## Running Tests

```bash
# Run all vector DB tests
npm run test:run -- test/flashcard/vectorDb.test.ts

# Run transcription tests
npm run test:run -- test/flashcard/transcription.test.ts

# Run with verbose output
npm run test:run -- test/flashcard/vectorDb.test.ts --reporter=verbose
```

## Verification Checklist

### Vector Database
- [ ] `VECTOR_DB_PROVIDER` is set to `qdrant` or `pinecone`
- [ ] Provider-specific credentials are configured
- [ ] Can connect to vector DB (check logs for connection errors)
- [ ] Collection/index exists or will be auto-created

### Embeddings
- [ ] `EMBEDDING_PROVIDER` is set
- [ ] API key is configured for cloud providers
- [ ] Local service is running (if using local)
- [ ] Embedding dimension matches vector DB configuration

### Transcription
- [ ] `TRANSCRIBE_PROVIDER` is set
- [ ] Whisper binary is accessible (run `whisper --help`)
- [ ] Model files are downloaded
- [ ] Temp directory is writable

## Troubleshooting

### "QDRANT_URL not configured"
Set the `QDRANT_URL` environment variable or ensure Qdrant is running locally.

### "PINECONE_API_KEY not configured"
Get your API key from the Pinecone console and set `PINECONE_API_KEY`.

### "Whisper binary not found"
Install whisper.cpp or openai-whisper and set `WHISPER_BINARY_PATH`.

### "Insufficient chunks for module"
The module doesn't have enough indexed content. Run the transcription worker to index more content.

### Rate Limiting
Both Gemini and OpenAI have rate limits. The code includes exponential backoff, but for high volume:
- Use batch endpoints where available
- Implement request queuing
- Consider local embeddings for development

## Cost Estimation

| Service | Cost per 1K tokens/requests |
|---------|----------------------------|
| Gemini Embeddings | ~$0.00001 |
| OpenAI text-embedding-3-small | ~$0.00002 |
| Pinecone (Serverless) | ~$0.00002 per query |
| Qdrant Cloud | ~$0.025/hour (starter) |
| Local | Free (compute costs only) |

## Security Notes

1. **Never commit API keys** - Use environment variables or secret managers
2. **Rotate keys regularly** - Especially for production
3. **Use service accounts** - For Google Cloud services
4. **Restrict API key permissions** - Only enable required APIs
5. **Monitor usage** - Set up billing alerts
