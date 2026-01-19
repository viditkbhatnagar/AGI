import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Mic,
  MicOff,
  Phone,
  PhoneOff,
  Send,
  Volume2,
  VolumeX,
  Loader2,
  MessageCircle,
  User,
  Bot
} from 'lucide-react';

interface VoiceAgentModalProps {
  isOpen: boolean;
  onClose: () => void;
  documentUrl: string;
  documentTitle: string;
  pageNumber: number;
}

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
}

type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'error';
type AgentState = 'idle' | 'listening' | 'thinking' | 'speaking';

export function VoiceAgentModal({
  isOpen,
  onClose,
  documentUrl,
  documentTitle,
  pageNumber
}: VoiceAgentModalProps) {
  // Connection states
  const [connectionState, setConnectionState] = useState<ConnectionState>('disconnected');
  const [agentState, setAgentState] = useState<AgentState>('idle');
  const [error, setError] = useState<string | null>(null);
  
  // Audio states
  const [isMuted, setIsMuted] = useState(false);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  
  // Messages
  const [messages, setMessages] = useState<Message[]>([]);
  const [textInput, setTextInput] = useState('');
  const [currentTranscript, setCurrentTranscript] = useState('');
  
  // Refs
  const wsRef = useRef<WebSocket | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const workletNodeRef = useRef<AudioWorkletNode | null>(null);
  const audioQueueRef = useRef<Float32Array[]>([]);
  const isPlayingRef = useRef(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const sessionIdRef = useRef<string>(`voice_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, currentTranscript]);

  // Clean up on unmount or close
  useEffect(() => {
    return () => {
      cleanup();
    };
  }, []);

  // Handle modal close
  useEffect(() => {
    if (!isOpen) {
      cleanup();
    }
  }, [isOpen]);

  const cleanup = useCallback(() => {
    // Close WebSocket
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    // Stop media stream
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }

    // Close audio context
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }

    // Reset states
    setConnectionState('disconnected');
    setAgentState('idle');
    setMessages([]);
    setCurrentTranscript('');
    setError(null);
    audioQueueRef.current = [];
    isPlayingRef.current = false;
  }, []);

  // Convert Float32 to PCM16 base64
  const float32ToPCM16Base64 = (float32Array: Float32Array): string => {
    const pcm16 = new Int16Array(float32Array.length);
    for (let i = 0; i < float32Array.length; i++) {
      const s = Math.max(-1, Math.min(1, float32Array[i]));
      pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
    }
    
    const bytes = new Uint8Array(pcm16.buffer);
    let binary = '';
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  };

  // Convert base64 PCM16 to Float32
  const pcm16Base64ToFloat32 = (base64: string): Float32Array => {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    
    const pcm16 = new Int16Array(bytes.buffer);
    const float32 = new Float32Array(pcm16.length);
    for (let i = 0; i < pcm16.length; i++) {
      float32[i] = pcm16[i] / (pcm16[i] < 0 ? 0x8000 : 0x7FFF);
    }
    
    return float32;
  };

  // Play audio queue
  const playAudioQueue = useCallback(async () => {
    if (isPlayingRef.current || !audioContextRef.current || audioQueueRef.current.length === 0) {
      return;
    }

    isPlayingRef.current = true;
    setAgentState('speaking');

    while (audioQueueRef.current.length > 0 && isAudioEnabled) {
      const audioData = audioQueueRef.current.shift();
      if (!audioData || !audioContextRef.current) break;

      const audioBuffer = audioContextRef.current.createBuffer(1, audioData.length, 24000);
      audioBuffer.getChannelData(0).set(audioData);

      const source = audioContextRef.current.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(audioContextRef.current.destination);

      await new Promise<void>((resolve) => {
        source.onended = () => resolve();
        source.start();
      });
    }

    isPlayingRef.current = false;
    if (audioQueueRef.current.length === 0) {
      setAgentState('idle');
    }
  }, [isAudioEnabled]);

  // Handle WebSocket messages
  const handleMessage = useCallback((event: MessageEvent) => {
    try {
      const data = JSON.parse(event.data);

      switch (data.type) {
        case 'connected':
          console.log('🎙️ Voice agent connected');
          break;

        case 'session_ready':
          setConnectionState('connected');
          setAgentState('idle');
          setMessages(prev => [...prev, {
            id: `sys_${Date.now()}`,
            role: 'system',
            content: `Connected to voice assistant. Ask me anything about page ${pageNumber} of "${documentTitle}".`,
            timestamp: new Date()
          }]);
          break;

        case 'user_speaking_started':
          setAgentState('listening');
          break;

        case 'user_speaking_stopped':
          setAgentState('thinking');
          break;

        case 'user_transcript':
          if (data.transcript) {
            setMessages(prev => [...prev, {
              id: `user_${Date.now()}`,
              role: 'user',
              content: data.transcript,
              timestamp: new Date()
            }]);
          }
          break;

        case 'assistant_thinking':
          setAgentState('thinking');
          setCurrentTranscript('');
          break;

        case 'assistant_transcript_delta':
          setCurrentTranscript(prev => prev + (data.delta || ''));
          break;

        case 'assistant_transcript_done':
          if (data.transcript) {
            setMessages(prev => [...prev, {
              id: `assistant_${Date.now()}`,
              role: 'assistant',
              content: data.transcript,
              timestamp: new Date()
            }]);
            setCurrentTranscript('');
          }
          break;

        case 'audio_delta':
          if (data.delta && isAudioEnabled) {
            const audioData = pcm16Base64ToFloat32(data.delta);
            audioQueueRef.current.push(audioData);
            playAudioQueue();
          }
          break;

        case 'audio_done':
          // Audio streaming complete
          break;

        case 'response_complete':
          if (audioQueueRef.current.length === 0) {
            setAgentState('idle');
          }
          break;

        case 'error':
          console.error('Voice agent error:', data.message);
          setError(data.message);
          setAgentState('idle');
          break;

        case 'pong':
          // Keep-alive response
          break;
      }
    } catch (err) {
      console.error('Error parsing WebSocket message:', err);
    }
  }, [pageNumber, documentTitle, isAudioEnabled, playAudioQueue]);

  // Start voice session
  const startSession = useCallback(async () => {
    try {
      setConnectionState('connecting');
      setError(null);

      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 24000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });
      mediaStreamRef.current = stream;

      // Create AudioContext
      audioContextRef.current = new AudioContext({ sampleRate: 24000 });

      // Create WebSocket connection
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = new URL(`${protocol}//${window.location.host}/ws/voice`);
      wsUrl.searchParams.set('sessionId', sessionIdRef.current);
      wsUrl.searchParams.set('documentUrl', documentUrl);
      wsUrl.searchParams.set('documentTitle', documentTitle);
      wsUrl.searchParams.set('pageNumber', pageNumber.toString());

      const ws = new WebSocket(wsUrl.toString());
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('🎙️ WebSocket connected');
        setupAudioCapture(stream);
      };

      ws.onmessage = handleMessage;

      ws.onerror = (err) => {
        console.error('WebSocket error:', err);
        setError('Connection error. Please try again.');
        setConnectionState('error');
      };

      ws.onclose = () => {
        console.log('🎙️ WebSocket closed');
        if (connectionState === 'connected') {
          setConnectionState('disconnected');
        }
      };

      // Set up keep-alive ping
      const pingInterval = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: 'ping' }));
        }
      }, 30000);

      // Clean up ping on close
      ws.addEventListener('close', () => clearInterval(pingInterval));

    } catch (err: any) {
      console.error('Failed to start voice session:', err);
      if (err.name === 'NotAllowedError') {
        setError('Microphone access denied. Please allow microphone access to use voice chat.');
      } else {
        setError('Failed to start voice session. Please try again.');
      }
      setConnectionState('error');
    }
  }, [documentUrl, documentTitle, pageNumber, handleMessage, connectionState]);

  // Set up audio capture from microphone
  const setupAudioCapture = useCallback(async (stream: MediaStream) => {
    if (!audioContextRef.current) return;

    const source = audioContextRef.current.createMediaStreamSource(stream);

    // Use ScriptProcessor as fallback (AudioWorklet would be better but more complex)
    const bufferSize = 4096;
    const scriptProcessor = audioContextRef.current.createScriptProcessor(bufferSize, 1, 1);

    scriptProcessor.onaudioprocess = (event) => {
      if (isMuted || !wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
        return;
      }

      const inputData = event.inputBuffer.getChannelData(0);
      const audioBase64 = float32ToPCM16Base64(inputData);

      wsRef.current.send(JSON.stringify({
        type: 'audio_data',
        audio: audioBase64
      }));
    };

    source.connect(scriptProcessor);
    scriptProcessor.connect(audioContextRef.current.destination);
  }, [isMuted]);

  // Send text message
  const sendTextMessage = useCallback(() => {
    if (!textInput.trim() || !wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      return;
    }

    // Add user message to UI
    setMessages(prev => [...prev, {
      id: `user_${Date.now()}`,
      role: 'user',
      content: textInput,
      timestamp: new Date()
    }]);

    // Send to server
    wsRef.current.send(JSON.stringify({
      type: 'text_message',
      text: textInput
    }));

    setTextInput('');
    setAgentState('thinking');
  }, [textInput]);

  // End session
  const endSession = useCallback(() => {
    cleanup();
    onClose();
  }, [cleanup, onClose]);

  // Toggle mute
  const toggleMute = useCallback(() => {
    setIsMuted(prev => !prev);
  }, []);

  // Toggle audio output
  const toggleAudio = useCallback(() => {
    setIsAudioEnabled(prev => !prev);
  }, []);

  // Get state indicator
  const getStateIndicator = () => {
    switch (agentState) {
      case 'listening':
        return (
          <div className="flex items-center gap-2 text-green-600">
            <div className="relative">
              <Mic className="h-5 w-5" />
              <span className="absolute -top-1 -right-1 flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
              </span>
            </div>
            <span className="text-sm font-medium">Listening...</span>
          </div>
        );
      case 'thinking':
        return (
          <div className="flex items-center gap-2 text-amber-600">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span className="text-sm font-medium">Thinking...</span>
          </div>
        );
      case 'speaking':
        return (
          <div className="flex items-center gap-2 text-blue-600">
            <div className="flex items-center gap-0.5">
              <div className="w-1 h-4 bg-blue-500 rounded animate-pulse" style={{ animationDelay: '0ms' }}></div>
              <div className="w-1 h-6 bg-blue-500 rounded animate-pulse" style={{ animationDelay: '150ms' }}></div>
              <div className="w-1 h-3 bg-blue-500 rounded animate-pulse" style={{ animationDelay: '300ms' }}></div>
              <div className="w-1 h-5 bg-blue-500 rounded animate-pulse" style={{ animationDelay: '450ms' }}></div>
            </div>
            <span className="text-sm font-medium">Speaking...</span>
          </div>
        );
      default:
        return (
          <div className="flex items-center gap-2 text-slate-500">
            <MessageCircle className="h-5 w-5" />
            <span className="text-sm font-medium">Ready to chat</span>
          </div>
        );
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && endSession()}>
      <DialogContent className="sm:max-w-[500px] h-[600px] flex flex-col p-0 gap-0">
        {/* Header */}
        <DialogHeader className="px-4 py-3 border-b bg-gradient-to-r from-[#18548b] to-[#2563eb] text-white rounded-t-lg">
          <DialogTitle className="flex items-center gap-2 text-white">
            <Phone className="h-5 w-5" />
            Voice Assistant
          </DialogTitle>
          <p className="text-xs text-white/70 mt-1">
            Page {pageNumber} of {documentTitle}
          </p>
        </DialogHeader>

        {/* Connection Status */}
        {connectionState !== 'connected' && (
          <div className="p-4 bg-slate-50 border-b">
            {connectionState === 'disconnected' && (
              <div className="text-center">
                <p className="text-sm text-slate-600 mb-3">
                  Start a voice conversation about this page. You can speak or type your questions.
                </p>
                <Button onClick={startSession} className="bg-[#18548b] hover:bg-[#134775]">
                  <Phone className="h-4 w-4 mr-2" />
                  Start Voice Chat
                </Button>
              </div>
            )}
            {connectionState === 'connecting' && (
              <div className="text-center">
                <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2 text-[#18548b]" />
                <p className="text-sm text-slate-600">Connecting to voice assistant...</p>
              </div>
            )}
            {connectionState === 'error' && (
              <div className="text-center">
                <p className="text-sm text-red-600 mb-3">{error}</p>
                <Button onClick={startSession} variant="outline">
                  Try Again
                </Button>
              </div>
            )}
          </div>
        )}

        {/* State Indicator */}
        {connectionState === 'connected' && (
          <div className="px-4 py-2 bg-slate-50 border-b flex items-center justify-center">
            {getStateIndicator()}
          </div>
        )}

        {/* Messages */}
        <ScrollArea className="flex-1 p-4">
          <div className="space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {message.role !== 'user' && (
                  <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                    message.role === 'assistant' ? 'bg-[#18548b]' : 'bg-slate-200'
                  }`}>
                    {message.role === 'assistant' ? (
                      <Bot className="h-4 w-4 text-white" />
                    ) : (
                      <MessageCircle className="h-4 w-4 text-slate-500" />
                    )}
                  </div>
                )}
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-2 ${
                    message.role === 'user'
                      ? 'bg-[#18548b] text-white'
                      : message.role === 'assistant'
                      ? 'bg-slate-100 text-slate-800'
                      : 'bg-amber-50 text-amber-800 text-center w-full max-w-full text-sm'
                  }`}
                >
                  <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                </div>
                {message.role === 'user' && (
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center">
                    <User className="h-4 w-4 text-slate-600" />
                  </div>
                )}
              </div>
            ))}

            {/* Current streaming transcript */}
            {currentTranscript && (
              <div className="flex gap-3 justify-start">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[#18548b] flex items-center justify-center">
                  <Bot className="h-4 w-4 text-white" />
                </div>
                <div className="max-w-[80%] rounded-2xl px-4 py-2 bg-slate-100 text-slate-800">
                  <p className="text-sm whitespace-pre-wrap">{currentTranscript}</p>
                  <span className="inline-block w-2 h-4 bg-slate-400 animate-pulse ml-1"></span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>

        {/* Controls */}
        {connectionState === 'connected' && (
          <div className="p-4 border-t bg-white">
            {/* Text input */}
            <div className="flex gap-2 mb-3">
              <Input
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                placeholder="Type a message..."
                onKeyDown={(e) => e.key === 'Enter' && sendTextMessage()}
                className="flex-1"
              />
              <Button
                onClick={sendTextMessage}
                disabled={!textInput.trim()}
                size="icon"
                className="bg-[#18548b] hover:bg-[#134775]"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>

            {/* Audio controls */}
            <div className="flex items-center justify-center gap-3">
              <Button
                variant="outline"
                size="icon"
                onClick={toggleMute}
                className={isMuted ? 'bg-red-50 border-red-200 text-red-600' : ''}
              >
                {isMuted ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
              </Button>
              
              <Button
                variant="outline"
                size="icon"
                onClick={toggleAudio}
                className={!isAudioEnabled ? 'bg-red-50 border-red-200 text-red-600' : ''}
              >
                {isAudioEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
              </Button>

              <Button
                variant="destructive"
                size="icon"
                onClick={endSession}
                className="bg-red-500 hover:bg-red-600"
              >
                <PhoneOff className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default VoiceAgentModal;
