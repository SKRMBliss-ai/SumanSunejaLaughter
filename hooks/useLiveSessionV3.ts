import { useState, useRef, useEffect, useCallback } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality } from "@google/genai";
import { audioService } from '../services/audioService';
import { vadService } from '../services/vadService';

interface UseLiveSessionProps {
    onSessionEnd?: () => void;
    onError?: (error: string) => void;
    onAudioStart?: () => void;
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

export const useLiveSessionV3 = ({ onSessionEnd, onError, onAudioStart }: UseLiveSessionProps = {}) => {
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

    // VAD State
    const isSpeakingRef = useRef<boolean>(false);
    const silenceStartRef = useRef<number>(0);

    const cleanupAudio = useCallback(() => {
        if (currentSourceRef.current) {
            try {
                currentSourceRef.current.stop();
            } catch (e) { }
            currentSourceRef.current = null;
        }

        if (liveSessionRef.current) {
            liveSessionRef.current = null;
        }

        if (inputProcessorRef.current) {
            try {
                inputProcessorRef.current.disconnect();
            } catch (e) { }
            inputProcessorRef.current = null;
        }

        if (mediaStreamRef.current) {
            try {
                mediaStreamRef.current.getTracks().forEach(track => track.stop());
            } catch (e) { }
            mediaStreamRef.current = null;
        }

        if (liveInputContextRef.current) {
            try {
                liveInputContextRef.current.close();
            } catch (e) { }
            liveInputContextRef.current = null;
        }

        if (audioContextRef.current) {
            try {
                audioContextRef.current.close();
            } catch (e) { }
            audioContextRef.current = null;
        }

        audioService.stopLocalAudio();
        vadService.reset();
    }, []);

    const stopSession = useCallback((notify = true) => {
        cleanupAudio();
        setIsSessionActive(false);
        setIsLoading(false);
        setVolumeLevel(0);
        if (notify && onSessionEnd) onSessionEnd();
    }, [cleanupAudio, onSessionEnd]);

    const startSession = useCallback(async (apiKey: string, customSystemInstruction?: string) => {
        cleanupAudio();
        setIsLoading(true);
        setIsSessionActive(true);

        try {
            // Initialize VAD
            await vadService.init();

            // 1. Initialize Audio Contexts
            liveInputContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
            audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
            nextStartTimeRef.current = 0;

            // 2. Start Microphone Stream Early
            const streamPromise = audioService.getMicrophoneStream();

            const ai = new GoogleGenAI({ apiKey });
            const defaultInstruction = `You are Suman Suneja, an energetic, warm, and highly interactive Laughter Yoga Coach. 
          Your goal is to lead a "Laughter Session" with the user.
          1. Start by welcoming them with a big laugh and ask them to laugh with you.
          2. Listen to their audio. If they are laughing, laugh back harder and encourage them ("Yes! That's it! Loudly!").
          3. If they are quiet, guide them: "Take a deep breath and say Ha Ha Ha!".
          4. Keep your responses short, punchy, and filled with laughter sounds. 
          5. Be spontaneous and fun. Do not give long lectures. Just laugh and guide.
          IMPORTANT: Reply INSTANTLY. Do not wait. As soon as the user stops speaking, respond immediately.`;

            const callbacks = {
                onopen: async () => {
                    setIsLoading(false);
                    audioService.stopLocalAudio();

                    if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
                        await audioContextRef.current.resume();
                    }

                    if (!liveInputContextRef.current) return;

                    const stream = await streamPromise;
                    mediaStreamRef.current = stream;

                    const source = liveInputContextRef.current.createMediaStreamSource(stream);
                    const processor = liveInputContextRef.current.createScriptProcessor(512, 1, 1); // 512 for VAD match
                    inputProcessorRef.current = processor;

                    processor.onaudioprocess = async (e) => {
                        const inputData = e.inputBuffer.getChannelData(0);

                        // VAD Detection
                        const isSpeech = await vadService.detect(inputData);
                        setVolumeLevel(isSpeech ? 0.5 : 0); // Visual feedback

                        if (isSpeech) {
                            // User started speaking
                            if (!isSpeakingRef.current) {
                                isSpeakingRef.current = true;
                                // BARGE-IN: Stop AI immediately
                                if (currentSourceRef.current) {
                                    try {
                                        currentSourceRef.current.stop();
                                        currentSourceRef.current = null;
                                        if (audioContextRef.current) {
                                            nextStartTimeRef.current = audioContextRef.current.currentTime;
                                        }
                                        audioService.stopLocalAudio();
                                    } catch (e) { }
                                }
                            }
                            silenceStartRef.current = 0;
                        } else {
                            // User is silent
                            if (isSpeakingRef.current) {
                                // Just stopped speaking
                                if (silenceStartRef.current === 0) {
                                    silenceStartRef.current = Date.now();
                                } else if (Date.now() - silenceStartRef.current > 600) {
                                    // 600ms silence -> End of Turn
                                    isSpeakingRef.current = false;
                                    silenceStartRef.current = 0;
                                    // LATENCY FIX: Send "End of Turn" signal (if API supported it, but sending silence helps)
                                }
                            }
                        }

                        // Send audio to AI
                        const pcmBlob = createBlob(inputData);
                        if (liveSessionRef.current) {
                            liveSessionRef.current.sendRealtimeInput({ media: pcmBlob });
                        }
                    };

                    source.connect(processor);
                    processor.connect(liveInputContextRef.current.destination);
                },
                onmessage: async (message: LiveServerMessage) => {
                    // Ignore if user is speaking (Barge-in logic)
                    if (isSpeakingRef.current) return;

                    const base64Audio = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;

                    if (base64Audio && audioContextRef.current) {
                        audioService.stopLocalAudio();

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

                        const currentTime = ctx.currentTime;
                        if (nextStartTimeRef.current < currentTime) {
                            nextStartTimeRef.current = currentTime;
                        }

                        source.start(nextStartTimeRef.current);
                        nextStartTimeRef.current += buffer.duration;

                        if (onAudioStart) onAudioStart();
                    }
                },
                onclose: () => {
                    stopSession();
                },
                onerror: (err: any) => {
                    console.error("Live session error", err);
                    if (onError) onError(err.message || "Connection lost");
                    stopSession();
                }
            };

            const session = await ai.live.connect({
                model: 'gemini-2.0-flash-exp',
                config: {
                    responseModalities: [Modality.AUDIO],
                    speechConfig: {
                        voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } },
                    },
                    systemInstruction: customSystemInstruction || defaultInstruction,
                },
                callbacks: callbacks
            });

            liveSessionRef.current = session;

            setTimeout(async () => {
                try {
                    // @ts-ignore
                    await session.send("Hello, start the session now.");
                } catch (e) {
                    console.warn("Failed to send initial trigger message:", e);
                }
            }, 500);

        } catch (err) {
            console.error(err);
            setIsLoading(false);
            setIsSessionActive(false);
            if (onError) onError("Failed to start session");
        }
    }, [cleanupAudio, stopSession, onError]);

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
