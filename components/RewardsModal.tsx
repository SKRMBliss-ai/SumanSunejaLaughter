import React, { useState } from 'react';
import { X, ShoppingBag, ExternalLink, Flame, Target, Trophy, Award, Check, Infinity, Lock, Share2, Zap, Mic, Star, Gamepad2, PlayCircle } from 'lucide-react';
import { useSettings } from '../contexts/SettingsContext';
import { RewardState } from '../types';
import { getLevelTitle, calculateLongestStreak, addPoints } from '../services/rewardService';

interface RewardsModalProps {
    isOpen: boolean;
    onClose: () => void;
    rewards: RewardState;
}

const MERCHANDISE = [
    {
        id: 1,
        name: "Laughter Mug",
        price: 150,
        image: "https://res.cloudinary.com/dfopoyt9v/image/upload/v1765823285/mug_ags64s.png",
        type: "Accessory",
        requiredPoints: 100
    },
    {
        id: 2,
        name: "Laughter Ball (Pack of 4)",
        price: 220,
        image: "https://res.cloudinary.com/dfopoyt9v/image/upload/v1765823386/ball_gsfucq.png",
        type: "Accessory",
        requiredPoints: 300
    },
    {
        id: 3,
        name: "Laughter T-Shirt",
        price: 450,
        image: "https://res.cloudinary.com/dfopoyt9v/image/upload/v1765823629/ChatGPT_Image_Dec_15_2025_04_02_13_PM_ovpyuk.png",
        type: "Apparel",
        requiredPoints: 700
    },
    {
        id: 4,
        name: "Laugh LED T-Shirt",
        price: 800,
        image: "https://res.cloudinary.com/dfopoyt9v/image/upload/v1765823505/LED_dxg1tb.png",
        type: "Apparel",
        requiredStreak: 30
    }
];

