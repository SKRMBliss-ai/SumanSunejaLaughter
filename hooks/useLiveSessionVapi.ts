import { useState, useEffect, useRef, useCallback } from 'react';
import Vapi from '@vapi-ai/web';

interface UseLiveSessionProps {
    onSessionEnd?: () => void;
    onError?: (error: string) => void;
    onAudioStart?: () => void;
}

export const useLiveSessionVapi = ({ onSessionEnd, onError, onAudioStart }: UseLiveSessionProps = {}) => {
    const [isSessionActive, setIsSessionActive] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [volumeLevel, setVolumeLevel] = useState(0);
    const vapiRef = useRef<any>(null);

    // Initialize Vapi SDK
    useEffect(() => {
        const vapiKey = import.meta.env.VITE_VAPI_PUBLIC_KEY;
        if (!vapiKey) {
            console.warn("Missing VITE_VAPI_PUBLIC_KEY");
            return;
        }
        const vapi = new Vapi(vapiKey);
        vapiRef.current = vapi;

        return () => {
            vapi.stop();
        };
    }, []);

    const stopSession = useCallback(() => {
        if (vapiRef.current) {
            vapiRef.current.stop();
        }
        setIsSessionActive(false);
        setIsLoading(false);
        setVolumeLevel(0);
        if (onSessionEnd) onSessionEnd();
    }, [onSessionEnd]);

    const startSession = useCallback(async (apiKeyOrAssistantId: string, customSystemInstruction?: string) => {
        if (!vapiRef.current) {
            if (onError) onError("Vapi SDK not initialized (Missing Key?)");
            return;
        }

        setIsLoading(true);

        try {
            await navigator.mediaDevices.getUserMedia({ audio: true });
        } catch (e) {
            console.error("Microphone permission denied:", e);
            if (onError) onError("Microphone permission denied.");
            setIsLoading(false);
            return;
        }

        // Setup Event Listeners
        vapiRef.current.on('call-start', () => {
            console.log("Vapi Call Started");
            setIsLoading(false);
            setIsSessionActive(true);
            if (onAudioStart) onAudioStart();
        });

        vapiRef.current.on('call-end', () => {
            console.log("Vapi Call Ended");
            stopSession();
        });

        vapiRef.current.on('error', (e: any) => {
            console.error("Vapi Error Event:", e);
            let errorMsg = "Unknown Error";
            try {
                if (typeof e === 'string') errorMsg = e;
                else if (e?.error?.message) errorMsg = e.error.message;
                else if (e?.message) errorMsg = e.message;
                else errorMsg = JSON.stringify(e);
            } catch (err) {
                errorMsg = "Error object could not be stringified";
            }
            if (onError) onError(errorMsg);
            stopSession();
        });

        vapiRef.current.on('volume-level', (level: number) => {
            // Safeguard against NaN or infinite updates
            if (typeof level === 'number' && !isNaN(level)) {
                setVolumeLevel(Math.max(0, Math.min(1, level)));
            }
        });

        // Define the assistant configuration (Transient Assistant)
        const assistantConfig = {
            name: "Laughter Coach",
            firstMessage: "Ha Ha Ha! Namaste! Ready to laugh with me?",
            transcriber: {
                provider: "deepgram",
                model: "nova-2",
                language: "en-IN", // Indian English Transcription
            },
            voice: {
                provider: "11labs",
                voiceId: "IvLWq57RKibBrqZGpQrC", // "Leo" (Indian Male - Energetic)
            },
            model: {
                provider: "google",
                model: "gemini-2.0-flash-exp",
                messages: [
                    {
                        role: "system",
                        content: customSystemInstruction || `You are Suman Suneja, an energetic Laughter Yoga Coach. 
                        1. Start by welcoming them with a big laugh.
                        2. If they laugh, laugh back harder.
                        3. If quiet, guide them: "Say Ha Ha Ha!".
                        4. Keep responses SHORT and PUNCHY. 
                        5. IMPORTANT: Respond INSTANTLY.`
                    }
                ]
            }
        };

        try {
            console.log("Starting Vapi Session with config:", assistantConfig);
            await vapiRef.current.start(assistantConfig);
        } catch (err: any) {
            console.error("Failed to start Vapi session:", err);
            const msg = err?.message || JSON.stringify(err);
            if (onError) onError(`Failed to start: ${msg}`);
            setIsLoading(false);
        }
    }, [onError, stopSession, onAudioStart]);

    return {
        isSessionActive,
        isLoading,
        volumeLevel,
        startSession,
        stopSession
    };
};
