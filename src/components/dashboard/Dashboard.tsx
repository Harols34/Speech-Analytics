
import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart3, TrendingUp, Users, Phone, Calendar, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { useAccount } from "@/context/AccountContext";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import ResultsChart from "@/components/analytics/ResultsChart";
import { ResultsData } from "@/components/analytics/AnalyticsUtils";

interface DashboardMetrics {
  totalCalls: number;
  totalAgents: number;
  avgScore: number;
  completeCalls: number;
  salesResults: ResultsData[];
}

export default function Dashboard() {
  const [metrics, setMetrics] = useState<DashboardMetrics>({
    totalCalls: 0,
    totalAgents: 0,
    avgScore: 0,
    completeCalls: 0,
    salesResults: []
  });
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuth();
  const { selectedAccountId, userAccounts } = useAccount();

  useEffect(() => {
    if (user) {
      fetchMetrics();
    }
  }, [user, selectedAccountId]);

  const fetchMetrics = async () => {
    try {
      setIsLoading(true);
      console.log("Fetching dashboard metrics for account:", selectedAccountId);

      // Construir query para llamadas con filtro de cuenta
      let callsQuery = supabase.from('calls').select('*');
      
      if (selectedAccountId && selectedAccountId !== 'all') {
        console.log("Filtering dashboard data by account:", selectedAccountId);
        callsQuery = callsQuery.eq('account_id', selectedAccountId);
      }

      const { data: calls, error: callsError } = await callsQuery;
      
      if (callsError) throw callsError;

      // Construir query para agentes con filtro de cuenta
      let agentsQuery = supabase.from('agents').select('*');
      
      if (selectedAccountId && selectedAccountId !== 'all') {
        agentsQuery = agentsQuery.eq('account_id', selectedAccountId);
      }

      const { data: agents, error: agentsError } = await agentsQuery;
      
      if (agentsError) throw agentsError;

      // Construir query para feedback con filtro de cuenta
      let feedbackQuery = supabase.from('feedback').select('score');
      
      if (selectedAccountId && selectedAccountId !== 'all') {
        feedbackQuery = feedbackQuery.eq('account_id', selectedAccountId);
      }

      const { data: feedback, error: feedbackError } = await feedbackQuery;
      
      if (feedbackError) throw feedbackError;

      const totalCalls = calls?.length || 0;
      const totalAgents = agents?.length || 0;
      const completeCalls = calls?.filter(call => call.status === 'complete').length || 0;
      
      const avgScore = feedback && feedback.length > 0 
        ? Math.round(feedback.reduce((sum, f) => sum + (f.score || 0), 0) / feedback.length)
        : 0;

      // Calcular resultados de ventas
      const salesCounts = calls?.reduce((acc, call) => {
        if (call.result === 'venta') {
          acc.ventas++;
        } else if (call.result === 'no venta') {
          acc.noVentas++;
        } else {
          acc.pendientes++;
        }
        return acc;
      }, { ventas: 0, noVentas: 0, pendientes: 0 }) || { ventas: 0, noVentas: 0, pendientes: 0 };

      const salesResults: ResultsData[] = [
        { name: 'Ventas', value: salesCounts.ventas, color: '#10B981' },
        { name: 'No Ventas', value: salesCounts.noVentas, color: '#EF4444' },
        { name: 'Pendientes', value: salesCounts.pendientes, color: '#F59E0B' }
      ].filter(item => item.value > 0);

      console.log("Dashboard metrics calculated:", {
        totalCalls,
        totalAgents,
        avgScore,
        completeCalls,
        salesResults
      });

      setMetrics({
        totalCalls,
        totalAgents,
        avgScore,
        completeCalls,
        salesResults
      });
    } catch (error) {
      console.error("Error fetching dashboard metrics:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const getAccountName = () => {
    if (!selectedAccountId || selectedAccountId === 'all') {
      return 'Todas las cuentas';
    }
    const account = userAccounts.find(acc => acc.id === selectedAccountId);
    return account ? account.name : 'Cuenta seleccionada';
  };

  const MetricCard = ({ title, value, icon: Icon, description, isLoading: cardLoading }: {
    title: string;
    value: string | number;
    icon: any;
    description: string;
    isLoading: boolean;
  }) => (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        {cardLoading ? (
          <Skeleton className="h-8 w-16" />
        ) : (
          <div className="text-2xl font-bold">{value}</div>
        )}
        <p className="text-xs text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <div className="flex items-center gap-2">
          <p className="text-muted-foreground">Vista general del rendimiento</p>
          <Badge variant="outline" className="text-xs">
            {getAccountName()}
          </Badge>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Total Llamadas"
          value={metrics.totalCalls}
          icon={Phone}
          description="Llamadas procesadas"
          isLoading={isLoading}
        />
        <MetricCard
          title="Llamadas Completas"
          value={metrics.completeCalls}
          icon={BarChart3}
          description="Llamadas analizadas"
          isLoading={isLoading}
        />
        <MetricCard
          title="Score Promedio"
          value={`${metrics.avgScore}%`}
          icon={TrendingUp}
          description="Puntuación media"
          isLoading={isLoading}
        />
        <MetricCard
          title="Total Agentes"
          value={metrics.totalAgents}
          icon={Users}
          description="Agentes registrados"
          isLoading={isLoading}
        />
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Resumen</TabsTrigger>
          <TabsTrigger value="analytics">Análisis</TabsTrigger>
        </TabsList>
        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <ResultsChart 
              data={metrics.salesResults} 
              isLoading={isLoading} 
              hasData={metrics.salesResults.length > 0} 
            />
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Resumen del Período
                </CardTitle>
                <CardDescription>Filtrado por: {getAccountName()}</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span>Llamadas procesadas:</span>
                      <span className="font-semibold">{metrics.totalCalls}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Tasa de finalización:</span>
                      <span className="font-semibold">
                        {metrics.totalCalls > 0 
                          ? `${Math.round((metrics.completeCalls / metrics.totalCalls) * 100)}%`
                          : '0%'
                        }
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Score promedio:</span>
                      <span className="font-semibold">{metrics.avgScore}%</span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        <TabsContent value="analytics" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5" />
                Análisis Detallado
              </CardTitle>
              <CardDescription>Métricas avanzadas para {getAccountName()}</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Funcionalidad de análisis detallado disponible próximamente.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
