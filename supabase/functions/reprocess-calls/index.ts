
// Edge function for batch reprocessing all calls

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7';
import "https://deno.land/x/xhr@0.1.0/mod.ts";

// CORS headers for browser requests
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};

// Setting up Supabase client
const supabaseUrl = Deno.env.get("SUPABASE_URL") as string;
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") as string;
const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * Reprocesses all calls in batches using the analyze-call function
 */
async function reprocessAllCalls() {
  try {
    console.log("Starting batch reprocessing of all calls");
    
    // Get all calls that have a transcription
    const { data: calls, error: callsError } = await supabase
      .from('calls')
      .select('id, transcription')
      .not('transcription', 'is', null)
      .order('date', { ascending: false });
    
    if (callsError) {
      console.error(`Error fetching calls: ${callsError.message}`);
      throw callsError;
    }
    
    console.log(`Found ${calls.length} calls to reprocess`);
    
    // Process in batches to avoid overloading
    const batchSize = 3;
    const results = {
      total: calls.length,
      processed: 0,
      success: 0,
      failed: 0,
      details: [] as any[]
    };
    
    for (let i = 0; i < calls.length; i += batchSize) {
      const batch = calls.slice(i, i + batchSize);
      
      console.log(`Processing batch ${Math.floor(i/batchSize) + 1} of ${Math.ceil(calls.length/batchSize)}`);
      
      // Process each call in the batch
      await Promise.all(batch.map(async (call) => {
        try {
          console.log(`Reprocessing call ${call.id}`);
          
          // Call the analyze-call function for each call
          const { data, error } = await supabase.functions.invoke('analyze-call', {
            body: { callId: call.id }
          });
          
          if (error) {
            console.error(`Error calling analyze-call for ${call.id}: ${error.message}`);
            results.failed++;
            results.details.push({
              id: call.id,
              success: false,
              error: error.message
            });
            return;
          }
          
          console.log(`Successfully reprocessed call ${call.id}`);
          results.success++;
          results.details.push({
            id: call.id,
            success: true
          });
        } catch (error) {
          console.error(`Error reprocessing call ${call.id}: ${error.message}`);
          results.failed++;
          results.details.push({
            id: call.id,
            success: false,
            error: error.message
          });
        } finally {
          results.processed++;
        }
      }));
      
      // Wait a bit between batches to avoid rate limits
      await new Promise(resolve => setTimeout(resolve, 3000));
    }
    
    console.log("Batch reprocessing completed:", results);
    
    return {
      success: true,
      message: `Reprocessing complete. Processed ${results.processed} calls. ${results.success} successful, ${results.failed} failed.`,
      results
    };
  } catch (error) {
    console.error(`Error in reprocessAllCalls: ${error.message}`);
    return {
      success: false,
      error: error.message
    };
  }
}

// Main server handler
Deno.serve(async (req) => {
  // Handle CORS preflight request
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: corsHeaders
    });
  }

  // Only accept POST requests
  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      {
        status: 405,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      }
    );
  }

  try {
    const result = await reprocessAllCalls();
    
    return new Response(
      JSON.stringify(result),
      {
        status: result.success ? 200 : 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      }
    );
  } catch (error) {
    console.error(`Error in reprocess-calls function: ${error}`);
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || "Unknown error"
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      }
    );
  }
});
