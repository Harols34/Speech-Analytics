
import { FileIcon, X, CheckCircle, AlertCircle, Clock, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileItem as FileItemType } from "./useCallUpload";

interface FileItemProps {
  file: FileItemType;
  onRemove: (id: string) => void;
  isUploading: boolean;
}

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const formatDuration = (seconds: number): string => {
  if (seconds === 0) return 'Desconocida';
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
};

export default function FileItem({ file, onRemove, isUploading }: FileItemProps) {
  const getStatusColor = () => {
    switch (file.status) {
      case "success":
        return "bg-green-100 text-green-700 border-green-200";
      case "error":
        return "bg-red-100 text-red-700 border-red-200";
      case "duplicate":
        return "bg-yellow-100 text-yellow-700 border-yellow-200";
      case "uploading":
        return "bg-blue-100 text-blue-700 border-blue-200";
      case "uploaded":
        return "bg-purple-100 text-purple-700 border-purple-200";
      case "processing":
        return "bg-orange-100 text-orange-700 border-orange-200";
      default:
        return "bg-gray-100 text-gray-700 border-gray-200";
    }
  };

  const getStatusIcon = () => {
    switch (file.status) {
      case "success":
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case "error":
        return <AlertCircle className="h-4 w-4 text-red-600" />;
      case "duplicate":
        return <Copy className="h-4 w-4 text-yellow-600" />;
      case "uploading":
      case "processing":
        return <Clock className="h-4 w-4 text-blue-600 animate-spin" />;
      case "uploaded":
        return <CheckCircle className="h-4 w-4 text-purple-600" />;
      default:
        return <FileIcon className="h-4 w-4 text-gray-600" />;
    }
  };

  const getStatusText = () => {
    switch (file.status) {
      case "success":
        return "Completado";
      case "error":
        return "Error";
      case "duplicate":
        return "Duplicado";
      case "uploading":
        return "Subiendo";
      case "uploaded":
        return "Subido";
      case "processing":
        return "Procesando";
      default:
        return "Listo";
    }
  };

  const showProgressBar = file.status === "uploading" || file.status === "processing";

  return (
    <div className={`p-4 border rounded-lg transition-all duration-200 ${getStatusColor()}`}>
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3 flex-1">
          {getStatusIcon()}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <p className="text-sm font-medium truncate" title={file.file.name}>
                {file.file.name}
              </p>
              <Badge variant="secondary" className="text-xs">
                {getStatusText()}
              </Badge>
            </div>
            
            <div className="flex items-center gap-4 text-xs text-gray-600 mb-2">
              <span>{formatFileSize(file.file.size)}</span>
              <span>Duración: {formatDuration(file.duration || 0)}</span>
              <span>Tipo: {file.file.type || 'Desconocido'}</span>
            </div>

            {showProgressBar && (
              <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
                  style={{ width: `${file.progress}%` }}
                />
              </div>
            )}

            {file.info && (
              <p className="text-xs text-blue-600 mt-1">{file.info}</p>
            )}

            {file.error && (
              <p className="text-xs text-red-600 mt-1 leading-relaxed">
                {file.error}
              </p>
            )}
          </div>
        </div>

        {!isUploading && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onRemove(file.id)}
            className="ml-2 h-8 w-8 p-0 hover:bg-red-100 hover:text-red-600"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
