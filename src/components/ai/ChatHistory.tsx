import React, { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Loader2, Search, Trash2, Clock, MessagesSquare } from "lucide-react";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { ChatHistoryItem } from "@/lib/types";

export default function ChatHistory() {
  const [history, setHistory] = useState<ChatHistoryItem[]>([]);
  const [filteredHistory, setFilteredHistory] = useState<ChatHistoryItem[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    fetchChatHistory();
  }, []);

  useEffect(() => {
    if (searchTerm) {
      const filtered = history.filter(
        (item) =>
          item.query.toLowerCase().includes(searchTerm.toLowerCase()) ||
          item.response.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredHistory(filtered);
    } else {
      setFilteredHistory(history);
    }
  }, [searchTerm, history]);

  const fetchChatHistory = async () => {
    try {
      setIsLoading(true);
      
      // Calcular fecha de hace 15 días
      const fifteenDaysAgo = new Date();
      fifteenDaysAgo.setDate(fifteenDaysAgo.getDate() - 15);

      // Usar la tabla chat_messages para el chat global
      const { data, error } = await supabase
        .from("chat_messages")
        .select("*")
        .eq("user_id", user?.id)
        .gte("timestamp", fifteenDaysAgo.toISOString())
        .order("timestamp", { ascending: false });

      if (error) {
        throw error;
      }

      // Transform the data to match ChatHistoryItem interface
      if (data) {
        // Group messages by conversation
        const conversations: ChatHistoryItem[] = [];
        
        // Process the messages to create conversation items
        data.forEach(message => {
          if (message.role === "user") {
            // For each user message, find the corresponding assistant response
            const assistantResponse = data.find(
              resp => resp.role === "assistant" && 
                     resp.timestamp > message.timestamp &&
                     Math.abs(new Date(resp.timestamp).getTime() - new Date(message.timestamp).getTime()) < 60000 // Within 1 minute
            );
            
            if (assistantResponse) {
              conversations.push({
                id: message.id,
                query: message.content,
                response: assistantResponse.content,
                created_at: message.timestamp,
                user_id: message.user_id || ""
              });
            }
          }
        });
        
        setHistory(conversations);
        setFilteredHistory(conversations);
      }
    } catch (error) {
      console.error("Error fetching chat history:", error);
      toast.error("Error al cargar el historial de chat");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      // Delete from chat_messages instead of chat_history
      const { error } = await supabase
        .from("chat_messages")
        .delete()
        .eq("id", id);

      if (error) {
        throw error;
      }

      setHistory((prev) => prev.filter((item) => item.id !== id));
      toast.success("Mensaje eliminado correctamente");
    } catch (error) {
      console.error("Error deleting message:", error);
      toast.error("Error al eliminar el mensaje");
    }
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat("es", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  };

  const truncateText = (text: string, maxLength: number) => {
    return text.length > maxLength
      ? text.substring(0, maxLength) + "..."
      : text;
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-3xl font-bold tracking-tight">
          Historial de Consultas
        </h2>
      </div>

      <div className="relative mb-4">
        <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar en historial..."
          className="pl-10"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {filteredHistory.length === 0 ? (
        <Card className="p-8 text-center">
          <div className="flex flex-col items-center justify-center py-8 space-y-4">
            <MessagesSquare size={48} className="text-muted-foreground" />
            <h3 className="text-xl font-medium">
              No hay conversaciones guardadas
            </h3>
            <p className="text-muted-foreground max-w-md">
              {searchTerm
                ? "No se encontraron resultados para tu búsqueda"
                : "Todas tus conversaciones con el asistente aparecerán aquí"}
            </p>
            {searchTerm && (
              <Button
                variant="outline"
                onClick={() => setSearchTerm("")}
              >
                Borrar búsqueda
              </Button>
            )}
          </div>
        </Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fecha</TableHead>
                <TableHead>Pregunta</TableHead>
                <TableHead>Respuesta</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredHistory.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="whitespace-nowrap">
                    <div className="flex items-center">
                      <Clock className="h-4 w-4 mr-2 text-muted-foreground" />
                      {formatDateTime(item.created_at)}
                    </div>
                  </TableCell>
                  <TableCell>{truncateText(item.query, 50)}</TableCell>
                  <TableCell>{truncateText(item.response, 50)}</TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(item.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
}
