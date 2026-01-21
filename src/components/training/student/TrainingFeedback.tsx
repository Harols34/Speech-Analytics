import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { 
  Trophy, 
  TrendingUp, 
  MessageCircle, 
  Target,
  CheckCircle,
  AlertCircle,
  Lightbulb,
  Download,
  Star
} from 'lucide-react';
import { TrainingScenario, TrainingMessage } from '@/lib/types/training';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface TrainingFeedbackProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  scenario: TrainingScenario;
  messages: TrainingMessage[];
  finalScore: number;
  sessionId?: string;
  onAnalysisComplete?: () => void; // notify parent when analysis is ready/saved
}

interface FeedbackAnalysis {
  overall_score: number;
  detailed_scores: {
    communication_skills: number;
    problem_solving: number;
    empathy: number;
    product_knowledge: number;
    call_resolution: number;
  };
  strengths: string[];
  areas_for_improvement: string[];
  key_insights: string[];
  recommendations: string[];
  conversation_summary: string;
}

export function TrainingFeedback({ 
  open, 
  onOpenChange, 
  scenario, 
  messages, 
  finalScore,
  sessionId,
  onAnalysisComplete,
}: TrainingFeedbackProps) {
  const [analysis, setAnalysis] = useState<FeedbackAnalysis | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && messages.length > 0) {
      generateFeedback();
    }
  }, [open, messages]);

  const generateFeedback = async () => {
    setLoading(true);
    try {
      console.log('🔍 Generating feedback analysis for session:', sessionId);
      
      // Prepare conversation text
      const conversationText = messages
        .map(msg => `${msg.role === 'user' ? 'Agente' : 'Cliente'}: ${msg.content}`)
        .join('\n');

      const { data, error } = await supabase.functions.invoke('commercial-analysis', {
        body: {
          conversation: conversationText,
          scenario: {
            title: scenario.name,
            description: scenario.description,
            category: scenario.category,
            difficulty: scenario.difficulty,
            client_personality: scenario.client_personality,
            objectives: scenario.objectives,
            context: scenario.context
          },
          knowledgeBase: scenario.knowledge_documents || []
        }
      });

      if (error) {
        console.error('❌ Error from commercial-analysis function:', error);
        throw error;
      }

      // Map edge function response (in ES fields) to the UI structure (robust parsing)
      const analysisRaw = (data as any)?.analysis || {};

      const parseScore = (val: unknown): number => {
        const s = typeof val === 'string' ? val : String(val ?? '');
        const num = parseFloat(s.replace(/[^0-9.\-]/g, ''));
        return Number.isFinite(num) ? Math.round(Math.max(0, Math.min(100, num))) : 0;
      };

      const overall = parseScore(analysisRaw.puntuacion_general ?? finalScore ?? 0);
      const strengths = Array.isArray(analysisRaw.aspectos_positivos) ? analysisRaw.aspectos_positivos : [];
      const areas = Array.isArray(analysisRaw.areas_mejora) ? analysisRaw.areas_mejora : [];
      const momentos = Array.isArray(analysisRaw.momentos_clave) ? analysisRaw.momentos_clave : [];
      const recomendaciones = Array.isArray(analysisRaw.recomendaciones) ? analysisRaw.recomendaciones : [];
      const tecnicas = Array.isArray(analysisRaw.tecnicas_utilizadas) ? analysisRaw.tecnicas_utilizadas : [];
      const resumen = typeof analysisRaw.siguiente_paso === 'string' ? analysisRaw.siguiente_paso : '';

      // Build a simple detailed_scores using available data
      const avgMomentos = momentos.length
        ? Math.round(momentos.reduce((s: number, m: any) => s + parseScore(m?.puntuacion), 0) / momentos.length)
        : overall;

      const mapped: FeedbackAnalysis = {
        overall_score: overall,
        detailed_scores: {
          communication_skills: avgMomentos,
          problem_solving: Math.max(0, Math.min(100, overall - 5)),
          empathy: Math.max(0, Math.min(100, overall - 3)),
          product_knowledge: Math.max(0, Math.min(100, overall - 7)),
          call_resolution: overall,
        },
        strengths: strengths,
        areas_for_improvement: areas,
        key_insights: [...tecnicas, ...momentos.map((m: any) => `${m?.momento ?? 'Momento'}: ${m?.evaluacion ?? ''}`)].slice(0, 6),
        recommendations: recomendaciones,
        conversation_summary: resumen || 'Análisis generado automáticamente para esta sesión.'
      };

      setAnalysis(mapped);

      // Persist detailed analysis to training_sessions INCLUDING full ai_report
      // This ensures analysis is saved for ALL roles (agents, elevated, superAdmin)
      if (sessionId) {
        try {
          console.log('💾 Saving complete analysis to training_sessions for session:', sessionId);
          
          const completeReport = {
            overall_score: mapped.overall_score,
            detailed_scores: mapped.detailed_scores,
            strengths: mapped.strengths,
            areas_for_improvement: mapped.areas_for_improvement,
            key_insights: mapped.key_insights,
            recommendations: mapped.recommendations,
            conversation_summary: mapped.conversation_summary,
            generated_at: new Date().toISOString(),
            // Include all analysis data for consistency between live view and history
            full_analysis: analysisRaw
          };

          const updatePayload = {
            performance_score: mapped.overall_score,
            ai_summary: mapped.conversation_summary || 'Entrenamiento completado con análisis generado',
            insights: mapped.strengths,
            recommendations: mapped.recommendations,
            ai_report: completeReport // Complete analysis for history display consistent with live view
          };
          
          const { error: updateError } = await supabase.rpc('save_training_analysis_secure', {
            p_session_id: sessionId,
            p_performance_score: mapped.overall_score,
            p_ai_summary: mapped.conversation_summary || 'Entrenamiento completado con análisis generado',
            p_insights: mapped.strengths,
            p_recommendations: mapped.recommendations,
            p_ai_report: completeReport as any
          });

          if (updateError) {
            console.error('❌ Error guardando análisis (RPC) en training_sessions:', updateError);
            toast.error('No se pudo guardar el análisis completo. Verifique los permisos.');
          } else {
            console.log('✅ Análisis completo guardado en la sesión para historial:', sessionId);
            try { window.dispatchEvent(new CustomEvent('training-analysis-saved', { detail: { sessionId } })); } catch {}
            toast.success('Análisis guardado correctamente');
          }
        } catch (persistError) {
          console.error('❌ Error crítico guardando análisis:', persistError);
          toast.error('Error al guardar el análisis. Por favor contacte al administrador.');
        }
      } else {
        console.warn('⚠️ No sessionId available, cannot persist analysis');
      }
    } catch (error) {
      console.error('Error generating feedback:', error);
      toast.error('Error al generar el feedback. Mostrando análisis básico.');
      
      // Fallback analysis
      setAnalysis({
        overall_score: finalScore,
        detailed_scores: {
          communication_skills: Math.max(0, finalScore - 10),
          problem_solving: finalScore,
          empathy: Math.max(0, finalScore - 5),
          product_knowledge: Math.max(0, finalScore - 15),
          call_resolution: finalScore
        },
        strengths: [
          'Demostró buena disposición para resolver el caso',
          'Mantuvo un tono profesional durante la conversación'
        ],
        areas_for_improvement: [
          'Podría mejorar la escucha activa',
          'Necesita profundizar más en las necesidades del cliente'
        ],
        key_insights: [
          'La conversación tuvo una duración apropiada',
          'Se cubrieron los puntos principales del escenario'
        ],
        recommendations: [
          'Practicar técnicas de manejo de objeciones',
          'Estudiar más sobre los productos/servicios ofrecidos'
        ],
        conversation_summary: 'Conversación de entrenamiento completada con resultados satisfactorios.'
      });
    } finally {
      setLoading(false);
      try { onAnalysisComplete?.(); } catch {}
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreBadge = (score: number) => {
    if (score >= 90) return { variant: 'default' as const, text: 'Excelente', icon: Trophy };
    if (score >= 80) return { variant: 'secondary' as const, text: 'Muy Bueno', icon: Star };
    if (score >= 70) return { variant: 'outline' as const, text: 'Bueno', icon: CheckCircle };
    if (score >= 60) return { variant: 'outline' as const, text: 'Regular', icon: AlertCircle };
    return { variant: 'destructive' as const, text: 'Necesita Mejorar', icon: AlertCircle };
  };

  if (loading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Analizando tu desempeño</DialogTitle>
            <DialogDescription>
              Generando el análisis de la conversación del entrenamiento
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mb-4"></div>
            <h3 className="text-lg font-medium">Analizando tu desempeño...</h3>
            <p className="text-sm text-muted-foreground">Nuestros algoritmos están evaluando tu conversación</p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (!analysis) return null;

  const scoreBadge = getScoreBadge(analysis?.overall_score || 0);
  const ScoreIcon = scoreBadge.icon;

  return (
    <Dialog open={open} onOpenChange={onOpenChange} modal={true}>
      <DialogContent className="max-w-6xl h-[90vh] flex flex-col" onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader className="flex-shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-xl">Análisis de Desempeño</DialogTitle>
              <DialogDescription>
                Escenario: {scenario.name} • Categoría: {scenario.category}
              </DialogDescription>
            </div>
            <Badge variant={scoreBadge.variant} className="flex items-center gap-2 text-base px-4 py-2">
              <ScoreIcon className="h-4 w-4" />
              {scoreBadge.text}
            </Badge>
          </div>
        </DialogHeader>

        <ScrollArea className="flex-1">
          <div className="space-y-6 p-1">
            {/* Overall Score */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Trophy className="h-5 w-5" />
                  Puntuación General
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-center space-x-8">
                  <div className="text-center">
                    <div className={`text-6xl font-bold ${getScoreColor(analysis?.overall_score || 0)}`}>
                      {analysis?.overall_score || 0}
                    </div>
                    <div className="text-sm text-muted-foreground">de 100 puntos</div>
                  </div>
                    <div className="text-center space-y-2">
                      <div className="text-lg text-foreground font-medium">
                        {analysis?.conversation_summary || 'Análisis en progreso...'}
                      </div>
                    </div>
                </div>
              </CardContent>
            </Card>

            {/* Detailed Scores */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Puntuaciones Detalladas
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {analysis?.detailed_scores && Object.entries(analysis.detailed_scores).map(([key, score]) => {
                  const labels: Record<string, string> = {
                    communication_skills: 'Habilidades de Comunicación',
                    problem_solving: 'Resolución de Problemas',
                    empathy: 'Empatía',
                    product_knowledge: 'Conocimiento del Producto',
                    call_resolution: 'Resolución de la Llamada'
                  };
                  
                  return (
                    <div key={key} className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium">{labels[key]}</span>
                        <span className={`text-sm font-bold ${getScoreColor(score)}`}>
                          {score}/100
                        </span>
                      </div>
                      <Progress value={score} className="h-2" />
                    </div>
                  );
                })}
              </CardContent>
            </Card>

            <div className="grid md:grid-cols-2 gap-6">
              {/* Strengths */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-green-600">
                    <CheckCircle className="h-5 w-5" />
                    Fortalezas Identificadas
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {analysis?.strengths?.map((strength, index) => (
                      <li key={index} className="flex items-start gap-2 text-sm">
                        <span className="text-green-500 mt-1">✓</span>
                        <span>{strength}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>

              {/* Areas for Improvement */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-amber-600">
                    <AlertCircle className="h-5 w-5" />
                    Áreas de Mejora
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {analysis?.areas_for_improvement?.map((area, index) => (
                      <li key={index} className="flex items-start gap-2 text-sm">
                        <span className="text-amber-500 mt-1">⚠</span>
                        <span>{area}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </div>

            {/* Key Insights */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageCircle className="h-5 w-5" />
                  Insights Clave
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {analysis?.key_insights?.map((insight, index) => (
                    <li key={index} className="flex items-start gap-2 text-sm">
                      <span className="text-blue-500 mt-1">💡</span>
                      <span>{insight}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            {/* Recommendations */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Lightbulb className="h-5 w-5" />
                  Recomendaciones para Mejorar
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  {analysis?.recommendations?.map((recommendation, index) => (
                    <li key={index} className="flex items-start gap-3 text-sm p-3 bg-muted rounded-lg">
                      <Target className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                      <span>{recommendation}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </div>
        </ScrollArea>

        <Separator />

        <div className="flex justify-between items-center pt-4">
          <div className="text-sm text-muted-foreground">
            Análisis generado con IA • {new Date().toLocaleDateString()}
          </div>
          <div className="flex gap-2">
            <Button variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Descargar Reporte
            </Button>
            <Button onClick={() => onOpenChange(false)}>
              Finalizar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}