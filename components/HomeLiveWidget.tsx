import React, { useState, useEffect, useRef } from 'react';
import { Mic, Loader2, Square, X, Video, PhoneOff } from 'lucide-react';
import { useLiveSession } from '../hooks/useLiveSession';
import { useSettings } from '../contexts/SettingsContext';
import { useLiveWidget } from '../contexts/LiveWidgetContext';

interface HomeLiveWidgetProps {
    visible: boolean;
}

export const HomeLiveWidget: React.FC<HomeLiveWidgetProps> = ({ visible }) => {
    const { t } = useSettings();
    const { isWidgetOpen, openWidget, closeWidget } = useLiveWidget();
    const [error, setError] = useState<string | null>(null);
    const [hasAIStartedSpeaking, setHasAIStartedSpeaking] = useState(false);
    const userVideoRef = useRef<HTMLVideoElement>(null);
    const ringtoneRef = useRef<HTMLAudioElement | null>(null);

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
        volumeLevel
    } = useLiveSession({
        onSessionEnd: () => {
            closeWidget();
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
        }
    });

    const handleStart = async () => {
        setError(null);
        openWidget(); // Open modal via context
        setHasAIStartedSpeaking(false);

        // Play Ringtone
        if (!ringtoneRef.current) {
            ringtoneRef.current = new Audio("https://res.cloudinary.com/dfopoyt9v/video/upload/v1764309131/ringtone-023-376906_t3rona.mp3");
            ringtoneRef.current.loop = true;
        }
        ringtoneRef.current.play().catch(err => console.warn("Ringtone playback failed:", err));

        const apiKey = process.env.API_KEY;
        if (!apiKey) {
            setError("API Key missing");
            stopRingtone();
            return;
        }

        // Use a simpler instruction to ensure immediate response
        const systemInstruction = `You are Suman Suneja, a cheerful Laughter Yoga Coach.
        Your goal is to make the user laugh immediately.
        Start by saying "Hello! Are you ready to laugh?" and then laugh loudly.
        Encourage the user to join you.`;

        await startSession(apiKey, systemInstruction);
    };

    const handleStop = () => {
        if ('speechSynthesis' in window) {
            window.speechSynthesis.cancel();
        }
        stopRingtone();
        stopSession();
        closeWidget();
        setHasAIStartedSpeaking(false);
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

    // Automatically start session when widget is opened
    useEffect(() => {
        if (isWidgetOpen && !isSessionActive && !isLoading) {
            handleStart();
        }
    }, [isWidgetOpen]);

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
        if (isWidgetOpen) {
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
    }, [isWidgetOpen]);


    if (!visible && !isSessionActive && !isWidgetOpen) return null;

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
            {isWidgetOpen && (
                <div className="fixed inset-0 z-50 bg-black/90 flex flex-col items-center justify-center animate-in fade-in duration-300">
                    {/* Main Container */}
                    <div className="relative w-full max-w-md h-full max-h-[90vh] bg-gray-900 rounded-3xl overflow-hidden shadow-2xl flex flex-col border border-gray-800">

                        {/* Header */}
                        <div className="absolute top-0 left-0 right-0 p-4 z-10 flex justify-between items-center bg-gradient-to-b from-black/60 to-transparent">
                            <div className="flex items-center gap-2">
                                <div className={`w-2 h-2 rounded-full ${hasAIStartedSpeaking ? 'bg-green-500 animate-pulse' : 'bg-yellow-500'}`}></div>
                                <span className="text-white font-medium text-sm">
                                    {hasAIStartedSpeaking ? 'Suman Suneja (AI Coach)' : 'Calling Suman...'}
                                </span>
                            </div>
                            <button onClick={handleStop} className="text-white/80 hover:text-white">
                                <X size={24} />
                            </button>
                        </div>

                        {/* Main Video (Suman) */}
                        <div className="flex-1 relative bg-gray-800 flex items-center justify-center overflow-hidden">
                            {!hasAIStartedSpeaking ? (
                                // Ringing State
                                <div className="relative w-full h-full flex items-center justify-center">
                                    <img
                                        src="https://res.cloudinary.com/dfopoyt9v/image/upload/v1764307833/Gemini_Generated_Image_g3m0lng3m0lng3m0_ttyvxr.png"
                                        alt="Suman Suneja"
                                        className="w-full h-full object-cover opacity-50 blur-sm scale-110"
                                    />
                                    <div className="absolute inset-0 flex flex-col items-center justify-center z-10">
                                        <div className="w-24 h-24 rounded-full bg-purple-500/20 flex items-center justify-center animate-[ping_2s_infinite]">
                                            <div className="w-16 h-16 rounded-full bg-purple-500/40 flex items-center justify-center animate-[ping_1.5s_infinite]">
                                                <img src="https://res.cloudinary.com/dfopoyt9v/image/upload/v1764307833/Gemini_Generated_Image_g3m0lng3m0lng3m0_ttyvxr.png" className="w-12 h-12 rounded-full object-cover border-2 border-white" />
                                            </div>
                                        </div>
                                        <p className="mt-4 text-white font-bold text-lg animate-pulse">Connecting...</p>
                                    </div>
                                </div>
                            ) : (
                                // Connected State (Video Loop)
                                <>
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
                                </>
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
                            <button
                                onClick={handleStop}
                                className="p-4 rounded-full bg-red-600 text-white hover:bg-red-700 transition-colors transform hover:scale-110 active:scale-95 shadow-lg animate-pulse"
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
