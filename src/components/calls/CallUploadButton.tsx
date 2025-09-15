
import { Link } from "react-router-dom";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function CallUploadButton() {
  return (
    <Button asChild>
      <Link to="/calls/upload" className="flex items-center gap-2">
        <Plus className="h-4 w-4" />
        <span>Subir Llamada</span>
      </Link>
    </Button>
  );
}
