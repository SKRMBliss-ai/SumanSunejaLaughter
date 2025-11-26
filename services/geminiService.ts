import { GoogleGenAI, Type, Schema, Modality } from "@google/genai";
import { JOKES, STORIES } from './contentRepository';

// Try to get API key from Vite env first, then fallback to window object (set from Cloud Run)
let apiKey = import.meta.env.VITE_GEMINI_API_KEY || '';
if (!apiKey && typeof window !== 'undefined' && (window as any).__GEMINI_API_KEY__) {
  apiKey = (window as any).__GEMINI_API_KEY__;
}
// Initialize conditionally to prevent crashes if key is strictly validated on init
const ai = apiKey ? new GoogleGenAI({ apiKey }) : null;

// --- Pre-defined Scripts for Instant Start (1 Minute Duration) ---
const QUICK_SCRIPTS = [
  "Hello wonderful soul! Suman Suneja here. Let's energize your day in just one minute! Start by clapping your hands. 1, 2, 1-2-3! Ho, ho, Ha-ha-ha! Ho, ho, Ha-ha-ha! Feel the rhythm waking up your body. Now, take a deep breath in... hold it... and release with a giant laugh! HAAAA-ha-ha-ha! Imagine you are a mobile phone on silent mode—shake your body and giggle silently. T-h-h-h-h. Now, full volume! Bwahahaha! Raise your arms to the sky, catch the joy, and pull it into your heart. Say with me: I am Happy! I am Healthy! I am Laughter! Yes, yes, YES! Have a sparkling day!",
  "Namaste! It's time for your Laughter Cocktail! Imagine you are holding two glasses. Pour the joy from one to the other. Aeee! Aeee! And drink it back! Ha ha ha ha! Let's do it again. Aeee! Aeee! Hahahaha! Now, let's do the Lion Laugh. Eyes wide open, tongue out, hands like claws. Take a deep breath and ROAR with laughter! Bwaaah ha ha ha! Feel the stress leaving your body. Shake your hands, shake your legs, and just laugh for no reason. He he he, Ho ho ho! You are doing amazing! One last big smile! Very good, very good, YAY!",
  "Welcome to your one-minute stress buster! Let's start with a deep breath. Inhale peace... exhale worry with a sigh. Aaaah. Now, let's start the engine of joy. Put your hand on your heart and chuckle softly. He he he. Now move it to your belly. Ho ho ho. Now let it explode! Ha ha ha ha! Imagine you just heard the funniest joke in the world. Point your finger and laugh! Bwahahaha! Now, pat your own back and say 'Well done, me!' Ha ha ha. Laughter is the best medicine. Keep smiling and keep shining!",
  "Ready for a joy boost? Let's do the Milkshake Laugh! Hold your imaginary glass. Shake it up: Ho ho! Shake it down: Ha ha! And drink! Hahahaha! Delicious! Now, let's do the Argument Laugh. Point your finger at me and laugh, and I will laugh at you! Wa ha ha ha! No words, just laughter. Hee hee hee! Now, open your arms wide like you are hugging the whole world. Deep breath in... and laugh it out! Ha ha ha ha! Feel the vibration in every cell of your body. You are pure energy! Yes, yes, YAY!",
  "Let's wipe away the stress! Imagine you have a laughter sponge. Wipe your forehead—he he he. Wipe your shoulders—ha ha ha. Wipe your chest—ho ho ho. Throw the sponge away and just laugh! Bwahahaha! Now, let's do the Gradient Laugh. Start with a smile... then a giggle... then a chuckle... and finally a loud belly laugh! Smile. He he. Ha ha. BWAHAHAHA! Let it flow! Don't hold back! Your joy is contagious. Take this energy with you for the rest of the day. Very good, very good, YAY!"
];

// --- Audio Helpers ---

export const base64ToUint8Array = (base64: string): Uint8Array => {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
};

