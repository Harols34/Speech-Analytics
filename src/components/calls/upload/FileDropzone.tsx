
import { useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { Button } from "@/components/ui/button";
import { FileAudio, Upload } from "lucide-react";

interface FileDropzoneProps {
  onDrop: (acceptedFiles: File[]) => void;
}

export default function FileDropzone({ onDrop }: FileDropzoneProps) {
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "audio/*": [".mp3", ".wav", ".m4a", ".ogg"],
    },
    maxSize: 100 * 1024 * 1024, // 100MB
  });

  return (
    <div
      {...getRootProps()}
      className={`border-2 border-dashed rounded-lg p-8 text-center transition-all duration-300 ${
        isDragActive
          ? "border-primary bg-primary/5"
          : "border-border hover:border-primary/50 hover:bg-secondary/50"
      } cursor-pointer`}
    >
      <input {...getInputProps()} />
      <div className="flex flex-col items-center justify-center gap-2">
        <Upload
          className={`h-10 w-10 ${
            isDragActive ? "text-primary" : "text-muted-foreground"
          }`}
        />
        <h3 className="text-lg font-semibold">
          {isDragActive ? "Suelta los archivos aquí" : "Arrastra y suelta archivos aquí"}
        </h3>
        <p className="text-sm text-muted-foreground max-w-md">
          Arrastra y suelta tus archivos de audio aquí, o haz clic para explorar. Formatos soportados:
          MP3, WAV, M4A, OGG. Tamaño máximo: 100MB.
        </p>
        <Button
          type="button"
          variant="outline"
          className="mt-2"
          onClick={(e) => {
            e.stopPropagation();
          }}
        >
          <FileAudio className="mr-2 h-4 w-4" />
          Explorar archivos
        </Button>
      </div>
    </div>
  );
}
