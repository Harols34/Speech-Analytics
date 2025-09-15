
// Feedback generation utilities with enhanced customization

// Function to generate improvement opportunities based on behavior analysis and call summary
export const generateOpportunities = (behaviorsAnalysis: any[], summary: string = "") => {
  const notMet = behaviorsAnalysis.filter(b => b.evaluation === "no cumple");
  
  if (notMet.length === 0 && !summary) return ["No se identificaron oportunidades de mejora significativas"];
  
  // Analyze keywords in the summary to generate more specific recommendations
  const summaryKeywords = {
    precio: ["Perfeccionar argumentación sobre valor vs precio", "Preparar comparativas de costo-beneficio", "Desarrollar técnicas para vencer objeciones de precio"],
    cobertura: ["Mejorar conocimiento sobre áreas de cobertura", "Manejar proactivamente objeciones sobre cobertura", "Ofrecer alternativas para zonas con cobertura limitada"],
    espera: ["Optimizar gestión de tiempos de espera", "Implementar técnicas de manejo de pausas", "Revisar protocolos de transferencia de llamadas"],
    competencia: ["Fortalecer conocimiento sobre ventajas competitivas", "Desarrollar argumentarios comparativos efectivos", "Entrenar en técnicas para destacar beneficios únicos"],
    técnico: ["Reforzar conocimiento técnico de productos y servicios", "Participar en capacitaciones específicas sobre aspectos técnicos", "Implementar uso de lenguaje técnico adaptado al cliente"],
    confusión: ["Mejorar claridad en la comunicación", "Verificar comprensión del cliente frecuentemente", "Simplificar explicaciones técnicas"],
    insatisfacción: ["Fortalecer habilidades de manejo de clientes insatisfechos", "Implementar técnicas de recuperación de servicio", "Mejorar empatía en situaciones de reclamo"],
    duda: ["Perfeccionar técnicas para resolver dudas eficazmente", "Anticiparse a preguntas frecuentes", "Verificar comprensión después de explicaciones"]
  };
  
  let specificOpportunities = [];
  
  // Analyze the summary to find specific opportunities
  if (summary) {
    const lowerSummary = summary.toLowerCase();
    Object.entries(summaryKeywords).forEach(([keyword, suggestions]) => {
      if (lowerSummary.includes(keyword)) {
        specificOpportunities.push(suggestions[Math.floor(Math.random() * suggestions.length)]);
      }
    });
  }
  
  // Combine specific opportunities with those derived from behavior analysis
  const behaviorOpportunities = notMet.map(b => {
    // Extract keywords and generate specific suggestions with variability
    const behavior = b.name.toLowerCase();
    const variations = {
      saludo: [
        "Mejorar el saludo inicial y presentación corporativa",
        "Estandarizar el protocolo de bienvenida con elementos clave de identidad",
        "Personalizar el saludo inicial para generar mejor primera impresión"
      ],
      escucha: [
        "Perfeccionar técnicas de escucha activa y confirmación",
        "Implementar paráfrasis para demostrar atención al cliente",
        "Utilizar preguntas de seguimiento para profundizar comprensión"
      ],
      preguntas: [
        "Desarrollar repertorio de preguntas para indagación efectiva",
        "Mejorar secuencia lógica de indagación de necesidades",
        "Incorporar preguntas abiertas para obtener más información"
      ],
      soluciones: [
        "Ampliar catálogo de soluciones alternativas según perfil de cliente",
        "Implementar método de presentación de beneficios antes que características",
        "Personalizar propuestas según necesidades específicas del cliente"
      ],
      cierre: [
        "Fortalecer técnicas de cierre con llamado a la acción claro",
        "Mejorar resumen final de acuerdos y pasos a seguir",
        "Implementar verificación de satisfacción al finalizar la llamada"
      ],
      objeciones: [
        "Ampliar repertorio de respuestas a objeciones comunes",
        "Implementar modelo LAER para manejo de objeciones (Listen, Acknowledge, Explore, Respond)",
        "Desarrollar técnicas para transformar objeciones en oportunidades"
      ],
    };
    
    // Find matches with keywords and choose a random variation
    for (const [key, options] of Object.entries(variations)) {
      if (behavior.includes(key)) {
        return options[Math.floor(Math.random() * options.length)];
      }
    }
    
    // If there's no specific match, return a general suggestion
    return `Mejorar en: ${b.name}`;
  });
  
  // Combine and remove duplicates
  let allOpportunities = [...new Set([...specificOpportunities, ...behaviorOpportunities])];
  
  // If there aren't enough specific opportunities, add some general ones based on the analysis
  if (allOpportunities.length < 3) {
    const generalOpportunities = [
      "Implementar buenas prácticas en manejo del tiempo de la llamada",
      "Fortalecer habilidades de comunicación con lenguaje positivo",
      "Revisar guiones de ventas para mejorar efectividad",
      "Participar en simulaciones de llamadas difíciles",
      "Ampliar conocimiento sobre productos complementarios"
    ];
    
    // Add general opportunities without duplicates until we have at least 3
    for (const opp of generalOpportunities) {
      if (allOpportunities.length >= 3) break;
      if (!allOpportunities.includes(opp)) {
        allOpportunities.push(opp);
      }
    }
  }
  
  return allOpportunities.slice(0, 5); // Limit to 5 opportunities
};

