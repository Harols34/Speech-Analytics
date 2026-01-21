import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const openAIApiKey = Deno.env.get("OPENAI_API_KEY_FORMACIÓN");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { intention, category } = await req.json();

    if (!intention) {
      return new Response(JSON.stringify({ error: "Se requiere una intención para generar el escenario" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("Generating scenario for intention:", intention);

    const systemPrompt = `Eres un experto en diseño instruccional y creación de escenarios de entrenamiento para centros de contacto y equipos de ventas.

Tu tarea es generar un escenario de entrenamiento COMPLETO basado en la intención del usuario. Debes llenar TODOS los campos requeridos de manera coherente y profesional.

IMPORTANTE: Responde ÚNICAMENTE con un objeto JSON válido, sin texto adicional ni explicaciones.

El JSON debe tener exactamente esta estructura:
{
  "name": "Nombre descriptivo del escenario",
  "description": "Descripción detallada del comportamiento del cliente virtual y el contexto de la llamada (3-5 oraciones)",
  "category": "Una de: Ventas, Atención al Cliente, Recursos Humanos, Negociación, Educación, Reclutamiento, Onboarding, Offboarding",
  "difficulty": "Una de: beginner, intermediate, advanced",
  "client_personality": {
    "type": "Una de: neutral, friendly, suspicious, hurried, curious, skeptical, aggressive",
    "description": "Descripción breve del comportamiento del cliente",
    "traits": ["rasgo1", "rasgo2", "rasgo3"]
  },
  "objectives": ["Objetivo 1", "Objetivo 2", "Objetivo 3"],
  "evaluation_criteria": [
    {
      "id": "uuid-1",
      "name": "Nombre del criterio",
      "description": "Descripción del criterio",
      "weight": 25
    }
  ],
  "knowledge_base": "Información clave que el asesor debe conocer\\n- Productos/servicios\\n- Precios\\n- Políticas\\n- Errores que califican con 0",
  "custom_evaluation_instructions": "Instrucciones específicas para el evaluador IA",
  "expected_outcome": "Descripción del resultado esperado ideal",
  "call_completion_rules": {
    "success_message": "Mensaje cuando se completa exitosamente",
    "failure_message": "Mensaje cuando no se logra el objetivo",
    "auto_close_on_failure": true
  }
}

REGLAS:
1. Los pesos de evaluation_criteria deben sumar exactamente 100
2. Incluir mínimo 3 criterios de evaluación
3. Incluir mínimo 3 objetivos de aprendizaje
4. La dificultad debe corresponder al contexto
5. Los rasgos del cliente deben ser coherentes con su tipo de personalidad
6. El knowledge_base debe incluir información específica y realista
7. Genera IDs únicos para cada criterio (puedes usar formato "crit-1", "crit-2", etc.)`;

    const userPrompt = `Genera un escenario de entrenamiento completo basado en la siguiente intención:

"${intention}"

${category ? `Categoría sugerida: ${category}` : ""}

Recuerda: Responde SOLO con el JSON, sin texto adicional.`;

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${openAIApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.7,
        max_tokens: 2000,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("OpenAI API error:", errorText);
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices[0].message.content;

    console.log("Raw AI response:", content);

    // Parse the JSON response
    let scenario;
    try {
      // Remove potential markdown code blocks
      const cleanContent = content
        .replace(/```json\n?/g, "")
        .replace(/```\n?/g, "")
        .trim();
      scenario = JSON.parse(cleanContent);
    } catch (parseError) {
      console.error("JSON parse error:", parseError);
      throw new Error("Error al parsear la respuesta de la IA");
    }

    // Validate required fields
    if (!scenario.name || !scenario.description || !scenario.category) {
      throw new Error("La IA no generó todos los campos requeridos");
    }

    // Ensure evaluation_criteria have valid IDs
    if (scenario.evaluation_criteria) {
      scenario.evaluation_criteria = scenario.evaluation_criteria.map((c: any, index: number) => ({
        ...c,
        id: c.id || `crit-${Date.now()}-${index}`,
      }));
    }

    console.log("Generated scenario:", JSON.stringify(scenario, null, 2));

    return new Response(JSON.stringify({ scenario }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error generating scenario:", error);
    return new Response(JSON.stringify({ error: error.message || "Error al generar el escenario" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
