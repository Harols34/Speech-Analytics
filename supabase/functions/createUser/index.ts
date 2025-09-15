
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Obtener datos del request
    const { email, password, fullName, role, language } = await req.json()
    
    console.log("Creando usuario:", { email, fullName, role, language })
    
    // Validar datos
    if (!email || !password || !fullName || !role) {
      throw new Error('Faltan campos obligatorios: email, password, fullName, role')
    }
    
    // Crear cliente Supabase con la key de servicio para operaciones admin
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    )
    
    // Crear usuario en Auth
    console.log("Creando usuario en Auth...")
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirmar email para desarrollo
      user_metadata: {
        full_name: fullName
      }
    })
    
    if (authError) {
      console.error("Error al crear usuario en Auth:", authError)
      throw authError
    }
    
    console.log("Usuario creado exitosamente en Auth:", authData.user.id)
    
    // Crear perfil para el usuario
    console.log("Creando perfil para el usuario...")
    const { error: profileError } = await supabase
      .from('profiles')
      .upsert({
        id: authData.user.id,
        full_name: fullName,
        role,
        language: language || 'es'
      })
    
    if (profileError) {
      console.error("Error al crear perfil:", profileError)
      
      // Si falla la creación del perfil, intentar eliminar el usuario de Auth
      try {
        await supabase.auth.admin.deleteUser(authData.user.id)
      } catch (e) {
        console.error("Error al eliminar usuario tras fallo de perfil:", e)
      }
      
      throw profileError
    }
    
    console.log("Perfil creado exitosamente")
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Usuario creado exitosamente", 
        userId: authData.user.id 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
    
  } catch (error) {
    console.error("Error en la función createUser:", error)
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})
