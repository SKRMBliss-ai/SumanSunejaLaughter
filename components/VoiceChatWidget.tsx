import React, { useState, useRef } from 'react';
import { Mic, Square, Loader2, Play, Volume2 } from 'lucide-react';
import { processVoiceQuery, base64ToUint8Array } from '../services/geminiService';

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

export const VoiceChatWidget: React.FC = () => {
    const [isRecording, setIsRecording] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [audioUrl, setAudioUrl] = useState<string | null>(null);
    const [replyText, setReplyText] = useState<string | null>(null);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const chunksRef = useRef<Blob[]>([]);

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

                        // Convert base64 PCM to WAV Blob
                        const pcmData = base64ToUint8Array(result.audio);
                        const wavBlob = createWavBlob(pcmData, 24000); // Gemini TTS is 24kHz
                        const url = URL.createObjectURL(wavBlob);

                        setAudioUrl(url);
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

    return (
        <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl shadow-xl border-2 border-[#ABCEC9] dark:border-slate-700 w-full max-w-sm mx-auto">
            <h3 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-4 flex items-center gap-2">
                <Volume2 className="text-[#ABCEC9]" /> Voice Chat
            </h3>

            <div className="flex gap-4 justify-center mb-6">
                {!isRecording ? (
                    <button
                        onClick={startRecording}
                        disabled={isProcessing}
                        className="bg-[#ABCEC9] hover:bg-[#9BBDB8] text-white p-4 rounded-full shadow-lg transition-transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <Mic size={24} />
                    </button>
                ) : (
                    <button
                        onClick={stopRecording}
                        className="bg-red-400 hover:bg-red-500 text-white p-4 rounded-full shadow-lg transition-transform active:scale-95 animate-pulse"
                    >
                        <Square size={24} fill="currentColor" />
                    </button>
                )}
            </div>

            {isProcessing && (
                <div className="flex flex-col items-center gap-2 mb-4">
                    <Loader2 className="animate-spin text-[#ABCEC9]" size={32} />
                    <span className="text-sm text-gray-500 dark:text-gray-400">Thinking...</span>
                </div>
            )}

            {replyText && (
                <div className="bg-gray-50 dark:bg-slate-700 p-4 rounded-xl mb-4 text-sm text-gray-700 dark:text-gray-200 italic border border-gray-100 dark:border-slate-600">
                    "{replyText}"
                </div>
            )}

            {audioUrl && (
                <div className="flex justify-center">
                    <audio id="reply" controls src={audioUrl} className="w-full h-10" autoPlay />
                </div>
            )}
        </div>
    );
};
