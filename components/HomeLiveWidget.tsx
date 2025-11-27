import React, { useState, useEffect } from 'react';
import { Mic, Loader2, Square } from 'lucide-react';
import { useLiveSession } from '../hooks/useLiveSession';
import { useSettings } from '../contexts/SettingsContext';

interface HomeLiveWidgetProps {
    visible: boolean;
}

export const HomeLiveWidget: React.FC<HomeLiveWidgetProps> = ({ visible }) => {
    const { t } = useSettings();
    const [error, setError] = useState<string | null>(null);

    const {
        startSession,
        stopSession,
        isSessionActive,
        isLoading,
        volumeLevel
    } = useLiveSession({
        onSessionEnd: () => {
            // Session ended
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
            utterance.rate = 1.0; // Slightly slower for clarity
            utterance.lang = 'en-US'; // Force English to avoid wrong language selection

            // Try to select a female voice (e.g., Google US English, Microsoft Zira)
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
                    title={isSessionActive ? "End Conversation" : "Start Voice Chat"}
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
    );
};
