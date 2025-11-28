import { useState, useRef } from 'react';
import { useLiveSession } from './useLiveSession';
import { useSettings } from '../contexts/SettingsContext';

/* -------------------------------------------------
   Module‑level singletons – created once when the app loads
   ------------------------------------------------- */
const globalAudioContext: AudioContext =
    new (window.AudioContext || (window as any).webkitAudioContext)();

const globalRingtone = new Audio(
    'https://res.cloudinary.com/dfopoyt9v/video/upload/v1764314599/ring_xidpqi.mp4'
);
globalRingtone.loop = false; // play once
// Pre‑load the media so the first play is instant
globalRingtone.load();

/**
 * Shared hook used by LaughterCoach and HomeLiveWidget.
 * Starts the ringtone and the live session **in parallel** for an instant feel.
 */
export const useStartLiveSession = () => {
    const { t } = useSettings();

    // UI state
    const [error, setError] = useState<string | null>(null);
    const [hasAIStartedSpeaking, setHasAIStartedSpeaking] = useState(false);

    // Refs to the singletons (so components can access them)
    const audioContextRef = useRef<AudioContext>(globalAudioContext);
    const ringtoneRef = useRef<HTMLAudioElement>(globalRingtone);

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
    // Start live session + ringtone **in parallel**
    // -------------------------------------------------
    const startLive = async () => {
        setError(null);

        // Resume the global AudioContext (fire‑and‑forget)
        if (audioContextRef.current.state === 'suspended') {
            audioContextRef.current.resume().catch(() => { });
        }

        // Play the pre‑loaded ringtone immediately
        ringtoneRef.current
            .play()
            .catch((err) => console.warn('Ringtone playback failed:', err));

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

        // Fire the live‑session request **without awaiting** it.
        const sessionPromise = startSession(apiKey, systemInstruction);
        sessionPromise.catch((e) => {
            setError(`Live session failed: ${e}`);
            stopRingtone();
        });

        // UI can now show loading state instantly.
        // The `onAudioStart` callback will stop the ringtone when audio arrives.
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
