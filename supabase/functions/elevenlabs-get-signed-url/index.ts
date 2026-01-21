import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🔵 ElevenLabs connection request received');
    const { agentId, scenario, voiceId, connectionType = 'webrtc' } = await req.json();
    const envAgentId = Deno.env.get('ELEVENLABS_AGENT_ID');
    const agent = agentId || envAgentId || '';
    console.log('📦 Request payload:', { agentId: agent || 'none', voiceId, scenarioName: scenario?.name, connectionType });

    // Try both possible secret names (connector vs manual)
    const ELEVENLABS_API_KEY = Deno.env.get('ELEVENLABS_API_KEY_1') || Deno.env.get('ELEVENLABS_API_KEY');
    if (!ELEVENLABS_API_KEY) {
      console.error('❌ ELEVENLABS_API_KEY not configured (tried ELEVENLABS_API_KEY_1 and ELEVENLABS_API_KEY)');
      throw new Error('ELEVENLABS_API_KEY not configured');
    }
    console.log('✅ ElevenLabs API key found');

    // If agentId is provided or configured via secret, get token/signed URL for that agent
    if (agent) {
      console.log(`🎯 Using Agent ID: ${agent}`);
      console.log(`📋 Connection type: ${connectionType}`);
      
      let url: string;
      let responseKey: string;
      
      // Use different endpoints based on connection type
      if (connectionType === 'webrtc') {
        // WebRTC requires a conversation token
        url = `https://api.elevenlabs.io/v1/convai/conversation/token?agent_id=${agent}`;
        responseKey = 'token';
        console.log(`📡 Fetching WebRTC token from: ${url}`);
      } else {
        // WebSocket uses signed URL
        url = `https://api.elevenlabs.io/v1/convai/conversation/get_signed_url?agent_id=${agent}`;
        responseKey = 'signed_url';
        console.log(`📡 Fetching WebSocket signed URL from: ${url}`);
      }
      
      const response = await fetch(url, {
        method: "GET",
        headers: {
          "xi-api-key": ELEVENLABS_API_KEY,
        },
      });

      console.log(`📊 ElevenLabs API response status: ${response.status}`);

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`❌ ElevenLabs API error: ${response.status} - ${errorText}`);
        
        let userMessage = 'Error al obtener credenciales de ElevenLabs';
        if (response.status === 401 || response.status === 403) {
          userMessage = 'API Key de ElevenLabs inválida o sin permisos';
        } else if (response.status === 404) {
          userMessage = 'Agent ID no encontrado en ElevenLabs. Verifica que el ID sea correcto.';
        } else if (response.status === 429) {
          userMessage = 'Límite de solicitudes excedido en ElevenLabs';
        }
        
        throw new Error(userMessage);
      }

      const data = await response.json();
      console.log('✅ Got credentials from ElevenLabs');
      console.log(`🔗 ${connectionType === 'webrtc' ? 'Token' : 'Signed URL'} will be used for connection`);
      
      // Return format with both token and signedUrl for compatibility
      const credential = data[responseKey];
      return new Response(JSON.stringify({ 
        // For WebRTC
        conversationToken: connectionType === 'webrtc' ? credential : undefined,
        token: connectionType === 'webrtc' ? credential : undefined,
        // For WebSocket
        signedUrl: connectionType === 'websocket' ? credential : undefined,
        url: connectionType === 'websocket' ? credential : undefined,
        // Common fields
        connectionType,
        expiresIn: 300, // 5 minutes
        provider: 'elevenlabs',
        voiceId: voiceId,
        agentId: agent,
        scenario: {
          name: scenario?.name,
          personality: scenario?.client_personality?.type,
          category: scenario?.category
        }
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // If no agentId provided, return error with instructions
    console.log('⚠️ No Agent ID provided - cannot proceed without it');
    console.log('❌ Returning error: Agent ID required');
    return new Response(JSON.stringify({ 
      error: 'ElevenLabs requires an Agent ID. Please configure an agent in ElevenLabs dashboard first.',
      details: 'Go to elevenlabs.io/app/conversational-ai to create an agent, then provide its ID.',
      fallback: 'openai',
      scenarioInfo: {
        name: scenario?.name,
        personality: scenario?.client_personality?.type
      }
    }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('❌ Fatal error in elevenlabs-get-signed-url:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('📋 Error details:', errorMessage);
    
    return new Response(JSON.stringify({ 
      error: errorMessage,
      fallback: 'openai',
      timestamp: new Date().toISOString()
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
