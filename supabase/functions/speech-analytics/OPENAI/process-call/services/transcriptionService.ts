// Provide minimal Deno typing for TS linting in non-Deno editors
// eslint-disable-next-line @typescript-eslint/no-explicit-any
// @ts-ignore: Deno runtime import
import OpenAI from "https://esm.sh/openai@latest?target=deno";
// @ts-ignore: Deno runtime import
import { toFile } from "https://esm.sh/openai@latest/uploads?target=deno";
export async function transcribeAudio(audioUrl) {
  const apiKey = Deno.env.get("OPENAI_API_KEY_SPEECH");
  if (!apiKey) {
    throw new Error("OpenAI API key not configured");
  }
  const openai = new OpenAI({
    apiKey,
  });
  try {
    console.log("🔍 Downloading and validating audio from URL (streaming):", audioUrl);
    // --- HEAD para tamaño y MIME sin descargar el archivo completo ---
    const headCtrl = new AbortController();
    const headTO = setTimeout(() => headCtrl.abort(), 15000);
    let contentLengthHeader = null;
    let contentTypeHeader = null;
    try {
      const head = await fetch(audioUrl, {
        method: "HEAD",
        signal: headCtrl.signal,
      });
      if (head.ok) {
        contentLengthHeader = head.headers.get("content-length");
        contentTypeHeader = head.headers.get("content-type");
      }
    } catch (_) {}
    clearTimeout(headTO);
    const sizeMBHeader = contentLengthHeader
      ? Math.round((Number(contentLengthHeader) / 1024 / 1024) * 100) / 100
      : null;
    if (sizeMBHeader && sizeMBHeader > 25) {
      return `No hay transcripción disponible - archivo demasiado grande (${sizeMBHeader}MB). Máximo permitido: 25MB`;
    }
    // --- Abrimos stream (NO arrayBuffer) y lo convertimos a UploadFile ---
    const res = await fetch(audioUrl);
    if (!res.ok || !res.body) {
      throw new Error(`No se pudo abrir el stream del audio (${res.status})`);
    }
    const contentType = contentTypeHeader || res.headers.get("content-type") || "audio/mpeg";
    const fileName = decodeURIComponent(new URL(audioUrl).pathname.split("/").pop() || "audio.mp3");
    // Convierte ReadableStream → UploadFile (sin cargar en memoria)
    const uploadFile = await toFile(res.body, fileName, {
      type: contentType,
    });
    // Solo para logs (ya no usamos firmas binarias):
    const detectedFormat = contentType.includes("webm")
      ? "WEBM"
      : contentType.includes("mpeg") || contentType.includes("mp3")
        ? "MP3"
        : contentType.includes("wav")
          ? "WAV"
          : contentType.includes("mp4") || contentType.includes("m4a")
            ? "MP4/M4A"
            : contentType.includes("flac")
              ? "FLAC"
              : contentType.includes("ogg")
                ? "OGG"
                : "Unknown";
    console.log(
      "🎵 Stream ready →",
      `name=${fileName} type=${contentType} size=${sizeMBHeader ?? "?"}MB format=${detectedFormat}`,
    );
    // --- Transcripción con reintentos y orden de modelos ---
    let transcription;
    let attempts = 0;
    const maxAttempts = 3;
    while (attempts < maxAttempts) {
      try {
        attempts++;
        console.log(`🔄 Transcription attempt ${attempts}/${maxAttempts}`);
        // ---- 1) GPT-4o-mini-transcribe (simple text, no verbose) ----
        try {
          console.log("🎤 Trying gpt-4o-mini-transcribe...");
          transcription = await openai.audio.transcriptions.create({
            file: uploadFile,
            model: "gpt-4o-mini-transcribe",
            language: "es",
          });
          console.log("✅ Success with gpt-4o-mini-transcribe");
          break;
        } catch (errMini) {
          console.warn("⚠️ gpt-4o-mini-transcribe failed:", errMini?.message || errMini);
        }
        // ---- 3) GPT-4o-transcribe (simple text, no verbose) ----
        try {
          console.log("🎤 Trying gpt-4o-transcribe...");
          transcription = await openai.audio.transcriptions.create({
            file: uploadFile,
            model: "gpt-4o-transcribe",
            language: "es",
          });
          console.log("✅ Success with gpt-4o-transcribe");
          break;
        } catch (err4o) {
          console.warn("⚠️ gpt-4o-transcribe failed:", err4o?.message || err4o);
        }
        // ---- 4) Whisper-1 (verbose_json, granularidad por segmento y palabra) ----
        try {
          console.log("🎤 Trying whisper-1...");
          transcription = await openai.audio.transcriptions.create({
            file: uploadFile,
            model: "whisper-1",
            language: "es",
            response_format: "verbose_json",
            // Palabra a palabra cuando esté disponible
            // @ts-ignore: field provided by OpenAI in verbose_json
            timestamp_granularities: ["segment", "word"],
            temperature: 0.0,
            // Indica que no agregue etiquetas de ruido u onomatopeyas artificiales
            prompt:
              "Transcribe en español de forma literal (verbatim), sin normalizar números ni nombres. No incluyas etiquetas como [ruido], [música], [risas] ni [inaudible]; si una parte no se entiende, deja un espacio o continuidad natural sin insertar marcas.",
          });
          console.log("✅ Success with whisper-1");
          break;
        } catch (errWhisper) {
          console.error("❌ whisper-1 failed:", errWhisper?.message || errWhisper);
          throw errWhisper; // si falla whisper ya no hay fallback
        }
      } catch (attemptError) {
        console.error(`❌ Attempt ${attempts} failed:`, attemptError);
        if (attemptError.status === 413 || attemptError.message?.includes("413")) {
          return `No hay transcripción disponible - archivo demasiado grande (${sizeMBHeader ?? "?"}MB). Máximo permitido: 25MB`;
        }
        if (attemptError.status === 429) {
          console.log("Rate limited, waiting longer...");
          await new Promise((resolve) => setTimeout(resolve, Math.min(45000, 10000 * Math.pow(2, attempts))));
        }
        if (attempts === maxAttempts) {
          throw attemptError;
        }
        // Exponential backoff con jitter
        const baseDelay = 3000 * Math.pow(2, attempts - 1);
        const jitter = Math.random() * 2000;
        await new Promise((resolve) => setTimeout(resolve, Math.min(30000, baseDelay + jitter)));
      }
    }
    if (!transcription) {
      throw new Error("All transcription attempts failed");
    }
    // --------------------------
    //  TU PIPELINE “TAL CUAL”
    // --------------------------
    // Enhanced segment processing for high-quality transcription
    let formattedTranscription = "";
    if (transcription.segments && transcription.segments.length > 0) {
      console.log(`📝 Processing ${transcription.segments.length} segments from Whisper`);
      // Filter out invalid segments, ruido y contaminación de prompt
      const noiseTags =
        /(\[(noise|music|música|ruido|laughter|risas|aplausos|background|fondo|inaudible)\])|\((noise|música|ruido|risas|aplausos|inaudible)\)/i;
      const validSegments = transcription.segments.filter((segment) => {
        const text = segment.text ? segment.text.trim() : "";
        // Remove any segment that contains prompt-related text
        const promptContamination = [
          "transcribe fielmente",
          "identifica claramente",
          "separa los turnos",
          "conversación telefónica",
          "asesor comercial",
          "cliente potencial",
          "no inventes contenido",
          "exactamente lo que escuchas",
          "incluye pausas significativas",
          "como silencio",
        ];
        const textLower = text.toLowerCase();
        const hasPromptContamination = promptContamination.some((c) => textLower.includes(c));
        // Si Whisper marcó el segmento con alta probabilidad de no-habla, descartarlo
        const noSpeechProb = typeof segment.no_speech_prob === "number" ? segment.no_speech_prob : 0;
        // Return valid segments only
        return (
          text.length > 2 &&
          !text.match(/^[.,!?;:\s\-_]+$/) &&
          !hasPromptContamination &&
          !noiseTags.test(text) &&
          noSpeechProb < 0.6
        );
      });
      console.log(
        `✅ ${validSegments.length} valid segments after cleaning (removed ${transcription.segments.length - validSegments.length} contaminated/invalid segments)`,
      );
      if (validSegments.length === 0) {
        return "No hay transcripción disponible - no se detectó contenido de conversación válido";
      }
      // Sort segments by start time
      const sortedSegments = validSegments.sort((a, b) => a.start - b.start);
      // Enhanced speaker detection logic (Asesor / Cliente / Tercero)
      let currentSpeaker = "Asesor"; // Start with advisor
      let speakerSwitchThreshold = 1.5; // Base threshold for speaker switch
      let lastEndTime = 0;
      let consecutiveSpeakerCount = 0;
      function computeSpeakerScores(text, index) {
        const lower = text.toLowerCase();
        let advisor = 0;
        let client = 0;
        let third = 0;
        // Pronombres y formas verbales
        if (/\b(nosotros|nuestro|nuestra|nuestros|nuestras)\b/.test(lower)) advisor += 2;
        if (/\b(ofrecemos|podemos|contamos|queremos)\b/.test(lower)) advisor += 2;
        if (
          /\b(verificar|confirmar|validar|registrar|activar|instalación|contrato|plan|servicio|promoción)\b/.test(lower)
        )
          advisor += 3;
        if (/\b(señor|señora|don|doña|permítame|permíteme|por seguridad|con quién tengo el gusto)\b/.test(lower))
          advisor += 2;
        if (/\b(documento|c[eé]dula|n[uú]mero)\b/.test(lower)) advisor += 1;
        if (/\b(yo|mi|mis|me|tengo|quiero|necesito|puedo|estoy)\b/.test(lower)) client += 2;
        if (/\b(no me interesa|ya tengo|muy caro|no quiero)\b/.test(lower)) client += 3;
        if (/[¿?]/.test(text)) client += 1; // preguntas suelen venir del cliente
        if (/\b(cu[aá]nto|precio|vale|cuesta|c[oó]mo|d[óo]nde|por qu[eé]|para qu[eé])\b/.test(lower)) client += 2;
        if (
          /\b(supervisor|gerente|coordinador|transferir|transferencia|soporte|\b[aá]rea t[eé]cnica|backoffice|te paso con|lo comunico|la comunico|otra [aá]rea)\b/.test(
            lower,
          )
        ) {
          third += 3;
        }
        // Posición en la llamada: primeras líneas suelen ser del asesor si contienen intro
        if (index <= 2 && /\b(me comunico|llamo de|mi nombre es|de parte de)\b/.test(lower)) advisor += 3;
        // Longitud del turno
        const wordCount = lower.split(/\s+/).filter(Boolean).length;
        if (wordCount >= 12) advisor += 1; // agentes tienden a hablar más en turnos largos
        if (wordCount <= 4 && /[¿?]/.test(text)) client += 1; // preguntas cortas
        return {
          advisor,
          client,
          third,
        };
      }
      sortedSegments.forEach((segment, index) => {
        const text = segment.text ? segment.text.trim() : "";
        if (!text || text.length < 2) return;
        const startTime = segment.start || 0;
        const endTime = segment.end || 0;
        const silenceGap = startTime - lastEndTime;
        // Advanced semantic analysis for speaker identification
        const textLower = text.toLowerCase();
        const { advisor: advisorScore, client: clientScore, third: thirdScore } = computeSpeakerScores(text, index);
        // Question-based bias towards client turns
        const hasQuestion = /[¿?]/.test(text);
        const questionClientCues = [
          "cómo",
          "cuánto",
          "dónde",
          "por qué",
          "para qué",
          "tiene",
          "hay",
          "puedo",
          "quiero",
          "necesito",
        ];
        const questionBiasToClient = hasQuestion && questionClientCues.some((c) => textLower.includes(c));
        // Dynamic threshold based on previous segment length
        const previousDuration = Math.max(0, lastEndTime - (sortedSegments[index - 1]?.start || 0));
        const dynamicThreshold = Math.min(Math.max(previousDuration * 0.8, 1.0), 3.0);
        // Determine speaker switch and target
        let shouldSwitchSpeaker = false;
        let targetSpeaker = null;
        if (thirdScore > Math.max(advisorScore, clientScore) && thirdScore > 0 && currentSpeaker !== "Tercero") {
          shouldSwitchSpeaker = true;
          targetSpeaker = "Tercero";
          console.log(`🔄 Switching to Tercero based on content: "${text.substring(0, 30)}..."`);
        } else if (advisorScore > clientScore && advisorScore > 0 && currentSpeaker !== "Asesor") {
          shouldSwitchSpeaker = true;
          targetSpeaker = "Asesor";
          console.log(`🔄 Switching to Asesor based on content: "${text.substring(0, 30)}..."`);
        } else if (clientScore > advisorScore && clientScore > 0 && currentSpeaker !== "Cliente") {
          shouldSwitchSpeaker = true;
          targetSpeaker = "Cliente";
          console.log(`🔄 Switching to Cliente based on content: "${text.substring(0, 30)}..."`);
        } else if (silenceGap > Math.max(speakerSwitchThreshold, dynamicThreshold) && consecutiveSpeakerCount > 2) {
          shouldSwitchSpeaker = true;
          // alterna en silencio si no hay evidencia fuerte
          targetSpeaker = currentSpeaker === "Asesor" ? "Cliente" : "Asesor";
          console.log(`🔄 Switching speaker due to silence gap: ${silenceGap.toFixed(1)}s`);
        } else if (consecutiveSpeakerCount > 3 && silenceGap > 0.8) {
          shouldSwitchSpeaker = true;
          targetSpeaker = currentSpeaker === "Asesor" ? "Cliente" : "Asesor";
          console.log(`🔄 Switching speaker due to consecutive count: ${consecutiveSpeakerCount}`);
        } else if (questionBiasToClient && currentSpeaker === "Asesor") {
          // Typical Q&A: if there's a question and the current speaker is Asesor, bias next turn to Cliente
          shouldSwitchSpeaker = true;
          targetSpeaker = "Cliente";
          console.log("🔄 Switching to Cliente due to question pattern");
        }
        if (shouldSwitchSpeaker) {
          currentSpeaker = targetSpeaker || (currentSpeaker === "Asesor" ? "Cliente" : "Asesor");
          consecutiveSpeakerCount = 0;
        }
        consecutiveSpeakerCount++;
        // Format timestamp
        const minutes = Math.floor(startTime / 60);
        const seconds = Math.floor(startTime % 60);
        const timestamp = `${minutes}:${seconds.toString().padStart(2, "0")}`;
        // Clean and format text
        const cleanText = text
          .replace(noiseTags, "") // quita etiquetas de ruido
          .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F]/g, "")
          .replace(/\s+/g, " ")
          .trim();
        // Add transcription line
        formattedTranscription += `[${timestamp}] ${currentSpeaker}: ${cleanText}\n`;
        lastEndTime = endTime;
        // Mark significant silences
        const nextSegment = sortedSegments[index + 1];
        if (nextSegment) {
          const nextStart = nextSegment.start || 0;
          const silenceDuration = nextStart - endTime;
          if (silenceDuration >= 2) {
            const silenceStartTime = Math.floor(endTime);
            const silenceMinutes = Math.floor(silenceStartTime / 60);
            const silenceSeconds = silenceStartTime % 60;
            const silenceTimestamp = `${silenceMinutes}:${silenceSeconds.toString().padStart(2, "0")}`;
            formattedTranscription += `[${silenceTimestamp}] Silencio: ${Math.round(silenceDuration)} segundos de pausa\n`;
          }
        }
      });
    } else {
      // Fallback for text without segments (típico de 4o/4o-mini)
      console.log("⚠️ No segments available, using raw text");
      const rawText = transcription.text || "";
      if (!rawText || rawText.trim().length < 10) {
        return "No hay transcripción disponible - no se detectó contenido de audio válido";
      }
      // Clean any prompt contamination from raw text
      const cleanedText = rawText
        .replace(/transcribe fielmente.*?escuchas\./gi, "")
        .replace(/identifica claramente.*?cliente\./gi, "")
        .replace(/separa los turnos.*?correctamente\./gi, "")
        .replace(/esta es una conversación.*?potencial\./gi, "")
        .trim();
      if (cleanedText.length < 10) {
        return "No hay transcripción disponible - texto insuficiente después de limpieza";
      }
      // Create basic structure with intelligent speaker alternation
      const sentences = cleanedText.split(/[.!?]+/).filter((s) => s.trim().length > 5);
      let currentSpeaker = "Asesor";
      sentences.forEach((sentence, index) => {
        const cleanSentence = sentence.trim();
        if (cleanSentence) {
          const timestamp = `${Math.floor((index * 8) / 60)}:${((index * 8) % 60).toString().padStart(2, "0")}`;
          formattedTranscription += `[${timestamp}] ${currentSpeaker}: ${cleanSentence}.\n`;
          // Alternate speakers intelligently
          if (index > 0 && ((index + 1) % 2 === 0 || (index + 1) % 3 === 0)) {
            currentSpeaker = currentSpeaker === "Asesor" ? "Cliente" : "Asesor";
          }
        }
      });
    }
    // Final validation
    if (!formattedTranscription || formattedTranscription.trim() === "") {
      return "No hay transcripción disponible - error en el procesamiento del audio";
    }
    const lines = formattedTranscription.split("\n").filter((line) => line.trim());
    const conversationLines = lines.filter((line) => line.includes("Asesor:") || line.includes("Cliente:"));
    if (conversationLines.length < 2) {
      console.log("⚠️ Insufficient conversation detected, lines:", conversationLines.length);
      return "No hay transcripción disponible - no se detectó conversación suficiente en el audio";
    }
    // Verify both speakers are present
    const hasAdvisor = conversationLines.some((line) => line.includes("Asesor:"));
    const hasClient = conversationLines.some((line) => line.includes("Cliente:"));
    if (!hasAdvisor || !hasClient) {
      console.log("⚠️ Missing speaker types detected, attempting to balance...");
      // Create balanced conversation if one speaker is missing
      if (!hasClient && hasAdvisor) {
        formattedTranscription = formattedTranscription.replace(/(\[.*?\] )Asesor: /g, (match, timestamp, offset) => {
          const lineNumber = (formattedTranscription.substring(0, offset).match(/\n/g) || []).length;
          return lineNumber % 3 === 1 ? `${timestamp}Cliente: ` : match;
        });
      } else if (!hasAdvisor && hasClient) {
        formattedTranscription = formattedTranscription.replace(/(\[.*?\] )Cliente: /g, (match, timestamp, offset) => {
          const lineNumber = (formattedTranscription.substring(0, offset).match(/\n/g) || []).length;
          return lineNumber % 3 === 0 ? `${timestamp}Asesor: ` : match;
        });
      }
    }
    // Final quality statistics (tus logs)
    const totalWords = formattedTranscription.split(/\s+/).length;
    const finalLines = formattedTranscription.split("\n").filter((line) => line.trim());
    const finalConversationLines = finalLines.filter((line) => line.includes("Asesor:") || line.includes("Cliente:"));
    const finalAdvisorLines = finalConversationLines.filter((line) => line.includes("Asesor:")).length;
    const finalClientLines = finalConversationLines.filter((line) => line.includes("Cliente:")).length;
    console.log(`✅ Transcription completed successfully:`);
    console.log(`📊 Quality Stats:`);
    console.log(`  - Total lines: ${finalLines.length}`);
    console.log(`  - Conversation lines: ${finalConversationLines.length}`);
    console.log(`  - Asesor lines: ${finalAdvisorLines}`);
    console.log(`  - Cliente lines: ${finalClientLines}`);
    console.log(`  - Total words: ${totalWords}`);
    console.log(`  - Final length: ${formattedTranscription.length} characters`);
    console.log(`  - Audio format: ${detectedFormat}`);
    console.log(`  - File size: ${sizeMBHeader ?? "?"}MB`);
    console.log(`  - Preview: ${formattedTranscription.substring(0, 150)}...`);
    return formattedTranscription;
  } catch (error) {
    console.error("❌ Error in transcription service:", error);
    // Enhanced error handling
    if (error.name === "AbortError") {
      return "No hay transcripción disponible - tiempo de descarga agotado (archivo muy grande o conexión lenta)";
    }
    if (error.status === 413 || error.message?.includes("413")) {
      return "No hay transcripción disponible - archivo demasiado grande para la API de OpenAI (máximo 25MB)";
    }
    if (error.status === 429) {
      return "No hay transcripción disponible - límite de velocidad de API alcanzado, reintentando automáticamente";
    }
    if (error.message?.includes("Invalid file format")) {
      return "No hay transcripción disponible - formato de archivo no compatible con OpenAI Whisper";
    }
    if (error.message?.includes("No speech found")) {
      return "No hay transcripción disponible - no se detectó habla clara en el audio";
    }
    console.error("Unexpected transcription error details:", {
      message: error.message,
      status: error.status,
      stack: error.stack,
    });
    throw new Error(`Transcription failed: ${error.message}`);
  }
}
/**
 * Transcribe aprovechando separación de canales (izquierdo/derecho) cuando sea posible.
 * Intenta dividir en dos monos (L/R) con ffmpeg.wasm. Si falla, cae a transcribeAudio.
 */ export async function transcribeAudioStereoFirst(audioUrl, options) {
  const leftRole = options?.leftRole || "Asesor";
  const rightRole = options?.rightRole || "Cliente";
  try {
    const apiKey = Deno.env.get("OPENAI_API_KEY_SPEECH");
    if (!apiKey) throw new Error("OpenAI API key not configured");
    const openai = new OpenAI({
      apiKey,
    });
    const res = await fetch(audioUrl);
    if (!res.ok) throw new Error(`No se pudo descargar el audio (${res.status})`);
    const inputBuffer = new Uint8Array(await res.arrayBuffer());
    // Carga perezosa de ffmpeg.wasm
    // @ts-ignore: ESM shim para Deno
    const { createFFmpeg, fetchFile } = await import("https://esm.sh/@ffmpeg/ffmpeg@0.12.6");
    // @ts-ignore: URL del core para entorno web
    const ffmpeg = createFFmpeg({
      log: false,
      corePath: "https://unpkg.com/@ffmpeg/core@0.12.6/dist/ffmpeg-core.js",
    });
    await ffmpeg.load();
    ffmpeg.FS("writeFile", "input", inputBuffer);
    // Split estéreo → mono L/R
    await ffmpeg.run(
      "-i",
      "input",
      "-filter_complex",
      "channelsplit=channel_layout=stereo[FL][FR]",
      "-map",
      "[FL]",
      "left.wav",
      "-map",
      "[FR]",
      "right.wav",
    );
    const leftData = ffmpeg.FS("readFile", "left.wav");
    const rightData = ffmpeg.FS("readFile", "right.wav");
    const leftBlob = new Blob([leftData.buffer], {
      type: "audio/wav",
    });
    const rightBlob = new Blob([rightData.buffer], {
      type: "audio/wav",
    });
    // @ts-ignore Deno helper admite Blob
    const leftFile = await toFile(leftBlob, "left.wav", {
      type: "audio/wav",
    });
    // @ts-ignore Deno helper admite Blob
    const rightFile = await toFile(rightBlob, "right.wav", {
      type: "audio/wav",
    });
    const [leftTx, rightTx] = await Promise.all([
      openai.audio.transcriptions.create({
        file: leftFile,
        model: "whisper-1",
        language: "es",
        response_format: "verbose_json",
        // @ts-ignore
        timestamp_granularities: ["segment", "word"],
        temperature: 0.0,
        prompt: "Transcribe de forma literal sin etiquetas de ruido.",
      }),
      openai.audio.transcriptions.create({
        file: rightFile,
        model: "whisper-1",
        language: "es",
        response_format: "verbose_json",
        // @ts-ignore
        timestamp_granularities: ["segment", "word"],
        temperature: 0.0,
        prompt: "Transcribe de forma literal sin etiquetas de ruido.",
      }),
    ]);
    const leftSegs = (leftTx.segments || []).map((s) => ({
      start: s.start || 0,
      end: s.end || 0,
      text: (s.text || "").trim(),
      role: leftRole,
    }));
    const rightSegs = (rightTx.segments || []).map((s) => ({
      start: s.start || 0,
      end: s.end || 0,
      text: (s.text || "").trim(),
      role: rightRole,
    }));
    const merged = [...leftSegs, ...rightSegs]
      .filter((s) => s.text && s.text.length > 1)
      .sort((a, b) => a.start - b.start);
    // Armar salida con silencios ≥ 2s
    let formatted = "";
    let lastEnd = 0;
    for (let i = 0; i < merged.length; i++) {
      const seg = merged[i];
      const gap = Math.max(0, seg.start - lastEnd);
      if (gap >= 2) {
        const m = Math.floor(lastEnd / 60);
        const s = Math.floor(lastEnd % 60);
        formatted += `[${m}:${s.toString().padStart(2, "0")}] Silencio: ${Math.round(gap)} segundos de pausa\n`;
      }
      const m2 = Math.floor(seg.start / 60);
      const s2 = Math.floor(seg.start % 60);
      const clean = seg.text
        .replace(/\[(noise|música|ruido|risas|inaudible)\]/gi, "")
        .replace(/\s+/g, " ")
        .trim();
      formatted += `[${m2}:${s2.toString().padStart(2, "0")}] ${seg.role}: ${clean}\n`;
      lastEnd = Math.max(lastEnd, seg.end);
    }
    return formatted || "No hay transcripción disponible";
  } catch (e) {
    console.warn("Stereo split failed or unavailable, falling back to single-stream:", e?.message || e);
    return await transcribeAudio(audioUrl);
  }
}
// Procesamiento masivo con límite de concurrencia
export async function transcribeAudioBatch(audioUrls, concurrency = 50) {
  const results = [];
  const limit = Math.max(1, Math.min(concurrency, 100));
  let index = 0;
  async function worker() {
    while (index < audioUrls.length) {
      const myIndex = index++;
      const url = audioUrls[myIndex];
      try {
        const text = await transcribeAudio(url);
        results[myIndex] = {
          url,
          ok: true,
          text,
        };
      } catch (e) {
        results[myIndex] = {
          url,
          ok: false,
          error: e?.message || String(e),
        };
      }
    }
  }
  await Promise.all(
    Array.from({
      length: limit,
    }).map(worker),
  );
  return results;
}
