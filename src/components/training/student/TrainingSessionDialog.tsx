import React, { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { MessageSquare, Mic, Clock, Star, TrendingUp, User, Bot, Download, Play, Pause, Volume2 } from 'lucide-react';
import { TrainingSession } from '@/lib/types/training';

interface TrainingSessionDialogProps {
  session: TrainingSession | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TrainingSessionDialog({ session, open, onOpenChange }: TrainingSessionDialogProps) {
  const [playingAudio, setPlayingAudio] = useState<string | null>(null);
  const [isPlayingFullRecording, setIsPlayingFullRecording] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const fullRecordingRef = useRef<HTMLAudioElement | null>(null);
  
  if (!session) return null;

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-600';
    if (score >= 80) return 'text-blue-600';
    if (score >= 70) return 'text-yellow-600';
    if (score >= 60) return 'text-orange-600';
    return 'text-red-600';
  };

  const getScoreBadgeColor = (score: number) => {
    if (score >= 90) return 'bg-green-100 text-green-800';
    if (score >= 80) return 'bg-blue-100 text-blue-800';
    if (score >= 70) return 'bg-yellow-100 text-yellow-800';
    if (score >= 60) return 'bg-orange-100 text-orange-800';
    return 'bg-red-100 text-red-800';
  };

  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString();
  };

  const playAudio = (audioUrl: string, messageId: string) => {
    if (playingAudio === messageId) {
      audioRef.current?.pause();
      setPlayingAudio(null);
    } else {
      if (audioRef.current) {
        audioRef.current.src = audioUrl;
        audioRef.current.play();
        setPlayingAudio(messageId);
      }
    }
  };

  const downloadReport = () => {
  const reportData = {
    escenario: session.scenario_name,
    tipo: session.type === 'voice' ? 'Voz' : 'Chat',
    puntuacion: session.ai_report?.overall_score ?? session.performance_score,
    duracion: session.duration_seconds ? formatDuration(session.duration_seconds) : 'N/A',
    inicio: new Date(session.started_at).toLocaleString(),
    finalizacion: session.completed_at ? new Date(session.completed_at).toLocaleString() : 'N/A',
    estado: session.status === 'completed' ? 'Completado' : session.status === 'cancelled' ? 'Cancelado' : 'Activo',
    resumen: session.ai_report?.conversation_summary ?? session.ai_summary ?? 'No disponible',
    puntosFuertes: session.ai_report?.strengths ?? session.insights ?? [],
    areasToMejora: session.ai_report?.areas_for_improvement ?? [],
    recomendaciones: session.ai_report?.recommendations ?? session.recommendations ?? [],
    conversacion: session.conversation?.map(msg => ({
      rol: msg.role === 'user' ? 'Usuario' : msg.role === 'ai' ? 'Cliente IA' : 'Sistema',
      contenido: msg.content,
      tiempo: formatTime(msg.timestamp)
    })) || []
  };

    const reportText = `
REPORTE DE ENTRENAMIENTO
========================

Escenario: ${reportData.escenario}
Tipo: ${reportData.tipo}
Puntuación: ${reportData.puntuacion}%
Duración: ${reportData.duracion}
Inicio: ${reportData.inicio}
Finalización: ${reportData.finalizacion}
Estado: ${reportData.estado}

RESUMEN
-------
${reportData.resumen}

PUNTOS FUERTES
--------------
${reportData.puntosFuertes.map(p => `• ${p}`).join('\n')}

ÁREAS DE MEJORA
---------------
${reportData.areasToMejora.map(a => `• ${a}`).join('\n')}

CONVERSACIÓN COMPLETA
--------------------
${reportData.conversacion.map(msg => `[${msg.tiempo}] ${msg.rol}: ${msg.contenido}`).join('\n\n')}
    `;

    const blob = new Blob([reportText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `reporte-entrenamiento-${session.scenario_name}-${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-7xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-3">
              {session.scenario_name}
              <Badge variant="outline">
                {session.type === 'voice' ? (
                  <><Mic className="h-3 w-3 mr-1" /> Voz</>
                ) : (
                  <><MessageSquare className="h-3 w-3 mr-1" /> Chat</>
                )}
              </Badge>
            </DialogTitle>
            <div className="flex items-center gap-3">
              {((session.ai_report?.overall_score ?? session.performance_score) !== undefined && (session.ai_report?.overall_score ?? session.performance_score) !== null) && (
                <Badge className={getScoreBadgeColor((session.ai_report?.overall_score ?? session.performance_score) || 0)}>
                  <Star className="h-3 w-3 mr-1" />
                  {(session.ai_report?.overall_score ?? session.performance_score) || 0}%
                </Badge>
              )}
              <Button onClick={downloadReport} variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Descargar Reporte
              </Button>
            </div>
          </div>
          <DialogDescription>
            Análisis completo de la sesión de entrenamiento, incluye conversación, puntuación y feedback detallado.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-full">
            {/* LEFT COLUMN - Conversation */}
            <div className="flex flex-col">
              <div className="mb-4">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <MessageSquare className="h-5 w-5" />
                  Conversación Completa
                </h3>
              </div>
              <Card className="flex-1">
                <CardContent className="p-0 h-full">
                  <ScrollArea className="h-[60vh]">
                    {session.conversation && session.conversation.length > 0 ? (
                      <div className="space-y-4 p-4">
                        {session.conversation.map((message, index) => (
                          <div key={message.id} className="flex gap-3">
                            <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                              message.role === 'user' 
                                ? 'bg-primary text-primary-foreground'
                                : message.role === 'ai'
                                ? 'bg-secondary text-secondary-foreground'
                                : 'bg-muted text-muted-foreground'
                            }`}>
                              {message.role === 'user' ? (
                                <User className="h-4 w-4" />
                              ) : message.role === 'ai' ? (
                                <Bot className="h-4 w-4" />
                              ) : (
                                <MessageSquare className="h-4 w-4" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-sm font-medium">
                                  {message.role === 'user' ? 'Tú' : 
                                   message.role === 'ai' ? 'Cliente IA' : 'Sistema'}
                                </span>
                                <span className="text-xs text-muted-foreground">
                                  {formatTime(message.timestamp)}
                                </span>
                              </div>
                              <div className={`text-sm p-3 rounded-lg ${
                                message.role === 'user'
                                  ? 'bg-primary/10 text-foreground'
                                  : 'bg-muted text-foreground'
                              }`}>
                                {message.content}
                              </div>
                              {message.audio_url && session.type === 'voice' && (
                                <div className="mt-2 flex items-center gap-2">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => playAudio(message.audio_url!, message.id)}
                                  >
                                    {playingAudio === message.id ? (
                                      <Pause className="h-3 w-3 mr-1" />
                                    ) : (
                                      <Play className="h-3 w-3 mr-1" />
                                    )}
                                    {playingAudio === message.id ? 'Pausar' : 'Reproducir'}
                                  </Button>
                                  <Volume2 className="h-3 w-3 text-muted-foreground" />
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="flex items-center justify-center h-full text-muted-foreground">
                        <div className="text-center">
                          <MessageSquare className="h-12 w-12 mx-auto mb-2 opacity-50" />
                          <p>No hay conversación disponible</p>
                        </div>
                      </div>
                    )}
                  </ScrollArea>
                </CardContent>
              </Card>
            </div>

            {/* RIGHT COLUMN - Training Report */}
            <div className="flex flex-col">
              <div className="mb-4">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Reporte de Entrenamiento
                </h3>
              </div>
              <ScrollArea className="h-[60vh]">
                <div className="space-y-4 pr-4">
                  {/* Session Info */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        Información de la Sesión
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="font-medium text-muted-foreground">Duración</p>
                        <p>{session.duration_seconds ? formatDuration(session.duration_seconds) : 'N/A'}</p>
                      </div>
                      <div>
                        <p className="font-medium text-muted-foreground">Inicio</p>
                        <p>{new Date(session.started_at).toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="font-medium text-muted-foreground">Finalización</p>
                        <p>{session.completed_at ? new Date(session.completed_at).toLocaleString() : 'N/A'}</p>
                      </div>
                      <div>
                        <p className="font-medium text-muted-foreground">Estado</p>
                        <Badge variant={session.status === 'completed' ? 'default' : 'secondary'}>
                          {session.status === 'completed' ? 'Completado' : 
                           session.status === 'cancelled' ? 'Cancelado' : 'Activo'}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Reproductor de Grabación Completa */}
                  {session.recording_url && (
                    <Card className="bg-gradient-to-br from-purple-50 to-blue-50 dark:from-purple-950/20 dark:to-blue-950/20">
                      <CardHeader>
                        <CardTitle className="text-base flex items-center gap-2">
                          <Volume2 className="h-5 w-5" />
                          Grabación Completa del Entrenamiento
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <p className="text-sm text-muted-foreground">
                          Audio completo de toda la sesión de entrenamiento (incluye usuario + IA)
                        </p>
                        
                        <div className="flex items-center gap-3">
                          <Button
                            onClick={() => {
                              if (fullRecordingRef.current) {
                                if (isPlayingFullRecording) {
                                  fullRecordingRef.current.pause();
                                } else {
                                  fullRecordingRef.current.play();
                                }
                                setIsPlayingFullRecording(!isPlayingFullRecording);
                              }
                            }}
                            variant="outline"
                            size="lg"
                            className="flex-shrink-0"
                          >
                            {isPlayingFullRecording ? (
                              <>
                                <Pause className="h-4 w-4 mr-2" />
                                Pausar
                              </>
                            ) : (
                              <>
                                <Play className="h-4 w-4 mr-2" />
                                Reproducir
                              </>
                            )}
                          </Button>
                          
                          <audio
                            ref={fullRecordingRef}
                            src={session.recording_url}
                            onEnded={() => setIsPlayingFullRecording(false)}
                            onError={() => setIsPlayingFullRecording(false)}
                            onPlay={() => setIsPlayingFullRecording(true)}
                            onPause={() => setIsPlayingFullRecording(false)}
                            controls
                            className="flex-1"
                            controlsList="nodownload"
                          />
                        </div>
                        
                        <p className="text-xs text-muted-foreground">
                          Esta grabación incluye el 100% del entrenamiento completo
                        </p>
                      </CardContent>
                    </Card>
                  )}

                  {/* Full AI Report - Show complete analysis if available */}
                  {session.ai_report ? (
                    <>
                      {/* Performance Score with detailed breakdown */}
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-base flex items-center gap-2">
                            <Star className="h-4 w-4" />
                            Puntuación General
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div className="text-center">
                            <div className={`text-4xl font-bold ${getScoreColor(session.ai_report.overall_score)}`}>
                              {session.ai_report.overall_score}%
                            </div>
                            <p className="text-sm text-muted-foreground mt-1">
                              {session.ai_report.overall_score >= 90 ? 'Excelente' :
                               session.ai_report.overall_score >= 80 ? 'Muy Bueno' :
                               session.ai_report.overall_score >= 70 ? 'Bueno' :
                               session.ai_report.overall_score >= 60 ? 'Regular' : 'Necesita Mejora'}
                            </p>
                          </div>
                          {session.ai_report.conversation_summary && (
                            <div className="text-sm text-center text-muted-foreground border-t pt-3">
                              {session.ai_report.conversation_summary}
                            </div>
                          )}
                        </CardContent>
                      </Card>

                      {/* Detailed Scores */}
                      {session.ai_report.detailed_scores && (
                        <Card>
                          <CardHeader>
                            <CardTitle className="text-base flex items-center gap-2">
                              <TrendingUp className="h-4 w-4" />
                              Puntuaciones Detalladas
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-3">
                            {Object.entries(session.ai_report.detailed_scores).map(([key, score]) => {
                              const labels: Record<string, string> = {
                                communication_skills: 'Habilidades de Comunicación',
                                problem_solving: 'Resolución de Problemas',
                                empathy: 'Empatía',
                                product_knowledge: 'Conocimiento del Producto',
                                call_resolution: 'Resolución de la Llamada'
                              };
                              
                              const numericScore = Number(score) || 0;
                              
                              return (
                                <div key={key} className="space-y-1">
                                  <div className="flex justify-between items-center">
                                    <span className="text-xs font-medium">{labels[key] || key}</span>
                                    <span className={`text-xs font-bold ${getScoreColor(numericScore)}`}>
                                      {numericScore}/100
                                    </span>
                                  </div>
                                  <div className="w-full bg-secondary rounded-full h-1.5">
                                    <div 
                                      className="bg-primary h-1.5 rounded-full transition-all" 
                                      style={{ width: `${numericScore}%` }}
                                    ></div>
                                  </div>
                                </div>
                              );
                            })}
                          </CardContent>
                        </Card>
                      )}

                      {/* Fortalezas y Áreas de Mejora */}
                      <div className="space-y-4">
                        {session.ai_report.strengths && session.ai_report.strengths.length > 0 && (
                          <Card>
                            <CardHeader>
                              <CardTitle className="text-base text-green-600">
                                Fortalezas Identificadas
                              </CardTitle>
                            </CardHeader>
                            <CardContent>
                              <ul className="space-y-2">
                                {session.ai_report.strengths.map((strength: string, index: number) => (
                                  <li key={index} className="flex items-start gap-2 text-sm">
                                    <span className="text-green-500 mt-0.5">✓</span>
                                    <span>{strength}</span>
                                  </li>
                                ))}
                              </ul>
                            </CardContent>
                          </Card>
                        )}

                        {session.ai_report.areas_for_improvement && session.ai_report.areas_for_improvement.length > 0 && (
                          <Card>
                            <CardHeader>
                              <CardTitle className="text-base text-amber-600">
                                Áreas de Mejora
                              </CardTitle>
                            </CardHeader>
                            <CardContent>
                              <ul className="space-y-2">
                                {session.ai_report.areas_for_improvement.map((area: string, index: number) => (
                                  <li key={index} className="flex items-start gap-2 text-sm">
                                    <span className="text-amber-500 mt-0.5">⚠</span>
                                    <span>{area}</span>
                                  </li>
                                ))}
                              </ul>
                            </CardContent>
                          </Card>
                        )}
                      </div>

                      {/* Key Insights */}
                      {session.ai_report.key_insights && session.ai_report.key_insights.length > 0 && (
                        <Card>
                          <CardHeader>
                            <CardTitle className="text-base text-blue-600">
                              Insights Clave
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <ul className="space-y-2">
                              {session.ai_report.key_insights.map((insight: string, index: number) => (
                                <li key={index} className="flex items-start gap-2 text-sm">
                                  <span className="text-blue-500 mt-0.5">💡</span>
                                  <span>{insight}</span>
                                </li>
                              ))}
                            </ul>
                          </CardContent>
                        </Card>
                      )}

                      {/* Recommendations */}
                      {session.ai_report.recommendations && session.ai_report.recommendations.length > 0 && (
                        <Card>
                          <CardHeader>
                            <CardTitle className="text-base text-purple-600">
                              Recomendaciones para Mejorar
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <ul className="space-y-3">
                              {session.ai_report.recommendations.map((rec: string, index: number) => (
                                <li key={index} className="flex items-start gap-3 text-sm p-3 bg-muted rounded-lg">
                                  <span className="text-purple-500 mt-0.5">→</span>
                                  <span>{rec}</span>
                                </li>
                              ))}
                            </ul>
                          </CardContent>
                        </Card>
                      )}
                    </>
                  ) : (
                    <>
                      {/* Fallback - Legacy format for sessions without ai_report */}
                      {session.performance_score !== undefined && session.performance_score !== null && (
                        <Card>
                          <CardHeader>
                            <CardTitle className="text-base flex items-center gap-2">
                              <Star className="h-4 w-4" />
                              Puntuación de Desempeño
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="flex items-center justify-center">
                            <div className="text-center">
                              <div className={`text-4xl font-bold ${getScoreColor(session.performance_score)}`}>
                                {session.performance_score}%
                              </div>
                              <p className="text-sm text-muted-foreground mt-1">
                                {session.performance_score >= 90 ? 'Excelente' :
                                 session.performance_score >= 80 ? 'Muy Bueno' :
                                 session.performance_score >= 70 ? 'Bueno' :
                                 session.performance_score >= 60 ? 'Regular' : 'Necesita Mejora'}
                              </p>
                            </div>
                          </CardContent>
                        </Card>
                      )}

                      {session.ai_summary && (
                        <Card>
                          <CardHeader>
                            <CardTitle className="text-base flex items-center gap-2">
                              <Bot className="h-4 w-4" />
                              Resumen de la IA
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <p className="text-sm">{session.ai_summary}</p>
                          </CardContent>
                        </Card>
                      )}

                      <div className="space-y-4">
                        {session.insights && session.insights.length > 0 && (
                          <Card>
                            <CardHeader>
                              <CardTitle className="text-base text-green-600">
                                Puntos Fuertes
                              </CardTitle>
                            </CardHeader>
                            <CardContent>
                              <ul className="space-y-2">
                                {session.insights.map((insight, index) => (
                                  <li key={index} className="flex items-start gap-2 text-sm">
                                    <span className="text-green-500 mt-0.5">✓</span>
                                    <span>{insight}</span>
                                  </li>
                                ))}
                              </ul>
                            </CardContent>
                          </Card>
                        )}

                        {session.recommendations && session.recommendations.length > 0 && (
                          <Card>
                            <CardHeader>
                              <CardTitle className="text-base text-blue-600">
                                Áreas de Mejora
                              </CardTitle>
                            </CardHeader>
                            <CardContent>
                              <ul className="space-y-2">
                                {session.recommendations.map((rec, index) => (
                                  <li key={index} className="flex items-start gap-2 text-sm">
                                    <span className="text-blue-500 mt-0.5">→</span>
                                    <span>{rec}</span>
                                  </li>
                                ))}
                              </ul>
                            </CardContent>
                          </Card>
                        )}
                      </div>
                    </>
                  )}
                </div>
              </ScrollArea>
            </div>
          </div>
        </div>

        {/* Hidden audio element for playback */}
        <audio
          ref={audioRef}
          onEnded={() => setPlayingAudio(null)}
          onError={() => setPlayingAudio(null)}
        />
      </DialogContent>
    </Dialog>
  );
}