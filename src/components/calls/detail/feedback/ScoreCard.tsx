
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trophy } from "lucide-react";

interface ScoreCardProps {
  score: number;
}

export default function ScoreCard({ score }: ScoreCardProps) {
  // Ensure score is between 0 and 100, defaulting to 0 if invalid
  // We handle both raw score (0-1) and percentage score (0-100)
  let normalizedScore = 0;
  
  if (!isNaN(score) && score !== null) {
    // Check if score is already a percentage (assume values > 1 are percentages)
    if (score > 1) {
      normalizedScore = Math.max(0, Math.min(100, score));
    } else {
      // Convert from decimal to percentage
      normalizedScore = Math.max(0, Math.min(1, score)) * 100;
    }
  }
  
  const percentScore = Math.round(normalizedScore);
  
  // Determine score category and colors
  let category: string;
  let bgColor: string;
  let textColor: string;
  
  if (percentScore >= 90) {
    category = "Excelente";
    bgColor = "bg-green-100 dark:bg-green-900/30";
    textColor = "text-green-800 dark:text-green-300";
  } else if (percentScore >= 75) {
    category = "Bueno";
    bgColor = "bg-blue-100 dark:bg-blue-900/30";
    textColor = "text-blue-800 dark:text-blue-300";
  } else if (percentScore >= 60) {
    category = "Regular";
    bgColor = "bg-yellow-100 dark:bg-yellow-900/30";
    textColor = "text-yellow-800 dark:text-yellow-300";
  } else {
    category = "Necesita mejorar";
    bgColor = "bg-red-100 dark:bg-red-900/30";
    textColor = "text-red-800 dark:text-red-300";
  }
  
  console.log("Rendering score card with score:", percentScore, "category:", category);
  
  return (
    <Card className={`${bgColor}`}>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center gap-2">
          <Trophy className="h-5 w-5" />
          <span>Puntuación</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col items-center justify-center">
          <div className={`text-4xl font-bold ${textColor}`}>{percentScore}</div>
          <div className={`text-sm font-medium mt-1 ${textColor}`}>{category}</div>
        </div>
      </CardContent>
    </Card>
  );
}
