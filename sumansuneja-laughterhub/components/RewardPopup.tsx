import React, { useEffect, useState } from 'react';
import { Star, Trophy, Zap, Flame } from 'lucide-react';
import { onReward } from '../services/rewardService';
import { RewardEvent } from '../types';

export const RewardPopup: React.FC = () => {
  const [queue, setQueue] = useState<RewardEvent[]>([]);
  const [currentReward, setCurrentReward] = useState<RewardEvent | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const unsubscribe = onReward((event) => {
      setQueue(prev => [...prev, event]);
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (queue.length > 0 && !currentReward) {
      const next = queue[0];
      setCurrentReward(next);
      setQueue(prev => prev.slice(1));
      setIsVisible(true);

      // Auto hide
      setTimeout(() => {
        setIsVisible(false);
        setTimeout(() => {
          setCurrentReward(null);
        }, 300); // Wait for fade out
      }, 3000);
    }
  }, [queue, currentReward]);

  if (!currentReward) return null;

  const getIcon = () => {
    switch (currentReward.type) {
      case 'STREAK': return <Flame className="w-8 h-8 text-orange-500 animate-pulse" fill="currentColor" />;
      case 'GAME': return <Zap className="w-8 h-8 text-yellow-400 animate-wiggle" fill="currentColor" />;
      case 'COACH': return <Trophy className="w-8 h-8 text-[#ABCEC9] animate-bounce-gentle" fill="currentColor" />;
      default: return <Star className="w-8 h-8 text-purple-400 animate-spin-slow" fill="currentColor" />;
    }
  };

  return (
    <div className={`fixed inset-0 pointer-events-none z-[100] flex items-center justify-center transition-opacity duration-300 ${isVisible ? 'opacity-100' : 'opacity-0'}`}>
      <div className={`bg-white rounded-3xl shadow-2xl p-6 border-4 border-[#EDE8F8] transform transition-transform duration-500 ${isVisible ? 'scale-100 translate-y-0 animate-pop-in' : 'scale-50 translate-y-20'} flex flex-col items-center text-center relative overflow-hidden`}>
        
        {/* Confetti Background (CSS only for simplicity) */}
        <div className="absolute top-0 left-0 w-full h-full opacity-10 bg-[radial-gradient(circle,#ABCEC9_2px,transparent_2px)] bg-[length:10px_10px]"></div>

        <div className="bg-[#EDE8F8] p-4 rounded-full mb-3 shadow-inner">
           {getIcon()}
        </div>
        
        <h3 className="text-2xl font-black text-gray-700 mb-1">
          +{currentReward.pointsAdded} Points!
        </h3>
        
        <p className="font-bold text-[#AABBCC] text-sm uppercase tracking-wider">
          {currentReward.message}
        </p>

        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[#ABCEC9] via-[#C3B8D5] to-[#AABBCC]"></div>
      </div>
    </div>
  );
};