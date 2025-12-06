import * as ort from 'onnxruntime-web';

// Constants for Silero VAD
const MODEL_PATH = '/silero_vad.onnx';
const SAMPLE_RATE = 16000;
const FRAME_SIZE = 512; // 32ms at 16kHz
const THRESHOLD = 0.5; // Confidence threshold

let session: ort.InferenceSession | null = null;
let h: ort.Tensor | null = null;
let c: ort.Tensor | null = null;
let sr: ort.Tensor | null = null;

export const vadService = {
    init: async () => {
        try {
            if (session) return;

            // Load ONNX model
            session = await ort.InferenceSession.create(MODEL_PATH);

            // Initialize states (h and c are hidden states for the RNN)
            // Shape: [2, 1, 64]
            const zeros = new Float32Array(2 * 1 * 64).fill(0);
            h = new ort.Tensor('float32', zeros, [2, 1, 64]);
            c = new ort.Tensor('float32', zeros, [2, 1, 64]);

            // Sample rate tensor
            sr = new ort.Tensor('int64', new BigInt64Array([BigInt(SAMPLE_RATE)]), [1]);

            console.log("VAD Service Initialized");
        } catch (e) {
            console.error("Failed to initialize VAD:", e);
        }
    },

    reset: () => {
        // Reset hidden states
        const zeros = new Float32Array(2 * 1 * 64).fill(0);
        h = new ort.Tensor('float32', zeros, [2, 1, 64]);
        c = new ort.Tensor('float32', zeros, [2, 1, 64]);
    },

    detect: async (audioData: Float32Array): Promise<boolean> => {
        if (!session || !h || !c || !sr) return false;

        try {
            // Input tensor: [1, FRAME_SIZE]
            // We need to ensure input is exactly FRAME_SIZE. 
            // If larger, we process the first chunk. If smaller, we pad (or ignore).
            // For simplicity in this real-time loop, we assume the processor sends correct chunk sizes 
            // or we take the first 512 samples.

            let input = audioData;
            if (input.length !== FRAME_SIZE) {
                // If buffer is 1024, we might want to run twice, but for speed let's just check the first half
                // or downsample if needed. 
                // Silero expects 16k sample rate.
                if (input.length > FRAME_SIZE) {
                    input = input.slice(0, FRAME_SIZE);
                } else {
                    // Pad with zeros
                    const padded = new Float32Array(FRAME_SIZE);
                    padded.set(input);
                    input = padded;
                }
            }

            const inputTensor = new ort.Tensor('float32', input, [1, FRAME_SIZE]);

            const feeds = {
                input: inputTensor,
                sr: sr,
                h: h,
                c: c,
            };

            const results = await session.run(feeds);

            // Update hidden states for next frame
            h = results.hn;
            c = results.cn;

            // Output is probability (0-1)
            const output = results.output.data[0] as number;

            return output > THRESHOLD;
        } catch (e) {
            console.error("VAD Inference Error:", e);
            return false;
        }
    }
};
