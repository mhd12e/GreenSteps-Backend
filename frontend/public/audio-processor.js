class AudioProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.port.onmessage = (event) => {
      // Handle messages from main thread if needed
    };
  }

  process(inputs, outputs, parameters) {
    const input = inputs[0];
    if (input.length > 0) {
      const inputChannel = input[0]; // Mono input
      
      // 1. Downsample from input sample rate to 16kHz
      // The browser's input sample rate is available via sampleRate global in Worklet
      const processedData = this.downsample(inputChannel, sampleRate, 16000);
      
      // 2. Convert to Int16 PCM
      const pcm16 = this.floatTo16BitPCM(processedData);
      
      // 3. Send back to main thread
      this.port.postMessage(pcm16.buffer, [pcm16.buffer]);
    }
    return true;
  }

  downsample(buffer, fromRate, toRate) {
    if (fromRate === toRate) return buffer;
    const ratio = fromRate / toRate;
    const newLength = Math.round(buffer.length / ratio);
    const result = new Float32Array(newLength);
    for (let i = 0; i < newLength; i++) {
      result[i] = buffer[Math.floor(i * ratio)];
    }
    return result;
  }

  floatTo16BitPCM(float32Array) {
    const buffer = new Int16Array(float32Array.length);
    for (let i = 0; i < float32Array.length; i++) {
      const s = Math.max(-1, Math.min(1, float32Array[i]));
      buffer[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
    }
    return buffer;
  }
}

registerProcessor('audio-processor', AudioProcessor);
