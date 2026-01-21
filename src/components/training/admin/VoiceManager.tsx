import React, { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { RefreshCw, Volume2, Settings, AlertCircle } from 'lucide-react';
import { useTrainingVoices } from '@/hooks/useTrainingVoices';
import { useGlobalVoice } from '@/hooks/useGlobalVoice';
import { VoiceFilters } from './VoiceFilters';
import { VoiceCard } from './VoiceCard';
import { getVoiceMetadata } from '@/lib/voice-data';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Alert, AlertDescription } from '@/components/ui/alert';

export function VoiceManager() {
  const { voices, loading, refetch, testTrainingVoice } = useTrainingVoices();
  const { 
    globalVoice, 
    voiceSettings, 
    ttsModel,
    selectGlobalVoice, 
    updateVoiceSettings,
    updateTtsModel
  } = useGlobalVoice();
  
  // Estados de filtros
  const [selectedAccent, setSelectedAccent] = useState('all');
  const [selectedGender, setSelectedGender] = useState('all');
  const [selectedAge, setSelectedAge] = useState('all');
  const [selectedDescriptive, setSelectedDescriptive] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Estados de UI
  const [testText, setTestText] = useState('Hola, bienvenido a nuestro sistema de entrenamientos con voces profesionales en español.');
  const [playingVoice, setPlayingVoice] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [hasAgentId, setHasAgentId] = useState(false);

  // Verificar si hay Agent ID configurado
  useEffect(() => {
    const checkAgentId = () => {
      const agentId = localStorage.getItem('elevenlabs_agent_id');
      setHasAgentId(!!agentId);
    };
    
    checkAgentId();
    
    // Escuchar cambios en localStorage (para cuando se configura desde ElevenLabsConfig)
    window.addEventListener('storage', checkAgentId);
    
    // También escuchar un evento personalizado para cambios en la misma pestaña
    const handleAgentIdUpdate = () => checkAgentId();
    window.addEventListener('elevenlabs-agent-id-updated', handleAgentIdUpdate);
    
    return () => {
      window.removeEventListener('storage', checkAgentId);
      window.removeEventListener('elevenlabs-agent-id-updated', handleAgentIdUpdate);
    };
  }, []);

  // Filtrar voces
  const filteredVoices = useMemo(() => {
    return voices.filter(voice => {
      const metadata = getVoiceMetadata(voice.voice_id);
      
      // Filtro por búsqueda
      if (searchTerm && !voice.name.toLowerCase().includes(searchTerm.toLowerCase())) {
        return false;
      }
      
      // Filtro por acento
      if (selectedAccent && selectedAccent !== 'all' && metadata.accent !== selectedAccent) {
        return false;
      }
      
      // Filtro por género
      if (selectedGender && selectedGender !== 'all' && metadata.gender !== selectedGender) {
        return false;
      }
      
      // Filtro por edad
      if (selectedAge && selectedAge !== 'all' && metadata.age !== selectedAge) {
        return false;
      }
      
      // Filtro por descriptivo
      if (selectedDescriptive && selectedDescriptive !== 'all' && metadata.descriptive !== selectedDescriptive) {
        return false;
      }
      
      return true;
    });
  }, [voices, searchTerm, selectedAccent, selectedGender, selectedAge, selectedDescriptive]);

  const handleTestVoice = async (voiceId: string) => {
    if (playingVoice === voiceId) {
      setPlayingVoice(null);
      return;
    }

    setPlayingVoice(voiceId);
    try {
      const audioUrl = await testTrainingVoice(voiceId, testText, voiceSettings, ttsModel);
      if (audioUrl) {
        const audio = new Audio(audioUrl);
        audio.onended = () => setPlayingVoice(null);
        audio.onerror = () => {
          console.error('Error playing audio');
          setPlayingVoice(null);
        };
        await audio.play();
      }
    } catch (error) {
      console.error('Error playing training voice:', error);
      setPlayingVoice(null);
    }
  };

  const handleVoiceSelect = (voice: typeof voices[0]) => {
    selectGlobalVoice(voice);
  };

  const clearAllFilters = () => {
    setSelectedAccent('all');
    setSelectedGender('all');
    setSelectedAge('all');
    setSelectedDescriptive('all');
    setSearchTerm('');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">Gestión de Voces</h3>
          <p className="text-sm text-muted-foreground">
            Selecciona una voz global para todos los entrenamientos y escenarios
          </p>
        </div>
        <Button onClick={refetch} variant="outline">
          <RefreshCw className="h-4 w-4 mr-2" />
          Actualizar
        </Button>
      </div>

      {/* Voz Global Seleccionada */}
      {globalVoice && (
        <>
          <Card className="border-2 border-primary/20 bg-primary/5">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Volume2 className="h-4 w-4 text-primary" />
                Voz Global Seleccionada
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div>
                    <p className="font-medium">{globalVoice.name}</p>
                    <div className="flex items-center gap-2">
                      {getVoiceMetadata(globalVoice.voice_id).accent && (
                        <Badge variant="outline" className="text-xs">
                          {getVoiceMetadata(globalVoice.voice_id).accent}
                        </Badge>
                      )}
                      {getVoiceMetadata(globalVoice.voice_id).gender && (
                        <Badge variant="outline" className="text-xs">
                          {getVoiceMetadata(globalVoice.voice_id).gender}
                        </Badge>
                      )}
                      {globalVoice.category === 'elevenlabs' && (
                        <Badge variant="default" className="text-xs">
                          ElevenLabs
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleTestVoice(globalVoice.voice_id)}
                  disabled={!testText.trim()}
                >
                  {playingVoice === globalVoice.voice_id ? 'Pausar' : 'Probar'}
                </Button>
              </div>
            </CardContent>
          </Card>
          
          {/* Alerta si es voz de ElevenLabs sin Agent ID */}
          {globalVoice.category === 'elevenlabs' && !hasAgentId && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>WebRTC de ElevenLabs no configurado:</strong> Has seleccionado una voz de ElevenLabs, 
                pero no tienes un Agent ID configurado. Los entrenamientos en modo voz usarán OpenAI como fallback.
                Configura tu Agent ID arriba para usar ElevenLabs WebRTC.
              </AlertDescription>
            </Alert>
          )}
        </>
      )}

      {/* Configuración de Prueba */}
      <Card>
        <Collapsible open={showSettings} onOpenChange={setShowSettings}>
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
              <CardTitle className="text-base flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Settings className="h-4 w-4" />
                  Configuración de Prueba
                </div>
                <Button variant="ghost" size="sm">
                  {showSettings ? 'Ocultar' : 'Mostrar'}
                </Button>
              </CardTitle>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="test-text">Texto de Prueba</Label>
                <Input
                  id="test-text"
                  value={testText}
                  onChange={(e) => setTestText(e.target.value)}
                  placeholder="Escribe el texto que deseas probar..."
                />
              </div>

              {globalVoice && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-muted/50 rounded-lg">
                  <div className="space-y-2">
                    <Label>Estabilidad: {voiceSettings.stability.toFixed(1)}</Label>
                    <Slider
                      value={[voiceSettings.stability]}
                      onValueChange={([value]) => updateVoiceSettings({ stability: value })}
                      max={1}
                      step={0.1}
                      className="w-full"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Similitud: {voiceSettings.similarity_boost.toFixed(1)}</Label>
                    <Slider
                      value={[voiceSettings.similarity_boost]}
                      onValueChange={([value]) => updateVoiceSettings({ similarity_boost: value })}
                      max={1}
                      step={0.1}
                      className="w-full"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Estilo: {voiceSettings.style.toFixed(1)}</Label>
                    <Slider
                      value={[voiceSettings.style]}
                      onValueChange={([value]) => updateVoiceSettings({ style: value })}
                      max={1}
                      step={0.1}
                      className="w-full"
                    />
                  </div>
                </div>
              )}
            </CardContent>
          </CollapsibleContent>
        </Collapsible>
      </Card>

      {/* Model Selector */}
      {globalVoice && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Modelo TTS</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Label htmlFor="tts-model">
                {globalVoice.category === 'openai' ? 'Modelo de OpenAI' : 'Modelo de ElevenLabs'}
              </Label>
              <select
                id="tts-model"
                value={ttsModel}
                onChange={(e) => updateTtsModel(e.target.value)}
                className="w-full px-3 py-2 rounded-md border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring"
              >
                {globalVoice.category === 'openai' ? (
                  <>
                    <option value="tts-1">TTS-1 (Rápido)</option>
                    <option value="tts-1-hd">TTS-1-HD (Alta Calidad)</option>
                    <option value="gpt-4o-mini-tts">GPT-4o Mini TTS</option>
                  </>
                ) : (
                  <>
                    <option value="eleven_turbo_v2_5">Eleven Turbo v2.5 (Rápido)</option>
                    <option value="eleven_multilingual_v2">Eleven Multilingual v2</option>
                    <option value="eleven_flash_v2_5">Eleven Flash v2.5 (Más Rápido)</option>
                  </>
                )}
              </select>
              <p className="text-xs text-muted-foreground">
                {globalVoice.category === 'openai' 
                  ? 'Este modelo se usará para todas las conversaciones de entrenamiento'
                  : 'Este modelo se usará para todas las conversaciones de entrenamiento'}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filtros */}
      <VoiceFilters
        selectedAccent={selectedAccent}
        selectedGender={selectedGender}
        selectedAge={selectedAge}
        selectedDescriptive={selectedDescriptive}
        searchTerm={searchTerm}
        onAccentChange={setSelectedAccent}
        onGenderChange={setSelectedGender}
        onAgeChange={setSelectedAge}
        onDescriptiveChange={setSelectedDescriptive}
        onSearchChange={setSearchTerm}
        onClearFilters={clearAllFilters}
      />

      {/* Resultados */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Mostrando {filteredVoices.length} de {voices.length} voces
          </p>
        </div>

        {/* Grid de Voces */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredVoices.map((voice) => (
            <VoiceCard
              key={voice.voice_id}
              voice={voice}
              isSelected={globalVoice?.voice_id === voice.voice_id}
              isPlaying={playingVoice === voice.voice_id}
              canTest={!!testText.trim()}
              onSelect={() => handleVoiceSelect(voice)}
              onTest={() => handleTestVoice(voice.voice_id)}
            />
          ))}
        </div>

        {/* Sin resultados */}
        {filteredVoices.length === 0 && voices.length > 0 && (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Volume2 className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No se encontraron voces</h3>
              <p className="text-muted-foreground text-center mb-4">
                Prueba ajustando los filtros de búsqueda
              </p>
              <Button onClick={clearAllFilters} variant="outline">
                Limpiar filtros
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Sin voces */}
        {voices.length === 0 && (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Volume2 className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No hay voces disponibles</h3>
              <p className="text-muted-foreground text-center mb-4">
                Verifica que el Modelo_Voz_convert-IA esté configurado correctamente
              </p>
              <Button onClick={refetch}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Reintentar
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}