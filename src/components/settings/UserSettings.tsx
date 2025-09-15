
import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useUserSettings } from "@/hooks/useUserSettings";
import { toast } from "sonner";
import { Eye, EyeOff } from "lucide-react";

const userSettingsSchema = z.object({
  transcription_model: z.string().default('openai-whisper'),
  analysis_model: z.string().default('gpt-4o'),
  openai_api_key: z.string().optional(),
  speaker_diarization: z.boolean().default(true),
  sentiment_analysis: z.boolean().default(true),
  auto_feedback: z.boolean().default(true),
  keyword_spotting: z.boolean().default(true),
});

type UserSettingsFormValues = z.infer<typeof userSettingsSchema>;

export default function UserSettings() {
  const { settings, loading, updateSettings } = useUserSettings();
  const [showApiKey, setShowApiKey] = React.useState(false);

  const form = useForm<UserSettingsFormValues>({
    resolver: zodResolver(userSettingsSchema),
    defaultValues: {
      transcription_model: settings?.transcription_model || 'openai-whisper',
      analysis_model: settings?.analysis_model || 'gpt-4o',
      openai_api_key: settings?.openai_api_key || '',
      speaker_diarization: settings?.speaker_diarization ?? true,
      sentiment_analysis: settings?.sentiment_analysis ?? true,
      auto_feedback: settings?.auto_feedback ?? true,
      keyword_spotting: settings?.keyword_spotting ?? true,
    },
  });

  React.useEffect(() => {
    if (settings) {
      form.reset({
        transcription_model: settings.transcription_model || 'openai-whisper',
        analysis_model: settings.analysis_model || 'gpt-4o',
        openai_api_key: settings.openai_api_key || '',
        speaker_diarization: settings.speaker_diarization ?? true,
        sentiment_analysis: settings.sentiment_analysis ?? true,
        auto_feedback: settings.auto_feedback ?? true,
        keyword_spotting: settings.keyword_spotting ?? true,
      });
    }
  }, [settings, form]);

  const onSubmit = async (data: UserSettingsFormValues) => {
    try {
      await updateSettings(data);
      toast.success("Configuración guardada correctamente");
    } catch (error) {
      console.error("Error saving settings:", error);
      toast.error("Error al guardar la configuración");
    }
  };

  if (loading) {
    return <div>Cargando configuración...</div>;
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Configuración de OpenAI</CardTitle>
            <CardDescription>
              Configura tu clave de API de OpenAI para funcionalidades de IA
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="openai_api_key"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Clave de API de OpenAI</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input
                        {...field}
                        type={showApiKey ? "text" : "password"}
                        placeholder="sk-..."
                        className="pr-10"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                        onClick={() => setShowApiKey(!showApiKey)}
                      >
                        {showApiKey ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </FormControl>
                  <FormDescription>
                    Tu clave de API de OpenAI se almacena de forma segura y solo es visible para ti.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Modelos de IA</CardTitle>
            <CardDescription>
              Selecciona los modelos que prefieres para transcripción y análisis
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="transcription_model"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Modelo de Transcripción</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona un modelo" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="openai-whisper">OpenAI Whisper</SelectItem>
                      <SelectItem value="azure-speech">Azure Speech</SelectItem>
                      <SelectItem value="google-speech">Google Speech</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="analysis_model"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Modelo de Análisis</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona un modelo" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="gpt-4o">GPT-4o</SelectItem>
                      <SelectItem value="gpt-4">GPT-4</SelectItem>
                      <SelectItem value="gpt-3.5-turbo">GPT-3.5 Turbo</SelectItem>
                      <SelectItem value="claude-3-opus">Claude 3 Opus</SelectItem>
                      <SelectItem value="claude-3-sonnet">Claude 3 Sonnet</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Configuraciones de Análisis</CardTitle>
            <CardDescription>
              Configura las funcionalidades de análisis automático
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <FormField
              control={form.control}
              name="speaker_diarization"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">Separación de Hablantes</FormLabel>
                    <FormDescription>
                      Identifica y separa diferentes hablantes en la grabación
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="sentiment_analysis"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">Análisis de Sentimiento</FormLabel>
                    <FormDescription>
                      Analiza automáticamente el tono y sentimiento de la conversación
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="auto_feedback"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">Feedback Automático</FormLabel>
                    <FormDescription>
                      Genera automáticamente feedback y sugerencias de mejora
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="keyword_spotting"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">Detección de Palabras Clave</FormLabel>
                    <FormDescription>
                      Identifica automáticamente palabras clave y temas importantes
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button type="submit" disabled={loading}>
            {loading ? "Guardando..." : "Guardar Configuración"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
