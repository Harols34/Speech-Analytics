import { supabase } from '@/integrations/supabase/client';

/**
 * Audio recorder for capturing microphone input and sending to WebRTC
 */
export class AudioRecorder {
  private stream: MediaStream | null = null;
  private audioContext: AudioContext | null = null;
  private processor: ScriptProcessorNode | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];

  constructor(private onAudioData: (audioData: Float32Array) => void) {}

  async start() {
    try {
      // Get available audio input devices first
      const devices = await navigator.mediaDevices.enumerateDevices();
      const audioInputs = devices.filter(device => device.kind === 'audioinput');
      
      console.log('🎤 Dispositivos de audio disponibles:', audioInputs.length);

      // Request microphone with MAXIMUM noise cancellation
      const constraints: MediaStreamConstraints = {
        audio: {
          deviceId: audioInputs.length > 0 ? { ideal: audioInputs[0].deviceId } : undefined,
          sampleRate: { ideal: 24000 },
          channelCount: { ideal: 1 },
          echoCancellation: { ideal: true },
          noiseSuppression: { ideal: true },
          autoGainControl: { ideal: true }
        }
      };

      this.stream = await navigator.mediaDevices.getUserMedia(constraints);
      
      // Verificar configuración del micrófono
      const audioTracks = this.stream.getAudioTracks();
      if (audioTracks.length > 0) {
        const track = audioTracks[0];
        const settings = track.getSettings();
        
        console.log('🎤 Micrófono activo:', {
          echoCancellation: settings.echoCancellation,
          noiseSuppression: settings.noiseSuppression,
          autoGainControl: settings.autoGainControl,
          sampleRate: settings.sampleRate
        });
        
        track.enabled = true;
      }
      
      // Iniciar grabación de la sesión completa
      this.mediaRecorder = new MediaRecorder(this.stream, { 
        mimeType: 'audio/webm;codecs=opus' 
      });
      
      this.audioChunks = [];
      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.audioChunks.push(event.data);
        }
      };
      this.mediaRecorder.start(1000); // Capturar cada segundo
      console.log('🎙️ WebRTC: Grabación de sesión iniciada');
      
      this.audioContext = new AudioContext({
        sampleRate: 24000,
      });
      
      this.source = this.audioContext.createMediaStreamSource(this.stream);
      this.processor = this.audioContext.createScriptProcessor(4096, 1, 1);
      
      this.processor.onaudioprocess = (e) => {
        const inputData = e.inputBuffer.getChannelData(0);
        this.onAudioData(new Float32Array(inputData));
      };
      
      this.source.connect(this.processor);
      this.processor.connect(this.audioContext.destination);
      
      console.log('🎤 Audio recorder started');
    } catch (error) {
      console.error('Error accessing microphone:', error);
      throw error;
    }
  }

  mute() {
    if (this.stream) {
      this.stream.getAudioTracks().forEach(track => {
        track.enabled = false;
      });
      console.log('🔇 *** MICRÓFONO SILENCIADO *** (IA está hablando - NO capturar su voz)');
    }
  }

  unmute() {
    if (this.stream) {
      this.stream.getAudioTracks().forEach(track => {
        track.enabled = true;
      });
      console.log('🔊 *** MICRÓFONO ACTIVADO *** (IA terminó - AHORA puedes hablar)');
    }
  }

  async stopAndGetRecording(): Promise<Blob | null> {
    return new Promise((resolve) => {
      if (!this.mediaRecorder || this.mediaRecorder.state === 'inactive') {
        resolve(null);
        return;
      }

      this.mediaRecorder.onstop = () => {
        const audioBlob = new Blob(this.audioChunks, { type: 'audio/webm' });
        console.log('🎙️ WebRTC: Grabación detenida, tamaño:', audioBlob.size);
        resolve(audioBlob);
      };

      this.mediaRecorder.stop();
    });
  }

  stop() {
    if (this.source) {
      this.source.disconnect();
      this.source = null;
    }
    if (this.processor) {
      this.processor.disconnect();
      this.processor = null;
    }
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      this.mediaRecorder.stop();
      this.mediaRecorder = null;
    }
    console.log('🎤 Audio recorder stopped');
  }
}

/**
 * WebRTC-based realtime chat using OpenAI's Realtime API
 */
export class RealtimeChat {
  private pc: RTCPeerConnection | null = null;
  private dc: RTCDataChannel | null = null;
  private audioEl: HTMLAudioElement;
  private recorder: AudioRecorder | null = null;
  private isAISpeaking: boolean = false;
  private sessionInstructions: string = '';
  private voiceToUse: string = 'alloy';