// Function to generate positive aspects based on behavior analysis and call summary
export const generatePositives = (behaviorsAnalysis: any[], score: number, summary: string = "") => {
  const met = behaviorsAnalysis.filter(b => b.evaluation === "cumple");
  
  if (met.length === 0 && !summary) {
    return ["Se identificaron oportunidades de mejora"];
  }
  
  // Detect positive aspects based on summary keywords
  const summaryStrengths = [];
  if (summary) {
    const lowerSummary = summary.toLowerCase();
    
    const strengthPatterns = {
      "explicó claramente": "Comunicación clara y efectiva",
      "buena atención": "Excelente atención al cliente",
      "resolvió": "Efectividad en la resolución de problemas",
      "amable": "Trato cordial y profesional",
      "rápida": "Eficiencia en la gestión de la llamada",
      "recomendó": "Recomendaciones personalizadas efectivas",
      "paciente": "Paciencia ejemplar con el cliente",
      "empatía": "Demostración de empatía con las necesidades del cliente",
      "ofreció alternativas": "Capacidad para ofrecer soluciones alternativas",
      "escuchó atentamente": "Escucha activa efectivamente aplicada"
    };
    
    // Look for strength patterns in the summary
    Object.entries(strengthPatterns).forEach(([pattern, strength]) => {
      if (lowerSummary.includes(pattern)) {
        summaryStrengths.push(strength);
      }
    });
    
    // Identify if there was a successful sale or cross-selling
    if (lowerSummary.includes("venta exitosa") || lowerSummary.includes("aceptó la oferta")) {
      summaryStrengths.push("Efectividad en el cierre de venta");
    }
    if (lowerSummary.includes("productos adicionales") || lowerSummary.includes("venta cruzada")) {
      summaryStrengths.push("Habilidad para realizar ventas cruzadas");
    }
  }
  
  // Generate positive aspects based on the behaviors met
  let behaviorStrengths = [];
  
  // If there are behaviors met, generate specific strengths
  if (score > 50) {
    behaviorStrengths = met.map(b => {
      const behavior = b.name.toLowerCase();
      const variations = {
        saludo: [
          "Excelente presentación y bienvenida",
          "Protocolo de inicio de llamada ejecutado perfectamente",
          "Saludo corporativo aplicado con naturalidad"
        ],
        escucha: [
          "Demostró escucha activa y comprensión empática",
          "Excelente capacidad para captar necesidades sin interrupciones",
          "Aplicó técnicas avanzadas de escucha reflexiva"
        ],
        solución: [
          "Ofreció soluciones efectivas y personalizadas",
          "Demostró conocimiento experto al proponer alternativas",
          "Presentó opciones adaptadas perfectamente al perfil del cliente"
        ],
        cierre: [
          "Realizó un cierre profesional y completo",
          "Manejó el cierre con resumen efectivo de acuerdos",
          "Excelente finalización con verificación de satisfacción"
        ],
        objeciones: [
          "Manejó las objeciones con profesionalismo y efectividad",
          "Transformó objeciones en oportunidades de forma natural",
          "Aplicó técnicas avanzadas de gestión de resistencia del cliente"
        ],
        indagación: [
          "Realizó indagación profunda y efectiva",
          "Utilizó preguntas estratégicas para descubrir necesidades ocultas",
          "Desarrolló perfil completo del cliente mediante indagación experta"
        ],
        explicación: [
          "Explicó características y beneficios con claridad excepcional",
          "Adaptó explicaciones técnicas al nivel de comprensión del cliente",
          "Comunicó información compleja de forma accesible y convincente"
        ]
      };
      
      // Look for matches with keywords and choose a random variation
      for (const [key, options] of Object.entries(variations)) {
        if (behavior.includes(key)) {
          return options[Math.floor(Math.random() * options.length)];
        }
      }
      
      return `Cumplió con: ${b.name}`;
    });
  }
  
  // Combine strengths from summary and behaviors
  const allStrengths = [...summaryStrengths, ...behaviorStrengths];
  
  // Ensure variety based on score
  const commonPositives = [
    "Mantuvo tono profesional durante toda la llamada",
    "Identificación y presentación corporativa correcta",
    "Demostró interés en comprender la necesidad del cliente",
    "Proporcionó información relevante y actualizada",
    "Mantuvo conversación cordial y respetuosa",
    "Utilizó lenguaje claro y accesible",
    "Demostró conocimiento adecuado de productos y servicios",
    "Ofreció alternativas viables según el contexto"
  ];
  
  // If there aren't enough specific strengths, add some generic ones
  if (allStrengths.length < 3) {
    // Randomly select from commonPositives without repetitions
    const shuffledCommon = commonPositives.sort(() => 0.5 - Math.random());
    
    // Add generic strengths until we have at least 3
    for (const pos of shuffledCommon) {
      if (allStrengths.length >= 3) break;
      if (!allStrengths.includes(pos)) {
        allStrengths.push(pos);
      }
    }
  }
  
  // Limit and return positive aspects
  return [...new Set(allStrengths)].slice(0, 5);
};

