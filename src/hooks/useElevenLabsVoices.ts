import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { ElevenLabsVoice } from '@/lib/types/training';
import { toast } from 'sonner';

export function useElevenLabsVoices() {
  const [voices, setVoices] = useState<ElevenLabsVoice[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchVoices = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('get-elevenlabs-voices');
      
      if (error) {
        console.error('Error fetching voices:', error);
        toast.error('Error al cargar las voces');
        return;
      }

      if (data?.voices) {
        setVoices(data.voices);
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('Error al conectar con el servicio de voces');
    } finally {
      setLoading(false);
    }
  };

  const testVoice = async (voiceId: string, text: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('test-voice', {
        body: { voiceId, text }
      });

      if (error) {
        const serverMsg = (data as any)?.message || (error as any)?.message;
        toast.error(serverMsg || 'Error al probar la voz');
        return null;
      }

      if (!data?.success || !data?.audioUrl) {
        toast.error(data?.message || 'No se recibió audio');
        return null;
      }

      return data.audioUrl as string;
    } catch (error) {
      console.error('Error testing voice:', error);
      toast.error('Error al probar la voz');
      return null;
    }
  };

  useEffect(() => {
    fetchVoices();
  }, []);

  return {
    voices,
    loading,
    refetch: fetchVoices,
    testVoice
  };
}