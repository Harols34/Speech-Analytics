import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Play, Pause, Volume2, Check, Info } from 'lucide-react';
import { ElevenLabsVoice } from '@/lib/types/training';
import { getVoiceMetadata } from '@/lib/voice-data';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface VoiceCardProps {
  voice: ElevenLabsVoice;
  isSelected: boolean;
  isPlaying: boolean;
  canTest: boolean;
  onSelect: () => void;
  onTest: () => void;
}

export function VoiceCard({
  voice,
  isSelected,
  isPlaying,
  canTest,
  onSelect,
  onTest
}: VoiceCardProps) {
  const metadata = getVoiceMetadata(voice.voice_id);

  const getCategoryColor = (category?: string) => {
    switch (category?.toLowerCase()) {
      case 'cloned': return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
      case 'generated': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'professional': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
    }
  };

  const getGenderColor = (gender: string) => {
    switch (gender?.toLowerCase()) {
      case 'femenino': return 'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200';
      case 'masculino': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
    }
  };

  return (
    <Card 
      className={`group hover:shadow-md transition-all cursor-pointer ${
        isSelected ? 'ring-2 ring-primary bg-primary/5' : ''
      }`}
      onClick={onSelect}
    >
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <CardTitle className="text-base flex items-center gap-2">
              {voice.name}
              {isSelected && <Check className="h-4 w-4 text-primary" />}
            </CardTitle>
            <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
              <span>{metadata.accent}</span>
              <span>•</span>
              <span>{metadata.age}</span>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onTest();
            }}
            disabled={!canTest}
            className="h-8 w-8 p-0"
          >
            {isPlaying ? (
              <Pause className="h-4 w-4" />
            ) : (
              <Play className="h-4 w-4" />
            )}
          </Button>
        </div>

        {voice.description && (
          <p className="text-sm text-muted-foreground line-clamp-2 mt-2">
            {voice.description}
          </p>
        )}
      </CardHeader>
      
      <CardContent className="space-y-3">
        {/* Compatibilidad (TTS / WebRTC) */}
        {(() => {
          const openaiRealtimeSet = new Set(['alloy','ash','ballad','coral','echo','sage','shimmer','verse']);
          const openaiIds = new Set(['alloy','echo','fable','onyx','nova','shimmer','ash','ballad','coral','sage','verse']);
          // Detect provider robustly: prefer explicit category, fallback to known IDs
          const isOpenAI = voice.category === 'openai' || openaiIds.has(voice.voice_id);
          const isElevenLabs = voice.category === 'elevenlabs' || (!isOpenAI);
          
          // OpenAI: solo ciertas voces tienen WebRTC
          // ElevenLabs: todas soportan WebRTC (requiere Agent ID configurado)
          const canWebRTC = (isOpenAI && openaiRealtimeSet.has(voice.voice_id)) || isElevenLabs;
          
          const capsText = canWebRTC ? 'tts-webrtc' : 'tts';
          const tooltip = canWebRTC
            ? (isOpenAI 
                ? 'Compatibilidad: TTS tradicional y WebRTC OpenAI Realtime (baja latencia)'
                : 'Compatibilidad: TTS tradicional y WebRTC ElevenLabs (requiere configurar Agent ID)')
            : (isOpenAI
              ? 'Compatibilidad: Solo TTS. Para WebRTC usa Alloy, Ash, Ballad, Coral, Echo, Sage, Shimmer o Verse'
              : 'Compatibilidad: Solo TTS');
          
          return (
            <div className="flex items-center justify-between">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Badge variant="outline" className="text-[10px] flex items-center gap-1">
                    <Info className="h-3 w-3" />
                    {capsText.toUpperCase()}
                  </Badge>
                </TooltipTrigger>
                <TooltipContent className="max-w-xs text-xs">
                  {tooltip}
                </TooltipContent>
              </Tooltip>
              <Badge variant="secondary" className="text-[10px]">
                {isOpenAI ? 'OpenAI' : 'ElevenLabs'}
              </Badge>
            </div>
          );
        })()}

        {/* Badges */}
        <div className="flex flex-wrap gap-1.5">
          <Badge variant="outline" className={getGenderColor(metadata.gender)} style={{ fontSize: '10px' }}>
            {metadata.gender}
          </Badge>
          <Badge variant="outline" className="text-xs">
            {metadata.accent}
          </Badge>
          <Badge variant="default" className="text-xs">
            {metadata.descriptive}
          </Badge>
        </div>

        {/* Voice ID */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Volume2 className="h-3 w-3" />
          <span>ID: {voice.voice_id.slice(0, 8)}...</span>
        </div>

        {/* Voice Settings (if available) */}
        {voice.settings && (
          <div className="text-xs text-muted-foreground space-y-1 bg-muted/50 p-2 rounded">
            <div className="grid grid-cols-2 gap-2">
              <span>Estabilidad: {voice.settings.stability}</span>
              <span>Similitud: {voice.settings.similarity_boost}</span>
              {voice.settings.style && (
                <span className="col-span-2">Estilo: {voice.settings.style}</span>
              )}
            </div>
          </div>
        )}

        {/* Select Button */}
        <Button 
          variant={isSelected ? "default" : "outline"} 
          size="sm" 
          className="w-full"
          onClick={(e) => {
            e.stopPropagation();
            onSelect();
          }}
        >
          {isSelected ? 'Voz Global Seleccionada' : 'Seleccionar como Global'}
        </Button>
      </CardContent>
    </Card>
  );
}