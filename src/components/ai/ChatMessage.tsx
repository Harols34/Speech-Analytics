
import React, { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, ChevronUp, Eye, EyeOff, User, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface CallDetail {
  id: string;
  title: string;
  agent_name?: string;
  call_date?: string;
  call_topic?: string;
  summary?: string;
  similarity?: number;
}

interface TopicStatistic {
  topic: string;
  count: number;
  percentage: number;
  call_ids?: string[];
  call_titles?: string[];
  call_details?: CallDetail[];
}

interface ChatMessageProps {
  message: {
    role: 'user' | 'assistant';
    content: string;
    user_id?: string;
    timestamp?: string;
    metadata?: {
      statistics?: TopicStatistic[];
      relevant_calls?: CallDetail[];
      show_call_details?: boolean;
      query_type?: 'topics' | 'general';
      expanded_topics?: string[];
    };
  };
  isLoading?: boolean;
}

export default function ChatMessage({ message, isLoading }: ChatMessageProps) {
  const [userName, setUserName] = useState<string>("");
  const [showCallDetails, setShowCallDetails] = useState(
    message.metadata?.show_call_details || false
  );
  const [expandedTopics, setExpandedTopics] = useState<Set<string>>(
    new Set(message.metadata?.expanded_topics || [])
  );

  // Cargar nombre de usuario
  useEffect(() => {
    if (message.user_id) {
      loadUserName(message.user_id);
    }
  }, [message.user_id]);

  const loadUserName = async (userId: string) => {
    const { data } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', userId)
      .single();
    
    if (data) {
      setUserName(data.full_name);
    }
  };

  // Persistir estado en localStorage con una clave única por mensaje
  const messageKey = `chat-state-${message.role}-${message.content.slice(0, 100).replace(/[^\w]/g, '')}`;
  
  // Cargar estado persistido al montar el componente
  useEffect(() => {
    const savedState = localStorage.getItem(messageKey);
    if (savedState) {
      try {
        const { showCallDetails: savedShowDetails, expandedTopics: savedExpanded } = JSON.parse(savedState);
        setShowCallDetails(savedShowDetails || false);
        setExpandedTopics(new Set(savedExpanded || []));
      } catch (error) {
        console.warn('Error loading saved chat state:', error);
      }
    }
  }, [messageKey]);

  // Guardar estado cuando cambie
  useEffect(() => {
    const stateToSave = {
      showCallDetails,
      expandedTopics: Array.from(expandedTopics)
    };
    localStorage.setItem(messageKey, JSON.stringify(stateToSave));
  }, [showCallDetails, expandedTopics, messageKey]);

  const toggleTopicExpansion = (topic: string) => {
    const newExpanded = new Set(expandedTopics);
    if (newExpanded.has(topic)) {
      newExpanded.delete(topic);
    } else {
      newExpanded.add(topic);
    }
    setExpandedTopics(newExpanded);
  };

  const formatDate = (timestamp: string) => {
    try {
      return format(new Date(timestamp), "dd/MM/yyyy HH:mm", { locale: es });
    } catch {
      return "";
    }
  };

  const formatContent = (content: string) => {
    // Formatear el contenido manteniendo el formato de lista numerada
    return content.split('\n').map((line, index) => {
      if (line.trim().match(/^\d+\.\s\*\*.*\*\*/)) {
        // Es un elemento de lista con formato especial
        return (
          <div key={index} className="mb-2">
            <p className="text-sm leading-relaxed">{line}</p>
          </div>
        );
      } else if (line.trim()) {
        return (
          <p key={index} className="text-sm leading-relaxed mb-2">
            {line}
          </p>
        );
      }
      return null;
    }).filter(Boolean);
  };

  return (
    <div className={`flex flex-col ${message.role === 'user' ? 'items-end' : 'items-start'}`}>
      {/* Encabezado con usuario y fecha para mensajes de usuario */}
      {message.role === 'user' && (
        <div className="flex items-center gap-2 mb-1 text-xs text-muted-foreground">
          {userName && (
            <>
              <User className="h-3 w-3" />
              <span className="font-medium">{userName}</span>
            </>
          )}
          {message.timestamp && (
            <>
              <Clock className="h-3 w-3 ml-2" />
              <span>{formatDate(message.timestamp)}</span>
            </>
          )}
        </div>
      )}

      <div className={`max-w-[85%] ${
        message.role === 'user' 
          ? 'bg-primary text-primary-foreground rounded-lg p-4' 
          : 'bg-muted rounded-lg p-4 border'
      }`}>
        <div className="space-y-3">
          {/* Contenido principal del mensaje */}
          <div className="whitespace-pre-wrap">
            {isLoading ? (
              <div className="flex items-center space-x-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
                <span className="text-sm">Pensando...</span>
              </div>
            ) : (
              <div>{formatContent(message.content)}</div>
            )}
          </div>

          {/* Controles para mostrar/ocultar detalles de llamadas */}
          {message.metadata && (message.metadata.statistics || message.metadata.relevant_calls) && (
            <div className="border-t pt-3 mt-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-foreground">
                  {message.metadata.query_type === 'topics' 
                    ? 'Llamadas consideradas en el análisis' 
                    : 'Llamadas relevantes encontradas'}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowCallDetails(!showCallDetails)}
                  className="h-6 px-2 text-xs"
                >
                  {showCallDetails ? (
                    <>
                      <EyeOff className="h-3 w-3 mr-1" />
                      Ocultar
                    </>
                  ) : (
                    <>
                      <Eye className="h-3 w-3 mr-1" />
                      Mostrar
                    </>
                  )}
                </Button>
              </div>

              {/* Mostrar estadísticas de temas con llamadas */}
              {showCallDetails && message.metadata.statistics && (
                <div className="space-y-3">
                  {message.metadata.statistics.map((stat, index) => (
                    <div key={index} className="border rounded p-3 bg-background/50">
                      <Collapsible>
                        <CollapsibleTrigger
                          onClick={() => toggleTopicExpansion(stat.topic)}
                          className="flex items-center justify-between w-full text-left"
                        >
                          <div className="flex items-center space-x-2">
                            <Badge variant="secondary" className="text-xs">
                              {stat.percentage}% ({stat.count} llamadas)
                            </Badge>
                            <span className="text-sm font-medium">{stat.topic}</span>
                          </div>
                          {expandedTopics.has(stat.topic) ? (
                            <ChevronUp className="h-4 w-4" />
                          ) : (
                            <ChevronDown className="h-4 w-4" />
                          )}
                        </CollapsibleTrigger>
                        
                        <CollapsibleContent className="mt-2">
                          {stat.call_details && stat.call_details.length > 0 ? (
                            <div className="space-y-1">
                              {stat.call_details.map((call, callIndex) => (
                                <div key={callIndex} className="text-xs p-2 bg-muted rounded">
                                  <div className="font-medium">{call.title}</div>
                                   {call.agent_name && (
                                     <div className="text-foreground">
                                       Agente: {call.agent_name}
                                     </div>
                                   )}
                                </div>
                              ))}
                            </div>
                          ) : stat.call_titles && stat.call_titles.length > 0 ? (
                            <div className="space-y-1">
                              {stat.call_titles.map((title, titleIndex) => (
                                <div key={titleIndex} className="text-xs p-2 bg-muted rounded">
                                  {title}
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="text-xs text-muted-foreground">
                              No hay detalles de llamadas disponibles
                            </div>
                          )}
                        </CollapsibleContent>
                      </Collapsible>
                    </div>
                  ))}
                </div>
              )}

              {/* Mostrar llamadas relevantes para consultas generales */}
              {showCallDetails && message.metadata.relevant_calls && (
                <div className="space-y-2">
                  {message.metadata.relevant_calls.map((call, index) => (
                    <div key={index} className="border rounded p-3 bg-background/50">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium">{call.title}</span>
                        {call.similarity && (
                          <Badge variant="outline" className="text-xs">
                            {Math.round(call.similarity * 100)}% similar
                          </Badge>
                        )}
                      </div>
                      {call.agent_name && (
                        <div className="text-xs text-foreground mb-1">
                          Agente: {call.agent_name}
                        </div>
                      )}
                      {call.call_topic && (
                        <div className="text-xs text-foreground mb-1">
                          Tema: {call.call_topic}
                        </div>
                      )}
                      {call.summary && (
                        <div className="text-xs text-foreground">
                          {call.summary.substring(0, 100)}...
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Fecha para mensajes del asistente */}
      {message.role === 'assistant' && message.timestamp && (
        <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
          <Clock className="h-3 w-3" />
          <span>{formatDate(message.timestamp)}</span>
        </div>
      )}
    </div>
  );
}
