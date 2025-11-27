import React, { useState, useEffect } from 'react';
import { Mic, X, Loader2, StopCircle } from 'lucide-react';
import { useLiveSession } from '../hooks/useLiveSession';
import { useSettings } from '../contexts/SettingsContext';

interface HomeLiveWidgetProps {
    visible: boolean;
}

export const HomeLiveWidget: React.FC<HomeLiveWidgetProps> = ({ visible }) => {
    const { t } = useSettings();
    const [showModal, setShowModal] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const {
        startSession,
        stopSession,
        isSessionActive,
        isLoading,
        volumeLevel
    } = useLiveSession({
        onSessionEnd: () => {
            // Don't close modal immediately, maybe show feedback? 
            // For now, just close it after a delay or let user close it.
            setTimeout(() => setShowModal(false), 1000);
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
            utterance.rate = 1.1;
            window.speechSynthesis.speak(utterance);
        }
    };

    const handleStart = async () => {
        setError(null);
        setShowModal(true);
        playImmediateGreeting("Starting live session");

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
    };

    // If not visible and not active, don't render button (but keep modal if active?)
    // User said "widget on home screen". If I navigate away, should the call end?
    // Usually yes.
    // So if !visible, we should probably return null, but if session is active, maybe we want to keep it?
    // For simplicity, if !visible, we hide the widget. If session is active, it might continue in background or we should stop it.
    // Let's stop it if we leave Home.

    useEffect(() => {
        if (!visible && isSessionActive) {
            handleStop();
        }
    }, [visible]);

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

    if (!visible && !isSessionActive) return null;

    return (
        <>
            {/* Floating Widget Button */}
            <div className={`fixed bottom-48 left-4 z-40 flex flex-col items-start gap-2 transition-all duration-500 ${visible ? 'translate-x-0' : '-translate-x-20'}`}>
                <button
                    onClick={handleStart}
                    className="w-12 h-12 rounded-full flex items-center justify-center shadow-lg border-2 border-white bg-gradient-to-br from-purple-500 to-indigo-600 text-white hover:scale-110 transition-transform active:scale-90 animate-bounce-gentle"
                    title="Start Voice Chat"
                >
                    <Mic size={20} />
                </button>
            </div>

            {/* Full Screen Overlay / Modal when Active */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="bg-white dark:bg-slate-800 rounded-[2rem] p-8 w-full max-w-sm shadow-2xl relative border-4 border-purple-100 dark:border-slate-700 flex flex-col items-center">

                        <button
                            onClick={() => { handleStop(); setShowModal(false); }}
                            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-2 rounded-full hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
                        >
                            <X size={24} />
                        </button>

                        <h3 className="text-2xl font-fredoka font-bold text-gray-800 dark:text-gray-100 mb-2">Voice Chat</h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mb-8 text-center">
                            {isLoading ? "Connecting..." : isSessionActive ? "Listening..." : "Session Ended"}
                        </p>

                        {/* Visualizer */}
                        <div className="relative w-64 h-64 flex items-center justify-center mb-8">
                            {/* Ripples */}
                            {isSessionActive && (
                                <>
                                    <div className="absolute w-full h-full rounded-full bg-purple-500/20 animate-[ping_1.5s_cubic-bezier(0,0,0.2,1)_infinite]"></div>
                                    <div className="absolute w-3/4 h-3/4 rounded-full bg-purple-500/30 animate-[ping_2s_cubic-bezier(0,0,0.2,1)_infinite]"></div>
                                </>
                            )}

                            {/* Main Circle */}
                            <div
                                className={`relative w-48 h-48 rounded-full bg-gradient-to-br from-purple-100 to-white dark:from-slate-700 dark:to-slate-600 flex items-center justify-center shadow-inner border-4 border-white dark:border-slate-500 transition-all duration-100`}
                                style={{ transform: `scale(${1 + Math.min(volumeLevel * 2, 0.5)})` }}
                            >
                                <div className="absolute w-36 h-36 rounded-full bg-white dark:bg-slate-800 flex items-center justify-center shadow-lg overflow-hidden p-4">
                                    {isLoading ? (
                                        <Loader2 className="w-12 h-12 text-purple-500 animate-spin" />
                                    ) : (
                                        <Mic className={`w-12 h-12 text-purple-500 ${isSessionActive ? 'animate-pulse' : ''}`} />
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Controls */}
                        <button
                            onClick={handleStop}
                            className="bg-red-50 hover:bg-red-100 text-red-500 font-bold py-4 px-8 rounded-2xl flex items-center gap-2 transition-colors w-full justify-center"
                        >
                            <StopCircle size={24} /> End Session
                        </button>

                        {error && (
                            <p className="text-red-400 text-xs mt-4 text-center">{error}</p>
                        )}

                    </div>
                </div>
            )}
        </>
    );
};
