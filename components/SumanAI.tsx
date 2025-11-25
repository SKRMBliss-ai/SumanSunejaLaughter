import React, { useState, useRef, useEffect } from 'react';
import { Send, User, Bot } from 'lucide-react';
import { getChatResponse } from '../services/geminiService';
import { ChatMessage } from '../types';
import { useSettings } from '../contexts/SettingsContext';

export const SumanAI: React.FC = () => {
  const { t, language } = useSettings();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const hasInitialized = useRef(false);

  // Initialize greeting
  useEffect(() => {
    if (!hasInitialized.current) {
      setMessages([{ role: 'model', text: t('ai.greeting') }]);
      hasInitialized.current = true;
    }
  }, [t]);

  // Update greeting if language changes and it's the only message
  useEffect(() => {
    if (messages.length === 1 && messages[0].role === 'model') {
      setMessages([{ role: 'model', text: t('ai.greeting') }]);
    }
  }, [language, t]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMsg = { role: 'user', text: input } as ChatMessage;
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    // Prepare history for API (converting our state to Gemini format)
    const history = messages.map(m => ({
      role: m.role === 'model' ? 'model' : 'user',
      parts: [{ text: m.text }]
    }));

    try {
      // Pass language to getChatResponse
      const responseText = await getChatResponse(history, userMsg.text, language);

      // Check if result is undefined or empty
      const safeResponse = responseText || t('ai.empty_response');

      setMessages(prev => [...prev, { role: 'model', text: safeResponse }]);
    } catch (e: any) {
      let errorMessage = t('ai.connection_error');

      if (e.message === "MISSING_GEMINI_KEY") {
        errorMessage = t('ai.missing_key');
      }

      setMessages(prev => [...prev, { role: 'model', text: errorMessage }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-130px)] bg-[#EDE8F8] dark:bg-slate-900 transition-colors duration-500">
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg, idx) => (
          <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] p-3 rounded-2xl shadow-sm ${msg.role === 'user'
                ? 'bg-[#ABCEC9] text-white rounded-br-none'
                : 'bg-white dark:bg-slate-800 text-gray-700 dark:text-gray-100 border border-gray-100 dark:border-slate-700 rounded-bl-none'
              }`}>
              <div className="flex items-center gap-2 mb-1 opacity-80 text-xs">
                {msg.role === 'user' ? <User size={12} /> : <Bot size={12} />}
                <span className="font-bold uppercase">{msg.role === 'user' ? t('ai.you') : t('ai.bot')}</span>
              </div>
              <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.text}</p>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-white/50 dark:bg-slate-800/50 text-[#AABBCC] dark:text-gray-400 p-3 rounded-2xl rounded-bl-none animate-pulse text-sm">
              {t('ai.thinking')}
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-4 bg-white dark:bg-slate-800 border-t border-[#EDE8F8] dark:border-slate-700">
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder={t('ai.placeholder')}
            className="flex-1 p-3 bg-[#EDE8F8] dark:bg-slate-900 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#C3B8D5] text-sm text-gray-700 dark:text-gray-100"
          />
          <button
            onClick={handleSend}
            disabled={isLoading}
            className="p-3 bg-[#C3B8D5] hover:bg-[#b0a5c4] text-white rounded-xl disabled:opacity-50 transition-colors"
          >
            <Send size={20} />
          </button>
        </div>
      </div>
    </div>
  );
};