  constructor(
    private onMessage: (message: any) => void,
    private onError: (error: Error) => void,
    private onAISpeakingChange?: (speaking: boolean) => void
  ) {
    this.audioEl = document.createElement("audio");
    this.audioEl.autoplay = true;
  }

  /**
   * Initialize the WebRTC connection
   */
  async init(scenario: any, voice: string = 'alloy') {
    try {
      console.log('🔌 Initializing WebRTC connection with scenario:', scenario.name);
      console.log('🎯 Voice selected:', voice);

      // Store voice for later configuration
      this.voiceToUse = voice;

      // Get ephemeral token from our Supabase Edge Function
      const { data, error } = await supabase.functions.invoke('get-openai-realtime-token', {
        body: { scenario, voice }
      });

      if (error) {
        console.error('❌ Error getting token:', error);
        throw error;
      }

      if (!data?.client_secret?.value) {
        throw new Error("Failed to get ephemeral token");
      }

      const EPHEMERAL_KEY = data.client_secret.value;
      
      // Store the instructions from the session data
      if (data.instructions) {
        this.sessionInstructions = data.instructions;
        console.log('✅ Session instructions stored:', this.sessionInstructions.substring(0, 100) + '...');
      }
      
      console.log('✅ Ephemeral token obtained');
      console.log('📋 Session configuration received from token');

      // Create peer connection
      this.pc = new RTCPeerConnection();

      // Set up remote audio (AI responses)
      this.pc.ontrack = e => {
        console.log('🔊 Audio track received from AI');
        this.audioEl.srcObject = e.streams[0];
        // CRITICAL: Ensure AI audio doesn't loop back to microphone
        this.audioEl.volume = 1.0;
        this.audioEl.muted = false;
        console.log('🔊 AI audio will play through speakers (not looped to mic)');
      };

      // Set up audio recorder with muting capability
      this.recorder = new AudioRecorder((audioData) => {
        // No necesitamos enviar chunks manualmente, WebRTC maneja esto
      });
      await this.recorder.start();
      console.log('🎤 Audio recorder started with recording capability');

      // Add local audio track from recorder's stream
      if (this.recorder && (this.recorder as any).stream) {
        const stream = (this.recorder as any).stream as MediaStream;
        const audioTrack = stream.getTracks()[0];
        this.pc.addTrack(audioTrack);
        console.log('🎤 Local audio track added to WebRTC');
        console.log('🎤 Audio track settings:', audioTrack.getSettings());
        console.log('🎤 Audio track enabled:', audioTrack.enabled);
        console.log('🎤 Audio track ready state:', audioTrack.readyState);
      }

      // Set up data channel for events
      this.dc = this.pc.createDataChannel("oai-events");
      
      this.dc.addEventListener("open", () => {
        console.log('📡 Data channel opened');
      });
      
      this.dc.addEventListener("message", (e) => {
        try {
          const event = JSON.parse(e.data);
          
          // Log important events with more detail
          if (event.type === 'session.created') {
            console.log("📩 Session created event:", {
              type: event.type,
              session_id: event.session?.id,
              model: event.session?.model,
              voice: event.session?.voice,
              has_instructions: !!event.session?.instructions,
              instructions_preview: event.session?.instructions?.substring(0, 100)
            });
          } else if (event.type === 'session.updated') {
            console.log("📩 ✅ Session updated successfully!", {
              type: event.type,
              session_id: event.session?.id,
              voice: event.session?.voice,
              has_instructions: !!event.session?.instructions,
              instructions_preview: event.session?.instructions?.substring(0, 100),
              modalities: event.session?.modalities,
              transcription_enabled: !!event.session?.input_audio_transcription
            });
          } else if (event.type === 'conversation.item.input_audio_transcription.completed') {
            console.log("📩 User transcription completed:", event.transcript?.substring(0, 100));
          } else if (event.type === 'response.audio_transcript.delta' || event.type === 'response.audio_transcript.done') {
            console.log("📩 AI transcript:", event.type, event.transcript?.substring(0, 100));
          } else if (event.type === 'error') {
            console.error("📩 ❌ Error event:", event.error);
          } else {
            console.log("📩 Received event:", event.type);
          }
          
          // Manejar muteo automático basado en eventos de la IA
          if (event.type === 'response.created') {
            // La IA va a empezar a hablar - mutear AHORA (antes del audio)
            if (!this.isAISpeaking) {
              this.isAISpeaking = true;
              this.recorder?.mute();
              this.onAISpeakingChange?.(true);
              console.log('🔇 ========== MICRÓFONO SILENCIADO ========== (IA va a hablar)');
            }
          } else if (event.type === 'response.audio.delta' || event.type === 'response.audio_transcript.delta') {
            // La IA está hablando - asegurar que está muteado
            if (!this.isAISpeaking) {
              this.isAISpeaking = true;
              this.recorder?.mute();
              this.onAISpeakingChange?.(true);
              console.log('🔇 Mic muted - AI speaking (safety check)');
            }
          } else if (event.type === 'response.audio.done') {
            // El stream de audio terminó - desmutear después de un delay
            if (this.isAISpeaking) {
              setTimeout(() => {
                this.isAISpeaking = false;
                this.recorder?.unmute();
                this.onAISpeakingChange?.(false);
                console.log('🔊 ========== MICRÓFONO ACTIVADO ========== (IA terminó - tu turno)');
              }, 500);
            }
          } else if (event.type === 'response.done') {
            // Respaldo: asegurar unmute
            if (this.isAISpeaking) {
              setTimeout(() => {
                this.isAISpeaking = false;
                this.recorder?.unmute();
                this.onAISpeakingChange?.(false);
                console.log('🔊 ========== MICRÓFONO ACTIVADO (fallback) ========== (tu turno)');
              }, 700);
            }
          } else if (event.type === 'input_audio_buffer.speech_started') {
            console.log('🎤 ✅ ========== USUARIO EMPEZÓ A HABLAR ==========');
            console.log('🎤 Verificar: ¿El micrófono está ACTIVO? (debe estar unmuted)');
          } else if (event.type === 'input_audio_buffer.speech_stopped') {
            console.log('🎤 ⏸️ ========== USUARIO DEJÓ DE HABLAR ==========');
            console.log('📝 Procesando transcripción del audio del usuario...');
          } else if (event.type === 'input_audio_buffer.committed') {
            console.log('📤 ========== AUDIO DEL USUARIO ENVIADO A WHISPER ==========');
          } else if (event.type === 'conversation.item.created' && event.item?.role === 'user') {
            console.log('💬 ✅ ========== MENSAJE DEL USUARIO CREADO ==========');
            if (event.item?.content) {
              console.log('📝 Contenido:', event.item.content);
            }
          } else if (event.type === 'response.created') {
            console.log('🤖 ========== IA PREPARANDO RESPUESTA ==========');
          }
          
          this.onMessage(event);
        } catch (err) {
          console.error('❌ Error parsing event:', err, 'Raw data:', e.data);
        }
      });

      this.dc.addEventListener("error", (e) => {
        console.error('❌ Data channel error:', e);
        this.onError(new Error('Data channel error'));
      });

      // Create and set local description
      const offer = await this.pc.createOffer();
      await this.pc.setLocalDescription(offer);
      console.log('📤 Local description set');

      // Connect to OpenAI's Realtime API
      const baseUrl = "https://api.openai.com/v1/realtime";
      const model = "gpt-4o-realtime-preview-2024-12-17";
      
      const sdpResponse = await fetch(`${baseUrl}?model=${model}`, {
        method: "POST",
        body: offer.sdp,
        headers: {
          Authorization: `Bearer ${EPHEMERAL_KEY}`,
          "Content-Type": "application/sdp"
        },
      });

      if (!sdpResponse.ok) {
        const errorText = await sdpResponse.text();
        console.error('❌ SDP exchange failed:', errorText);
        throw new Error(`SDP exchange failed: ${errorText}`);
      }

      const answer = {
        type: "answer" as RTCSdpType,
        sdp: await sdpResponse.text(),
      };
      
      await this.pc.setRemoteDescription(answer);
      console.log('✅ WebRTC connection established');

      // Connection state monitoring
      this.pc.onconnectionstatechange = () => {
        console.log('🔗 Connection state:', this.pc?.connectionState);
        if (this.pc?.connectionState === 'failed' || this.pc?.connectionState === 'disconnected') {
          this.onError(new Error('Connection lost'));
        }
      };

      // Wait for data channel to be ready before sending session configuration
      if (this.dc?.readyState === 'open') {
        this.configureSession();
      } else {
        // Wait for the data channel to open
        const waitForChannel = new Promise<void>((resolve) => {
          const checkChannel = () => {
            if (this.dc?.readyState === 'open') {
              console.log('📡 Data channel ready, configuring session...');
              this.configureSession();
              resolve();
            } else {
              setTimeout(checkChannel, 100);
            }
          };
          checkChannel();
        });
        
        // Set a timeout to avoid infinite waiting
        await Promise.race([
          waitForChannel,
          new Promise((_, reject) => setTimeout(() => reject(new Error('Data channel timeout')), 5000))
        ]);
      }

    } catch (error) {
      console.error("❌ Error initializing WebRTC chat:", error);
      this.onError(error instanceof Error ? error : new Error('Unknown error'));
      throw error;
    }
  }

