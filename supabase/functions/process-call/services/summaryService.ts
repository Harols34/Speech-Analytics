
const openAIKey = Deno.env.get('OPENAI_API_KEY') || Deno.env.get('API_DE_OPENAI');

export async function generateSummary(transcription: string, customPrompt?: string): Promise<string> {
  if (!openAIKey) {
    console.warn('No OpenAI API key found, skipping summary generation');
    return 'Resumen no disponible - API key no configurada';
  }

  // Check if transcription indicates no content available
  if (!transcription || transcription.trim() === '' || 
      transcription.includes('No hay transcripción disponible')) {
    console.log('No valid transcription available for summary');
    return 'Resumen no disponible - no hay transcripción para analizar';
  }

  try {
    const defaultPrompt = `Analiza la siguiente transcripción de una llamada y proporciona un resumen conciso y profesional que incluya:

1. Motivo principal de la llamada
2. Puntos clave discutidos
3. Resolución o resultado
4. Próximos pasos (si aplica)

IMPORTANTE: Si la transcripción indica que no hay contenido disponible, correo de voz, o contenido insuficiente, responde únicamente: "Resumen no disponible - no hay contenido suficiente para analizar"

Mantén el resumen entre 100-200 palabras y usa un tono profesional.

Transcripción:`;

    const promptToUse = customPrompt || defaultPrompt;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'user',
            content: `${promptToUse}\n\n${transcription}`
          }
        ],
        max_tokens: 500,
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    
    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
      throw new Error('Invalid response format from OpenAI');
    }

    const summary = data.choices[0].message.content;
    console.log('Generated summary with custom prompt:', !!customPrompt);
    
    return summary;
  } catch (error) {
    console.error('Error generating summary:', error);
    return 'Resumen no disponible - error al generar análisis: ' + error.message;
  }
}