// New function to generate daily analysis with OpenAI
export const generateDailyAnalysis = async (reports: any[], hasCalls: boolean) => {
  // If there are no calls, return null to prevent generating empty analysis
  if (!reports || reports.length === 0 || !hasCalls) return null;
  
  // Calculate general metrics
  const totalCalls = reports.reduce((sum, report) => sum + (report.callCount || 0), 0);
  const avgScore = Math.round(reports.reduce((sum, report) => sum + (report.averageScore || 0), 0) / reports.length);
  
  // Analyze trends
  const trend = reports.length > 1 ? 
    (reports[0].averageScore > reports[reports.length-1].averageScore ? "descendente" : "ascendente") : 
    "estable";
  
  // Identify top agents
  const topAgents = reports
    .flatMap(r => r.agents || [])
    .sort((a, b) => b.averageScore - a.averageScore)
    .slice(0, 3);
    
  // Identify most common improvement areas
  const commonIssues = reports
    .flatMap(r => r.issues || [])
    .reduce((acc, issue) => {
      acc[issue] = (acc[issue] || 0) + 1;
      return acc;
    }, {});
  
  const topIssues = Object.entries(commonIssues)
    .sort(([, a], [, b]) => (b as number) - (a as number))
    .map(([issue]) => issue)
    .slice(0, 3);

  // Generate personalized findings based on real data
  const findings = {
    positive: [
      `Promedio de calidad de atención: ${avgScore}%`,
      topAgents.length ? `Agente destacado: ${topAgents[0]?.name || 'N/A'}` : "Rendimiento consistente del equipo",
      `Tendencia de calidad ${trend} en el período analizado`,
      totalCalls > 10 ? "Volumen de llamadas gestionado eficientemente" : "Atención personalizada en cada interacción",
      avgScore > 75 ? "Alto nivel de satisfacción en protocolos de atención" : "Cumplimiento aceptable de estándares básicos"
    ],
    negative: [
      topIssues[0] ? `Principal área de mejora: ${topIssues[0]}` : "Oportunidades de mejora variadas",
      avgScore < 85 ? "Margen significativo para incrementar calidad de atención" : "Pequeños ajustes necesarios para excelencia",
      avgScore < 70 ? "Necesidad urgente de reforzar protocolos básicos" : "Refinamiento necesario en técnicas avanzadas",
      trend === "descendente" ? "Preocupante tendencia negativa que requiere atención" : "Inconsistencia en aplicación de mejores prácticas",
      topIssues[1] ? `Área secundaria a reforzar: ${topIssues[1]}` : "Diversas áreas requieren atención específica"
    ]
  };
  
  return {
    avgScore,
    trend,
    topAgents: topAgents.slice(0, 2),
    findings
  };
};

