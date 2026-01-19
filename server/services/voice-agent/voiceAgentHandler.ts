import { WebSocket, WebSocketServer } from 'ws';
import { IncomingMessage } from 'http';
import { createRequire } from 'module';
import { URL } from 'url';

// Use createRequire for CommonJS pdfjs-dist module
const require = createRequire(import.meta.url);
const pdfjsLib = require('pdfjs-dist/legacy/build/pdf.js');

// Disable worker for server-side usage (not needed in Node.js)
if (pdfjsLib.GlobalWorkerOptions) {
  pdfjsLib.GlobalWorkerOptions.workerSrc = '';
}

interface VoiceSession {
  clientWs: WebSocket;
  openAiWs: WebSocket | null;
  documentUrl: string;
  documentTitle: string;
  pageNumber: number;
  pageContent: string;
  isConnected: boolean;
}

const activeSessions = new Map<string, VoiceSession>();

/**
 * Extract text from a PDF page
 */
async function extractPageText(pdfUrl: string, pageNumber: number): Promise<string> {
  try {
    console.log(`🎙️ Extracting text for voice session: page ${pageNumber}`);
    
    const response = await fetch(pdfUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch PDF: ${response.status}`);
    }
    
    const arrayBuffer = await response.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);
    
    const loadingTask = pdfjsLib.getDocument({ data: uint8Array });
    const pdfDocument = await loadingTask.promise;
    
    if (pageNumber < 1 || pageNumber > pdfDocument.numPages) {
      pageNumber = 1;
    }
    
    const page = await pdfDocument.getPage(pageNumber);
    const textContent = await page.getTextContent();
    
    const pageText = textContent.items
      .map((item: any) => item.str)
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim();
    
    return pageText || 'No text content available on this page.';
  } catch (error) {
    console.error('❌ Voice agent PDF extraction error:', error);
    return 'Unable to extract text from this page.';
  }
}

/**
 * Create the system prompt for the voice agent
 */
function createSystemPrompt(documentTitle: string, pageNumber: number, pageContent: string): string {
  return `You are an intelligent, friendly voice assistant helping a student learn from their course materials. You have access to the content of a specific page from a document and should answer questions about it conversationally.

DOCUMENT: ${documentTitle || 'Course Document'}
PAGE: ${pageNumber}

PAGE CONTENT:
${pageContent}

GUIDELINES:
1. Be conversational, warm, and encouraging - like a helpful tutor
2. Answer questions based on the page content above
3. If asked about something not on this page, politely say it's not covered here but offer to help with what is on the page
4. Explain concepts in simple, practical terms
5. Give real-world examples when helpful
6. Keep responses concise for voice - aim for 2-4 sentences unless more detail is requested
7. If the user seems confused, offer to explain differently
8. When the user first connects, briefly greet them and let them know you're ready to help with questions about this page

Remember: You're having a voice conversation, so be natural and avoid bullet points or formatted text. Speak as if you're talking to a friend who needs help studying.`;
}

/**
 * Connect to OpenAI Realtime API
 */
async function connectToOpenAI(session: VoiceSession, sessionId: string): Promise<void> {
  const apiKey = process.env.OPENAI_API_KEY;
  
  if (!apiKey) {
    throw new Error('OpenAI API key not configured');
  }

  const openAiUrl = 'wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2024-12-17';
  
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(openAiUrl, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'OpenAI-Beta': 'realtime=v1'
      }
    });

    ws.on('open', () => {
      console.log(`🎙️ Connected to OpenAI Realtime API for session ${sessionId}`);
      session.openAiWs = ws;
      session.isConnected = true;

      // Configure the session
      const sessionConfig = {
        type: 'session.update',
        session: {
          modalities: ['text', 'audio'],
          voice: 'alloy',
          input_audio_format: 'pcm16',
          output_audio_format: 'pcm16',
          input_audio_transcription: {
            model: 'whisper-1'
          },
          turn_detection: {
            type: 'server_vad',
            threshold: 0.5,
            prefix_padding_ms: 300,
            silence_duration_ms: 500
          },
          instructions: createSystemPrompt(
            session.documentTitle,
            session.pageNumber,
            session.pageContent
          )
        }
      };

      ws.send(JSON.stringify(sessionConfig));
      console.log(`🎙️ Session configured for ${sessionId}`);
      
      resolve();
    });

    ws.on('message', (data: Buffer) => {
      try {
        const message = JSON.parse(data.toString());
        handleOpenAIMessage(session, sessionId, message);
      } catch (error) {
        console.error('❌ Error parsing OpenAI message:', error);
      }
    });

    ws.on('error', (error) => {
      console.error(`❌ OpenAI WebSocket error for session ${sessionId}:`, error);
      session.isConnected = false;
      
      // Notify client of error
      if (session.clientWs.readyState === WebSocket.OPEN) {
        session.clientWs.send(JSON.stringify({
          type: 'error',
          message: 'Connection to AI service failed'
        }));
      }
      
      reject(error);
    });

    ws.on('close', () => {
      console.log(`🎙️ OpenAI connection closed for session ${sessionId}`);
      session.isConnected = false;
      session.openAiWs = null;
    });
  });
}

/**
 * Handle messages from OpenAI Realtime API
 */
function handleOpenAIMessage(session: VoiceSession, sessionId: string, message: any): void {
  const { type } = message;

  // Forward relevant events to the client
  switch (type) {
    case 'session.created':
      console.log(`🎙️ Session created for ${sessionId}`);
      if (session.clientWs.readyState === WebSocket.OPEN) {
        session.clientWs.send(JSON.stringify({
          type: 'session_ready'
        }));
      }
      break;

    case 'session.updated':
      console.log(`🎙️ Session updated for ${sessionId}`);
      break;

    case 'input_audio_buffer.speech_started':
      if (session.clientWs.readyState === WebSocket.OPEN) {
        session.clientWs.send(JSON.stringify({
          type: 'user_speaking_started'
        }));
      }
      break;

    case 'input_audio_buffer.speech_stopped':
      if (session.clientWs.readyState === WebSocket.OPEN) {
        session.clientWs.send(JSON.stringify({
          type: 'user_speaking_stopped'
        }));
      }
      break;

    case 'conversation.item.input_audio_transcription.completed':
      // User's speech transcription
      if (session.clientWs.readyState === WebSocket.OPEN) {
        session.clientWs.send(JSON.stringify({
          type: 'user_transcript',
          transcript: message.transcript
        }));
      }
      break;

    case 'response.audio_transcript.delta':
      // AI's response text (streaming)
      if (session.clientWs.readyState === WebSocket.OPEN) {
        session.clientWs.send(JSON.stringify({
          type: 'assistant_transcript_delta',
          delta: message.delta
        }));
      }
      break;

    case 'response.audio_transcript.done':
      // AI's complete response text
      if (session.clientWs.readyState === WebSocket.OPEN) {
        session.clientWs.send(JSON.stringify({
          type: 'assistant_transcript_done',
          transcript: message.transcript
        }));
      }
      break;

    case 'response.audio.delta':
      // AI's audio response (streaming)
      if (session.clientWs.readyState === WebSocket.OPEN) {
        session.clientWs.send(JSON.stringify({
          type: 'audio_delta',
          delta: message.delta // base64 encoded PCM16 audio
        }));
      }
      break;

    case 'response.audio.done':
      if (session.clientWs.readyState === WebSocket.OPEN) {
        session.clientWs.send(JSON.stringify({
          type: 'audio_done'
        }));
      }
      break;

    case 'response.created':
      if (session.clientWs.readyState === WebSocket.OPEN) {
        session.clientWs.send(JSON.stringify({
          type: 'assistant_thinking'
        }));
      }
      break;

    case 'response.done':
      if (session.clientWs.readyState === WebSocket.OPEN) {
        session.clientWs.send(JSON.stringify({
          type: 'response_complete'
        }));
      }
      break;

    case 'error':
      console.error(`❌ OpenAI error for session ${sessionId}:`, message.error);
      if (session.clientWs.readyState === WebSocket.OPEN) {
        session.clientWs.send(JSON.stringify({
          type: 'error',
          message: message.error?.message || 'An error occurred'
        }));
      }
      break;

    default:
      // Log other message types for debugging
      if (process.env.NODE_ENV === 'development') {
        console.log(`🎙️ OpenAI event [${type}]`);
      }
  }
}

/**
 * Handle messages from the client
 */
function handleClientMessage(session: VoiceSession, sessionId: string, message: any): void {
  const { type } = message;

  switch (type) {
    case 'audio_data':
      // Forward audio data to OpenAI
      if (session.openAiWs?.readyState === WebSocket.OPEN) {
        session.openAiWs.send(JSON.stringify({
          type: 'input_audio_buffer.append',
          audio: message.audio // base64 encoded PCM16 audio
        }));
      }
      break;

    case 'audio_commit':
      // Commit the audio buffer (user finished speaking)
      if (session.openAiWs?.readyState === WebSocket.OPEN) {
        session.openAiWs.send(JSON.stringify({
          type: 'input_audio_buffer.commit'
        }));
      }
      break;

    case 'text_message':
      // User sent a text message instead of speaking
      if (session.openAiWs?.readyState === WebSocket.OPEN) {
        // Create a conversation item with the text
        session.openAiWs.send(JSON.stringify({
          type: 'conversation.item.create',
          item: {
            type: 'message',
            role: 'user',
            content: [
              {
                type: 'input_text',
                text: message.text
              }
            ]
          }
        }));
        
        // Request a response
        session.openAiWs.send(JSON.stringify({
          type: 'response.create'
        }));
      }
      break;

    case 'interrupt':
      // User wants to interrupt the AI
      if (session.openAiWs?.readyState === WebSocket.OPEN) {
        session.openAiWs.send(JSON.stringify({
          type: 'response.cancel'
        }));
      }
      break;

    case 'ping':
      // Respond to keep-alive ping
      if (session.clientWs.readyState === WebSocket.OPEN) {
        session.clientWs.send(JSON.stringify({ type: 'pong' }));
      }
      break;

    default:
      console.log(`🎙️ Unknown client message type: ${type}`);
  }
}

/**
 * Set up WebSocket server for voice agent
 */
export function setupVoiceAgentWebSocket(wss: WebSocketServer): void {
  wss.on('connection', async (ws: WebSocket, req: IncomingMessage) => {
    const url = new URL(req.url || '', `http://${req.headers.host}`);

    // Parse query parameters
    const sessionId = url.searchParams.get('sessionId') || `session_${Date.now()}`;
    const documentUrl = url.searchParams.get('documentUrl') || '';
    const documentTitle = url.searchParams.get('documentTitle') || 'Document';
    const pageNumber = parseInt(url.searchParams.get('pageNumber') || '1', 10);

    console.log(`🎙️ Voice agent connection: session=${sessionId}, page=${pageNumber}`);

    if (!documentUrl) {
      ws.send(JSON.stringify({
        type: 'error',
        message: 'documentUrl is required'
      }));
      ws.close();
      return;
    }

    // Extract page content
    const pageContent = await extractPageText(documentUrl, pageNumber);

    // Create session
    const session: VoiceSession = {
      clientWs: ws,
      openAiWs: null,
      documentUrl,
      documentTitle,
      pageNumber,
      pageContent,
      isConnected: false
    };

    activeSessions.set(sessionId, session);

    // Send initial connection confirmation
    ws.send(JSON.stringify({
      type: 'connected',
      sessionId,
      pageNumber,
      documentTitle
    }));

    // Connect to OpenAI
    try {
      await connectToOpenAI(session, sessionId);
    } catch (error) {
      console.error('❌ Failed to connect to OpenAI:', error);
      ws.send(JSON.stringify({
        type: 'error',
        message: 'Failed to connect to AI service. Please try again.'
      }));
      ws.close();
      activeSessions.delete(sessionId);
      return;
    }

    // Handle client messages
    ws.on('message', (data: Buffer) => {
      try {
        const message = JSON.parse(data.toString());
        handleClientMessage(session, sessionId, message);
      } catch (error) {
        console.error('❌ Error parsing client message:', error);
      }
    });

    // Handle client disconnect
    ws.on('close', () => {
      console.log(`🎙️ Client disconnected: ${sessionId}`);
      
      // Close OpenAI connection
      if (session.openAiWs?.readyState === WebSocket.OPEN) {
        session.openAiWs.close();
      }
      
      activeSessions.delete(sessionId);
    });

    // Handle errors
    ws.on('error', (error) => {
      console.error(`❌ Client WebSocket error for ${sessionId}:`, error);
      activeSessions.delete(sessionId);
    });
  });

  console.log('🎙️ Voice agent WebSocket handler initialized');
}

export default { setupVoiceAgentWebSocket };
