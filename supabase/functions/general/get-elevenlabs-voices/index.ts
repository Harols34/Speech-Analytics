import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const defaultVoices = [
  { voice_id: '9BWtsMINqrJLrRacOk9x', name: 'Aria', category: 'elevenlabs', original_category: 'default' },
  { voice_id: 'CwhRBWXzGAHq8TQ4Fs17', name: 'Roger', category: 'elevenlabs', original_category: 'default' },
  { voice_id: 'EXAVITQu4vr4xnSDxMaL', name: 'Sarah', category: 'elevenlabs', original_category: 'default' },
  { voice_id: 'FGY2WhTYpPnrIDTdsKH5', name: 'Laura', category: 'elevenlabs', original_category: 'default' },
  { voice_id: 'IKne3meq5aSn9XLyUdCD', name: 'Charlie', category: 'elevenlabs', original_category: 'default' },
  { voice_id: 'JBFqnCBsd6RMkjVDRZzb', name: 'George', category: 'elevenlabs', original_category: 'default' },
  { voice_id: 'N2lVS1w4EtoT3dr4eOWO', name: 'Callum', category: 'elevenlabs', original_category: 'default' },
  { voice_id: 'SAz9YHcvj6GT2YYXdXww', name: 'River', category: 'elevenlabs', original_category: 'default' },
  { voice_id: 'TX3LPaxmHKxFdv7VOQHJ', name: 'Liam', category: 'elevenlabs', original_category: 'default' },
  { voice_id: 'XB0fDUnXU5powFXDhCwa', name: 'Charlotte', category: 'elevenlabs', original_category: 'default' },
  { voice_id: 'Xb7hH8MSUJpSbSDYk0k2', name: 'Alice', category: 'elevenlabs', original_category: 'default' },
  { voice_id: 'XrExE9yKIg1WjnnlVkGX', name: 'Matilda', category: 'elevenlabs', original_category: 'default' },
  { voice_id: 'bIHbv24MWmeRgasZH58o', name: 'Will', category: 'elevenlabs', original_category: 'default' },
  { voice_id: 'cgSgspJ2msm6clMCkdW9', name: 'Jessica', category: 'elevenlabs', original_category: 'default' },
  { voice_id: 'cjVigY5qzO86Huf0OWal', name: 'Eric', category: 'elevenlabs', original_category: 'default' },
  { voice_id: 'iP95p4xoKVk53GoZ742B', name: 'Chris', category: 'elevenlabs', original_category: 'default' },
  { voice_id: 'nPczCjzI2devNBz1zQrb', name: 'Brian', category: 'elevenlabs', original_category: 'default' },
  { voice_id: 'onwK4e9ZLuTAKqWW03F9', name: 'Daniel', category: 'elevenlabs', original_category: 'default' },
  { voice_id: 'pFZP5JQG7iQjIQuC4Bku', name: 'Lily', category: 'elevenlabs', original_category: 'default' },
  { voice_id: 'pqHfZKP75CvOlQylNhV4', name: 'Bill', category: 'elevenlabs', original_category: 'default' },
];

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Try both possible secret names (connector vs manual)
    const apiKey = Deno.env.get('ELEVENLABS_API_KEY_1') || Deno.env.get('ELEVENLABS_API_KEY');
    if (!apiKey) {
      console.warn('ELEVENLABS_API_KEY no configurada (tried both), devolviendo voces por defecto');
      return new Response(JSON.stringify({ success: true, voices: defaultVoices }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const res = await fetch('https://api.elevenlabs.io/v1/voices', {
      headers: { 'xi-api-key': apiKey },
    });

    if (!res.ok) {
      const text = await res.text();
      console.error('Error al obtener voces de ElevenLabs:', res.status, text);
      // Fallback a voces por defecto
      return new Response(JSON.stringify({ success: true, voices: defaultVoices }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = await res.json();
    const voices = (body?.voices || []).map((v: any) => ({
      voice_id: v.voice_id,
      name: v.name,
      category: 'elevenlabs', // Provider identifier
      original_category: v.category || 'custom', // Original ElevenLabs category
      description: v.description,
      preview_url: v.preview_url,
      settings: v.settings,
      gender: v.labels?.gender,
      age: v.labels?.age,
      accent: v.labels?.accent,
      language: v.labels?.language,
    }));

    // Si no hay voces del API, usamos el fallback por defecto
    const finalVoices = voices.length ? voices : defaultVoices;

    return new Response(JSON.stringify({ success: true, voices: finalVoices }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error inesperado obteniendo voces:', error);
    return new Response(JSON.stringify({ success: true, voices: defaultVoices }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});