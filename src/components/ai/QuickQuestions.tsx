
import React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MessageSquare, TrendingUp, BarChart3, Users, Clock } from "lucide-react";

interface QuickQuestionsProps {
  onSelectQuestion: (question: string) => void;
  disabled?: boolean;
}

const quickQuestions = [
  "¿Cuáles son las tendencias de resultados de llamadas este mes?",
  "¿Cuál es el promedio de puntuación de las llamadas?",
  "¿Qué agentes tienen mejor rendimiento?", 
  "¿Cuál es la duración promedio de las llamadas?",
  "¿Cuáles son los principales aspectos positivos identificados?",
  "¿Cuáles son los temas más frecuentes en las llamadas?"
];

export default function QuickQuestions({ onSelectQuestion, disabled = false }: QuickQuestionsProps) {
  return (
    <div>
      <h3 className="text-sm font-medium text-muted-foreground mb-3">Preguntas sugeridas</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
        {quickQuestions.map((question, index) => (
          <Button
            key={index}
            variant="outline"
            size="sm"
            onClick={() => onSelectQuestion(question)}
            disabled={disabled}
            className="text-left justify-start h-auto py-3 px-4 text-xs hover:bg-muted/50 whitespace-normal"
          >
            <span className="text-primary mr-2">📊</span>
            {question}
          </Button>
        ))}
      </div>
    </div>
  );
}
