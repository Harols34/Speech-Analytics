
export interface AgentGrouped {
  id: string;
  name: string;
  totalCalls: number;
  averageScore: number;
  datePoints: {
    date: string;
    score: number;
    callCount: number;
  }[];
}

export interface DailyReport {
  date: string;
  callCount: number;
  averageScore: number;
  trend?: "up" | "down" | "stable";
  findings?: {
    positive: string[];
    negative: string[];
  };
  issuesCount?: number;
  issues?: string[];
  agents?: {
    id: string;
    name: string;
    callCount: number;
    averageScore: number;
  }[];
  topFindings?: {
    positive: string[];
    negative: string[];
    opportunities: string[];
  };
  aiSummary?: string;
  dailyInsights?: string[];
}

export interface GlobalAnalysisData {
  aiSummary: string;
  insights: {
    positive: string[];
    negative: string[];
    recommendations: string[];
  };
  trendAnalysis: string;
}
