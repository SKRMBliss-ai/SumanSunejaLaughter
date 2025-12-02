import { GoogleGenAI, Type, Schema, Modality } from "@google/genai";

const apiKey = process.env.API_KEY || '';
const ai = apiKey ? new GoogleGenAI({ apiKey }) : null;

// --- SMART MODEL LOAD BALANCING ---
const MODELS = {
  // High Quota (2000+ RPM) - Use for all text & understanding tasks
  TEXT_GEN: 'gemini-2.5-flash',
  AUDIO_ANALYSIS: 'gemini-2.5-flash',

  // Speech Generation Models (Lower Quotas)
  TTS_PRIMARY: 'gemini-2.0-flash-exp',    // Best emotion
  TTS_SECONDARY: 'gemini-2.5-flash-tts',  // High quality backup
};

const QUICK_SCRIPTS = [
  "Hello wonderful soul! Suman Suneja here. Let's energize your day in just one minute! Start by clapping your hands. 1, 2, 1-2-3! Ho, ho, Ha-ha-ha! Ho, ho, Ha-ha-ha! Feel the rhythm waking up your body. Now, take a deep breath in... hold it... and release with a giant laugh! HAAAA-ha-ha-ha! Imagine you are a mobile phone on silent mode—shake your body and giggle silently. T-h-h-h-h. Now, full volume! Bwahahaha! Raise your arms to the sky, catch the joy, and pull it into your heart. Say with me: I am Happy! I am Healthy! I am Laughter! Yes, yes, YES! Have a sparkling day!",
  "Namaste! It's time for your Laughter Cocktail! Imagine you are holding two glasses. Pour the joy from one to the other. Aeee! Aeee! And drink it back! Ha ha ha ha! Let's do it again. Aeee! Aeee! Hahahaha! Now, let's do the Lion Laugh. Eyes wide open, tongue out, hands like claws. Take a deep breath and ROAR with laughter! Bwaaah ha ha ha! Feel the stress leaving your body. Shake your hands, shake your legs, and just laugh for no reason. He he he, Ho ho ho! You are doing amazing! One last big smile! Very good, very good, YAY!",
  "Welcome to your one-minute stress buster! Let's start with a deep breath. Inhale peace... exhale worry with a sigh. Aaaah. Now, let's start the engine of joy. Put your hand on your heart and chuckle softly. He he he. Now move it to your belly. Ho ho ho. Now let it explode! Ha ha ha ha! Imagine you just heard the funniest joke in the world. Point your finger and laugh! Bwahahaha! Now, pat your own back and say 'Well done, me!' Ha ha ha. Laughter is the best medicine. Keep smiling and keep shining!",
  "Ready for a joy boost? Let's do the Milkshake Laugh! Hold your imaginary glass. Shake it up: Ho ho! Shake it down: Ha ha! And drink! Hahahaha! Delicious! Now, let's do the Argument Laugh. Point your finger at me and laugh, and I will laugh at you! Wa ha ha ha! No words, just laughter. Hee hee hee! Now, open your arms wide like you are hugging the whole world. Deep breath in... and laugh it out! Ha ha ha ha! Feel the vibration in every cell of your body. You are pure energy! Yes, yes, YAY!",
  "Let's wipe away the stress! Imagine you have a laughter sponge. Wipe your forehead—he he he. Wipe your shoulders—ha ha ha. Wipe your chest—ho ho ho. Throw the sponge away and just laugh! Bwahahaha! Now, let's do the Gradient Laugh. Start with a smile... then a giggle... then a chuckle... and finally a loud belly laugh! Smile. He he. Ha ha. BWAHAHAHA! Let it flow! Don't hold back! Your joy is contagious. Take this energy with you for the rest of the day. Very good, very good, YAY!",
  "Hello Laughter Champion! Let's try the 'Mobile Phone Laugh'. Hold your hand like a phone. Imagine you just read the funniest text message ever! Point at the screen and giggle. He he he! Now show it to a friend and laugh together! Bwahahaha! Now, let's do the 'Aloha Laugh'. Wave your hands in the air like you are in Hawaii. Say Aloooha-ha-ha-ha! Feel the breeze of joy. Take a deep breath, stretch up, and let out a rain of laughter. Hahahaha! You are connected to the network of joy! 5 bars of signal! Yes, yes, YAY!",
  "Namaste! Let's pay the 'Laughter Bill'. Imagine you are opening a credit card bill. It's huge! But instead of worrying, we laugh! Ha ha ha! Throw the bill in the air! Ho ho ho! Now, let's do the 'Zipper Laugh'. Zip your mouth shut. Mmmm... mmmm... The laughter is building up inside... bursting... and UNZIP! BWAHAHAHA! Let it explode! One more time. Zip... Mmmm... Unzip! HAHAHA! You are debt-free in the bank of happiness! Very good, very good, YAY!",
  "Ready to cook up some joy? Let's make 'Hot Soup Laughter'. Hold a bowl of hot soup. Take a sip. Ouch, it's hot! A-ha-ha-ha! Fan your tongue! He-he-he! Try again. Sip... Hot! Ho-ho-ho! Now, let's do the 'Electric Shock Laugh'. Imagine your hands are full of joy electricity. Shake hands with yourself or the air. Zzzzt-Ha! Zzzzt-Ho! Zzzzt-Hahaha! You are electrified with positivity! Shake it all out! You are glowing! Keep shining!",
  "Let's measure our joy with the 'One Meter Laugh'. Hold your hands close. Move one hand away in steps. Ae... Aee... Aeee... And stretch wide: Hahahaha! Let's measure again. Ae... Aee... Aeee... HAHAHA! Now, let's do the 'Vowel Laugh'. Hands up for 'A': Aaaaa-ha-ha! Hands to chest for 'E': Eeeee-he-he! Hands to tummy for 'I': Iiiii-hi-hi! Hands to belly for 'O': Ooooo-ho-ho! Hands to knees for 'U': Uuuuu-hu-hu! You are speaking the universal language of happiness! Yes, yes, YAY!",
  "Welcome! Let's practice the 'Forgiveness Laugh'. Think of something small that annoyed you today. Hold it in your hand. Now, laugh at it! Ha ha ha! Throw it over your shoulder! Ho ho ho! It's gone! Now, place both hands on your heart. Feel the beat. Close your eyes. Smile gently. Now let a soft hum turn into a deep belly laugh. Hmm... he... ha... HAHAHAHA! Send this love to the whole world. You are a lighthouse of joy. Very good, very good, YAY!"
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

// Use gemini-2.5-flash for Analysis (Huge Quota!)
export const rateLaughter = async (audioBase64: string, mimeType: string) => {

  if (!apiKey || !ai) throw new Error("MISSING_GEMINI_KEY");

  try {
    const response = await ai.models.generateContent({
      model: MODELS.AUDIO_ANALYSIS,
      contents: {
        parts: [
          { inlineData: { data: audioBase64, mimeType: mimeType } },
          { text: "Listen to this audio. If it is laughter, rate it based on joy, volume, and infectiousness. If it is not laughter, give a score of 0. Be very enthusiastic in feedback." }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: ratingSchema
      }
    });

    let text = response.text;
    if (!text) throw new Error("No response from AI");
    text = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    return JSON.parse(text);
  } catch (error) {
    console.error("Error rating laughter:", error);
    throw error;
  }
};

// --- Chat Assistant Service ---
// Use gemini-2.5-flash for Chat (Fast & Cheap)
export const getChatResponse = async (history: { role: string, parts: { text: string }[] }[], message: string) => {

  if (!apiKey || !ai) throw new Error("MISSING_GEMINI_KEY");
  try {
    const chat = ai.chats.create({
      model: MODELS.TEXT_GEN,
      history: history,
      config: {
        systemInstruction: `You are the AI Assistant for Suman Suneja, the Laughter Yoga expert. 
        Your goal is to spread joy, answer questions about Laughter Yoga, corporate sessions, and stress management.
        
        STRICT BOUNDARIES:
        - Do NOT answer general knowledge questions (weather, news, geography, math, etc.).
        - If asked, playfully deflect: "I don't know about that, but I know how to laugh!"
        
        Key Info:
        - Website: sumansuneja.com
        - YouTube: @sumansunejaofficial
        - Daily Zoom: 341 527 2874
        - Contact: Enquiry@sumansuneja.com
        
        Tone: Cheerful, energetic, empathetic.
        Keep answers concise and helpful.`
      }
    });

    const result = await chat.sendMessage({ message });
    return result.text;
  } catch (error) {
    console.error("Chat error:", error);
    return "Oops! I laughed too hard and lost my train of thought. Try again!";
  }
};

// --- Laughter Joke Generator ---
// Use gemini-2.5-flash for Text Generation
export const generateHumor = async (topic: string, type: 'story' | 'joke' = 'story') => {
  const ai = getAI();
  if (!ai) throw new Error("MISSING_GEMINI_KEY");

  const prompt = type === 'story'
    ? `Write a very short, high-energy comedy monologue about "${topic}"... [Instructions]`
    : `Write one hilarious one-liner joke about "${topic}"... [Instructions]`;

  try {
    const response = await ai.models.generateContent({
      model: MODELS.TEXT_GEN,
      contents: prompt,
    });
    return response.text;
  } catch (error) {
    throw error;
  }
}

// --- Smart Speech Generation (TTS) with Failover ---
export const generateSpeech = async (text: string, voiceName: string = 'Kore') => {
  const ai = getAI();
  if (!ai) {
    throw new Error("MISSING_GEMINI_KEY");
  }

  // Helper to try a specific model
  const tryModel = async (modelName: string) => {
    try {
      const response = await ai.models.generateContent({
        model: modelName,
        contents: [{ parts: [{ text }] }],
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName } },
          },
        },
      });
      return response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    } catch (e) {
      console.warn(`TTS Model ${modelName} failed/limited:`, e);
      return null;
    }
  };

  // 1. Try Primary (Best Quality)
  let audioData = await tryModel(MODELS.TTS_PRIMARY);

  // 2. If failed, Try Secondary (Backup)
  if (!audioData) {
    console.log("Primary TTS failed, switching to gemini-2.5-flash-tts...");
    audioData = await tryModel(MODELS.TTS_SECONDARY);
  }

  // 3. If still null, throw Error so UI can fallback to Browser TTS
  if (!audioData) throw new Error("ALL_AI_TTS_FAILED");

  return audioData;
};

export const getGuidedSessionScript = async () => {
  const randomIndex = Math.floor(Math.random() * QUICK_SCRIPTS.length);
  return QUICK_SCRIPTS[randomIndex];
}

// --- Voice Chat Query ---
export const processVoiceQuery = async (audioBase64: string, mimeType: string) => {
  const ai = getAI();
  if (!ai) throw new Error("MISSING_GEMINI_KEY");

  try {
    // 1. Audio -> Text (Using 2.5 Flash for understanding)
    const response = await ai.models.generateContent({
      model: MODELS.AUDIO_ANALYSIS,
      contents: {
        parts: [
          { inlineData: { data: audioBase64, mimeType: mimeType } },
          { text: "You are Suman Suneja... Reply cheerfully in 2 sentences." }
        ]
      }
    });

    const replyText = response.text;
    if (!replyText) throw new Error("No response text");

    // 2. Text -> Audio (Using Smart TTS)
    const audioData = await generateSpeech(replyText, 'Kore');

    return { text: replyText, audio: audioData };
  } catch (error) {
    console.error("Voice Query Error:", error);
    throw error;
  }
};