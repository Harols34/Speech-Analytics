
import React, { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Clock, MessageSquare, Cpu, DollarSign, FileAudio, TrendingUp, AlertTriangle, RefreshCw, Download } from "lucide-react";
import * as XLSX from 'xlsx';
import { format, startOfMonth, endOfMonth } from "date-fns";
import { es } from "date-fns/locale";
import { useDetailedMetrics } from "@/hooks/useDetailedMetrics";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";

interface Account {
  id: string;
  name: string;
}

export default function LimitsMetrics() {
  const { user } = useAuth();
  const [selectedAccount, setSelectedAccount] = useState<string>("all");
  const [dateFrom, setDateFrom] = useState<string>(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
  const [dateTo, setDateTo] = useState<string>(format(endOfMonth(new Date()), 'yyyy-MM-dd'));
  const [resourceType, setResourceType] = useState<string>("all");

  // Get accounts
  const { data: accounts, isLoading: loadingAccounts, error: accountsError } = useQuery({
    queryKey: ['accounts'],
    queryFn: async () => {
      console.log('Fetching accounts for limits metrics');
      const { data, error } = await supabase
        .from('accounts')
        .select('id, name')
        .order('name');
      
      if (error) {
        console.error('Error fetching accounts:', error);
        throw error;
      }
      
      console.log('Accounts fetched:', data);
      return data as Account[];
    },
    enabled: !!user,
    retry: 3,
    retryDelay: 1000,
  });

  // Get detailed metrics using the hook
  const { 
    data: metricsData, 
    isLoading: loadingMetrics, 
    error: metricsError,
    refetch: refetchMetrics 
  } = useDetailedMetrics(selectedAccount, dateFrom, dateTo);

  const handleRefresh = () => {
    console.log('Manual refresh triggered');
    refetchMetrics();
    toast.success("Actualizando métricas...");
  };

  const handleExportToExcel = () => {
    if (!metricsData || metricsData.length === 0) {
      toast.error("No hay datos para exportar");
      return;
    }

    const exportData: any[] = metricsData.map(metrics => {
      const accountCosts = calculateCosts(metrics.uso_transcripcion_mes, metrics.costo_total_mes);
      
      return {
        'Cuenta': metrics.account_name,
        'Horas Transcripción Utilizadas': metrics.uso_transcripcion_mes.toFixed(2),
        'Límite Horas Transcripción': metrics.limite_horas + (metrics.horas_adicionales || 0),
        'Horas Disponibles': Math.max(0, (metrics.limite_horas + (metrics.horas_adicionales || 0)) - metrics.uso_transcripcion_mes).toFixed(2),
        'Porcentaje Transcripción': `${metrics.porcentaje_transcripcion.toFixed(1)}%`,
        'Consultas Chatbot Utilizadas': metrics.uso_consultas_mes,
        'Límite Consultas Chatbot': metrics.limite_consultas,
        'Consultas Disponibles': Math.max(0, metrics.limite_consultas - metrics.uso_consultas_mes),
        'Porcentaje Consultas': `${metrics.porcentaje_consultas.toFixed(1)}%`,
        'Chat Llamada': metrics.uso_chat_llamada_mes,
        'Chat General': metrics.uso_chat_general_mes,
        'Total Grabaciones': metrics.total_grabaciones,
        'Minutos Entrenamiento Voz': metrics.uso_minutos_entrenamiento_mes?.toFixed(2) || '0.00',
        'Mensajes Chat IA': metrics.uso_mensajes_chat_mes || 0,
        'Costo Infraestructura (USD)': accountCosts.infra.toFixed(2),
        'Costo Transcripción (USD)': accountCosts.voice.toFixed(2),
        'Costo Entrenamiento Voz (USD)': ((metrics.uso_minutos_entrenamiento_mes || 0) * 0.40).toFixed(2),
        'Costo Chat IA (USD)': ((metrics.uso_mensajes_chat_mes || 0) * 0.0030).toFixed(2),
        'Costo Total (USD)': accountCosts.total.toFixed(2)
      };
    });

    // Add global totals if viewing all accounts
    if (globalMetrics && metricsData.length > 1) {
      exportData.push({
        'Cuenta': '--- TOTALES GLOBALES ---',
        'Horas Transcripción Utilizadas': globalMetrics.uso_transcripcion_mes.toFixed(2),
        'Límite Horas Transcripción': '-',
        'Horas Disponibles': '-',
        'Porcentaje Transcripción': '-',
        'Consultas Chatbot Utilizadas': globalMetrics.uso_consultas_mes,
        'Límite Consultas Chatbot': '-',
        'Consultas Disponibles': '-',
        'Porcentaje Consultas': '-',
        'Chat Llamada': globalMetrics.uso_chat_llamada_mes,
        'Chat General': globalMetrics.uso_chat_general_mes,
        'Total Grabaciones': globalMetrics.total_grabaciones,
        'Minutos Entrenamiento Voz': (globalMetrics.uso_minutos_entrenamiento_mes || 0).toFixed(2),
        'Mensajes Chat IA': globalMetrics.uso_mensajes_chat_mes || 0,
        'Costo Infraestructura (USD)': globalMetrics.costs.infra.toFixed(2),
        'Costo Transcripción (USD)': globalMetrics.costs.voice.toFixed(2),
        'Costo Entrenamiento Voz (USD)': ((globalMetrics.uso_minutos_entrenamiento_mes || 0) * 0.40).toFixed(2),
        'Costo Chat IA (USD)': ((globalMetrics.uso_mensajes_chat_mes || 0) * 0.0030).toFixed(2),
        'Costo Total (USD)': globalMetrics.costs.total.toFixed(2)
      });
    }

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Métricas de Límites');

    // Auto-fit columns
    const colWidths = Object.keys(exportData[0] || {}).map(key => ({
      wch: Math.max(key.length, 15)
    }));
    worksheet['!cols'] = colWidths;

    const fileName = `metricas_limites_${dateFrom}_${dateTo}.xlsx`;
    XLSX.writeFile(workbook, fileName);
    
    toast.success("Archivo Excel descargado exitosamente");
  };

  const formatHours = (hours: number) => {
    const h = Math.floor(hours);
    const m = Math.floor((hours % 1) * 60);
    const s = Math.floor(((hours % 1) * 60 % 1) * 60);
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(amount);
  };

  // Calculate costs for each account - Separated by Voice and Chat
  const calculateCosts = (hours: number, openaiCost: number, trainingMinutes: number = 0, chatMessages: number = 0) => {
    const infraCost = 25; // Fixed infrastructure cost
    const voiceCost = hours * 0.50; // Hours * $0.50 (Voice mode)
    const trainingCost = trainingMinutes * 0.40; // Training minutes * $0.40 (Voice mode)
    const chatCost = chatMessages * 0.0030; // Chat messages * $0.0030 (Chat mode)
    const totalCost = infraCost + voiceCost + openaiCost + trainingCost + chatCost;
    
    return {
      infra: infraCost,
      voice: voiceCost,
      openai: openaiCost,
      training: trainingCost,
      chat: chatCost,
      total: totalCost
    };
  };

  // Calculate global metrics
  const globalMetrics = useMemo(() => {
    if (!metricsData || metricsData.length === 0) return null;
    
    const totalHours = metricsData.reduce((sum, m) => sum + (m.uso_transcripcion_mes || 0), 0);
    const totalOpenAICost = metricsData.reduce((sum, m) => sum + (m.costo_total_mes || 0), 0);
    const totalTrainingMinutes = metricsData.reduce((sum, m) => sum + (m.uso_minutos_entrenamiento_mes || 0), 0);
    const totalChatMessages = metricsData.reduce((sum, m) => sum + (m.uso_mensajes_chat_mes || 0), 0);
    const globalCosts = calculateCosts(totalHours, totalOpenAICost, totalTrainingMinutes, totalChatMessages);
    
    return {
      total_grabaciones: metricsData.reduce((sum, m) => sum + (m.total_grabaciones || 0), 0),
      uso_transcripcion_mes: totalHours,
      uso_consultas_mes: metricsData.reduce((sum, m) => sum + (m.uso_consultas_mes || 0), 0),
      uso_chat_llamada_mes: metricsData.reduce((sum, m) => sum + (m.uso_chat_llamada_mes || 0), 0),
      uso_chat_general_mes: metricsData.reduce((sum, m) => sum + (m.uso_chat_general_mes || 0), 0),
      uso_minutos_entrenamiento_mes: totalTrainingMinutes,
      uso_mensajes_chat_mes: totalChatMessages,
      tokens_totales_mes: metricsData.reduce((sum, m) => sum + (m.tokens_totales_mes || 0), 0),
      costo_total_mes: totalOpenAICost,
      costs: globalCosts,
    };
  }, [metricsData]);

  // Total tokens across all accounts
  const totalTokens = useMemo(() => {
    if (!metricsData) return 0;
    return metricsData.reduce((sum, metrics) => sum + (metrics.tokens_totales_mes || 0), 0);
  }, [metricsData]);

  // Filter metrics data by resource type
  const filteredMetricsData = useMemo(() => {
    if (!metricsData) return null;
    
    // If "all" or no filter, return all data
    if (resourceType === "all") return metricsData;
    
    // Filter accounts that have usage in the selected resource type
    return metricsData.filter(metrics => {
      switch (resourceType) {
        case "transcripcion":
          return metrics.uso_transcripcion_mes > 0;
        case "chat_llamada":
          return metrics.uso_chat_llamada_mes > 0;
        case "chat_general":
          return metrics.uso_chat_general_mes > 0;
        default:
          return true;
      }
    });
  }, [metricsData, resourceType]);

  if (!user) {
    return (
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          Debes estar autenticado para ver las métricas.
        </AlertDescription>
      </Alert>
    );
  }

  if (loadingAccounts) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Cargando cuentas...</span>
      </div>
    );
  }

  if (accountsError) {
    console.error('Accounts error:', accountsError);
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          Error al cargar las cuentas: {accountsError.message}
        </AlertDescription>
      </Alert>
    );
  }

  if (metricsError) {
    console.error('Metrics error:', metricsError);
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          Error al cargar las métricas: {metricsError.message}
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleRefresh}
            className="ml-2"
          >
            <RefreshCw className="h-4 w-4 mr-1" />
            Reintentar
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="grid gap-4 md:grid-cols-4">
        <div className="space-y-2">
          <Label>Cuenta</Label>
          <Select value={selectedAccount} onValueChange={setSelectedAccount}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas las cuentas</SelectItem>
              {accounts?.map((account) => (
                <SelectItem key={account.id} value={account.id}>
                  {account.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Desde</Label>
          <Input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label>Hasta</Label>
          <Input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label>Tipo de Recurso</Label>
          <Select value={resourceType} onValueChange={setResourceType}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="transcripcion">Transcripción</SelectItem>
              <SelectItem value="chat_llamada">Chat de Llamada</SelectItem>
              <SelectItem value="chat_general">Chat General</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex justify-between items-center">
        <div className="flex gap-2">
          <Button onClick={handleRefresh} variant="outline" disabled={loadingMetrics}>
            {loadingMetrics ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <TrendingUp className="h-4 w-4 mr-2" />
            )}
            Actualizar
          </Button>
          <Button 
            onClick={handleExportToExcel} 
            variant="outline" 
            disabled={loadingMetrics || !metricsData || metricsData.length === 0}
          >
            <Download className="h-4 w-4 mr-2" />
            Descargar Excel
          </Button>
        </div>
        <div className="text-sm text-muted-foreground">
          Período: {dateFrom} a {dateTo}
        </div>
      </div>

      {loadingMetrics ? (
        <div className="flex items-center justify-center p-8">
          <Loader2 className="h-8 w-8 animate-spin" />
          <span className="ml-2">Cargando métricas...</span>
        </div>
      ) : (
        <>
          {/* Global Metrics */}
          {globalMetrics && metricsData && metricsData.length > 1 && (
            <>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Grabaciones</CardTitle>
                    <FileAudio className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{globalMetrics.total_grabaciones}</div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Horas Transcritas</CardTitle>
                    <Clock className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{formatHours(globalMetrics.uso_transcripcion_mes)}</div>
                    <div className="text-xs text-muted-foreground">
                      {globalMetrics.uso_transcripcion_mes.toFixed(2)} horas
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Consultas</CardTitle>
                    <MessageSquare className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{globalMetrics.uso_consultas_mes}</div>
                    <div className="text-xs text-muted-foreground">
                      Llamada: {globalMetrics.uso_chat_llamada_mes} | General: {globalMetrics.uso_chat_general_mes}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Minutos Entrenamiento - Voz</CardTitle>
                    <Cpu className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{(globalMetrics.uso_minutos_entrenamiento_mes || 0).toFixed(2)}</div>
                    <div className="text-xs text-muted-foreground">
                      Costo: {formatCurrency((globalMetrics.uso_minutos_entrenamiento_mes || 0) * 0.40)}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Mensajes Chat - IA</CardTitle>
                    <MessageSquare className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{(globalMetrics.uso_mensajes_chat_mes || 0).toLocaleString()}</div>
                    <div className="text-xs text-muted-foreground">
                      Costo: {formatCurrency((globalMetrics.uso_mensajes_chat_mes || 0) * 0.0030)}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Global Cost Breakdown */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4" />
                    Desglose de Costos Globales
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
                    <div className="p-4 border rounded-lg">
                      <div className="font-semibold text-sm mb-2 text-blue-600">Infra (Fijo)</div>
                      <div className="text-2xl font-bold">{formatCurrency(globalMetrics.costs.infra)}</div>
                    </div>
                    <div className="p-4 border rounded-lg">
                      <div className="font-semibold text-sm mb-2 text-green-600">Modo Voz (Horas × $0.50)</div>
                      <div className="text-2xl font-bold">{formatCurrency(globalMetrics.costs.voice)}</div>
                      <div className="text-xs text-muted-foreground">
                        {globalMetrics.uso_transcripcion_mes.toFixed(2)} horas
                      </div>
                    </div>
                    <div className="p-4 border rounded-lg">
                      <div className="font-semibold text-sm mb-2 text-purple-600">Entrenamiento Voz</div>
                      <div className="text-2xl font-bold">{formatCurrency(globalMetrics.costs.training)}</div>
                      <div className="text-xs text-muted-foreground">
                        {(globalMetrics.uso_minutos_entrenamiento_mes || 0).toFixed(2)} minutos
                      </div>
                    </div>
                    <div className="p-4 border rounded-lg">
                      <div className="font-semibold text-sm mb-2 text-indigo-600">Modo Chat (Msg × $0.0030)</div>
                      <div className="text-2xl font-bold">{formatCurrency(globalMetrics.costs.chat)}</div>
                      <div className="text-xs text-muted-foreground">
                        {(globalMetrics.uso_mensajes_chat_mes || 0).toLocaleString()} mensajes
                      </div>
                    </div>
                    <div className="p-4 border rounded-lg bg-orange-50">
                      <div className="font-semibold text-sm mb-2 text-orange-600">Total</div>
                      <div className="text-2xl font-bold text-orange-700">{formatCurrency(globalMetrics.costs.total)}</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </>
          )}

          {/* Account Metrics */}
          <div className="grid gap-6">
            {filteredMetricsData && filteredMetricsData.length > 0 ? (
              filteredMetricsData.map((metrics) => {
                const accountCosts = calculateCosts(metrics.uso_transcripcion_mes, metrics.costo_total_mes, metrics.uso_minutos_entrenamiento_mes || 0, metrics.uso_mensajes_chat_mes || 0);
                
                return (
                  <Card key={metrics.account_id}>
                    <CardHeader>
                      <CardTitle className="flex items-center justify-between">
                        {metrics.account_name}
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">
                            {metrics.account_id.slice(0, 8)}...
                          </Badge>
                          {(metrics.porcentaje_transcripcion >= 100 || metrics.porcentaje_consultas >= 100 || (metrics.porcentaje_entrenamiento || 0) >= 100 || (metrics.porcentaje_mensajes_chat || 0) >= 100) && (
                            <Badge variant="destructive" className="flex items-center gap-1">
                              <AlertTriangle className="h-3 w-3" />
                              Límite Alcanzado
                            </Badge>
                          )}
                          {(metrics.porcentaje_transcripcion >= 90 || metrics.porcentaje_consultas >= 90 || (metrics.porcentaje_entrenamiento || 0) >= 90 || (metrics.porcentaje_mensajes_chat || 0) >= 90) && 
                           (metrics.porcentaje_transcripcion < 100 && metrics.porcentaje_consultas < 100 && (metrics.porcentaje_entrenamiento || 0) < 100 && (metrics.porcentaje_mensajes_chat || 0) < 100) && (
                            <Badge variant="secondary" className="flex items-center gap-1">
                              <AlertTriangle className="h-3 w-3" />
                              Cerca del Límite
                            </Badge>
                          )}
                        </div>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      {/* Group 1: Speech analytics */}
                      <div className="space-y-4">
                        <div className="text-xs uppercase tracking-wide text-muted-foreground font-medium">Speech analytics</div>
                        {/* Transcription Limits */}
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <Label className="flex items-center gap-2">
                              <Clock className="h-4 w-4" />
                              Transcripción
                            </Label>
                            <div className="text-sm text-muted-foreground">
                              {formatHours(metrics.uso_transcripcion_mes)} / {metrics.limite_horas + (metrics.horas_adicionales || 0)} horas
                            </div>
                          </div>
                          <Progress 
                            value={Math.min(metrics.porcentaje_transcripcion, 100)} 
                            className={`h-2 ${metrics.porcentaje_transcripcion >= 100 ? 'bg-red-100' : metrics.porcentaje_transcripcion >= 90 ? 'bg-yellow-100' : ''}`}
                          />
                          <div className="flex justify-between text-xs text-muted-foreground">
                            <span>{metrics.porcentaje_transcripcion.toFixed(1)}% utilizado</span>
                            {metrics.horas_adicionales > 0 && (
                              <span className="text-green-600">+{metrics.horas_adicionales} horas adicionales</span>
                            )}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Equivale a {metrics.uso_transcripcion_mes.toFixed(2)} horas
                          </div>
                        </div>

                        {/* Chatbot Queries Limits */}
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <Label className="flex items-center gap-2">
                              <MessageSquare className="h-4 w-4" />
                              Consultas de Chatbot
                            </Label>
                            <div className="text-sm text-muted-foreground">
                              {metrics.uso_consultas_mes} / {metrics.limite_consultas} consultas
                            </div>
                          </div>
                          <Progress 
                            value={Math.min(metrics.porcentaje_consultas, 100)} 
                            className={`h-2 ${metrics.porcentaje_consultas >= 100 ? 'bg-red-100' : metrics.porcentaje_consultas >= 90 ? 'bg-yellow-100' : ''}`}
                          />
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <span className="text-muted-foreground">Chat de llamada:</span>
                              <span className="ml-2 font-medium">{metrics.uso_chat_llamada_mes}</span>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Chat general:</span>
                              <span className="ml-2 font-medium">{metrics.uso_chat_general_mes}</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      <Separator />

                      {/* Group 2: Training AI */}
                      <div className="space-y-4">
                        <div className="text-xs uppercase tracking-wide text-muted-foreground font-medium">Training AI</div>
                        {/* Training Limits - Voice Mode */}
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <Label className="flex items-center gap-2">
                              <Cpu className="h-4 w-4" />
                              Minutos de Entrenamiento - Voz
                            </Label>
                            <div className="text-sm text-muted-foreground">
                              {(metrics.uso_minutos_entrenamiento_mes || 0).toFixed(2)} / {metrics.limite_minutos_entrenamiento} minutos
                            </div>
                          </div>
                          <Progress 
                            value={Math.min(metrics.porcentaje_entrenamiento || 0, 100)} 
                            className={`h-2 ${(metrics.porcentaje_entrenamiento || 0) >= 100 ? 'bg-red-100' : (metrics.porcentaje_entrenamiento || 0) >= 90 ? 'bg-yellow-100' : ''}`}
                          />
                          <div className="text-xs text-muted-foreground">
                            {(metrics.porcentaje_entrenamiento || 0).toFixed(1)}% utilizado
                          </div>
                        </div>

                        {/* Chat Messages Limits - Chat Mode */}
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <Label className="flex items-center gap-2">
                              <MessageSquare className="h-4 w-4" />
                              Mensajes de Chat - IA
                            </Label>
                            <div className="text-sm text-muted-foreground">
                              {(metrics.uso_mensajes_chat_mes || 0).toLocaleString()} / {metrics.limite_mensajes_chat || 0} mensajes
                            </div>
                          </div>
                          <Progress 
                            value={Math.min((metrics.porcentaje_mensajes_chat || 0), 100)} 
                            className={`h-2 ${(metrics.porcentaje_mensajes_chat || 0) >= 100 ? 'bg-red-100' : (metrics.porcentaje_mensajes_chat || 0) >= 90 ? 'bg-yellow-100' : ''}`}
                          />
                          <div className="text-xs text-muted-foreground">
                            {(metrics.porcentaje_mensajes_chat || 0).toFixed(1)}% utilizado
                          </div>
                        </div>
                      </div>

                      <Separator />

                       {/* Additional Information */}
                         <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                         <div>
                           <div className="text-muted-foreground">Grabaciones</div>
                           <div className="font-medium">{metrics.total_grabaciones}</div>
                         </div>
                         <div>
                           <div className="text-muted-foreground">Minutos Entrenamiento Voz</div>
                           <div className="font-medium">{(metrics.uso_minutos_entrenamiento_mes || 0).toFixed(2)}</div>
                         </div>
                         <div>
                           <div className="text-muted-foreground">Mensajes Chat IA</div>
                           <div className="font-medium">{(metrics.uso_mensajes_chat_mes || 0).toLocaleString()}</div>
                         </div>
                         <div>
                           <div className="text-muted-foreground">% Entrenamiento Voz</div>
                           <div className="font-medium">{(metrics.porcentaje_entrenamiento || 0).toFixed(1)}%</div>
                         </div>
                         <div>
                           <div className="text-muted-foreground">% Mensajes Chat IA</div>
                           <div className="font-medium">{(metrics.porcentaje_mensajes_chat || 0).toFixed(1)}%</div>
                         </div>
                       </div>

                      <Separator />

                      {/* Cost Breakdown for Account */}
                      <div>
                        <Label className="flex items-center gap-2 mb-3">
                          <DollarSign className="h-4 w-4" />
                          Desglose de Costos
                        </Label>
                         <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                           <div className="p-3 border rounded-lg">
                             <div className="text-xs text-muted-foreground mb-1">Infra (Fijo)</div>
                             <div className="font-bold text-blue-600">{formatCurrency(accountCosts.infra)}</div>
                           </div>
                           <div className="p-3 border rounded-lg">
                             <div className="text-xs text-muted-foreground mb-1">Modo Voz (Horas × $0.50)</div>
                             <div className="font-bold text-green-600">{formatCurrency(accountCosts.voice)}</div>
                           </div>
                           <div className="p-3 border rounded-lg">
                             <div className="text-xs text-muted-foreground mb-1">Entrenamiento Voz (Min × $0.40)</div>
                             <div className="font-bold text-purple-600">{formatCurrency(accountCosts.training)}</div>
                           </div>
                           <div className="p-3 border rounded-lg">
                             <div className="text-xs text-muted-foreground mb-1">Modo Chat (Msg × $0.0030)</div>
                             <div className="font-bold text-indigo-600">{formatCurrency(accountCosts.chat)}</div>
                           </div>
                           <div className="p-3 border rounded-lg bg-orange-50">
                             <div className="text-xs text-muted-foreground mb-1">Total</div>
                             <div className="font-bold text-orange-700">{formatCurrency(accountCosts.total)}</div>
                           </div>
                         </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            ) : (
              <Card>
                <CardContent className="text-center py-8">
                  <p className="text-muted-foreground">
                    No hay datos disponibles para el período seleccionado
                    {resourceType !== "all" && " con el tipo de recurso seleccionado"}
                  </p>
                  <p className="text-sm text-muted-foreground mt-2">
                    Cuenta: {selectedAccount === "all" ? "Todas" : accounts?.find(a => a.id === selectedAccount)?.name || "Desconocida"}
                    {resourceType !== "all" && ` | Filtro: ${resourceType}`}
                  </p>
                  <Button 
                    variant="outline" 
                    onClick={handleRefresh}
                    className="mt-4"
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Reintentar
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </>
      )}
    </div>
  );
}