  /**
   * Configure the session with proper audio transcription settings and instructions
   */
  private configureSession() {
    if (!this.dc || this.dc.readyState !== 'open') {
      console.warn('⚠️ Cannot configure session - data channel not ready');
      return;
    }

    try {
      // Build complete session configuration
      const sessionConfig: any = {
        type: 'session.update',
        session: {
          modalities: ['text', 'audio'],
          voice: this.voiceToUse,
          input_audio_transcription: {
            model: 'whisper-1'
          },
          turn_detection: {
            type: 'server_vad',
            threshold: 0.5,
            prefix_padding_ms: 300,
            silence_duration_ms: 800
          },
          temperature: 0.9,
          max_response_output_tokens: "inf"
        }
      };

      // CRITICAL: Include system instructions if available
      if (this.sessionInstructions) {
        sessionConfig.session.instructions = this.sessionInstructions;
        console.log('📝 Including system instructions in session update');
        console.log('📋 Instructions preview:', this.sessionInstructions.substring(0, 150) + '...');
      } else {
        console.warn('⚠️ No system instructions available - AI may not behave correctly');
      }

      this.dc.send(JSON.stringify(sessionConfig));
      console.log('✅ Session configuration sent - transcription and instructions enabled');
      console.log('🎯 Voice:', this.voiceToUse);
      console.log('🌡️ Temperature:', 0.8);
    } catch (err) {
      console.error('❌ Error configuring session:', err);
    }
  }

