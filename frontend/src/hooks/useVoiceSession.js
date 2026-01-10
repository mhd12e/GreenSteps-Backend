import { useCallback, useEffect, useRef, useState } from "react";

export const useVoiceSession = ({ apiBase, accessToken, stepId }) => {
  const [status, setStatus] = useState("Idle");
  const [isLive, setIsLive] = useState(false);
  const [isBusy, setIsBusy] = useState(false);
  const [micDenied, setMicDenied] = useState(false);

  const wsRef = useRef(null);
  const inputAudioContextRef = useRef(null);
  const audioWorkletNodeRef = useRef(null);
  const mediaStreamRef = useRef(null);
  const outputAudioContextRef = useRef(null);
  const nextPlayTimeRef = useRef(0);

  const playAudio = useCallback((pcmData) => {
    const outputAudioContext = outputAudioContextRef.current;
    if (!outputAudioContext) return;
    const floatData = new Float32Array(pcmData.length);
    for (let i = 0; i < pcmData.length; i += 1) {
      floatData[i] = pcmData[i] / 0x8000;
    }
    const buffer = outputAudioContext.createBuffer(1, floatData.length, 24000);
    buffer.copyToChannel(floatData, 0);
    const source = outputAudioContext.createBufferSource();
    source.buffer = buffer;
    source.connect(outputAudioContext.destination);
    if (nextPlayTimeRef.current < outputAudioContext.currentTime) {
      nextPlayTimeRef.current = outputAudioContext.currentTime + 0.05;
    }
    source.start(nextPlayTimeRef.current);
    nextPlayTimeRef.current += buffer.duration;
  }, []);

  const startAudio = useCallback(async () => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      const hint = window.isSecureContext
        ? "Browser does not support audio capture."
        : "Use HTTPS or localhost to enable microphone access.";
      throw new Error(`Microphone unavailable. ${hint}`);
    }
    const inputAudioContext = new AudioContext({ sampleRate: 16000 });
    const outputAudioContext = new AudioContext({ sampleRate: 24000 });
    inputAudioContextRef.current = inputAudioContext;
    outputAudioContextRef.current = outputAudioContext;
    await inputAudioContext.resume();
    await outputAudioContext.resume();

    const mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    mediaStreamRef.current = mediaStream;
    const mediaStreamSource = inputAudioContext.createMediaStreamSource(mediaStream);

    const workletBlob = new Blob(
      [
        `
        class AudioProcessor extends AudioWorkletProcessor {
          constructor() {
            super();
            this.targetSampleRate = 16000;
          }
          resample(input, fromSampleRate, toSampleRate) {
            const ratio = fromSampleRate / toSampleRate;
            const newLength = Math.round(input.length / ratio);
            const result = new Float32Array(newLength);
            for (let i = 0; i < newLength; i++) {
              const position = i * ratio;
              const left = Math.floor(position);
              const right = Math.min(left + 1, input.length - 1);
              const weight = position - left;
              result[i] = input[left] * (1 - weight) + input[right] * weight;
            }
            return result;
          }
          process(inputs) {
            const input = inputs[0];
            if (!input || !input[0]) return true;
            const samples = input[0];
            const resampled = this.resample(samples, sampleRate, this.targetSampleRate);
            const pcm = new Int16Array(resampled.length);
            for (let i = 0; i < resampled.length; i++) {
              const s = Math.max(-1, Math.min(1, resampled[i]));
              pcm[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
            }
            this.port.postMessage(pcm.buffer, [pcm.buffer]);
            return true;
          }
        }
        registerProcessor("audio-processor", AudioProcessor);
        `
      ],
      { type: "application/javascript" }
    );

    const workletUrl = URL.createObjectURL(workletBlob);
    await inputAudioContext.audioWorklet.addModule(workletUrl);
    const audioWorkletNode = new AudioWorkletNode(inputAudioContext, "audio-processor");
    audioWorkletNodeRef.current = audioWorkletNode;

    audioWorkletNode.port.onmessage = (event) => {
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(event.data);
      }
    };

    mediaStreamSource.connect(audioWorkletNode);
    const muteGain = inputAudioContext.createGain();
    muteGain.gain.value = 0;
    audioWorkletNode.connect(muteGain);
    muteGain.connect(inputAudioContext.destination);
  }, []);

  const stopAudio = useCallback(() => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
    }
    if (inputAudioContextRef.current) {
      inputAudioContextRef.current.close();
    }
    if (outputAudioContextRef.current) {
      outputAudioContextRef.current.close();
    }
    inputAudioContextRef.current = null;
    outputAudioContextRef.current = null;
    audioWorkletNodeRef.current = null;
    mediaStreamRef.current = null;
    nextPlayTimeRef.current = 0;
  }, []);

  const stopSession = useCallback(
    (silent = false) => {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      stopAudio();
      if (!silent) {
        setStatus("Session stopped.");
        setIsLive(false);
      }
    },
    [stopAudio]
  );

  const startSession = useCallback(async () => {
    if (!accessToken) {
      setStatus("Login first to start a voice session.");
      return;
    }
    if (!apiBase) {
      setStatus("Set the API base before starting a session.");
      return;
    }
    setIsBusy(true);
    setStatus("Connecting...");

    try {
      setMicDenied(false);
      const wsUrl = apiBase.replace("https://", "wss://").replace("http://", "ws://");
      const ws = new WebSocket(`${wsUrl}/voice/stream/${stepId}?token=${accessToken}`);
      ws.binaryType = "arraybuffer";
      wsRef.current = ws;

      ws.onopen = async () => {
        try {
          await startAudio();
          setStatus("Live session started. Speak clearly into your mic.");
          setIsLive(true);
        } catch (error) {
          if (error?.name === "NotAllowedError" || error?.name === "PermissionDeniedError") {
            setMicDenied(true);
            setStatus("Microphone access is required to start a session.");
          } else {
            setStatus(`Voice error: ${error.message}`);
          }
          ws.close();
        } finally {
          setIsBusy(false);
        }
      };

      ws.onmessage = (event) => {
        const pcmData = new Int16Array(event.data);
        playAudio(pcmData);
      };

      ws.onclose = () => {
        setStatus("Session closed.");
        setIsLive(false);
        setIsBusy(false);
        stopAudio();
      };
    } catch (error) {
      setStatus(`Voice error: ${error.message}`);
      setIsBusy(false);
    }
  }, [accessToken, apiBase, playAudio, startAudio, stepId, stopAudio]);

  useEffect(() => {
    return () => {
      stopSession(true);
    };
  }, [stopSession]);

  return {
    status,
    isLive,
    isBusy,
    micDenied,
    clearMicDenied: () => setMicDenied(false),
    startSession,
    stopSession
  };
};
