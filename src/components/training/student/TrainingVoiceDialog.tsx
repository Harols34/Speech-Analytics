import React, { useState, useRef, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Mic, 
  MicOff, 
  Square, 
  Lightbulb, 
  Star,
  Clock,
  User,
  Bot,
  Phone,
  PhoneOff
} from 'lucide-react';
import { TrainingScenario } from '@/lib/types/training';
import { useTrainingSession } from '@/hooks/useTrainingSession';
import { useGlobalVoice } from '@/hooks/useGlobalVoice';
import { useTrainingVoices } from '@/hooks/useTrainingVoices';
import { TrainingFeedback } from './TrainingFeedback';
import { useVoiceTrainingLimit, showVoiceTrainingLimitMessage } from '@/hooks/useAccountLimits';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface TrainingVoiceDialogProps {
  scenario: TrainingScenario;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onTrainingCompleted?: () => void;
}

export function TrainingVoiceDialog({ scenario, open, onOpenChange, onTrainingCompleted }: TrainingVoiceDialogProps) {
  const [isMuted, setIsMuted] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const [waitingForAnalysis, setWaitingForAnalysis] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const { globalVoice, ttsModel } = useGlobalVoice();
  const { generateTrainingAudio } = useTrainingVoices();
  const recognitionRef = useRef<any>(null);
  const pausedByTTSRef = useRef<boolean>(false);
  const lastPlayedIdRef = useRef<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const isRecActiveRef = useRef<boolean>(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  
  const {
    messages,
    isLoading,
    currentScore,
    sessionActive,
    suggestions,
    startSession,
    sendMessage,
    endSession,
    resetSession,
    sessionId,
  } = useTrainingSession(scenario, 'voice');

  // Limits: Voice minutes (training)
  const { data: voiceLimit } = useVoiceTrainingLimit();
  const isVoiceBlocked = !!voiceLimit?.limite_alcanzado;

  // Funciones para grabación completa de sesión
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });
      const mediaRecorder = new MediaRecorder(stream, { 
        mimeType: 'audio/webm;codecs=opus' 
      });
      
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.start(1000); // Capturar cada segundo
      console.log('🎙️ Grabación de sesión iniciada');
    } catch (error) {
      console.error('Error al iniciar grabación:', error);
      toast.error('No se pudo iniciar la grabación');
    }
  };

  const stopRecording = async (): Promise<Blob | null> => {
    return new Promise((resolve) => {
      if (!mediaRecorderRef.current || mediaRecorderRef.current.state === 'inactive') {
        resolve(null);
        return;
      }

      mediaRecorderRef.current.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        console.log('🎙️ Grabación detenida, tamaño:', audioBlob.size);
        resolve(audioBlob);
      };

      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
    });
  };

  const saveRecording = async (audioBlob: Blob, sessionId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.error('❌ No user authenticated');
        return;
      }

      const fileName = `${user.id}/${sessionId}.webm`;
      
      console.log('📤 Uploading recording:', { fileName, size: audioBlob.size });
      
      const { error: uploadError } = await supabase.storage
        .from('training-recordings')
        .upload(fileName, audioBlob, {
          contentType: 'audio/webm',
          upsert: true
        });

      if (uploadError) {
        console.error('❌ Upload error:', uploadError);
        throw uploadError;
      }

      const recordingPath = fileName; // Guardamos la ruta del objeto privado

      // Verificar sesión y propiedad antes de actualizar
      const { data: sessRow, error: sessFetchErr } = await supabase
        .from('training_sessions')
        .select('id,user_id')
        .eq('id', sessionId)
        .single();

      if (sessFetchErr) {
        console.error('❌ Session fetch error:', sessFetchErr);
        throw sessFetchErr;
      }
      if (!sessRow || sessRow.user_id !== user.id) {
        console.warn('⚠️ Session not found or not owned by current user; skipping recording update.', { sessionId, owner: sessRow?.user_id, currentUser: user.id });
      } else {
        const { error: recErr } = await supabase.rpc('update_training_session_recording', {
          p_session_id: sessionId,
          p_recording_url: recordingPath
        });

        if (recErr) {
          console.error('❌ RPC error:', recErr);
          throw recErr;
        }
      }
      
      console.log('✅ Grabación guardada exitosamente');
      toast.success('Grabación de la sesión guardada');
    } catch (error) {
      console.error('❌ Error guardando grabación:', error);
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      toast.error(`Error al guardar la grabación: ${errorMessage}`);
    }
  };

  useEffect(() => {
    if (!open) return;
    // Bloquear si límite alcanzado
    if (isVoiceBlocked) {
      showVoiceTrainingLimitMessage(voiceLimit);
      onOpenChange(false);
      return;
    }
    if (open && !sessionActive) {
      resetSession();
      startSession();
      // Iniciar grabación de la sesión completa
      startRecording();
      navigator.mediaDevices?.getUserMedia?.({ audio: true }).catch(() => {});
    }
  }, [open, isVoiceBlocked, voiceLimit]);

  // Continuous speech recognition (browser STT)
  useEffect(() => {
    if (!open) return;
    const SR: any = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) return;

    const rec = new SR();
    rec.continuous = true;
    rec.interimResults = true;
    rec.maxAlternatives = 1;
    rec.lang = 'es-CO';
    rec.onstart = () => { isRecActiveRef.current = true; };

    rec.onresult = (event: any) => {
      try {
        let finalTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i];
          if (result.isFinal) {
            finalTranscript += result[0].transcript;
          }
        }
        const transcript = finalTranscript.trim();
        if (transcript) {
          sendMessage(transcript);
        }
      } catch (e) {
        console.error('STT onresult error', e);
      }
    };

    rec.onerror = (e: any) => {
      console.warn('STT error', e);
      if (open && sessionActive && !isMuted && !pausedByTTSRef.current) {
        try { rec.stop(); } catch {}
        setTimeout(() => { try { if (!isRecActiveRef.current) rec.start(); } catch {} }, 250);
      }
    };

    rec.onend = () => {
      // Auto-restart when not muted and session active (avoid while TTS is speaking)
      isRecActiveRef.current = false;
      if (open && sessionActive && !isMuted && !pausedByTTSRef.current) {
        try { if (!isRecActiveRef.current) rec.start(); } catch {}
      }
    };

    recognitionRef.current = rec;
    if (sessionActive && !isMuted && !isRecActiveRef.current) {
      try { rec.start(); } catch {}
    }

    return () => {
      try { rec.stop(); } catch {}
      recognitionRef.current = null;
    };
  }, [open, sessionActive, isMuted]);

  // React to mute state with robust restart logic
  useEffect(() => {
    const rec = recognitionRef.current;
    if (!rec) return;
    
    try {
      if (isMuted) {
        rec.stop();
      } else if (open && sessionActive && !pausedByTTSRef.current) {
        // Ensure clean restart - stop first if running, then start
        rec.stop();
        setTimeout(() => {
          try {
            rec.start();
          } catch (startError) {
            console.warn('Error restarting STT after unmute:', startError);
          }
        }, 100);
      }
    } catch (error) {
      console.warn('Error handling mute state change:', error);
    }
  }, [isMuted, open, sessionActive]);

  // Auto-end session when sessionActive becomes false (e.g., due to consecutive messages)
  useEffect(() => {
    if (!sessionActive && messages.length > 0 && open) {
      console.log('🔄 Session became inactive, saving and showing feedback...');
      endSession();
      setShowFeedback(true);
    }
  }, [sessionActive, messages.length, open, endSession]);

  // TTS for latest AI message using both ElevenLabs and OpenAI
  useEffect(() => {
    if (!open || !sessionActive || messages.length === 0) return;
    const lastAi = [...messages].reverse().find((m) => m.role === 'ai');
    if (!lastAi || lastAi.id === lastPlayedIdRef.current) return;

    const voiceId = globalVoice?.voice_id || 'alloy'; // Default to OpenAI voice
    const selectedModel = ttsModel || (globalVoice?.category === 'openai' ? 'tts-1' : 'eleven_turbo_v2_5');

    const playAudio = async () => {
      try {
        console.log('🎵 Starting TTS playback:', { 
          voiceId, 
          model: selectedModel,
          text: lastAi.content.substring(0, 50),
          provider: ['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer', 'ash', 'ballad', 'coral', 'sage', 'verse'].includes(voiceId) ? 'OpenAI' : 'ElevenLabs'
        });

        if (!audioRef.current) audioRef.current = new Audio();
        const audio = audioRef.current;

        // Pause STT before starting TTS
        const rec = recognitionRef.current;
        if (rec) {
          pausedByTTSRef.current = true;
          try { rec.stop(); } catch {}
        }

        // Generate audio using the hook that handles both providers with selected TTS model
        console.log('📡 Calling generateTrainingAudio with model:', selectedModel);
        const audioBlob = await generateTrainingAudio(
          lastAi.content,
          voiceId,
          globalVoice?.settings,
          sessionId || undefined,
          scenario.id,
          selectedModel // Use the determined model
        );

        if (!audioBlob) {
          throw new Error('No audio blob received');
        }

        console.log('✅ Audio blob received:', { size: audioBlob.size, type: audioBlob.type });

        // Create URL from blob
        const audioUrl = URL.createObjectURL(audioBlob);

        // Bind events
        audio.onplaying = () => {
          console.log('▶️ Audio playing');
          setIsSpeaking(true);
        };
        
        audio.onended = () => {
          console.log('⏹️ Audio ended');
          setIsSpeaking(false);
          URL.revokeObjectURL(audioUrl); // Clean up blob URL
          const rec2 = recognitionRef.current;
          if (rec2 && open && sessionActive && !isMuted) {
            pausedByTTSRef.current = false;
            try {
              if (!isRecActiveRef.current) {
                rec2.start();
                console.log('🎤 Speech recognition restarted');
              }
            } catch (e) {
              console.warn('Failed to restart speech recognition:', e);
            }
            toast.success('Ahora puedes hablar');
          } else {
            pausedByTTSRef.current = false;
          }
        };
        
        audio.onerror = (e) => {
          console.error('❌ Audio playback error:', e);
          setIsSpeaking(false);
          pausedByTTSRef.current = false;
          URL.revokeObjectURL(audioUrl);
          toast.error('Error al reproducir audio');
        };

        audio.src = audioUrl;
        audio.preload = 'auto';
        
        console.log('🎧 Starting audio playback...');
        await audio.play();
        lastPlayedIdRef.current = lastAi.id;
        
      } catch (e) {
        console.error('❌ TTS generation error:', e);
        toast.error('Error al generar audio: ' + (e instanceof Error ? e.message : 'Error desconocido'));
        setIsSpeaking(false);
        pausedByTTSRef.current = false;
        
        // Resume speech recognition even on error
        const rec2 = recognitionRef.current;
        if (rec2 && open && sessionActive && !isMuted) {
          try { rec2.start(); } catch {}
        }
      }
    };

    playAudio();
  }, [messages, open, sessionActive, isMuted, globalVoice?.voice_id, globalVoice?.settings, globalVoice?.category, ttsModel, sessionId, generateTrainingAudio, scenario.id]);

  const handleEndTraining = async () => {
    console.log('🛑 Ending training session - blocking UI for analysis');
    
    // Block UI immediately
    setWaitingForAnalysis(true);
    
    // Stop speech recognition
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {}
    }
    
    // Detener y guardar la grabación
    if (sessionId) {
      const recording = await stopRecording();
      if (recording) {
        await saveRecording(recording, sessionId);
      }
    }
    
    // End the training session and save it
    await endSession();
    onTrainingCompleted?.(); // Marcar como completado si es obligatorio

    // Show feedback dialog immediately; keep blocking until analysis completes
    setShowFeedback(true);
  };

  const toggleMute = () => {
    setIsMuted((prev) => {
      const next = !prev;
      const rec = recognitionRef.current;
      try {
        if (next) {
          rec?.stop();
        } else if (open && sessionActive) {
          rec?.start();
        }
      } catch {}
      return next;
    });
  };

  const handleClose = async () => {
    // If session is active, end it first
    if (sessionActive) {
      await handleEndTraining();
      return; // Don't close yet, wait for analysis
    }
    
    // Only allow closing if not waiting for analysis
    if (!waitingForAnalysis) {
      // Detener grabación si está activa
      if (sessionId && mediaRecorderRef.current?.state === 'recording') {
        const recording = await stopRecording();
        if (recording) {
          await saveRecording(recording, sessionId);
        }
      }
      
      resetSession();
      setShowFeedback(false);
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-6xl h-[90vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-lg">
                Entrenamiento: {scenario.name}
              </DialogTitle>
              <DialogDescription className="text-sm text-muted-foreground">
                Modo Voz • Personalidad: {scenario.client_personality.type}
              </DialogDescription>
            </div>
              <div className="flex items-center gap-4">
                <Badge variant="outline" className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  En vivo
                </Badge>
              </div>
          </div>
        </DialogHeader>

        <ResizablePanelGroup direction="horizontal" className="flex-1 min-h-0 gap-4">
          <ResizablePanel defaultSize={70} minSize={50}>
            {/* Voice Interface Area */}
            <div className="flex h-full flex-col">
              {/* Call Simulation */}
              <Card className="flex-1">
                <CardContent className="flex flex-col items-center justify-center h-full space-y-6">
                  {/* Call Status */}
                  <div className="text-center space-y-2">
                    <div className={`w-24 h-24 rounded-full flex items-center justify-center ${
                      sessionActive ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'
                    }`}>
                      <Phone className="h-12 w-12" />
                    </div>
                    <h3 className="text-lg font-medium">Cliente Virtual</h3>
                    <p className="text-sm text-muted-foreground">
                      {sessionActive ? 'Llamada en curso' : 'Conectando...'}
                    </p>
                    {globalVoice && (
                      <p className="text-xs text-muted-foreground">
                        Voz: {globalVoice.name}
                      </p>
                    )}
                  </div>

                  {/* Voice Controls */}
                  <div className="flex gap-4">
                    <Button
                      variant={isMuted ? "destructive" : "outline"}
                      size="lg"
                      onClick={toggleMute}
                      className="rounded-full w-16 h-16"
                      disabled={isSpeaking}
                    >
                      {isMuted ? <MicOff className="h-6 w-6" /> : <Mic className="h-6 w-6" />}
                    </Button>

                    <Button
                      variant="destructive"
                      size="lg"
                      onClick={handleEndTraining}
                      className="rounded-full w-16 h-16"
                      disabled={!sessionActive}
                    >
                      <PhoneOff className="h-6 w-6" />
                    </Button>
                  </div>

                  {/* Status Messages */}
                  <div className="text-center space-y-2">
                    {isMuted && (
                      <Badge variant="destructive">Micrófono silenciado</Badge>
                    )}
                    {isSpeaking && (
                      <Badge variant="secondary">La IA está hablando...</Badge>
                    )}
                    {!isSpeaking && !isMuted && sessionActive && (
                      <Badge variant="outline">Puedes hablar</Badge>
                    )}
                    {isLoading && (
                      <Badge variant="secondary">
                        Cliente respondiendo...
                      </Badge>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Transcript */}
              <Card className="mt-4 h-80">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Transcripción en Tiempo Real</CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-64">
                    <div className="space-y-2">
                      {messages.map((msg, index) => (
                        <div key={index} className="text-sm">
                          <span className={`font-medium ${
                            msg.role === 'user' ? 'text-blue-600' : 'text-green-600'
                          }`}>
                            {msg.role === 'user' ? 'Tú' : 'Cliente'}:
                          </span>
                          <span className="ml-2">{msg.content}</span>
                          <span className="text-xs text-muted-foreground ml-2">
                            {new Date(msg.timestamp).toLocaleTimeString()}
                          </span>
                        </div>
                      ))}
                      {isLoading && (
                        <div className="text-sm text-muted-foreground italic">
                          Cliente está hablando...
                        </div>
                      )}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </div>
          </ResizablePanel>
          <ResizableHandle withHandle />
          <ResizablePanel defaultSize={30} minSize={20} maxSize={40}>
            {/* Sidebar */}
            <Card className="h-full">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Lightbulb className="h-4 w-4" />
                  Asistente de Entrenamiento
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Objectives */}
                <div>
                  <h4 className="text-sm font-medium mb-2">Objetivos del Escenario</h4>
                  <ul className="space-y-1">
                    {scenario.objectives.slice(0, 3).map((objective, index) => (
                      <li key={index} className="text-xs text-muted-foreground flex items-start gap-2">
                        <span className="text-primary">•</span>
                        <span>{objective}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <Separator />

                {/* Live Suggestions */}
                {suggestions.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium mb-2">Sugerencias en Tiempo Real</h4>
                    <div className="space-y-2">
                      {suggestions.slice(-3).map((suggestion, index) => (
                        <div key={index} className="p-2 bg-blue-50 dark:bg-blue-950/20 rounded-lg border-l-2 border-blue-500">
                          <p className="text-xs text-blue-700 dark:text-blue-300">
                            {suggestion}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Voice Instructions */}
                <div>
                  <h4 className="text-sm font-medium mb-2">Instrucciones de Voz</h4>
                  <div className="space-y-2 text-xs text-muted-foreground">
                    <div className="flex items-start gap-2">
                      <span className="text-primary">•</span>
                      <span>Habla claro y a un ritmo normal</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-primary">•</span>
                      <span>Habla cuando veas el aviso "Puedes hablar"</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-primary">•</span>
                      <span>Escucha atentamente las respuestas del cliente</span>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Client Personality Reminder */}
                <div>
                  <h4 className="text-sm font-medium mb-2">Personalidad del Cliente</h4>
                  <div className="p-2 bg-orange-50 dark:bg-orange-950/20 rounded-lg">
                    <p className="text-xs text-orange-700 dark:text-orange-300">
                      <strong>{scenario.client_personality.type}</strong>
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {scenario.client_personality.description}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </ResizablePanel>
        </ResizablePanelGroup>

        {/* Feedback Dialog */}
        {showFeedback && (
          <TrainingFeedback
            open={showFeedback}
            onOpenChange={(open) => {
              setShowFeedback(open);
              // Only allow closing the main dialog after analysis is viewed
              if (!open) {
                resetSession();
                onOpenChange(false);
              }
            }}
            scenario={scenario}
            messages={messages}
            finalScore={currentScore}
            sessionId={sessionId || undefined}
            onAnalysisComplete={() => setWaitingForAnalysis(false)}
          />
        )}

        {/* Blocking overlay while waiting for analysis */}
        {waitingForAnalysis && (
          <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center">
            <div className="bg-card p-8 rounded-lg shadow-lg text-center space-y-4">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
              <h3 className="text-lg font-medium">Finalizando sesión...</h3>
              <p className="text-sm text-muted-foreground">Guardando y generando análisis</p>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}