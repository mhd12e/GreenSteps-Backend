import { useEffect, useRef, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '@/lib/api';
import { VoiceTokenResponse } from '@/types';
import { Button } from '@/components/ui/button';
import { ArrowLeft, AlertCircle, XCircle } from 'lucide-react';
import { Visualizer } from '@/components/voice/visualizer';
import { GoogleGenAI, Modality } from '@google/genai';
import { Turnstile } from '@marsidev/react-turnstile';
import { TURNSTILE_SITE_KEY_AI } from '@/lib/config';

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
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);

  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
  const sessionRef = useRef<any>(null);
  const animationFrameRef = useRef<number | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  const aiSpeakingFirstRef = useRef<boolean>(true);
  const micStreamRef = useRef<MediaStream | null>(null);

  // Initialize Session
  useEffect(() => {
    let cleanup = false;

    const initSession = async () => {
      if (!captchaToken) return;
      
      setStatus('initializing');
      try {
        // 1. Get Token
        const tokenData = await api.post<unknown, VoiceTokenResponse>('/impact/voice/token', { 
            step_id: stepId,
            turnstile_token: captchaToken
        });
        
        if (cleanup) return;

        // 2. Setup Audio Context
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        const audioCtx = new AudioContextClass(); // Use system default sample rate
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
                    // Check if AI turn is complete to unblock mic
                    if (message.serverContent?.turnComplete) {
                        aiSpeakingFirstRef.current = false;
                    }

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

        // Ask AI to greet first (moved here to avoid TDZ in onopen)
        (session as any).sendClientContent({
            turns: [{ parts: [{ text: "Start the conversation: greet me briefly, then ask what I need." }] }],
            turnComplete: true
        });

        // 4. Setup Microphone Input
        const stream = await navigator.mediaDevices.getUserMedia({ 
            audio: {
                echoCancellation: true,
                noiseSuppression: true,
                sampleRate: 16000 // Request 16k if possible
            } 
        });
        micStreamRef.current = stream;

        const micSource = audioCtx.createMediaStreamSource(stream);
        // Connect mic to analyser for visualizer
        micSource.connect(analyser);

        // Processor for 16k conversion and sending
        // Buffer size 4096 gives ~0.08s latency at 48k
        const processor = audioCtx.createScriptProcessor(4096, 1, 1);
        processor.onaudioprocess = (e) => {
            // Block mic if AI hasn't finished greeting
            if (aiSpeakingFirstRef.current) return;

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

    if (stepId && captchaToken) {
        initSession();
    }

    return () => {
        cleanup = true;
        if (sessionRef.current) {
             // Try close
             try { sessionRef.current.close(); } catch(e) {}
        }
        if (micStreamRef.current) {
            micStreamRef.current.getTracks().forEach(track => track.stop());
            micStreamRef.current = null;
        }
        if (scriptProcessorRef.current) {
            scriptProcessorRef.current.disconnect();
            scriptProcessorRef.current.onaudioprocess = null;
        }
        if (audioContextRef.current) audioContextRef.current.close();
        if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, [stepId, captchaToken]);

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
        <div className="hidden">
            <Turnstile 
                siteKey={TURNSTILE_SITE_KEY_AI}
                onSuccess={(token) => setCaptchaToken(token)}
            />
        </div>


        <header className="p-4 flex items-center justify-between z-10">


          <Button variant="ghost" asChild className="text-muted-foreground hover:text-foreground transition-colors">


            <Link to={`/impacts/${impactId}`}><ArrowLeft className="mr-2 h-5 w-5"/> Back</Link>


          </Button>


        </header>


  


        <main className="flex-1 flex flex-col items-center justify-center p-8 gap-12">


          <div className="text-center space-y-2">


              <h2 className="text-4xl font-bold text-foreground tracking-tight">Voice Coach</h2>


              <p className="text-lg text-muted-foreground font-medium">


                  {status === 'initializing' ? 'Connecting to AI...' : status === 'connected' ? 'Listening...' : 'Disconnected'}


              </p>


          </div>


  


          {/* Visualizer */}


          <div className="relative">


              <div className="relative z-10">


                  <Visualizer volume={volume} isActive={status === 'connected'} />


              </div>


          </div>


  


          {/* Status / Controls */}


          <div className="flex flex-col items-center gap-6 w-full max-w-sm">


              {status === 'error' && (


                  <div className="flex items-center text-destructive gap-3 bg-destructive/10 px-6 py-3 rounded-xl border border-destructive/20 shadow-sm w-full justify-center">


                      <AlertCircle className="w-5 h-5 flex-shrink-0" />


                      <span className="font-medium">{errorMsg || "Connection failed"}</span>


                  </div>


              )}


              


              <div className="flex flex-col items-center gap-4 w-full">


                  <Button 
                      variant="outline"
                      size="lg" 
                      className="w-full rounded-full px-8 py-8 text-xl font-bold shadow-md hover:shadow-lg transition-all hover:scale-105 active:scale-95 gap-3 bg-white text-foreground border border-border hover:bg-muted"
                      asChild
                  >


                      <Link to={`/impacts/${impactId}`}>


                          <XCircle className="w-6 h-6" /> End Session


                      </Link>


                  </Button>


              </div>


          </div>


        </main>


      </div>


    );


  }


  