import React, { useState, useEffect, useRef } from 'react';
import { User, Camera, Save, Phone, LogOut, Sparkles, Check, X, Flame, Trophy, Zap, Calendar, TrendingUp, Moon, Sun, Globe, Type } from 'lucide-react';
import { updateProfile } from 'firebase/auth';
import { auth } from '../services/firebase';
import { ViewState, RewardState } from '../types';
import { getRewardState } from '../services/rewardService';
import { useSettings, SUPPORTED_LANGUAGES, FontSize } from '../contexts/SettingsContext';

interface ProfileProps {
  onNavigate?: (view: ViewState) => void;
}

export const Profile: React.FC<ProfileProps> = ({ onNavigate }) => {
  const user = auth.currentUser;
  const { theme, toggleTheme, language, setLanguage, fontSize, setFontSize, t } = useSettings();
  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [photoURL, setPhotoURL] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [rewards, setRewards] = useState<RewardState>(getRewardState());
  const [isLangMenuOpen, setIsLangMenuOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const linkedPhoneNumber = user?.phoneNumber || (user ? localStorage.getItem(`user_phone_${user.uid}`) : null);

  useEffect(() => {
    if (user) {
      const localPhoto = localStorage.getItem(`user_avatar_${user.uid}`);
      if (localPhoto) {
        setPhotoURL(localPhoto);
      } else if (user.photoURL) {
        setPhotoURL(user.photoURL);
      }
    }

    const handleRewardUpdate = () => setRewards(getRewardState());
    window.addEventListener('storage', handleRewardUpdate);
    return () => window.removeEventListener('storage', handleRewardUpdate);
  }, [user]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();

      reader.onloadend = () => {
        const base64String = reader.result as string;
        setPhotoURL(base64String);
      };

      reader.readAsDataURL(file);
    }
  };

  const handleSave = async () => {
    if (!user) return;
    setIsSaving(true);
    setMessage(null);

    try {
      await updateProfile(user, {
        displayName: displayName
      });

      if (photoURL) {
        localStorage.setItem(`user_avatar_${user.uid}`, photoURL);
      }

      setMessage({ type: 'success', text: 'Profile updated successfully!' });
    } catch (error) {
      console.error(error);
      setMessage({ type: 'error', text: 'Failed to update profile. Try again.' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSignOut = () => {
    if (window.confirm("Are you sure you want to sign out?")) {
      auth.signOut();
    }
  };

  const fontSizes: { id: FontSize; label: string; px: string }[] = [
    { id: 'small', label: 'S', px: '14px' },
    { id: 'normal', label: 'M', px: '16px' },
    { id: 'large', label: 'L', px: '19px' },
    { id: 'xl', label: 'XL', px: '22px' }
  ];

  return (
    <div className="p-6 pb-44 animate-in fade-in slide-in-from-bottom-4 duration-500 relative">

      {onNavigate && (
        <button
          onClick={() => onNavigate(ViewState.HOME)}
          className="absolute top-4 end-4 z-20 bg-white/80 dark:bg-slate-700 p-2 rounded-full shadow-md text-gray-500 dark:text-gray-300 hover:text-gray-700 hover:bg-white transition-all"
        >
          <X size={24} />
        </button>
      )}

      <div className="text-center mb-8 pt-4">
        <h2 className="text-3xl font-fredoka font-bold text-gray-700 dark:text-gray-100">{t('profile.title')}</h2>
        <p className="text-[#AABBCC] font-medium text-sm">{t('profile.subtitle')}</p>
      </div>

      <div className="max-w-md mx-auto bg-white dark:bg-slate-800 rounded-[2.5rem] shadow-xl border border-[#EDE8F8] dark:border-slate-700 overflow-hidden relative transition-colors duration-300">

        {/* Settings Bar */}
        <div className="absolute top-4 start-4 z-20 flex gap-2">
          <button
            onClick={toggleTheme}
            className="p-2 bg-white/50 dark:bg-black/20 backdrop-blur-md rounded-full border border-white/20 shadow-sm text-gray-600 dark:text-yellow-300 hover:scale-110 transition-transform active:scale-95"
            title="Toggle Dark Mode"
          >
            {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
          </button>
          <div className="relative">
            <button
              onClick={() => setIsLangMenuOpen(!isLangMenuOpen)}
              className="p-2 bg-white/50 dark:bg-black/20 backdrop-blur-md rounded-full border border-white/20 shadow-sm text-gray-600 dark:text-gray-200 flex items-center gap-1 active:scale-95"
            >
              <Globe size={18} /> <span className="text-[0.65rem] font-bold uppercase">{SUPPORTED_LANGUAGES.find(l => l.code === language)?.label || language}</span>
            </button>

            {isLangMenuOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setIsLangMenuOpen(false)}></div>
                <div className="absolute top-full start-0 mt-2 bg-white dark:bg-slate-700 rounded-xl shadow-xl p-1 z-50 min-w-[120px] max-h-60 overflow-y-auto animate-in zoom-in-95 border border-gray-100 dark:border-slate-600 origin-top-left rtl:origin-top-right">
                  {SUPPORTED_LANGUAGES.map(lang => (
                    <button
                      key={lang.code}
                      onClick={() => { setLanguage(lang.code); setIsLangMenuOpen(false); }}
                      className={`w-full text-start px-3 py-2 text-xs font-bold rounded-lg transition-colors ${language === lang.code ? 'bg-[#ABCEC9] text-white' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-600'}`}
                    >
                      {lang.label}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        <div className="h-32 bg-gradient-to-r from-[#C3B8D5] to-[#ABCEC9] dark:from-indigo-900 dark:to-purple-900 relative">
          <div className="absolute top-0 start-0 w-full h-full bg-white opacity-10" style={{ backgroundImage: 'radial-gradient(circle, #fff 2px, transparent 2px)', backgroundSize: '20px 20px' }}></div>
        </div>

        <div className="px-6 pb-8 relative">
          <div className="relative -mt-16 mb-6 flex justify-center">
            <div className="relative group">
              <div className="w-32 h-32 rounded-full border-4 border-white dark:border-slate-700 shadow-lg bg-[#EDE8F8] dark:bg-slate-700 flex items-center justify-center overflow-hidden">
                {photoURL ? (
                  <img src={photoURL} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  <User size={48} className="text-[#C3B8D5]" />
                )}
              </div>

              <button
                onClick={() => fileInputRef.current?.click()}
                className="absolute bottom-0 end-0 bg-[#ABCEC9] text-white p-2.5 rounded-full shadow-md hover:bg-[#9BBDB8] transition-colors hover:scale-110 active:scale-95 border-2 border-white dark:border-slate-700"
                title="Upload Photo"
              >
                <Camera size={18} />
              </button>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept="image/*"
                capture="user"
                className="hidden"
              />
            </div>
          </div>

          <div className="mb-6 bg-gradient-to-r from-orange-50 via-white to-orange-50 dark:from-slate-800 dark:via-slate-700 dark:to-slate-800 border border-orange-200 dark:border-slate-600 rounded-3xl p-4 shadow-sm relative overflow-hidden group">
            <div className="absolute top-0 start-0 w-full h-1 bg-gradient-to-r from-orange-300 to-red-400"></div>
            <div className="flex items-center justify-between relative z-10 flex-wrap gap-2">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="absolute inset-0 bg-orange-400 rounded-full blur-md opacity-30 animate-pulse"></div>
                  <div className="bg-gradient-to-br from-orange-400 to-red-500 p-3 rounded-full shadow-lg text-white animate-[bounce-gentle_2s_infinite]">
                    <Flame size={24} fill="currentColor" />
                  </div>
                </div>
                <div className="text-start">
                  <h3 className="font-black text-gray-700 dark:text-gray-100 text-xl leading-none italic">STREAK POWER</h3>
                  <p className="text-xs text-orange-500 font-bold mt-1">
                    {rewards.streak > 0 ? `${rewards.streak} ${t('streak')} 🔥` : "Start today!"}
                  </p>
                </div>
              </div>
              <div className="text-end">
                <div className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-orange-500 to-red-500">
                  {rewards.streak * 50}
                </div>
                <div className="text-[0.65rem] font-bold text-gray-400 uppercase">Bonus</div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 mb-6">
            <div className="bg-[#F5F3FA] dark:bg-slate-700/50 p-3 rounded-2xl flex flex-col items-center justify-center border border-[#EDE8F8] dark:border-slate-600 shadow-sm relative overflow-hidden group hover:border-[#C3B8D5] transition-colors min-h-[5rem]">
              <TrendingUp className="text-[#C3B8D5] mb-1 z-10" size={20} />
              <span className="text-xl font-black text-gray-700 dark:text-gray-100 leading-none z-10 break-all">{rewards.level}</span>
              <span className="text-[0.65rem] font-bold text-gray-400 uppercase tracking-tight z-10 text-center leading-tight break-words w-full">{t('level')}</span>
            </div>
            <div className="bg-teal-50 dark:bg-slate-700/50 p-3 rounded-2xl flex flex-col items-center justify-center border border-teal-100 dark:border-slate-600 shadow-sm relative overflow-hidden hover:border-teal-200 transition-colors min-h-[5rem]">
              <Zap className="text-teal-500 mb-1 z-10" size={20} fill="currentColor" />
              <span className="text-xl font-black text-gray-700 dark:text-gray-100 leading-none z-10 break-all">{rewards.points}</span>
              <span className="text-[0.65rem] font-bold text-teal-400 uppercase tracking-tight z-10 text-center leading-tight break-words w-full">{t('points')}</span>
            </div>
            <div className="bg-purple-50 dark:bg-slate-700/50 p-3 rounded-2xl flex flex-col items-center justify-center border border-purple-100 dark:border-slate-600 shadow-sm relative overflow-hidden hover:border-purple-200 transition-colors min-h-[5rem]">
              <Calendar className="text-purple-400 mb-1 z-10" size={20} />
              <span className="text-xs font-black text-gray-700 dark:text-gray-100 leading-none z-10 mt-1 break-words text-center">{t('today')}</span>
              <span className="text-[0.65rem] font-bold text-purple-400 uppercase tracking-tight z-10 mt-0.5 text-center leading-tight">{rewards.lastActiveDate === new Date().toDateString() ? 'Active' : '...'}</span>
            </div>
          </div>

          <div className="space-y-5">

            {/* Font Size Control */}
            <div>
              <label className="block text-xs font-bold text-[#AABBCC] uppercase tracking-wider mb-2 ms-2 text-start flex items-center gap-1">
                <Type size={14} /> {t('settings.font_size')}
              </label>
              <div className="flex bg-[#F5F3FA] dark:bg-slate-700 p-1 rounded-2xl border border-gray-100 dark:border-slate-600">
                {fontSizes.map((size) => (
                  <button
                    key={size.id}
                    onClick={() => setFontSize(size.id)}
                    className={`flex-1 py-3 rounded-xl font-bold transition-all shadow-sm flex flex-col items-center justify-center gap-0.5 ${fontSize === size.id ? 'bg-[#ABCEC9] text-white shadow-md' : 'text-gray-400 hover:bg-white dark:hover:bg-slate-600'}`}
                  >
                    <span style={{ fontSize: size.px }} className="leading-none">A</span>
                    <span className="text-[0.65rem] opacity-70">{size.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#AABBCC] uppercase tracking-wider mb-1 ms-2 text-start">Display Name</label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Enter your name"
                className="w-full bg-[#F5F3FA] dark:bg-slate-700 border-2 border-transparent focus:border-[#C3B8D5] rounded-xl p-4 text-gray-700 dark:text-white font-bold focus:outline-none transition-all text-start"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#AABBCC] uppercase tracking-wider mb-1 ms-2 text-start">Phone Number</label>
              <div className="w-full bg-gray-50 dark:bg-slate-700 border border-gray-100 dark:border-slate-600 rounded-xl p-4 text-gray-500 dark:text-gray-300 font-medium flex items-center gap-3">
                <Phone size={18} className="text-gray-300" />
                {linkedPhoneNumber || 'No number linked'}
              </div>
            </div>

            {message && (
              <div className={`p-3 rounded-xl text-sm font-bold flex items-center gap-2 ${message.type === 'success' ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
                {message.type === 'success' ? <Check size={16} /> : <Sparkles size={16} />}
                {message.text}
              </div>
            )}

            <button
              onClick={handleSave}
              disabled={isSaving}
              className="w-full bg-[#ABCEC9] hover:bg-[#9BBDB8] text-white font-bold py-4 rounded-xl shadow-lg shadow-[#ABCEC9]/20 transition-all active:scale-95 flex items-center justify-center gap-2"
            >
              {isSaving ? (
                <span className="animate-pulse">Saving...</span>
              ) : (
                <>
                  <Save size={20} /> {t('save_changes')}
                </>
              )}
            </button>

            <div className="pt-4 border-t border-gray-100 dark:border-slate-700">
              <button
                onClick={handleSignOut}
                className="w-full text-red-400 hover:text-red-500 font-bold py-3 rounded-xl hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors flex items-center justify-center gap-2 text-sm"
              >
                <LogOut size={16} /> {t('sign_out')}
              </button>
              <div className="mt-6 text-center">
                <p className="text-[10px] text-[#AABBCC] dark:text-slate-500 font-bold tracking-wide">
                  App Developed by <a href="https://skrmblissai.systeme.io/homepage" target="_blank" rel="noopener noreferrer" className="text-[#ABCEC9] hover:underline">SKRMBliss.ai Studio</a>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};