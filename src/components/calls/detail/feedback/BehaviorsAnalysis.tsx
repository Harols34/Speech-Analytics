
import React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { BehaviorAnalysis } from "@/lib/types";
import { CheckCircle2, XCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface BehaviorsAnalysisProps {
  behaviors: BehaviorAnalysis[];
  isLoading?: boolean;
  onRefresh?: () => void;
}

export default function BehaviorsAnalysis({ 
  behaviors, 
  isLoading, 
  onRefresh 
}: BehaviorsAnalysisProps) {
  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-6">
          <div className="flex flex-col items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-4"></div>
            <p className="text-center text-gray-500">Generando análisis de comportamientos...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!behaviors || behaviors.length === 0) {
    return (
      <Card>
        <CardContent className="py-6">
          <p className="text-center text-gray-500 mb-4">No hay análisis de comportamientos disponible para esta llamada.</p>
          {onRefresh && (
            <div className="flex justify-center">
              <Button 
                onClick={onRefresh}
                className="px-4 py-2 bg-primary text-white rounded hover:bg-primary/90 transition-colors"
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Generar análisis
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {behaviors.map((behavior, index) => (
        <Card key={index}>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">{behavior.name}</CardTitle>
              {behavior.evaluation === "cumple" ? (
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                  <CheckCircle2 className="w-4 h-4 mr-1" /> Cumple
                </span>
              ) : (
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                  <XCircle className="w-4 h-4 mr-1" /> No cumple
                </span>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm">{behavior.comments}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
