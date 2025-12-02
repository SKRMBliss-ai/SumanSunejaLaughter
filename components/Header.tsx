import React, { useEffect, useState } from 'react';
import { Youtube, User } from 'lucide-react';
import { auth } from '../services/firebase';
import { ViewState } from '../types';
import { useSettings } from '../contexts/SettingsContext';

interface HeaderProps {
  onNavigate?: (view: ViewState) => void;
}

export const Header: React.FC<HeaderProps> = ({ onNavigate }) => {
  const { currentTheme } = useSettings();
  const [photoURL, setPhotoURL] = useState<string | null>(null);

  useEffect(() => {
    const loadPhoto = () => {
      const user = auth.currentUser;
      if (user) {
        const localPhoto = localStorage.getItem(`user_avatar_${user.uid}`);
        if (localPhoto) {
          setPhotoURL(localPhoto);
        } else if (user.photoURL) {
          setPhotoURL(user.photoURL);
        }
      }
    };

    loadPhoto();
    const interval = setInterval(loadPhoto, 2000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className={`${currentTheme.HEADER_BG} dark:bg-slate-900 ${currentTheme.HEADER_TEXT} dark:text-white p-3 shadow-md sticky top-0 z-40 pb-5 mb-[-1rem] transition-colors duration-300 border-b ${currentTheme.HEADER_BORDER}`}>
      <div className="flex items-center justify-between max-w-2xl mx-auto px-1">
        <div
          className="flex items-center space-x-3 cursor-pointer"
          onClick={() => onNavigate && onNavigate(ViewState.HOME)}
        >
          <div className={`w-14 h-14 bg-white rounded-full flex items-center justify-center shadow-lg overflow-hidden border-2 ${currentTheme.HEADER_BORDER} dark:border-slate-600 transform hover:scale-105 transition-transform duration-300 shrink-0`}>
            <img
              src="https://res.cloudinary.com/dfopoyt9v/image/upload/v1763924287/Suman1_c0uw7w.webp"
              alt="Suman Suneja Logo"
              className="w-full h-full object-cover"
            />
          </div>
          <div className="flex flex-col justify-center">
            <h1 className={`text-2xl font-light leading-none drop-shadow-sm ${currentTheme.HEADER_TEXT} dark:text-white`}>Suman Suneja</h1>
            <p className="text-[0.7rem] text-[#934139] dark:text-slate-300 font-bold uppercase tracking-wider opacity-90">Laughter Yoga Hub</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <a
            href="https://www.youtube.com/@sumansunejaofficial"
            target="_blank"
            rel="noopener noreferrer"
            // REMOVED 'text-white' class to allow theme text color to apply
            className={`hidden sm:flex ${currentTheme.SUBSCRIBE_BTN} text-[0.7rem] px-4 py-2 rounded-full font-bold transition-all hover:scale-105 items-center gap-1 shadow-md shadow-orange-900/20`}
          >
            {/* UPDATED icon to 'text-current' to match parent button text */}
            <Youtube size={16} fill="currentColor" className="text-current" /> Subscribe
          </a>

          <button
            onClick={() => onNavigate && onNavigate(ViewState.PROFILE)}
            className={`w-10 h-10 rounded-full border-2 ${currentTheme.HEADER_BORDER} hover:border-[#783766] shadow-sm overflow-hidden transition-all active:scale-95 bg-white/50 flex items-center justify-center shrink-0`}
            title="My Profile"
          >
            {photoURL ? (
              <img src={photoURL} alt="User" className="w-full h-full object-cover" />
            ) : (
              <User size={20} className={currentTheme.HEADER_TEXT} />
            )}
          </button>
        </div>
      </div>
    </header>
  );
};