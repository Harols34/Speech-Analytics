
/**
 * Validates request parameters for call processing
 */
export function validateRequest(data: any) {
  const { callId, audioUrl, onlyFeedback = false, checkDuplicate = false, title = null } = data;
  
  if (!callId) {
    throw new Error("ID de llamada no proporcionado");
  }
  
  if (!onlyFeedback && !audioUrl) {
    throw new Error("URL de audio no proporcionada");
  }
  
  return { callId, audioUrl, onlyFeedback, checkDuplicate, title };
}

/**
 * Validates if a call with the same title already exists
 */
export async function validateDuplicateTitle(supabase: any, title: string) {
  if (!title) return { isDuplicate: false };
  
  const { data: existingCalls, error } = await supabase
    .from('calls')
    .select('id')
    .eq('title', title)
    .limit(1);
    
  if (error) {
    console.error("Error al verificar llamadas existentes:", error);
    return { isDuplicate: false, error };
  }
  
  return { 
    isDuplicate: existingCalls && existingCalls.length > 0,
    existingCallId: existingCalls && existingCalls.length > 0 ? existingCalls[0].id : null
  };
}
