import { BotIcon, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
interface ChatHeaderProps {
  apiError: string | null;
  onConfigHelp?: () => void;
}
export function ChatHeader({
  apiError,
  onConfigHelp
}: ChatHeaderProps) {
  const isOpenAIError = apiError && (apiError.includes("OpenAI") || apiError.includes("API de OPENAI"));
  return <div className="glass-card dark:glass-card-dark p-4 mb-4 bg-white border rounded-md">
      <div className="flex items-center mb-2">
        <BotIcon className="h-5 w-5 text-primary mr-2" />
        <h3 className="font-medium">📊 Asistente de análisis de llamadas con IA</h3>
      </div>
      <p className="text-sm text-muted-foreground">Analiza conversaciones con clientes, mide el desempeño de tus asesores y detecta oportunidades de mejora. Nuestra IA procesa automáticamente tus llamadas y extrae insights clave para optimizar la experiencia del cliente.</p>
      {apiError && <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-md text-xs text-red-600">
          <div className="flex items-start gap-2">
            <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-medium">Error de configuración:</p>
              <p className="mt-1">{apiError}</p>
              {isOpenAIError && <Button variant="link" size="sm" className="mt-1 h-auto p-0 text-xs text-red-700" onClick={onConfigHelp}>
                  ¿Cómo configurar la API de OpenAI?
                </Button>}
            </div>
          </div>
        </div>}
    </div>;
}