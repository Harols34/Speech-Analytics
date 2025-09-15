
import { ChevronDown, ChevronUp } from "lucide-react";
import { Call } from "@/lib/types";

export interface ResultsData {
  name: string;
  value: number;
  color: string;
}

export interface CallVolumeData {
  name: string;
  calls: number;
}

export interface AgentPerformanceData {
  name: string;
  score: number;
  calls: number;
}

export interface IssueTypeData {
  name: string;
  value: number;
}

export interface PerformanceMetric {
  metric: string;
  current: string | number;
  previous: string | number;
  change: number;
}

export const COLORS = [
  "#2563eb", // Blue
  "#dc2626", // Red
  "#16a34a", // Green
  "#ca8a04", // Yellow
  "#9333ea", // Purple
  "#0891b2", // Cyan
  "#c2410c", // Orange
];

export const emptyCallVolumeData: CallVolumeData[] = [
  { name: "Lun", calls: 0 },
  { name: "Mar", calls: 0 },
  { name: "Mié", calls: 0 },
  { name: "Jue", calls: 0 },
  { name: "Vie", calls: 0 },
  { name: "Sáb", calls: 0 },
  { name: "Dom", calls: 0 }
];

export const emptyAgentPerformanceData: AgentPerformanceData[] = [
  { name: "Sin datos", score: 0, calls: 0 }
];

export const emptyIssueTypeData: IssueTypeData[] = [
  { name: "Sin problemas", value: 0 }
];

export const emptyResultsData: ResultsData[] = [
  { name: "Sin resultados", value: 0, color: COLORS[0] }
];

export const prepareResultsData = (calls: any[]) => {
  const results = calls.reduce((acc: Record<string, number>, call) => {
    const result = call.result || "Sin resultado";
    acc[result] = (acc[result] || 0) + 1;
    return acc;
  }, {});

  // Update to include color for each result type
  return Object.entries(results).map(([name, value], index) => ({
    name,
    value,
    color: COLORS[index % COLORS.length] // Use existing COLORS array
  }));
};

export const formatDate = (date: string | Date) => {
  return new Date(date).toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};

export const formatTime = (seconds: number) => {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  return `${minutes}:${remainingSeconds < 10 ? "0" : ""}${remainingSeconds}`;
};

export const formatPercentChange = (current: number, previous: number) => {
  if (previous === 0) return current > 0 ? 100 : 0;
  const percentChange = ((current - previous) / previous) * 100;
  return Math.round(percentChange);
};

export const getChangeIcon = (change: number) => {
  return change > 0 ? ChevronUp : change < 0 ? ChevronDown : null;
};

export const getChangeColor = (change: number) => {
  return change > 0 ? "text-green-500" : change < 0 ? "text-red-500" : "text-gray-500";
};

export const categorizeIssue = (issue: string): string => {
  const lowerIssue = issue.toLowerCase();
  
  if (lowerIssue.includes("precio") || lowerIssue.includes("costo") || lowerIssue.includes("tarifa")) {
    return "Precio";
  } else if (lowerIssue.includes("técnic") || lowerIssue.includes("cobertura") || lowerIssue.includes("servicio")) {
    return "Técnico";
  } else if (lowerIssue.includes("competencia") || lowerIssue.includes("otra compañía")) {
    return "Competencia";
  } else if (lowerIssue.includes("interés") || lowerIssue.includes("no quiere")) {
    return "Falta de interés";
  } else if (lowerIssue.includes("tiempo") || lowerIssue.includes("pensar")) {
    return "Necesita tiempo";
  } else {
    return "Otros";
  }
};

export const generatePerformanceMetrics = (calls: any[], feedback: any[]): PerformanceMetric[] => {
  // Calculate current period vs previous period metrics
  const totalCalls = calls.length;
  const previousTotalCalls = Math.round(totalCalls * (0.8 + Math.random() * 0.4)); // Simulate previous period
  const callsChange = formatPercentChange(totalCalls, previousTotalCalls);
  
  // Sales conversion rate
  const sales = calls.filter(call => call.result === "venta").length;
  const conversionRate = totalCalls > 0 ? Math.round((sales / totalCalls) * 100) : 0;
  const previousConversionRate = Math.round(conversionRate * (0.8 + Math.random() * 0.4));
  const conversionChange = formatPercentChange(conversionRate, previousConversionRate);
  
  // Average call duration
  const totalDuration = calls.reduce((sum, call) => sum + (call.duration || 0), 0);
  const avgDuration = totalCalls > 0 ? Math.round(totalDuration / totalCalls) : 0;
  const previousAvgDuration = Math.round(avgDuration * (0.9 + Math.random() * 0.2));
  const durationChange = formatPercentChange(avgDuration, previousAvgDuration);
  
  // Average score
  const totalScore = feedback.reduce((sum, fb) => sum + (fb.score || 0), 0);
  const avgScore = feedback.length > 0 ? Math.round(totalScore / feedback.length) : 0;
  const previousAvgScore = Math.round(avgScore * (0.9 + Math.random() * 0.2));
  const scoreChange = formatPercentChange(avgScore, previousAvgScore);
  
  // Response time (simulated)
  const avgResponseTime = Math.round(2 + Math.random() * 3);
  const previousResponseTime = Math.round(avgResponseTime * (1.1 + Math.random() * 0.3));
  const responseTimeChange = formatPercentChange(previousResponseTime, avgResponseTime) * -1; // Inverted as lower is better
  
  return [
    {
      metric: "Total de Llamadas",
      current: totalCalls,
      previous: previousTotalCalls,
      change: callsChange
    },
    {
      metric: "Tasa de Conversión",
      current: `${conversionRate}%`,
      previous: `${previousConversionRate}%`,
      change: conversionChange
    },
    {
      metric: "Duración Promedio",
      current: formatTime(avgDuration),
      previous: formatTime(previousAvgDuration),
      change: durationChange
    },
    {
      metric: "Puntuación Promedio",
      current: `${avgScore}%`,
      previous: `${previousAvgScore}%`,
      change: scoreChange
    },
    {
      metric: "Tiempo de Respuesta",
      current: `${avgResponseTime} min`,
      previous: `${previousResponseTime} min`,
      change: responseTimeChange
    }
  ];
};
