
import { useState, useEffect } from "react";
import { Routes, Route, useNavigate } from "react-router-dom";
import Layout from "@/components/layout/Layout";
import ChatInterface from "@/components/ai/ChatInterface";
import ChatHistory from "@/components/ai/ChatHistory";
import { useAuth } from "@/context/AuthContext";
import { Loader2 } from "lucide-react";

export default function ChatPage() {
  const {
    isAuthenticated,
    loading
  } = useAuth();
  const navigate = useNavigate();
  
  useEffect(() => {
    // Solo redirigir si no está autenticado y ya hemos verificado el estado (loading es false)
    if (!loading && !isAuthenticated) {
      navigate("/login");
    }
  }, [isAuthenticated, loading, navigate]);
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
          <p className="text-muted-foreground">Cargando...</p>
        </div>
      </div>
    );
  }
  
  return (
    <Layout>
      <div className="flex flex-col h-full w-full p-4 sm:p-6">
        <Routes>
          <Route path="/" element={
            <div className="flex flex-col h-full space-y-4 sm:space-y-6">
              <div className="flex-shrink-0">
                <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">Consulta tus Insights de Voz</h2>
                <p className="text-sm sm:text-base text-muted-foreground mt-1 sm:mt-2">
                  Explora tus llamadas y obtén insights avanzados generados por la IA de Convertia.
                </p>
              </div>
              <div className="flex-1 min-h-0">
                <ChatInterface />
              </div>
            </div>
          } />
          <Route path="history" element={<ChatHistory />} />
        </Routes>
      </div>
    </Layout>
  );
}