// Nueva función para generar análisis global personalizado
export const generateGlobalAnalysis = (reports: any[], timeRange: number): string => {
  if (!reports || reports.length === 0) return "";
  
  const totalCalls = reports.reduce((sum, report) => sum + (report.callCount || 0), 0);
  const avgScore = Math.round(reports.reduce((sum, report) => sum + (report.averageScore || 0), 0) / reports.length);
  
  // Determinar período de tiempo para el mensaje
  let periodText = "";
  switch (timeRange) {
    case 7: periodText = "la última semana"; break;
    case 15: periodText = "los últimos 15 días"; break;
    case 30: periodText = "el último mes"; break;
    case 90: periodText = "los últimos 3 meses"; break;
    default: periodText = "el período seleccionado";
  }

  // Analizar tendencias
  let trendAnalysis = "";
  if (reports.length > 1) {
    const firstReport = reports[reports.length - 1];
    const lastReport = reports[0];
    const scoreDiff = lastReport.averageScore - firstReport.averageScore;
    
    if (scoreDiff > 5) {
      trendAnalysis = `Tendencia positiva con mejora de ${scoreDiff.toFixed(1)}% en la calidad de atención durante ${periodText}.`;
    } else if (scoreDiff < -5) {
      trendAnalysis = `Tendencia negativa con caída de ${Math.abs(scoreDiff).toFixed(1)}% en la calidad de atención durante ${periodText}.`;
    } else {
      trendAnalysis = `Rendimiento estable en la calidad de atención durante ${periodText}.`;
    }
  }

  // Recopilar todos los hallazgos positivos y negativos únicos
  const allPositives = new Set();
  const allNegatives = new Set();
  
  reports.forEach(report => {
    if (report.findings?.positive) {
      report.findings.positive.forEach(finding => allPositives.add(finding));
    }
    if (report.topFindings?.positive) {
      report.topFindings.positive.forEach(finding => allPositives.add(finding));
    }
    if (report.findings?.negative) {
      report.findings.negative.forEach(finding => allNegatives.add(finding));
    }
    if (report.topFindings?.negative) {
      report.topFindings.negative.forEach(finding => allNegatives.add(finding));
    }
  });

  // Generar resumen personalizado
  return `
Durante ${periodText}, se han analizado ${totalCalls} llamadas con un promedio de calidad del ${avgScore}%. 

${trendAnalysis}

${allPositives.size > 0 ? "Destacan como aspectos positivos: " + Array.from(allPositives).slice(0, 3).join(", ") + "." : ""}

${allNegatives.size > 0 ? "Se identifican como áreas de mejora: " + Array.from(allNegatives).slice(0, 3).join(", ") + "." : ""}

Recomendaciones: Enfocarse en mantener los aspectos positivos mientras se trabajan las áreas de oportunidad identificadas.
`.trim();
};

// Función para generar insights diarios
export const generateDailyInsights = (report: any): string[] => {
  if (!report || !report.callCount || report.callCount === 0) {
    return ["No hay datos disponibles para este día."];
  }
  
  const insights = [];
  
  // Insight sobre volumen de llamadas
  if (report.callCount === 1) {
    insights.push(`Se procesó 1 llamada en esta fecha.`);
  } else {
    insights.push(`Se procesaron ${report.callCount} llamadas en esta fecha.`);
  }
  
  // Insight sobre calidad
  if (report.averageScore > 85) {
    insights.push(`Excelente calidad de atención con score promedio de ${report.averageScore}%.`);
  } else if (report.averageScore > 70) {
    insights.push(`Buena calidad de atención con score promedio de ${report.averageScore}%.`);
  } else if (report.averageScore > 50) {
    insights.push(`Calidad de atención aceptable con score promedio de ${report.averageScore}%.`);
  } else {
    insights.push(`Calidad de atención por debajo del estándar con score promedio de ${report.averageScore}%.`);
  }
  
  // Insight sobre agentes destacados
  if (report.agents && report.agents.length > 0) {
    const topAgent = report.agents.sort((a, b) => b.averageScore - a.averageScore)[0];
    insights.push(`Agente destacado: ${topAgent.name} con score ${topAgent.averageScore}%.`);
  }
  
  return insights;
};
