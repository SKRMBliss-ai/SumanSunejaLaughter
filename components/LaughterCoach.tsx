import React, { useState, useRef, useEffect } from 'react';
import { Mic, Square, Sparkles, Loader2, RotateCcw, Trophy, Key, Calendar, Clock, Trash2, StopCircle, Volume2, Zap, ThumbsUp, ThumbsDown, WifiOff } from 'lucide-react';
import { GoogleGenAI, LiveServerMessage, Modality } from "@google/genai";
import { rateLaughter, getGuidedSessionScript, generateSpeech, createAudioBufferFromPCM } from '../services/geminiService';
import { LaughterScore } from '../types';
import { addPoints } from '../services/rewardService';
import { useSettings } from '../contexts/SettingsContext';

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

  // History State
  const [history, setHistory] = useState<HistoryItem[]>(() => {
    try {
      const saved = localStorage.getItem('laughterHistory');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

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

  // --- Live Conversational Session ---
  const startLiveSession = async () => {
    const apiKey = process.env.API_KEY;
    if (!apiKey) {
      setError(t('coach.live_unavailable'));
      setIsMissingKey(true);
      return;
    }

    cleanupAudio();
    setIsSessionLoading(true);
    setIsSessionActive(true);
    setSessionType('LIVE');
    setError(null);
    setUsingOfflineVoice(false);

    try {
      // 1. Setup Audio Contexts
      liveInputContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      nextStartTimeRef.current = 0;

      // 2. Get Microphone Stream
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;

      // 3. Connect to Gemini Live
      const ai = new GoogleGenAI({ apiKey });

      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } },
          },
          systemInstruction: `You are Suman Suneja, an energetic, warm, and highly interactive Laughter Yoga Coach. 
          Your goal is to lead a "Laughter Session" with the user.
          1. Start by welcoming them with a big laugh and ask them to laugh with you.
          2. Listen to their audio. If they are laughing, laugh back harder and encourage them ("Yes! That's it! Loudly!").
          3. If they are quiet, guide them: "Take a deep breath and say Ha Ha Ha!".
          4. Keep your responses short, punchy, and filled with laughter sounds. 
          5. Be spontaneous and fun. Do not give long lectures. Just laugh and guide.`,
        },
        callbacks: {
          onopen: () => {
            setIsSessionLoading(false);

            // Setup Input Processing
            if (!liveInputContextRef.current) return;
            const source = liveInputContextRef.current.createMediaStreamSource(stream);
            const processor = liveInputContextRef.current.createScriptProcessor(4096, 1, 1);
            inputProcessorRef.current = processor;

            processor.onaudioprocess = (e) => {
              const inputData = e.inputBuffer.getChannelData(0);
              const pcmBlob = createBlob(inputData);
              sessionPromise.then((session) => {
                session.sendRealtimeInput({ media: pcmBlob });
              });
            };

            source.connect(processor);
            processor.connect(liveInputContextRef.current.destination);
          },
          onmessage: async (message: LiveServerMessage) => {
            const base64Audio = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;

            if (base64Audio && audioContextRef.current) {
              const ctx = audioContextRef.current;
              const binary = decode(base64Audio);

              const dataInt16 = new Int16Array(binary.buffer);
              const float32 = new Float32Array(dataInt16.length);
              for (let i = 0; i < dataInt16.length; i++) {
                float32[i] = dataInt16[i] / 32768.0;
              }

              const buffer = ctx.createBuffer(1, float32.length, 24000);
              buffer.getChannelData(0).set(float32);

              const source = ctx.createBufferSource();
              source.buffer = buffer;
              source.connect(ctx.destination);

              const currentTime = ctx.currentTime;
              if (nextStartTimeRef.current < currentTime) {
                nextStartTimeRef.current = currentTime;
              }

              source.start(nextStartTimeRef.current);
              nextStartTimeRef.current += buffer.duration;
            }
          },
          onclose: () => {
            stopSession();
          },
          onerror: (err) => {
            console.error("Live session error", err);
            setError(t('coach.connection_lost'));
            stopSession();
          }
        }
      });

      liveSessionRef.current = sessionPromise;

    } catch (err) {
      console.error(err);
      setIsSessionLoading(false);
      setIsSessionActive(false);
      setError(t('coach.session_error'));
    }
  };

  // --- Quick 1-Min Guided Session (TTS) ---
  const handleQuickSession = async () => {
    cleanupAudio();
    setIsSessionLoading(true);
    setIsSessionActive(true);
    setSessionType('QUICK');
    setError(null);
    setUsingOfflineVoice(false);
    setIsMissingKey(false);

    try {
      const script = await getGuidedSessionScript();

      // Initialize Audio Context
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      if (audioContextRef.current.state === 'suspended') {
        await audioContextRef.current.resume();
      }

      try {
        const audioBase64 = await generateSpeech(script, 'Kore');

        if (!audioContextRef.current) return;

        // Decode raw PCM from Gemini TTS
        const audioBuffer = createAudioBufferFromPCM(audioContextRef.current, audioBase64);

        const source = audioContextRef.current.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(audioContextRef.current.destination);
        source.onended = () => {
          stopSession();
        };

        sourceRef.current = source;
        source.start(0);
        setIsSessionLoading(false);

      } catch (geminiError: any) {
        console.warn("Gemini TTS failed:", geminiError);
        // Do NOT set a blocking error. Just inform user and use fallback.
        setUsingOfflineVoice(true);
        setError(null);

        // Fallback to browser TTS so it's not silent
        const utterance = new SpeechSynthesisUtterance(script);
        const voices = window.speechSynthesis.getVoices();
        // Try to find a good female voice
        const preferredVoice = voices.find(v => v.name.includes('Google UK English Female') || v.name.includes('Samantha') || v.name.includes('Female'));
        if (preferredVoice) utterance.voice = preferredVoice;
        utterance.rate = 1.05; // Slightly faster for energy
        utterance.pitch = 1.1; // Slightly higher for cheerfulness

        utterance.onend = () => stopSession();
        utterance.onerror = () => stopSession();

        setIsSessionLoading(false);
        window.speechSynthesis.speak(utterance);
      }

    } catch (e: any) {
      console.error(e);
      setError(t('coach.session_error'));
      stopSession();
    }
  };

  const stopSession = () => {
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
          onClick={() => isSessionActive && sessionType === 'QUICK' ? stopSession() : handleQuickSession()}
          disabled={isSessionLoading || isRecording || (isSessionActive && sessionType !== 'QUICK')}
          className={`w-full p-4 rounded-2xl shadow-lg flex items-center justify-between transition-all transform active:scale-95 border-2 hover:scale-[1.02] ${isSessionActive && sessionType === 'QUICK'
            ? 'bg-white dark:bg-slate-800 border-[#ABCEC9] ring-4 ring-[#ABCEC9]/20 text-[#ABCEC9]'
            : 'bg-gradient-to-r from-[#ABCEC9] to-[#C3B8D5] dark:from-teal-800 dark:to-purple-800 text-white border-transparent'
            } ${isSessionActive && sessionType !== 'QUICK' ? 'opacity-50' : ''}`}
        >
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-full ${isSessionActive && sessionType === 'QUICK' ? 'bg-[#ABCEC9] text-white' : 'bg-white/20'}`}>
              {isSessionLoading && sessionType === 'QUICK' ? <Loader2 size={24} className="animate-spin" /> :
                isSessionActive && sessionType === 'QUICK' ? <StopCircle size={24} fill="currentColor" /> :
                  <Zap size={24} fill="currentColor" />}
            </div>
            <div className="text-left">
              <h3 className={`font-bold ${isSessionActive && sessionType === 'QUICK' ? 'text-gray-800 dark:text-gray-100' : 'text-white'}`}>{t('coach.quick_laugh')}</h3>
              <p className={`text-xs ${isSessionActive && sessionType === 'QUICK' ? 'opacity-70 text-gray-600 dark:text-gray-400' : 'text-white/80'}`}>{t('coach.guided_boost')}</p>
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
          <div className="space-y-4 animate-fade-in-up">
            <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl shadow-xl border-2 border-[#EDE8F8] dark:border-slate-700 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[#ABCEC9] via-[#C3B8D5] to-[#AABBCC]"></div>
              <div className="inline-block px-4 py-1.5 bg-[#EDE8F8] dark:bg-slate-700 text-[#AABBCC] rounded-full text-xs font-black uppercase tracking-wider mb-3">
                {scoreData.energyLevel} {t('coach.energy')}
              </div>
              <p className="text-gray-700 dark:text-gray-200 text-lg font-medium leading-relaxed">"{scoreData.feedback}"</p>
            </div>
            <button
              onClick={() => setScoreData(null)}
              className="w-full bg-white dark:bg-slate-800 text-gray-500 dark:text-gray-300 hover:text-[#ABCEC9] font-bold py-3 rounded-xl hover:bg-[#EDE8F8] dark:hover:bg-slate-700 flex items-center justify-center gap-2 transition-all hover:scale-105"
            >
              <RotateCcw size={18} /> {t('coach.play_again')}
            </button>
          </div>
        )}

        {usingOfflineVoice && !error && (
          <div className="text-orange-500 text-xs font-bold bg-orange-50 dark:bg-orange-900/20 p-2 rounded-xl border border-orange-100 dark:border-orange-900/50 flex items-center justify-center gap-2 animate-in fade-in">
            <WifiOff size={12} /> {t('coach.offline_voice')}
          </div>
        )}

        {error && (
          <div className="text-red-500 text-sm font-bold bg-red-50 dark:bg-red-900/20 p-3 rounded-xl border border-red-100 dark:border-red-900/50 flex items-center justify-center gap-2 animate-shake">
            <Key size={16} /> {error}
          </div>
        )}
      </div>

      {/* Laughter Log History */}
      {history.length > 0 && !isRecording && (
        <div className="w-full max-w-md mt-8 animate-fade-in-up delay-500">
          <div className="flex items-center justify-between mb-4 px-2">
            <h3 className="text-lg font-fredoka font-bold text-gray-600 dark:text-gray-300 flex items-center gap-2">
              <Calendar size={18} className="text-[#C3B8D5]" /> {t('coach.laughter_log')}
            </h3>
            <button
              onClick={clearHistory}
              className="text-xs text-red-300 hover:text-red-500 font-bold flex items-center gap-1 hover:bg-red-50 dark:hover:bg-red-900/20 px-2 py-1 rounded-md transition-colors"
            >
              <Trash2 size={12} /> {t('coach.clear')}
            </button>
          </div>

          <div className="bg-white/50 dark:bg-slate-800/50 rounded-2xl p-2 max-h-60 overflow-y-auto space-y-2 hide-scrollbar">
            {history.map((item) => (
              <div key={item.id} className="bg-white dark:bg-slate-800 p-3 rounded-xl flex items-center justify-between shadow-sm border border-transparent hover:border-[#ABCEC9]/30 transition-all hover:scale-[1.01]">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-md ${item.score >= 80 ? 'bg-[#ABCEC9]' : item.score >= 50 ? 'bg-[#C3B8D5]' : 'bg-[#AABBCC]'
                    }`}>
                    {item.score}
                  </div>
                  <div>
                    <div className="text-xs font-bold text-gray-600 dark:text-gray-300 flex items-center gap-1">
                      {new Date(item.timestamp).toLocaleDateString()}
                    </div>
                    <div className="text-[10px] text-gray-400 font-medium flex items-center gap-1">
                      <Clock size={10} /> {new Date(item.timestamp).toLocaleTimeString()}
                    </div>
                  </div>
                </div>
                <div className="text-xs font-bold text-[#AABBCC] bg-[#EDE8F8] dark:bg-slate-700 px-2 py-1 rounded-lg">
                  {item.energyLevel}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};