
import { Card } from "@/components/ui/card";
import { FileAudio } from "lucide-react";
import { Call } from "@/lib/types";
import { Badge } from "@/components/ui/badge";

interface SummaryTabProps {
  call: Call;
}

export default function SummaryTab({ call }: SummaryTabProps) {
  if (call.status !== "complete") {
    return (
      <Card className="glass-card dark:glass-card-dark p-6">
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <div className="animate-pulse h-4 w-4 rounded-full bg-primary mb-4"></div>
          <h3 className="text-lg font-medium">Resumen en proceso</h3>
          <p className="text-sm text-muted-foreground mt-1">
            La IA está analizando la llamada para generar un resumen. Estará disponible una vez que se complete la transcripción.
          </p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="glass-card dark:glass-card-dark p-6">
      <div className="space-y-4">
        {call.statusSummary && (
          <div className="mb-4">
            <h3 className="text-lg font-medium mb-2">Categorización</h3>
            <Badge variant="secondary" className="text-sm font-medium">
              {call.statusSummary}
            </Badge>
          </div>
        )}
        
        {call.summary ? (
          <div>
            <h3 className="text-lg font-medium mb-2">Resumen de la llamada</h3>
            <p className="text-sm whitespace-pre-line">
              {call.summary}
            </p>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <FileAudio className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium">No hay resumen disponible</h3>
            <p className="text-sm text-muted-foreground mt-1">
              El resumen para esta llamada aún no está disponible.
            </p>
          </div>
        )}
      </div>
    </Card>
  );
}
