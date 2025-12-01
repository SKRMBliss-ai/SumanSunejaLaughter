import React, { useEffect, useRef, useState } from 'react';
import { Mic, Loader2, Square, X, Video, PhoneOff } from 'lucide-react';
import { useSettings } from '../contexts/SettingsContext';
import { useLiveWidget } from '../contexts/LiveWidgetContext';
import { useStartLiveSession } from '../hooks/useStartLiveSession';

interface HomeLiveWidgetProps {
    visible: boolean;
}

export const HomeLiveWidget: React.FC<HomeLiveWidgetProps> = ({ visible }) => {
    const { t, currentTheme } = useSettings();
    const { isWidgetOpen, openWidget, closeWidget } = useLiveWidget();
    const [isCameraOn, setIsCameraOn] = useState(true);
    const userVideoRef = useRef<HTMLVideoElement>(null);

    // Shared live session logic
    const {
        error,
        hasAIStartedSpeaking,
        isSessionActive,
        isLoading,
        volumeLevel,
        startLive,
        stopLive,
        setError,
        setHasAIStartedSpeaking,
    } = useStartLiveSession();

    const handleStart = async () => {
        openWidget(); // open modal
        setHasAIStartedSpeaking(false);
        await startLive();
    };

    const handleStop = () => {
        stopLive();
        closeWidget();
    };

    const toggleSession = () => {
        if (isSessionActive) {
            handleStop();
        } else {
            handleStart();
        }
    };

    const toggleCamera = () => {
        setIsCameraOn(prev => !prev);
    };

    // Close session if component becomes invisible while active
    useEffect(() => {
        if (!visible && isSessionActive) {
            handleStop();
        }
    }, [visible, isSessionActive]);

    // Auto‑start when widget is opened via context
    useEffect(() => {
        if (isWidgetOpen && !isSessionActive && !isLoading) {
            handleStart();
        }
    }, [isWidgetOpen]);

    // Stop session on tab/window blur or visibility change
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

    // Acquire user video stream when widget is open
    useEffect(() => {
        let stream: MediaStream | null = null;
        if (isWidgetOpen) {
            navigator.mediaDevices
                .getUserMedia({ video: true, audio: false })
                .then(s => {
                    stream = s;
                    if (userVideoRef.current) {
                        userVideoRef.current.srcObject = stream;
                    }
                    // Apply current camera state
                    s.getVideoTracks().forEach(track => (track.enabled = isCameraOn));
                })
                .catch(err => console.warn('Camera access denied or error:', err));
        }
        return () => {
            if (stream) {
                stream.getTracks().forEach(track => track.stop());
            }
        };
    }, [isWidgetOpen]);

    // React to camera toggle changes
    useEffect(() => {
        if (userVideoRef.current && userVideoRef.current.srcObject) {
            const stream = userVideoRef.current.srcObject as MediaStream;
            stream.getVideoTracks().forEach(track => (track.enabled = isCameraOn));
        }
    }, [isCameraOn]);

    if (!visible && !isSessionActive && !isWidgetOpen) return null;

    return (
        <>
            {/* Floating Button */}
            <div className={`fixed bottom-48 left-4 z-40 flex flex-col items-start gap-2 transition-all duration-500 ${visible ? 'translate-x-0' : '-translate-x-20'}`}>
                <div className="relative">
                    {/* Ripples when active */}
                    {isSessionActive && (
                        <>
                            <div className={`absolute inset-0 rounded-full ${currentTheme.MIC_RIPPLE} animate-[ping_1.5s_cubic-bezier(0,0,0.2,1)_infinite]`} />
                            <div className={`absolute inset-0 rounded-full ${currentTheme.MIC_RIPPLE} animate-[ping_2s_cubic-bezier(0,0,0.2,1)_infinite] delay-150`} />
                        </>
                    )}
                    <button
                        onClick={toggleSession}
                        disabled={isLoading}
                        className={`relative w-14 h-14 rounded-full flex items-center justify-center shadow-lg border-2 border-white transition-all duration-300 ${isSessionActive ? 'bg-red-500 hover:bg-red-600 text-white scale-110' : `${currentTheme.MIC_BTN} active:scale-90 animate-bounce-gentle`}`}
                        title={isSessionActive ? 'End Call' : 'Talk to Suman'}
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
                    <div className={`relative w-full max-w-md h-full max-h-[90vh] bg-gray-900 rounded-3xl overflow-hidden shadow-2xl flex flex-col border ${currentTheme.HEADER_BORDER}`}>
                        {/* Header */}
                        <div className="absolute top-0 left-0 right-0 p-4 z-10 flex justify-between items-center bg-gradient-to-b from-black/60 to-transparent">
                            <div className="flex items-center gap-2">
                                <div className={`w-2 h-2 rounded-full ${hasAIStartedSpeaking ? 'bg-green-500 animate-pulse' : 'bg-yellow-500'}`} />
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
                                        <div className={`w-24 h-24 rounded-full ${currentTheme.VIDEO_RING_1} flex items-center justify-center animate-[ping_2s_infinite]`}>
                                            <div className={`w-16 h-16 rounded-full ${currentTheme.VIDEO_RING_2} flex items-center justify-center animate-[ping_1.5s_infinite]`}>
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
                                    {volumeLevel > 0.05 && (
                                        <div className={`absolute inset-0 border-4 ${currentTheme.VIDEO_BORDER} animate-pulse`} />
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
                                className={`w-full h-full object-cover transform scale-x-[-1] ${!isCameraOn ? 'hidden' : ''}`}
                            />
                            {!isCameraOn && (
                                <div className="w-full h-full flex items-center justify-center bg-gray-800 text-white/50">
                                    <Video size={32} />
                                </div>
                            )}
                        </div>
                        {/* Controls */}
                        <div className="h-20 bg-gray-900 flex items-center justify-center gap-6 pb-4">
                            <button
                                onClick={handleStop}
                                className="p-4 rounded-full bg-red-600 text-white hover:bg-red-700 transition-colors transform hover:scale-110 active:scale-95 shadow-lg animate-pulse"
                            >
                                <PhoneOff size={32} fill="currentColor" />
                            </button>
                            <button
                                onClick={toggleCamera}
                                className={`p-4 rounded-full transition-colors ${isCameraOn ? 'bg-gray-800 text-white hover:bg-gray-700' : 'bg-white text-gray-900 hover:bg-gray-200'}`}
                            >
                                <Video size={24} />
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};
