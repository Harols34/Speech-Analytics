
/**
 * Utility functions for mapping numeric scores to text representations
 */

/**
 * Maps a numeric score (0-100) to a descriptive text category
 * @param score Numeric score between 0 and 100
 * @returns String representation of the score category
 */
export function mapScoreToText(score: number): string {
  if (score >= 90) {
    return "Excelente";
  } else if (score >= 80) {
    return "Muy Bueno";
  } else if (score >= 70) {
    return "Bueno";
  } else if (score >= 60) {
    return "Satisfactorio";
  } else if (score >= 50) {
    return "Regular";
  } else if (score >= 40) {
    return "Por Mejorar";
  } else if (score >= 30) {
    return "Deficiente";
  } else if (score >= 20) {
    return "Muy Deficiente";
  } else {
    return "Crítico";
  }
}

/**
 * Maps a numeric score (0-100) to a color code for UI representation
 * @param score Numeric score between 0 and 100
 * @returns CSS color string
 */
export function mapScoreToColor(score: number): string {
  if (score >= 90) {
    return "#22c55e"; // green-500
  } else if (score >= 80) {
    return "#84cc16"; // lime-500
  } else if (score >= 70) {
    return "#a3e635"; // lime-400
  } else if (score >= 60) {
    return "#eab308"; // yellow-500
  } else if (score >= 50) {
    return "#f59e0b"; // amber-500
  } else if (score >= 40) {
    return "#f97316"; // orange-500
  } else if (score >= 30) {
    return "#ef4444"; // red-500
  } else if (score >= 20) {
    return "#dc2626"; // red-600
  } else {
    return "#b91c1c"; // red-700
  }
}
