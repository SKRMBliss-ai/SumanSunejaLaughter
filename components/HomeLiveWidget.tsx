import React, { useState, useEffect, useRef } from 'react';
import { Mic, Loader2, Square, X, Video, MicOff, PhoneOff } from 'lucide-react';
import { useLiveSession } from '../hooks/useLiveSession';
import { useSettings } from '../contexts/SettingsContext';

interface HomeLiveWidgetProps {
    visible: boolean;
}

export const HomeLiveWidget: React.FC<HomeLiveWidgetProps> = ({ visible }) => {
    const { t } = useSettings();
    const [error, setError] = useState<string | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const userVideoRef = useRef<HTMLVideoElement>(null);

    const {
        startSession,
        stopSession,
        isSessionActive,
        isLoading,
        volumeLevel
    } = useLiveSession({
        onSessionEnd: () => {
            setIsModalOpen(false);
        },
        onError: (err) => setError(err),
        onAudioStart: () => {
            if ('speechSynthesis' in window) {
                window.speechSynthesis.cancel();
            }
        }
    });

    // Helper for immediate feedback
    const playImmediateGreeting = (text: string) => {
        if ('speechSynthesis' in window) {
            window.speechSynthesis.cancel();
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.rate = 1.0;
            utterance.lang = 'en-US';

            const voices = window.speechSynthesis.getVoices();
            const femaleVoice = voices.find(v =>
                (v.lang === 'en-US' && (v.name.includes('Female') || v.name.includes('Google') || v.name.includes('Zira')))
            );
            if (femaleVoice) utterance.voice = femaleVoice;

            window.speechSynthesis.speak(utterance);
        }
    };

    const handleStart = async () => {
        setError(null);
        setIsModalOpen(true); // Open modal immediately
        playImmediateGreeting("Connecting...");

        const apiKey = process.env.API_KEY;
        if (!apiKey) {
            setError("API Key missing");
            return;
        }

        const systemInstruction = `You are Suman Suneja, a cheerful, warm, and highly interactive Laughter Yoga and Wellness Coach.
        Your personality is infectious, energetic, and deeply caring.
        
        CORE RESPONSIBILITIES:
        1. Engage in meaningful conversations about Yoga, Meditation, Health, and Laughter Yoga.
        2. If the user brings up serious concerns, acknowledge them with empathy but gently steer the conversation to a lighter, more positive perspective.
        3. Actively encourage the user to laugh. Use humor, playful teasing, or simple laughter exercises to break the tension.
        4. Be a "Joy Catalyst". Your goal is to make the user feel good and smile, no matter what.
        
        CONVERSATION STYLE:
        - Talk like a real person, not a bot. Use "Very Good Very Good Yeah!", "Laugh  Double When in Trouble", "That is wonderful!" naturally.
        - Keep responses concise and conversational (1-3 sentences usually).
        - Interruptions are okay! If the user laughs, laugh with them immediately.
        - STRICTLY NO LECTURING. Do not give long medical advice. Keep it light and wellness-focused.
        
        Example Interaction:
        User: "I'm so stressed about work."
        You: "Oh dear, stress is such a joy-killer! *Giggle* Let's shake it off right now. Take a deep breath with me... and let it out with a big HAHAHA! Come on, try it!"`;

        await startSession(apiKey, systemInstruction);
    };

    const handleStop = () => {
        if ('speechSynthesis' in window) {
            window.speechSynthesis.cancel();
        }
        stopSession();
        setIsModalOpen(false);
    };

    const toggleSession = () => {
        if (isSessionActive) {
            handleStop();
        } else {
            handleStart();
        }
    };

    useEffect(() => {
        if (!visible && isSessionActive) {
            handleStop();
        }
    }, [visible, isSessionActive]);

    // Stop session if user switches tabs or windows
    useEffect(() => {
        const handleVisibilityChange = () => {
            if (document.hidden && isSessionActive) {
                handleStop();
            }
        };

        const handleWindowBlur = () => {
            if (isSessionActive) {
                handleStop();
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        window.addEventListener('blur', handleWindowBlur);

        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            window.removeEventListener('blur', handleWindowBlur);
        };
    }, [isSessionActive]);

    // Handle User Video
    useEffect(() => {
        let stream: MediaStream | null = null;
        if (isModalOpen) {
            navigator.mediaDevices.getUserMedia({ video: true, audio: false })
                .then(s => {
                    stream = s;
                    if (userVideoRef.current) {
                        userVideoRef.current.srcObject = stream;
                    }
                })
                .catch(err => console.warn("Camera access denied or error:", err));
        }

        return () => {
            if (stream) {
                stream.getTracks().forEach(track => track.stop());
            }
        };
    }, [isModalOpen]);


    if (!visible && !isSessionActive && !isModalOpen) return null;

    return (
        <>
            {/* Floating Button */}
            <div className={`fixed bottom-48 left-4 z-40 flex flex-col items-start gap-2 transition-all duration-500 ${visible ? 'translate-x-0' : '-translate-x-20'}`}>
                <div className="relative">
                    {/* Ripples when active */}
                    {isSessionActive && (
                        <>
                            <div className="absolute inset-0 rounded-full bg-purple-500/30 animate-[ping_1.5s_cubic-bezier(0,0,0.2,1)_infinite]"></div>
                            <div className="absolute inset-0 rounded-full bg-purple-500/20 animate-[ping_2s_cubic-bezier(0,0,0.2,1)_infinite] delay-150"></div>
                        </>
                    )}

                    <button
                        onClick={toggleSession}
                        disabled={isLoading}
                        className={`relative w-14 h-14 rounded-full flex items-center justify-center shadow-lg border-2 border-white transition-all duration-300 ${isSessionActive
                            ? 'bg-red-500 hover:bg-red-600 text-white scale-110'
                            : 'bg-gradient-to-br from-purple-500 to-indigo-600 text-white hover:scale-110 active:scale-90 animate-bounce-gentle'
                            }`}
                        title={isSessionActive ? "End Call" : "Talk to Suman"}
                    >
                        {isLoading ? (
                            <Loader2 size={24} className="animate-spin" />
                        ) : isSessionActive ? (
                            <Square size={20} fill="currentColor" />
                        ) : (
                            <Mic size={24} />
                        )}
                    </button>

                    {/* Error Tooltip */}
                    {error && (
                        <div className="absolute left-16 top-2 bg-red-100 text-red-600 text-xs px-2 py-1 rounded whitespace-nowrap animate-fade-in">
                            {error}
                        </div>
                    )}
                </div>
            </div>

            {/* Video Call Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 bg-black/90 flex flex-col items-center justify-center animate-in fade-in duration-300">
                    {/* Main Container */}
                    <div className="relative w-full max-w-md h-full max-h-[90vh] bg-gray-900 rounded-3xl overflow-hidden shadow-2xl flex flex-col border border-gray-800">

                        {/* Header */}
                        <div className="absolute top-0 left-0 right-0 p-4 z-10 flex justify-between items-center bg-gradient-to-b from-black/60 to-transparent">
                            <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                                <span className="text-white font-medium text-sm">Suman Suneja (AI Coach)</span>
                            </div>
                            <button onClick={() => setIsModalOpen(false)} className="text-white/80 hover:text-white">
                                <X size={24} />
                            </button>
                        </div>

                        {/* Main Video (Suman) */}
                        <div className="flex-1 relative bg-gray-800 flex items-center justify-center overflow-hidden">
                            <video
                                src="https://res.cloudinary.com/dfopoyt9v/video/upload/v1764306359/media_1_qcvke1.mp4"
                                autoPlay
                                loop
                                muted
                                playsInline
                                className={`w-full h-full object-cover transition-transform duration-700 ${volumeLevel > 0.05 ? 'scale-105' : 'scale-100'}`}
                            />
                            {/* Speaking Indicator Ring */}
                            {volumeLevel > 0.05 && (
                                <div className="absolute inset-0 border-4 border-purple-500/50 animate-pulse"></div>
                            )}
                        </div>

                        {/* User Video (PIP) */}
                        <div className="absolute bottom-24 right-4 w-32 h-48 bg-black rounded-xl overflow-hidden border-2 border-white/20 shadow-lg">
                            <video
                                ref={userVideoRef}
                                autoPlay
                                muted
                                playsInline
                                className="w-full h-full object-cover transform scale-x-[-1]"
                            />
                        </div>

                        {/* Controls */}
                        <div className="h-20 bg-gray-900 flex items-center justify-center gap-6 pb-4">
                            <button className="p-4 rounded-full bg-gray-800 text-white hover:bg-gray-700 transition-colors">
                                <MicOff size={24} />
                            </button>
                            <button
                                onClick={handleStop}
                                className="p-4 rounded-full bg-red-600 text-white hover:bg-red-700 transition-colors transform hover:scale-110 active:scale-95 shadow-lg"
                            >
                                <PhoneOff size={32} fill="currentColor" />
                            </button>
                            <button className="p-4 rounded-full bg-gray-800 text-white hover:bg-gray-700 transition-colors">
                                <Video size={24} />
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};
