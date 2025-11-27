import { useState, useRef, useEffect, useCallback } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality } from "@google/genai";

interface UseLiveSessionProps {
    onSessionEnd?: () => void;
    onError?: (error: string) => void;
}

// Helper to create PCM blob
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

// Helper to decode base64
function decode(base64: string) {
    const binaryString = atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
}

// Helper to calculate RMS (Root Mean Square) for volume/barge-in
function calculateRMS(data: Float32Array): number {
    let sum = 0;
    for (let i = 0; i < data.length; i++) {
        sum += data[i] * data[i];
    }
    return Math.sqrt(sum / data.length);
}

export const useLiveSession = ({ onSessionEnd, onError }: UseLiveSessionProps = {}) => {
    const [isSessionActive, setIsSessionActive] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [volumeLevel, setVolumeLevel] = useState(0);

    const audioContextRef = useRef<AudioContext | null>(null);
    const liveInputContextRef = useRef<AudioContext | null>(null);
    const liveSessionRef = useRef<any>(null);
    const nextStartTimeRef = useRef<number>(0);
    const inputProcessorRef = useRef<ScriptProcessorNode | null>(null);
    const mediaStreamRef = useRef<MediaStream | null>(null);
    const currentSourceRef = useRef<AudioBufferSourceNode | null>(null);

    const cleanupAudio = useCallback(() => {
        if (currentSourceRef.current) {
            currentSourceRef.current.stop();
            currentSourceRef.current = null;
        }

        if (liveSessionRef.current) {
            // liveSessionRef.current.close(); // If API supports close
            liveSessionRef.current = null;
        }

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
    }, []);

    const stopSession = useCallback(() => {
        cleanupAudio();
        setIsSessionActive(false);
        setIsLoading(false);
        setVolumeLevel(0);
        if (onSessionEnd) onSessionEnd();
    }, [cleanupAudio, onSessionEnd]);

    const startSession = useCallback(async (apiKey: string, customSystemInstruction?: string) => {
        cleanupAudio();
        setIsLoading(true);
        setIsSessionActive(true);

        try {
            // 1. Setup Audio Contexts
            liveInputContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
            audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
            nextStartTimeRef.current = 0;

            // 2. Get Microphone Stream
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaStreamRef.current = stream;

            // 3. Connect to Gemini Live
            const ai = new GoogleGenAI({ apiKey });

            const defaultInstruction = `You are Suman Suneja, an energetic, warm, and highly interactive Laughter Yoga Coach. 
          Your goal is to lead a "Laughter Session" with the user.
          1. Start by welcoming them with a big laugh and ask them to laugh with you.
          2. Listen to their audio. If they are laughing, laugh back harder and encourage them ("Yes! That's it! Loudly!").
          3. If they are quiet, guide them: "Take a deep breath and say Ha Ha Ha!".
          4. Keep your responses short, punchy, and filled with laughter sounds. 
          5. Be spontaneous and fun. Do not give long lectures. Just laugh and guide.`;

            const sessionPromise = ai.live.connect({
                model: 'gemini-2.5-flash-native-audio-preview-09-2025',
                config: {
                    responseModalities: [Modality.AUDIO],
                    speechConfig: {
                        voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } },
                    },
                    systemInstruction: customSystemInstruction || defaultInstruction,
                },
                callbacks: {
                    onopen: () => {
                        setIsLoading(false);

                        // Setup Input Processing
                        if (!liveInputContextRef.current) return;
                        const source = liveInputContextRef.current.createMediaStreamSource(stream);

                        // OPTIMIZATION 1: Reduced buffer size to 2048 for lower latency
                        const processor = liveInputContextRef.current.createScriptProcessor(2048, 1, 1);
                        inputProcessorRef.current = processor;

                        processor.onaudioprocess = (e) => {
                            const inputData = e.inputBuffer.getChannelData(0);

                            // OPTIMIZATION 3: Barge-In Interruption
                            const rms = calculateRMS(inputData);
                            setVolumeLevel(rms); // Expose volume for UI visualization

                            if (rms > 0.1) { // Threshold for "loud laughter"
                                if (currentSourceRef.current) {
                                    // Stop AI immediately if user is laughing loudly
                                    try {
                                        currentSourceRef.current.stop();
                                        currentSourceRef.current = null;
                                        // Reset timing to now so next chunk plays immediately
                                        if (audioContextRef.current) {
                                            nextStartTimeRef.current = audioContextRef.current.currentTime;
                                        }
                                    } catch (e) {
                                        // Ignore stop errors
                                    }
                                }
                            }

                            const pcmBlob = createBlob(inputData);
                            sessionPromise.then((session) => {
                                session.sendRealtimeInput({ media: pcmBlob });
                            });
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
                            for (let i = 0; i < dataInt16.length; i++) {
                                float32[i] = dataInt16[i] / 32768.0;
                            }

                            const buffer = ctx.createBuffer(1, float32.length, 24000);
                            buffer.getChannelData(0).set(float32);

                            const source = ctx.createBufferSource();
                            source.buffer = buffer;
                            source.connect(ctx.destination);
                            currentSourceRef.current = source;

                            // OPTIMIZATION 2: Drift Correction
                            const currentTime = ctx.currentTime;
                            if (nextStartTimeRef.current < currentTime) {
                                nextStartTimeRef.current = currentTime;
                            }

                            source.start(nextStartTimeRef.current);
                            nextStartTimeRef.current += buffer.duration;
                        }
                    },
                    onclose: () => {
                        stopSession();
                    },
                    onerror: (err) => {
                        console.error("Live session error", err);
                        if (onError) onError("Connection lost");
                        stopSession();
                    }
                }
            });

            liveSessionRef.current = sessionPromise;

        } catch (err) {
            console.error(err);
            setIsLoading(false);
            setIsSessionActive(false);
            if (onError) onError("Failed to start session");
        }
    }, [cleanupAudio, stopSession, onError]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            cleanupAudio();
        };
    }, [cleanupAudio]);

    return {
        isSessionActive,
        isLoading,
        volumeLevel,
        startSession,
        stopSession
    };
};
