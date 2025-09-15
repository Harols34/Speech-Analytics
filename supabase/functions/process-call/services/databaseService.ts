
import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.50.0';

export async function updateCallInDatabase(
  supabase: SupabaseClient,
  callId: string,
  updates: {
    status?: string;
    progress?: number;
    transcription?: string;
    summary?: string;
    sentiment?: string;
    entities?: string[];
    topics?: string[];
  }
) {
  try {
    const { error } = await supabase
      .from('calls')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', callId);

    if (error) {
      console.error('Error updating call in database:', error);
      throw error;
    }

    console.log(`Call ${callId} updated successfully with:`, updates);
  } catch (error) {
    console.error('Database update failed:', error);
    throw error;
  }
}
