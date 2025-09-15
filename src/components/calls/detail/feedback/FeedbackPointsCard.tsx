
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2, AlertTriangle, LightbulbIcon } from "lucide-react";

interface FeedbackPointsCardProps {
  title: string;
  points: string[];
}

export default function FeedbackPointsCard({ title, points }: FeedbackPointsCardProps) {
  // Choose icon based on title
  let Icon = CheckCircle2;
  let iconColor = "text-green-600 dark:text-green-400";
  let cardBg = "bg-green-50 dark:bg-green-900/10";
  
  if (title.toLowerCase().includes("negativ")) {
    Icon = AlertTriangle;
    iconColor = "text-red-600 dark:text-red-400";
    cardBg = "bg-red-50 dark:bg-red-900/10";
  } else if (title.toLowerCase().includes("oportunidades") || title.toLowerCase().includes("mejora")) {
    Icon = LightbulbIcon;
    iconColor = "text-amber-600 dark:text-amber-400";
    cardBg = "bg-amber-50 dark:bg-amber-900/10";
  }
  
  // Ensure points is always an array and filter out empty strings
  const displayPoints = Array.isArray(points) 
    ? points.filter(point => point && point.trim() !== "") 
    : [];
    
  // Log data for debugging
  console.log(`FeedbackPointsCard "${title}":`, displayPoints);
  
  // If no valid points after filtering, show a default message
  const finalPoints = displayPoints.length > 0 
    ? displayPoints 
    : ["No hay información disponible"];
  
  return (
    <Card className={cardBg}>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center gap-2">
          <Icon className={`h-5 w-5 ${iconColor}`} />
          <span>{title}</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="space-y-2 text-sm">
          {finalPoints.map((point, index) => (
            <li key={index} className="flex items-start gap-2">
              <span className="text-xs bg-white dark:bg-gray-800 rounded-full h-5 w-5 flex items-center justify-center border mt-0.5">
                {index + 1}
              </span>
              <span>{point}</span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
