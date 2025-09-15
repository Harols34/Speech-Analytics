
import { Card, CardContent } from "@/components/ui/card";
import { MessageSquare, TrendingUp, BarChart3, Users, Clock, Star } from "lucide-react";

interface QuickQuestionsProps {
  onQuestionSelect: (question: string) => void;
  isLoading: boolean;
}

const quickQuestions = [
  {
    id: 1,
    icon: TrendingUp,
    question: "¿Cuáles son las tendencias de resultados de llamadas este mes?",
    category: "Tendencias"
  },
  {
    id: 2,
    icon: BarChart3,
    question: "¿Cuál es el promedio de puntuación de las llamadas?",
    category: "Métricas"
  },
  {
    id: 3,
    icon: Users,
    question: "¿Qué agentes tienen mejor rendimiento?",
    category: "Rendimiento"
  },
  {
    id: 4,
    icon: Clock,
    question: "¿Cuál es la duración promedio de las llamadas?",
    category: "Duración"
  },
  {
    id: 5,
    icon: Star,
    question: "¿Cuáles son los principales aspectos positivos identificados?",
    category: "Feedback"
  },
  {
    id: 6,
    icon: MessageSquare,
    question: "¿Cuáles son los temas más frecuentes en las llamadas?",
    category: "Contenido"
  }
];

export default function QuickQuestions({ onQuestionSelect, isLoading }: QuickQuestionsProps) {
  return (
    <div className="space-y-2">
      <h4 className="text-xs font-medium text-muted-foreground px-1">Preguntas sugeridas</h4>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
        {quickQuestions.map((item) => {
          const IconComponent = item.icon;
          return (
            <Card 
              key={item.id}
              className="hover:bg-accent/50 transition-colors cursor-pointer border-dashed border-muted-foreground/20 bg-background/50"
              onClick={() => !isLoading && onQuestionSelect(item.question)}
            >
              <CardContent className="p-2">
                <div className="flex items-center gap-1.5">
                  <IconComponent className="h-3 w-3 text-primary flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs leading-tight break-words line-clamp-2 text-foreground/80">
                      {item.question}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
