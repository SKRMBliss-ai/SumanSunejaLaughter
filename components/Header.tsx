import React, { useEffect, useState } from 'react';
import { Youtube, User } from 'lucide-react';
import { auth } from '../services/firebase';
import { ViewState } from '../types';

interface HeaderProps {
  onNavigate?: (view: ViewState) => void;
}

export const Header: React.FC<HeaderProps> = ({ onNavigate }) => {
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
    <header className="bg-gradient-to-r from-[#C3B8D5] via-[#ABCEC9] to-[#AABBCC] dark:from-slate-800 dark:via-slate-700 dark:to-slate-800 text-white p-3 shadow-lg sticky top-0 z-40 pb-5 mb-[-1rem] transition-colors duration-300">
      <div className="flex items-center justify-between max-w-2xl mx-auto px-1">
        <div 
          className="flex items-center space-x-3 cursor-pointer" 
          onClick={() => onNavigate && onNavigate(ViewState.HOME)}
        >
          <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-lg overflow-hidden border-2 border-[#EDE8F8] dark:border-slate-600 transform hover:scale-105 transition-transform duration-300 shrink-0">
             <img 
               src="https://res.cloudinary.com/dfopoyt9v/image/upload/v1763924287/Suman1_c0uw7w.webp" 
               alt="Suman Suneja Logo" 
               className="w-full h-full object-cover"
             />
          </div>
          <div className="flex flex-col justify-center">
            <h1 className="text-xl font-fredoka font-bold leading-none drop-shadow-md text-white">Suman Suneja</h1>
            <p className="text-[0.65rem] text-[#EDE8F8] dark:text-slate-300 font-bold uppercase tracking-wider opacity-90">Laughter Yoga Hub</p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
           <a 
            href="https://www.youtube.com/@sumansunejaofficial" 
            target="_blank" 
            rel="noopener noreferrer"
            className="hidden sm:flex bg-red-50 hover:bg-red-100 dark:bg-red-900/30 dark:hover:bg-red-900/50 text-red-600 dark:text-red-400 text-[0.65rem] px-3 py-1.5 rounded-full font-bold transition-all hover:scale-105 items-center gap-1 shadow-md border border-red-100 dark:border-red-900/50"
          >
            <Youtube size={14} fill="currentColor" className="text-red-500" /> Subscribe
          </a>
          
          <button 
            onClick={() => onNavigate && onNavigate(ViewState.PROFILE)}
            className="w-10 h-10 rounded-full border-2 border-white/30 hover:border-white shadow-sm overflow-hidden transition-all active:scale-95 bg-white/20 flex items-center justify-center shrink-0"
            title="My Profile"
          >
            {photoURL ? (
              <img src={photoURL} alt="User" className="w-full h-full object-cover" />
            ) : (
              <User size={20} className="text-white" />
            )}
          </button>
        </div>
      </div>
    </header>
  );
};