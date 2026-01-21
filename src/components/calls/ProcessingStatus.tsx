
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Play, 
  Square, 
  RefreshCw, 
  CheckCircle, 
  Clock, 
  XCircle, 
  Loader2,
  Activity
} from 'lucide-react';
import { useCallProcessing } from '@/hooks/useCallProcessing';

interface ProcessingStatusProps {
  accountId: string | undefined;
}

export default function ProcessingStatus({ accountId }: ProcessingStatusProps) {
  const {
    stats,
    isAutoProcessing,
    startAutoProcessing,
    stopAutoProcessing,
    processStuckCalls,
    refreshStats
  } = useCallProcessing(accountId);

  const completionPercentage = stats.total > 0 
    ? Math.round((stats.completed / stats.total) * 100)
    : 0;

  const pendingCount = stats.pending + stats.processing;

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5" />
          Estado del Procesamiento
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Estadísticas */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span className="text-sm font-medium">Completadas</span>
            </div>
            <div className="text-2xl font-bold text-green-600">{stats.completed}</div>
          </div>
          
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <Clock className="h-4 w-4 text-orange-500" />
              <span className="text-sm font-medium">Pendientes</span>
            </div>
            <div className="text-2xl font-bold text-orange-600">{pendingCount}</div>
          </div>
          
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <XCircle className="h-4 w-4 text-red-500" />
              <span className="text-sm font-medium">Errores</span>
            </div>
            <div className="text-2xl font-bold text-red-600">{stats.error}</div>
          </div>
          
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <Activity className="h-4 w-4 text-blue-500" />
              <span className="text-sm font-medium">Total</span>
            </div>
            <div className="text-2xl font-bold text-blue-600">{stats.total}</div>
          </div>
        </div>

        {/* Barra de progreso */}
        {stats.total > 0 && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Progreso de procesamiento</span>
              <span>{completionPercentage}%</span>
            </div>
            <Progress value={completionPercentage} className="h-2" />
          </div>
        )}

        {/* Estado del procesamiento automático */}
        <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
          <div className="flex items-center gap-2">
            {isAutoProcessing ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin text-green-500" />
                <span className="text-sm font-medium">Procesamiento automático activo</span>
                <Badge variant="secondary" className="bg-green-100 text-green-800">
                  Activo
                </Badge>
              </>
            ) : (
              <>
                <Clock className="h-4 w-4 text-gray-500" />
                <span className="text-sm font-medium">Procesamiento automático inactivo</span>
                <Badge variant="outline">
                  Inactivo
                </Badge>
              </>
            )}
          </div>
        </div>

        {/* Controles */}
        <div className="flex flex-wrap gap-2">
          <Button
            onClick={refreshStats}
            variant="outline"
            size="sm"
            className="flex items-center gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Actualizar
          </Button>

          <Button
            onClick={processStuckCalls}
            variant="outline"
            size="sm"
            className="flex items-center gap-2"
            disabled={isAutoProcessing}
          >
            <Play className="h-4 w-4" />
            Procesar Pendientes
          </Button>

          {isAutoProcessing ? (
            <Button
              onClick={stopAutoProcessing}
              variant="destructive"
              size="sm"
              className="flex items-center gap-2"
            >
              <Square className="h-4 w-4" />
              Detener Auto-Procesamiento
            </Button>
          ) : (
            <Button
              onClick={startAutoProcessing}
              variant="default"
              size="sm"
              className="flex items-center gap-2"
            >
              <Play className="h-4 w-4" />
              Iniciar Auto-Procesamiento
            </Button>
          )}
        </div>

        {/* Alertas */}
        {pendingCount > 0 && (
          <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
            <div className="flex items-center gap-2 text-orange-800">
              <Clock className="h-4 w-4" />
              <span className="text-sm font-medium">
                Hay {pendingCount} grabaciones pendientes de procesar
              </span>
            </div>
            <p className="text-xs text-orange-700 mt-1">
              Usa el botón "Iniciar Auto-Procesamiento" para procesar automáticamente todas las grabaciones pendientes.
            </p>
          </div>
        )}

        {stats.error > 0 && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center gap-2 text-red-800">
              <XCircle className="h-4 w-4" />
              <span className="text-sm font-medium">
                {stats.error} grabaciones con errores
              </span>
            </div>
            <p className="text-xs text-red-700 mt-1">
              Las grabaciones con errores pueden requerir revisión manual o resubida.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
