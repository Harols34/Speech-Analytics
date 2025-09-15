import { useState } from "react";
import Layout from "@/components/layout/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { 
  VolumeX, 
  Volume, 
  Languages,
  RefreshCcw,
  Clock,
  BarChart4,
  Mic,
  FileAudio
} from "lucide-react";

export default function ToolsPage() {
  const [silenceDetection, setSilenceDetection] = useState(true);
  const [silenceThreshold, setSilenceThreshold] = useState(0.2);
  const [minSilenceDuration, setMinSilenceDuration] = useState(2);

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Herramientas</h2>
          <p className="text-muted-foreground">
            Configura y utiliza herramientas para análisis avanzado
          </p>
        </div>

        <Tabs defaultValue="audio" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="audio">Análisis de Audio</TabsTrigger>
            <TabsTrigger value="transcription">Transcripción</TabsTrigger>
            <TabsTrigger value="analytics">Visualizaciones</TabsTrigger>
          </TabsList>

          <TabsContent value="audio" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <VolumeX className="mr-2 h-5 w-5 text-purple" />
                  Detección de Silencios
                </CardTitle>
                <CardDescription>
                  Configura la detección de espacios sin audio en las grabaciones
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label htmlFor="silence-detection">Activar detección de silencios</Label>
                  <Switch 
                    id="silence-detection" 
                    checked={silenceDetection}
                    onCheckedChange={setSilenceDetection}
                  />
                </div>
                
                <div className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <Label htmlFor="threshold">Umbral de volumen ({silenceThreshold})</Label>
                      <span className="text-sm text-muted-foreground">De 0 a 1</span>
                    </div>
                    <Input 
                      id="threshold" 
                      type="range" 
                      min="0.05" 
                      max="0.5" 
                      step="0.05"
                      value={silenceThreshold}
                      onChange={(e) => setSilenceThreshold(parseFloat(e.target.value))}
                      disabled={!silenceDetection}
                      className="w-full"
                    />
                    <p className="text-xs text-muted-foreground">Un valor más bajo detectará silencios más sutiles</p>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <Label htmlFor="duration">Duración mínima ({minSilenceDuration}s)</Label>
                      <span className="text-sm text-muted-foreground">En segundos</span>
                    </div>
                    <Input 
                      id="duration" 
                      type="range" 
                      min="0.5" 
                      max="5" 
                      step="0.5"
                      value={minSilenceDuration}
                      onChange={(e) => setMinSilenceDuration(parseFloat(e.target.value))}
                      disabled={!silenceDetection}
                      className="w-full"
                    />
                    <p className="text-xs text-muted-foreground">Duración mínima para considerar un segmento como silencio</p>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="flex justify-between">
                <Button variant="outline">Restablecer</Button>
                <Button>Guardar Configuración</Button>
              </CardFooter>
            </Card>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center">
                    <Volume className="mr-2 h-5 w-5 text-bright-green" />
                    Normalización de Audio
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">Equilibra el volumen entre diferentes partes de la grabación</p>
                </CardContent>
                <CardFooter>
                  <div className="w-full flex justify-between items-center">
                    <Label htmlFor="normalize">Activar</Label>
                    <Switch id="normalize" />
                  </div>
                </CardFooter>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center">
                    <Mic className="mr-2 h-5 w-5 text-purple" />
                    Filtro de Ruido
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">Reduce el ruido de fondo en las grabaciones</p>
                </CardContent>
                <CardFooter>
                  <div className="w-full flex justify-between items-center">
                    <Label htmlFor="noise-filter">Activar</Label>
                    <Switch id="noise-filter" />
                  </div>
                </CardFooter>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center">
                    <Clock className="mr-2 h-5 w-5 text-medium-green" />
                    Detección de Habla Rápida
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">Identifica segmentos donde el ritmo de habla es demasiado rápido</p>
                </CardContent>
                <CardFooter>
                  <div className="w-full flex justify-between items-center">
                    <Label htmlFor="speech-rate">Activar</Label>
                    <Switch id="speech-rate" />
                  </div>
                </CardFooter>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="transcription" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Languages className="mr-2 h-5 w-5 text-purple" />
                  Configuración de Transcripción
                </CardTitle>
                <CardDescription>
                  Ajusta el comportamiento del sistema de transcripción
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="language">Idioma principal</Label>
                    <select id="language" className="w-full p-2 rounded-md border border-input">
                      <option value="es-ES">Español (España)</option>
                      <option value="es-MX">Español (México)</option>
                      <option value="es-CO">Español (Colombia)</option>
                      <option value="en-US">Inglés (EEUU)</option>
                    </select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="model">Modelo de transcripción</Label>
                    <select id="model" className="w-full p-2 rounded-md border border-input">
                      <option value="standard">Estándar</option>
                      <option value="enhanced">Mejorado</option>
                      <option value="medical">Especializado (Médico)</option>
                      <option value="finance">Especializado (Finanzas)</option>
                    </select>
                  </div>
                </div>
                
                <Separator />
                
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="speaker-diarization">Identificación de hablantes</Label>
                      <p className="text-xs text-muted-foreground">Distingue automáticamente entre diferentes hablantes</p>
                    </div>
                    <Switch id="speaker-diarization" defaultChecked />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="punctuation">Puntuación automática</Label>
                      <p className="text-xs text-muted-foreground">Añade puntuación y mayúsculas automáticamente</p>
                    </div>
                    <Switch id="punctuation" defaultChecked />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="timestamps">Marcas de tiempo detalladas</Label>
                      <p className="text-xs text-muted-foreground">Añade marcas de tiempo para cada palabra</p>
                    </div>
                    <Switch id="timestamps" />
                  </div>
                </div>
              </CardContent>
              <CardFooter>
                <Button className="w-full">Guardar Configuración</Button>
              </CardFooter>
            </Card>
          </TabsContent>

          <TabsContent value="analytics" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <BarChart4 className="mr-2 h-5 w-5 text-bright-green" />
                  Configuración de Visualizaciones
                </CardTitle>
                <CardDescription>
                  Personaliza el aspecto visual de los informes y gráficos
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-3">
                    <Label>Colores para segmentos de audio</Label>
                    <div className="flex items-center space-x-2">
                      <div className="w-6 h-6 rounded bg-agent"></div>
                      <span className="text-sm">Agente</span>
                      <RefreshCcw className="h-4 w-4 ml-auto hover:text-muted-foreground cursor-pointer" />
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="w-6 h-6 rounded bg-client"></div>
                      <span className="text-sm">Cliente</span>
                      <RefreshCcw className="h-4 w-4 ml-auto hover:text-muted-foreground cursor-pointer" />
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="w-6 h-6 rounded bg-silence"></div>
                      <span className="text-sm">Silencio</span>
                      <RefreshCcw className="h-4 w-4 ml-auto hover:text-muted-foreground cursor-pointer" />
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <Label>Temas de gráficos</Label>
                    <div className="space-y-2">
                      <div className="flex items-center">
                        <input type="radio" id="theme1" name="theme" className="mr-2" defaultChecked />
                        <label htmlFor="theme1" className="text-sm">Tema corporativo</label>
                      </div>
                      <div className="flex items-center">
                        <input type="radio" id="theme2" name="theme" className="mr-2" />
                        <label htmlFor="theme2" className="text-sm">Alto contraste</label>
                      </div>
                      <div className="flex items-center">
                        <input type="radio" id="theme3" name="theme" className="mr-2" />
                        <label htmlFor="theme3" className="text-sm">Personalizado</label>
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <Label>Vista por defecto</Label>
                    <div className="space-y-2">
                      <div className="flex items-center">
                        <input type="radio" id="view1" name="view" className="mr-2" defaultChecked />
                        <label htmlFor="view1" className="text-sm">Gráficos agrupados</label>
                      </div>
                      <div className="flex items-center">
                        <input type="radio" id="view2" name="view" className="mr-2" />
                        <label htmlFor="view2" className="text-sm">Vista detallada</label>
                      </div>
                      <div className="flex items-center">
                        <input type="radio" id="view3" name="view" className="mr-2" />
                        <label htmlFor="view3" className="text-sm">Vista compacta</label>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
              <CardFooter>
                <Button variant="outline" className="mr-2">Restablecer</Button>
                <Button>Aplicar Cambios</Button>
              </CardFooter>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Visualización de Transcripciones</CardTitle>
                <CardDescription>Ejemplo de visualización con los colores seleccionados</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="agent-segment p-4 rounded-md">
                    <div className="flex items-center gap-2 mb-2">
                      <Mic className="h-5 w-5 text-agent" />
                      <span className="text-sm font-medium">Agente</span>
                      <span className="text-xs text-muted-foreground ml-auto">00:05 - 00:15</span>
                    </div>
                    <p className="ml-7 text-sm">
                      Buenas tardes, gracias por llamar a Servicio al Cliente. ¿En qué puedo ayudarle hoy?
                    </p>
                  </div>
                  
                  <div className="client-segment p-4 rounded-md">
                    <div className="flex items-center gap-2 mb-2">
                      <FileAudio className="h-5 w-5 text-client" />
                      <span className="text-sm font-medium">Cliente</span>
                      <span className="text-xs text-muted-foreground ml-auto">00:15 - 00:25</span>
                    </div>
                    <p className="ml-7 text-sm">
                      Hola, llamo porque tengo un problema con mi factura de este mes, creo que hay un cargo incorrecto.
                    </p>
                  </div>
                  
                  <div className="silence-segment p-4 rounded-md">
                    <div className="flex items-center gap-2 mb-2">
                      <VolumeX className="h-5 w-5 text-gray-400" />
                      <span className="text-sm font-medium">Silencio</span>
                      <span className="text-xs text-muted-foreground ml-auto">00:25 - 00:28</span>
                    </div>
                    <p className="ml-7 text-sm text-muted-foreground">[Silencio detectado - 3 segundos]</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}
