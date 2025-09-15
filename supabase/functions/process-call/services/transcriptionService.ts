
import OpenAI from "https://esm.sh/openai@4.28.0";

export async function transcribeAudio(audioUrl: string): Promise<string> {
  const apiKey = Deno.env.get('API_DE_OPENAI');
  
  if (!apiKey) {
    throw new Error('OpenAI API key not configured');
  }

  const openai = new OpenAI({
    apiKey: apiKey,
  });

  try {
    console.log('Downloading audio from URL:', audioUrl);
    
    // Download audio file with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 120000); // 2 minutes timeout
    
    const response = await fetch(audioUrl, {
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      throw new Error(`Failed to download audio: ${response.status} ${response.statusText}`);
    }
    
    const audioBuffer = await response.arrayBuffer();
    console.log(`Audio downloaded successfully, size: ${audioBuffer.byteLength} bytes`);
    
    // Check file size
    if (audioBuffer.byteLength > 25 * 1024 * 1024) {
      console.warn('Audio file is large, this may take longer to process');
    }
    
    if (audioBuffer.byteLength < 1000) {
      console.warn('Audio file is very small, may not contain meaningful content');
      return 'No hay transcripción disponible - archivo de audio muy pequeño o vacío';
    }
    
    const audioBlob = new Blob([audioBuffer]);
    const file = new File([audioBlob], 'audio.mp3', { type: 'audio/mpeg' });
    
    console.log('Starting transcription with Whisper...');
    
    // Get transcription from Whisper with detailed timestamps
    const transcription = await openai.audio.transcriptions.create({
      file: file,
      model: 'whisper-1',
      response_format: 'verbose_json',
      timestamp_granularities: ['segment'],
      language: 'es'
    });

    // Process segments to create clean transcription
    let formattedTranscription = '';
    
    if (transcription.segments && transcription.segments.length > 0) {
      console.log(`Processing ${transcription.segments.length} segments from Whisper`);
      
      // Sort segments by start time to ensure chronological order
      const sortedSegments = transcription.segments.sort((a: any, b: any) => a.start - b.start);
      
      // Initialize speaker tracking
      let currentSpeaker = 'Asesor'; // Start assuming first speaker is advisor
      let speakerSwitchThreshold = 1.5; // Seconds of silence to trigger speaker switch
      let lastEndTime = 0;
      
      sortedSegments.forEach((segment: any, index: number) => {
        const text = segment.text ? segment.text.trim() : '';
        if (!text || text.length < 2) return; // Skip very short or empty segments
        
        const startTime = segment.start || 0;
        const endTime = segment.end || 0;
        
        // Check for speaker change based on silence gaps and content analysis
        const silenceGap = startTime - lastEndTime;
        
        if (index > 0 && silenceGap > speakerSwitchThreshold) {
          // Switch speaker after significant silence
          currentSpeaker = currentSpeaker === 'Asesor' ? 'Cliente' : 'Asesor';
        }
        
        // Content-based speaker detection for better accuracy
        const textLower = text.toLowerCase();
        
        // Strong advisor indicators
        const strongAdvisorKeywords = [
          'buenos días', 'buenas tardes', 'me comunico', 'empresa', 'compañía',
          'ofrecemos', 'tenemos disponible', 'nuestro servicio', 'le explico',
          'permíteme', 'representante', 'asesor', 'ejecutivo'
        ];
        
        // Strong client indicators  
        const strongClientKeywords = [
          'aló', 'hola', 'sí', 'no', 'bueno', 'quiero', 'necesito', 'me interesa',
          'cuánto cuesta', 'no me interesa', 'gracias', 'está bien'
        ];
        
        const hasStrongAdvisor = strongAdvisorKeywords.some(keyword => textLower.includes(keyword));
        const hasStrongClient = strongClientKeywords.some(keyword => textLower.includes(keyword));
        
        // Override speaker based on strong content indicators
        if (hasStrongAdvisor && !hasStrongClient && text.length > 10) {
          currentSpeaker = 'Asesor';
        } else if (hasStrongClient && !hasStrongAdvisor) {
          currentSpeaker = 'Cliente';
        }
        
        // Format timestamp - ensure we start from 0:00
        const minutes = Math.floor(startTime / 60);
        const seconds = Math.floor(startTime % 60);
        const timestamp = `${minutes}:${seconds.toString().padStart(2, '0')}`;
        
        // Add the segment to transcription
        formattedTranscription += `[${timestamp}] ${currentSpeaker}: ${text}\n`;
        
        lastEndTime = endTime;
        
        // Add silence notation for significant gaps
        const nextSegment = sortedSegments[index + 1];
        if (nextSegment) {
          const nextStart = nextSegment.start || 0;
          const silenceDuration = nextStart - endTime;
          
          if (silenceDuration > 3) { // Only mark silences longer than 3 seconds
            const silenceStartTime = Math.floor(endTime);
            const silenceMinutes = Math.floor(silenceStartTime / 60);
            const silenceSeconds = silenceStartTime % 60;
            const silenceTimestamp = `${silenceMinutes}:${silenceSeconds.toString().padStart(2, '0')}`;
            formattedTranscription += `[${silenceTimestamp}] Silencio: ${Math.round(silenceDuration)} segundos de pausa\n`;
          }
        }
      });
    } else {
      // Fallback: use the raw text if no segments available
      console.log('No segments available, using raw text');
      const rawText = transcription.text || '';
      
      if (!rawText || rawText.trim().length < 10) {
        return 'No hay transcripción disponible - no se detectó contenido de audio';
      }
      
      // Create basic structure from raw text
      const sentences = rawText.split(/[.!?]+/).filter(s => s.trim().length > 5);
      let currentSpeaker = 'Asesor';
      
      sentences.forEach((sentence, index) => {
        const cleanSentence = sentence.trim();
        if (cleanSentence) {
          const timestamp = `0:${(index * 5).toString().padStart(2, '0')}`;
          formattedTranscription += `[${timestamp}] ${currentSpeaker}: ${cleanSentence}.\n`;
          
          // Alternate speaker every 1-2 sentences
          if (index > 0 && index % 2 === 0) {
            currentSpeaker = currentSpeaker === 'Asesor' ? 'Cliente' : 'Asesor';
          }
        }
      });
    }

    // Validate the transcription quality
    if (!formattedTranscription || formattedTranscription.trim() === '') {
      return 'No hay transcripción disponible - error en el procesamiento del audio';
    }

    // Ensure we have actual conversation content
    const lines = formattedTranscription.split('\n').filter(line => line.trim());
    const conversationLines = lines.filter(line => 
      line.includes('Asesor:') || line.includes('Cliente:')
    );
    
    if (conversationLines.length < 2) {
      console.log('Insufficient conversation detected, lines:', conversationLines.length);
      return 'No hay transcripción disponible - no se detectó conversación suficiente';
    }

    // Ensure we have both speakers
    const hasAdvisor = conversationLines.some(line => line.includes('Asesor:'));
    const hasClient = conversationLines.some(line => line.includes('Cliente:'));
    
    if (!hasAdvisor || !hasClient) {
      console.log('Missing speaker types in conversation');
      return 'No hay transcripción disponible - no se detectó conversación completa entre asesor y cliente';
    }

    console.log(`Transcription completed successfully:`);
    console.log(`- Total lines: ${lines.length}`);
    console.log(`- Conversation lines: ${conversationLines.length}`);
    console.log(`- Has advisor: ${hasAdvisor}`);
    console.log(`- Has client: ${hasClient}`);
    console.log(`- Final length: ${formattedTranscription.length} characters`);
    console.log(`- Starts from: ${formattedTranscription.substring(0, 20)}`);
    
    return formattedTranscription;
    
  } catch (error) {
    console.error('Error in transcription service:', error);
    
    // Enhanced error handling
    if (error.name === 'AbortError') {
      return 'No hay transcripción disponible - tiempo de descarga agotado';
    }
    
    if (error.message.includes('Invalid file format')) {
      return 'No hay transcripción disponible - formato de archivo no compatible';
    }
    
    if (error.message.includes('File too large')) {
      return 'No hay transcripción disponible - archivo de audio demasiado grande';
    }
    
    if (error.message.includes('No speech found')) {
      return 'No hay transcripción disponible - no se detectó habla en el audio';
    }
    
    throw new Error(`Transcription failed: ${error.message}`);
  }
}
