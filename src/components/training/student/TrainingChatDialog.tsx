import React, { useState, useRef, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  MessageSquare, 
  Send, 
  Square, 
  Lightbulb, 
  Star,
  Clock,
  User,
  Bot
} from 'lucide-react';
import { TrainingScenario } from '@/lib/types/training';
import { useTrainingSession } from '@/hooks/useTrainingSession';
import { TrainingFeedback } from './TrainingFeedback';
import { useChatTrainingLimit, showChatTrainingLimitMessage } from '@/hooks/useAccountLimits';

interface TrainingChatDialogProps {
  scenario: TrainingScenario;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onTrainingCompleted?: () => void;
}

export function TrainingChatDialog({ scenario, open, onOpenChange, onTrainingCompleted }: TrainingChatDialogProps) {
  const [message, setMessage] = useState('');
  const [showFeedback, setShowFeedback] = useState(false);
  const [waitingForAnalysis, setWaitingForAnalysis] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
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
  } = useTrainingSession(scenario, 'chat');

  // Limits: Chat messages
  const { data: chatLimit } = useChatTrainingLimit();
  const isChatBlocked = !!chatLimit?.limite_alcanzado;

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (!open) return;
    // Bloquear si límite alcanzado
    if (isChatBlocked) {
      showChatTrainingLimitMessage(chatLimit);
      onOpenChange(false);
      return;
    }
    if (open && !sessionActive) {
      resetSession();
      startSession();
    }
  }, [open, isChatBlocked, chatLimit]);

  const handleSendMessage = async () => {
    if (!message.trim() || isLoading) return;
    
    const messageToSend = message;
    setMessage('');
    await sendMessage(messageToSend);
  };

const handleEndTraining = async () => {
  // Bloquear UI mientras se genera y guarda el análisis
  setWaitingForAnalysis(true);
  await endSession();
  onTrainingCompleted?.(); // Marcar como completado si es obligatorio
  setShowFeedback(true);
};

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

const handleClose = () => {
  // Evitar cerrar mientras esperamos el análisis
  if (waitingForAnalysis) return;
  if (sessionActive) {
    endSession();
  }
  setShowFeedback(false);
  onOpenChange(false);
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
                Modo Chat • Personalidad: {scenario.client_personality.type}
              </DialogDescription>
            </div>
            <div className="flex items-center gap-4">
              {/* Puntuación en tiempo real oculta para modo Chat; se muestra solo al finalizar en el feedback */}
              <Badge variant="outline" className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                En vivo
              </Badge>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 flex gap-4 min-h-0">
          {/* Chat Area */}
          <div className="flex-1 flex flex-col">
            <ScrollArea className="flex-1 p-4 border rounded-lg">
              <div className="space-y-4">
                {messages.map((msg, index) => (
                  <div
                    key={index}
                    className={`flex gap-3 ${
                      msg.role === 'user' ? 'justify-end' : 'justify-start'
                    }`}
                  >
                    {msg.role === 'ai' && (
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                        <Bot className="h-4 w-4 text-primary" />
                      </div>
                    )}
                    
                    <div
                      className={`max-w-[70%] p-3 rounded-lg ${
                        msg.role === 'user'
                          ? 'bg-primary text-primary-foreground ml-auto'
                          : 'bg-muted'
                      }`}
                    >
                      <p className="text-sm text-foreground">{msg.content}</p>
                      <span className="text-xs opacity-70 mt-1 block">
                        {new Date(msg.timestamp).toLocaleTimeString()}
                      </span>
                    </div>

                    {msg.role === 'user' && (
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-secondary flex items-center justify-center">
                        <User className="h-4 w-4" />
                      </div>
                    )}
                  </div>
                ))}
                
                {isLoading && (
                  <div className="flex gap-3 justify-start">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <Bot className="h-4 w-4 text-primary" />
                    </div>
                    <div className="bg-muted p-3 rounded-lg">
                      <div className="flex gap-1">
                        <div className="w-2 h-2 bg-current rounded-full animate-bounce" />
                        <div className="w-2 h-2 bg-current rounded-full animate-bounce [animation-delay:0.1s]" />
                        <div className="w-2 h-2 bg-current rounded-full animate-bounce [animation-delay:0.2s]" />
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>

            {/* Input Area */}
            <div className="flex-shrink-0 mt-4 flex gap-2">
              <Input
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Escribe tu respuesta..."
                disabled={isLoading || !sessionActive}
                className="flex-1"
              />
              <Button 
                onClick={handleSendMessage}
                disabled={!message.trim() || isLoading || !sessionActive}
                size="icon"
              >
                <Send className="h-4 w-4" />
              </Button>
              <Button 
                onClick={handleEndTraining}
                variant="destructive"
                disabled={!sessionActive}
              >
                <Square className="h-4 w-4 mr-2" />
                Finalizar
              </Button>
            </div>
          </div>

          {/* Sidebar */}
          <Card className="w-80 flex-shrink-0">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Lightbulb className="h-4 w-4" />
                Asistente de Entrenamiento
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Separator />

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
        </div>

        {/* Feedback Dialog */}
        <TrainingFeedback
          open={showFeedback}
          onOpenChange={(open) => {
            setShowFeedback(open);
            if (!open) {
              setWaitingForAnalysis(false);
            }
          }}
          scenario={scenario}
          messages={messages}
          finalScore={currentScore}
          sessionId={sessionId || undefined}
          onAnalysisComplete={() => setWaitingForAnalysis(false)}
        />

        {/* Blocking overlay while waiting for analysis (chat) */}
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