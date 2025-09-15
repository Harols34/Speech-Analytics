
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
    console.log("Starting getAllUserEmails function...");
    
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

    // Get all users from the auth.users table
    console.log("Fetching auth users...");
    const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();

    if (authError) {
      console.error("Error fetching auth users:", authError);
      return new Response(JSON.stringify({ error: "Failed to fetch users", details: authError.message }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      });
    }

    console.log(`Found ${authUsers.users.length} auth users`);
    
    // Get all profiles to retrieve roles
    console.log("Fetching profiles for role information...");
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, role');
    
    if (profilesError) {
      console.error("Error fetching profiles:", profilesError);
      console.log("Continuing with auth data only");
    }
    
    // Create a map of user IDs to roles from profiles
    const userRolesMap = {};
    if (profiles && profiles.length > 0) {
      profiles.forEach((profile) => {
        userRolesMap[profile.id] = profile.role;
        console.log(`User ID: ${profile.id}, Role: ${profile.role}`);
      });
    }
    
    // Create a map of user IDs to emails and roles
    const userEmailMap = {};
    const userDataMap = {};
    
    authUsers.users.forEach((user) => {
      userEmailMap[user.id] = user.email;
      
      // Get role from profiles if available, otherwise set to default "agent"
      const role = userRolesMap[user.id] || "agent";
      
      userDataMap[user.id] = {
        email: user.email,
        role: role,
        createdAt: user.created_at
      };
      
      console.log(`User ID: ${user.id}, Email: ${user.email}, Role: ${role}`);
    });

    // Return all users data with role information
    return new Response(JSON.stringify({ 
      userEmails: userEmailMap,
      userData: userDataMap,
      totalUsers: authUsers.users.length,
      usersData: authUsers.users.map(u => ({ 
        id: u.id, 
        email: u.email,
        role: userRolesMap[u.id] || "agent",
        createdAt: u.created_at
      }))
    }), {
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
