import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AreaChart } from "lucide-react";
import { DailyReport } from "@/components/settings/notification/types";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { generateGlobalAnalysis } from "@/utils/feedbackGenerator";

export interface GlobalAnalysisSectionProps {
  reports: DailyReport[];
  loadingReports: boolean;
  onViewDetailedAnalysis: () => void;
  onChangeDateRange: (days: number) => void;
  selectedDays: number;
  isDropdown: boolean;
  hasCalls?: boolean;
}

const GlobalAnalysisSection: React.FC<GlobalAnalysisSectionProps> = ({
  reports,
  loadingReports,
  onViewDetailedAnalysis,
  onChangeDateRange,
  selectedDays,
  isDropdown,
  hasCalls = false
}) => {
  // Calculate global metrics from reports
  const calculateMetrics = () => {
    if (!reports || reports.length === 0 || !hasCalls) {
      return {
        totalCalls: 0,
        avgScore: 0
      };
    }
    const totalCalls = reports.reduce((sum, report) => sum + (report.callCount || 0), 0);
    const weightedScoreSum = reports.reduce((sum, report) => sum + (report.averageScore || 0) * (report.callCount || 0), 0);
    const avgScore = totalCalls > 0 ? Math.round(weightedScoreSum / totalCalls) : 0;
    return {
      totalCalls,
      avgScore
    };
  };
  const metrics = calculateMetrics();

  // Get consolidated AI feedback
  const getAIFeedback = () => {
    if (!reports || reports.length === 0 || !hasCalls || metrics.totalCalls === 0) {
      return "No hay suficientes datos para generar un análisis en este período.";
    }
    return generateGlobalAnalysis(reports, selectedDays);
  };
  const aiFeedback = getAIFeedback();

  // Date range options
  const dateRangeOptions = [{
    value: "7",
    label: "7 días"
  }, {
    value: "15",
    label: "15 días"
  }, {
    value: "30",
    label: "30 días"
  }, {
    value: "90",
    label: "90 días"
  }];
  return <Card>
      <CardHeader className="flex flex-row items-start justify-between pb-2">
        <div>
          <CardTitle className="text-xl">Análisis Global</CardTitle>
          <CardDescription>Insights consolidados del período</CardDescription>
        </div>
        <div className="flex space-x-2">
          {!isDropdown && <Select value={selectedDays.toString()} onValueChange={value => onChangeDateRange(parseInt(value))}>
              <SelectTrigger className="w-[120px]">
                <SelectValue placeholder="7 días" />
              </SelectTrigger>
              <SelectContent>
                {dateRangeOptions.map(option => <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>)}
              </SelectContent>
            </Select>}
          
        </div>
      </CardHeader>
      <CardContent>
        {loadingReports ? <div className="space-y-6">
            <Skeleton className="h-28 w-full" />
            <Skeleton className="h-20 w-full" />
          </div> : hasCalls && metrics.totalCalls > 0 ? <div className="space-y-6">
            <div className="p-4 bg-muted rounded-lg border border-border">
              <h3 className="text-sm font-medium mb-2">Análisis consolidado ({selectedDays} días)</h3>
              <div className="prose prose-sm">
                <p className="whitespace-pre-line text-sm">{aiFeedback}</p>
              </div>
            </div>

            {reports.length > 0 && <div className="grid grid-cols-1 gap-4 mt-4">
                <div className="p-4 bg-card rounded-lg border shadow-sm">
                  <div className="flex justify-between items-center mb-2">
                    <h4 className="text-sm font-medium">Aspectos destacados del período</h4>
                    <span className="text-xs font-medium px-2 py-1 bg-primary/20 rounded-full">
                      {selectedDays} días
                    </span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <h5 className="text-xs font-medium mb-2 flex items-center">
                        <span className="h-2 w-2 rounded-full bg-green-500 mr-2"></span>
                        Fortalezas
                      </h5>
                      <ul className="text-sm space-y-1 list-inside list-disc">
                        {reports[0]?.topFindings?.positive?.slice(0, 3).map((finding, idx) => <li key={idx}>{finding}</li>)}
                      </ul>
                    </div>
                    <div>
                      <h5 className="text-xs font-medium mb-2 flex items-center">
                        <span className="h-2 w-2 rounded-full bg-red-500 mr-2"></span>
                        Oportunidades
                      </h5>
                      <ul className="text-sm space-y-1 list-inside list-disc">
                        {reports[0]?.topFindings?.negative?.slice(0, 3).map((finding, idx) => <li key={idx}>{finding}</li>)}
                      </ul>
                    </div>
                  </div>
                </div>
              </div>}
          </div> : <div className="flex flex-col items-center justify-center py-8 text-center space-y-4">
            <p className="text-muted-foreground">No hay datos suficientes para mostrar un análisis global.</p>
            <p className="text-sm">Sube grabaciones de llamadas para comenzar a ver análisis aquí.</p>
            <Button variant="outline" size="sm" onClick={onViewDetailedAnalysis}>
              Ver Panel de Análisis
            </Button>
          </div>}
      </CardContent>
    </Card>;
};
export default GlobalAnalysisSection;
