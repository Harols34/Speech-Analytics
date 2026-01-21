import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { content, type, name } = await req.json();

    if (!content || typeof content !== "string") {
      throw new Error("El contenido del prompt es requerido y debe ser texto.");
    }

    const openAIApiKey = Deno.env.get("OPENAI_API_KEY_SPEECH");
    if (!openAIApiKey) {
      throw new Error("API key de OpenAI no configurada");
    }

    // ====== Detección de campos solicitados (para armar los ENTREGABLES numerados) ======
    type Canonical =
      | "advisor_name" | "client_name" | "client_need" | "solution_given"
      | "key_points" | "met_objectives" | "pending_objectives" | "contact_data"
      | "agreements" | "next_steps" | "upsell_opps" | "interaction_type"
      | "comm_techniques" | "objection_handling" | "closing" | "missed_opps"
      | "rapport" | "need_discovery" | "value_argument" | "prospect_qual";

    const CANON_LABELS: Record<Canonical, string> = {
      advisor_name: "Nombre del asesor",
      client_name: "Nombre del cliente",
      client_need: "Qué buscaba el cliente / necesidad principal",
      solution_given: "Solución entregada por el asesor",
      key_points: "Puntos clave de la conversación",
      met_objectives: "Objetivos cumplidos",
      pending_objectives: "Objetivos pendientes",
      contact_data: "Datos de contacto e información relevante",
      agreements: "Acuerdos logrados",
      next_steps: "Próximos pasos",
      upsell_opps: "Oportunidades de negocio / upselling",
      interaction_type: "Tipo de interacción (venta, soporte, consulta, etc.)",
      comm_techniques: "Técnicas de comunicación y persuasión",
      objection_handling: "Manejo de objeciones",
      closing: "Cierre de la gestión / venta",
      missed_opps: "Oportunidades perdidas",
      rapport: "Rapport y construcción de confianza",
      need_discovery: "Detección de necesidades",
      value_argument: "Argumentación de valor y beneficios",
      prospect_qual: "Calificación del prospecto",
    };

    const SYNS: Array<[Canonical, RegExp[]]> = [
      ["advisor_name", [/nombre.*asesor/i, /\basesor\b.*nombre/i]],
      ["client_name", [/nombre.*cliente/i, /\bcliente\b.*nombre/i]],
      ["client_need", [/qué\s*buscaba/i, /necesidad(es)?/i, /motivo.*llamada/i]],
      ["solution_given", [/soluci[oó]n/i, /respuesta.*asesor/i, /propuesta/i]],
      ["agreements", [/acuerdos?/i]],
      ["next_steps", [/pr[oó]ximos?\s*pasos?/i, /seguimiento/i]],
      ["contact_data", [/datos?\s*de\s*contacto/i, /correo|tel[eé]fono/i]],
      ["met_objectives", [/objetivos?\s*(cumplidos?|logrados?)/i]],
      ["pending_objectives", [/objetivos?\s*(pendientes?)/i]],
      ["upsell_opps", [/up-?sell|upselling|oportunidades?\s*(de\s*)?negocio/i]],
      ["interaction_type", [/tipo\s*de\s*interacci[oó]n|motivo/i]],
      ["comm_techniques", [/t[eé]cnicas?\s*de\s*comunicaci[oó]n|persuasi[oó]n/i]],
      ["objection_handling", [/objeciones?/i]],
      ["closing", [/cierre\s*(de\s*venta|de\s*gesti[oó]n)?/i]],
      ["missed_opps", [/oportunidades?\s*perdidas?/i]],
      ["rapport", [/rapport|confianza/i]],
      ["need_discovery", [/detecci[oó]n\s*de\s*necesidades|descubrimiento/i]],
      ["value_argument", [/argumentaci[oó]n\s*de\s*valor|beneficios/i]],
      ["prospect_qual", [/calificaci[oó]n\s*del\s*prospecto|BANT|MEDD(IC|P)/i]],
      ["key_points", [/resumen|puntos?\s*claves?/i]], // genérico
    ];

    function extractRequestedCanonicals(instruction: string): Canonical[] {
      const text = instruction.trim();
      if (!text) return [];
      // Dividir por comas, saltos de línea o " y "
      const chunks = text.split(/[,\n]+| y /i).map((c) => c.trim()).filter(Boolean);

      const picked: Canonical[] = [];
      const pushOnce = (c: Canonical) => { if (!picked.includes(c)) picked.push(c); };

      for (const chunk of chunks) {
        for (const [canon, patterns] of SYNS) {
          if (patterns.some((rx) => rx.test(chunk))) {
            pushOnce(canon);
          }
        }
      }
      return picked;
    }

    function fallbackItemsByType(t: string): Canonical[] {
      if (t === "summary") {
        return [
          "key_points",
          "met_objectives",
          "pending_objectives",
          "contact_data",
          "agreements",
          "next_steps",
          "upsell_opps",
          "interaction_type",
        ];
      }
      if (t === "feedback") {
        return [
          "comm_techniques",
          "objection_handling",
          "closing",
          "missed_opps",
          "rapport",
          "need_discovery",
          "value_argument",
          "prospect_qual",
        ];
      }
      return ["key_points", "interaction_type", "next_steps"];
    }

    // === Prompt del sistema que obliga a REESCRIBIR el prompt del usuario (no una lista suelta) ===
    function getSystemPromptThatRewrites(t: string, instructionText: string): string {
      const requested = extractRequestedCanonicals(instructionText);
      const items = requested.length > 0 ? requested : fallbackItemsByType(t);
      const entregables = items.map((c, i) => `${i + 1}. ${CANON_LABELS[c]}`).join("\n");

      const scope =
        t === "summary"
          ? "Genera un prompt que instruya a producir un **resumen estructurado y accionable** de la llamada."
          : t === "feedback"
          ? "Genera un prompt que instruya a producir **feedback específico, constructivo y accionable**."
          : "Genera un prompt que instruya a analizar comunicaciones comerciales y de servicio con buenas prácticas.";

      return `Eres un editor experto de prompts para IA. Tu tarea es **reescribir y potenciar** el prompt proporcionado por el usuario (mantén su intención, tono, restricciones y vocabulario clave), haciéndolo más claro, profesional y útil en contexto de análisis de llamadas (${t}).

REQUISITOS DE LA RESPUESTA:
- Devuelve **únicamente** un **prompt mejorado** completo (no des explicaciones, ni títulos, ni markdown extra).
- El prompt final debe estar en **español**, listo para usarse como **mensajes del sistema** o **instrucciones**.
- El prompt final debe incluir secciones compactas como:
  • Rol y contexto (quién es la IA y qué analiza)
  • Objetivo (qué debe lograr)
  • Instrucciones de análisis (cómo proceder, qué evitar)
  • Entregables (numerados 1., 2., 3., … **solo los siguientes**)
  • Criterios de calidad (brevedad, objetividad, no inventar datos)
  • Restricciones (formato/longitud/tópicos fuera de alcance)
- **No devuelvas un listado aislado de puntos**; debe ser un **prompt redactado** que incorpore los entregables.

ENTREGABLES (numerados, incluir **exactamente** estos y en este orden):
${entregables}

CONTEXTO POR TIPO:
${scope}

PAUTAS DE CALIDAD:
- Si un entregable no está en la conversación, instruye a reportarlo como "no identificado".
- Sé específico pero conciso. Evita adornos y jerga innecesaria.
- Respeta cualquier formato o longitud ya exigido por el usuario; si no hay, sugiere límites razonables (por ejemplo, 150–250 palabras para resumen).
- No inventes políticas ni menciones marcas si no estaban en el original.
- Mantén neutralidad y evita sesgos.

Finalmente, **integra el contenido del prompt original** del usuario dentro de tu versión mejorada, sin perder su intención, y sin añadir requisitos no pedidos salvo los de claridad y calidad.`;
    }

    const systemPrompt = getSystemPromptThatRewrites(type, content);

    const userPrompt = `Prompt original (nombre: "${name}"):
---
${content}
---
Tarea: Reescríbelo integrando las secciones requeridas y los ENTREGABLES indicados arriba. Devuelve solo el prompt mejorado.`;

    console.log("Mejorando prompt con OpenAI...");

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${openAIApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        max_tokens: 1500,
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error("Error de OpenAI:", response.status, errorData);
      throw new Error(`Error de OpenAI: ${response.status}`);
    }

    const data = await response.json();
    const improvedContent = (data?.choices?.[0]?.message?.content || "").trim();

    if (!improvedContent) {
      throw new Error("No se recibió contenido mejorado desde OpenAI.");
    }

    console.log("Prompt mejorado exitosamente");
    return new Response(
      JSON.stringify({ improvedContent, success: true }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );

  } catch (error: any) {
    console.error("Error mejorando prompt:", error);
    return new Response(
      JSON.stringify({ error: error?.message ?? "Error desconocido", success: false }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
