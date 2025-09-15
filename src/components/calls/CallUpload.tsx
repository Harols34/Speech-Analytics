
import { Loader2 } from "lucide-react";
import FileDropzone from "./upload/FileDropzone";
import FileList from "./upload/FileList";
import { useCallUpload } from "./upload/useCallUpload";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, Clock } from "lucide-react";
import PromptSelectionModal from "./PromptSelectionModal";
import { useState } from "react";

export default function CallUpload() {
  const [showPromptModal, setShowPromptModal] = useState(false);
  
  const {
    files,
    isUploading,
    addFiles,
    removeFile,
    uploadFiles
  } = useCallUpload();

  const handleUploadClick = () => {
    if (files.length === 0) return;
    setShowPromptModal(true);
  };

  const handlePromptConfirm = (config: { 
    summaryPrompt?: string; 
    feedbackPrompt?: string;
    selectedBehaviorIds?: string[];
  }) => {
    setShowPromptModal(false);
    uploadFiles(config);
  };

  return (
    <div className="space-y-6 animate-fade-in transition-all duration-300">
      {/* Información sobre formato de archivos y procesamiento en segundo plano */}
      <Alert variant="default" className="bg-muted/50">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Información importante</AlertTitle>
        <AlertDescription className="text-sm">
          Se aceptan archivos de audio en formato MP3, WAV o M4A. Tamaño máximo: 100MB por archivo.
          
          <br /><br />
          
          <div className="flex items-center gap-2 p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-200 dark:border-blue-800">
            <Clock className="h-4 w-4 text-blue-600" />
            <div>
              <strong className="text-blue-800 dark:text-blue-200">Procesamiento en segundo plano:</strong>
              <p className="text-blue-700 dark:text-blue-300 text-sm mt-1">
                Los archivos se suben al 100% inmediatamente. El análisis (transcripción, resumen y feedback) 
                se realiza en segundo plano, permitiendo que continúes usando la plataforma normalmente.
              </p>
            </div>
          </div>
          
          <br />
          
          <strong>Proceso de análisis automático:</strong>
          <ul className="list-disc list-inside mt-2 space-y-1">
            <li>Transcripción automática con separación de hablantes (Agente/Cliente/Silencios)</li>
            <li>Generación de resumen personalizable</li>
            <li>Análisis de feedback basado en prompts configurables</li>
            <li>Evaluación de comportamientos seleccionados</li>
          </ul>
        </AlertDescription>
      </Alert>
      
      <FileDropzone onDrop={addFiles} />
      
      {isUploading && (
        <div className="p-4 border rounded-lg bg-secondary/10 mb-4 transition-all duration-300">
          <div className="flex justify-between mb-2">
            <p className="text-sm font-medium">Subiendo archivos</p>
            <p className="text-sm text-muted-foreground">En progreso...</p>
          </div>
          <Progress value={50} className="h-2" />
          <p className="text-xs text-muted-foreground mt-2">
            El análisis continuará en segundo plano una vez completada la subida
          </p>
        </div>
      )}
      
      <FileList
        files={files}
        onRemoveFile={removeFile}
        isUploading={isUploading}
        onUploadFiles={handleUploadClick}
      />

      <PromptSelectionModal
        open={showPromptModal}
        onOpenChange={setShowPromptModal}
        onConfirm={handlePromptConfirm}
      />
    </div>
  );
}
