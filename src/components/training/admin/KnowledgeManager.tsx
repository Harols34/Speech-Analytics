import React, { useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Upload, FileText, Trash2, Download, Eye, Search } from 'lucide-react';
import { KnowledgeDocument } from '@/lib/types/training';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

export function KnowledgeManager() {
  const [documents, setDocuments] = useState<KnowledgeDocument[]>([
    {
      id: '1',
      name: 'Manual de Atención al Cliente',
      type: 'manual',
      file_url: '/docs/manual-atencion.pdf',
      description: 'Guía completa para la atención al cliente',
      content_summary: 'Contiene protocolos de atención, escalamiento de casos y mejores prácticas.',
      uploaded_at: new Date().toISOString(),
      file_size: 2048000,
      status: 'ready'
    },
    {
      id: '2',
      name: 'Política de Facturación',
      type: 'policy',
      file_url: '/docs/politica-facturacion.pdf',
      description: 'Políticas y procedimientos de facturación',
      content_summary: 'Incluye tipos de facturación, descuentos, reembolsos y disputas.',
      uploaded_at: new Date().toISOString(),
      file_size: 1024000,
      status: 'ready'
    }
  ]);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const filteredDocuments = documents.filter(doc =>
    doc.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    doc.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    doc.type.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    setUploading(true);
    setUploadProgress(0);

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        
        // Simulate upload progress
        const progressInterval = setInterval(() => {
          setUploadProgress(prev => {
            const newProgress = prev + 10;
            if (newProgress >= 100) {
              clearInterval(progressInterval);
              return 100;
            }
            return newProgress;
          });
        }, 200);

        // Simulate file processing
        await new Promise(resolve => setTimeout(resolve, 2000));

        const newDoc: KnowledgeDocument = {
          id: Math.random().toString(36).substr(2, 9),
          name: file.name.replace(/\.[^/.]+$/, ""),
          type: getFileType(file.name),
          file_url: URL.createObjectURL(file),
          description: '',
          uploaded_at: new Date().toISOString(),
          file_size: file.size,
          status: 'processing'
        };

        setDocuments(prev => [...prev, newDoc]);
        
        // Simulate processing completion
        setTimeout(() => {
          setDocuments(prev => prev.map(doc => 
            doc.id === newDoc.id 
              ? { ...doc, status: 'ready' as const, content_summary: 'Documento procesado y listo para usar.' }
              : doc
          ));
        }, 3000);
      }

      toast.success(`${files.length} documento(s) subido(s) exitosamente`);
    } catch (error) {
      console.error('Error uploading files:', error);
      toast.error('Error al subir los documentos');
    } finally {
      setUploading(false);
      setUploadProgress(0);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const getFileType = (filename: string): KnowledgeDocument['type'] => {
    const extension = filename.toLowerCase().split('.').pop();
    switch (extension) {
      case 'pdf': return 'pdf';
      case 'doc':
      case 'docx': return 'doc';
      case 'txt': return 'txt';
      default: return 'pdf';
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'manual': return 'bg-blue-100 text-blue-800';
      case 'policy': return 'bg-green-100 text-green-800';
      case 'pdf': return 'bg-red-100 text-red-800';
      case 'doc': return 'bg-purple-100 text-purple-800';
      case 'txt': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ready': return 'bg-green-100 text-green-800';
      case 'processing': return 'bg-yellow-100 text-yellow-800';
      case 'error': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleDelete = (id: string) => {
    if (confirm('¿Estás seguro de que deseas eliminar este documento?')) {
      setDocuments(prev => prev.filter(doc => doc.id !== id));
      toast.success('Documento eliminado exitosamente');
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const files = e.dataTransfer.files;
    handleFileUpload(files);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">Base de Conocimiento</h3>
          <p className="text-sm text-muted-foreground">
            Gestiona documentos para proporcionar contexto a la IA durante los entrenamientos
          </p>
        </div>
        <Button onClick={() => fileInputRef.current?.click()}>
          <Upload className="h-4 w-4 mr-2" />
          Subir Documentos
        </Button>
      </div>

      {/* Upload Area */}
      <Card
        className="border-dashed border-2 hover:border-primary/50 transition-colors cursor-pointer"
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Upload className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">Arrastra archivos aquí</h3>
          <p className="text-muted-foreground text-center mb-4">
            O haz clic para seleccionar archivos (PDF, DOC, TXT)
          </p>
          {uploading && (
            <div className="w-full max-w-sm">
              <Progress value={uploadProgress} className="mb-2" />
              <p className="text-sm text-center text-muted-foreground">
                Subiendo... {uploadProgress}%
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept=".pdf,.doc,.docx,.txt"
        onChange={(e) => handleFileUpload(e.target.files)}
        className="hidden"
      />

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar documentos..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Documents Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredDocuments.map((document) => (
          <Card key={document.id} className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex justify-between items-start">
                <CardTitle className="text-base line-clamp-2">{document.name}</CardTitle>
                <div className="flex gap-1">
                  <Button variant="ghost" size="sm">
                    <Eye className="h-3 w-3" />
                  </Button>
                  <Button variant="ghost" size="sm">
                    <Download className="h-3 w-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(document.id)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
              
              {document.description && (
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {document.description}
                </p>
              )}
            </CardHeader>
            
            <CardContent className="space-y-3">
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline" className={getTypeColor(document.type)}>
                  {document.type.toUpperCase()}
                </Badge>
                <Badge variant="outline" className={getStatusColor(document.status)}>
                  {document.status === 'ready' ? 'Listo' : 
                   document.status === 'processing' ? 'Procesando' : 'Error'}
                </Badge>
              </div>

              <div className="text-sm text-muted-foreground space-y-1">
                <div className="flex items-center gap-2">
                  <FileText className="h-3 w-3" />
                  <span>{formatFileSize(document.file_size)}</span>
                </div>
                <div>
                  Subido: {new Date(document.uploaded_at).toLocaleDateString()}
                </div>
              </div>

              {document.content_summary && (
                <div className="text-sm">
                  <span className="font-medium">Resumen:</span>
                  <p className="text-muted-foreground mt-1 line-clamp-3">
                    {document.content_summary}
                  </p>
                </div>
              )}

              {document.status === 'processing' && (
                <div className="w-full">
                  <Progress value={75} className="mb-1" />
                  <p className="text-xs text-center text-muted-foreground">
                    Procesando contenido...
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        ))}

        {filteredDocuments.length === 0 && (
          <Card className="col-span-full">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <FileText className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">
                {searchTerm ? 'No se encontraron documentos' : 'No hay documentos'}
              </h3>
              <p className="text-muted-foreground text-center mb-4">
                {searchTerm 
                  ? 'Intenta con otros términos de búsqueda'
                  : 'Sube documentos para proporcionar contexto a la IA'
                }
              </p>
              {!searchTerm && (
                <Button onClick={() => fileInputRef.current?.click()}>
                  <Upload className="h-4 w-4 mr-2" />
                  Subir Documentos
                </Button>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}