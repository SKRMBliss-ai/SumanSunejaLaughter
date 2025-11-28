import { useState, useRef } from 'react';
import { useLiveSession } from './useLiveSession';
import { useSettings } from '../contexts/SettingsContext';

/* Global AudioContext singleton */
const globalAudioContext: AudioContext =
    new (window.AudioContext || (window as any).webkitAudioContext)();

export const useStartLiveSession = () => {
    const { t } = useSettings();

    const [error, setError] = useState<string | null>(null);
    const [hasAIStartedSpeaking, setHasAIStartedSpeaking] = useState(false);

    const audioContextRef = useRef<AudioContext>(globalAudioContext);

    // No-op placeholder for compatibility
    const stopRingtone = () => { };

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
            if ('speechSynthesis' in window) {
                window.speechSynthesis.cancel();
            }
            setHasAIStartedSpeaking(true);
        },
    });

    const startLive = async () => {
        setError(null);
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

        const sessionPromise = startSession(apiKey, systemInstruction);
        sessionPromise.catch((e) => {
            setError(`Live session failed: ${e}`);
        });
    };

    const stopLive = () => {
        if ('speechSynthesis' in window) {
            window.speechSynthesis.cancel();
        }
        stopRingtone();
        stopSession();
        setHasAIStartedSpeaking(false);
    };

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
