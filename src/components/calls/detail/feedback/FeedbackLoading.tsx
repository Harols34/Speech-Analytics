
import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle, RefreshCw, CheckCircle } from "lucide-react";

interface FeedbackLoadingProps {
  isLoading: boolean;
  onGenerateClick: () => void;
  error?: string | null;
  feedbackExists?: boolean;
  autoGenerating?: boolean;
  title?: string;
  description?: string;
}

export default function FeedbackLoading({
  isLoading,
  onGenerateClick,
  error,
  feedbackExists,
  autoGenerating = false,
  title = "Análisis de comportamientos",
  description = "Genere el análisis para esta llamada"
}: FeedbackLoadingProps) {
  return (
    <Card className="animate-in fade-in duration-700">
      <CardContent className="py-6">
        {feedbackExists ? (
          <div className="bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-300 p-4 rounded-md mb-4 flex items-start">
            <CheckCircle className="h-5 w-5 mr-2 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-medium">Análisis existente</p>
              <p className="text-sm mt-1">
                El análisis para esta llamada ya fue generado anteriormente.
              </p>
            </div>
          </div>
        ) : error ? (
          <div className="bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-300 p-4 rounded-md mb-4 flex items-start">
            <AlertCircle className="h-5 w-5 mr-2 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-medium">{error}</p>
              <p className="text-sm mt-1">
                Verifique que:
                <ul className="list-disc pl-5 mt-1">
                  <li>
                    La variable de entorno "API_DE_OPENAI" esté configurada en los secretos 
                    de las Edge Functions de Supabase.
                  </li>
                  <li>Existan comportamientos activos en el sistema.</li>
                  <li>La transcripción de la llamada esté completa.</li>
                </ul>
              </p>
            </div>
          </div>
        ) : null}
        
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-12 transition-all duration-500">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mb-6"></div>
            <p className="text-center text-gray-700 dark:text-gray-300 font-medium text-lg mb-2">
              Generando {title.toLowerCase()}...
            </p>
            <p className="text-center text-gray-500 dark:text-gray-400 text-sm max-w-md">
              Estamos procesando la información de la llamada.
              Este proceso puede tardar hasta un minuto.
            </p>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-8 transition-all duration-500">
            <p className="text-center text-gray-500 mb-4">
              {feedbackExists 
                ? "El análisis ya está generado" 
                : description}
            </p>
            <Button 
              onClick={onGenerateClick} 
              className="px-6 py-3 bg-primary text-white rounded hover:bg-primary/90 transition-colors" 
              disabled={isLoading || !!error || feedbackExists}
              size="lg"
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Generar {title.toLowerCase()}
            </Button>
            
            {error ? (
              <p className="text-center text-red-500 text-xs mt-2">
                No se puede generar el análisis debido a errores. Resuelva los problemas indicados arriba.
              </p>
            ) : feedbackExists ? (
              <p className="text-center text-green-500 text-xs mt-2">
                Este análisis ya existe y no se puede regenerar.
              </p>
            ) : (
              <p className="text-center text-gray-500 text-xs mt-2">
                Haga clic en el botón para generar el análisis.
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
