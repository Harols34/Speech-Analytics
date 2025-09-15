
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

export function useSessionTimeout(timeoutMinutes = 60) {
  const [lastActivity, setLastActivity] = useState<number>(Date.now());
  const [isWarningVisible, setIsWarningVisible] = useState<boolean>(false);
  const navigate = useNavigate();

  // Actualizar la última actividad
  const updateActivity = useCallback(() => {
    setLastActivity(Date.now());
    setIsWarningVisible(false);
  }, []);

  // Renovar la sesión
  const renewSession = useCallback(async () => {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      if (sessionData?.session) {
        // Renovar la sesión
        await supabase.auth.refreshSession();
        updateActivity();
        toast.success("Sesión renovada correctamente", {
          duration: 3000,
        });
      }
    } catch (error) {
      console.error("Error al renovar la sesión:", error);
    }
  }, [updateActivity]);

  // Cerrar sesión
  const logout = useCallback(async () => {
    try {
      await supabase.auth.signOut();
      toast.info("Sesión cerrada por inactividad", {
        duration: 5000,
      });
      navigate("/login");
    } catch (error) {
      console.error("Error al cerrar la sesión:", error);
    }
  }, [navigate]);

  // Efecto para manejar el timeout de la sesión
  useEffect(() => {
    // Convertir minutos a milisegundos
    const timeoutMs = timeoutMinutes * 60 * 1000;
    const warningTimeMs = timeoutMs - (2 * 60 * 1000); // Mostrar advertencia 2 minutos antes

    // Manejar eventos de usuario
    const handleUserActivity = () => {
      updateActivity();
    };

    // Detectar actividad del usuario
    window.addEventListener("mousemove", handleUserActivity);
    window.addEventListener("keydown", handleUserActivity);
    window.addEventListener("click", handleUserActivity);
    window.addEventListener("touchstart", handleUserActivity);
    window.addEventListener("scroll", handleUserActivity);

    // Verificar tiempo inactivo periódicamente
    const checkInactivity = setInterval(() => {
      const now = Date.now();
      const inactiveTime = now - lastActivity;

      // Si ha pasado el tiempo de advertencia, mostrar advertencia
      if (inactiveTime > warningTimeMs && !isWarningVisible) {
        setIsWarningVisible(true);
        toast.warning(
          "Tu sesión está por expirar. ¿Deseas mantenerla activa?",
          {
            duration: 0, // No desaparece automáticamente
            action: {
              label: "Mantener activa",
              onClick: () => renewSession(),
            },
          }
        );
      }

      // Si ha pasado el tiempo de timeout, cerrar sesión
      if (inactiveTime > timeoutMs) {
        logout();
      }
    }, 30000); // Verificar cada 30 segundos

    // Limpiar eventos y temporizadores
    return () => {
      window.removeEventListener("mousemove", handleUserActivity);
      window.removeEventListener("keydown", handleUserActivity);
      window.removeEventListener("click", handleUserActivity);
      window.removeEventListener("touchstart", handleUserActivity);
      window.removeEventListener("scroll", handleUserActivity);
      clearInterval(checkInactivity);
    };
  }, [lastActivity, isWarningVisible, timeoutMinutes, logout, renewSession, updateActivity]);

  return {
    updateActivity,
    renewSession,
    logout,
    isWarningVisible,
  };
}
