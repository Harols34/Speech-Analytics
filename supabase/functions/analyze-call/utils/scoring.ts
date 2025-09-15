
// Scoring utilities

// Function to calculate score from evaluations (0-100)
export const scoreFromEvaluations = (evaluations: any[]) => {
  if (!evaluations || evaluations.length === 0) return 0;
  const cumpleCount = evaluations.filter(e => e.evaluation === "cumple").length;
  return Math.round((cumpleCount / evaluations.length) * 100);
};

// Function to map score to text representation
export const mapScoreToText = (score: number) => {
  if (score >= 90) return "Excelente";
  if (score >= 80) return "Muy Bueno";
  if (score >= 70) return "Bueno";
  if (score >= 60) return "Regular";
  if (score >= 50) return "Necesita Mejorar";
  return "Crítico";
};
