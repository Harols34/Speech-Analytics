
import { Loader2 } from "lucide-react";

export default function CallNotFound() {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <Loader2 className="h-12 w-12 text-muted-foreground mb-4 animate-spin" />
      <h3 className="text-lg font-medium">Llamada no encontrada</h3>
      <p className="text-sm text-muted-foreground mt-1">
        La llamada que estás buscando no existe o ha sido eliminada.
      </p>
    </div>
  );
}
