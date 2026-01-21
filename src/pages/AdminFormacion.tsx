import React, { useState } from 'react';
import Layout from "@/components/layout/Layout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScenarioManager } from '@/components/training/admin/ScenarioManager';
import { VoiceManager } from '@/components/training/admin/VoiceManager';
import { TrainingConversation } from '@/components/training/admin/TrainingConversation';
import { KnowledgeManager } from '@/components/training/admin/KnowledgeManager';
import { ElevenLabsConfig } from '@/components/training/admin/ElevenLabsConfig';
import { RoleBasedRoute } from '@/components/training/RoleBasedRoute';
import { useAuth } from '@/context/AuthContext';
import { Play, Volume2, BookOpen, Cpu, MessageSquare } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { useDetailedMetrics } from "@/hooks/useDetailedMetrics";
import { useAccount } from "@/context/AccountContext";
import { format, startOfMonth, endOfMonth } from "date-fns";

export default function AdminFormacionPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'superAdmin' || user?.role === 'admin';
  const { selectedAccountId } = useAccount();

  // Métricas por cuenta con navegación mensual para Training AI
  const [metricsMonth, setMetricsMonth] = useState<Date>(new Date());
  const dateFrom = format(startOfMonth(metricsMonth), 'yyyy-MM-dd');
  const dateTo = format(endOfMonth(metricsMonth), 'yyyy-MM-dd');
  const { data: metricsData, isLoading: loadingMetrics, refetch: refetchMetrics } = useDetailedMetrics(selectedAccountId || "all", dateFrom, dateTo);
  const accountMetrics = metricsData && metricsData.length > 0 ? metricsData[0] : null;

  const goPrevMonth = () => {
    const d = new Date(metricsMonth);
    d.setMonth(d.getMonth() - 1);
    setMetricsMonth(d);
  };
  const goNextMonth = () => {
    const d = new Date(metricsMonth);
    d.setMonth(d.getMonth() + 1);
    setMetricsMonth(d);
  };

  // Refrescar al cambiar mes o cuenta
  React.useEffect(() => {
    refetchMetrics();
  }, [metricsMonth, selectedAccountId]);

  return (
    <Layout>
      <RoleBasedRoute 
        moduleName="admin-formacion"
        fallbackMessage="No tienes permisos para acceder a la administración de formación"
      >
        <div className="space-y-6">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Admin Formación</h2>
            <p className="text-muted-foreground">
              Administración y gestión del sistema de formación
            </p>
          </div>
          
          <Tabs defaultValue="escenarios" className="space-y-6">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="escenarios" className="flex items-center gap-2">
                <Play className="h-4 w-4" />
                Escenarios
              </TabsTrigger>
              {isAdmin && (
                <TabsTrigger value="voces" className="flex items-center gap-2">
                  <Volume2 className="h-4 w-4" />
                  Voces
                </TabsTrigger>
              )}
              {isAdmin && (
                <TabsTrigger value="conversacion" className="flex items-center gap-2">
                  <Volume2 className="h-4 w-4" />
                  Conversación
                </TabsTrigger>
              )}
              {isAdmin && (
                <TabsTrigger value="conocimiento" className="flex items-center gap-2">
                  <BookOpen className="h-4 w-4" />
                  Conocimiento
                </TabsTrigger>
              )}
            </TabsList>

          {/* Consumo - Training AI (compacto y plegable) */}
          <Collapsible defaultOpen={false}>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 py-2 px-3">
                <CardTitle className="text-base">Consumo - Training AI</CardTitle>
                <CollapsibleTrigger asChild>
                  <button className="text-sm text-muted-foreground hover:underline">Ver/Ocultar</button>
                </CollapsibleTrigger>
              </CardHeader>
              <CollapsibleContent>
                <CardContent className="py-3 px-3">
                  <div className="flex items-center justify-between mb-2 text-xs text-muted-foreground">
                    <button className="px-2 py-1 rounded border" onClick={goPrevMonth} type="button">◀</button>
                    <span>{format(metricsMonth, 'MMMM yyyy')}</span>
                    <button className="px-2 py-1 rounded border" onClick={goNextMonth} type="button">▶</button>
                  </div>
                  {loadingMetrics ? (
                    <div className="grid gap-3 sm:grid-cols-2">
                      <Skeleton className="h-14 w-full" />
                      <Skeleton className="h-14 w-full" />
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="text-[11px] uppercase tracking-wide text-muted-foreground font-medium">Training AI</div>
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-1.5">
                          <Label className="flex items-center gap-1.5 text-sm">
                            <Cpu className="h-3 w-3" />
                            Minutos de Entrenamiento - Voz
                          </Label>
                          <Progress 
                            value={Math.min(accountMetrics?.porcentaje_entrenamiento || 0, 100)} 
                            className={`h-1.5 ${(accountMetrics?.porcentaje_entrenamiento || 0) >= 100 ? 'bg-red-100' : (accountMetrics?.porcentaje_entrenamiento || 0) >= 90 ? 'bg-yellow-100' : ''}`}
                          />
                          <div className="flex justify-between text-[11px] text-muted-foreground">
                            <span>{(accountMetrics?.porcentaje_entrenamiento || 0).toFixed(1)}% utilizado</span>
                            {accountMetrics && (
                              <span>
                                {(accountMetrics.uso_minutos_entrenamiento_mes || 0).toFixed(2)} / {(accountMetrics.limite_minutos_entrenamiento || 0)} minutos
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="space-y-1.5">
                          <Label className="flex items-center gap-1.5 text-sm">
                            <MessageSquare className="h-3 w-3" />
                            Mensajes de Chat - IA
                          </Label>
                          <Progress 
                            value={Math.min(accountMetrics?.porcentaje_mensajes_chat || 0, 100)} 
                            className={`h-1.5 ${(accountMetrics?.porcentaje_mensajes_chat || 0) >= 100 ? 'bg-red-100' : (accountMetrics?.porcentaje_mensajes_chat || 0) >= 90 ? 'bg-yellow-100' : ''}`}
                          />
                          <div className="flex justify-between text-[11px] text-muted-foreground">
                            <span>{(accountMetrics?.porcentaje_mensajes_chat || 0).toFixed(1)}% utilizado</span>
                            {accountMetrics && (
                              <span>
                                {(accountMetrics.uso_mensajes_chat_mes || 0).toLocaleString()} / {(accountMetrics.limite_mensajes_chat || 0)} mensajes
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>

            <TabsContent value="escenarios">
              <ScenarioManager />
            </TabsContent>

            {isAdmin && (
              <TabsContent value="voces" className="space-y-6">
                <ElevenLabsConfig />
                <VoiceManager />
              </TabsContent>
            )}

            {isAdmin && (
              <TabsContent value="conversacion">
                <TrainingConversation scenario={undefined} />
              </TabsContent>
            )}

            {isAdmin && (
              <TabsContent value="conocimiento">
                <KnowledgeManager />
              </TabsContent>
            )}
          </Tabs>
        </div>
      </RoleBasedRoute>
    </Layout>
  );
}