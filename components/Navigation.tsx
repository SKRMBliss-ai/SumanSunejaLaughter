import React from 'react';
import { Home, Mic, Gamepad2, MessageCircle, Phone, PlaySquare } from 'lucide-react';
import { ViewState } from '../types';
import { useSettings } from '../contexts/SettingsContext';

interface NavigationProps {
  currentView: ViewState;
  setView: (view: ViewState) => void;
}

export const Navigation: React.FC<NavigationProps> = ({ currentView, setView }) => {
  const { t } = useSettings();
  
  const navItems = [
    { id: ViewState.HOME, label: t('nav.home'), icon: Home },
    { id: ViewState.VIDEOS, label: t('nav.videos'), icon: PlaySquare },
    { id: ViewState.GAMES, label: t('nav.games'), icon: Gamepad2 },
    { id: ViewState.COACH, label: t('nav.coach'), icon: Mic },
    { id: ViewState.CHAT, label: t('nav.ask_ai'), icon: MessageCircle },
  ];

  return (
    <div className="fixed bottom-0 left-0 w-full bg-white dark:bg-slate-900 border-t border-[#EDE8F8] dark:border-slate-800 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] z-50 pb-safe transition-colors duration-300">
      <div className="max-w-md mx-auto flex justify-around items-end min-h-[4.5rem] h-auto px-1 py-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setView(item.id)}
              className={`flex-1 flex flex-col items-center justify-end w-full p-1 transition-colors duration-200 gap-1 min-w-[3.5rem] ${
                isActive ? 'text-[#ABCEC9] scale-105' : 'text-[#AABBCC] dark:text-slate-500 hover:text-[#C3B8D5] dark:hover:text-slate-300'
              }`}
            >
              <Icon size={24} strokeWidth={isActive ? 2.5 : 2} className="shrink-0" />
              <span className="text-[0.6rem] font-bold leading-tight text-center break-words w-full">{item.label}</span>
            </button>
          );
        })}
        <button
           onClick={() => setView(ViewState.CONTACT)}
           className={`flex-1 flex flex-col items-center justify-end w-full p-1 transition-colors duration-200 gap-1 min-w-[3.5rem] ${
             currentView === ViewState.CONTACT ? 'text-[#ABCEC9] scale-105' : 'text-[#AABBCC] dark:text-slate-500 hover:text-[#C3B8D5] dark:hover:text-slate-300'
           }`}
        >
           <Phone size={24} strokeWidth={currentView === ViewState.CONTACT ? 2.5 : 2} className="shrink-0" />
           <span className="text-[0.6rem] font-bold leading-tight text-center break-words w-full">{t('contact')}</span>
        </button>
      </div>
    </div>
  );
};