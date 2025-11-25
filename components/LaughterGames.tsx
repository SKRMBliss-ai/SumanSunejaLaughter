import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, Volume2, Sparkles, Loader2, Music, Wand2, RefreshCw, Zap, Bot, Mic, Smile, AlertCircle, WifiOff } from 'lucide-react';
import { generateHumor, generateSpeech, createAudioBufferFromPCM } from '../services/geminiService';
import { addPoints } from '../services/rewardService';

export const LaughterGames: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'GENERATOR' | 'MOOD' | 'JOKES'>('GENERATOR');
  const [topic, setTopic] = useState('');
  const [currentText, setCurrentText] = useState<string | null>(null);
  const [currentAudio, setCurrentAudio] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [usingFallbackVoice, setUsingFallbackVoice] = useState(false);

  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<AudioBufferSourceNode | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number | null>(null);

  useEffect(() => {
    // Initialize AudioContext
    audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    analyserRef.current = audioContextRef.current.createAnalyser();
    analyserRef.current.fftSize = 256;

    // Trigger energy mood when entering games
    window.dispatchEvent(new CustomEvent('MUSIC_MOOD', { detail: 'ENERGY' }));

    return () => {
      stopAudio();
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      // Revert to Calm when leaving games
      window.dispatchEvent(new CustomEvent('MUSIC_MOOD', { detail: 'CALM' }));
    };
  }, []);

  const stopAudio = () => {
    if (sourceRef.current) {
      try {
        sourceRef.current.stop();
      } catch (e) {
        // Ignore errors if already stopped
      }
      sourceRef.current = null;
    }
    window.speechSynthesis.cancel();
    setIsPlaying(false);
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
  };

  const drawVisualizer = () => {
    if (!canvasRef.current || !analyserRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const bufferLength = analyserRef.current.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const draw = () => {
      animationFrameRef.current = requestAnimationFrame(draw);
      analyserRef.current!.getByteFrequencyData(dataArray);

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;
      const radius = 30; // Base radius

      ctx.beginPath();
      // Create a dynamic circle based on audio data
      let sum = 0;
      for (let i = 0; i < bufferLength; i++) {
        sum += dataArray[i];
      }
      const average = sum / bufferLength;
      const dynamicRadius = radius + (average / 1.5); // More sensitive bounce

      ctx.arc(centerX, centerY, dynamicRadius, 0, 2 * Math.PI);
      ctx.fillStyle = activeTab === 'JOKES' ? '#FCA5A5' : '#ABCEC9';
      ctx.fill();

      // Outer glow/pulse
      ctx.beginPath();
      ctx.arc(centerX, centerY, dynamicRadius + 15, 0, 2 * Math.PI);
      ctx.fillStyle = activeTab === 'JOKES' ? 'rgba(252, 165, 165, 0.4)' : 'rgba(195, 184, 213, 0.4)';
      ctx.fill();

      // Fun particles if loud enough
      if (average > 30) {
        ctx.fillStyle = activeTab === 'JOKES' ? '#FECACA' : '#E0E7FF';
        for (let i = 0; i < 3; i++) {
          const px = centerX + (Math.random() - 0.5) * dynamicRadius * 2.5;
          const py = centerY + (Math.random() - 0.5) * dynamicRadius * 2.5;
          ctx.fillRect(px, py, 4, 4);
        }
      }
    };

    draw();
  };

  const playAudio = async (base64Audio: string) => {
    if (!audioContextRef.current) return;

    try {
      if (audioContextRef.current.state === 'suspended') {
        await audioContextRef.current.resume();
      }

      stopAudio();

      // Decode the audio manually since Gemini returns raw PCM without headers
      const audioBuffer = createAudioBufferFromPCM(audioContextRef.current, base64Audio);

      const source = audioContextRef.current.createBufferSource();
      source.buffer = audioBuffer;

      // Connect to analyser and destination
      if (analyserRef.current) {
        source.connect(analyserRef.current);
        analyserRef.current.connect(audioContextRef.current.destination);
      } else {
        source.connect(audioContextRef.current.destination);
      }

      source.onended = () => {
        setIsPlaying(false);
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
          animationFrameRef.current = null;
        }
      };

      sourceRef.current = source;
      source.start(0);
      setIsPlaying(true);
      drawVisualizer();

    } catch (e) {
      console.error("Audio playback failed", e);
      setIsPlaying(false);
      // Fallback if needed, though raw PCM decode should work
      if (currentText) fallbackSpeak(currentText);
    }
  };

  const fallbackSpeak = (text: string) => {
    console.warn("Using browser fallback for speech");
    setUsingFallbackVoice(true);

    const utterance = new SpeechSynthesisUtterance(text);

    // Pick a high quality voice if available
    const voices = window.speechSynthesis.getVoices();
    // Prioritize natural sounding female voices
    const preferredVoice = voices.find(v =>
      v.name.includes('Google UK English Female') ||
      v.name.includes('Google US English') ||
      v.name.includes('Samantha') ||
      (v.name.includes('Female') && v.lang.includes('en'))
    );

    if (preferredVoice) {
      utterance.voice = preferredVoice;
    }

    utterance.rate = 1.05; // Slightly peppier
    utterance.pitch = 1.1; // Cheerful pitch
    utterance.volume = 1.0;

    utterance.onstart = () => setIsPlaying(true);
    utterance.onend = () => setIsPlaying(false);
    utterance.onerror = (e) => {
      console.error("Browser TTS Error", e);
      setIsPlaying(false);
    }

    // Set active immediately
    setIsPlaying(true);
    window.speechSynthesis.speak(utterance);
  };

  const handleGenerate = async (type: 'story' | 'joke' = 'story') => {
    if (!topic.trim()) return;

    setIsLoading(true);
    setCurrentText(null);
    setCurrentAudio(null);
    setError(null);
    setUsingFallbackVoice(false);
    stopAudio();

    try {
      // 1. Text Generation
      const text = await generateHumor(topic, type);
      setCurrentText(text);

      // 2. Audio Generation
      try {
        // Use 'Kore' for both stories and jokes to provide a realistic, human-like female voice
        const audioBase64 = await generateSpeech(text, 'Kore');
        setCurrentAudio(audioBase64);
        await playAudio(audioBase64);
      } catch (speechErr: any) {
        console.warn("Gemini TTS failed, using fallback", speechErr);
        fallbackSpeak(text);
      }

      // 4. Reward
      addPoints(10, "Laughter Lab Experiment", 'GAME');

    } catch (e) {
      console.error(e);
      // Fallback for text generation error or network error
      if (e instanceof Error && e.message === "MISSING_GEMINI_KEY") {
        setError("Using offline mode (API Key missing)");
        const offlineText = "I can't access my comedy brain right now, but I can still laugh! Ha ha ha! Bwahaha!";
        setCurrentText(offlineText);
        fallbackSpeak(offlineText);
      } else {
        setError("Connection issue. Try again!");
        setCurrentText("Oops! Something went wrong. But keep smiling!");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleMood = async (mood: string) => {
    setIsLoading(true);
    setCurrentText(null);
    setCurrentAudio(null);
    setError(null);
    setUsingFallbackVoice(false);
    stopAudio();

    // Trigger dynamic music change
    window.dispatchEvent(new CustomEvent('MUSIC_MOOD', { detail: 'ENERGY' }));

    try {
      const text = await generateHumor(`feeling ${mood}`, 'story');
      setCurrentText(text);

      try {
        // Force 'Kore' for all moods to ensure consistent realistic human voice
        const audioBase64 = await generateSpeech(text, 'Kore');
        setCurrentAudio(audioBase64);
        await playAudio(audioBase64);
      } catch (speechErr: any) {
        console.warn("Gemini TTS failed, using fallback", speechErr);
        fallbackSpeak(text);
      }

      addPoints(5, "Mood Lifted!", 'GAME');
    } catch (e) {
      console.error(e);
      if (e instanceof Error && e.message === "MISSING_GEMINI_KEY") {
        setError("Using offline mode");
        const offlineText = "Ha ha ha! Hee hee hee! Laughter is the best medicine, even offline!";
        setCurrentText(offlineText);
        fallbackSpeak(offlineText);
      } else {
        setCurrentText("Failed to generate mood laugh.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-4 pb-36 min-h-screen animate-fade-in-up">

      <div className="text-center mb-6 pt-4 animate-pop-in">
        <div className={`inline-block p-3 rounded-2xl mb-2 transition-colors ${activeTab === 'JOKES' ? 'bg-[#FCA5A5]/20' : 'bg-[#ABCEC9]/20'}`}>
          <Bot size={32} className={activeTab === 'JOKES' ? 'text-[#FCA5A5]' : 'text-[#ABCEC9]'} />
        </div>
        <h2 className="text-3xl font-fredoka font-bold text-gray-700 dark:text-gray-100">AI Laughter Lab</h2>
        <p className="text-[#AABBCC] font-medium text-sm">
          {activeTab === 'JOKES' ? 'One-Liner Joke Generator' : 'Experimental Joy Generator'}
        </p>
      </div>

      {/* Tab Switcher */}
      <div className="flex bg-white dark:bg-slate-800 p-1 rounded-2xl shadow-md border border-gray-100 dark:border-slate-700 mb-6 relative z-10 animate-fade-in-up delay-100">
        <button
          onClick={() => setActiveTab('GENERATOR')}
          className={`flex-1 py-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1 transition-all ${activeTab === 'GENERATOR' ? 'bg-[#C3B8D5] text-white shadow-md' : 'text-gray-400 dark:text-gray-400 hover:text-gray-600 dark:hover:text-gray-200'}`}
        >
          <Wand2 size={14} /> Story
        </button>
        <button
          onClick={() => setActiveTab('JOKES')}
          className={`flex-1 py-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1 transition-all ${activeTab === 'JOKES' ? 'bg-[#FCA5A5] text-white shadow-md' : 'text-gray-400 dark:text-gray-400 hover:text-gray-600 dark:hover:text-gray-200'}`}
        >
          <Smile size={14} /> Jokes
        </button>
        <button
          onClick={() => setActiveTab('MOOD')}
          className={`flex-1 py-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1 transition-all ${activeTab === 'MOOD' ? 'bg-[#ABCEC9] text-white shadow-md' : 'text-gray-400 dark:text-gray-400 hover:text-gray-600 dark:hover:text-gray-200'}`}
        >
          <Zap size={14} /> Moods
        </button>
      </div>

      {/* Main Display Area */}
      <div className={`bg-white dark:bg-slate-800 rounded-[2.5rem] p-6 shadow-xl border relative overflow-hidden min-h-[300px] h-auto flex flex-col items-center justify-center text-center transition-colors duration-500 animate-fade-in-up delay-200 ${activeTab === 'JOKES' ? 'border-red-100 dark:border-red-900' : 'border-[#EDE8F8] dark:border-slate-700'}`}>

        {/* Background Elements */}
        <div className={`absolute top-0 left-0 w-full h-full bg-gradient-to-b z-0 ${activeTab === 'JOKES' ? 'from-red-50 to-white dark:from-red-900/10 dark:to-slate-800' : 'from-[#F5F3FA] to-white dark:from-slate-700 dark:to-slate-800'}`}></div>
        <div className={`absolute top-[-50px] right-[-50px] w-40 h-40 rounded-full blur-3xl z-0 ${activeTab === 'JOKES' ? 'bg-red-200/20' : 'bg-[#ABCEC9]/10'}`}></div>

        {/* Visualizer Canvas */}
        <div className="relative z-10 w-full h-32 flex items-center justify-center mb-4 shrink-0">
          {isPlaying ? (
            // Only show visualizer if AudioContext is being used (not fallback)
            sourceRef.current ? (
              <canvas ref={canvasRef} width={200} height={150} className="w-full h-full" />
            ) : (
              <div className="flex flex-col items-center justify-center gap-2 text-[#ABCEC9] animate-[pulse_1s_infinite]">
                <Volume2 size={48} />
                <span className="text-xs font-bold uppercase tracking-widest text-gray-500 dark:text-gray-300">Speaking...</span>
              </div>
            )
          ) : (
            <div className={`w-24 h-24 rounded-full bg-gray-50 dark:bg-slate-700 border-4 border-dashed flex items-center justify-center transition-colors ${activeTab === 'JOKES' ? 'border-red-200 dark:border-red-900' : 'border-[#C3B8D5]/30 dark:border-slate-600'} animate-float`}>
              <Music size={32} className={activeTab === 'JOKES' ? 'text-red-200' : 'text-[#C3B8D5]'} />
            </div>
          )}
        </div>

        {/* Output Text */}
        <div className="relative z-10 w-full min-h-[80px] flex flex-col items-center justify-center">
          {isLoading ? (
            <div className="flex flex-col items-center gap-2">
              <Loader2 size={32} className={`animate-spin ${activeTab === 'JOKES' ? 'text-red-300' : 'text-[#ABCEC9]'}`} />
              <span className="text-xs font-bold text-gray-400 animate-pulse">
                {activeTab === 'JOKES' ? "Writing a zinger..." : "Brewing Laughter..."}
              </span>
            </div>
          ) : currentText ? (
            <div className="animate-pop-in flex flex-col items-center gap-3 w-full">
              <p className="text-lg font-bold text-gray-700 dark:text-gray-200 leading-snug break-words w-full">"{currentText}"</p>

              <div className="flex flex-wrap justify-center gap-2 mt-1">
                <span className="text-[0.65rem] font-bold text-[#AABBCC] uppercase tracking-widest bg-[#F5F3FA] dark:bg-slate-700 px-2 py-1 rounded-md">
                  {activeTab === 'JOKES' ? 'Funny Mode' : 'AI Mode'}
                </span>
                {currentAudio && !isPlaying && (
                  <button
                    onClick={() => playAudio(currentAudio)}
                    className="bg-[#ABCEC9] hover:bg-[#9BBDB8] text-white text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1 shadow-sm transition-transform active:scale-95 animate-pop-in border border-white/20"
                  >
                    <Play size={10} fill="currentColor" /> Play Real Laughter 🗣️
                  </button>
                )}
                {usingFallbackVoice && (
                  <span className="text-[0.65rem] bg-orange-100 text-orange-600 px-2 py-1 rounded-full font-bold border border-orange-200">
                    Offline Voice
                  </span>
                )}
              </div>
            </div>
          ) : (
            <p className="text-gray-400 font-medium text-sm px-8">
              {activeTab === 'GENERATOR' ? "Enter a situation (e.g. 'Traffic Jam') to turn it into a laugh!" :
                activeTab === 'JOKES' ? "Enter a topic (e.g. 'Pizza') for a funny one-liner + laugh!" :
                  "Select a mood to hear different laughter styles."}
            </p>
          )}
        </div>
      </div>

      {error && (
        <div className={`mt-4 px-4 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-2 animate-in fade-in ${error.includes("offline") ? 'bg-orange-50 text-orange-500 border border-orange-100' : 'bg-red-50 text-red-600 border border-red-100'}`}>
          {error.includes("offline") ? <WifiOff size={14} /> : <AlertCircle size={14} />} {error}
        </div>
      )}

      {/* Controls Area */}
      <div className="mt-6 space-y-4">

        {(activeTab === 'GENERATOR' || activeTab === 'JOKES') && (
          <div className="animate-fade-in-up delay-300">
            <div className="relative">
              <input
                type="text"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder={activeTab === 'JOKES' ? "Topic (e.g. Cats, Boss, Coffee)" : "Situation (e.g. Missed Alarm)"}
                className={`w-full bg-white dark:bg-slate-800 border-2 rounded-2xl py-4 pl-4 pr-14 text-gray-700 dark:text-white font-bold shadow-sm focus:outline-none focus:ring-4 transition-all ${activeTab === 'JOKES' ? 'border-red-50 dark:border-red-900/30 focus:border-red-200 focus:ring-red-100 dark:focus:ring-red-900' : 'border-gray-100 dark:border-slate-700 focus:border-[#C3B8D5] focus:ring-[#C3B8D5]/10'}`}
                onKeyDown={(e) => e.key === 'Enter' && handleGenerate(activeTab === 'JOKES' ? 'joke' : 'story')}
              />
              <div className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-300 dark:text-gray-500">
                <Sparkles size={20} className={activeTab === 'JOKES' ? 'text-red-300' : 'text-[#C3B8D5]'} />
              </div>
            </div>
            <button
              onClick={() => handleGenerate(activeTab === 'JOKES' ? 'joke' : 'story')}
              disabled={isLoading || !topic.trim()}
              className={`w-full mt-4 font-bold py-4 rounded-2xl shadow-lg active:scale-95 transition-transform disabled:opacity-50 disabled:scale-100 flex items-center justify-center gap-2 hover:scale-[1.02] ${activeTab === 'JOKES' ? 'bg-gradient-to-r from-red-300 to-pink-300 text-red-900 shadow-red-200 hover:brightness-105' : 'bg-gradient-to-r from-[#C3B8D5] to-[#AABBCC] text-slate-800 dark:text-white dark:from-slate-700 dark:to-slate-600 shadow-[#C3B8D5]/30'}`}
            >
              {activeTab === 'JOKES' ? "Tell Me a Joke & Laugh!" : "Generate Joy Story"}
            </button>
          </div>
        )}

        {activeTab === 'MOOD' && (
          <div className="grid grid-cols-2 gap-3 animate-fade-in-up delay-300">
            <button onClick={() => handleMood("pure joy")} className="bg-[#ABCEC9] hover:bg-[#9BBDB8] text-teal-900 p-4 rounded-2xl font-bold shadow-md active:scale-95 transition-all text-sm hover:scale-105">
              Giggle Fit 🤭
            </button>
            <button onClick={() => handleMood("relief")} className="bg-[#AABBCC] hover:bg-[#97a9bb] text-slate-800 p-4 rounded-2xl font-bold shadow-md active:scale-95 transition-all text-sm hover:scale-105">
              Belly Laugh 😂
            </button>
            <button onClick={() => handleMood("silly")} className="bg-[#C3B8D5] hover:bg-[#b0a5c4] text-purple-900 p-4 rounded-2xl font-bold shadow-md active:scale-95 transition-all text-sm hover:scale-105">
              Snort Laugh 🐽
            </button>
            <button onClick={() => handleMood("evil plan")} className="bg-[#EDE8F8] dark:bg-slate-700 hover:bg-[#e0daf0] dark:hover:bg-slate-600 text-gray-600 dark:text-gray-200 p-4 rounded-2xl font-bold shadow-md active:scale-95 transition-all text-sm border-2 border-white dark:border-slate-600 hover:scale-105">
              Witchy Cackle 🧙‍♀️
            </button>
          </div>
        )}

        {/* Playback Control (if playing) */}
        {isPlaying && (
          <button
            onClick={stopAudio}
            className="w-full bg-white dark:bg-slate-800 border-2 border-red-100 dark:border-red-900 text-red-400 font-bold py-3 rounded-xl flex items-center justify-center gap-2 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors animate-pop-in"
          >
            <Pause size={18} fill="currentColor" /> Stop Audio
          </button>
        )}
      </div>

    </div>
  );
};