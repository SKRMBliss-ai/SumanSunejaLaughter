import React, { useState, useRef, useEffect } from 'react';
import { Mic, Square, Loader2, Play, Volume2, Send, MessageSquare, Sparkles } from 'lucide-react';
import { processVoiceQuery, base64ToUint8Array, getChatResponse, generateSpeech } from '../services/geminiService';

// Helper to create WAV header for raw PCM data
function createWavBlob(pcmData: Uint8Array, sampleRate: number = 24000): Blob {
    const numChannels = 1;
    const bitsPerSample = 16;
    const byteRate = sampleRate * numChannels * bitsPerSample / 8;
    const blockAlign = numChannels * bitsPerSample / 8;
    const dataSize = pcmData.length;
    const headerSize = 44;
    const totalSize = headerSize + dataSize;

    const buffer = new ArrayBuffer(totalSize);
    const view = new DataView(buffer);

    // RIFF chunk
    writeString(view, 0, 'RIFF');
    view.setUint32(4, totalSize - 8, true);
    writeString(view, 8, 'WAVE');

    // fmt chunk
    writeString(view, 12, 'fmt ');
    view.setUint32(16, 16, true); // Subchunk1Size (16 for PCM)
    view.setUint16(20, 1, true); // AudioFormat (1 for PCM)
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, byteRate, true);
    view.setUint16(32, blockAlign, true);
    view.setUint16(34, bitsPerSample, true);

    // data chunk
    writeString(view, 36, 'data');
    view.setUint32(40, dataSize, true);

    // Write PCM data
    const pcmBytes = new Uint8Array(buffer, 44);
    pcmBytes.set(pcmData);

    return new Blob([buffer], { type: 'audio/wav' });
}

function writeString(view: DataView, offset: number, string: string) {
    for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
    }
}

const QUICK_OPTIONS = [
    "Tell me a joke 😂",
    "How do I laugh? 🤔",
    "Boost my mood 🚀",
    "What is Laughter Yoga? 🧘‍♀️"
];

