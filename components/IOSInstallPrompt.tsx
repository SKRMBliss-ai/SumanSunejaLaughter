import React, { useState, useEffect } from 'react';
import { Share, X } from 'lucide-react';

export const IOSInstallPrompt: React.FC = () => {
    const [showPrompt, setShowPrompt] = useState(false);
    const [isIPad, setIsIPad] = useState(false);

    useEffect(() => {
        // Detect if device is iOS
        const userAgent = window.navigator.userAgent.toLowerCase();
        const isIOS = /iphone|ipad|ipod/.test(userAgent);
        const isMacWithTouch = (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
        const isAppleMobile = (isIOS || isMacWithTouch) && !(window as any).MSStream;

        // Detect if app is already in standalone mode (installed)
        const isStandalone = (window.navigator as any).standalone;

        // Show prompt only on iOS and if not already installed
        if (isAppleMobile && !isStandalone) {
            // Check if user has already dismissed it recently (optional, but good UX)
            const hasDismissed = localStorage.getItem('iosInstallPromptDismissed');
            if (!hasDismissed) {
                setShowPrompt(true);
                setIsIPad(/ipad/.test(userAgent) || isMacWithTouch);
            }
        }
    }, []);

    const handleDismiss = () => {
        setShowPrompt(false);
        localStorage.setItem('iosInstallPromptDismissed', 'true');
    };

    if (!showPrompt) return null;

    const positionClass = isIPad
        ? "fixed top-20 right-4 max-w-sm animate-in slide-in-from-top-10"
        : "fixed bottom-20 left-4 right-4 animate-in slide-in-from-bottom-10";

    const arrowClass = isIPad
        ? "absolute -top-2 right-8 w-4 h-4 bg-white dark:bg-slate-800 border-t border-l border-gray-200 dark:border-slate-700 transform rotate-45"
        : "absolute -bottom-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-white dark:bg-slate-800 border-b border-r border-gray-200 dark:border-slate-700 transform rotate-45";

    return (
        <div className={`${positionClass} bg-white dark:bg-slate-800 p-4 rounded-xl shadow-2xl border border-gray-200 dark:border-slate-700 z-50 fade-in duration-500`}>
            <button
                onClick={handleDismiss}
                className="absolute top-2 right-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
            >
                <X size={20} />
            </button>

            <div className="flex items-start gap-4 pr-6">
                <div className="bg-gray-100 dark:bg-slate-700 p-3 rounded-lg shrink-0">
                    <img src="/icon.svg" alt="App Icon" className="w-8 h-8" />
                </div>
                <div>
                    <h3 className="font-bold text-gray-900 dark:text-white text-sm mb-1">
                        Install App for Best Experience
                    </h3>
                    <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed">
                        Install this app on your {isIPad ? 'iPad' : 'iPhone'} for fullscreen access and offline mode.
                    </p>
                    <div className="mt-3 flex flex-col gap-2 text-xs text-gray-700 dark:text-gray-200">
                        <div className="flex items-center gap-2">
                            <span className="flex items-center justify-center w-5 h-5 bg-gray-100 dark:bg-slate-700 rounded-full font-bold text-[10px]">1</span>
                            <span>Tap the <Share size={14} className="inline mx-1 text-blue-500" /> Share button {isIPad ? 'at the top' : 'below'}</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="flex items-center justify-center w-5 h-5 bg-gray-100 dark:bg-slate-700 rounded-full font-bold text-[10px]">2</span>
                            <span>Select <span className="font-semibold">Add to Home Screen</span></span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Pointing Arrow */}
            <div className={arrowClass}></div>
        </div>
    );
};
