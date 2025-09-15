
import { Button } from "@/components/ui/button";
import { FileItem as FileItemType } from "../upload/useCallUpload";
import FileItemComponent from "./FileItem";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Info, Upload } from "lucide-react";
import { memo } from "react";

interface FileListProps {
  files: FileItemType[];
  onRemoveFile: (id: string) => void;
  isUploading: boolean;
  onUploadFiles: () => void;
}

// Memoize the component to prevent unnecessary re-renders
const FileList = memo(function FileList({ files, onRemoveFile, isUploading, onUploadFiles }: FileListProps) {
  if (files.length === 0) {
    return (
      <Alert>
        <Info className="h-4 w-4" />
        <AlertTitle>Sin archivos seleccionados</AlertTitle>
        <AlertDescription>
          No se han seleccionado archivos para subir. Arrastre o seleccione archivos para continuar.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-4 transition-all duration-300">
      <div className="rounded-md border p-2">
        <div className="space-y-2">
          {files.map((file) => (
            <FileItemComponent 
              key={file.id} 
              file={file} 
              onRemove={() => onRemoveFile(file.id)}
              disabled={isUploading} 
            />
          ))}
        </div>
      </div>
      <div className="flex justify-end">
        <Button 
          onClick={onUploadFiles} 
          disabled={isUploading || files.length === 0} 
          className="transition-all duration-300"
        >
          {isUploading ? (
            <span className="flex items-center gap-2">
              <span className="animate-spin h-4 w-4 border-2 border-current rounded-full border-t-transparent"></span>
              Procesando...
            </span>
          ) : (
            <span className="flex items-center gap-2">
              <Upload className="h-4 w-4" />
              {files.length === 1 ? "Subir archivo" : `Subir ${files.length} archivos`}
            </span>
          )}
        </Button>
      </div>
    </div>
  );
});

export default FileList;