export const VoiceChatWidget: React.FC<{ onClose?: () => void }> = ({ onClose }) => {
    const [isRecording, setIsRecording] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [audioUrl, setAudioUrl] = useState<string | null>(null);
    const [replyText, setReplyText] = useState<string | null>(null);
    const [inputText, setInputText] = useState('');
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const chunksRef = useRef<Blob[]>([]);
    const audioRef = useRef<HTMLAudioElement>(null);

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const mediaRecorder = new MediaRecorder(stream);
            mediaRecorderRef.current = mediaRecorder;
            chunksRef.current = [];

            mediaRecorder.ondataavailable = (e) => {
                if (e.data.size > 0) chunksRef.current.push(e.data);
            };

            mediaRecorder.start();
            setIsRecording(true);
            setAudioUrl(null);
            setReplyText(null);
        } catch (err) {
            console.error("Error accessing mic:", err);
            alert("Could not access microphone");
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
            setIsProcessing(true);

            mediaRecorderRef.current.onstop = async () => {
                const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
                const reader = new FileReader();
                reader.readAsDataURL(blob);
                reader.onloadend = async () => {
                    try {
                        const base64String = (reader.result as string).split(',')[1];
                        const result = await processVoiceQuery(base64String, 'audio/webm');

                        setReplyText(result.text);
                        playAudioResponse(result.audio);

                    } catch (e) {
                        console.error(e);
                        alert("Error processing voice query");
                    } finally {
                        setIsProcessing(false);
                    }
                };

                // Stop all tracks
                mediaRecorderRef.current?.stream.getTracks().forEach(track => track.stop());
            };
        }
    };

    const handleTextQuery = async (text: string) => {
        if (!text.trim()) return;

        console.log("handleTextQuery started with:", text);
        setIsProcessing(true);
        setReplyText(null);
        setAudioUrl(null);
        setInputText(''); // Clear input if it was typed

        try {
            // 1. Get Text Response
            console.log("Calling getChatResponse...");
            const responseText = await getChatResponse([], text);
            console.log("getChatResponse result:", responseText);
            setReplyText(responseText);

            // 2. Generate Audio
            console.log("Calling generateSpeech...");
            const audioBase64 = await generateSpeech(responseText, 'Kore');
            console.log("generateSpeech result (length):", audioBase64 ? audioBase64.length : 'null');
            playAudioResponse(audioBase64);

        } catch (e) {
            console.error("Text query error:", e);
            setReplyText("Oops! I couldn't think of a response. Try again!");
        } finally {
            setIsProcessing(false);
        }
    };

    const playAudioResponse = (base64Audio: string) => {
        const pcmData = base64ToUint8Array(base64Audio);
        const wavBlob = createWavBlob(pcmData, 24000);
        const url = URL.createObjectURL(wavBlob);
        setAudioUrl(url);
    };

    return (
        <div className="bg-white dark:bg-slate-800 p-6 rounded-[2rem] shadow-2xl border-2 border-[#ABCEC9] dark:border-slate-700 w-full max-w-md mx-auto relative animate-in fade-in zoom-in duration-300">
            {onClose && (
                <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                    <Square size={18} className="rotate-45" fill="currentColor" />
                </button>
            )}

            <h3 className="text-xl font-fredoka font-bold text-gray-800 dark:text-gray-100 mb-4 flex items-center gap-2">
                <Sparkles className="text-[#ABCEC9] fill-current" size={24} />
                Chat with Suman AI
            </h3>

            {/* Response Area */}
            <div className="min-h-[100px] mb-6 flex flex-col items-center justify-center text-center">
                {isProcessing ? (
                    <div className="flex flex-col items-center gap-2">
                        <Loader2 className="animate-spin text-[#ABCEC9]" size={32} />
                        <span className="text-sm font-bold text-gray-400 animate-pulse">Thinking...</span>
                    </div>
                ) : replyText ? (
                    <div className="animate-pop-in w-full">
                        <div className="bg-[#F5F3FA] dark:bg-slate-700 p-4 rounded-2xl text-sm font-medium text-gray-700 dark:text-gray-200 leading-relaxed border border-[#ABCEC9]/30 shadow-inner">
                            "{replyText}"
                        </div>
                        {audioUrl && (
                            <audio ref={audioRef} controls src={audioUrl} className="w-full mt-3 h-8 opacity-80 hover:opacity-100 transition-opacity" autoPlay />
                        )}
                    </div>
                ) : (
                    <div className="text-gray-400 text-sm italic">
                        Ask me anything about laughter, joy, or stress relief!
                    </div>
                )}
            </div>

            {/* Quick Options */}
            <div className="flex flex-wrap gap-2 justify-center mb-6">
                {QUICK_OPTIONS.map((option, idx) => (
                    <button
                        key={idx}
                        onClick={() => handleTextQuery(option)}
                        disabled={isProcessing || isRecording}
                        className="text-xs font-bold bg-white dark:bg-slate-700 border border-gray-200 dark:border-slate-600 text-gray-600 dark:text-gray-300 px-3 py-2 rounded-full hover:bg-[#ABCEC9] hover:text-white hover:border-[#ABCEC9] transition-all active:scale-95 disabled:opacity-50"
                    >
                        {option}
                    </button>
                ))}
            </div>

            {/* Input Area */}
            <div className="flex items-center gap-2 bg-gray-50 dark:bg-slate-900 p-2 rounded-full border border-gray-200 dark:border-slate-700 focus-within:ring-2 focus-within:ring-[#ABCEC9] transition-all">
                <input
                    type="text"
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleTextQuery(inputText)}
                    placeholder="Type a message..."
                    disabled={isProcessing || isRecording}
                    className="flex-1 bg-transparent border-none focus:ring-0 text-sm font-medium text-gray-700 dark:text-white px-3 outline-none disabled:opacity-50"
                />

                {inputText.trim() ? (
                    <button
                        onClick={() => handleTextQuery(inputText)}
                        disabled={isProcessing}
                        className="bg-[#ABCEC9] hover:bg-[#9BBDB8] text-white p-2 rounded-full transition-transform active:scale-95 disabled:opacity-50"
                    >
                        <Send size={18} />
                    </button>
                ) : (
                    <button
                        onClick={isRecording ? stopRecording : startRecording}
                        disabled={isProcessing}
                        className={`p-2 rounded-full transition-all active:scale-95 shadow-sm ${isRecording ? 'bg-red-500 text-white animate-pulse' : 'bg-white dark:bg-slate-700 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-600'}`}
                    >
                        {isRecording ? <Square size={18} fill="currentColor" /> : <Mic size={18} />}
                    </button>
                )}
            </div>
        </div>
    );
};
