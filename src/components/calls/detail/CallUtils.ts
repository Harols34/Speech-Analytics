
/**
 * Validates that a call status is one of the expected values
 */
export function validateCallStatus(status: string | null): "pending" | "transcribing" | "analyzing" | "complete" | "error" {
  const validStatuses = ["pending", "transcribing", "analyzing", "complete", "error"];
  
  if (!status || !validStatuses.includes(status)) {
    return "pending";
  }
  
  return status as "pending" | "transcribing" | "analyzing" | "complete" | "error";
}

/**
 * Formats a date string to localized format
 */
export function formatDateToLocale(dateString: string): string {
  if (!dateString) return "N/A";
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString() + " " + date.toLocaleTimeString();
  } catch (error) {
    return "Invalid date";
  }
}

/**
 * Formats duration in seconds to mm:ss format
 */
export function formatDuration(seconds: number): string {
  if (!seconds || isNaN(seconds)) return "00:00";
  
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  
  return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
}
