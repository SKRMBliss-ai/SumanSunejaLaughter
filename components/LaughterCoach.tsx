import React, { useState, useRef, useEffect } from 'react';
import { Mic, Square, Sparkles, Loader2, RotateCcw, Trophy, Key, Calendar, Clock, Trash2, StopCircle, Volume2, Zap, ThumbsUp, ThumbsDown, WifiOff } from 'lucide-react';
import { GoogleGenAI, LiveServerMessage, Modality } from "@google/genai";
import { rateLaughter, getGuidedSessionScript, generateSpeech, createAudioBufferFromPCM } from '../services/geminiService';
import { LaughterScore } from '../types';
import { addPoints } from '../services/rewardService';
import { useSettings, SUPPORTED_LANGUAGES } from '../contexts/SettingsContext';

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
  const { t, language } = useSettings();

  // --- DEBUG HELPER ---
  // This confirms if the key was successfully injected
  const getDebugKeyInfo = () => {
    let key = import.meta.env.VITE_GEMINI_API_KEY;
    let source = "Build Env";

    // Check runtime injection
    if (!key && typeof window !== 'undefined' && (window as any).__GEMINI_API_KEY__) {
      key = (window as any).__GEMINI_API_KEY__;
      source = "Window Object (Injected)";
    }

    if (!key) return "❌ KEY NOT FOUND - Injection Failed";
    if (key.length < 10) return "❌ KEY INVALID";
    return `✅ ${source} | Ends with: ...${key.slice(-4)}`;
  };

  // State
  const [isRecording, setIsRecording] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [scoreData, setScoreData] = useState<LaughterScore | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isMissingKey, setIsMissingKey] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const [usingOfflineVoice, setUsingOfflineVoice] = useState(false);
  const [isSessionLoading, setIsSessionLoading] = useState(false);
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [sessionType, setSessionType] = useState<'LIVE' | 'QUICK' | null>(null);

  // Refs
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

  const [history, setHistory] = useState<HistoryItem[]>(() => {
    try {
      const saved = localStorage.getItem('laughterHistory');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

  useEffect(() => { return () => cleanupAudio(); }, []);
  useEffect(() => { sessionTypeRef.current = sessionType; }, [sessionType]);
  useEffect(() => { localStorage.setItem('laughterHistory', JSON.stringify(history)); }, [history]);

  const cleanupAudio = () => {
    if (sourceRef.current) sourceRef.current.stop();
    window.speechSynthesis.cancel();
    if (liveSessionRef.current) liveSessionRef.current = null;
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
    addPoints(5, t('coach.thanks_feedback'), 'COACH');
    setShowFeedback(false);
  };

  // --- CORRECTED LIVE SESSION LOGIC ---
  const startLiveSession = async () => {
    // 1. Get Key with Fallback (The fix!)
    let apiKey = import.meta.env.VITE_GEMINI_API_KEY;
    if (!apiKey && typeof window !== 'undefined' && (window as any).__GEMINI_API_KEY__) {
      apiKey = (window as any).__GEMINI_API_KEY__;
    }

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
      liveInputContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      nextStartTimeRef.current = 0;

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;

      const ai = new GoogleGenAI({ apiKey });

      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } },
          },
          systemInstruction: `You are Suman Suneja, an energetic Laughter Yoga Coach. Keep responses VERY SHORT. Speak in ${SUPPORTED_LANGUAGES.find(l => l.code === language)?.label || 'English'}.`,
        },
        callbacks: {
          onopen: () => {
            setIsSessionLoading(false);
            if (!liveInputContextRef.current) return;
            const source = liveInputContextRef.current.createMediaStreamSource(stream);
            // Latency optimized buffer size (512 for speed)
            const processor = liveInputContextRef.current.createScriptProcessor(512, 1, 1);
            inputProcessorRef.current = processor;

            processor.onaudioprocess = (e) => {
              const inputData = e.inputBuffer.getChannelData(0);
              const pcmBlob = createBlob(inputData);
              sessionPromise.then((session) => session.sendRealtimeInput({ media: pcmBlob }));
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
              for (let i = 0; i < dataInt16.length; i++) { float32[i] = dataInt16[i] / 32768.0; }
              const buffer = ctx.createBuffer(1, float32.length, 24000);
              buffer.getChannelData(0).set(float32);
              const source = ctx.createBufferSource();
              source.buffer = buffer;
              source.connect(ctx.destination);
              const currentTime = ctx.currentTime;
              if (nextStartTimeRef.current < currentTime) nextStartTimeRef.current = currentTime;
              source.start(nextStartTimeRef.current);
              nextStartTimeRef.current += buffer.duration;
            }
          },
          onclose: () => stopSession(),
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

  const handleQuickSession = async () => {
    cleanupAudio();
    setIsSessionLoading(true);
    setIsSessionActive(true);
    setSessionType('QUICK');
    setError(null);
    setUsingOfflineVoice(false);
    setIsMissingKey(false);

    try {
      const script = await getGuidedSessionScript(language);
      if (!audioContextRef.current) audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      if (audioContextRef.current.state === 'suspended') await audioContextRef.current.resume();

      try {
        const audioBase64 = await generateSpeech(script, 'Kore');
        if (!audioContextRef.current) return;
        const audioBuffer = createAudioBufferFromPCM(audioContextRef.current, audioBase64);
        const source = audioContextRef.current.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(audioContextRef.current.destination);
        source.onended = () => stopSession();
        sourceRef.current = source;
        source.start(0);
        setIsSessionLoading(false);
      } catch (geminiError: any) {
        setUsingOfflineVoice(true);
        setError(null);
        const utterance = new SpeechSynthesisUtterance(script);
        utterance.onend = () => stopSession();
        setIsSessionLoading(false);
        window.speechSynthesis.speak(utterance);
      }
    } catch (e) {
      setError(t('coach.session_error'));
      stopSession();
    }
  };

  const stopSession = () => {
    cleanupAudio();
    const wasActive = isSessionActive;
    setIsSessionActive(false);
    setIsSessionLoading(false);
    const completedSessionType = sessionTypeRef.current;
    setSessionType(null);
    if (completedSessionType && wasActive) {
      addPoints(completedSessionType === 'LIVE' ? 30 : 20, t('coach.session_completed'), 'COACH');
      setTimeout(() => setShowFeedback(true), 500);
    }
  };

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
      mediaRecorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
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
        const newItem: HistoryItem = { id: Date.now(), timestamp: Date.now(), score: result.score, energyLevel: result.energyLevel };
        setHistory(prev => [newItem, ...prev]);
        addPoints(15, t('coach.laughter_analyzed'), 'COACH');
      }
    } catch (err: any) {
      if (err.message === "MISSING_GEMINI_KEY") {
        setScoreData({ score: 85, feedback: "Joyful! (Offline Mode)", energyLevel: "High" });
        setUsingOfflineVoice(true);
      } else {
        setError(t('coach.analyze_error'));
      }
    } finally {
      setIsAnalyzing(false);
    }
  };

  const clearHistory = () => {
    if (window.confirm(t('coach.clear_confirm'))) setHistory([]);
  };

  return (
    <div className="flex flex-col items-center min-h-[70vh] p-6 pb-32 space-y-8 animate-in fade-in duration-500 relative">
      {showFeedback && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-pop-in">
          <div className="bg-white dark:bg-slate-800 rounded-[2rem] p-6 w-full max-w-xs shadow-2xl relative border-4 border-[#EDE8F8] dark:border-slate-700 text-center">
            <h3 className="text-xl font-bold mb-2">{t('coach.how_was_it')}</h3>
            <div className="flex gap-4 justify-center mb-4">
              <button onClick={() => handleFeedback('down')} className="p-4 rounded-2xl bg-red-50 text-red-400"><ThumbsDown size={32} /></button>
              <button onClick={() => handleFeedback('up')} className="p-4 rounded-2xl bg-green-50 text-green-500"><ThumbsUp size={32} /></button>
            </div>
            <button onClick={() => setShowFeedback(false)} className="text-xs text-gray-400 underline">{t('coach.skip_feedback')}</button>
          </div>
        </div>
      )}

      <div className="w-full max-w-sm space-y-3 animate-fade-in-up">
        <button onClick={() => isSessionActive && sessionType === 'LIVE' ? stopSession() : startLiveSession()} disabled={isSessionLoading || isRecording || (isSessionActive && sessionType !== 'LIVE')} className={`w-full p-4 rounded-2xl shadow-lg flex items-center justify-between border-2 ${isSessionActive && sessionType === 'LIVE' ? 'border-purple-400 ring-4 ring-purple-100 text-purple-700' : 'bg-white dark:bg-slate-800 border-purple-100 text-purple-600'} ${isSessionActive && sessionType !== 'LIVE' ? 'opacity-50' : ''}`}>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-full bg-purple-100 text-purple-600">
              {isSessionLoading && sessionType === 'LIVE' ? <Loader2 size={24} className="animate-spin" /> : isSessionActive && sessionType === 'LIVE' ? <StopCircle size={24} /> : <Mic size={24} />}
            </div>
            <div className="text-left"><h3 className="font-bold">{t('coach.start_live')}</h3><p className="text-xs opacity-70">{t('coach.interactive')}</p></div>
          </div>
        </button>

        <button onClick={() => isSessionActive && sessionType === 'QUICK' ? stopSession() : handleQuickSession()} disabled={isSessionLoading || isRecording || (isSessionActive && sessionType !== 'QUICK')} className={`w-full p-4 rounded-2xl shadow-lg flex items-center justify-between border-2 ${isSessionActive && sessionType === 'QUICK' ? 'border-teal-400 ring-4 ring-teal-100 text-teal-700' : 'bg-gradient-to-r from-[#ABCEC9] to-[#C3B8D5] text-white border-transparent'} ${isSessionActive && sessionType !== 'QUICK' ? 'opacity-50' : ''}`}>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-full bg-white/20 text-white">
              {isSessionLoading && sessionType === 'QUICK' ? <Loader2 size={24} className="animate-spin" /> : isSessionActive && sessionType === 'QUICK' ? <StopCircle size={24} /> : <Zap size={24} />}
            </div>
            <div className="text-left"><h3 className="font-bold">{t('coach.quick_laugh')}</h3><p className="text-xs opacity-80">{t('coach.guided_boost')}</p></div>
          </div>
        </button>
      </div>

      <div className="text-center space-y-2">
        <h2 className="text-4xl font-fredoka font-bold text-[#C3B8D5]">{t('coach.title')}</h2>
        <p className="text-[#AABBCC] font-medium">{t('coach.subtitle')}</p>
      </div>

      <div className="relative w-72 h-72 flex items-center justify-center">
        <div className={`relative w-56 h-56 rounded-full bg-gradient-to-br from-[#EDE8F8] to-white shadow-inner border-4 border-white flex items-center justify-center transition-all duration-300 ${isRecording || isSessionActive ? 'scale-110 shadow-lg animate-bounce-gentle' : ''}`}>
          {isAnalyzing ? <Loader2 className="w-12 h-12 text-[#ABCEC9] animate-spin" /> : 
           isMissingKey ? <div className="text-center"><Key className="w-10 h-10 text-red-400 mb-2 animate-bounce" /><span className="text-xs font-bold text-red-500">{t('coach.api_missing')}</span></div> :
           scoreData ? <div className="text-center"><span className="block text-6xl font-black text-[#ABCEC9]">{scoreData.score}</span><span className="text-xs font-bold text-gray-400">{t('coach.joy_score')}</span></div> :
           <Sparkles className="w-16 h-16 text-[#C3B8D5]" />}
        </div>
      </div>

      <div className="space-y-4 w-full max-w-xs text-center z-10">
        {!isRecording && !isAnalyzing && !scoreData && !isSessionActive && (
          <button onClick={startRecording} className="w-full bg-white border-2 border-[#ABCEC9] text-[#ABCEC9] font-bold py-4 rounded-2xl shadow-md flex items-center justify-center gap-3">
            <Mic size={24} /> {t('coach.rate_my_laugh')}
          </button>
        )}
        {isRecording && (
          <button onClick={stopRecording} className="w-full bg-white border-2 border-[#C3B8D5] text-[#C3B8D5] font-bold py-5 rounded-2xl shadow-lg animate-pulse flex items-center justify-center gap-3">
            <Square fill="currentColor" size={20} /> {t('coach.stop_rate')}
          </button>
        )}
        {scoreData && (
          <button onClick={() => setScoreData(null)} className="w-full bg-white text-gray-500 font-bold py-3 rounded-xl hover:text-[#ABCEC9] flex items-center justify-center gap-2">
            <RotateCcw size={18} /> {t('coach.play_again')}
          </button>
        )}
        
        {/* DEBUG INFO */}
        <div className="mt-4 p-2 bg-gray-100 dark:bg-slate-900 rounded-lg border border-gray-300 dark:border-slate-600">
          <p className="text-[10px] text-gray-500 dark:text-gray-400 font-mono text-center break-all">
            {getDebugKeyInfo()}
          </p>
        </div>

        {error && (
          <div className="text-red-500 text-sm font-bold bg-red-50 p-3 rounded-xl border border-red-100 flex items-center justify-center gap-2">
            <Key size={16} /> {error}
          </div>
        )}
      </div>

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
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-md ${item.score >= 80 ? 'bg-[#ABCEC9]' : item.score >= 50 ? 'bg-[#C3B8D5]' : 'bg-[#AABBCC]'}`}>
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