  /**
   * Request AI to speak first (initial greeting based on scenario)
   */
  requestAIFirstMessage() {
    if (!this.dc || this.dc.readyState !== 'open') {
      console.warn('⚠️ Data channel not ready for first message request');
      return;
    }

    console.log('🎤 Requesting AI to initiate conversation...');
    console.log('📝 AI should speak in Spanish as a Colombian client based on scenario');
    
    // Simply request a response from the AI based on the system instructions
    // The AI will generate the first message according to the scenario personality
    this.dc.send(JSON.stringify({ type: 'response.create' }));
    console.log('✅ Response request sent to AI');
  }

  /**
   * Send a text message (optional, can also just use voice)
   */
  async sendMessage(text: string) {
    if (!this.dc || this.dc.readyState !== 'open') {
      throw new Error('Data channel not ready');
    }

    const event = {
      type: 'conversation.item.create',
      item: {
        type: 'message',
        role: 'user',
        content: [
          {
            type: 'input_text',
            text
          }
        ]
      }
    };

    this.dc.send(JSON.stringify(event));
    this.dc.send(JSON.stringify({ type: 'response.create' }));
    console.log('📤 Text message sent:', text);
  }

  /**
   * Get connection state
   */
  getConnectionState(): RTCPeerConnectionState | null {
    return this.pc?.connectionState || null;
  }

  /**
   * Check if data channel is ready
   */
  isReady(): boolean {
    return this.dc?.readyState === 'open';
  }

  /**
   * Get recording blob
   */
  async getRecording(): Promise<Blob | null> {
    if (this.recorder) {
      return await this.recorder.stopAndGetRecording();
    }
    return null;
  }

  /**
   * Manually control mic mute (UI enforcement)
   */
  setMicMuted(muted: boolean) {
    if (muted) {
      this.recorder?.mute();
    } else {
      this.recorder?.unmute();
    }
    this.isAISpeaking = muted;
    this.onAISpeakingChange?.(muted);
    console.log(muted ? '🔇 Mic muted by UI' : '🔊 Mic unmuted by UI');
  }

  /**
   * Disconnect and cleanup
   */
  disconnect() {
    console.log('🔌 Disconnecting WebRTC...');
    
    if (this.recorder) {
      this.recorder.stop();
      this.recorder = null;
    }
    
    if (this.dc) {
      this.dc.close();
      this.dc = null;
    }
    
    if (this.pc) {
      this.pc.close();
      this.pc = null;
    }
    
    if (this.audioEl.srcObject) {
      const tracks = (this.audioEl.srcObject as MediaStream).getTracks();
      tracks.forEach(track => track.stop());
      this.audioEl.srcObject = null;
    }
    
    console.log('✅ WebRTC disconnected');
  }
}