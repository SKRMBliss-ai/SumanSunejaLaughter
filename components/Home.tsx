import React, { useState, useEffect } from 'react';
import { Video, ArrowRight, Star, Bell, X, Sparkles, Smile, Globe, Calendar, Lock, Check, Clock, Trophy, Flame, Moon, Sun, Type, Palette, ChevronDown, Info } from 'lucide-react';
import { ViewState, RewardState } from '../types';
import { getRewardState } from '../services/rewardService';
import { useSettings, SUPPORTED_LANGUAGES, FontSize } from '../contexts/SettingsContext';
import { useLiveWidget } from '../contexts/LiveWidgetContext';

interface HomeProps {
  onNavigate: (view: ViewState) => void;
}

interface ReminderState {
  daily: boolean;
  traditional: boolean;
}

export const Home: React.FC<HomeProps> = ({ onNavigate }) => {
  const { t, theme, toggleTheme, colorTheme, setColorTheme, language, setLanguage, fontSize, setFontSize, currentTheme } = useSettings();
  const { openWidget } = useLiveWidget();
  const [notification, setNotification] = useState<{ title: string; message: string; link: string } | null>(null);
  const [showReminderSettings, setShowReminderSettings] = useState<string | null>(null);
  const [rewards, setRewards] = useState<RewardState>(getRewardState());
  const [isLangMenuOpen, setIsLangMenuOpen] = useState(false);
  const [isThemeMenuOpen, setIsThemeMenuOpen] = useState(false);

  // --- NEW: Tour State (0 = off, 1 = Dark Mode, 2 = Theme, 3 = Font, 4 = Lang) ---
  const [tourStep, setTourStep] = useState(0);

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

  // --- NEW: Check for First Time Load & Start Tour ---
  useEffect(() => {
    const hasSeenTour = localStorage.getItem('suman_tour_completed_v1');
    if (!hasSeenTour) {
      // Start tour after a short delay
      const timer = setTimeout(() => {
        setTourStep(1);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleNextStep = () => {
    if (tourStep < 4) {
      setTourStep(prev => prev + 1);
    } else {
      finishTour();
    }
  };

  const finishTour = () => {
    localStorage.setItem('suman_tour_completed_v1', 'true');
    setTourStep(0);
  };
  // ------------------------------------

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

  // THEME CONFIGURATION
  const THEME_OPTIONS = [
    { value: 'pastel' as const, label: 'Brand (Default)' },
    { value: 'red_brick' as const, label: 'Red Brick' }
  ];

  // --- Helper Component for Tooltip ---
  const TourTooltip = ({ title, desc, isLast = false }: { title: string, desc: string, isLast?: boolean }) => (
    <div className="absolute top-full right-0 mt-3 w-48 bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-2xl border-2 border-yellow-200 z-50 animate-in fade-in slide-in-from-top-2">
      {/* Pointing Arrow */}
      <div className="absolute -top-2 right-3 w-4 h-4 bg-white dark:bg-slate-800 border-t-2 border-l-2 border-yellow-200 transform rotate-45"></div>

      <h4 className="font-bold text-sm text-gray-800 dark:text-white mb-1 flex items-center gap-1">
        <Sparkles size={12} className="text-yellow-500" /> {title}
      </h4>
      <p className="text-[10px] text-gray-500 dark:text-gray-400 mb-3 leading-snug font-medium">{desc}</p>

      <div className="flex justify-between items-center">
        <button onClick={finishTour} className="text-[10px] font-bold text-gray-400 hover:text-gray-600 underline decoration-dashed">Skip</button>
        <button
          onClick={handleNextStep}
          className={`px-3 py-1.5 rounded-lg font-bold text-[10px] text-gray-400 shadow-md active:scale-95 transition-transform ${currentTheme.BUTTON}`}
        >
          {isLast ? "Finish" : "Next"}
        </button>
      </div>
    </div>
  );

  return (
    <div className="p-4 space-y-6 pb-44 relative">

      <div className="flex justify-end gap-2 mb-2 animate-in fade-in relative z-50">

        {/* Step 1: Dark Mode */}
        <div className="relative">
          <button
            onClick={toggleTheme}
            className={`p-2 bg-white/50 dark:bg-slate-700/50 backdrop-blur-md rounded-full border border-white/20 shadow-sm text-gray-600 dark:text-yellow-300 transition-transform active:scale-95 hover:bg-white/80 dark:hover:bg-slate-700 ${tourStep === 1 ? 'ring-4 ring-yellow-200 scale-110 z-50 bg-white' : ''}`}
            title="Toggle Dark Mode"
          >
            {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
          </button>
          {tourStep === 1 && <TourTooltip title="Light / Dark" desc="Tap to switch between day and night modes!" />}
        </div>

        {/* Step 2: Color Theme */}
        <div className="relative">
          <button
            onClick={() => setIsThemeMenuOpen(!isThemeMenuOpen)}
            className={`p-2 bg-white/50 dark:bg-slate-700/50 backdrop-blur-md rounded-full border border-white/20 shadow-sm text-gray-600 dark:text-gray-200 flex items-center gap-1 active:scale-95 hover:bg-white/80 dark:hover:bg-slate-700 ${tourStep === 2 ? 'ring-4 ring-yellow-200 scale-110 z-50 bg-white' : ''}`}
            title="Change Theme"
          >
            <Palette size={18} className={colorTheme === 'pastel' ? 'text-purple-500' : 'text-[#8B3A3A]'} />
            <ChevronDown size={14} />
          </button>
          {tourStep === 2 && <TourTooltip title="Color Themes" desc="Switch between Brand Red and other fun themes!" />}

          {isThemeMenuOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setIsThemeMenuOpen(false)}></div>
              <div className="absolute top-full end-0 mt-2 bg-white dark:bg-slate-800 rounded-xl shadow-xl p-1 z-50 min-w-[140px] animate-in zoom-in-95 border border-gray-100 dark:border-slate-700 origin-top-right rtl:origin-top-left">
                {THEME_OPTIONS.map(themeOpt => (
                  <button
                    key={themeOpt.value}
                    onClick={() => { setColorTheme(themeOpt.value); setIsThemeMenuOpen(false); }}
                    className={`w-full text-start px-3 py-2 text-xs font-bold rounded-lg transition-colors flex items-center gap-2 ${colorTheme === themeOpt.value ? (themeOpt.value === 'pastel' ? 'bg-purple-100 text-purple-700' : 'bg-pink-100 text-pink-700') : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700'}`}
                  >
                    {colorTheme === themeOpt.value && <Check size={14} />}
                    <span className="flex-1">{themeOpt.label}</span>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Step 3: Font Size */}
        <div className="relative">
          <button
            onClick={cycleFontSize}
            className={`p-2 bg-white/50 dark:bg-slate-700/50 backdrop-blur-md rounded-full border border-white/20 shadow-sm text-gray-600 dark:text-gray-200 transition-transform active:scale-95 hover:bg-white/80 dark:hover:bg-slate-700 relative group ${tourStep === 3 ? 'ring-4 ring-yellow-200 scale-110 z-50 bg-white' : ''}`}
            title="Change Font Size"
          >
            <Type size={18} />
            <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${fontSize === 'normal' ? 'hidden' : 'bg-pink-500'}`}></span>
              <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${fontSize === 'normal' ? 'hidden' : 'bg-pink-500'}`}></span>
            </span>
          </button>
          {tourStep === 3 && <TourTooltip title="Text Size" desc="Tap to make the text larger or smaller." />}
        </div>

        {/* Step 4: Language */}
        <div className="relative">
          <button
            onClick={() => setIsLangMenuOpen(!isLangMenuOpen)}
            className={`p-2 bg-white/50 dark:bg-slate-700/50 backdrop-blur-md rounded-full border border-white/20 shadow-sm text-gray-600 dark:text-gray-200 flex items-center gap-1 active:scale-95 hover:bg-white/80 dark:hover:bg-slate-700 ${tourStep === 4 ? 'ring-4 ring-yellow-200 scale-110 z-50 bg-white' : ''}`}
          >
            <Globe size={18} /> <span className="text-[0.65rem] font-bold uppercase">{SUPPORTED_LANGUAGES.find(l => l.code === language)?.label || language}</span>
          </button>
          {tourStep === 4 && <TourTooltip title="Language" desc="Change the app language here!" isLast={true} />}

          {isLangMenuOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setIsLangMenuOpen(false)}></div>
              <div className="absolute top-full end-0 mt-2 bg-white dark:bg-slate-800 rounded-xl shadow-xl p-1 z-50 min-w-[120px] max-h-60 overflow-y-auto animate-in zoom-in-95 border border-gray-100 dark:border-slate-700 origin-top-right rtl:origin-top-left">
                {SUPPORTED_LANGUAGES.map(lang => (
                  <button
                    key={lang.code}
                    onClick={() => { setLanguage(lang.code); setIsLangMenuOpen(false); }}
                    className={`w-full text-start px-3 py-2 text-xs font-bold rounded-lg transition-colors ${language === lang.code ? 'bg-pink-500 text-white' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700'}`}
                  >
                    {lang.label}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Overlay Backdrop for Tour */}
      {tourStep > 0 && (
        <div className="fixed inset-0 bg-black/40 z-40 transition-opacity duration-500"></div>
      )}

      {showReminderSettings && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/20 backdrop-blur-sm animate-pop-in">
          <div className="bg-white dark:bg-slate-800 rounded-[2rem] p-6 w-full max-w-sm shadow-2xl relative border-4 border-pink-50 dark:border-slate-700">
            <button
              onClick={() => setShowReminderSettings(null)}
              className="absolute top-4 end-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-2 rounded-full hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
            >
              <X size={20} />
            </button>

            <div className="flex items-center gap-3 mb-6">
              <div className={`p-3 rounded-2xl ${showReminderSettings === 'daily' ? 'bg-pink-100 text-pink-500' : 'bg-violet-100 text-violet-500'}`}>
                <Clock size={24} />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-700 dark:text-gray-100">
                  {showReminderSettings === 'daily' ? t('daily_session') : t('traditional_yoga')}
                </h3>
                <p className="text-xs text-gray-400">Set your alarm</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between bg-gray-50 dark:bg-slate-700 p-4 rounded-2xl">
                <span className="font-bold text-gray-600 dark:text-gray-200">Enable Reminders</span>
                <button
                  onClick={() => toggleReminder(showReminderSettings as 'daily' | 'traditional')}
                  className={`w-14 h-8 rounded-full p-1 transition-colors duration-300 relative ${remindersEnabled[showReminderSettings as 'daily' | 'traditional'] ? (showReminderSettings === 'daily' ? 'bg-pink-500' : 'bg-violet-500') : 'bg-gray-300 dark:bg-gray-600'}`}
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
        <div className={`flex-1 min-w-[140px] ${currentTheme.STAT_BG_1} dark:bg-slate-800 p-3 rounded-2xl flex items-center gap-3 shadow-sm`}>
          <div className={`${currentTheme.STAT_ICON_BG_1} dark:bg-orange-900 p-2 rounded-xl shadow-sm shrink-0`}>
            <Flame size={20} fill="currentColor" className="animate-pulse" />
          </div>
          <div className="min-w-0">
            <div className="text-xl font-black text-gray-800 dark:text-gray-100 leading-none truncate">{rewards.streak}</div>
            <div className="text-[0.65rem] font-bold text-orange-400 uppercase truncate">{t('streak')}</div>
          </div>
        </div>
        <div className={`flex-1 min-w-[140px] ${currentTheme.STAT_BG_2} dark:bg-slate-800 p-3 rounded-2xl flex items-center gap-3 shadow-sm`}>
          <div className={`${currentTheme.STAT_ICON_BG_2} dark:bg-purple-900 p-2 rounded-xl shadow-sm shrink-0`}>
            <Trophy size={20} fill="currentColor" className="animate-wiggle" />
          </div>
          <div className="min-w-0">
            <div className="text-xl font-black text-gray-800 dark:text-gray-100 leading-none truncate">{rewards.points}</div>
            <div className="text-[0.65rem] font-bold text-purple-400 uppercase truncate">{t('points')} (Lvl {rewards.level})</div>
          </div>
        </div>
      </div>

      {notification && (
        <div className="fixed top-20 left-4 right-4 z-50 bg-gradient-to-r from-pink-500 to-violet-600 text-white p-5 rounded-3xl shadow-xl shadow-pink-500/20 flex items-start gap-4 animate-pop-in border border-white/20">
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
              className="inline-flex items-center gap-2 mt-4 bg-white text-pink-600 text-xs font-bold px-5 py-2.5 rounded-full hover:bg-gray-50 transition-all shadow-sm active:scale-95 hover:scale-105"
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
      <div className={`${currentTheme.HERO} dark:from-indigo-900 dark:to-purple-900 rounded-[2rem] p-6 text-white shadow-2xl shadow-[#783766]/30 dark:shadow-none relative overflow-hidden group min-h-[240px] h-auto animate-fade-in-up delay-200 flex flex-col justify-center`}>
        {/* Enhanced Glow Gradient behind the photo */}
        <div className="absolute top-[-10%] end-[-10%] w-[70%] h-[120%] bg-[radial-gradient(circle,rgba(167,139,250,0.4)_0%,rgba(167,139,250,0)_70%)] dark:bg-slate-800/50 rounded-full mix-blend-screen filter blur-3xl opacity-100 transform translate-x-10 rtl:-translate-x-10 group-hover:scale-110 transition-transform duration-700 pointer-events-none"></div>
        <div className="absolute top-[10%] end-[5%] w-48 h-48 bg-indigo-400/30 rounded-full filter blur-[50px] mix-blend-screen opacity-80 animate-pulse-slow pointer-events-none"></div>

        {/* Image Positioned logically at END */}
        <div className="absolute end-0 bottom-0 w-40 h-56 md:w-52 md:h-64 z-0 translate-x-4 rtl:-translate-x-4 translate-y-4 pointer-events-none">
          <img
            src="https://res.cloudinary.com/dfopoyt9v/image/upload/v1763924287/Suman1_c0uw7w.webp"
            alt="Suman Suneja"
            className="w-full h-full object-cover rounded-tl-[40px] rtl:rounded-tr-[40px] rtl:rounded-tl-none shadow-2xl transform group-hover:scale-105 transition-transform duration-700 animate-float"
            style={{ maskImage: 'linear-gradient(to bottom, black 80%, transparent 100%)', WebkitMaskImage: 'linear-gradient(to bottom, black 80%, transparent 100%)' }}
          />
        </div>

        <div className="relative z-10 w-full pe-28 sm:pe-36 md:pe-48 text-start pb-2">
          <div className="flex items-center gap-2 mb-2 opacity-90">
            <Smile className="w-4 h-4 animate-spin-slow" />
            <span className="text-[0.6rem] font-bold uppercase tracking-widest">Wellness Partner</span>
          </div>
          {/* Main Heading Text */}
          <h2 className="text-2xl font-bold mb-2 leading-tight text-white drop-shadow-sm whitespace-pre-wrap">Ignite Your Inner Joy</h2>
          <p className="text-white/90 text-xs mb-4 font-medium leading-relaxed drop-shadow-md text-shadow-sm max-w-[200px]">
            Boost immunity & relieve stress with expert guidance from Suman Suneja.
          </p>
          <button
            onClick={() => onNavigate(ViewState.COACH)}
            className={`${currentTheme.HERO_BUTTON} px-5 py-2.5 rounded-full text-xs font-bold active:scale-95 transition-all flex items-center gap-2 hover:scale-105`}
          >
            <Star size={14} fill="currentColor" className={colorTheme === 'pastel' ? "text-[#A9A9C6]" : "text-yellow-300"} />
            <span className={colorTheme === 'pastel' ? "text-[#A9A9C6]" : "text-current"}>{t('home.test_laugh')}</span>
          </button>
        </div>
      </div>

      {/* Live AI Interaction Card - Enhanced Standout Design */}
      <div className={`${currentTheme.LIVE_CARD_BG} dark:bg-slate-800/80 shadow-[0_10px_40px_-10px_rgba(120,55,102,0.2)] rounded-[24px] p-1 relative overflow-hidden group animate-fade-in-up delay-250 my-6 transform transition-all hover:scale-[1.02] hover:shadow-[0_20px_50px_-10px_rgba(120,55,102,0.3)] hover:border-purple-300`}>
        <div className="rounded-[1.8rem] p-6 relative z-10 flex flex-col md:flex-row items-center gap-6 text-center md:text-start">

          <div className="relative shrink-0">
            <div className="w-20 h-20 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center shadow-xl shadow-purple-500/20 group-hover:scale-110 transition-transform duration-500 overflow-hidden">
              <img
                src="https://sumansuneja.com/wp-content/uploads/2025/03/icon-mascot-suman-suneja.svg"
                alt="Suman AI"
                className="w-full h-full object-cover animate-bounce-gentle"
              />
            </div>
            <div className="absolute -bottom-2 -right-2 bg-white dark:bg-slate-700 text-pink-600 text-[0.65rem] font-black px-3 py-1 rounded-full shadow-md border border-pink-100 flex items-center gap-1.5">
              <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></span> LIVE
            </div>
          </div>

          <div className="flex-1">
            <h3 className="text-2xl font-bold text-[#333333] dark:text-white mb-2 flex items-center justify-center md:justify-start gap-2">
              Talk to Suman AI <Sparkles size={20} className="text-yellow-400 animate-spin-slow" />
            </h3>
            <p className={`${currentTheme.TEXT_PRIMARY} dark:text-gray-300 text-sm font-medium leading-relaxed mb-4 max-w-md mx-auto md:mx-0`}>
              Experience the world's first real-time Laughter Yoga AI. Have a conversation, get instant feedback, and laugh together!
            </p>
            <button
              onClick={openWidget}
              className={`${currentTheme.LIVE_BTN} w-full md:w-auto font-bold py-3 px-8 rounded-xl active:scale-95 transition-all flex items-center justify-center gap-2 text-base`}
            >
              Start Live Interaction <ArrowRight size={18} />
            </button>
          </div>
        </div>
      </div>

      {/* Live Sessions */}
      <div className="space-y-4 animate-fade-in-up delay-400">
        <div className="flex items-center gap-2 px-2">
          <div className="p-1.5 bg-pink-100 rounded-lg">
            <Video size={18} className="text-pink-500" />
          </div>
          <h3 className={`font-bold ${currentTheme.TEXT_PRIMARY} dark:text-gray-200`}>Live Sessions</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Daily Session Card */}
          <div className="bg-white dark:bg-slate-800 rounded-3xl p-5 shadow-lg shadow-pink-500/5 dark:shadow-none border-2 border-gray-100 dark:border-slate-700 relative overflow-hidden group hover:shadow-xl transition-all">
            <div className={`absolute top-0 end-0 w-24 h-24 ${currentTheme.SESSION_1_BG} rounded-es-[4rem] -me-4 -mt-4 transition-all group-hover:scale-110 opacity-50`}></div>

            <div className="relative z-10">
              <div className="flex justify-between items-start mb-2">
                <span className={`${currentTheme.SESSION_1_BG} ${currentTheme.SESSION_1_ACCENT} text-[0.65rem] font-bold px-2 py-1 rounded-md uppercase tracking-wider`}>
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

              <h4 className={`font-fredoka font-bold text-xl ${currentTheme.TEXT_PRIMARY} dark:text-gray-100 mb-2 leading-tight`}>{t('daily_session')}</h4>

              <div className="space-y-1.5 mb-4">
                <div className="flex items-center gap-2 text-sm font-medium text-gray-500 dark:text-gray-400">
                  <Globe size={14} className={`${currentTheme.SESSION_1_ACCENT} shrink-0`} />
                  <span>Dubai: <span className="text-gray-700 dark:text-gray-200 font-bold">6:00 - 7:00 AM</span></span>
                </div>
                <div className="flex items-center gap-2 text-sm font-medium text-gray-500 dark:text-gray-400">
                  <Globe size={14} className={`${currentTheme.SESSION_1_ACCENT} shrink-0`} />
                  <span>India: <span className="text-gray-700 dark:text-gray-200 font-bold">7:30 - 8:30 AM</span></span>
                </div>
              </div>

              <div className={`${currentTheme.SESSION_1_BG}/50 dark:bg-slate-700/50 rounded-xl p-3 mb-4 space-y-1`}>
                <div className="flex justify-between text-xs flex-wrap gap-1">
                  <span className="text-gray-400 font-bold">Meeting ID</span>
                  <span className="font-mono font-bold text-gray-600 dark:text-gray-300">341 527 2874</span>
                </div>
                <div className="flex justify-between text-xs flex-wrap gap-1">
                  <span className="text-gray-400 font-bold">Passcode</span>
                  <span className="font-mono font-bold text-gray-600 dark:text-gray-300">12345</span>
                </div>
              </div>

              <a
                href="https://zoom.us/j/3415272874"
                target="_blank"
                rel="noopener noreferrer"
                className={`w-full ${currentTheme.BUTTON} font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition-all shadow-md active:scale-95 text-sm hover:scale-[1.02]`}
              >
                {t('join_session')} <ArrowRight size={16} className="rtl:rotate-180" />
              </a>
            </div>
          </div>

          {/* Traditional Yoga Card */}
          <div className="bg-white dark:bg-slate-800 rounded-3xl p-5 shadow-lg shadow-violet-500/5 dark:shadow-none border-2 border-gray-100 dark:border-slate-700 relative overflow-hidden group hover:shadow-xl transition-all">
            <div className={`absolute top-0 end-0 w-24 h-24 ${currentTheme.SESSION_2_BG} rounded-es-[4rem] -me-4 -mt-4 transition-all group-hover:scale-110 opacity-50`}></div>

            <div className="relative z-10">
              <div className="flex justify-between items-start mb-2">
                <span className={`${currentTheme.SESSION_2_BG} ${currentTheme.SESSION_2_ACCENT} text-[0.65rem] font-bold px-2 py-1 rounded-md uppercase tracking-wider`}>
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

              <h4 className={`font-fredoka font-bold text-xl ${currentTheme.TEXT_PRIMARY} dark:text-gray-100 mb-2 leading-tight`}>{t('traditional_yoga')}</h4>

              <div className="space-y-1.5 mb-4">
                <div className="flex items-center gap-2 text-sm font-medium text-gray-500 dark:text-gray-400">
                  <Globe size={14} className={`${currentTheme.SESSION_2_ACCENT} shrink-0`} />
                  <span>Dubai: <span className="text-gray-700 dark:text-gray-200 font-bold">6:45 - 7:45 AM</span></span>
                </div>
                <div className="flex items-center gap-2 text-sm font-medium text-gray-500 dark:text-gray-400">
                  <Globe size={14} className={`${currentTheme.SESSION_2_ACCENT} shrink-0`} />
                  <span>India: <span className="text-gray-700 dark:text-gray-200 font-bold">8:15 - 9:15 AM</span></span>
                </div>
              </div>

              <div className={`${currentTheme.SESSION_2_BG}/50 dark:bg-slate-700/50 rounded-xl p-3 mb-4 flex items-center justify-between flex-wrap gap-1`}>
                <span className="text-gray-400 font-bold text-xs">Passcode</span>
                <span className="font-mono font-bold text-gray-600 dark:text-gray-300 flex items-center gap-1">
                  <Lock size={12} className={`${currentTheme.SESSION_2_ACCENT}`} /> 536805
                </span>
              </div>

              <a
                href="https://zoom.us/join"
                target="_blank"
                rel="noopener noreferrer"
                className={`w-full ${currentTheme.BUTTON_SECONDARY} font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition-all shadow-md active:scale-95 text-sm hover:scale-[1.02]`}
              >
                {t('join_yoga')} <ArrowRight size={16} className="rtl:rotate-180" />
              </a>
            </div>
          </div>

        </div>
      </div>

      {/* Fun Games & Book Session - Pill Style */}
      <div className="grid grid-cols-2 gap-4 animate-fade-in-up delay-300">

        {/* Fun Games Button Wrapper */}
        <div className="relative group">
          {/* Glow Effect - Made larger with -inset-1 so it peeks out */}
          <div className={`absolute -inset-1 bg-gradient-to-r ${colorTheme === 'pastel' ? 'from-purple-300 to-pink-300' : 'from-[#8B3A3A] to-[#B85C5C]'} rounded-[2.2rem] blur-2xl opacity-0 group-hover:opacity-15 transition duration-500 group-hover:duration-200 animate-pulse`}></div>

          <button
            onClick={() => onNavigate(ViewState.GAMES)}
            className={`relative z-10 w-full ${currentTheme.GAMES} dark:bg-slate-800 p-4 rounded-[2rem] flex flex-col items-center justify-center text-center gap-2 transition-all shadow-sm hover:shadow-md h-full min-h-[100px]`}
          >
            <div className={`${currentTheme.GAMES_ICON_BG} rounded-full flex items-center justify-center`}>
              <Star size={24} fill="currentColor" className="group-hover:rotate-12 transition-transform" />
            </div>
            <span className={`font-bold text-base leading-tight text-current`}>{t('fun_games')}</span>
          </button>
        </div>

        {/* Book Session Button Wrapper */}
        <div className="relative group">
          {/* Glow Effect - Made larger with -inset-1 so it peeks out */}
          <div className={`absolute -inset-1 bg-gradient-to-r ${colorTheme === 'pastel' ? 'from-teal-200 to-emerald-200' : 'from-[#8B3A3A] to-[#934139]'} rounded-[2.2rem] blur-2xl opacity-0 group-hover:opacity-15 transition duration-500 group-hover:duration-200 animate-pulse`}></div>

          <button
            onClick={() => onNavigate(ViewState.CONTACT)}
            className={`relative z-10 w-full ${currentTheme.BOOK} dark:bg-slate-800 p-4 rounded-[2rem] flex flex-col items-center justify-center text-center gap-2 hover:brightness-110 dark:hover:bg-slate-700 transition-all shadow-sm hover:shadow-md h-full min-h-[100px]`}
          >
            <div className={`${currentTheme.BOOK_ICON_BG} rounded-full flex items-center justify-center`}>
              <Calendar size={24} className="group-hover:-rotate-12 transition-transform" />
            </div>
            <span className={`font-bold text-base leading-tight text-current`}>{t('book_session')}</span>
          </button>
        </div>
      </div>

    </div>
  );
};