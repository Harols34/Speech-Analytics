
import React, { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RefreshCw, AlertTriangle, CheckCircle, Clock } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export default function CallControlPanel() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStats, setProcessingStats] = useState<{
    total?: number;
    processed?: number;
    success?: number;
    failed?: number;
  }>({});
  
  // Trigger reprocessing of all calls
  const handleReprocessAllCalls = async () => {
    try {
      setIsProcessing(true);
      setProcessingStats({});
      
      toast.info("Iniciando reprocesamiento de todas las llamadas", {
        description: "Este proceso puede tardar varios minutos"
      });
      
      // Call the reprocess-calls function
      const { data, error } = await supabase.functions.invoke('reprocess-calls', {});
      
      if (error) {
        console.error("Error reprocessing calls:", error);
        toast.error("Error al reprocesar llamadas", {
          description: error.message
        });
        return;
      }
      
      console.log("Reprocessing result:", data);
      
      if (data.success) {
        setProcessingStats({
          total: data.results.total,
          processed: data.results.processed,
          success: data.results.success,
          failed: data.results.failed
        });
        
        toast.success("Reprocesamiento completado", {
          description: `Se procesaron ${data.results.processed} llamadas. ${data.results.success} exitosas, ${data.results.failed} fallidas.`
        });
      } else {
        toast.error("Error en el reprocesamiento", {
          description: data.error || "No se pudo completar el reprocesamiento"
        });
      }
    } catch (error) {
      console.error("Error reprocessing calls:", error);
      toast.error("Error al reprocesar llamadas", {
        description: error.message
      });
    } finally {
      setIsProcessing(false);
    }
  };
  
  return (
    <Card className="p-6">
      <Tabs defaultValue="process">
        <TabsList className="mb-4">
          <TabsTrigger value="process">Procesamiento de Llamadas</TabsTrigger>
        </TabsList>
        
        <TabsContent value="process" className="space-y-6">
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-medium">Reprocesar Llamadas</h3>
              <Button 
                variant="default" 
                onClick={handleReprocessAllCalls}
                disabled={isProcessing}
              >
                {isProcessing ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Procesando...
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Reprocesar Todas
                  </>
                )}
              </Button>
            </div>
            
            <p className="text-sm text-muted-foreground">
              Esta acción volverá a analizar todas las llamadas existentes, actualizando el feedback 
              y las métricas con los últimos algoritmos de análisis.
            </p>
            
            {isProcessing && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Procesando llamadas...</span>
                  {processingStats.processed !== undefined && processingStats.total !== undefined && (
                    <span>{processingStats.processed} de {processingStats.total}</span>
                  )}
                </div>
                <Progress value={
                  processingStats.processed !== undefined && processingStats.total !== undefined
                    ? (processingStats.processed / processingStats.total) * 100
                    : undefined
                } />
              </div>
            )}
            
            {!isProcessing && processingStats.processed && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                <div className="bg-muted/30 p-4 rounded-md">
                  <div className="flex items-center space-x-2">
                    <Clock className="h-5 w-5 text-muted-foreground" />
                    <h4 className="font-medium">Total Procesadas</h4>
                  </div>
                  <div className="mt-2 text-2xl font-bold">{processingStats.processed}</div>
                </div>
                
                <div className="bg-green-100 dark:bg-green-900/30 p-4 rounded-md">
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
                    <h4 className="font-medium">Exitosas</h4>
                  </div>
                  <div className="mt-2 text-2xl font-bold">{processingStats.success || 0}</div>
                </div>
                
                <div className="bg-amber-100 dark:bg-amber-900/30 p-4 rounded-md">
                  <div className="flex items-center space-x-2">
                    <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                    <h4 className="font-medium">Fallidas</h4>
                  </div>
                  <div className="mt-2 text-2xl font-bold">{processingStats.failed || 0}</div>
                </div>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </Card>
  );
}
