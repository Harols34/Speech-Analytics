import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";

export default function ProfileSection() {
  const { user, session, loading: loadingUser } = useAuth();
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  const [profileData, setProfileData] = useState({
    fullName: "",
    email: "",
    biography: ""
  });

  // Cargar datos del perfil
  useEffect(() => {
    if (user && session) {
      console.log("Loading profile data for user:", user.id);
      
      // Actualizar datos básicos - usar el correo electrónico de la sesión si está disponible
      setProfileData(prev => ({
        ...prev,
        fullName: user.full_name || "",
        email: session?.user?.email || user.email || "",
        biography: "" // Se cargará desde la base de datos
      }));

      // Cargar biografía desde la base de datos
      const fetchBiography = async () => {
        if (!user?.id) return;
        
        try {
          console.log("Fetching biography for user:", user.id);
          const { data, error } = await supabase
            .from('profiles')
            .select('biography')
            .eq('id', user.id)
            .single();
          
          if (error) {
            console.error("Error fetching biography:", error);
            if (error.code !== 'PGRST116') { // No encontrado es OK
              throw error;
            }
          }
          
          if (data) {
            console.log("Biography loaded:", data.biography);
            setProfileData(prev => ({
              ...prev,
              biography: data.biography || ""
            }));
          }
        } catch (error) {
          console.error("Error loading biography:", error);
        }
      };
      
      fetchBiography();
    }
  }, [user, session]);

  // Función para guardar perfil
  const saveProfile = async () => {
    if (!user?.id || !session?.user?.id) {
      toast.error("No hay sesión activa. Por favor, inicia sesión nuevamente.");
      return;
    }
    
    console.log("Saving profile for user:", user.id);
    
    setIsSavingProfile(true);
    try {
      // Actualizar perfil en la tabla profiles
      const { error } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          full_name: profileData.fullName,
          biography: profileData.biography,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'id'
        });
      
      if (error) {
        console.error("Error saving profile:", error);
        throw error;
      }
      
      console.log("Profile saved successfully");
      toast.success("Perfil actualizado correctamente");
    } catch (error: any) {
      console.error("Error al guardar el perfil:", error);
      toast.error("Error al guardar el perfil", {
        description: error.message || "Intente nuevamente más tarde"
      });
    } finally {
      setIsSavingProfile(false);
    }
  };

  if (loadingUser) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Cargando perfil...</CardTitle>
        </CardHeader>
        <CardContent className="flex justify-center p-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Configuración de Perfil</CardTitle>
        <CardDescription>
          Actualiza tu información de perfil
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">Correo electrónico</Label>
          <Input 
            id="email" 
            type="email" 
            value={profileData.email} 
            disabled 
          />
          <p className="text-xs text-muted-foreground mt-1">
            Tu correo electrónico: {session?.user?.email || user?.email || "No disponible"}
          </p>
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="fullName">Nombre completo</Label>
          <Input 
            id="fullName" 
            value={profileData.fullName} 
            onChange={(e) => setProfileData(prev => ({ ...prev, fullName: e.target.value }))} 
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="biography">Biografía</Label>
          <Textarea 
            id="biography" 
            value={profileData.biography} 
            onChange={(e) => setProfileData(prev => ({ ...prev, biography: e.target.value }))}
            placeholder="Cuéntanos sobre ti..." 
            rows={4}
          />
        </div>
        
        <Button 
          onClick={saveProfile} 
          disabled={isSavingProfile}
        >
          {isSavingProfile ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Guardando...
            </>
          ) : "Guardar cambios"}
        </Button>
      </CardContent>
    </Card>
  );
}
