import { useState, useEffect, useRef } from 'react';
import { useLiveSession } from './useLiveSession';
import { useSettings } from '../contexts/SettingsContext';

/**
 * Shared hook that provides the startLiveSession logic used by both LaughterCoach and HomeLiveWidget.
 * It handles greeting, audio context resume, ringtone playback, and invokes the live session.
 */
export const useStartLiveSession = () => {
    const { t } = useSettings();
    const [error, setError] = useState<string | null>(null);
    const [hasAIStartedSpeaking, setHasAIStartedSpeaking] = useState(false);
    const ringtoneRef = useRef<HTMLAudioElement | null>(null);
    const audioContextRef = useRef<AudioContext | null>(null);

    const stopRingtone = () => {
        if (ringtoneRef.current) {
            ringtoneRef.current.pause();
            ringtoneRef.current.currentTime = 0;
        }
    };

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
            stopRingtone();
            setHasAIStartedSpeaking(true);
        },
    });

    const startLive = async () => {
        setError(null);
        // Resume AudioContext (required for autoplay policies)
        if (!audioContextRef.current) {
            audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
        }
        if (audioContextRef.current.state === 'suspended') {
            await audioContextRef.current.resume();
        }

        // Play ringtone while connecting
        if (!ringtoneRef.current) {
            ringtoneRef.current = new Audio('https://res.cloudinary.com/dfopoyt9v/video/upload/v1764314599/ring_xidpqi.mp4');
            ringtoneRef.current.loop = false;
        }
        ringtoneRef.current.play().catch((err) => console.warn('Ringtone playback failed:', err));

        const apiKey = process.env.API_KEY;
        if (!apiKey) {
            setError('API Key missing');
            stopRingtone();
            return;
        }

        const systemInstruction = `You are Suman Suneja, a cheerful Laughter Yoga Coach.
Your goal is to make the user laugh immediately.
Start by saying "Hello! Are you ready to laugh?" and then laugh loudly.
Encourage the user to join you.`;

        await startSession(apiKey, systemInstruction);

        // Safety timeout: log if AI hasn't started after 10 seconds
        setTimeout(() => {
            if (!hasAIStartedSpeaking && isSessionActive) {
                console.log('AI voice not started within timeout');
            }
        }, 10000);
    };

    const stopLive = () => {
        if ('speechSynthesis' in window) {
            window.speechSynthesis.cancel();
        }
        stopRingtone();
        stopSession();
        setHasAIStartedSpeaking(false);
    };

    // expose needed values for UI components
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
