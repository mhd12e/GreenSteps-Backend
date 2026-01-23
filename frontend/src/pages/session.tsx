import { useEffect, useRef, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '@/lib/api';
import { VoiceTokenResponse } from '@/types';
import { Button } from '@/components/ui/button';
import { ArrowLeft, AlertCircle, XCircle } from 'lucide-react';
import { Visualizer } from '@/components/voice/visualizer';
import { GoogleGenAI, Modality } from '@google/genai';

// Helper: Downsample to 16kHz
const downsampleTo16k = (buffer: Float32Array, sampleRate: number): Int16Array => {
    if (sampleRate === 16000) {
        const out = new Int16Array(buffer.length);
        for(let i=0; i<buffer.length; i++) {
             const s = Math.max(-1, Math.min(1, buffer[i]));
             out[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
        }
        return out;
    }
    const ratio = sampleRate / 16000;
    const newLength = Math.round(buffer.length / ratio);
    const result = new Int16Array(newLength);
    for (let i = 0; i < newLength; i++) {
        const idx = Math.floor(i * ratio);
        // Simple nearest neighbor for speed (can be improved)
        const s = Math.max(-1, Math.min(1, buffer[idx]));
        result[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
    }
    return result;
};

// Helper: Base64 encode Int16Array (using standard btoa)
const arrayBufferToBase64 = (buffer: ArrayBuffer) => {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
};

export default function SessionPage() {
  const { impactId, stepId } = useParams<{ impactId: string; stepId: string }>();
  
  const [status, setStatus] = useState<'idle' | 'initializing' | 'connected' | 'error'>('idle');
  const [volume, setVolume] = useState(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
  const sessionRef = useRef<any>(null);
  const animationFrameRef = useRef<number | null>(null);
  const nextStartTimeRef = useRef<number>(0);

  // Initialize Session
  useEffect(() => {
    let cleanup = false;

    const initSession = async () => {
      setStatus('initializing');
      try {
        // 1. Get Token
        const tokenData = await api.post<unknown, VoiceTokenResponse>('/voice/token', { step_id: stepId });
        
        if (cleanup) return;

        // 2. Setup Audio Context
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        const audioCtx = new AudioContextClass({ sampleRate: 24000 }); // Try to prefer 24k output if possible, but input will vary
        audioContextRef.current = audioCtx;
        
        const analyser = audioCtx.createAnalyser();
        analyser.fftSize = 256;
        analyserRef.current = analyser;

        // 3. Connect to GenAI Live API
        const client = new GoogleGenAI({ 
            apiKey: tokenData.token, 
            httpOptions: { apiVersion: 'v1alpha' } 
        });
        const config = { responseModalities: [Modality.AUDIO] };

        const session = await client.live.connect({
            model: tokenData.model,
            config: config,
            callbacks: {
                onopen: () => {
                    console.log('Connected to Gemini Live API');
                    setStatus('connected');
                },
                onmessage: (message: any) => {
                    // Handle incoming audio
                    if (message.serverContent?.modelTurn?.parts) {
                        for (const part of message.serverContent.modelTurn.parts) {
                            if (part.inlineData && part.inlineData.data) {
                                // Decode Base64 -> Int16 PCM (24kHz)
                                const byteCharacters = atob(part.inlineData.data);
                                const byteNumbers = new Array(byteCharacters.length);
                                for (let i = 0; i < byteCharacters.length; i++) {
                                    byteNumbers[i] = byteCharacters.charCodeAt(i);
                                }
                                const byteArray = new Uint8Array(byteNumbers);
                                const int16Data = new Int16Array(byteArray.buffer);

                                // Convert to Float32 for Web Audio
                                const float32Data = new Float32Array(int16Data.length);
                                for(let i=0; i<int16Data.length; i++) {
                                    float32Data[i] = int16Data[i] / 32768.0;
                                }

                                schedulePlayback(float32Data);
                            }
                        }
                    }
                },
                onclose: () => {
                     console.log("Session closed");
                     if (!cleanup) setStatus('idle');
                },
                onerror: (err: any) => {
                    console.error("Session Error", err);
                    setErrorMsg(err.message || "Session error");
                    setStatus('error');
                }
            }
        });
        sessionRef.current = session;

        // 4. Setup Microphone Input
        const stream = await navigator.mediaDevices.getUserMedia({ 
            audio: {
                echoCancellation: true,
                noiseSuppression: true,
                sampleRate: 16000 // Request 16k if possible
            } 
        });

        const micSource = audioCtx.createMediaStreamSource(stream);
        // Connect mic to analyser for visualizer
        micSource.connect(analyser);

        // Processor for 16k conversion and sending
        // Buffer size 4096 gives ~0.08s latency at 48k
        const processor = audioCtx.createScriptProcessor(4096, 1, 1);
        processor.onaudioprocess = (e) => {
            const inputData = e.inputBuffer.getChannelData(0);
            
            // Downsample and convert
            const pcm16 = downsampleTo16k(inputData, e.inputBuffer.sampleRate);
            
            // Base64 encode
            const base64Audio = arrayBufferToBase64(pcm16.buffer as ArrayBuffer);

            // Send to API
            session.sendRealtimeInput({
                audio: {
                    data: base64Audio,
                    mimeType: "audio/pcm;rate=16000"
                }
            });
        };

        micSource.connect(processor);
        processor.connect(audioCtx.destination); 
        scriptProcessorRef.current = processor;

        // Start Volume Loop
        const updateVolume = () => {
            if (analyserRef.current) {
                const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
                analyserRef.current.getByteFrequencyData(dataArray);
                const avg = dataArray.reduce((a, b) => a + b) / dataArray.length;
                setVolume(avg / 128);
            }
            animationFrameRef.current = requestAnimationFrame(updateVolume);
        };
        updateVolume();

      } catch (err: any) {
        console.error("Session Init Failed", err);
        setErrorMsg("Failed to start session. " + err.message);
        setStatus('error');
      }
    };

    if (stepId) {
        initSession();
    }

    return () => {
        cleanup = true;
        if (sessionRef.current) {
             // Try close
             try { sessionRef.current.close(); } catch(e) {}
        }
        if (scriptProcessorRef.current) {
            scriptProcessorRef.current.disconnect();
            scriptProcessorRef.current.onaudioprocess = null;
        }
        if (audioContextRef.current) audioContextRef.current.close();
        if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, [stepId]);

    // Playback Logic
    const schedulePlayback = (float32Data: Float32Array) => {
        if (!audioContextRef.current) return;
        const ctx = audioContextRef.current;

        // Create buffer (24kHz Mono)
        const buffer = ctx.createBuffer(1, float32Data.length, 24000);
        buffer.copyToChannel(float32Data as any, 0);

        const source = ctx.createBufferSource();
        source.buffer = buffer;
        source.connect(ctx.destination);
        // Also connect to analyser for visualizer
        if (analyserRef.current) source.connect(analyserRef.current);

        // Schedule
        const now = ctx.currentTime;
        // If next start time is in the past (gap), reset to now + small buffer
        const startTime = Math.max(now, nextStartTimeRef.current);
        
        source.start(startTime);
        nextStartTimeRef.current = startTime + buffer.duration;
    };


  return (
    <div className="min-h-screen flex flex-col bg-background relative overflow-hidden">
        {/* Background blobs */}
        <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] bg-primary/5 rounded-full blur-3xl -z-10" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] bg-secondary/30 rounded-full blur-3xl -z-10" />

      <header className="p-4 flex items-center justify-between z-10">
        <Button variant="ghost" asChild className="text-muted-foreground">
          <Link to={`/impacts/${impactId}`}><ArrowLeft className="mr-2 h-5 w-5"/> Back</Link>
        </Button>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center p-8 gap-8">
        <div className="text-center space-y-2">
            <h2 className="text-3xl font-extrabold text-foreground">Voice Coach</h2>
            <p className="text-muted-foreground font-medium">
                {status === 'initializing' ? 'Connecting...' : status === 'connected' ? 'Listening...' : 'Disconnected'}
            </p>
        </div>

        {/* Visualizer */}
        <div className="py-10">
            <Visualizer volume={volume} isActive={status === 'connected'} />
        </div>

        {/* Status / Controls */}
        <div className="flex flex-col items-center gap-6">
            {status === 'error' && (
                <div className="flex items-center text-destructive gap-2 bg-destructive/10 px-4 py-2 rounded-lg border border-destructive/20">
                    <AlertCircle className="w-5 h-5" />
                    <span>{errorMsg || "Connection failed"}</span>
                </div>
            )}
            
            <div className="flex flex-col items-center gap-4">
                <Button 
                    variant="destructive"
                    size="lg" 
                    className="rounded-full px-8 py-6 text-lg font-bold shadow-xl shadow-destructive/20 transition-all hover:scale-105 active:scale-95 gap-2"
                    asChild
                >
                    <Link to={`/impacts/${impactId}`}>
                        <XCircle className="w-6 h-6" /> Close Session
                    </Link>
                </Button>
            </div>
        </div>
      </main>
    </div>
  );
}