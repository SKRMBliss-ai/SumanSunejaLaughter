export const audioService = {
    playLocalGreeting: (text: string) => {
        if ('speechSynthesis' in window) {
            window.speechSynthesis.cancel();
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.rate = 1.0;
            utterance.lang = 'en-US';
            const voices = window.speechSynthesis.getVoices();
            const femaleVoice = voices.find(v => (v.lang === 'en-US' && (v.name.includes('Female') || v.name.includes('Google') || v.name.includes('Zira'))));
            if (femaleVoice) utterance.voice = femaleVoice;
            window.speechSynthesis.speak(utterance);
        }
    },

    stopLocalAudio: () => {
        if ('speechSynthesis' in window) {
            window.speechSynthesis.cancel();
        }
    },

    createAudioContext: (sampleRate: number = 24000) => {
        return new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate });
    },

    getMicrophoneStream: async () => {
        return await navigator.mediaDevices.getUserMedia({
            audio: {
                echoCancellation: true,
                noiseSuppression: true,
                autoGainControl: true
            }
        });
    }
};
