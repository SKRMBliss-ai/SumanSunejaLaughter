import React, { useState, useEffect } from 'react';
import { Video, ArrowRight, Star, Bell, X, Sparkles, Smile, Globe, Calendar, Lock, Check, Clock, Trophy, Flame, Moon, Sun, Type } from 'lucide-react';
import { ViewState, RewardState } from '../types';
import { getRewardState } from '../services/rewardService';
import { useSettings, SUPPORTED_LANGUAGES, FontSize } from '../contexts/SettingsContext';

interface HomeProps {
  onNavigate: (view: ViewState) => void;
}

interface ReminderState {
  daily: boolean;
  traditional: boolean;
}

export const Home: React.FC<HomeProps> = ({ onNavigate }) => {
  const { t, theme, toggleTheme, language, setLanguage, fontSize, setFontSize } = useSettings();
  const [notification, setNotification] = useState<{ title: string; message: string; link: string } | null>(null);
  const [showReminderSettings, setShowReminderSettings] = useState<string | null>(null);
  const [rewards, setRewards] = useState<RewardState>(getRewardState());
  const [isLangMenuOpen, setIsLangMenuOpen] = useState(false);

  const [reminderMinutes, setReminderMinutes] = useState(() => {
    const saved = localStorage.getItem('zoomReminderMinutes');
    return saved ? parseInt(saved, 10) : 15;
  });

  const [remindersEnabled, setRemindersEnabled] = useState<ReminderState>(() => {
    const saved = localStorage.getItem('zoomReminderState');
    return saved ? JSON.parse(saved) : { daily: true, traditional: true };
  });

  useEffect(() => {
    const handleStorageChange = () => {
      setRewards(getRewardState());
    };
    window.addEventListener('storage', handleStorageChange);
    const interval = setInterval(handleStorageChange, 1000);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    localStorage.setItem('zoomReminderMinutes', reminderMinutes.toString());
    localStorage.setItem('zoomReminderState', JSON.stringify(remindersEnabled));
  }, [reminderMinutes, remindersEnabled]);

  useEffect(() => {
    const checkSessionTime = () => {
      const now = new Date();
      const timeInIST = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));
      const istHours = timeInIST.getHours();
      const istMinutes = timeInIST.getMinutes();
      const istDay = timeInIST.getDay();

      const currentMinutesFromMidnight = istHours * 60 + istMinutes;
      const isWeekday = istDay >= 1 && istDay <= 5;

      if (remindersEnabled.daily) {
        const sessionStartMinutes = 7 * 60 + 30;
        const notifyStartMinutes = sessionStartMinutes - reminderMinutes;

        if (currentMinutesFromMidnight === notifyStartMinutes) {
          setNotification({
            title: "Daily Laughter Yoga Starting!",
            message: `The daily joy session starts in ${reminderMinutes} minutes.`,
            link: "https://zoom.us/j/3415272874"
          });
        }
      }

      if (remindersEnabled.traditional && isWeekday) {
        const sessionStartMinutes = 8 * 60 + 15;
        const notifyStartMinutes = sessionStartMinutes - reminderMinutes;

        if (currentMinutesFromMidnight === notifyStartMinutes) {
          setNotification({
            title: "Traditional Yoga Starting!",
            message: `Get your mat ready! Session starts in ${reminderMinutes} minutes.`,
            link: "https://zoom.us/join"
          });
        }
      }
    };

    const interval = setInterval(checkSessionTime, 60000);
    return () => clearInterval(interval);
  }, [reminderMinutes, remindersEnabled]);

  const toggleReminder = (type: 'daily' | 'traditional') => {
    setRemindersEnabled(prev => ({
      ...prev,
      [type]: !prev[type]
    }));
  };

  const cycleFontSize = () => {
    const sizes: FontSize[] = ['small', 'normal', 'large', 'xl'];
    const currentIndex = sizes.indexOf(fontSize);
    const nextIndex = (currentIndex + 1) % sizes.length;
    setFontSize(sizes[nextIndex]);
  };

  return (
    <div className="p-4 space-y-6 pb-44 relative">

      {/* Settings Controls on Homepage */}
      <div className="flex justify-end gap-2 mb-2 animate-in fade-in">
        <button
          onClick={toggleTheme}
          className="p-2 bg-white/50 dark:bg-slate-700/50 backdrop-blur-md rounded-full border border-white/20 shadow-sm text-gray-600 dark:text-yellow-300 transition-transform active:scale-95 hover:bg-white/80 dark:hover:bg-slate-700"
          title="Toggle Dark Mode"
        >
          {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
        </button>
        <button
          onClick={cycleFontSize}
          className="p-2 bg-white/50 dark:bg-slate-700/50 backdrop-blur-md rounded-full border border-white/20 shadow-sm text-gray-600 dark:text-gray-200 transition-transform active:scale-95 hover:bg-white/80 dark:hover:bg-slate-700 relative group"
          title="Change Font Size"
        >
          <Type size={18} />
          <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
            <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${fontSize === 'normal' ? 'hidden' : 'bg-[#ABCEC9]'}`}></span>
            <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${fontSize === 'normal' ? 'hidden' : 'bg-[#ABCEC9]'}`}></span>
          </span>
        </button>
        <div className="relative">
          <button
            onClick={() => setIsLangMenuOpen(!isLangMenuOpen)}
            className="p-2 bg-white/50 dark:bg-slate-700/50 backdrop-blur-md rounded-full border border-white/20 shadow-sm text-gray-600 dark:text-gray-200 flex items-center gap-1 active:scale-95 hover:bg-white/80 dark:hover:bg-slate-700"
          >
            <Globe size={18} /> <span className="text-[0.65rem] font-bold uppercase">{SUPPORTED_LANGUAGES.find(l => l.code === language)?.label || language}</span>
          </button>
          {isLangMenuOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setIsLangMenuOpen(false)}></div>
              <div className="absolute top-full end-0 mt-2 bg-white dark:bg-slate-800 rounded-xl shadow-xl p-1 z-50 min-w-[120px] max-h-60 overflow-y-auto animate-in zoom-in-95 border border-gray-100 dark:border-slate-700 origin-top-right rtl:origin-top-left">
                {SUPPORTED_LANGUAGES.map(lang => (
                  <button
                    key={lang.code}
                    onClick={() => { setLanguage(lang.code); setIsLangMenuOpen(false); }}
                    className={`w-full text-start px-3 py-2 text-xs font-bold rounded-lg transition-colors ${language === lang.code ? 'bg-[#ABCEC9] text-white' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700'}`}
                  >
                    {lang.label}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {showReminderSettings && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/20 backdrop-blur-sm animate-pop-in">
          <div className="bg-white dark:bg-slate-800 rounded-[2rem] p-6 w-full max-w-sm shadow-2xl relative border-4 border-[#EDE8F8] dark:border-slate-700">
            <button
              onClick={() => setShowReminderSettings(null)}
              className="absolute top-4 end-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-2 rounded-full hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
            >
              <X size={20} />
            </button>

            <div className="flex items-center gap-3 mb-6">
              <div className={`p-3 rounded-2xl ${showReminderSettings === 'daily' ? 'bg-[#ABCEC9]/20 text-[#ABCEC9]' : 'bg-[#C3B8D5]/20 text-[#C3B8D5]'}`}>
                <Clock size={24} />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-700 dark:text-gray-100">
                  {showReminderSettings === 'daily' ? t('daily_session') : t('traditional_yoga')}
                </h3>
                <p className="text-xs text-[#AABBCC]">Set your alarm</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between bg-[#EDE8F8] dark:bg-slate-700 p-4 rounded-2xl">
                <span className="font-bold text-gray-600 dark:text-gray-200">Enable Reminders</span>
                <button
                  onClick={() => toggleReminder(showReminderSettings as 'daily' | 'traditional')}
                  className={`w-14 h-8 rounded-full p-1 transition-colors duration-300 relative ${remindersEnabled[showReminderSettings as 'daily' | 'traditional'] ? (showReminderSettings === 'daily' ? 'bg-[#ABCEC9]' : 'bg-[#C3B8D5]') : 'bg-gray-300 dark:bg-gray-600'}`}
                >
                  <div className={`w-6 h-6 bg-white rounded-full shadow-md transform transition-transform duration-300 ${remindersEnabled[showReminderSettings as 'daily' | 'traditional'] ? 'translate-x-6 rtl:-translate-x-6' : 'translate-x-0'}`}></div>
                </button>
              </div>

              {remindersEnabled[showReminderSettings as 'daily' | 'traditional'] && (
                <div className="grid grid-cols-2 gap-3 animate-fade-in-up">
                  {[15, 30, 45, 60].map((mins) => (
                    <button
                      key={mins}
                      onClick={() => setReminderMinutes(mins)}
                      className={`p-3 rounded-xl border-2 font-bold text-sm transition-all flex items-center justify-center gap-2 ${reminderMinutes === mins
                        ? 'border-gray-400 bg-gray-100 dark:bg-slate-600 text-gray-600 dark:text-white transform scale-105'
                        : 'border-transparent bg-gray-50 dark:bg-slate-700 text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-600 hover:scale-105'
                        }`}
                    >
                      {reminderMinutes === mins && <Check size={14} />} {mins} Mins
                    </button>
                  ))}
                </div>
              )}

              <button
                onClick={() => setShowReminderSettings(null)}
                className="w-full bg-gray-800 dark:bg-slate-900 text-white font-bold py-3 rounded-xl mt-2 hover:bg-gray-700 transition-transform active:scale-95"
              >
                Save Settings
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Stats Cards - Pop In */}
      <div className="flex flex-wrap gap-3 animate-pop-in delay-100">
        <div className="flex-1 min-w-[140px] bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/30 dark:to-orange-800/20 p-3 rounded-2xl flex items-center gap-3 border border-orange-200 dark:border-orange-900 shadow-sm hover:scale-105 transition-transform duration-300">
          <div className="bg-white dark:bg-orange-900 p-2 rounded-xl text-orange-500 shadow-sm shrink-0">
            <Flame size={20} fill="currentColor" className="animate-pulse" />
          </div>
          <div className="min-w-0">
            <div className="text-xl font-black text-gray-700 dark:text-gray-100 leading-none truncate">{rewards.streak}</div>
            <div className="text-[0.65rem] font-bold text-orange-400 uppercase truncate">{t('streak')}</div>
          </div>
        </div>
        <div className="flex-1 min-w-[140px] bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/30 dark:to-purple-800/20 p-3 rounded-2xl flex items-center gap-3 border border-purple-200 dark:border-purple-900 shadow-sm hover:scale-105 transition-transform duration-300">
          <div className="bg-white dark:bg-purple-900 p-2 rounded-xl text-purple-500 shadow-sm shrink-0">
            <Trophy size={20} fill="currentColor" className="animate-wiggle" />
          </div>
          <div className="min-w-0">
            <div className="text-xl font-black text-gray-700 dark:text-gray-100 leading-none truncate">{rewards.points}</div>
            <div className="text-[0.65rem] font-bold text-purple-400 uppercase truncate">{t('points')} (Lvl {rewards.level})</div>
          </div>
        </div>
      </div>

      {notification && (
        <div className="fixed top-20 left-4 right-4 z-50 bg-gradient-to-r from-[#ABCEC9] to-[#AABBCC] text-white p-5 rounded-3xl shadow-xl shadow-[#AABBCC]/30 flex items-start gap-4 animate-pop-in border border-white/20">
          <div className="bg-white/20 p-2.5 rounded-full mt-1 shrink-0 backdrop-blur-sm">
            <Bell size={24} className="animate-wiggle" fill="currentColor" />
          </div>
          <div className="flex-1 pe-6">
            <h4 className="font-bold text-base flex items-center gap-2 flex-wrap">
              {notification.title} <Sparkles size={16} className="text-yellow-200 animate-pulse" />
            </h4>
            <p className="text-sm text-white/90 mt-1 leading-relaxed">
              {notification.message}
            </p>
            <a
              href={notification.link}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 mt-4 bg-white text-[#ABCEC9] text-xs font-bold px-5 py-2.5 rounded-full hover:bg-gray-50 transition-all shadow-sm active:scale-95 hover:scale-105"
            >
              Join Now <ArrowRight size={12} className="rtl:rotate-180" />
            </a>
          </div>
          <button
            onClick={() => setNotification(null)}
            className="absolute top-3 end-3 text-white/50 hover:text-white p-2 rounded-full hover:bg-white/10 transition-colors"
          >
            <X size={18} />
          </button>
        </div>
      )}

      {/* Main Welcome Card - Fade In Up - RTL Compatible */}
      <div className="bg-gradient-to-br from-[#C3B8D5] to-[#ABCEC9] dark:from-indigo-900 dark:to-purple-900 rounded-[2rem] p-8 text-white shadow-2xl shadow-[#C3B8D5]/30 dark:shadow-none relative overflow-hidden group min-h-[280px] h-auto animate-fade-in-up delay-200 flex flex-col justify-center">
        <div className="absolute top-0 end-0 w-48 h-48 bg-[#EDE8F8] dark:bg-slate-800 rounded-full mix-blend-overlay filter blur-3xl opacity-50 transform translate-x-10 rtl:-translate-x-10 -translate-y-10 group-hover:scale-110 transition-transform duration-700"></div>
        <div className="absolute bottom-0 start-0 w-40 h-40 bg-[#AABBCC] dark:bg-slate-700 rounded-full mix-blend-overlay filter blur-3xl opacity-30 transform -translate-x-10 rtl:translate-x-10 translate-y-10 animate-pulse"></div>

        {/* Image Positioned logically at END (Right in LTR, Left in RTL) */}
        <div className="absolute end-0 bottom-0 w-44 h-60 md:w-56 md:h-72 z-0 translate-x-2 rtl:-translate-x-2 translate-y-2 pointer-events-none">
          <img
            src="https://res.cloudinary.com/dfopoyt9v/image/upload/v1763924287/Suman1_c0uw7w.webp"
            alt="Suman Suneja"
            className="w-full h-full object-cover rounded-tl-[40px] rtl:rounded-tr-[40px] rtl:rounded-tl-none shadow-2xl transform group-hover:scale-105 transition-transform duration-700 animate-float"
            style={{ maskImage: 'linear-gradient(to bottom, black 90%, transparent 100%)' }}
          />
        </div>

        <div className="relative z-10 w-full pe-32 sm:pe-40 md:pe-52 text-start pb-4 md:pb-0">
          <div className="flex items-center gap-2 mb-2 opacity-90">
            <Smile className="w-5 h-5 animate-spin-slow" />
            <span className="text-[0.65rem] font-bold uppercase tracking-widest">Wellness Partner</span>
          </div>
          <h2 className="text-3xl font-fredoka font-bold mb-3 leading-tight text-white drop-shadow-sm whitespace-pre-wrap">{t('home.welcome')}</h2>
          <p className="text-white/90 text-sm mb-6 font-medium leading-relaxed drop-shadow-md text-shadow-sm">
            {t('home.subtitle')}
          </p>
          <button
            onClick={() => onNavigate(ViewState.COACH)}
            className="bg-white text-[#AABBCC] dark:text-slate-800 px-6 py-3 rounded-full text-sm font-bold shadow-lg shadow-black/5 active:scale-95 transition-all hover:bg-gray-50 flex items-center gap-2 hover:scale-105"
          >
            <Star size={16} fill="currentColor" className="text-[#ABCEC9] dark:text-purple-600" />
            {t('home.test_laugh')}
          </button>
        </div>
      </div>

      {/* Live AI Interaction Card - The Main Attraction */}
      <div className="bg-white dark:bg-slate-800 rounded-[2rem] p-1 shadow-xl shadow-purple-500/10 dark:shadow-none relative overflow-hidden group animate-fade-in-up delay-250 my-4 transform transition-all hover:scale-[1.01]">
        <div className="absolute inset-0 bg-gradient-to-r from-[#C3B8D5] via-[#ABCEC9] to-[#C3B8D5] opacity-20 animate-gradient-x"></div>
        <div className="bg-white/80 dark:bg-slate-800/90 backdrop-blur-xl rounded-[1.8rem] p-6 relative z-10 flex flex-col md:flex-row items-center gap-6 text-center md:text-start border border-white/50 dark:border-slate-600">

          <div className="relative shrink-0">
            <div className="w-20 h-20 bg-gradient-to-br from-[#ABCEC9] to-[#C3B8D5] rounded-full flex items-center justify-center shadow-lg animate-pulse-slow">
              <div className="absolute inset-0 bg-white/30 rounded-full animate-ping"></div>
              <Smile size={32} className="text-white relative z-10" />
            </div>
            <div className="absolute -bottom-2 -right-2 bg-white dark:bg-slate-700 text-[#ABCEC9] text-[0.6rem] font-black px-2 py-1 rounded-full shadow-sm border border-[#ABCEC9]/20 flex items-center gap-1">
              <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></span> LIVE
            </div>
          </div>

          <div className="flex-1">
            <h3 className="text-2xl font-fredoka font-bold text-gray-800 dark:text-white mb-2 flex items-center justify-center md:justify-start gap-2">
              Talk to Suman AI <Sparkles size={18} className="text-yellow-400" />
            </h3>
            <p className="text-gray-600 dark:text-gray-300 text-sm font-medium leading-relaxed mb-4">
              Experience the world's first real-time Laughter Yoga AI. Have a conversation, get instant feedback, and laugh together!
            </p>
            <button
              onClick={() => onNavigate(ViewState.COACH)}
              className="w-full md:w-auto bg-gradient-to-r from-[#ABCEC9] to-[#9BBDB8] text-white font-bold py-3 px-8 rounded-xl shadow-md hover:shadow-lg hover:shadow-[#ABCEC9]/30 active:scale-95 transition-all flex items-center justify-center gap-2 group-hover:gap-3"
            >
              Start Live Interaction <ArrowRight size={18} />
            </button>
          </div>
        </div>
      </div>

      {/* Fun Games & Book Session - Pill Style */}
      <div className="grid grid-cols-2 gap-4 animate-fade-in-up delay-300">
        <button
          onClick={() => onNavigate(ViewState.GAMES)}
          className="bg-[#C3B8D5] dark:bg-slate-800 p-4 rounded-full flex flex-col items-center justify-center text-center gap-2 hover:bg-[#b0a5c4] dark:hover:bg-slate-700 transition-all border-[4px] border-white dark:border-slate-600 shadow-lg group hover:scale-[1.02] h-full min-h-[120px]"
        >
          <Star size={28} fill="currentColor" className="text-white group-hover:rotate-12 transition-transform" />
          <span className="font-bold text-white text-lg leading-tight">{t('fun_games')}</span>
        </button>

        <button
          onClick={() => onNavigate(ViewState.CONTACT)}
          className="bg-[#ABCEC9] dark:bg-slate-800 p-4 rounded-full flex flex-col items-center justify-center text-center gap-2 hover:bg-[#9BBDB8] dark:hover:bg-slate-700 transition-all border-[4px] border-white dark:border-slate-600 shadow-lg group hover:scale-[1.02] h-full min-h-[120px]"
        >
          <Calendar size={28} className="text-white group-hover:-rotate-12 transition-transform" />
          <span className="font-bold text-white text-lg leading-tight">{t('book_session')}</span>
        </button>
      </div>

      {/* Live Sessions */}
      <div className="space-y-4 animate-fade-in-up delay-400">
        <div className="flex items-center gap-2 px-2">
          <div className="p-1.5 bg-[#ABCEC9]/20 rounded-lg">
            <Video size={18} className="text-[#ABCEC9]" />
          </div>
          <h3 className="font-bold text-gray-700 dark:text-gray-200">Live Sessions</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Daily Session Card */}
          <div className="bg-white dark:bg-slate-800 rounded-3xl p-5 shadow-lg shadow-[#ABCEC9]/10 dark:shadow-none border-2 border-[#ABCEC9]/20 dark:border-slate-700 relative overflow-hidden group hover:shadow-xl transition-all">
            <div className="absolute top-0 end-0 w-24 h-24 bg-[#ABCEC9]/10 rounded-es-[4rem] -me-4 -mt-4 transition-all group-hover:bg-[#ABCEC9]/20 group-hover:scale-110"></div>

            <div className="relative z-10">
              <div className="flex justify-between items-start mb-2">
                <span className="bg-[#ABCEC9]/10 text-[#ABCEC9] text-[0.65rem] font-bold px-2 py-1 rounded-md uppercase tracking-wider">
                  {t('every_day')}
                </span>
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    setShowReminderSettings('daily');
                  }}
                  className={`p-2 rounded-full transition-colors ${remindersEnabled.daily ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-500' : 'bg-gray-50 dark:bg-slate-700 text-gray-300 dark:text-gray-500 hover:bg-gray-100'}`}
                  title="Set Reminder"
                >
                  <Bell size={18} fill={remindersEnabled.daily ? "currentColor" : "none"} className={remindersEnabled.daily ? "animate-wiggle" : ""} />
                </button>
              </div>

              <h4 className="font-fredoka font-bold text-xl text-gray-700 dark:text-gray-100 mb-2 leading-tight">{t('daily_session')}</h4>

              <div className="space-y-1.5 mb-4">
                <div className="flex items-center gap-2 text-sm font-medium text-gray-500 dark:text-gray-400">
                  <Globe size={14} className="text-[#ABCEC9] shrink-0" />
                  <span>Dubai: <span className="text-gray-700 dark:text-gray-200 font-bold">6:00 - 7:00 AM</span></span>
                </div>
                <div className="flex items-center gap-2 text-sm font-medium text-gray-500 dark:text-gray-400">
                  <Globe size={14} className="text-[#ABCEC9] shrink-0" />
                  <span>India: <span className="text-gray-700 dark:text-gray-200 font-bold">7:30 - 8:30 AM</span></span>
                </div>
              </div>

              <div className="bg-[#ABCEC9]/5 dark:bg-slate-700/50 rounded-xl p-3 mb-4 space-y-1">
                <div className="flex justify-between text-xs flex-wrap gap-1">
                  <span className="text-[#AABBCC] font-bold">Meeting ID</span>
                  <span className="font-mono font-bold text-gray-600 dark:text-gray-300">341 527 2874</span>
                </div>
                <div className="flex justify-between text-xs flex-wrap gap-1">
                  <span className="text-[#AABBCC] font-bold">Passcode</span>
                  <span className="font-mono font-bold text-gray-600 dark:text-gray-300">12345</span>
                </div>
              </div>

              <a
                href="https://zoom.us/j/3415272874"
                target="_blank"
                rel="noopener noreferrer"
                className="w-full bg-[#ABCEC9] hover:bg-[#9BBDB8] text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition-all shadow-md active:scale-95 text-sm hover:scale-[1.02]"
              >
                {t('join_session')} <ArrowRight size={16} className="rtl:rotate-180" />
              </a>
            </div>
          </div>

          {/* Traditional Yoga Card */}
          <div className="bg-white dark:bg-slate-800 rounded-3xl p-5 shadow-lg shadow-[#C3B8D5]/10 dark:shadow-none border-2 border-[#C3B8D5]/20 dark:border-slate-700 relative overflow-hidden group hover:shadow-xl transition-all">
            <div className="absolute top-0 end-0 w-24 h-24 bg-[#C3B8D5]/10 rounded-es-[4rem] -me-4 -mt-4 transition-all group-hover:bg-[#C3B8D5]/20 group-hover:scale-110"></div>

            <div className="relative z-10">
              <div className="flex justify-between items-start mb-2">
                <span className="bg-[#C3B8D5]/10 text-[#C3B8D5] text-[0.65rem] font-bold px-2 py-1 rounded-md uppercase tracking-wider">
                  {t('mon_fri')}
                </span>
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    setShowReminderSettings('traditional');
                  }}
                  className={`p-2 rounded-full transition-colors ${remindersEnabled.traditional ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-500' : 'bg-gray-50 dark:bg-slate-700 text-gray-300 dark:text-gray-500 hover:bg-gray-100'}`}
                  title="Set Reminder"
                >
                  <Bell size={18} fill={remindersEnabled.traditional ? "currentColor" : "none"} className={remindersEnabled.traditional ? "animate-wiggle" : ""} />
                </button>
              </div>

              <h4 className="font-fredoka font-bold text-xl text-gray-700 dark:text-gray-100 mb-2 leading-tight">{t('traditional_yoga')}</h4>

              <div className="space-y-1.5 mb-4">
                <div className="flex items-center gap-2 text-sm font-medium text-gray-500 dark:text-gray-400">
                  <Globe size={14} className="text-[#C3B8D5] shrink-0" />
                  <span>Dubai: <span className="text-gray-700 dark:text-gray-200 font-bold">6:45 - 7:45 AM</span></span>
                </div>
                <div className="flex items-center gap-2 text-sm font-medium text-gray-500 dark:text-gray-400">
                  <Globe size={14} className="text-[#C3B8D5] shrink-0" />
                  <span>India: <span className="text-gray-700 dark:text-gray-200 font-bold">8:15 - 9:15 AM</span></span>
                </div>
              </div>

              <div className="bg-[#C3B8D5]/5 dark:bg-slate-700/50 rounded-xl p-3 mb-4 flex items-center justify-between flex-wrap gap-1">
                <span className="text-[#AABBCC] font-bold text-xs">Passcode</span>
                <span className="font-mono font-bold text-gray-600 dark:text-gray-300 flex items-center gap-1">
                  <Lock size={12} className="text-[#C3B8D5]" /> 536805
                </span>
              </div>

              <a
                href="https://zoom.us/join"
                target="_blank"
                rel="noopener noreferrer"
                className="w-full bg-[#C3B8D5] hover:bg-[#b0a5c4] text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition-all shadow-md active:scale-95 text-sm hover:scale-[1.02]"
              >
                {t('join_yoga')} <ArrowRight size={16} className="rtl:rotate-180" />
              </a>
            </div>
          </div>

        </div>
      </div>

    </div>
  );
};