import React, { useState, useEffect } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth } from './services/firebase';
import { Header } from './components/Header';
import { Navigation } from './components/Navigation';
import { Home } from './components/Home';
import { LaughterCoach } from './components/LaughterCoach';
import { LaughterGames } from './components/LaughterGames';
import { VideoLibrary } from './components/VideoLibrary';
import { SumanAI } from './components/SumanAI';
import { Contact } from './components/Contact';
import { Login } from './components/Login';
import { Profile } from './components/Profile';
import { PhoneLinker } from './components/PhoneLinker';
import { RewardPopup } from './components/RewardPopup';
import { AmbientMusic } from './components/AmbientMusic';
import { checkDailyStreak } from './services/rewardService';
import { ViewState } from './types';
import { Loader2 } from 'lucide-react';
import { SettingsProvider } from './contexts/SettingsContext';

const AppContent: React.FC = () => {
  const [currentView, setView] = useState<ViewState>(ViewState.HOME);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
      if (currentUser) {
        checkDailyStreak();
      }
    });
    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#EDE8F8] dark:bg-slate-900 text-[#AABBCC] transition-colors duration-500">
        <div className="w-40 h-40 bg-white dark:bg-slate-800 rounded-full flex items-center justify-center shadow-xl mb-6 animate-bounce p-4 border-8 border-white dark:border-slate-700 overflow-hidden relative">
           <img 
             src="https://sumansuneja.com/wp-content/uploads/2025/03/icon-mascot-suman-suneja.svg" 
             alt="Loading..." 
             className="w-full h-full object-contain relative z-10"
           />
        </div>
        <p className="font-fredoka font-bold text-2xl animate-pulse text-[#ABCEC9]">Loading Joy...</p>
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  // Mandatory Phone Linking for Gmail users
  const hasLinkedPhone = user.phoneNumber || localStorage.getItem(`user_phone_${user.uid}`);
  
  if (!hasLinkedPhone) {
    return <PhoneLinker user={user} onLinkSuccess={() => {
        window.location.reload();
    }} />;
  }

  const renderView = () => {
    switch (currentView) {
      case ViewState.HOME:
        return <Home onNavigate={setView} />;
      case ViewState.COACH:
        return <LaughterCoach />;
      case ViewState.GAMES:
        return <LaughterGames />;
      case ViewState.VIDEOS:
        return <VideoLibrary />;
      case ViewState.CHAT:
        return <SumanAI />;
      case ViewState.CONTACT:
        return <Contact />;
      case ViewState.PROFILE:
        return <Profile onNavigate={setView} />;
      default:
        return <Home onNavigate={setView} />;
    }
  };

  return (
    <div className="min-h-screen bg-[#EDE8F8] dark:bg-slate-900 font-sans text-gray-800 dark:text-gray-100 flex flex-col transition-colors duration-500">
      <Header onNavigate={setView} />
      
      <main className="flex-1 max-w-2xl mx-auto w-full bg-white/50 dark:bg-slate-800/50 min-h-screen shadow-2xl transition-colors duration-500">
        {renderView()}
      </main>

      <AmbientMusic />
      <Navigation currentView={currentView} setView={setView} />
      <RewardPopup />
    </div>
  );
};

const App: React.FC = () => {
  return (
    <SettingsProvider>
      <AppContent />
    </SettingsProvider>
  );
};

export default App;
