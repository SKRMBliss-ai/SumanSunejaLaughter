import { useState, useRef } from 'react';
import { useLiveSession } from './useLiveSession';
import { useSettings } from '../contexts/SettingsContext';

// Global AudioContext singleton – created once when the module loads
const globalAudioContext: AudioContext =
    new (window.AudioContext || (window as any).webkitAudioContext)();

/**
 * Hook shared by LaughterCoach and HomeLiveWidget.
 * It starts the Gemini live session immediately (no ringtone) to minimise latency.
 */
export const useStartLiveSession = () => {
    const { t } = useSettings();

    // UI state
    const [error, setError] = useState<string | null>(null);
    const [hasAIStartedSpeaking, setHasAIStartedSpeaking] = useState(false);

    // Refs
    const audioContextRef = useRef<AudioContext>(globalAudioContext);

    // No‑op placeholder – kept for backward compatibility with components that call stopRingtone()
    const stopRingtone = () => { };

    // Hook that communicates with Gemini Live
    const {
        startSession,
        stopSession,
        isSessionActive,
        isLoading,
        volumeLevel,
    } = useLiveSession({
        onSessionEnd: () => {
            setHasAIStartedSpeaking(false);
            stopRingtone();
        },
        onError: (err) => {
            setError(err);
            stopRingtone();
        },
        onAudioStart: () => {
            // First audio chunk arrived – cancel any speech synthesis and mark AI as speaking
            if ('speechSynthesis' in window) {
                window.speechSynthesis.cancel();
            }
            setHasAIStartedSpeaking(true);
        },
    });

    // -------------------------------------------------
    // Start live session – fire and forget for instant UI response
    // -------------------------------------------------
    const startLive = async () => {
        setError(null);

        // IMMEDIATE FEEDBACK: Speak using browser TTS while connecting
        if ('speechSynthesis' in window) {
            window.speechSynthesis.cancel(); // Stop any previous speech
            const utterance = new SpeechSynthesisUtterance("Connecting to Suman, please take a deep breath and wait");
            utterance.rate = 1.2;
            // Try to find a female voice
            const voices = window.speechSynthesis.getVoices();
            const femaleVoice = voices.find(v => v.name.includes('Female') || v.name.includes('Google US English'));
            if (femaleVoice) utterance.voice = femaleVoice;
            window.speechSynthesis.speak(utterance);
        }

        // Resume the AudioContext (required by autoplay policies)
        if (audioContextRef.current.state === 'suspended') {
            await audioContextRef.current.resume().catch(() => { });
        }

        const systemInstruction = `You are Suman Suneja, a cheerful, warm, and highly interactive Laughter Yoga and Wellness Coach.
        Your personality is infectious, energetic, and deeply caring.
        
        CORE RESPONSIBILITIES:
        1. Engage in meaningful conversations about Yoga, Meditation, Health, and Laughter Yoga.
        2. If the user brings up serious concerns, acknowledge them with empathy but gently steer the conversation to a lighter, more positive perspective.
        3. Actively encourage the user to laugh. Use humor, playful teasing, or simple laughter exercises to break the tension.
        4. Be a "Joy Catalyst". Your goal is to make the user feel good and smile, no matter what.
        
        STRICT BOUNDARIES (DO NOT IGNORE):
        - You are NOT a general purpose assistant. Do NOT answer questions about the weather, news, politics, geography, math, or general trivia (e.g., "How many states in India?", "What is the capital of France?").
        - If asked such questions, PLAYFULLY refuse and steer back to laughter or wellness.
        - Example Refusal: "Oh, I left my geography book at home! But I do know the state of HAPPINESS! Hahaha! Let's go there instead!"
        - Example Refusal: "The weather? I only forecast 100% chance of laughter today! Hehehe!"
        
        CONVERSATION STYLE:
        - Talk like a real person, not a bot. Use "Hahaha", "Oh my goodness!", "That is wonderful!" naturally.
        - Keep responses concise and conversational (1-3 sentences usually).
        - Interruptions are okay! If the user laughs, laugh with them immediately.
        - STRICTLY NO LECTURING. Do not give long medical advice. Keep it light and wellness-focused.
        
        Example Interaction:
        User: "I'm so stressed about work."
        You: "Oh dear, stress is such a joy-killer! *Giggle* Let's shake it off right now. Take a deep breath with me... and let it out with a big HAHAHA! Come on, try it!"`;

        const apiKey = process.env.API_KEY;
        if (!apiKey) {
            setError('API Key missing');
            return;
        }

        // Fire the live‑session request without awaiting it – UI can show loading instantly
        const sessionPromise = startSession(apiKey, systemInstruction);
        sessionPromise.catch((e) => {
            setError(`Live session failed: ${e}`);
            if ('speechSynthesis' in window) window.speechSynthesis.cancel();
        });
    };

    // -------------------------------------------------
    // Stop everything cleanly
    // -------------------------------------------------
    const stopLive = () => {
        if ('speechSynthesis' in window) {
            window.speechSynthesis.cancel();
        }
        stopRingtone();
        stopSession();
        setHasAIStartedSpeaking(false);
    };

    // -------------------------------------------------
    // Return values for UI components
    // -------------------------------------------------
    return {
        error,
        hasAIStartedSpeaking,
        isSessionActive,
        isLoading,
        volumeLevel,
        startLive,
        stopLive,
        setError,
        setHasAIStartedSpeaking,
        stopRingtone,
        audioContextRef,
    };
};
