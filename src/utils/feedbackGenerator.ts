
// Local utility to generate feedback for daily and global reports

// Function to generate insights for daily reports
export const generateDailyInsights = (report: any): string[] => {
  if (!report || !report.callCount || report.callCount === 0) {
    return ["No hay datos disponibles para este día."];
  }
  
  const insights = [];
  
  // Insight about call volume with more variety
  if (report.callCount === 1) {
    insights.push(`Se procesó 1 llamada en esta fecha.`);
  } else if (report.callCount <= 3) {
    insights.push(`Se procesaron ${report.callCount} llamadas en esta fecha (volumen bajo).`);
  } else if (report.callCount <= 7) {
    insights.push(`Se procesaron ${report.callCount} llamadas en esta fecha (volumen medio).`);
  } else {
    insights.push(`Se procesaron ${report.callCount} llamadas en esta fecha (volumen alto).`);
  }
  
  // Insight about quality with more nuanced messages
  if (report.averageScore > 90) {
    insights.push(`Desempeño excepcional con score promedio de ${report.averageScore}%.`);
  } else if (report.averageScore > 85) {
    insights.push(`Excelente calidad de atención con score promedio de ${report.averageScore}%.`);
  } else if (report.averageScore > 75) {
    insights.push(`Muy buena calidad de atención con score promedio de ${report.averageScore}%.`);
  } else if (report.averageScore > 70) {
    insights.push(`Buena calidad de atención con score promedio de ${report.averageScore}%.`);
  } else if (report.averageScore > 60) {
    insights.push(`Calidad de atención aceptable con score promedio de ${report.averageScore}%.`);
  } else if (report.averageScore > 50) {
    insights.push(`Calidad de atención por debajo del promedio: ${report.averageScore}%.`);
  } else if (report.averageScore > 0) {
    insights.push(`Calidad de atención por debajo del estándar con score promedio de ${report.averageScore}%.`);
  } else {
    insights.push(`No se ha calculado un score para estas llamadas.`);
  }
  
  // Insight about agents performance
  if (report.agents && report.agents.length > 0) {
    // Sort agents by score
    const sortedAgents = [...report.agents].sort((a, b) => b.averageScore - a.averageScore);
    
    if (sortedAgents.length > 1) {
      const topAgent = sortedAgents[0];
      const bottomAgent = sortedAgents[sortedAgents.length - 1];
      const scoreDiff = topAgent.averageScore - bottomAgent.averageScore;
      
      if (scoreDiff > 20) {
        insights.push(`Gran variación en desempeño de agentes: ${topAgent.name} (${topAgent.averageScore}%) vs ${bottomAgent.name} (${bottomAgent.averageScore}%).`);
      } else if (sortedAgents.length >= 3) {
        insights.push(`${sortedAgents.length} agentes participaron en las llamadas, destacando ${topAgent.name} con ${topAgent.averageScore}%.`);
      } else {
        insights.push(`Agente destacado: ${topAgent.name} con score ${topAgent.averageScore}%.`);
      }
    } else {
      const agent = sortedAgents[0];
      insights.push(`Agente único en estas llamadas: ${agent.name} con score ${agent.averageScore}%.`);
    }
  }
  
  // Add time-based insights if date is available
  const currentDate = new Date();
  try {
    const reportDate = new Date(report.date);
    const daysDiff = Math.round((currentDate.getTime() - reportDate.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysDiff === 0) {
      insights.push("Estas son llamadas de hoy, evaluación en tiempo real.");
    } else if (daysDiff === 1) {
      insights.push("Estas son llamadas de ayer, permite comparar con tendencias recientes.");
    } else if (daysDiff <= 3) {
      insights.push("Datos recientes útiles para ajustes inmediatos en las estrategias.");
    }
  } catch (e) {
    // Silently skip if date parsing fails
  }
  
  return insights;
};

// Function to generate global analysis
export const generateGlobalAnalysis = (reports: any[], timeRange: number): string => {
  if (!reports || reports.length === 0) return "";
  
  const totalCalls = reports.reduce((sum, report) => sum + (report.callCount || 0), 0);
  const reportsWithScore = reports.filter(r => typeof r.averageScore === 'number' && r.averageScore > 0);
  const avgScore = reportsWithScore.length > 0 ? 
    Math.round(reportsWithScore.reduce((sum, report) => sum + (report.averageScore || 0), 0) / reportsWithScore.length) : 
    0;
  
  // Determine time period for the message
  let periodText = "";
  switch (timeRange) {
    case 7: periodText = "la última semana"; break;
    case 15: periodText = "los últimos 15 días"; break;
    case 30: periodText = "el último mes"; break;
    case 90: periodText = "los últimos 3 meses"; break;
    default: periodText = "el período seleccionado";
  }

  // Analyze trends
  let trendAnalysis = "";
  if (reports.length > 1) {
    const firstReport = reports[reports.length - 1];
    const lastReport = reports[0];
    
    // Only calculate if both have valid scores
    if (typeof firstReport.averageScore === 'number' && 
        typeof lastReport.averageScore === 'number' && 
        firstReport.averageScore > 0 && 
        lastReport.averageScore > 0) {
      
      const scoreDiff = lastReport.averageScore - firstReport.averageScore;
      
      if (scoreDiff > 10) {
        trendAnalysis = `Se observa una notable mejora del ${scoreDiff.toFixed(1)}% en la calidad de atención durante ${periodText}.`;
      } else if (scoreDiff > 5) {
        trendAnalysis = `Tendencia positiva con mejora de ${scoreDiff.toFixed(1)}% en la calidad de atención durante ${periodText}.`;
      } else if (scoreDiff < -10) {
        trendAnalysis = `Se identifica una preocupante caída del ${Math.abs(scoreDiff).toFixed(1)}% en la calidad de atención durante ${periodText}.`;
      } else if (scoreDiff < -5) {
        trendAnalysis = `Tendencia negativa con caída de ${Math.abs(scoreDiff).toFixed(1)}% en la calidad de atención durante ${periodText}.`;
      } else {
        trendAnalysis = `Rendimiento estable en la calidad de atención durante ${periodText}, con variación mínima de ${Math.abs(scoreDiff).toFixed(1)}%.`;
      }
    } else {
      trendAnalysis = `No hay datos de score suficientes para comparar tendencias en ${periodText}.`;
    }
  } else {
    trendAnalysis = `Período de análisis insuficiente para determinar tendencias.`;
  }

  // Collect all unique positive and negative findings
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

  // Get call volume analysis
  let volumeAnalysis = "";
  if (totalCalls === 0) {
    volumeAnalysis = "No se han registrado llamadas en este período.";
  } else if (totalCalls < 5) {
    volumeAnalysis = `Se ha registrado un volumen bajo de ${totalCalls} llamadas en ${periodText}.`;
  } else if (totalCalls < 20) {
    volumeAnalysis = `Se ha registrado un volumen moderado de ${totalCalls} llamadas en ${periodText}.`;
  } else {
    volumeAnalysis = `Se ha procesado un volumen significativo de ${totalCalls} llamadas en ${periodText}.`;
  }

  // Build more detailed recommendations based on findings
  let recommendations = "";
  if (allPositives.size > 0 && allNegatives.size > 0) {
    const positivePoints = Array.from(allPositives).slice(0, 2);
    const negativePoints = Array.from(allNegatives).slice(0, 2);
    
    recommendations = `
Recomendaciones: 
1. Mantener las fortalezas identificadas, especialmente en ${positivePoints[0]}.
2. Priorizar la mejora en ${negativePoints[0]}.
3. Implementar capacitación específica para abordar ${negativePoints[1] || negativePoints[0]}.
4. Desarrollar un plan de seguimiento para mantener la consistencia.`;
  } else {
    recommendations = "\nRecomendaciones: Enfocarse en mantener los aspectos positivos mientras se trabajan las áreas de oportunidad identificadas.";
  }

  // Generate personalized summary
  return `
${volumeAnalysis}${avgScore > 0 ? ` La calidad promedio de atención es del ${avgScore}%.` : ''} 

${trendAnalysis}

${allPositives.size > 0 ? "Destacan como aspectos positivos: " + Array.from(allPositives).slice(0, 3).join(", ") + "." : ""}

${allNegatives.size > 0 ? "Se identifican como áreas de mejora: " + Array.from(allNegatives).slice(0, 3).join(", ") + "." : ""}
${recommendations}
`.trim();
};

