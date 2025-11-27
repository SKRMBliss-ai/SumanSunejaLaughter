import React, { useState, useRef, useEffect } from 'react';
import { Mic, Square, Sparkles, Loader2, RotateCcw, Trophy, Key, Calendar, Clock, Trash2, StopCircle, Volume2, Zap, ThumbsUp, ThumbsDown, WifiOff, X, MessageCircle } from 'lucide-react';
import { GoogleGenAI, LiveServerMessage, Modality } from "@google/genai";
import { rateLaughter, getGuidedSessionScript, generateSpeech, createAudioBufferFromPCM } from '../services/geminiService';
import { LaughterScore } from '../types';
import { addPoints } from '../services/rewardService';
import { useSettings } from '../contexts/SettingsContext';
import { useLiveSession } from '../hooks/useLiveSession';
import { VoiceChatWidget } from './VoiceChatWidget';

interface HistoryItem {
  id: number;
  timestamp: number;
  score: number;
  energyLevel: string;
}

// --- Audio Helpers for Live API ---
function createBlob(data: Float32Array): { data: string; mimeType: string } {
  const l = data.length;
  const int16 = new Int16Array(l);
  for (let i = 0; i < l; i++) {
    // Clamp values to [-1, 1] before scaling to avoid wrapping artifacts
    const s = Math.max(-1, Math.min(1, data[i]));
    int16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
  }

  let binary = '';
  const bytes = new Uint8Array(int16.buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }

  return {
    data: btoa(binary),
    mimeType: 'audio/pcm;rate=16000',
  };
}

