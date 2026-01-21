import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { MessageSquare, Mic, Clock, Star, TrendingUp, Search, Filter, Eye, Trash2, User, Target, Volume2 } from 'lucide-react';
import { TrainingSession, TrainingMetrics } from '@/lib/types/training';
import TrainingHistoryExport from './TrainingHistoryExport';
import { TrainingSessionDialog } from './TrainingSessionDialog';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';
import { useAccount } from '@/context/AccountContext';

export function TrainingHistory() {
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [userFilter, setUserFilter] = useState<string>('all');
  const [scenarioFilter, setScenarioFilter] = useState<string>('all');
  const [selectedSession, setSelectedSession] = useState<TrainingSession | null>(null);
  const [sessions, setSessions] = useState<TrainingSession[]>([]);
  const [users, setUsers] = useState<Array<{id: string, name: string}>>([]);
  const [scenarios, setScenarios] = useState<Array<{id: string, name: string}>>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuth();
  const { selectedAccountId } = useAccount();
  const [persistReady, setPersistReady] = useState(false);
  
  // Selección múltiple para eliminación masiva
  const [selectedSessions, setSelectedSessions] = useState<Set<string>>(new Set());
  const [isDeleting, setIsDeleting] = useState(false);

  // Fetch training sessions from database - FIXED with RLS for role-based visibility
  const fetchSessions = async () => {
    if (!user?.id) return;
    
    setIsLoading(true);
    try {
      let query = supabase
        .from('training_sessions')
        .select('*')
        .order('started_at', { ascending: false });

      // Apply account filter if needed (RLS will handle user role filtering automatically)
      if (selectedAccountId && selectedAccountId !== 'all') {
        query = query.eq('account_id', selectedAccountId);
      }

      const { data, error } = await query;

      if (error) throw error;

      const mappedSessions: TrainingSession[] = (data || []).map(session => ({
        id: session.id,
        scenario_id: session.scenario_id,
        scenario_name: session.scenario_name || 'Escenario Eliminado',
        user_id: session.user_id,
        user_name: session.user_name || 'Usuario desconocido',
        type: session.type as 'voice' | 'chat',
        status: session.status as 'active' | 'completed' | 'cancelled',
        started_at: session.started_at,
        completed_at: session.completed_at,
        duration_seconds: session.duration_seconds,
        recording_url: session.recording_url || null,
        conversation: Array.isArray(session.conversation) 
          ? session.conversation.map((msg: any) => ({
              id: msg.id || crypto.randomUUID(),
              role: msg.role || 'user',
              content: msg.content || '',
              timestamp: msg.timestamp || new Date().toISOString()
            }))
          : [],
        ai_summary: session.ai_summary,
        performance_score: session.performance_score,
        insights: Array.isArray(session.insights) ? session.insights : [],
        recommendations: Array.isArray(session.recommendations) ? session.recommendations : [],
        account_id: session.account_id,
        ai_report: session.ai_report || null,
        mensajes_generales: session.mensajes_generales || 0,
        mensajes_ia: session.mensajes_ia || 0,
        mensajes_usuario: session.mensajes_usuario || 0
      }));

      setSessions(mappedSessions);

      // Ahora necesitamos obtener los nombres de usuarios por separado
      if (mappedSessions.length > 0) {
        const userIds = [...new Set(mappedSessions.map(s => s.user_id))];
        const { data: usersData } = await supabase
          .from('profiles')
          .select('id, full_name')
          .in('id', userIds);

        // Crear mapeo de usuarios
        const userMap = new Map(usersData?.map(u => [u.id, u.full_name]) || []);
        
        // Actualizar sessions con nombres de usuarios
        const updatedSessions = mappedSessions.map(session => ({
          ...session,
          user_name: userMap.get(session.user_id) || session.user_name || 'Usuario desconocido'
        }));

        setSessions(updatedSessions);

        // Extraer usuarios y escenarios únicos para filtros
        const uniqueUsers = Array.from(new Map(
          updatedSessions.map(s => [s.user_id, { id: s.user_id, name: s.user_name }])
        ).values());
        
        // Para escenarios, agrupar solo los que tienen scenario_id válido
        const scenariosMap = new Map<string, { id: string, name: string }>();
        updatedSessions.forEach(s => {
          if (s.scenario_id) {
            scenariosMap.set(s.scenario_id, { id: s.scenario_id, name: s.scenario_name });
          }
        });
        const uniqueScenarios = Array.from(scenariosMap.values());

        setUsers(uniqueUsers);
        setScenarios(uniqueScenarios);
      }

    } catch (error) {
      console.error('Error fetching sessions:', error);
      toast.error('Error al cargar el historial de entrenamientos');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSessions();
    
    // Listen for analysis completion and refresh
    const handleAnalysisSaved = () => {
      console.log('📈 Analysis saved event received - refreshing history');
      setTimeout(() => fetchSessions(), 500); // Small delay to ensure DB commit
    };
    
    window.addEventListener('training-analysis-saved', handleAnalysisSaved);
    return () => window.removeEventListener('training-analysis-saved', handleAnalysisSaved);
  }, [user?.id, selectedAccountId]);

  // Persist filters per account (if applicable)
  useEffect(() => {
    // Use a general key since sessions are per user
    const key = `training_history_filters_${user?.id || 'anon'}`;
    const saved = localStorage.getItem(key);
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as { searchTerm: string; typeFilter: string; statusFilter: string };
        setSearchTerm(parsed.searchTerm || '');
        setTypeFilter(parsed.typeFilter || 'all');
        setStatusFilter(parsed.statusFilter || 'all');
      } catch {}
    }
    setPersistReady(true);
  }, [user?.id]);

  useEffect(() => {
    if (!persistReady) return;
    const key = `training_history_filters_${user?.id || 'anon'}`;
    localStorage.setItem(key, JSON.stringify({ 
      searchTerm, 
      typeFilter, 
      statusFilter, 
      userFilter, 
      scenarioFilter 
    }));
  }, [searchTerm, typeFilter, statusFilter, userFilter, scenarioFilter, user?.id, persistReady]);

  const filteredSessions = sessions.filter(session => {
    const matchesSearch = session.scenario_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         session.ai_summary?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         session.user_name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = typeFilter === 'all' || session.type === typeFilter;
    const matchesStatus = statusFilter === 'all' || session.status === statusFilter;
    const matchesUser = userFilter === 'all' || session.user_id === userFilter;
    const matchesScenario = scenarioFilter === 'all' || session.scenario_id === scenarioFilter;
    
    return matchesSearch && matchesType && matchesStatus && matchesUser && matchesScenario;
  });

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-600';
    if (score >= 80) return 'text-blue-600';
    if (score >= 70) return 'text-yellow-600';
    if (score >= 60) return 'text-orange-600';
    return 'text-red-600';
  };

  const getScoreBadgeColor = (score: number) => {
    if (score >= 90) return 'bg-green-100 text-green-800';
    if (score >= 80) return 'bg-blue-100 text-blue-800';
    if (score >= 70) return 'bg-yellow-100 text-yellow-800';
    if (score >= 60) return 'bg-orange-100 text-orange-800';
    return 'bg-red-100 text-red-800';
  };

  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const handleDeleteSession = async (sessionId: string) => {
    if (!user?.role || !['superAdmin', 'admin'].includes(user.role)) {
      toast.error('Solo los administradores pueden eliminar sesiones');
      return;
    }

    try {
      // Delete messages first (due to foreign key)
      await supabase
        .from('training_messages')
        .delete()
        .eq('session_id', sessionId);

      // Delete session
      const { error } = await supabase
        .from('training_sessions')
        .delete()
        .eq('id', sessionId);

      if (error) throw error;

      toast.success('Sesión eliminada correctamente');
      setSelectedSessions(prev => {
        const next = new Set(prev);
        next.delete(sessionId);
        return next;
      });
      fetchSessions();
    } catch (error) {
      console.error('Error deleting session:', error);
      toast.error('Error al eliminar la sesión');
    }
  };

  const handleBulkDelete = async () => {
    if (!user?.role || user.role !== 'superAdmin') {
      toast.error('Solo los superAdmin pueden eliminar sesiones masivamente');
      return;
    }

    if (selectedSessions.size === 0) {
      toast.error('Selecciona al menos una sesión para eliminar');
      return;
    }

    if (!confirm(`¿Estás seguro de que deseas eliminar ${selectedSessions.size} sesión(es)?`)) {
      return;
    }

    setIsDeleting(true);
    try {
      // Delete messages first
      const deleteMessagesPromises = Array.from(selectedSessions).map(id =>
        supabase.from('training_messages').delete().eq('session_id', id)
      );
      await Promise.all(deleteMessagesPromises);

      // Then delete sessions
      const deleteSessionsPromises = Array.from(selectedSessions).map(id =>
        supabase.from('training_sessions').delete().eq('id', id)
      );
      await Promise.all(deleteSessionsPromises);

      toast.success(`${selectedSessions.size} sesión(es) eliminada(s) exitosamente`);
      setSelectedSessions(new Set());
      fetchSessions();
    } catch (error) {
      console.error('Error deleting sessions:', error);
      toast.error('Error al eliminar las sesiones');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSelectAll = () => {
    if (selectedSessions.size === filteredSessions.length) {
      setSelectedSessions(new Set());
    } else {
      setSelectedSessions(new Set(filteredSessions.map(s => s.id)));
    }
  };

  const handleSelectSession = (id: string) => {
    setSelectedSessions(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const isSuperAdmin = user?.role === 'superAdmin';

  // Calcular estadísticas basadas en filtros
  const averageScore = filteredSessions.length > 0 
    ? Math.round(filteredSessions.reduce((sum, s) => sum + (s.performance_score || 0), 0) / filteredSessions.length)
    : 0;

  const completedSessions = filteredSessions.filter(s => s.status === 'completed').length;
  const totalFilteredTime = filteredSessions.reduce((sum, s) => sum + (s.duration_seconds || 0), 0);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">Historial de Entrenamientos</h3>
          <p className="text-sm text-muted-foreground">
            Revisa tus entrenamientos anteriores y analiza tu progreso
          </p>
        </div>
        <div className="flex gap-2">
          <TrainingHistoryExport sessions={filteredSessions} />
          {isSuperAdmin && selectedSessions.size > 0 && (
            <Button 
              variant="destructive" 
              onClick={handleBulkDelete}
              disabled={isDeleting}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              {isDeleting ? 'Eliminando...' : `Eliminar ${selectedSessions.size}`}
            </Button>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="flex items-center justify-between p-6">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Entrenamientos Completados</p>
              <p className="text-2xl font-bold">{completedSessions}</p>
            </div>
            <div className="h-12 w-12 bg-primary/10 rounded-full flex items-center justify-center">
              <Star className="h-6 w-6 text-primary" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center justify-between p-6">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Puntuación Promedio</p>
              <p className={`text-2xl font-bold ${getScoreColor(averageScore)}`}>
                {averageScore}%
              </p>
            </div>
            <div className="h-12 w-12 bg-blue-100 rounded-full flex items-center justify-center">
              <TrendingUp className="h-6 w-6 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center justify-between p-6">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Tiempo Total</p>
              <p className="text-2xl font-bold">
                {Math.round(totalFilteredTime / 60)} min
              </p>
            </div>
            <div className="h-12 w-12 bg-green-100 rounded-full flex items-center justify-center">
              <Clock className="h-6 w-6 text-green-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Selección múltiple header */}
      {isSuperAdmin && filteredSessions.length > 0 && (
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <Checkbox 
                checked={selectedSessions.size === filteredSessions.length && filteredSessions.length > 0}
                onCheckedChange={handleSelectAll}
                id="select-all-sessions"
              />
              <label 
                htmlFor="select-all-sessions"
                className="text-sm font-medium cursor-pointer"
              >
                Seleccionar todas ({filteredSessions.length})
              </label>
              {selectedSessions.size > 0 && (
                <span className="text-sm text-muted-foreground ml-auto">
                  {selectedSessions.size} seleccionada(s)
                </span>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar entrenamientos..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los tipos</SelectItem>
                <SelectItem value="voice">Voz</SelectItem>
                <SelectItem value="chat">Chat</SelectItem>
              </SelectContent>
            </Select>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los estados</SelectItem>
                <SelectItem value="completed">Completado</SelectItem>
                <SelectItem value="cancelled">Cancelado</SelectItem>
              </SelectContent>
            </Select>

            {user?.role && ['superAdmin', 'admin', 'supervisor', 'qualityAnalyst', 'backOffice'].includes(user.role) && (
              <Select value={userFilter} onValueChange={setUserFilter}>
                <SelectTrigger className="w-full md:w-48">
                  <SelectValue placeholder="Usuario" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los usuarios</SelectItem>
                  {users.filter(u => u.id && u.id.trim() !== '').map(u => (
                    <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            <Select value={scenarioFilter} onValueChange={setScenarioFilter}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="Escenario" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los escenarios</SelectItem>
                {scenarios.filter(s => s.id && s.id.trim() !== '').map(s => (
                  <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Sessions List */}
      <div className="space-y-4">
        {filteredSessions.map((session) => (
          <Card key={session.id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-start gap-3">
                {isSuperAdmin && (
                  <Checkbox 
                    checked={selectedSessions.has(session.id)}
                    onCheckedChange={() => handleSelectSession(session.id)}
                    className="mt-1"
                  />
                )}
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h4 className="font-semibold">{session.scenario_name}</h4>
                    <Badge variant="outline">
                      {session.type === 'voice' ? (
                        <><Mic className="h-3 w-3 mr-1" /> Voz</>
                      ) : (
                        <><MessageSquare className="h-3 w-3 mr-1" /> Chat</>
                      )}
                    </Badge>
                    {(() => { const sv = (session.ai_report?.overall_score ?? session.performance_score); return sv !== undefined && sv !== null; })() && (
                      <Badge className={getScoreBadgeColor(session.ai_report?.overall_score ?? (session.performance_score || 0))}>
                        {(session.ai_report?.overall_score ?? session.performance_score) || 0}%
                      </Badge>
                    )}
                    {user?.role && ['superAdmin', 'admin', 'supervisor', 'qualityAnalyst', 'backOffice'].includes(user.role) && (
                      <Badge variant="secondary">
                        <User className="h-3 w-3 mr-1" />
                        {session.user_name}
                      </Badge>
                    )}
                  </div>

                  <p className="text-sm text-foreground mb-3 line-clamp-2">
                    {session.ai_report?.conversation_summary || session.ai_summary}
                  </p>

                  <div className="flex flex-wrap gap-4 text-sm text-foreground">
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      <span>{session.duration_seconds ? formatDuration(session.duration_seconds) : 'N/A'}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <MessageSquare className="h-3 w-3" />
                      <span>{session.mensajes_generales || 0} mensajes (IA: {session.mensajes_ia || 0} • Usuario: {session.mensajes_usuario || 0})</span>
                    </div>
                    {session.recording_url && (
                      <Badge variant="secondary" className="flex items-center gap-1">
                        <Volume2 className="h-3 w-3" />
                        Audio disponible
                      </Badge>
                    )}
                    <div>
                      {new Date(session.started_at).toLocaleDateString()} - {new Date(session.started_at).toLocaleTimeString()}
                    </div>
                    <div>
                      {session.insights?.length || 0} insights
                    </div>
                    <div>
                      {session.recommendations?.length || 0} recomendaciones
                    </div>
                  </div>

                  {session.insights && session.insights.length > 0 && (
                    <div className="mt-3">
                      <h5 className="text-sm font-medium text-green-600 mb-1">Puntos Fuertes:</h5>
                      <ul className="text-sm text-foreground">
                        {session.insights.slice(0, 2).map((insight, index) => (
                          <li key={index} className="flex items-start gap-2">
                            <span className="text-green-500">✓</span>
                            <span>{insight}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {session.recommendations && session.recommendations.length > 0 && (
                    <div className="mt-2">
                      <h5 className="text-sm font-medium text-blue-600 mb-1">Áreas de Mejora:</h5>
                      <ul className="text-sm text-foreground">
                        {session.recommendations.slice(0, 2).map((rec, index) => (
                          <li key={index} className="flex items-start gap-2">
                            <span className="text-blue-500">→</span>
                            <span>{rec}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>

                <div className="ml-4 flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedSession(session)}
                  >
                    <Eye className="h-3 w-3 mr-1" />
                    Ver Detalles
                  </Button>
                  
                  {user?.role === 'superAdmin' && (
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDeleteSession(session.id)}
                    >
                      <Trash2 className="h-3 w-3 mr-1" />
                      Eliminar
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        {filteredSessions.length === 0 && sessions.length > 0 && (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Filter className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No se encontraron entrenamientos</h3>
              <p className="text-muted-foreground text-center mb-4">
                Prueba ajustando los filtros de búsqueda
              </p>
              <Button variant="outline" onClick={() => {
                setSearchTerm('');
                setTypeFilter('all');
                setStatusFilter('all');
                setUserFilter('all');
                setScenarioFilter('all');
              }}>
                Limpiar filtros
              </Button>
            </CardContent>
          </Card>
        )}

        {sessions.length === 0 && (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Star className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No hay entrenamientos aún</h3>
              <p className="text-muted-foreground text-center">
                Los entrenamientos aparecerán aquí una vez que se completen
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Training Session Dialog */}
      {selectedSession && (
        <TrainingSessionDialog
          session={selectedSession}
          open={!!selectedSession}
          onOpenChange={(open) => !open && setSelectedSession(null)}
        />
      )}
    </div>
  );
}