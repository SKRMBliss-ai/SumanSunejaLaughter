import React, { useState, useEffect, useRef } from 'react';
import { Music, Volume2, VolumeX, Wind, Zap, Sliders } from 'lucide-react';

// --- Generative Engine Logic ---

class GenerativeEngine {
  ctx: AudioContext | null = null;
  masterGain: GainNode | null = null;
  reverbNode: ConvolverNode | null = null;
  oscillators: { osc: OscillatorNode; gain: GainNode; lfo: OscillatorNode }[] = [];
  isPlaying: boolean = false;

  // Frequencies for chords
  // Calm: C Major 9 (C3, E3, G3, B3, D4) - Warm, grounded, dreamy
  // Energy: F Lydian (F3, A3, C4, E4, G4) - Brighter, uplifting, airy
  scales = {
    CALM: [130.81, 164.81, 196.00, 246.94, 293.66],
    ENERGY: [174.61, 220.00, 261.63, 329.63, 392.00],
  };

  currentMood: 'CALM' | 'ENERGY' = 'CALM';

  constructor() {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    this.ctx = new AudioContextClass();
  }

  createImpulseResponse(duration: number, decay: number) {
    if (!this.ctx) return null;
    const rate = this.ctx.sampleRate;
    const length = rate * duration;
    const impulse = this.ctx.createBuffer(2, length, rate);
    const left = impulse.getChannelData(0);
    const right = impulse.getChannelData(1);

    for (let i = 0; i < length; i++) {
      const n = i / length;
      // Synthesize a noise burst with exponential decay for reverb tail
      const noise = (Math.random() * 2 - 1) * Math.pow(1 - n, decay);
      left[i] = noise;
      right[i] = noise;
    }
    return impulse;
  }

  async start() {
    if (!this.ctx) return;
    if (this.ctx.state === 'suspended') await this.ctx.resume();

    // Setup Master Chain
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = 0.15; // Ambient volume (subtle)

    this.reverbNode = this.ctx.createConvolver();
    this.reverbNode.buffer = this.createImpulseResponse(3, 2); // 3 seconds reverb

    // Connect Master -> Reverb -> Destination (Wet)
    this.masterGain.connect(this.reverbNode);
    this.reverbNode.connect(this.ctx.destination);

    // Connect Master -> Destination (Dry - slight)
    this.masterGain.connect(this.ctx.destination);

    this.isPlaying = true;
    this.createVoices(this.currentMood);
  }

  stop() {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;

    // Fade out
    if (this.masterGain) {
      this.masterGain.gain.setValueAtTime(this.masterGain.gain.value, now);
      this.masterGain.gain.linearRampToValueAtTime(0, now + 1.5);
    }

    setTimeout(() => {
      this.oscillators.forEach(voice => {
        try {
          voice.osc.stop();
          voice.lfo.stop();
        } catch (e) { }
      });
      this.oscillators = [];
      this.isPlaying = false;
    }, 1600);
  }

  createVoices(mood: 'CALM' | 'ENERGY') {
    if (!this.ctx || !this.masterGain) return;

    // Clear existing
    this.oscillators.forEach(v => {
      try {
        // Fade out old voices quickly
        v.gain.gain.setTargetAtTime(0, this.ctx!.currentTime, 0.5);
        setTimeout(() => { v.osc.stop(); v.lfo.stop(); }, 600);
      } catch (e) { }
    });
    this.oscillators = [];

    const frequencies = this.scales[mood];
    const now = this.ctx.currentTime;

    frequencies.forEach((freq, i) => {
      if (!this.ctx || !this.masterGain) return;

      // 1. Oscillator (Tone)
      const osc = this.ctx.createOscillator();
      osc.type = i % 2 === 0 ? 'sine' : 'triangle'; // Mix sine and triangle for texture
      osc.frequency.value = freq;

      // 2. Voice Gain (Volume envelope)
      const gain = this.ctx.createGain();
      gain.gain.value = 0; // Start silent

      // 3. LFO (Movement/Breathing)
      const lfo = this.ctx.createOscillator();
      lfo.type = 'sine';
      lfo.frequency.value = 0.05 + (Math.random() * 0.1); // Very slow breath (0.05Hz - 0.15Hz)

      // LFO Gain (Depth of breathing)
      const lfoGain = this.ctx.createGain();
      lfoGain.gain.value = 0.15; // Modulate volume by +/- 15%

      // Connect LFO -> Voice Gain
      lfo.connect(lfoGain);
      lfoGain.connect(gain.gain);

      // Connect Voice -> Master
      osc.connect(gain);
      gain.connect(this.masterGain);

      // Start
      osc.start();
      lfo.start();

      // Fade in smoothly
      gain.gain.setTargetAtTime(0.08 + (Math.random() * 0.05), now, 3 + i); // Staggered fade in

      this.oscillators.push({ osc, gain, lfo });
    });
  }

