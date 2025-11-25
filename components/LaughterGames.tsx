import React, { useState, useRef, useEffect } from 'react';
import { Sparkles, Mic, Volume2, StopCircle, Play, Wand2, Smile, Zap, MessageSquare, Bot, AlertCircle } from 'lucide-react';
import { useSettings } from '../contexts/SettingsContext';

const MOODS = [
  { id: 'giggle', label: 'games.mood_giggle', icon: '🤭', color: 'bg-pink-100 text-pink-600' },
  { id: 'belly', label: 'games.mood_belly', icon: '😂', color: 'bg-yellow-100 text-yellow-600' },
  { id: 'snort', label: 'games.mood_snort', icon: '🐽', color: 'bg-blue-100 text-blue-600' },
  { id: 'cackle', label: 'games.mood_cackle', icon: '🧙‍♀️', color: 'bg-purple-100 text-purple-600' },
];

export const LaughterGames: React.FC = () => {
  const { t } = useSettings();
  const [activeTab, setActiveTab] = useState<'story' | 'jokes' | 'moods'>('story');
  const [input, setInput] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [generatedText, setGeneratedText] = useState('');
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Stop audio when component unmounts
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  const handleGenerate = async () => {
    if (!input.trim()) return;

    setIsGenerating(true);
    setGeneratedText('');

    // Simulate AI generation
    setTimeout(() => {
      const responses = [
        "Why did the laughter yogi cross the road? To get to the happy side! 😂",
        "Imagine a world where everyone laughs at their alarm clock. Hahaha! ⏰",
        "Laughter is the best medicine, unless you have a broken rib. Then it's just painful! 🤣"
      ];
      setGeneratedText(responses[Math.floor(Math.random() * responses.length)]);
      setIsGenerating(false);
    }, 1500);
  };

  const playLaughter = (moodId: string) => {
    if (audioRef.current) {
      audioRef.current.pause();
    }

    // In a real app, these would be actual audio files
    console.log(`Playing ${moodId} laughter`);
    setIsPlaying(true);

    setTimeout(() => setIsPlaying(false), 2000);
  };

  return (
    <div className="space-y-6 pb-24 animate-in fade-in slide-in-from-bottom-4 duration-700">

      {/* Header */}
      <div className="text-center space-y-2 py-4">
        <div className="inline-block p-3 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 shadow-lg mb-2">
          <Bot size={32} className="text-white" />
        </div>
        <h2 className="text-3xl font-black text-gray-800">{t('games.title')}</h2>
        <p className="text-gray-500 font-medium">
          {activeTab === 'jokes' ? t('games.subtitle_jokes') : t('games.subtitle_joy')}
        </p>
      </div>

      {/* Tabs */}
      <div className="flex p-1 bg-gray-100 rounded-2xl mx-4">
        <button
          onClick={() => setActiveTab('story')}
          className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all ${activeTab === 'story'
              ? 'bg-white text-indigo-600 shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
            }`}
        >
          {t('games.tab_story')}
        </button>
        <button
          onClick={() => setActiveTab('jokes')}
          className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all ${activeTab === 'jokes'
              ? 'bg-white text-indigo-600 shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
            }`}
        >
          {t('games.tab_jokes')}
        </button>
        <button
          onClick={() => setActiveTab('moods')}
          className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all ${activeTab === 'moods'
              ? 'bg-white text-indigo-600 shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
            }`}
        >
          {t('games.tab_moods')}
        </button>
      </div>

      {/* Main Content Area */}
      <div className="px-4">
        <div className="bg-white rounded-3xl p-6 shadow-xl border border-indigo-50 min-h-[300px] flex flex-col">

          {activeTab === 'moods' ? (
            <div className="grid grid-cols-2 gap-4 h-full">
              {MOODS.map((mood) => (
                <button
                  key={mood.id}
                  onClick={() => playLaughter(mood.id)}
                  className={`${mood.color} p-4 rounded-2xl flex flex-col items-center justify-center gap-3 transition-transform hover:scale-105 active:scale-95 h-32`}
                >
                  <span className="text-4xl">{mood.icon}</span>
                  <span className="font-bold text-sm">{t(mood.label)}</span>
                </button>
              ))}
            </div>
          ) : (
            <>
              {/* Output Display */}
              <div className="flex-1 bg-gray-50 rounded-2xl p-6 mb-4 flex items-center justify-center text-center relative overflow-hidden group">
                {generatedText ? (
                  <div className="animate-in zoom-in duration-300">
                    <p className="text-xl font-medium text-gray-800 leading-relaxed">
                      "{generatedText}"
                    </p>
                    <div className="mt-4 flex justify-center gap-2">
                      <button className="p-2 rounded-full bg-indigo-100 text-indigo-600 hover:bg-indigo-200 transition-colors">
                        <Volume2 size={20} />
                      </button>
                      <button className="p-2 rounded-full bg-indigo-100 text-indigo-600 hover:bg-indigo-200 transition-colors">
                        <Sparkles size={20} />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="text-gray-400 flex flex-col items-center gap-3">
                    {isGenerating ? (
                      <>
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
                        <span className="text-sm font-medium animate-pulse">{t('games.brewing_laughter')}</span>
                      </>
                    ) : (
                      <>
                        <Wand2 size={32} className="opacity-50" />
                        <span className="text-sm font-medium">
                          {activeTab === 'story' ? t('games.input_placeholder_story') : t('games.input_placeholder_joke')}
                        </span>
                      </>
                    )}
                  </div>
                )}
              </div>

              {/* Input Area */}
              <div className="relative">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder={activeTab === 'story' ? t('games.input_placeholder_story') : t('games.input_placeholder_joke')}
                  className="w-full bg-gray-100 border-2 border-transparent focus:border-indigo-300 rounded-2xl py-4 pl-4 pr-14 font-medium focus:outline-none transition-all"
                  onKeyDown={(e) => e.key === 'Enter' && handleGenerate()}
                />
                <button
                  onClick={handleGenerate}
                  disabled={!input.trim() || isGenerating}
                  className="absolute right-2 top-2 bottom-2 aspect-square bg-indigo-600 text-white rounded-xl flex items-center justify-center shadow-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-indigo-700 transition-colors"
                >
                  <Zap size={20} fill="currentColor" />
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Footer Branding */}
      <div className="text-center pt-4">
        <p className="text-xs text-gray-400 font-medium tracking-wide uppercase">
          {t('app.developed_by')}
        </p>
        <a
          href="https://skrmblissai.systeme.io/homepage"
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-400 hover:opacity-80 transition-opacity"
        >
          SKRMBliss.ai Studio
        </a>
      </div>
    </div>
  );
};