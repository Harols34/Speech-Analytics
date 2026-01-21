import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Mic, MicOff, Volume2, VolumeX, Phone, PhoneOff } from 'lucide-react';
import { useGlobalVoice } from '@/hooks/useGlobalVoice';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';

interface TrainingMessage {
  id: string;
  role: 'user' | 'ai' | 'system';
  content: string;
  timestamp: string;
  audio_url?: string;
}

interface TrainingConversationProps {
  scenario?: any;
}

export function TrainingConversation({ scenario }: TrainingConversationProps) {
  const { globalVoice, voiceSettings } = useGlobalVoice();
  const [isConnected, setIsConnected] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [messages, setMessages] = useState<TrainingMessage[]>([]);
  const [textInput, setTextInput] = useState('');
  const wsRef = useRef<WebSocket | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const sessionId = useRef<string>(`session_${Date.now()}`);

  const initializeAudioContext = async () => {
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      
      if (audioContextRef.current.state === 'suspended') {
        await audioContextRef.current.resume();
      }
    } catch (error) {
      console.error('Error initializing audio context:', error);
    }
  };

  const startTrainingSession = async () => {
    try {
      await initializeAudioContext();
      
      // Connect to training WebSocket
      const wsUrl = `wss://ejzidvltowbhccxukllc.functions.supabase.co/functions/v1/realtime-training-conversation?scenario=${encodeURIComponent(JSON.stringify(scenario))}&voice=${globalVoice?.voice_id}&session=${sessionId.current}`;
      
      wsRef.current = new WebSocket(wsUrl);
      
      wsRef.current.onopen = () => {
        console.log('Connected to training conversation');
        setIsConnected(true);
        toast.success('Sesión de entrenamiento iniciada');
        
        // Add welcome message
        const welcomeMsg: TrainingMessage = {
          id: `msg_${Date.now()}`,
          role: 'system',
          content: 'Sesión de entrenamiento iniciada. El cliente virtual está listo para conversar.',
          timestamp: new Date().toISOString()
        };
        setMessages([welcomeMsg]);
      };

      wsRef.current.onmessage = async (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('Training message received:', data);
          
          if (data.type === 'response.audio.delta') {
            // Handle streaming audio response
            await handleAudioDelta(data.delta);
          } else if (data.type === 'response.audio_transcript.delta') {
            // Handle text transcript
            handleTranscriptDelta(data);
          } else if (data.type === 'response.done') {
            // Response completed
            console.log('Training response completed');
          } else if (data.training_context) {
            // Handle training-specific messages
            const msg: TrainingMessage = {
              id: `msg_${Date.now()}`,
              role: 'ai',
              content: data.content || 'Respuesta del cliente virtual',
              timestamp: new Date().toISOString()
            };
            setMessages(prev => [...prev, msg]);
          }
        } catch (error) {
          console.error('Error processing training message:', error);
        }
      };

      wsRef.current.onerror = (error) => {
        console.error('Training WebSocket error:', error);
        toast.error('Error en la conexión de entrenamiento');
      };

      wsRef.current.onclose = () => {
        console.log('Training conversation closed');
        setIsConnected(false);
        setIsListening(false);
      };

    } catch (error) {
      console.error('Error starting training session:', error);
      toast.error('Error al iniciar la sesión de entrenamiento');
    }
  };

  const endTrainingSession = () => {
    if (wsRef.current) {
      wsRef.current.close();
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
    }
    setIsConnected(false);
    setIsListening(false);
    toast.info('Sesión de entrenamiento finalizada');
  };

  const handleAudioDelta = async (audioData: string) => {
    try {
      if (!audioContextRef.current) return;
      
      // Convert base64 to audio buffer
      const binaryString = atob(audioData);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      
      // Create audio buffer and play
      const audioBuffer = await audioContextRef.current.decodeAudioData(bytes.buffer);
      const source = audioContextRef.current.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(audioContextRef.current.destination);
      source.start(0);
      
    } catch (error) {
      console.error('Error playing training audio:', error);
    }
  };

  const handleTranscriptDelta = (data: any) => {
    const msg: TrainingMessage = {
      id: `transcript_${Date.now()}`,
      role: 'ai',
      content: data.delta || data.text || '',
      timestamp: new Date().toISOString()
    };
    setMessages(prev => [...prev, msg]);
  };

  const sendTextMessage = async () => {
    if (!textInput.trim() || !wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      return;
    }

    const userMsg: TrainingMessage = {
      id: `msg_${Date.now()}`,
      role: 'user',
      content: textInput,
      timestamp: new Date().toISOString()
    };
    
    setMessages(prev => [...prev, userMsg]);

    // Send to WebSocket
    wsRef.current.send(JSON.stringify({
      type: 'conversation.item.create',
      item: {
        type: 'message',
        role: 'user',
        content: [{ type: 'input_text', text: textInput }]
      }
    }));

    wsRef.current.send(JSON.stringify({ type: 'response.create' }));
    setTextInput('');
  };

  const toggleMute = () => {
    setIsMuted(!isMuted);
    // TODO: Implement actual mute functionality
  };

  useEffect(() => {
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="text-lg">Conversación de Entrenamiento</CardTitle>
            <div className="flex gap-2">
              <Badge variant={isConnected ? "default" : "secondary"}>
                {isConnected ? "Conectado" : "Desconectado"}
              </Badge>
              {scenario && (
                <Badge variant="outline">
                  {scenario.title || 'Escenario de Entrenamiento'}
                </Badge>
              )}
            </div>
          </div>
          <p className="text-sm text-muted-foreground">
            Conversación en tiempo real con IA para entrenamiento de habilidades
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            {!isConnected ? (
            <Button 
              onClick={startTrainingSession}
              disabled={!scenario || !globalVoice}
              className="flex-1"
            >
              <Phone className="h-4 w-4 mr-2" />
              Iniciar Sesión
            </Button>
            ) : (
              <Button 
                onClick={endTrainingSession}
                variant="destructive"
                className="flex-1"
              >
                <PhoneOff className="h-4 w-4 mr-2" />
                Finalizar Sesión
              </Button>
            )}
            
            <Button
              variant="outline"
              size="sm"
              onClick={toggleMute}
              disabled={!isConnected}
            >
              {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
            </Button>
          </div>

          {!scenario && (
            <div className="bg-muted p-4 rounded-lg">
              <p className="text-sm text-muted-foreground">
                Selecciona un escenario de entrenamiento para comenzar
              </p>
            </div>
          )}

          {!globalVoice && scenario && (
            <div className="bg-muted p-4 rounded-lg">
              <p className="text-sm text-muted-foreground">
                Selecciona una voz global en la pestaña "Voces" para comenzar la conversación
              </p>
            </div>
          )}

          {globalVoice && (
            <div className="bg-primary/5 p-3 rounded-lg border border-primary/20">
              <p className="text-sm font-medium">Voz seleccionada: {globalVoice.name}</p>
              <p className="text-xs text-muted-foreground">
                Esta voz se usará para todos los entrenamientos
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {isConnected && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Conversación</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <ScrollArea className="h-64 p-2 border rounded-lg">
              <div className="space-y-2">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`p-2 rounded-lg max-w-[80%] ${
                      message.role === 'user'
                        ? 'bg-primary text-primary-foreground ml-auto'
                        : message.role === 'ai'
                        ? 'bg-muted'
                        : 'bg-accent text-accent-foreground text-center mx-auto'
                    }`}
                  >
                    <p className="text-sm text-foreground">{message.content}</p>
                    <p className="text-xs opacity-70 mt-1">
                      {new Date(message.timestamp).toLocaleTimeString()}
                    </p>
                  </div>
                ))}
              </div>
            </ScrollArea>

            <div className="flex gap-2">
              <Input
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                placeholder="Escribe tu mensaje..."
                onKeyPress={(e) => e.key === 'Enter' && sendTextMessage()}
                disabled={!isConnected}
              />
              <Button onClick={sendTextMessage} disabled={!isConnected || !textInput.trim()}>
                Enviar
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}