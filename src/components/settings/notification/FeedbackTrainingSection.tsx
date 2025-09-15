import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LineChart, UserRound } from "lucide-react";
import { AgentGrouped } from "@/components/settings/notification/types";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
export interface FeedbackTrainingSectionProps {
  groupedAgents: AgentGrouped[];
  loadingReports: boolean;
  onGenerateReport: () => void;
  onChangeDateRange?: (days: number) => void;
  selectedDays?: number;
  hasCalls?: boolean;
}
const FeedbackTrainingSection: React.FC<FeedbackTrainingSectionProps> = ({
  groupedAgents,
  loadingReports,
  onGenerateReport,
  onChangeDateRange,
  selectedDays,
  hasCalls = false
}) => {
  // Top 3 agents based on total calls or score
  const topAgents = hasCalls ? groupedAgents.slice(0, 3) : [];
  return <Card>
      
      
    </Card>;
};
export default FeedbackTrainingSection;