  setMood(mood: 'CALM' | 'ENERGY') {
    if (this.currentMood === mood) return;
    this.currentMood = mood;
    if (this.isPlaying) {
      this.createVoices(mood);
    }
  }
}

export const AmbientMusic: React.FC = () => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [mood, setMood] = useState<'CALM' | 'ENERGY'>('CALM');
  const engineRef = useRef<GenerativeEngine | null>(null);

  // Ref to track playing state for the event listener
  const isPlayingRef = useRef(isPlaying);
  useEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);

  useEffect(() => {
    engineRef.current = new GenerativeEngine();

    const handleMoodChange = (e: CustomEvent) => {
      const newMood = e.detail;
      if (newMood === 'CALM' || newMood === 'ENERGY') {
        setMood(newMood);
        engineRef.current?.setMood(newMood);
      }
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        engineRef.current?.stop();
      } else {
        // Only resume if it was supposed to be playing
        if (isPlayingRef.current) {
          engineRef.current?.start();
        }
      }
    };

    window.addEventListener('MUSIC_MOOD' as any, handleMoodChange);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      engineRef.current?.stop();
      window.removeEventListener('MUSIC_MOOD' as any, handleMoodChange);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  const togglePlay = () => {
    if (!engineRef.current) return;

    if (isPlaying) {
      engineRef.current.stop();
      setIsPlaying(false);
    } else {
      engineRef.current.start();
      setIsPlaying(true);
    }
  };

  const changeMoodManual = (m: 'CALM' | 'ENERGY') => {
    setMood(m);
    engineRef.current?.setMood(m);
  };

  return (
    <div className={`fixed bottom-48 right-4 z-40 flex flex-col items-end gap-2 transition-all duration-500 ${isPlaying ? 'translate-x-0' : 'translate-x-2'}`}>

      {/* Expanded Controls */}
      {isExpanded && (
        <div className="bg-white/90 backdrop-blur-md p-3 rounded-2xl shadow-xl border border-[#ABCEC9] mb-2 animate-in slide-in-from-right fade-in duration-300 w-32 origin-bottom-right">
          <div className="text-[10px] font-bold text-[#AABBCC] uppercase mb-2 tracking-wider flex items-center gap-1">
            <Sliders size={10} /> Mood
          </div>
          <div className="space-y-2">
            <button
              onClick={() => changeMoodManual('CALM')}
              className={`w-full flex items-center gap-2 text-xs font-bold px-3 py-2 rounded-xl transition-all ${mood === 'CALM' ? 'bg-[#ABCEC9] text-white shadow-md scale-105' : 'hover:bg-gray-100 text-gray-500'}`}
            >
              <Wind size={12} /> Calm
            </button>
            <button
              onClick={() => changeMoodManual('ENERGY')}
              className={`w-full flex items-center gap-2 text-xs font-bold px-3 py-2 rounded-xl transition-all ${mood === 'ENERGY' ? 'bg-orange-300 text-white shadow-md scale-105' : 'hover:bg-gray-100 text-gray-500'}`}
            >
              <Zap size={12} /> Energy
            </button>
          </div>
        </div>
      )}

      {/* Main Floating Button */}
      <div className="flex items-center gap-2 group">
        {isPlaying && (
          <div className="hidden sm:block bg-white/80 backdrop-blur px-3 py-1.5 rounded-full shadow-sm border border-white text-xs font-bold text-[#AABBCC] animate-in fade-in cursor-default select-none">
            {mood === 'CALM' ? 'Relaxing...' : 'Energizing...'}
          </div>
        )}

        <button
          onClick={() => isExpanded ? setIsExpanded(false) : togglePlay()}
          onContextMenu={(e) => { e.preventDefault(); setIsExpanded(!isExpanded); }}
          className={`w-12 h-12 rounded-full flex items-center justify-center shadow-lg border-2 transition-all active:scale-90 ${isPlaying
            ? (mood === 'CALM' ? 'bg-[#ABCEC9] border-white text-white animate-[pulse_4s_infinite]' : 'bg-orange-300 border-white text-white animate-[bounce-gentle_1s_infinite]')
            : 'bg-white border-[#EDE8F8] text-[#C3B8D5] hover:border-[#ABCEC9] hover:text-[#ABCEC9] hover:scale-110'
            }`}
          title="Tap to play/pause, Right-click for mood"
        >
          {isPlaying ? (
            <Music size={20} className={mood === 'ENERGY' ? 'animate-spin-slow' : ''} />
          ) : (
            <VolumeX size={20} />
          )}
        </button>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-6 h-6 bg-white shadow-sm rounded-full flex items-center justify-center text-gray-400 hover:text-[#ABCEC9] hover:bg-gray-50 transition-colors transform group-hover:scale-110"
        >
          <Sliders size={12} />
        </button>
      </div>
    </div>
  );
};