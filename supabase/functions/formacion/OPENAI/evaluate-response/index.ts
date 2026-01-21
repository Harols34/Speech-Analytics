import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const openAIApiKey = Deno.env.get('OPENAI_API_KEY_FORMACIÓN');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      userResponse, 
      scenario, 
      conversationHistory,
      // Nuevos campos dinámicos
      evaluation_criteria = [],
      knowledge_base = '',
      custom_evaluation_instructions = '',
      expected_outcome = ''
    } = await req.json();

    if (!openAIApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    if (!userResponse || userResponse.trim().length < 5) {
      return createMinimalResponseEvaluation();
    }

    // Construir la sección de criterios dinámicos
    let criteriaSection = '';
    if (evaluation_criteria && evaluation_criteria.length > 0) {
      criteriaSection = `\n\nCRITERIOS DE EVALUACIÓN PERSONALIZADOS:
${evaluation_criteria.map((criterion: any) => 
  `- ${criterion.name} (${criterion.weight}%): ${criterion.description}`
).join('\n')}

IMPORTANTE: La calificación debe calcularse según estos criterios y sus pesos. La suma de todos los criterios debe dar 100%.`;
    }

    // Construir la sección de base de conocimiento
    let knowledgeSection = '';
    if (knowledge_base && knowledge_base.trim()) {
      knowledgeSection = `\n\nBASE DE CONOCIMIENTO PARA VALIDACIÓN:
${knowledge_base}

IMPORTANTE: Utiliza esta información para verificar la precisión de las respuestas. Si el asesor menciona información incorrecta o no incluida en la base de conocimiento, debe calificarse como error.`;
    }

    // Construir la sección de resultado esperado
    let outcomeSection = '';
    if (expected_outcome && expected_outcome.trim()) {
      outcomeSection = `\n\nRESULTADO ESPERADO DEL CLIENTE:
${expected_outcome}

IMPORTANTE: Este es el flujo ideal. Si el asesor logra este resultado, debe obtener la máxima calificación.`;
    }

    // Construir las instrucciones personalizadas
    let customInstructions = '';
    if (custom_evaluation_instructions && custom_evaluation_instructions.trim()) {
      customInstructions = `\n\nINSTRUCCIONES DE EVALUACIÓN ESPECÍFICAS:
${custom_evaluation_instructions}`;
    }

    const evaluationPrompt = `Eres un experto evaluador en contact center y vas a analizar el desempeño de un asesor en una simulación de entrenamiento.

ESCENARIO DE ENTRENAMIENTO:
Título: ${scenario?.name || 'General'}
Descripción: ${scenario?.description || 'Entrenamiento general'}
Categoría: ${scenario?.category || 'General'}
Nivel de dificultad: ${scenario?.difficulty || 'intermediate'}
${criteriaSection}
${knowledgeSection}
${outcomeSection}
${customInstructions}

HISTORIAL DE CONVERSACIÓN:
${conversationHistory ? conversationHistory.map((msg: any) => `${msg.role === 'user' ? 'Asesor' : 'Cliente'}: ${msg.content}`).join('\n') : 'No hay historial previo'}

ÚLTIMA RESPUESTA DEL ASESOR A EVALUAR:
${userResponse}

Evalúa esta respuesta considerando:

1. PUNTUACIÓN GENERAL (0-100): Desempeño global ${evaluation_criteria.length > 0 ? 'basado en los criterios personalizados definidos' : 'considerando el contexto del escenario'}
2. PRECISIÓN TÉCNICA (0-100): Corrección de la información proporcionada${knowledge_base ? ' según la base de conocimiento' : ''}
3. HABILIDADES DE COMUNICACIÓN (0-100): Claridad, persuasión, manejo de objeciones
4. ADAPTACIÓN AL ESCENARIO (0-100): Qué tan bien se adapta al contexto específico
5. ÁREAS DE MEJORA: Aspectos específicos que necesitan trabajo
6. ASPECTOS POSITIVOS: Lo que hizo bien el asesor
7. SUGERENCIAS ESPECÍFICAS: Consejos concretos para mejorar
8. ERRORES CRÍTICOS: Fallos graves que podrían afectar el resultado

${evaluation_criteria.length > 0 ? `
9. CRITERIOS PERSONALIZADOS: Para cada criterio definido, proporciona:
   - Puntuación (0-100)
   - Comentario específico sobre el cumplimiento
   - Evidencia de la conversación que sustenta la calificación
` : ''}

Responde ÚNICAMENTE con un objeto JSON válido con esta estructura exacta:
{
  "score": number (0-100),
  "accuracy": number (0-100),
  "communication": number (0-100),
  "scenario_adaptation": number (0-100),
  "areas_improvement": ["área1", "área2", "área3"],
  "positive_aspects": ["aspecto1", "aspecto2", "aspecto3"],
  "suggestions": ["sugerencia1", "sugerencia2", "sugerencia3"],
  "critical_errors": ["error1", "error2"],
  "overall_feedback": "Comentario general constructivo sobre el desempeño",
  "next_steps": "Próximos pasos recomendados para mejorar"${evaluation_criteria.length > 0 ? `,
  "custom_criteria_scores": [
    {
      "criterion_name": "nombre del criterio",
      "score": number (0-100),
      "comment": "comentario específico",
      "evidence": "evidencia de la conversación"
    }
  ]` : ''}
}`;

    console.log('Processing evaluation request');
    console.log(`Scenario: ${scenario?.name || 'General'}`);
    console.log(`Response length: ${userResponse.length} characters`);
    console.log(`Custom criteria: ${evaluation_criteria.length}`);
    console.log(`Has knowledge base: ${!!knowledge_base}`);

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { 
            role: 'system', 
            content: 'Eres un evaluador experto en entrenamiento profesional y coaching comercial. Responde ÚNICAMENTE con JSON válido, sin texto adicional, sin comillas de código, sin explicaciones. Tu evaluación debe ser constructiva, específica y basada en evidencia real de la respuesta del usuario.' 
          },
          { role: 'user', content: evaluationPrompt }
        ],
        temperature: 0.2,
        max_tokens: 2000,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI API error:', errorText);
      return createFallbackEvaluation(userResponse);
    }

    const data = await response.json();
    let evaluationText = data.choices[0]?.message?.content?.trim();

    if (!evaluationText) {
      return createFallbackEvaluation(userResponse);
    }

    // Limpiar respuesta para obtener JSON válido
    evaluationText = cleanJsonResponse(evaluationText);

    try {
      const evaluation = JSON.parse(evaluationText);
      
      // Validar estructura del JSON
      const validatedEvaluation = validateEvaluationStructure(evaluation);
      
      console.log('Evaluation completed successfully');
      console.log(`Overall score: ${validatedEvaluation.score}/100`);

      return new Response(JSON.stringify({
        success: true,
        evaluation: validatedEvaluation,
        timestamp: new Date().toISOString(),
        scenario_info: {
          title: scenario?.name,
          category: scenario?.category,
          difficulty: scenario?.difficulty
        }
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });

    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      console.log('Raw evaluation response:', evaluationText);
      return createFallbackEvaluation(userResponse);
    }

  } catch (error) {
    console.error('Error in evaluate-response:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message,
      evaluation: createBasicEvaluation()
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

function cleanJsonResponse(text: string): string {
  // Remover markdown code blocks
  text = text.replace(/```json\s*/g, '').replace(/```\s*/g, '');
  
  // Buscar el inicio y fin del JSON
  const jsonStart = text.indexOf('{');
  const jsonEnd = text.lastIndexOf('}');
  
  if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
    text = text.substring(jsonStart, jsonEnd + 1);
  }
  
  return text.trim();
}

function validateEvaluationStructure(evaluation: any) {
  const validated: any = {
    score: Math.max(0, Math.min(100, evaluation.score ?? 0)),
    accuracy: Math.max(0, Math.min(100, evaluation.accuracy ?? 0)),
    communication: Math.max(0, Math.min(100, evaluation.communication ?? 0)),
    scenario_adaptation: Math.max(0, Math.min(100, evaluation.scenario_adaptation ?? 0)),
    areas_improvement: Array.isArray(evaluation.areas_improvement) ? evaluation.areas_improvement.slice(0, 5) : ['Continuar practicando'],
    positive_aspects: Array.isArray(evaluation.positive_aspects) ? evaluation.positive_aspects.slice(0, 5) : ['Participación activa'],
    suggestions: Array.isArray(evaluation.suggestions) ? evaluation.suggestions.slice(0, 5) : ['Seguir practicando'],
    critical_errors: Array.isArray(evaluation.critical_errors) ? evaluation.critical_errors.slice(0, 3) : [],
    overall_feedback: evaluation.overall_feedback || 'Buen trabajo en general, sigue practicando para mejorar.',
    next_steps: evaluation.next_steps || 'Continuar con más ejercicios de práctica.'
  };

  // Incluir criterios personalizados si existen
  if (evaluation.custom_criteria_scores && Array.isArray(evaluation.custom_criteria_scores)) {
    validated.custom_criteria_scores = evaluation.custom_criteria_scores.map((criterion: any) => ({
      criterion_name: criterion.criterion_name || 'Criterio',
      score: Math.max(0, Math.min(100, criterion.score ?? 0)),
      comment: criterion.comment || 'Sin comentario',
      evidence: criterion.evidence || 'Sin evidencia específica'
    }));
  }

  return validated;
}

function createFallbackEvaluation(userResponse: string) {
  return new Response(JSON.stringify({
    success: true,
    evaluation: {
      score: 0,
      accuracy: 0,
      communication: 0,
      scenario_adaptation: 0,
      areas_improvement: ['Expandir respuestas con más detalle', 'Mejorar estructura de la comunicación'],
      positive_aspects: [],
      suggestions: ['Proporcionar respuestas más detalladas', 'Practicar técnicas de comunicación'],
      critical_errors: userResponse.length < 20 ? ['Respuesta muy breve'] : [],
      overall_feedback: 'Servicio de evaluación temporalmente limitado. Evaluación básica generada con puntuación 0.',
      next_steps: 'Continuar practicando y solicitar evaluación nuevamente.'
    },
    fallback: true,
    timestamp: new Date().toISOString()
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function createMinimalResponseEvaluation() {
  return new Response(JSON.stringify({
    success: false,
    evaluation: {
      score: 0,
      accuracy: 0,
      communication: 0,
      scenario_adaptation: 0,
      areas_improvement: ['Proporcionar respuesta más completa', 'Desarrollar ideas con mayor profundidad'],
      positive_aspects: [],
      suggestions: ['Escribir respuestas más largas y detalladas', 'Incluir más información relevante'],
      critical_errors: ['Respuesta demasiado breve para evaluación efectiva'],
      overall_feedback: 'La respuesta es muy breve para una evaluación completa. Puntuación establecida en 0 hasta tener suficiente contenido.',
      next_steps: 'Proporcionar respuestas más detalladas en futuros ejercicios.'
    },
    error: 'Respuesta muy breve para evaluación completa'
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function createBasicEvaluation() {
  return {
    score: 0,
    accuracy: 0,
    communication: 0,
    scenario_adaptation: 0,
    areas_improvement: ['Evaluación no disponible temporalmente'],
    positive_aspects: [],
    suggestions: ['Reintentar evaluación más tarde'],
    critical_errors: [],
    overall_feedback: 'Sistema de evaluación temporalmente no disponible. Puntuación en 0.',
    next_steps: 'Continuar practicando y solicitar evaluación cuando el servicio esté disponible.'
  };
}
