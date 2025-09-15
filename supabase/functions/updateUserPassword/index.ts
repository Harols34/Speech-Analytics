
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.8.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight request
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: corsHeaders,
      status: 204,
    });
  }

  try {
    const { userId, password, userData } = await req.json();
    
    // Create a Supabase client with the service role key
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    
    if (!supabaseUrl || !supabaseKey) {
      console.error("Missing Supabase URL or Service Role Key");
      return new Response(JSON.stringify({ error: "Server configuration error" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      });
    }
    
    const supabase = createClient(supabaseUrl, supabaseKey);
    console.log("Supabase client created");

    // Check if profile exists for this user
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
      
    if (profileError && profileError.code === 'PGRST116') {
      console.log(`No profile found for user ${userId}, creating one...`);
      // Create profile if it doesn't exist
      if (userData) {
        const { error: insertError } = await supabase
          .from('profiles')
          .insert({
            id: userId,
            full_name: userData.name,
            role: userData.role || 'agent',
            language: userData.language || 'es',
            biography: userData.biography || null
          });
        
        if (insertError) {
          console.error("Error creating profile:", insertError);
          return new Response(JSON.stringify({ error: "Failed to create user profile", details: insertError.message }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 500,
          });
        }
        console.log("Profile created successfully");
      }
    } else if (userData) {
      // Update existing profile
      console.log(`Updating profile for user: ${userId}`);
      const { error: updateProfileError } = await supabase
        .from('profiles')
        .update({
          full_name: userData.name,
          role: userData.role,
          language: userData.language || 'es',
          biography: userData.biography
        })
        .eq('id', userId);
        
      if (updateProfileError) {
        console.error("Error updating profile:", updateProfileError);
        return new Response(JSON.stringify({ error: "Failed to update user profile", details: updateProfileError.message }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 500,
        });
      }
      console.log("Profile updated successfully");
    }

    // Update user password if provided
    if (password) {
      console.log(`Updating password for user: ${userId}`);
      const { data, error } = await supabase.auth.admin.updateUserById(
        userId,
        { password: password }
      );

      if (error) {
        console.error("Error updating password:", error);
        return new Response(JSON.stringify({ error: "Failed to update password", details: error.message }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 500,
        });
      }
      console.log("Password updated successfully");
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("Error:", error.message);
    console.error("Error stack:", error.stack);
    return new Response(JSON.stringify({ error: "Server error", details: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
