import { useState, useEffect, useRef } from 'react';
import { useLiveSession } from './useLiveSession';
import { useSettings } from '../contexts/SettingsContext';

/**
 * Shared hook used by LaughterCoach and HomeLiveWidget.
 * Starts the ringtone and the live session in parallel for an instant feel.
 */
export const useStartLiveSession = () => {
    const { t } = useSettings();

    // UI state
    const [error, setError] = useState<string | null>(null);
    const [hasAIStartedSpeaking, setHasAIStartedSpeaking] = useState(false);

    // Refs for media objects
    const ringtoneRef = useRef<HTMLAudioElement | null>(null);
    const audioContextRef = useRef<AudioContext | null>(null);

    // Helper to stop the ringtone
    const stopRingtone = () => {
        if (ringtoneRef.current) {
            ringtoneRef.current.pause();
            ringtoneRef.current.currentTime = 0;
        }
    };

    // Hook that talks to Gemini Live
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
            // First audio chunk arrived – cancel any speech synthesis and stop ringtone
            if ('speechSynthesis' in window) {
                window.speechSynthesis.cancel();
            }
            stopRingtone();
            setHasAIStartedSpeaking(true);
        },
    });

    // -------------------------------------------------
    // Start live session + ringtone in parallel
    // -------------------------------------------------
    const startLive = async () => {
        setError(null);

        // Ensure AudioContext exists and is resumed (autoplay policy)
        if (!audioContextRef.current) {
            audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
        }
        if (audioContextRef.current.state === 'suspended') {
            await audioContextRef.current.resume();
        }

        // Initialise and play ringtone (non‑blocking)
        if (!ringtoneRef.current) {
            ringtoneRef.current = new Audio('https://res.cloudinary.com/dfopoyt9v/video/upload/v1764314599/ring_xidpqi.mp4');
            ringtoneRef.current.loop = false; // play once
        }
        ringtoneRef.current.play().catch((err) => console.warn('Ringtone playback failed:', err));

        // System prompt for Gemini
        const systemInstruction = `You are Suman Suneja, a cheerful Laughter Yoga Coach.
Your goal is to make the user laugh immediately.
Start by saying "Hello! Are you ready to laugh?" and then laugh loudly.
Encourage the user to join you.`;

        const apiKey = process.env.API_KEY;
        if (!apiKey) {
            setError('API Key missing');
            stopRingtone();
            return;
        }

        // Fire the live‑session request – we do NOT await the ringtone
        const sessionPromise = startSession(apiKey, systemInstruction);
        await sessionPromise;

        // Safety timeout: log if AI hasn't spoken after 10 s
        setTimeout(() => {
            if (!hasAIStartedSpeaking && isSessionActive) {
                console.log('AI voice not started within timeout');
            }
        }, 10000);
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
        ringtoneRef,
    };
};