export const createAudioBufferFromPCM = (ctx: AudioContext, base64: string): AudioBuffer => {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }

  // Gemini 2.5 Flash TTS returns 24kHz Mono 16-bit PCM
  // We need to interpret the bytes as Int16 and convert to Float32 [-1.0, 1.0]
  const int16Data = new Int16Array(bytes.buffer);
  const buffer = ctx.createBuffer(1, int16Data.length, 24000);
  const channelData = buffer.getChannelData(0);

  for (let i = 0; i < int16Data.length; i++) {
    channelData[i] = int16Data[i] / 32768.0;
  }

  return buffer;
};

// --- Laughter Rater Service ---

const ratingSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    score: { type: Type.INTEGER, description: "A score from 1-100 based on how contagious and energetic the laughter is." },
    feedback: { type: Type.STRING, description: "Fun, encouraging feedback about the laughter." },
    energyLevel: { type: Type.STRING, description: "One word description: Low, Medium, High, Explosive." }
  },
  required: ["score", "feedback", "energyLevel"]
};

export const rateLaughter = async (audioBase64: string, mimeType: string) => {
  if (!apiKey || !ai) {
    throw new Error("MISSING_GEMINI_KEY");
  }

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: {
        parts: [
          {
            inlineData: {
              data: audioBase64,
              mimeType: mimeType
            }
          },
          {
            text: "Listen to this audio. If it is laughter, rate it based on joy, volume, and infectiousness. If it is not laughter, give a score of 0 and tell the user to laugh louder! Be very enthusiastic and fun in your feedback."
          }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: ratingSchema
      }
    });

    const text = response.text;
    if (!text) throw new Error("No response from AI");

    const responseText = typeof text === 'function' ? (text as Function)() : text;
    return JSON.parse(responseText);
  } catch (error) {
    console.error("Error rating laughter:", error);
    throw error;
  }
};

// --- Chat Assistant Service ---

export const getChatResponse = async (history: { role: string, parts: { text: string }[] }[], message: string, language: string = 'en') => {
  if (!apiKey || !ai) {
    throw new Error("MISSING_GEMINI_KEY");
  }

  try {
    const chat = ai.chats.create({
      model: 'gemini-2.5-flash',
      history: history,
      config: {
        systemInstruction: `You are the AI Assistant for Suman Suneja, the Laughter Yoga expert. 
    Your goal is to spread joy, answer questions about Laughter Yoga, corporate sessions, and stress management.
    
    Key Info:
    - Website: sumansuneja.com
    - YouTube: @sumansunejaofficial
    - Daily Zoom: 341 527 2874
    - Contact: Enquiry@sumansuneja.com
    
    Tone: Cheerful, energetic, empathetic.
    Keep answers concise and helpful.
    
    IMPORTANT: Respond in the language associated with this code: "${language}".`
      }
    });

    const result = await chat.sendMessage({ message });
    return result.text;
  } catch (error) {
    console.error("Chat error:", error);
    return "Oops! I laughed too hard and lost my train of thought. Try again!";
  }
};

// --- Translation Service ---

const TRANSLATION_CACHE_KEY = 'laughter_translation_cache';

const getCachedTranslation = (text: string, targetLang: string): string | null => {
  try {
    const cache = JSON.parse(localStorage.getItem(TRANSLATION_CACHE_KEY) || '{}');
    return cache[`${text}_${targetLang}`] || null;
  } catch (e) {
    return null;
  }
};

const setCachedTranslation = (text: string, targetLang: string, translation: string, style: string = 'fun') => {
  try {
    const cache = JSON.parse(localStorage.getItem(TRANSLATION_CACHE_KEY) || '{}');
    const cacheKey = `${text}_${targetLang}_${style}`;
    cache[cacheKey] = translation;
    // Also cache with old key format for backward compatibility if style is 'fun'
    if (style === 'fun') {
      cache[`${text}_${targetLang}`] = translation;
    }
    localStorage.setItem(TRANSLATION_CACHE_KEY, JSON.stringify(cache));
  } catch (e) {
    console.warn('Failed to cache translation', e);
  }
};

