
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { X, FileAudio, Clock, CheckCircle2, AlertCircle, Upload } from "lucide-react";
import { FileItem as FileItemType } from "./useCallUpload";

interface FileItemProps {
  file: FileItemType;
  onRemove: (id: string) => void;
  disabled: boolean;
}

export default function FileItem({ file, onRemove, disabled }: FileItemProps) {
  const getStatusIcon = () => {
    switch (file.status) {
      case "idle":
        return <FileAudio className="h-4 w-4 text-muted-foreground" />;
      case "uploading":
        return <Upload className="h-4 w-4 text-blue-500 animate-pulse" />;
      case "uploaded":
        return <Clock className="h-4 w-4 text-orange-500" />;
      case "processing":
        return <Clock className="h-4 w-4 text-yellow-500 animate-spin" />;
      case "success":
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case "error":
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      default:
        return <FileAudio className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getStatusColor = () => {
    switch (file.status) {
      case "idle":
        return "secondary";
      case "uploading":
        return "default";
      case "uploaded":
        return "default";
      case "processing":
        return "default";
      case "success":
        return "default";
      case "error":
        return "destructive";
      default:
        return "secondary";
    }
  };

  const getStatusText = () => {
    switch (file.status) {
      case "idle":
        return "Pendiente";
      case "uploading":
        return "Subiendo";
      case "uploaded":
        return "Subido - Análisis en segundo plano";
      case "processing":
        return "Analizando";
      case "success":
        return "Completado";
      case "error":
        return "Error";
      default:
        return "Desconocido";
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="flex items-center justify-between p-4 border rounded-lg bg-card hover:bg-accent/5 transition-colors">
      <div className="flex items-center space-x-3 flex-1 min-w-0">
        {getStatusIcon()}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate" title={file.file.name}>
            {file.file.name}
          </p>
          <div className="flex items-center space-x-2 mt-1">
            <p className="text-xs text-muted-foreground">
              {formatFileSize(file.file.size)}
            </p>
            <Badge variant={getStatusColor()} className="text-xs">
              {getStatusText()}
            </Badge>
          </div>
          {file.info && (
            <p className="text-xs text-muted-foreground mt-1">
              {file.info}
            </p>
          )}
          {file.error && (
            <p className="text-xs text-red-500 mt-1">
              {file.error}
            </p>
          )}
        </div>
      </div>
      
      <div className="flex items-center space-x-3">
        {(file.status === "uploading" || file.status === "processing") && (
          <div className="w-20">
            <Progress value={file.progress} className="h-2" />
            <p className="text-xs text-center text-muted-foreground mt-1">
              {file.progress}%
            </p>
          </div>
        )}
        
        {file.status === "uploaded" && (
          <div className="text-xs text-orange-600 dark:text-orange-400 text-center">
            <Clock className="h-3 w-3 mx-auto mb-1" />
            Análisis en progreso
          </div>
        )}
        
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onRemove(file.id)}
          disabled={disabled}
          className="h-8 w-8 p-0"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