function decode(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

export const LaughterCoach: React.FC = () => {
  const { t } = useSettings();
  // Main modes
  const [isRecording, setIsRecording] = useState(false); // For Score Analyzer
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [scoreData, setScoreData] = useState<LaughterScore | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isMissingKey, setIsMissingKey] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const [showVoiceChat, setShowVoiceChat] = useState(false);
  const [usingOfflineVoice, setUsingOfflineVoice] = useState(false);

  // Session States
  const [isSessionLoading, setIsSessionLoading] = useState(false);
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [sessionType, setSessionType] = useState<'LIVE' | 'QUICK' | null>(null);

  // Use ref to track session type inside callbacks (avoiding stale closures)
  const sessionTypeRef = useRef<'LIVE' | 'QUICK' | null>(null);

  // Audio Refs
  const audioContextRef = useRef<AudioContext | null>(null); // For playback
  const liveInputContextRef = useRef<AudioContext | null>(null); // For mic input (16kHz)
  const sourceRef = useRef<AudioBufferSourceNode | null>(null); // For legacy TTS playback
  const liveSessionRef = useRef<any>(null); // To store the active session
  const nextStartTimeRef = useRef<number>(0); // For scheduling live audio chunks
  const inputProcessorRef = useRef<ScriptProcessorNode | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  // Pre-fetch Ref
  const introBufferRef = useRef<AudioBuffer | null>(null);
  const hasPrefetchedRef = useRef(false);

  // History State
  const [history, setHistory] = useState<HistoryItem[]>(() => {
    try {
      const saved = localStorage.getItem('laughterHistory');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

  // Init Audio Context for Playback
  useEffect(() => {
    return () => {
      cleanupAudio();
    };
  }, []);

  // Sync ref with state
  useEffect(() => {
    sessionTypeRef.current = sessionType;
  }, [sessionType]);

  // Persist history changes
  useEffect(() => {
    localStorage.setItem('laughterHistory', JSON.stringify(history));
  }, [history]);

  const cleanupAudio = () => {
    if (sourceRef.current) sourceRef.current.stop();
    window.speechSynthesis.cancel();

    // Cleanup Live Session
    if (liveSessionRef.current) {
      liveSessionRef.current = null;
    }

    if (inputProcessorRef.current) {
      inputProcessorRef.current.disconnect();
      inputProcessorRef.current = null;
    }

    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }

    if (liveInputContextRef.current) {
      liveInputContextRef.current.close();
      liveInputContextRef.current = null;
    }

    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
  };

  const handleFeedback = (rating: 'up' | 'down') => {
    // In a real app, send this rating to backend
    console.log(`User rated session: ${rating}`);
    addPoints(5, t('coach.thanks_feedback'), 'COACH');
    setShowFeedback(false);
  };

  // Helper for immediate feedback
  const playImmediateGreeting = (text: string) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.1;
      window.speechSynthesis.speak(utterance);
    }
  };

  // --- Pre-fetch Intro for Quick Session ---
  const prefetchIntro = async () => {
    if (hasPrefetchedRef.current) return;
    hasPrefetchedRef.current = true;

    try {
      // Initialize Audio Context if needed
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }

      const introText = "Hello! Ready to laugh?";
      const audioBase64 = await generateSpeech(introText, 'Kore');

      if (audioContextRef.current) {
        const audioBuffer = createAudioBufferFromPCM(audioContextRef.current, audioBase64);
        introBufferRef.current = audioBuffer;
      }
    } catch (e) {
      console.warn("Prefetch failed", e);
    }
  };

  // --- Live Conversational Session (Refactored for Low Latency) ---
  const {
    startSession: startLiveSessionLowLatency,
    stopSession: stopLiveSessionLowLatency,
    isSessionActive: isLiveSessionActive,
    isLoading: isLiveSessionLoading,
    volumeLevel
  } = useLiveSession({
    onSessionEnd: () => {
      stopSession(); // Call main stopSession to handle UI/Points
    },
    onError: (err) => {
      setError(err);
    }
  });

  // Wrapper to start session using the new hook
  const startLiveSession = async () => {
    playImmediateGreeting("Starting live session");
    const apiKey = process.env.API_KEY;
    if (!apiKey) {
      setError(t('coach.live_unavailable'));
      setIsMissingKey(true);
      return;
    }

    setSessionType('LIVE');
    setIsSessionActive(true); // Set local UI state
    startLiveSessionLowLatency(apiKey);
  };

  // --- Quick 1-Min Guided Session (TTS) ---
  const handleQuickSession = async () => {
    if (!introBufferRef.current) {
      playImmediateGreeting("Starting quick session");
    }
    cleanupAudio();
    setIsSessionLoading(true);
    setIsSessionActive(true);
    setSessionType('QUICK');
    setError(null);
    setUsingOfflineVoice(false);
    setIsMissingKey(false);

    try {
      const script = await getGuidedSessionScript();

      // Split script into sentences for chunked streaming
      // Matches periods, exclamation marks, question marks followed by space or end of string
      const sentences = script.match(/[^.!?]+[.!?]+(\s|$)/g) || [script];

      // Initialize Audio Context
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      if (audioContextRef.current.state === 'suspended') {
        await audioContextRef.current.resume();
      }

      let currentSentenceIndex = 0;
      let isPlaying = false;
      const audioQueue: AudioBuffer[] = [];

      // Play intro first if available
      if (introBufferRef.current) {
        const introSource = audioContextRef.current.createBufferSource();
        introSource.buffer = introBufferRef.current;
        introSource.connect(audioContextRef.current.destination);

        // We treat it as the "current" source but we need to know when it ends
        isPlaying = true;
        sourceRef.current = introSource;

        introSource.onended = () => {
          playNextInQueue();
        };
        introSource.start(0);
      }

      // Function to process the queue
      const playNextInQueue = () => {
        if (audioQueue.length > 0 && audioContextRef.current) {
          isPlaying = true;
          const buffer = audioQueue.shift()!;
          const source = audioContextRef.current.createBufferSource();
          source.buffer = buffer;
          source.connect(audioContextRef.current.destination);

          source.onended = () => {
            playNextInQueue();
          };

          sourceRef.current = source;
          source.start(0);
        } else {
          isPlaying = false;
          // If queue is empty but we haven't finished all sentences, we are buffering.
          // If we finished all sentences, stop session.
          if (currentSentenceIndex >= sentences.length) {
            stopSession();
          }
        }
      };

      // Function to fetch and queue audio
      const fetchAndQueueAudio = async (index: number) => {
        if (index >= sentences.length) return;

        try {
          const text = sentences[index].trim();
          if (!text) {
            fetchAndQueueAudio(index + 1); // Skip empty
            return;
          }

          const audioBase64 = await generateSpeech(text, 'Kore');

          if (!audioContextRef.current) return;
          const audioBuffer = createAudioBufferFromPCM(audioContextRef.current, audioBase64);

          audioQueue.push(audioBuffer);

          // If nothing is playing, start playing immediately
          if (!isPlaying) {
            // First chunk loaded! Stop loading spinner.
            setIsSessionLoading(false);
            playNextInQueue();
          }

          // Fetch next chunk
          currentSentenceIndex++;
          fetchAndQueueAudio(currentSentenceIndex);

        } catch (err) {
          console.warn("Error fetching chunk:", err);
          // If error, just try next chunk or stop if critical
          currentSentenceIndex++;
          fetchAndQueueAudio(currentSentenceIndex);
        }
      };

      // Start fetching the first chunk
      // If we played intro, we are already "playing", so fetchAndQueueAudio will just queue.
      // If we didn't play intro (no prefetch), it will start playing first chunk immediately.
      fetchAndQueueAudio(0);

      // If we have intro, we stop loading immediately
      if (introBufferRef.current) {
        setIsSessionLoading(false);
      }

    } catch (e: any) {
      console.error(e);
      setError(t('coach.session_error'));
      stopSession();
    }
  };

  const stopSession = () => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    // If live session is active, stop it via hook
    if (sessionTypeRef.current === 'LIVE') {
      stopLiveSessionLowLatency();
    }

    cleanupAudio();
    const wasActive = isSessionActive;

    setIsSessionActive(false);
    setIsSessionLoading(false);

    // Check which session was active using ref to ensure we capture state correctly in callbacks
    const completedSessionType = sessionTypeRef.current;
    setSessionType(null);

    if (completedSessionType && wasActive) {
      addPoints(completedSessionType === 'LIVE' ? 30 : 20, t('coach.session_completed'), 'COACH');
      // Show feedback modal with a slight delay
      setTimeout(() => setShowFeedback(true), 500);
    }
  };

  // --- Recording Logic (Analyzer) ---
  const startRecording = async () => {
    setError(null);
    setScoreData(null);
    setIsMissingKey(false);

    if (isSessionActive) stopSession();

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = async () => {
          const base64String = reader.result as string;
          const base64Data = base64String.split(',')[1];
          analyzeAudio(base64Data, audioBlob.type || 'audio/webm');
        };
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      console.error(err);
      setError(t('coach.mic_permission'));
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setIsAnalyzing(true);
    }
  };

  const analyzeAudio = async (base64: string, mimeType: string) => {
    try {
      const result = await rateLaughter(base64, mimeType);
      setScoreData(result);
      if (result.score > 0) {
        const newItem: HistoryItem = {
          id: Date.now(),
          timestamp: Date.now(),
          score: result.score,
          energyLevel: result.energyLevel
        };
        setHistory(prev => [newItem, ...prev]);
        addPoints(15, t('coach.laughter_analyzed'), 'COACH');
      }
    } catch (err: any) {
      if (err.message === "MISSING_GEMINI_KEY") {
        // Just show a fake score for fun if key is missing, instead of blocking
        setScoreData({
          score: 85,
          feedback: "Even without my AI brain, I can tell that was joyful! (AI Offline Mode)",
          energyLevel: "High"
        });
        setUsingOfflineVoice(true);
      } else {
        setError(t('coach.analyze_error'));
      }
    } finally {
      setIsAnalyzing(false);
    }
  };

  const clearHistory = () => {
    if (window.confirm(t('coach.clear_confirm'))) {
      setHistory([]);
    }
  };

  return (
    <div className="flex flex-col items-center min-h-[70vh] p-6 pb-32 space-y-8 animate-in fade-in duration-500 relative">

      {/* Feedback Modal */}
      {showFeedback && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-pop-in">
          <div className="bg-white dark:bg-slate-800 rounded-[2rem] p-6 w-full max-w-xs shadow-2xl relative border-4 border-[#EDE8F8] dark:border-slate-700 text-center">
            <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-[#ABCEC9] to-[#C3B8D5]"></div>
            <h3 className="text-xl font-fredoka font-bold text-gray-700 dark:text-gray-100 mb-2 mt-2">{t('coach.how_was_it')}</h3>
            <p className="text-sm text-[#AABBCC] mb-6">{t('coach.help_improve')}</p>

            <div className="flex gap-4 justify-center">
              <button
                onClick={() => handleFeedback('down')}
                className="p-4 rounded-2xl bg-red-50 dark:bg-red-900/30 text-red-400 hover:bg-red-100 dark:hover:bg-red-900/50 transition-all active:scale-95 transform hover:-rotate-12 border border-red-100 dark:border-red-900/50"
              >
                <ThumbsDown size={32} />
              </button>
              <button
                onClick={() => handleFeedback('up')}
                className="p-4 rounded-2xl bg-green-50 dark:bg-green-900/30 text-green-500 hover:bg-green-100 dark:hover:bg-green-900/50 transition-all active:scale-95 transform hover:rotate-12 border border-green-100 dark:border-green-900/50"
              >
                <ThumbsUp size={32} />
              </button>
            </div>

            <button
              onClick={() => setShowFeedback(false)}
              className="mt-6 text-xs font-bold text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 underline decoration-dashed"
            >
              {t('coach.skip_feedback')}
            </button>
          </div>
        </div>
      )}

      {/* Voice Chat Modal */}
      {showVoiceChat && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-pop-in">
          <div className="relative w-full max-w-sm">
            <button
              onClick={() => setShowVoiceChat(false)}
              className="absolute -top-3 -right-3 z-10 bg-white dark:bg-slate-700 rounded-full p-2 shadow-md text-gray-500 hover:text-gray-700 dark:text-gray-300 dark:hover:text-white border border-gray-100 dark:border-slate-600"
            >
              <X size={20} />
            </button>
            <VoiceChatWidget />
          </div>
        </div>
      )}

      {/* Session Controls */}
      <div className="w-full max-w-sm space-y-3 animate-fade-in-up">
        {/* Live Session Button */}
        <button
          onClick={() => isSessionActive && sessionType === 'LIVE' ? stopSession() : startLiveSession()}
          disabled={isSessionLoading || isRecording || (isSessionActive && sessionType !== 'LIVE')}
          className={`w-full p-4 rounded-2xl shadow-lg flex items-center justify-between transition-all transform active:scale-95 border-2 hover:scale-[1.02] ${isSessionActive && sessionType === 'LIVE'
            ? 'bg-white dark:bg-slate-800 border-purple-400 ring-4 ring-purple-100 dark:ring-purple-900 text-purple-700 dark:text-purple-400'
            : 'bg-white dark:bg-slate-800 border-purple-100 dark:border-slate-700 text-purple-600 dark:text-purple-400 hover:border-purple-200 dark:hover:border-purple-800'
            } ${isSessionActive && sessionType !== 'LIVE' ? 'opacity-50' : ''}`}
        >
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-full ${isSessionActive && sessionType === 'LIVE' ? 'bg-purple-500 text-white' : 'bg-purple-100 dark:bg-purple-900/50 text-purple-600 dark:text-purple-300'}`}>
              {isSessionLoading && sessionType === 'LIVE' ? <Loader2 size={24} className="animate-spin" /> :
                isSessionActive && sessionType === 'LIVE' ? <StopCircle size={24} fill="currentColor" /> :
                  <Mic size={24} />}
            </div>
            <div className="text-left">
              <h3 className="font-bold text-gray-800 dark:text-gray-100">{t('coach.start_live')}</h3>
              <p className="text-xs opacity-70 text-gray-600 dark:text-gray-400">{t('coach.interactive')}</p>
            </div>
          </div>
          {isSessionActive && sessionType === 'LIVE' && (
            <div className="flex gap-1 items-end h-4">
              <div className="w-1 bg-purple-400 h-2 animate-[bounce_1s_infinite]"></div>
              <div className="w-1 bg-purple-400 h-4 animate-[bounce_1.2s_infinite]"></div>
              <div className="w-1 bg-purple-400 h-3 animate-[bounce_0.8s_infinite]"></div>
            </div>
          )}
        </button>

        {/* Quick Laugh Button */}
        <button
          onMouseEnter={prefetchIntro}
          onClick={() => isSessionActive && sessionType === 'QUICK' ? stopSession() : handleQuickSession()}
          disabled={isSessionLoading || isRecording || (isSessionActive && sessionType !== 'QUICK')}
          className={`w-full p-4 rounded-2xl shadow-lg flex items-center justify-between transition-all transform active:scale-95 border-2 hover:scale-[1.02] ${isSessionActive && sessionType === 'QUICK'
            ? 'bg-white dark:bg-slate-800 border-[#ABCEC9] ring-4 ring-[#ABCEC9]/20 text-[#ABCEC9]'
            : 'bg-gradient-to-r from-[#ABCEC9] to-[#C3B8D5] dark:from-teal-800 dark:to-purple-800 text-teal-900 dark:text-white border-transparent'
            } ${isSessionActive && sessionType !== 'QUICK' ? 'opacity-50' : ''}`}
        >
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-full ${isSessionActive && sessionType === 'QUICK' ? 'bg-[#ABCEC9] text-white' : 'bg-white/20'}`}>
              {isSessionLoading && sessionType === 'QUICK' ? <Loader2 size={24} className="animate-spin" /> :
                isSessionActive && sessionType === 'QUICK' ? <StopCircle size={24} fill="currentColor" /> :
                  <Zap size={24} fill="currentColor" />}
            </div>
            <div className="text-left">
              <h3 className={`font-bold ${isSessionActive && sessionType === 'QUICK' ? 'text-gray-800 dark:text-gray-100' : 'text-teal-900 dark:text-white'}`}>{t('coach.quick_laugh')}</h3>
              <p className={`text-xs ${isSessionActive && sessionType === 'QUICK' ? 'opacity-70 text-gray-600 dark:text-gray-400' : 'text-teal-800/80 dark:text-white/80'}`}>{t('coach.guided_boost')}</p>
            </div>
          </div>
          {isSessionActive && sessionType === 'QUICK' && (
            <div className="flex gap-1 items-end h-4">
              <div className="w-1 bg-[#ABCEC9] h-2 animate-[bounce_1s_infinite]"></div>
              <div className="w-1 bg-[#ABCEC9] h-4 animate-[bounce_1.2s_infinite]"></div>
              <div className="w-1 bg-[#ABCEC9] h-3 animate-[bounce_0.8s_infinite]"></div>
            </div>
          )}
        </button>

        {/* Voice Chat Button */}
        <button
          onClick={() => setShowVoiceChat(true)}
          disabled={isSessionActive}
          className={`w-full p-4 rounded-2xl shadow-lg flex items-center justify-between transition-all transform active:scale-95 border-2 hover:scale-[1.02] bg-white dark:bg-slate-800 border-blue-100 dark:border-slate-700 text-blue-600 dark:text-blue-400 hover:border-blue-200 dark:hover:border-blue-800 ${isSessionActive ? 'opacity-50' : ''}`}
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-full bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-300">
              <MessageCircle size={24} />
            </div>
            <div className="text-left">
              <h3 className="font-bold text-gray-800 dark:text-gray-100">Voice Chat</h3>
              <p className="text-xs opacity-70 text-gray-600 dark:text-gray-400">Ask Suman anything</p>
            </div>
          </div>
        </button>
      </div>

      <div className="text-center space-y-2 animate-pop-in delay-200">
        <h2 className="text-4xl font-fredoka font-bold text-[#C3B8D5] drop-shadow-sm">{t('coach.title')}</h2>
        <p className="text-[#AABBCC] font-medium">{t('coach.subtitle')}</p>
      </div>

      {/* Interactive Visualizer */}
      <div className="relative w-72 h-72 flex items-center justify-center animate-pop-in delay-300">
        {/* Ripples */}
        {(isRecording || isSessionActive) && (
          <>
            <div className={`absolute w-full h-full rounded-full opacity-20 animate-[ping_1.5s_cubic-bezier(0,0,0.2,1)_infinite] ${sessionType === 'LIVE' ? 'bg-purple-300 dark:bg-purple-900' : 'bg-[#ABCEC9]'}`}></div>
            <div className={`absolute w-3/4 h-3/4 rounded-full opacity-30 animate-[ping_2s_cubic-bezier(0,0,0.2,1)_infinite] ${sessionType === 'LIVE' ? 'bg-purple-200 dark:bg-purple-800' : 'bg-[#C3B8D5]'}`}></div>
          </>
        )}

        {/* Main Circle */}
        <div className={`relative w-56 h-56 rounded-full bg-gradient-to-br from-[#EDE8F8] to-white dark:from-slate-700 dark:to-slate-600 flex items-center justify-center shadow-inner border-4 border-white dark:border-slate-500 transition-all duration-300 ${isRecording || isSessionActive ? 'scale-110 shadow-lg animate-bounce-gentle' : 'animate-float'}`}>
          <div className="absolute w-44 h-44 rounded-full bg-white dark:bg-slate-800 flex items-center justify-center shadow-lg overflow-hidden p-4">
            {isAnalyzing ? (
              <div className="flex flex-col items-center">
                <Loader2 className="w-12 h-12 text-[#ABCEC9] animate-spin mb-2" />
                <span className="text-xs font-bold text-[#AABBCC] animate-pulse">{t('coach.analyzing')}</span>
              </div>
            ) : isMissingKey ? (
              <div className="text-center flex flex-col items-center">
                <Key className="w-10 h-10 text-red-400 mb-2 animate-bounce" />
                <span className="text-xs font-bold text-red-500 leading-tight">{t('coach.api_missing')}</span>
                <span className="text-[9px] text-gray-400 mt-1">{t('coach.offline_fallback')}</span>
              </div>
            ) : scoreData ? (
              <div className="text-center animate-pop-in">
                <div className="flex justify-center mb-1"><Trophy className="text-yellow-300 w-8 h-8 fill-current animate-wiggle" /></div>
                <span className="block text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-[#ABCEC9] to-[#C3B8D5]">{scoreData.score}</span>
                <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">{t('coach.joy_score')}</span>
              </div>
            ) : isSessionActive ? (
              <div className="text-center flex flex-col items-center">
                {sessionType === 'LIVE' ? <Mic className="w-10 h-10 text-purple-400 mb-2 animate-pulse" /> : <Volume2 className="w-10 h-10 text-[#ABCEC9] mb-2 animate-pulse" />}
                <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                  {sessionType === 'LIVE' ? t('coach.ai_listening') : t('coach.listen_laugh')}
                </span>
              </div>
            ) : (
              <div className="text-center">
                <Sparkles className={`w-16 h-16 mx-auto mb-2 transition-colors duration-300 ${isRecording ? 'text-[#C3B8D5] animate-spin-slow' : 'text-gray-200 dark:text-slate-600'}`} />
                <span className={`text-xs font-bold uppercase tracking-wider ${isRecording ? 'text-[#C3B8D5]' : 'text-gray-300 dark:text-slate-500'}`}>
                  {isRecording ? t('coach.listening') : t('coach.ready')}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="space-y-4 w-full max-w-xs text-center z-10">
        {!isRecording && !isAnalyzing && !scoreData && !isSessionActive && (
          <button
            onClick={startRecording}
            className="w-full bg-white dark:bg-slate-800 border-2 border-[#ABCEC9] text-[#ABCEC9] hover:bg-[#ABCEC9] hover:text-white font-bold py-4 rounded-2xl shadow-md transform transition-all hover:scale-105 active:scale-95 flex items-center justify-center gap-3 text-lg animate-fade-in-up delay-400"
          >
            <Mic size={24} /> {t('coach.rate_my_laugh')}
          </button>
        )}

        {isRecording && (
          <button
            onClick={stopRecording}
            className="w-full bg-white dark:bg-slate-800 border-2 border-[#C3B8D5] text-[#C3B8D5] font-bold py-5 rounded-2xl shadow-lg transform transition active:scale-95 flex items-center justify-center gap-3 text-xl animate-pulse"
          >
            <Square fill="currentColor" size={20} /> {t('coach.stop_rate')}
          </button>
        )}

        {scoreData && (
          <div className="animate-fade-in-up">
            <p className="text-sm text-gray-600 dark:text-gray-300 italic mb-4 px-4">"{scoreData.feedback}"</p>
            <div className="flex gap-2 justify-center">
              <button
                onClick={() => setScoreData(null)}
                className="bg-gray-100 dark:bg-slate-700 text-gray-500 dark:text-gray-300 font-bold py-3 px-6 rounded-xl hover:bg-gray-200 dark:hover:bg-slate-600 transition-colors"
              >
                {t('coach.close')}
              </button>
              <button
                onClick={startRecording}
                className="bg-[#ABCEC9] text-white font-bold py-3 px-6 rounded-xl hover:bg-[#9BBDB8] transition-colors shadow-md"
              >
                {t('coach.try_again')}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* History List */}
      <div className="w-full max-w-md mt-8 animate-fade-in-up delay-500">
        <div className="flex justify-between items-center mb-4 px-2">
          <h3 className="font-bold text-gray-500 dark:text-gray-400 uppercase text-xs tracking-widest flex items-center gap-2">
            <Calendar size={14} /> {t('coach.history')}
          </h3>
          {history.length > 0 && (
            <button
              onClick={clearHistory}
              className="text-red-300 hover:text-red-500 transition-colors p-1"
              title={t('coach.clear_history')}
            >
              <Trash2 size={14} />
            </button>
          )}
        </div>

        <div className="space-y-3">
          {history.length === 0 ? (
            <div className="text-center p-8 border-2 border-dashed border-gray-200 dark:border-slate-700 rounded-2xl text-gray-400">
              <p className="text-sm">{t('coach.no_history')}</p>
            </div>
          ) : (
            history.slice(0, 5).map((item) => (
              <div key={item.id} className="bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-sm flex items-center justify-between border border-gray-100 dark:border-slate-700 hover:scale-[1.02] transition-transform">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-xl ${item.score >= 80 ? 'bg-green-100 text-green-500' : item.score >= 50 ? 'bg-yellow-100 text-yellow-500' : 'bg-gray-100 text-gray-400'}`}>
                    <Trophy size={18} />
                  </div>
                  <div>
                    <div className="font-bold text-gray-700 dark:text-gray-200">{item.score} {t('points')}</div>
                    <div className="text-[10px] text-gray-400 flex items-center gap-1">
                      <Clock size={10} /> {new Date(item.timestamp).toLocaleDateString()} • {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                </div>
                <div className="text-xs font-bold text-[#ABCEC9] px-2 py-1 bg-[#ABCEC9]/10 rounded-lg">
                  {item.energyLevel}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};