import React, { useState, useRef, useEffect } from 'react';
import { Send, User, Bot } from 'lucide-react';
import { getChatResponse } from '../services/geminiService';
import { ChatMessage } from '../types';
import { useSettings } from '../contexts/SettingsContext';

const PREDEFINED_PROMPTS = [
  "What is Laughter Yoga?",
  "How to relieve stress?",
  "Tell me a joke!",
  "Benefits of laughing?",
  "Book a session"
];

export const SumanAI: React.FC = () => {
  // Destructure colorTheme to conditionally style the button
  const { currentTheme, colorTheme } = useSettings();
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: 'model', text: 'Namaste! I am your AI assistant trained on Suman Suneja\'s wisdom. Ask Suman about Laughter Yoga, corporate sessions, or how to relieve stress!' }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async (text?: string) => {
    const messageText = typeof text === 'string' ? text : input;
    if (!messageText.trim() || isLoading) return;

    const userMsg = { role: 'user', text: messageText } as ChatMessage;
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    // Prepare history for API (converting our state to Gemini format)
    const history = messages.map(m => ({
      role: m.role === 'model' ? 'model' : 'user',
      parts: [{ text: m.text }]
    }));

    try {
      const responseText = await getChatResponse(history, userMsg.text);

      // Check if result is undefined or empty
      const safeResponse = responseText || "I'm smiling, but I couldn't think of an answer. Try again?";

      setMessages(prev => [...prev, { role: 'model', text: safeResponse }]);
    } catch (e: any) {
      let errorMessage = "Connection error. Keep laughing though!";

      if (e.message === "MISSING_GEMINI_KEY") {
        errorMessage = "Oh no! I lost my brain. 🧠\n\n(Deployment Error: Gemini API Key is missing. Please add 'API_KEY' to your environment variables.)";
      }

      setMessages(prev => [...prev, { role: 'model', text: errorMessage }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={`flex flex-col h-[calc(100vh-130px)] bg-[#FFF8F0] dark:bg-slate-900 transition-colors duration-500`}>
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg, idx) => (
          <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] p-3 rounded-2xl shadow-sm ${msg.role === 'user'
              // User message bubble: Use Brand Theme for brand theme, or theme button color for pastel
              ? `${colorTheme === 'pastel' ? currentTheme.BUTTON : 'bg-[#8B3A3A]'} text-white rounded-br-none`
              : 'bg-white dark:bg-slate-800 text-gray-700 dark:text-gray-100 border border-gray-100 dark:border-slate-700 rounded-bl-none'
              }`}>
              <div className="flex items-center gap-2 mb-1 opacity-80 text-xs">
                {msg.role === 'user' ? <User size={12} /> : <Bot size={12} />}
                <span className="font-bold uppercase">{msg.role === 'user' ? 'You' : 'Suman AI'}</span>
              </div>
              <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.text}</p>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className={`bg-white/50 dark:bg-slate-800/50 ${currentTheme.TEXT_PRIMARY} dark:text-gray-400 p-3 rounded-2xl rounded-bl-none animate-pulse text-sm`}>
              Thinking happily...
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className={`p-4 bg-[#FFF8F0] dark:bg-slate-800 border-t ${currentTheme.VIDEO_BORDER} dark:border-slate-700`}>
        {/* Predefined Prompts */}
        <div className="flex gap-2 mb-3 overflow-x-auto pb-2 hide-scrollbar">
          {PREDEFINED_PROMPTS.map((prompt, index) => (
            <button
              key={index}
              onClick={() => handleSend(prompt)}
              disabled={isLoading}
              className={`whitespace-nowrap px-4 py-2 rounded-full text-sm font-medium transition-colors border shadow-sm flex-shrink-0
                ${colorTheme === 'pastel'
                  ? 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                  : 'bg-white text-[#8B3A3A] border-[#8B3A3A]/20 hover:bg-[#8B3A3A]/5'}
                dark:bg-slate-700 dark:text-gray-200 dark:border-slate-600 dark:hover:bg-slate-600
              `}
            >
              {prompt}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Ask about Laughter Yoga..."
            className={`flex-1 p-3 bg-white dark:bg-slate-900 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#C3B8D5] text-sm text-gray-700 dark:text-gray-100 border border-gray-100 dark:border-slate-700`}
          />
          <button
            onClick={() => handleSend()}
            disabled={isLoading}
            // Button Style: Brand Theme for brand theme, standard secondary for pastel
            className={`p-3 ${colorTheme === 'pastel' ? currentTheme.BUTTON_SECONDARY : 'bg-[#8B3A3A] hover:bg-[#7a302a]'} text-white rounded-xl disabled:opacity-50 transition-colors shadow-md`}
          >
            <Send size={20} />
          </button>
        </div>
      </div>
    </div>
  );
};