import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Save, ExternalLink, CheckCircle, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

export function ElevenLabsConfig() {
  const [agentId, setAgentId] = useState('');
  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    const savedAgentId = localStorage.getItem('elevenlabs_agent_id');
    if (savedAgentId) {
      setAgentId(savedAgentId);
      setIsSaved(true);
    }
  }, []);

  const handleSave = () => {
    if (!agentId.trim()) {
      toast.error('Por favor ingresa un Agent ID válido');
      return;
    }

    localStorage.setItem('elevenlabs_agent_id', agentId.trim());
    setIsSaved(true);
    toast.success('Agent ID de ElevenLabs guardado correctamente');
    
    // Disparar evento personalizado para notificar a otros componentes
    window.dispatchEvent(new Event('elevenlabs-agent-id-updated'));
  };

  const handleClear = () => {
    localStorage.removeItem('elevenlabs_agent_id');
    setAgentId('');
    setIsSaved(false);
    toast.info('Agent ID eliminado');
    
    // Disparar evento personalizado para notificar a otros componentes
    window.dispatchEvent(new Event('elevenlabs-agent-id-updated'));
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              Configuración ElevenLabs
              {isSaved && (
                <Badge variant="default" className="gap-1">
                  <CheckCircle className="h-3 w-3" />
                  Configurado
                </Badge>
              )}
            </CardTitle>
            <CardDescription>
              Configura tu Agent ID de ElevenLabs para usar WebRTC en entrenamientos
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <div className="space-y-2">
              <p className="font-medium">¿Cómo obtener tu Agent ID?</p>
              <ol className="list-decimal list-inside space-y-1 text-sm">
                <li>Ve a <a 
                  href="https://elevenlabs.io/app/conversational-ai" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-primary hover:underline inline-flex items-center gap-1"
                >
                  ElevenLabs Conversational AI
                  <ExternalLink className="h-3 w-3" />
                </a></li>
                <li>Crea un nuevo agente o selecciona uno existente</li>
                <li>Copia el Agent ID de la URL o desde la configuración del agente</li>
                <li>Pégalo aquí abajo y guarda</li>
              </ol>
            </div>
          </AlertDescription>
        </Alert>

        <div className="space-y-2">
          <Label htmlFor="agent-id">Agent ID de ElevenLabs</Label>
          <div className="flex gap-2">
            <Input
              id="agent-id"
              placeholder="ej: abc123def456..."
              value={agentId}
              onChange={(e) => {
                setAgentId(e.target.value);
                setIsSaved(false);
              }}
              className="font-mono text-sm"
            />
            <Button onClick={handleSave} className="gap-2">
              <Save className="h-4 w-4" />
              Guardar
            </Button>
            {isSaved && (
              <Button onClick={handleClear} variant="outline">
                Limpiar
              </Button>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            El Agent ID se guarda localmente en tu navegador
          </p>
        </div>

        {isSaved && (
          <Alert className="bg-green-500/10 border-green-500/20">
            <CheckCircle className="h-4 w-4 text-green-500" />
            <AlertDescription className="text-green-700 dark:text-green-300">
              ElevenLabs está configurado correctamente. Ahora puedes usar voces de ElevenLabs 
              en modo WebRTC para entrenamientos en tiempo real.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}
