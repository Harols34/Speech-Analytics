
import React from "react";
import { AlertCircle, Info } from "lucide-react";

interface FeedbackErrorDisplayProps {
  errorMessage: string;
}

export default function FeedbackErrorDisplay({ errorMessage }: FeedbackErrorDisplayProps) {
  if (!errorMessage) return null;
  
  // Check if this is feedback persistence notification rather than an error
  const isPersistenceMessage = errorMessage.toLowerCase().includes("feedback ya existe") || 
                              errorMessage.toLowerCase().includes("ya generado");
  
  if (isPersistenceMessage) {
    return (
      <div className="bg-blue-50 dark:bg-blue-900/20 text-blue-800 dark:text-blue-300 p-4 rounded-md mb-4 flex items-start">
        <Info className="h-5 w-5 mr-2 mt-0.5 flex-shrink-0" />
        <div>
          <p className="font-medium">El análisis de esta llamada ya fue generado</p>
          <p className="text-sm mt-1">
            El feedback de esta llamada fue generado previamente y se encuentra guardado permanentemente en la base de datos. 
            Los resultados que estás viendo son estáticos y no cambiarán al recargar la página.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-300 p-4 rounded-md mb-4 flex items-start">
      <AlertCircle className="h-5 w-5 mr-2 mt-0.5 flex-shrink-0" />
      <div>
        <p className="font-medium">{errorMessage}</p>
        <p className="text-sm mt-1">
          Verifique que:
          <ul className="list-disc pl-5 mt-1">
            <li>La variable de entorno "API_DE_OPENAI" esté configurada en los secretos 
            de las Edge Functions de Supabase.</li>
            <li>Existan comportamientos activos en el sistema.</li>
            <li>La transcripción de la llamada esté completa.</li>
          </ul>
        </p>
        <p className="text-sm mt-2">
          Si el problema persiste, intente refrescar la página o contacte al administrador del sistema.
        </p>
      </div>
    </div>
  );
}