export const translateText = async (text: string, targetLang: string, style: 'fun' | 'concise' = 'fun'): Promise<string> => {
  console.log(`[Translation] Request: "${text.substring(0, 20)}..." to ${targetLang} (${style})`);
  if (targetLang === 'en') return text;

  const cacheKey = `${text}_${targetLang}_${style}`;

  const getCached = () => {
    try {
      const cache = JSON.parse(localStorage.getItem(TRANSLATION_CACHE_KEY) || '{}');
      return cache[cacheKey] || (style === 'fun' ? cache[`${text}_${targetLang}`] : null) || null;
    } catch (e) { return null; }
  };

  const cached = getCached();
  if (cached) {
    console.log(`[Translation] Cache hit for ${targetLang}`);
    return cached;
  }

  if (!apiKey || !ai) {
    console.warn("[Translation] Missing API Key or AI instance");
    throw new Error("MISSING_GEMINI_KEY");
  }

  try {
    console.log(`[Translation] Calling Gemini API for ${targetLang}...`);

    let prompt = "";
    if (style === 'concise') {
      prompt = `Translate the following text to ${targetLang}. Be direct and concise. Do not add any extra words, explanations, or laughter. Do NOT use markdown formatting. Return only the plain translated text.\n\nText: "${text}"`;
    } else {
      prompt = `Translate the following text to ${targetLang}. Keep the tone energetic, fun, and conversational. Preserve any laughter sounds like 'Ha ha ha' or 'Ho ho ho'. Do NOT use markdown formatting. Return only plain text.\n\nText: "${text}"`;
    }

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [{
        parts: [{ text: prompt }]
      }]
    });

    const textResponse = response.text;
    let translation = typeof textResponse === 'function' ? (textResponse as Function)() : textResponse;

    // Strip markdown just in case
    if (translation) {
      translation = translation.replace(/\*\*/g, '').replace(/\*/g, '').trim();
    }

    console.log(`[Translation] Success: "${translation?.substring(0, 20)}..."`);

    if (translation) {
      setCachedTranslation(text, targetLang, translation, style);
      return translation;
    }
    return text;
  } catch (error) {
    console.error("[Translation] Error:", error);
    return text; // Fallback to English
  }
};

// --- Laughter Joke Generator ---

export const generateHumor = async (topic: string, type: 'story' | 'joke' = 'story', language: string = 'en') => {
  // Simulate a short delay for UX (optional, but feels more natural than 0ms)
  await new Promise(resolve => setTimeout(resolve, 500));

  const source = type === 'story' ? STORIES : JOKES;
  const randomIndex = Math.floor(Math.random() * source.length);
  const content = source[randomIndex];

  if (language === 'en') return content;

  // Translate the text property of the content object
  // Content should be fun!
  const translatedText = await translateText(content.text, language, 'fun');
  return { ...content, text: translatedText };
}

// --- Speech Generation (TTS) ---

export const generateSpeech = async (text: string, voiceName: string = 'Kore') => {
  if (!apiKey || !ai) {
    throw new Error("MISSING_GEMINI_KEY");
  }

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName }
          },
        },
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!base64Audio) throw new Error("No audio data returned");

    return base64Audio;
  } catch (error) {
    console.error("TTS Error:", error);
    throw error;
  }
};

export const getGuidedSessionScript = async (language: string = 'en') => {
  console.log(`[GuidedSession] Requesting script for language: ${language}`);
  // Return a random 1-minute script
  const randomIndex = Math.floor(Math.random() * QUICK_SCRIPTS.length);
  const script = QUICK_SCRIPTS[randomIndex];

  if (language === 'en') return script;

  // Scripts should be fun!
  const translated = await translateText(script, language, 'fun');
  console.log(`[GuidedSession] Translated script length: ${translated.length}`);
  return translated;
};