
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

interface CallAnalysisInfoProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  callData: {
    id: string;
    title: string;
    prompts?: {
      summary?: string;
      feedback?: string;
    };
    behaviors?: Array<{
      name: string;
      description?: string;
    }>;
  };
}

export function CallAnalysisInfo({ open, onOpenChange, callData }: CallAnalysisInfoProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>Información del Análisis - {callData.title}</DialogTitle>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onOpenChange(false)}
              className="h-6 w-6"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>
        
        <ScrollArea className="max-h-[60vh]">
          <div className="space-y-6">
            {/* Prompts Applied */}
            <div>
              <h3 className="font-semibold text-lg mb-3">Prompts Aplicados</h3>
              
              {callData.prompts?.summary && (
                <div className="mb-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="outline">Resumen</Badge>
                  </div>
                  <div className="bg-muted p-3 rounded-md">
                    <p className="text-sm">{callData.prompts.summary}</p>
                  </div>
                </div>
              )}
              
              {callData.prompts?.feedback && (
                <div className="mb-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="outline">Feedback</Badge>
                  </div>
                  <div className="bg-muted p-3 rounded-md">
                    <p className="text-sm">{callData.prompts.feedback}</p>
                  </div>
                </div>
              )}
              
              {(!callData.prompts?.summary && !callData.prompts?.feedback) && (
                <p className="text-muted-foreground text-sm">No se aplicaron prompts específicos en esta llamada.</p>
              )}
            </div>

            <Separator />

            {/* Behaviors Considered */}
            <div>
              <h3 className="font-semibold text-lg mb-3">Comportamientos Considerados</h3>
              
              {callData.behaviors && callData.behaviors.length > 0 ? (
                <div className="space-y-3">
                  {callData.behaviors.map((behavior, index) => (
                    <div key={index} className="border rounded-lg p-3">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant="secondary">{behavior.name}</Badge>
                      </div>
                      {behavior.description && (
                        <p className="text-sm text-muted-foreground">{behavior.description}</p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-sm">No se consideraron comportamientos específicos en esta llamada.</p>
              )}
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
