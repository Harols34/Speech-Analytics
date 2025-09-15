
import { Badge } from "@/components/ui/badge";
import { Call } from "@/lib/types";
import { formatDateToLocale, formatDuration } from "./CallUtils";

interface CallHeaderProps {
  call: Call;
}

export default function CallHeader({ call }: CallHeaderProps) {
  return (
    <div className="space-y-1">
      <h1 className="text-2xl font-bold tracking-tight">{call.title}</h1>
      <div className="flex flex-wrap gap-2 items-center text-sm text-muted-foreground">
        <span>
          {formatDateToLocale(call.date)}
        </span>
        <span>•</span>
        <span>{formatDuration(call.duration)}</span>
        <span>•</span>
        <span>Agente: {call.agentName || "Sin asignar"}</span>
        
        {call.statusSummary && (
          <>
            <span>•</span>
            <Badge variant="outline" className="ml-1">
              {call.statusSummary}
            </Badge>
          </>
        )}
        
        {call.result && (
          <>
            <span>•</span>
            <Badge variant={call.result === "venta" ? "success" : "secondary"}>
              {call.result === "venta" ? "Venta" : "No venta"}
            </Badge>
          </>
        )}
      </div>
    </div>
  );
}