export const RewardsModal: React.FC<RewardsModalProps> = ({ isOpen, onClose, rewards }) => {
    const { currentTheme } = useSettings();
    const [activeTab, setActiveTab] = useState<'journey' | 'shop'>('journey');
    const [showPointsInfo, setShowPointsInfo] = useState(false);
    const [isSharing, setIsSharing] = useState(false);

    if (!isOpen) return null;
    if (!rewards) return null;

    const dailyTarget = 50;
    // Fix: If points is a multiple of 50 (and >0), show 50/50 (complete) instead of 0/50 (empty)
    const remainder = rewards.points % dailyTarget;
    const dailyProgress = (remainder === 0 && rewards.points > 0) ? dailyTarget : remainder;

    // Calculate Streak Metrics
    const history = rewards.activityHistory || [];
    const longestStreak = calculateLongestStreak(history);
    const totalActiveDays = history.length;

    const handleClaim = (item: string) => {
        const message = `Hello! I would like to redeem a coupon for: ${item}. My User ID is...`;
        window.open(`https://wa.me/918217581238?text=${encodeURIComponent(message)}`, '_blank');
    };

    const handleMerchClick = (item: typeof MERCHANDISE[0]) => {
        handleClaim(`${item.name} (₹${item.price})`);
    };

    const handleShareApp = async (e?: React.MouseEvent) => {
        if (e) e.stopPropagation();
        if (isSharing) return;
        setIsSharing(true);
        try {
            if (navigator.share) {
                await navigator.share({
                    title: 'Ignite Your Inner Smile!',
                    text: 'Join me on a journey to wellness with this Laughter Yoga app. It is amazing!',
                    url: window.location.href,
                });
                // Reward user
                await addPoints(20, 'Shared App', 'BONUS');
            } else {
                // Fallback for desktop/unsupported
                await navigator.clipboard.writeText(window.location.href);
                await addPoints(20, 'Shared Link (Copied)', 'BONUS');
                alert("Link copied to clipboard! Points added.");
            }
        } catch (error) {
            console.error("Share failed", error);
        } finally {
            setIsSharing(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/40 backdrop-blur-md animate-in fade-in duration-300">
            <div className={`w-full max-w-sm rounded-[2.5rem] shadow-2xl flex flex-col relative overflow-hidden animate-in zoom-in-95 duration-300 ${currentTheme.BG_GRADIENT_LIGHT} border border-white/40`}>

                {/* Header Background Pattern */}
                <div className="absolute top-0 left-0 w-full h-48 bg-white/40 dark:bg-slate-800/50 backdrop-blur-md z-0"
                    style={{ borderBottomLeftRadius: '2.5rem', borderBottomRightRadius: '2.5rem' }}></div>

                {/* Close Button */}
                <button
                    onClick={onClose}
                    className="absolute top-5 right-5 z-20 p-2 rounded-full bg-white/50 hover:bg-white/80 dark:bg-white/10 dark:hover:bg-white/20 transition-colors shadow-sm"
                >
                    <X size={18} className="text-gray-700 dark:text-gray-200" />
                </button>

                {/* Title */}
                <div className="relative z-10 flex flex-col items-center pt-8 pb-4">
                    <div className="flex items-center gap-2 mb-1">
                        <ShoppingBag className="text-pink-600 fill-pink-600/20" size={20} />
                        <h2 className={`text-lg font-black text-slate-900 dark:text-white tracking-tight`}>Rewards Shop</h2>
                    </div>
                    <p className={`text-xs text-slate-600 dark:text-gray-300 font-bold`}>Exclusive Laughter Assets</p>
                </div>

                {/* Tabs */}
                <div className="relative z-10 mx-6 mb-4 p-1 bg-white/60 dark:bg-slate-700/50 rounded-2xl flex border border-white/30 shadow-sm backdrop-blur-sm">
                    <button
                        onClick={() => setActiveTab('journey')}
                        className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all duration-300 flex items-center justify-center gap-2 ${activeTab === 'journey'
                            ? 'bg-white dark:bg-slate-800 shadow-md scale-[1.02] text-slate-900 dark:text-white'
                            : 'text-slate-500 dark:text-gray-400 hover:bg-white/40'
                            }`}
                    >
                        <Trophy size={14} className={activeTab === 'journey' ? 'text-yellow-500 fill-yellow-500' : ''} />
                        Journey
                    </button>
                    <button
                        onClick={() => setActiveTab('shop')}
                        className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all duration-300 flex items-center justify-center gap-2 ${activeTab === 'shop'
                            ? 'bg-white dark:bg-slate-800 shadow-md scale-[1.02] text-slate-900 dark:text-white'
                            : 'text-slate-500 dark:text-gray-400 hover:bg-white/40'
                            }`}
                    >
                        <ShoppingBag size={14} className={activeTab === 'shop' ? 'text-pink-500 fill-pink-500' : ''} />
                        Shop
                    </button>
                </div>

                {/* Content Area */}
                <div className="flex-1 overflow-y-auto px-6 pb-6 relative z-10 no-scrollbar">

                    {/* Journey View */}
                    {activeTab === 'journey' && (
                        <div className="space-y-4 animate-in slide-in-from-left-8 duration-300">

                            {/* --- TOP SECTION: My Streaks (Refined Light Mode) --- */}
                            <div className="bg-white/80 dark:bg-slate-900/90 rounded-3xl p-4 shadow-sm border border-white/50 dark:border-slate-700 relative overflow-hidden backdrop-blur-md">
                                <div className="flex items-center justify-between mb-3 relative z-10">
                                    <h3 className="text-sm font-black flex items-center gap-2 text-slate-800 dark:text-white">
                                        <Flame size={18} className="text-orange-500 fill-orange-500" />
                                        My Streaks
                                    </h3>
                                    <div className="text-[10px] font-bold bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full text-slate-500 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                                        Consistency is Key
                                    </div>
                                </div>

                                <div className="grid grid-cols-3 gap-3 relative z-10">
                                    {/* Total Active Days */}
                                    <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-2.5 flex flex-col items-center justify-center border border-slate-100 dark:border-slate-700">
                                        <Infinity size={16} className="text-blue-500 mb-1" />
                                        <span className="text-lg font-black text-slate-800 dark:text-white leading-none mb-0.5">{totalActiveDays}</span>
                                        <span className="text-[9px] uppercase font-bold text-slate-400 leading-top">Days</span>
                                    </div>

                                    {/* Longest Streak */}
                                    <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-2.5 flex flex-col items-center justify-center border border-slate-100 dark:border-slate-700">
                                        <Trophy size={16} className="text-yellow-500 mb-1" />
                                        <span className="text-lg font-black text-slate-800 dark:text-white leading-none mb-0.5">{longestStreak}</span>
                                        <span className="text-[9px] uppercase font-bold text-slate-400 leading-top">Best</span>
                                    </div>

                                    {/* Current Streak (Highlighted) */}
                                    <div className="bg-orange-50 dark:bg-orange-900/20 rounded-2xl p-2.5 flex flex-col items-center justify-center border border-orange-100 dark:border-orange-500/30 relative overflow-hidden group">
                                        <div className="absolute inset-0 bg-orange-400/5 dark:bg-orange-400/10 animate-pulse pointer-events-none"></div>
                                        <Flame size={16} className="text-orange-500 fill-orange-500 mb-1 relative z-10" />
                                        <span className="text-lg font-black text-orange-600 dark:text-orange-100 leading-none mb-0.5 relative z-10">{rewards.streak}</span>
                                        <span className="text-[9px] uppercase font-bold text-orange-400 dark:text-orange-300 leading-top relative z-10">Current</span>
                                    </div>
                                </div>
                            </div>

                            {/* --- Share App Shortcut (Prominent) --- */}
                            <button
                                onClick={(e) => handleShareApp(e)}
                                className="w-full bg-gradient-to-r from-purple-500 to-indigo-600 rounded-2xl p-3 flex items-center justify-between shadow-lg shadow-purple-500/20 active:scale-[0.98] transition-all group border border-purple-400/20"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="bg-white/20 p-2 rounded-xl text-white">
                                        <Share2 size={18} />
                                    </div>
                                    <div className="text-left">
                                        <div className="text-xs font-bold text-purple-100 uppercase tracking-wide">Instant Reward</div>
                                        <div className="text-sm font-black text-white">Share App & Earn +20</div>
                                    </div>
                                </div>
                                <div className="bg-white text-purple-600 px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1 shadow-sm group-hover:bg-purple-50 transition-colors">
                                    <Zap size={12} className="fill-current" />
                                    Claim
                                </div>
                            </button>

                            {/* Points & Level Card (High Contrast) */}
                            <div className="bg-white/70 dark:bg-slate-800/80 rounded-3xl p-5 shadow-sm border border-white/60 dark:border-slate-700 relative overflow-hidden group backdrop-blur-xl">
                                <div className="absolute top-0 right-0 p-3 opacity-5 group-hover:opacity-10 transition-opacity">
                                    <Trophy size={100} className="text-yellow-500 rotate-12" />
                                </div>

                                <div className="flex justify-between items-start relative z-10">
                                    <div>
                                        <p className="text-[11px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-1">Total Balance</p>
                                        <h3 className={`text-5xl font-black text-slate-800 dark:text-white leading-tight`}>{rewards.points}</h3>
                                        <div className="mt-2 inline-flex items-center gap-1.5 bg-yellow-400/20 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-300 px-3 py-1 rounded-full border border-yellow-400/30 dark:border-yellow-700">
                                            <Award size={12} className="fill-current" />
                                            <span className="text-[10px] font-bold uppercase tracking-wide">{getLevelTitle(rewards.points)}</span>
                                        </div>
                                    </div>
                                    {/* Daily Goal - High Contrast */}
                                    <div className="text-right flex flex-col items-end">
                                        <div className="w-12 h-12 rounded-full border-4 border-slate-100 dark:border-slate-700 flex items-center justify-center bg-white dark:bg-slate-800 relative">
                                            {/* Circular Progress SVG */}
                                            <svg className="absolute inset-0 w-full h-full -rotate-90">
                                                <circle cx="24" cy="24" r="20" fill="none" strokeWidth="4" className="stroke-slate-100 dark:stroke-slate-700" />
                                                <circle cx="24" cy="24" r="20" fill="none" strokeWidth="4"
                                                    className="stroke-green-500 transition-all duration-1000 ease-out"
                                                    strokeDasharray={125}
                                                    strokeDashoffset={125 - (dailyProgress / dailyTarget) * 125}
                                                    strokeLinecap="round"
                                                />
                                            </svg>
                                            <span className="text-[10px] font-black text-slate-700 dark:text-white z-10">{dailyProgress}/{dailyTarget}</span>
                                        </div>
                                        <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 mt-2 uppercase tracking-tight">Daily Goal</span>
                                    </div>
                                </div>
                            </div>

                            {/* How to Earn (Renamed & Mapped) */}
                            <div className="bg-white/50 dark:bg-slate-800/40 rounded-3xl overflow-hidden border border-white/40 dark:border-slate-700 backdrop-blur-sm">
                                <button
                                    onClick={() => setShowPointsInfo(!showPointsInfo)}
                                    className="w-full flex items-center justify-between p-4 hover:bg-white/20 transition-colors"
                                >
                                    <div className="flex items-center gap-2">
                                        <Target size={16} className={`text-indigo-600 dark:text-indigo-400`} />
                                        <span className={`text-xs font-black text-slate-700 dark:text-gray-100 uppercase tracking-widest`}>How to Earn</span>
                                    </div>
                                    <div className={`p-1 rounded-full bg-white/40 dark:bg-slate-600 transition-transform duration-300 ${showPointsInfo ? 'rotate-180' : ''}`}>
                                        <ExternalLink size={12} className="text-slate-600 dark:text-gray-300" />
                                    </div>
                                </button>

                                {showPointsInfo && (
                                    <div className="px-4 pb-4 animate-in slide-in-from-top-2 duration-200">
                                        <div className="space-y-2">
                                            {[
                                                { label: "Daily Login", points: "+20", icon: Check, action: null },
                                                { label: "Quick 1-Min Laugh", points: "+20", icon: Zap, action: null },
                                                { label: "Live Session", points: "+30", icon: Mic, action: null },
                                                { label: "Rate My Laugh", points: "+15", icon: Star, action: null },
                                                { label: "Play Games", points: "+10", icon: Gamepad2, action: null },
                                                { label: "Watch Video", points: "+5", icon: PlayCircle, action: null },
                                                { label: "Share App", points: "+20", icon: Share2, action: handleShareApp, highlight: true }
                                            ].map((item, idx) => (
                                                <div
                                                    key={idx}
                                                    className={`
                                                        flex items-center justify-between p-3 rounded-xl transition-all
                                                        ${item.highlight
                                                            ? 'bg-purple-50 border border-purple-100 dark:bg-purple-900/20 dark:border-purple-500/20 cursor-pointer hover:bg-purple-100 dark:hover:bg-purple-900/30 active:scale-98'
                                                            : 'bg-white/60 dark:bg-slate-700/40 border border-white/20 dark:border-white/5'}
                                                    `}
                                                    onClick={item.action ? (e) => item.action && item.action(e) : undefined}
                                                >
                                                    <div className="flex items-center gap-3 relative z-10">
                                                        <div className={`
                                                            p-1.5 rounded-lg 
                                                            ${item.highlight ? 'bg-purple-500 text-white shadow-sm' : 'bg-slate-100 dark:bg-slate-600 text-slate-500 dark:text-slate-300'}
                                                        `}>
                                                            <item.icon size={12} strokeWidth={2.5} />
                                                        </div>
                                                        <span className={`text-xs font-bold text-slate-700 dark:text-gray-200`}>{item.label}</span>
                                                    </div>
                                                    <div className="flex items-center gap-2 relative z-10">
                                                        {item.highlight && isSharing && (
                                                            <span className="text-[9px] text-purple-600 font-bold animate-pulse">Sharing...</span>
                                                        )}
                                                        <span className={`text-xs font-black ${item.highlight ? 'text-purple-600 dark:text-purple-300' : 'text-green-600 dark:text-green-400'}`}>
                                                            {item.points}
                                                        </span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Shop View */}
                    {activeTab === 'shop' && (
                        <div className="grid grid-cols-2 gap-3 animate-in slide-in-from-right-8 duration-300">
                            {MERCHANDISE.map(item => {
                                // Determine Lock Requirement
                                const needsStreak = item.requiredStreak && rewards.streak < item.requiredStreak;
                                const needsPoints = item.requiredPoints && rewards.points < item.requiredPoints;
                                const isLocked = needsStreak || needsPoints;

                                // Calculate Progress for visual feedback
                                let progress = 100;
                                let reqLabel = "";
                                let subLabel = "";

                                if (needsStreak) {
                                    progress = Math.min(100, (rewards.streak / (item.requiredStreak || 1)) * 100);
                                    reqLabel = `Streak ${item.requiredStreak} Days`;
                                    subLabel = `${(item.requiredStreak || 0) - rewards.streak} more days`;
                                } else if (needsPoints) {
                                    progress = Math.min(100, (rewards.points / (item.requiredPoints || 1)) * 100);
                                    reqLabel = `${item.requiredPoints} pts`;
                                    subLabel = `Need ${(item.requiredPoints || 0) - rewards.points} more`;
                                }

                                return (
                                    <div
                                        key={item.id}
                                        className={`
                                            relative rounded-2xl p-3 flex flex-col gap-2 transition-all border shadow-sm
                                            ${isLocked
                                                ? 'bg-gray-100 dark:bg-slate-800/50 border-gray-200 dark:border-slate-800 opacity-90'
                                                : 'bg-white/50 dark:bg-slate-800/50 hover:bg-white dark:hover:bg-slate-800 hover:border-gray-200 dark:hover:border-slate-700 hover:shadow-md group'
                                            }
                                        `}
                                    >
                                        {/* Image Container - Seamless Integration */}
                                        {/* Image Container - Seamless Integration */}
                                        <div className="aspect-square rounded-xl flex items-center justify-center overflow-hidden relative p-0 transition-transform group-hover:scale-[1.02]">
                                            <img
                                                src={item.image.includes('http') ? item.image : `https://placehold.co/400x400/orange/white?text=${encodeURIComponent(item.name[0])}`}
                                                alt={item.name}
                                                className={`
                                                    w-full h-full object-contain transition-all duration-500
                                                    ${item.id === 1 ? 'translate-y-3' : ''}
                                                    ${item.id === 3
                                                        ? (isLocked ? 'scale-[1.6] opacity-90' : 'scale-[1.6] group-hover:scale-[1.7] drop-shadow-xl')
                                                        : (isLocked ? 'scale-100 opacity-90' : 'scale-110 group-hover:scale-110 drop-shadow-xl')
                                                    }
                                                `}
                                                onError={(e) => {
                                                    (e.target as HTMLImageElement).src = `https://placehold.co/400x400/orange/white?text=${encodeURIComponent(item.name[0])}`;
                                                }}
                                            />

                                            {/* Top Right Lock Badge (Subtle) */}
                                            {isLocked && (
                                                <div className="absolute top-2 right-2 flex flex-col items-center justify-center z-20">
                                                    <div className="w-8 h-8 rounded-full bg-white/90 dark:bg-slate-800/90 text-slate-700 dark:text-gray-300 flex items-center justify-center shadow-md backdrop-blur-sm border border-white/50">
                                                        <Lock size={14} />
                                                        {needsStreak && <Flame className="absolute -top-1 -right-1 text-orange-500 fill-orange-500 animate-pulse" size={10} />}
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        {/* Content */}
                                        <div>
                                            <h4 className={`font-bold text-xs text-slate-800 dark:text-gray-100 leading-tight mb-1 truncate`}>{item.name}</h4>

                                            {isLocked ? (
                                                <div className="mt-1">
                                                    <div className="flex justify-between items-center text-[10px] uppercase font-bold text-gray-400 mb-1">
                                                        <span>Locked</span>
                                                        <span className={needsStreak ? "text-orange-500" : ""}>{reqLabel}</span>
                                                    </div>
                                                    <div className="h-1.5 w-full bg-gray-200 dark:bg-slate-700 rounded-full overflow-hidden">
                                                        <div
                                                            className={`h-full rounded-full ${needsStreak ? 'bg-orange-500' : 'bg-gray-400'}`}
                                                            style={{ width: `${progress}%` }}
                                                        ></div>
                                                    </div>
                                                    <p className={`text-[9px] font-bold mt-1 text-right ${needsStreak ? 'text-orange-400' : 'text-red-400'}`}>
                                                        {subLabel}
                                                    </p>
                                                </div>
                                            ) : (
                                                <div className="flex items-center justify-between mt-1 animate-in fade-in duration-500">
                                                    <span className={`font-black text-xs text-slate-600 dark:text-gray-300`}>₹{item.price}</span>
                                                    <button
                                                        onClick={() => handleMerchClick(item)}
                                                        className={`text-white p-1.5 rounded-lg active:scale-95 transition-transform bg-orange-500 shadow-lg shadow-orange-500/20`}
                                                        title="Get Coupon"
                                                    >
                                                        <ExternalLink size={12} />
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
