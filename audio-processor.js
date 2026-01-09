// This script runs in a separate audio processing thread.

class AudioProcessor extends AudioWorkletProcessor {
    constructor() {
        super();
        // We will receive the target sample rate via a message
        this.targetSampleRate = 16000; 
        this.inputBuffer = [];
    }
    
    // Helper function to resample audio using linear interpolation.
    resample(input, fromSampleRate, toSampleRate) {
        if (fromSampleRate === toSampleRate) {
            return input;
        }
        const ratio = toSampleRate / fromSampleRate;
        const outputLength = Math.round(input.length * ratio);
        const output = new Float32Array(outputLength);
        for (let i = 0; i < outputLength; i++) {
            const before = i / ratio;
            const ceil = Math.ceil(before);
            const floor = Math.floor(before);
            if (ceil >= input.length) {
                output[i] = input[input.length - 1];
                continue;
            }
            const frac = before - floor;
            output[i] = input[floor] * (1 - frac) + input[ceil] * frac;
        }
        return output;
    }

    // Helper function to convert Float32 audio data to 16-bit PCM.
    to16BitPCM(input) {
        const output = new Int16Array(input.length);
        for (let i = 0; i < input.length; i++) {
            const s = Math.max(-1, Math.min(1, input[i]));
            output[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
        }
        return output;
    }

    process(inputs, outputs, parameters) {
        // inputs[0][0] is the Float32Array of audio data from the first channel.
        const inputData = inputs[0][0];

        if (inputData) {
            // Resample and convert the audio data.
            const resampled = this.resample(inputData, sampleRate, this.targetSampleRate);
            const pcmData = this.to16BitPCM(resampled);
            
            // Post the processed data back to the main thread.
            this.port.postMessage(pcmData.buffer, [pcmData.buffer]);
        }

        // Return true to keep the processor alive.
        return true;
    }
}

registerProcessor('audio-processor', AudioProcessor);
