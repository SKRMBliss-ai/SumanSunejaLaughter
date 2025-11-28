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
        // Resume the AudioContext (required by autoplay policies)
        if (audioContextRef.current.state === 'suspended') {
            await audioContextRef.current.resume().catch(() => { });
        }

        const systemInstruction = `You are Suman Suneja, a cheerful Laughter Yoga Coach.
Your goal is to make the user laugh immediately.
Start by saying "Hello! Are you ready to laugh?" and then laugh loudly.
Encourage the user to join you.`;

        const apiKey = process.env.API_KEY;
        if (!apiKey) {
            setError('API Key missing');
            return;
        }

        // Fire the live‑session request without awaiting it – UI can show loading instantly
        const sessionPromise = startSession(apiKey, systemInstruction);
        sessionPromise.catch((e) => {
            setError(`Live session failed: ${e}`);
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
