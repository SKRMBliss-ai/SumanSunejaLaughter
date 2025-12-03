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

// --- Audio Helpers ---
function createBlob(data: Float32Array): { data: string; mimeType: string } {
  const l = data.length;
  const int16 = new Int16Array(l);
  for (let i = 0; i < l; i++) {
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
  const { t, currentTheme, colorTheme } = useSettings();

  const [isRecording, setIsRecording] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [scoreData, setScoreData] = useState<LaughterScore | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isMissingKey, setIsMissingKey] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const [showVoiceChat, setShowVoiceChat] = useState(false);
  const [usingOfflineVoice, setUsingOfflineVoice] = useState(false);
  const [isSessionLoading, setIsSessionLoading] = useState(false);
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [sessionType, setSessionType] = useState<'LIVE' | 'QUICK' | null>(null);
  const sessionTypeRef = useRef<'LIVE' | 'QUICK' | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const liveInputContextRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<AudioBufferSourceNode | null>(null);
  const liveSessionRef = useRef<any>(null);
  const nextStartTimeRef = useRef<number>(0);
  const inputProcessorRef = useRef<ScriptProcessorNode | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const introBufferRef = useRef<AudioBuffer | null>(null);
  const hasPrefetchedRef = useRef(false);
  const [history, setHistory] = useState<HistoryItem[]>(() => {
    try {
      const saved = localStorage.getItem('laughterHistory');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

  useEffect(() => { return () => { cleanupAudio(); }; }, []);
  useEffect(() => { sessionTypeRef.current = sessionType; }, [sessionType]);
  useEffect(() => { localStorage.setItem('laughterHistory', JSON.stringify(history)); }, [history]);
  useEffect(() => {
    const handleVisibilityChange = () => { if (document.hidden && isSessionActive) { stopSession(); } };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => { document.removeEventListener('visibilitychange', handleVisibilityChange); };
  }, [isSessionActive]);

  const cleanupAudio = () => {
    if (sourceRef.current) {
      try { sourceRef.current.stop(); } catch (e) { }
    }
    window.speechSynthesis.cancel();
    if (liveSessionRef.current) liveSessionRef.current = null;
    if (inputProcessorRef.current) { try { inputProcessorRef.current.disconnect(); } catch (e) { } inputProcessorRef.current = null; }
    if (mediaStreamRef.current) { try { mediaStreamRef.current.getTracks().forEach(track => track.stop()); } catch (e) { } mediaStreamRef.current = null; }
    if (liveInputContextRef.current) { try { liveInputContextRef.current.close(); } catch (e) { } liveInputContextRef.current = null; }
    if (audioContextRef.current) { try { audioContextRef.current.close(); } catch (e) { } audioContextRef.current = null; }
  };

  const handleFeedback = (rating: 'up' | 'down') => { console.log(`User rated session: ${rating}`); addPoints(5, t('coach.thanks_feedback'), 'COACH'); setShowFeedback(false); };

  const playImmediateGreeting = (text: string) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.0;
      utterance.lang = 'en-US';
      const voices = window.speechSynthesis.getVoices();
      const femaleVoice = voices.find(v => (v.lang === 'en-US' && (v.name.includes('Female') || v.name.includes('Google') || v.name.includes('Zira'))));
      if (femaleVoice) utterance.voice = femaleVoice;
      window.speechSynthesis.speak(utterance);
    }
  };

  const prefetchIntro = async () => {
    if (hasPrefetchedRef.current) return;
    hasPrefetchedRef.current = true;
    try {
      if (!audioContextRef.current) { audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)(); }
      const introText = "Hello! Ready to laugh?";
      const audioBase64 = await generateSpeech(introText, 'Kore');
      if (audioContextRef.current) { const audioBuffer = createAudioBufferFromPCM(audioContextRef.current, audioBase64); introBufferRef.current = audioBuffer; }
    } catch (e) { console.warn("Prefetch failed", e); }
  };

  const { startSession: startLiveSessionLowLatency, stopSession: stopLiveSessionLowLatency, isSessionActive: isLiveSessionActive, isLoading: isLiveSessionLoading, volumeLevel } = useLiveSession({
    onSessionEnd: () => { stopSession(); },
    onError: (err) => { setError(err); },
    onAudioStart: () => { if ('speechSynthesis' in window) { window.speechSynthesis.cancel(); } }
  });

  const startLiveSession = async () => {
    cleanupAudio();
    playImmediateGreeting(t('coach.live_session_start'));
    const apiKey = process.env.API_KEY;
    if (!apiKey) { setError(t('coach.live_unavailable')); setIsMissingKey(true); return; }
    setSessionType('LIVE'); setIsSessionActive(true); startLiveSessionLowLatency(apiKey);
  };

  // --- ROBUST QUICK SESSION HANDLER (With Fallback) ---
  const handleQuickSession = async () => {

    // 0. Check API Key
    const apiKey = process.env.API_KEY;
    if (!apiKey) {
      setError(t('coach.live_unavailable'));
      setIsMissingKey(true);
      return;
    }
    // 1. Immediate Feedback (Browser TTS)
    playImmediateGreeting(t('coach.quick_session_start'));

    // 2. Reset State
    cleanupAudio();

    // 2. Immediate feedback (Browser TTS)
    playImmediateGreeting(t('coach.quick_session_start_2'));

    setIsSessionLoading(true);
    setIsSessionActive(true);
    setSessionType('QUICK');
    setError(null);
    setUsingOfflineVoice(false);
    setIsMissingKey(false);

    try {
      // 3. Get Script
      const script = await getGuidedSessionScript();

      let audioBase64 = null;

      // 4. Try AI Generation first
      try {
        audioBase64 = await generateSpeech(script, 'Kore');
      } catch (ttsErr: any) {
        console.warn("AI TTS Failed/Rate Limited, switching to Browser TTS:", ttsErr);
      }

      if (audioBase64) {
        // --- AI AUDIO PATH ---
        if (!audioContextRef.current) {
          audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
        }
        if (audioContextRef.current.state === 'suspended') {
          await audioContextRef.current.resume();
        }

        const audioBuffer = createAudioBufferFromPCM(audioContextRef.current, audioBase64);
        const source = audioContextRef.current.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(audioContextRef.current.destination);

        source.onended = () => stopSession();

        window.speechSynthesis.cancel(); // Stop greeting
        sourceRef.current = source;
        source.start(0);
        setIsSessionLoading(false);

      } else {
        // --- FALLBACK BROWSER TTS PATH ---
        setUsingOfflineVoice(true);
        window.speechSynthesis.cancel(); // Stop greeting

        const utterance = new SpeechSynthesisUtterance(script);
        utterance.rate = 1.0;
        utterance.pitch = 1.1; // Slightly cheerful pitch

        const voices = window.speechSynthesis.getVoices();
        const femaleVoice = voices.find(v => v.name.includes('Female') || v.name.includes('Google US English'));
        if (femaleVoice) utterance.voice = femaleVoice;

        utterance.onstart = () => setIsSessionLoading(false);
        utterance.onend = () => stopSession();
        utterance.onerror = (e) => {
          console.error("Browser TTS failed", e);
          stopSession();
        };

        window.speechSynthesis.speak(utterance);
      }

    } catch (e: any) {
      console.error("Critical Session Error:", e);
      setError(t('coach.session_error'));
      stopSession();
    }
  };

  const stopSession = () => {
    if ('speechSynthesis' in window) { window.speechSynthesis.cancel(); }

    const completedSessionType = sessionTypeRef.current;
    if (!completedSessionType && !isSessionActive) return;

    sessionTypeRef.current = null; // Break loop

    if (completedSessionType === 'LIVE') {
      try { stopLiveSessionLowLatency(); } catch (e) { }
    }

    cleanupAudio();
    setIsSessionActive(false);
    setIsSessionLoading(false);
    setSessionType(null);

    if (completedSessionType) {
      addPoints(completedSessionType === 'LIVE' ? 30 : 20, t('coach.session_completed'), 'COACH');
      setTimeout(() => setShowFeedback(true), 500);
    }
  };

  // --- RECORDING LOGIC ---
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
          const base64Data = base64String.includes(',') ? base64String.split(',')[1] : base64String;
          analyzeAudio(base64Data, audioBlob.type || 'audio/webm');
        };
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      console.error("Microphone error:", err);
      setError(t('coach.mic_permission'));
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setIsAnalyzing(true);
    } else {
      setIsRecording(false);
    }
  };

  const analyzeAudio = async (base64: string, mimeType: string) => {
    try {
      const result = await rateLaughter(base64, mimeType);
      setScoreData(result);
      if (result.score > 0) {
        const newItem: HistoryItem = { id: Date.now(), timestamp: Date.now(), score: result.score, energyLevel: result.energyLevel };
        setHistory(prev => [newItem, ...prev]);
        addPoints(15, t('coach.laughter_analyzed'), 'COACH');
      }
    } catch (err: any) {
      // Handle Quota/Error Fallback
      const errorMsg = err.message || "";
      if (errorMsg.includes("MISSING_GEMINI_KEY") || errorMsg.includes("429") || errorMsg.includes("Quota") || errorMsg.includes("RESOURCE_EXHAUSTED")) {
        setScoreData({
          score: 85,
          feedback: t('coach.offline_feedback'),
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

  const clearHistory = () => { if (window.confirm(t('coach.clear_confirm'))) { setHistory([]); } };

  // --- BUTTON STYLING HELPERS ---
  const getOutlineButtonStyle = () => {
    if (colorTheme === 'pastel') {
      return "bg-white text-[#5B5166] border-2 border-[#B8B8D0] hover:bg-[#B8B8D0] hover:text-white hover:border-[#B8B8D0]";
    } else {
      return "bg-white text-[#8B3A3A] border-2 border-[#8B3A3A] hover:bg-[#8B3A3A] hover:text-white hover:border-[#8B3A3A]";
    }
  };

  const getActiveButtonStyle = () => {
    if (colorTheme === 'pastel') {
      return "bg-[#B8B8D0] text-white border-2 border-[#B8B8D0]";
    } else {
      return "bg-[#8B3A3A] text-white border-2 border-[#8B3A3A]";
    }
  };

  return (
    <div className="flex flex-col items-center min-h-[70vh] p-6 pb-32 space-y-8 animate-in fade-in duration-500 relative">

      {/* Feedback Modal */}
      {showFeedback && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-pop-in">
          <div className="bg-white dark:bg-slate-800 rounded-[2rem] p-6 w-full max-w-xs shadow-2xl relative border-4 border-[#EDE8F8] dark:border-slate-700 text-center">
            <div className={`absolute top-0 left-0 w-full h-2 bg-gradient-to-r ${currentTheme.VIDEO_RING_1} ${currentTheme.VIDEO_RING_2}`}></div>
            <h3 className="text-xl font-fredoka font-bold text-gray-700 dark:text-gray-100 mb-2 mt-2">{t('coach.how_was_it')}</h3>
            <p className={`text-sm ${currentTheme.TEXT_PRIMARY} mb-6`}>{t('coach.help_improve')}</p>
            <div className="flex gap-4 justify-center">
              <button onClick={() => handleFeedback('down')} className="p-4 rounded-2xl bg-red-50 dark:bg-red-900/30 text-red-400 hover:bg-red-100 transition-all active:scale-95 border border-red-100"><ThumbsDown size={32} /></button>
              <button onClick={() => handleFeedback('up')} className="p-4 rounded-2xl bg-green-50 dark:bg-green-900/30 text-green-500 hover:bg-green-100 transition-all active:scale-95 border border-green-100"><ThumbsUp size={32} /></button>
            </div>
            <button onClick={() => setShowFeedback(false)} className="mt-6 text-xs font-bold text-gray-400 underline decoration-dashed">{t('coach.skip_feedback')}</button>
          </div>
        </div>
      )}

      {/* Error Message (Dismissible) */}
      {error && (
        <div className="bg-red-100 border border-red-200 text-red-600 px-4 py-3 rounded-xl animate-fade-in-up flex items-center gap-2 max-w-sm w-full text-sm z-20">
          <WifiOff size={16} />
          <span className="flex-1">{error}</span>
          <button onClick={() => setError(null)} className="ml-auto hover:bg-red-200 rounded-full p-1"><X size={14} /></button>
        </div>
      )}

      {/* Session Controls */}
      <div className="w-full max-w-sm space-y-3 animate-fade-in-up">

        {/* Live Session Button */}
        <button
          onClick={() => isSessionActive && sessionType === 'LIVE' ? stopSession() : startLiveSession()}
          disabled={isSessionLoading || isRecording || (isSessionActive && sessionType !== 'LIVE')}
          className={`w-full p-4 rounded-2xl shadow-lg flex items-center justify-between transition-all transform active:scale-95 border-2 hover:scale-[1.02] 
            ${isSessionActive && sessionType === 'LIVE' ? getActiveButtonStyle() : getOutlineButtonStyle()}
            ${isSessionActive && sessionType !== 'LIVE' ? 'opacity-50' : ''}
          `}
        >
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-full ${isSessionActive && sessionType === 'LIVE' ? 'bg-white/20 text-white' : `${currentTheme.ICON_BG} ${currentTheme.ICON_COLOR}`}`}>
              {isSessionLoading && sessionType === 'LIVE' ? <Loader2 size={24} className="animate-spin" /> :
                isSessionActive && sessionType === 'LIVE' ? <StopCircle size={24} fill="currentColor" /> :
                  <Mic size={24} />}
            </div>
            <div className="text-left">
              <h3 className="font-bold">
                {isSessionActive && sessionType === 'LIVE' ? t('coach.stop_session') : t('coach.live_session_btn')}
              </h3>
              <p className={`text-xs ${isSessionActive && sessionType === 'LIVE' ? 'opacity-80' : 'text-gray-500'}`}>{t('coach.interactive')}</p>
            </div>
          </div>
        </button>

        {/* Quick Laugh Button */}
        <button
          onMouseEnter={prefetchIntro}
          onClick={() => isSessionActive && sessionType === 'QUICK' ? stopSession() : handleQuickSession()}
          disabled={isSessionLoading || isRecording || (isSessionActive && sessionType !== 'QUICK')}
          className={`w-full p-4 rounded-2xl shadow-lg flex items-center justify-between transition-all transform active:scale-95 border-2 hover:scale-[1.02]
             ${isSessionActive && sessionType === 'QUICK' ? getActiveButtonStyle() : getOutlineButtonStyle()}
             ${isSessionActive && sessionType !== 'QUICK' ? 'opacity-50' : ''}
          `}
        >
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-full ${isSessionActive && sessionType === 'QUICK' ? 'bg-white/20 text-white' : `${currentTheme.ICON_BG} ${currentTheme.ICON_COLOR}`}`}>
              {isSessionLoading && sessionType === 'QUICK' ? <Loader2 size={24} className="animate-spin" /> :
                isSessionActive && sessionType === 'QUICK' ? <StopCircle size={24} fill="currentColor" /> :
                  <Zap size={24} fill="currentColor" />}
            </div>
            <div className="text-left">
              <h3 className="font-bold">
                {isSessionActive && sessionType === 'QUICK' ? t('coach.stop_session') : t('coach.quick_laugh')}
              </h3>
              <p className={`text-xs ${isSessionActive && sessionType === 'QUICK' ? 'opacity-80' : 'text-gray-500'}`}>
                {usingOfflineVoice ? t('coach.offline_voice_saver') : t('coach.guided_boost')}
              </p>
            </div>
          </div>
        </button>

      </div>

      <div className="text-center space-y-2 animate-pop-in delay-200">
        <h2 className={`text-4xl font-fredoka font-bold ${currentTheme.TEXT_PRIMARY} drop-shadow-sm`}>{t('coach.title')}</h2>
        <p className={`${currentTheme.TEXT_PRIMARY} font-medium`}>{t('coach.subtitle')}</p>
      </div>

      {/* Interactive Visualizer */}
      <div className="relative w-72 h-72 flex items-center justify-center animate-pop-in delay-300">
        {/* Ripples */}
        {(isRecording || isSessionActive) && (
          <>
            <div className={`absolute w-full h-full rounded-full opacity-20 animate-[ping_1.5s_cubic-bezier(0,0,0.2,1)_infinite] ${currentTheme.VIDEO_RING_1}`}></div>
            <div className={`absolute w-3/4 h-3/4 rounded-full opacity-30 animate-[ping_2s_cubic-bezier(0,0,0.2,1)_infinite] ${currentTheme.VIDEO_RING_2}`}></div>
          </>
        )}

        {/* Main Circle */}
        <div className={`relative w-56 h-56 rounded-full bg-gradient-to-br ${currentTheme.ICON_BG} to-white dark:from-slate-700 dark:to-slate-600 flex items-center justify-center shadow-inner border-4 border-white dark:border-slate-500 transition-all duration-300 ${isRecording || isSessionActive ? 'scale-110 shadow-lg animate-bounce-gentle' : 'animate-float'}`}>
          <div className="absolute w-44 h-44 rounded-full bg-white dark:bg-slate-800 flex items-center justify-center shadow-lg overflow-hidden p-4">
            {isAnalyzing ? (
              <div className="flex flex-col items-center">
                <Loader2 className={`w-12 h-12 ${currentTheme.TEXT_ACCENT} animate-spin mb-2`} />
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
                <span className={`block text-6xl font-black ${currentTheme.TEXT_PRIMARY}`}>{scoreData.score}</span>
                <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">{t('coach.joy_score')}</span>
              </div>
            ) : isSessionActive ? (
              <div className="text-center flex flex-col items-center">
                {sessionType === 'LIVE' ? <Mic className="w-10 h-10 text-purple-400 mb-2 animate-pulse" /> : <Volume2 className={`w-10 h-10 ${currentTheme.TEXT_ACCENT} mb-2 animate-pulse`} />}
                <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                  {sessionType === 'LIVE' ? t('coach.ai_listening') : t('coach.listen_laugh')}
                </span>
              </div>
            ) : (
              <div className="text-center">
                <Sparkles className={`w-16 h-16 mx-auto mb-2 transition-colors duration-300 ${isRecording ? `${currentTheme.TEXT_PRIMARY} animate-spin-slow` : 'text-gray-200 dark:text-slate-600'}`} />
                <span className={`text-xs font-bold uppercase tracking-wider ${isRecording ? currentTheme.TEXT_PRIMARY : 'text-gray-300 dark:text-slate-500'}`}>
                  {isRecording ? t('coach.listening') : t('coach.ready')}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Controls - Updated to use Outline Style */}
      <div className="space-y-4 w-full max-w-xs text-center z-10">
        {!isRecording && !isAnalyzing && !scoreData && !isSessionActive && (
          <button
            onClick={startRecording}
            className={`w-full font-bold py-4 rounded-2xl shadow-md transform transition-all hover:scale-105 active:scale-95 flex items-center justify-center gap-3 text-lg animate-fade-in-up delay-400 ${getOutlineButtonStyle()}`}
          >
            <Mic size={24} /> {t('coach.rate_my_laugh')}
          </button>
        )}

        {isRecording && (
          <button
            onClick={stopRecording}
            className={`w-full font-bold py-5 rounded-2xl shadow-lg transform transition active:scale-95 flex items-center justify-center gap-3 text-xl animate-pulse ${getActiveButtonStyle()}`}
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
                className={`${currentTheme.BUTTON} font-bold py-3 px-6 rounded-xl hover:brightness-105 transition-colors shadow-md`}
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
                <div className={`text-xs font-bold ${currentTheme.TEXT_ACCENT} px-2 py-1 bg-gray-100 rounded-lg`}>
                  {item.energyLevel}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Voice Chat Widget Overlay */}
      {showVoiceChat && (
        <VoiceChatWidget onClose={() => setShowVoiceChat(false)} />
      )}
    </div>
  );
};