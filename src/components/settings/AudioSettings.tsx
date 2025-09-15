import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAudioSettings } from "@/hooks/useAudioSettings";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
export default function AudioSettings() {
  const {
    settings,
    isLoading,
    isSaving,
    updateSetting,
    saveSettings,
    resetSettings
  } = useAudioSettings();

  // Función para guardar cambios manualmente
  const handleSaveSettings = async () => {
    try {
      await saveSettings(settings);
      toast.success("Configuración de audio actualizada correctamente");
    } catch (error) {
      console.error("Error al guardar configuración de audio:", error);
      toast.error("Error al guardar la configuración");
    }
  };
  if (isLoading) {
    return <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Cargando configuraciones...</CardTitle>
          </CardHeader>
          <CardContent className="flex justify-center p-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </CardContent>
        </Card>
      </div>;
  }
  return <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Configuración de Transcripción</CardTitle>
          <CardDescription>
            Gestiona las opciones de procesamiento de audio
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="timestamps" className="flex-1">Mostrar Marcas de Tiempo</Label>
              <Switch id="timestamps" checked={settings?.timestamps} onCheckedChange={checked => updateSetting("timestamps", checked)} />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="punctuation" className="flex-1">Puntuación</Label>
              <Switch id="punctuation" checked={settings?.punctuation} onCheckedChange={checked => updateSetting("punctuation", checked)} />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="noiseFilter" className="flex-1">Filtro de Ruido</Label>
              <Switch id="noiseFilter" checked={settings?.noiseFilter} onCheckedChange={checked => updateSetting("noiseFilter", checked)} />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="normalizeAudio" className="flex-1">Normalizar Audio</Label>
              <Switch id="normalizeAudio" checked={settings?.normalizeAudio} onCheckedChange={checked => updateSetting("normalizeAudio", checked)} />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="sentiment_analysis" className="flex-1">Análisis de Sentimiento</Label>
              <Switch id="sentiment_analysis" checked={settings?.sentiment_analysis} onCheckedChange={checked => updateSetting("sentiment_analysis", checked)} />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="keyword_spotting" className="flex-1">Detección de Palabras Clave</Label>
              <Switch id="keyword_spotting" checked={settings?.keyword_spotting} onCheckedChange={checked => updateSetting("keyword_spotting", checked)} />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="speakerDiarization" className="flex-1">Separación de Interlocutores</Label>
              <Switch id="speakerDiarization" checked={settings?.speakerDiarization} onCheckedChange={checked => updateSetting("speakerDiarization", checked)} />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="speechRateDetection" className="flex-1">Detección de Velocidad del Habla</Label>
              <Switch id="speechRateDetection" checked={settings?.speechRateDetection} onCheckedChange={checked => updateSetting("speechRateDetection", checked)} />
            </div>

            <Separator />

            <div className="space-y-2">
              <Label htmlFor="minSilenceDuration">Duración Mínima de Silencio (ms)</Label>
              <Input id="minSilenceDuration" type="number" value={settings?.minSilenceDuration?.toString() || "100"} onChange={e => updateSetting("minSilenceDuration", parseInt(e.target.value))} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="silenceThreshold">Umbral de Silencio</Label>
              <Input id="silenceThreshold" type="number" value={settings?.silenceThreshold?.toString() || "-40"} onChange={e => updateSetting("silenceThreshold", parseInt(e.target.value))} />
            </div>
            
            <div className="flex justify-between pt-4">
              <Button variant="outline" onClick={resetSettings} disabled={isSaving}>
                Restaurar valores predeterminados
              </Button>
              
              <Button onClick={handleSaveSettings} disabled={isSaving}>
                {isSaving ? <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Guardando...
                  </> : "Guardar cambios"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <Card>
        
        
      </Card>
    </div>;
}