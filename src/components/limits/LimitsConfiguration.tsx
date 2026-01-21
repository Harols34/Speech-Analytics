
import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { Loader2, Plus } from "lucide-react";

interface Account {
  id: string;
  name: string;
}

interface AccountLimit {
  account_id: string;
  limite_horas: number;
  limite_consultas: number;
  limite_minutos_entrenamiento: number;
  limite_mensajes_chat: number;
  horas_adicionales: number;
}

export default function LimitsConfiguration() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedAccount, setSelectedAccount] = useState<string>("");
  const [limiteHoras, setLimiteHoras] = useState<number>(1);
  const [limiteConsultas, setLimiteConsultas] = useState<number>(1);
  const [limiteMinutosEntrenamiento, setLimiteMinutosEntrenamiento] = useState<number>(100);
  const [limiteMensajesChat, setLimiteMensajesChat] = useState<number>(1000);
  const [horasAdicionales, setHorasAdicionales] = useState<number>(0);

  // Obtener todas las cuentas
  const { data: accounts, isLoading: loadingAccounts } = useQuery({
    queryKey: ['accounts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('accounts')
        .select('id, name')
        .order('name');
      
      if (error) throw error;
      return data as Account[];
    }
  });

  // Obtener límites de la cuenta seleccionada
  const { data: currentLimits, isLoading: loadingLimits } = useQuery({
    queryKey: ['account-limits', selectedAccount],
    queryFn: async () => {
      if (!selectedAccount) return null;
      
      const { data, error } = await supabase
        .from('account_limits')
        .select('*')
        .eq('account_id', selectedAccount)
        .maybeSingle();
      
      if (error) throw error;
      return data as AccountLimit | null;
    },
    enabled: !!selectedAccount
  });

  // Mutación para guardar límites
  const saveLimitsMutation = useMutation({
    mutationFn: async (data: { accountId: string; limiteHoras: number; limiteConsultas: number; limiteMinutosEntrenamiento: number; limiteMensajesChat: number }) => {
      const { error } = await supabase
        .from('account_limits')
        .upsert({
          account_id: data.accountId,
          limite_horas: data.limiteHoras,
          limite_consultas: data.limiteConsultas,
          limite_minutos_entrenamiento: data.limiteMinutosEntrenamiento,
          limite_mensajes_chat: data.limiteMensajesChat,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'account_id'
        });
      
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Límites actualizados correctamente");
      queryClient.invalidateQueries({ queryKey: ['account-limits'] });
    },
    onError: (error) => {
      console.error('Error saving limits:', error);
      toast.error("Error al guardar los límites");
    }
  });

  // Mutación para ampliar horas adicionales
  const ampliarHorasMutation = useMutation({
    mutationFn: async (data: { accountId: string; horasAdicionales: number }) => {
      const { error } = await supabase.rpc('ampliar_horas_adicionales', {
        p_account_id: data.accountId,
        p_horas_adicionales: data.horasAdicionales
      });
      
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Horas adicionales agregadas correctamente");
      queryClient.invalidateQueries({ queryKey: ['account-limits'] });
    },
    onError: (error) => {
      console.error('Error adding additional hours:', error);
      toast.error("Error al agregar horas adicionales");
    }
  });

  // Actualizar estado cuando cambien los límites actuales - FIX: Mejor control de dependencias
  useEffect(() => {
    if (currentLimits) {
      setLimiteHoras(currentLimits.limite_horas || 1);
      setLimiteConsultas(currentLimits.limite_consultas || 1);
      setLimiteMinutosEntrenamiento(currentLimits.limite_minutos_entrenamiento || 100);
      setLimiteMensajesChat(currentLimits.limite_mensajes_chat || 1000);
      setHorasAdicionales(currentLimits.horas_adicionales || 0);
    } else if (selectedAccount && !loadingLimits) {
      // Solo resetear a valores por defecto si hay una cuenta seleccionada y no está cargando
      setLimiteHoras(0);
      setLimiteConsultas(0);
      setLimiteMinutosEntrenamiento(100);
      setLimiteMensajesChat(1000);
      setHorasAdicionales(0);
    }
  }, [currentLimits, selectedAccount, loadingLimits]); // Agregué loadingLimits para evitar resets prematuros

  // MOVED: Solo permitir acceso a superAdmin - ALL HOOKS MUST BE CALLED BEFORE THIS CHECK
  if (user?.role !== "superAdmin") {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center space-y-2">
          <h3 className="text-lg font-semibold">Acceso Restringido</h3>
          <p className="text-muted-foreground">Solo los superAdmin pueden configurar límites.</p>
        </div>
      </div>
    );
  }

  const handleSaveLimits = () => {
    if (!selectedAccount) {
      toast.error("Selecciona una cuenta");
      return;
    }

    if (limiteHoras < 0 || limiteHoras > 10000) {
      toast.error("El límite de horas debe estar entre 0 y 10,000");
      return;
    }

    if (limiteConsultas < 0 || limiteConsultas > 10000) {
      toast.error("El límite de consultas debe estar entre 0 y 10,000");
      return;
    }

    if (limiteMinutosEntrenamiento < 0 || limiteMinutosEntrenamiento > 10000) {
      toast.error("El límite de minutos de entrenamiento debe estar entre 0 y 10,000");
      return;
    }

    if (limiteMensajesChat < 0 || limiteMensajesChat > 100000) {
      toast.error("El límite de mensajes de chat debe estar entre 0 y 100,000");
      return;
    }

    saveLimitsMutation.mutate({
      accountId: selectedAccount,
      limiteHoras,
      limiteConsultas,
      limiteMinutosEntrenamiento,
      limiteMensajesChat
    });
  };

  const handleAmpliarHoras = () => {
    if (!selectedAccount) {
      toast.error("Selecciona una cuenta");
      return;
    }

    if (horasAdicionales <= 0) {
      toast.error("Las horas adicionales deben ser mayor a 0");
      return;
    }

    ampliarHorasMutation.mutate({
      accountId: selectedAccount,
      horasAdicionales
    });
  };

  if (loadingAccounts) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Selector de cuenta */}
      <div className="space-y-2">
        <Label htmlFor="account-select">Seleccionar Cuenta</Label>
        <Select value={selectedAccount} onValueChange={setSelectedAccount}>
          <SelectTrigger>
            <SelectValue placeholder="Selecciona una cuenta..." />
          </SelectTrigger>
          <SelectContent>
            {accounts?.map((account) => (
              <SelectItem key={account.id} value={account.id}>
                {account.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {selectedAccount && (
        <>
          {loadingLimits ? (
            <div className="flex items-center justify-center p-8">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2">
              {/* Configuración de límites principales */}
              <Card>
                <CardHeader>
                  <CardTitle>Límites Mensuales</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                     <Label htmlFor="limite-horas">
                       Horas de Transcripción (0 - 10,000)
                     </Label>
                     <Input
                       id="limite-horas"
                       type="number"
                       min="0"
                       max="10000"
                       value={limiteHoras}
                       onChange={(e) => setLimiteHoras(parseInt(e.target.value) || 0)}
                     />
                  </div>

                   <div className="space-y-2">
                      <Label htmlFor="limite-consultas">
                        Consultas de Chatbot (0 - 10,000)
                      </Label>
                      <Input
                        id="limite-consultas"
                        type="number"
                        min="0"
                        max="10000"
                        value={limiteConsultas}
                        onChange={(e) => setLimiteConsultas(parseInt(e.target.value) || 0)}
                      />
                   </div>

                   <div className="space-y-2">
                      <Label htmlFor="limite-minutos-entrenamiento">
                        Minutos de Entrenamiento - Voz (0 - 10,000)
                      </Label>
                      <Input
                        id="limite-minutos-entrenamiento"
                        type="number"
                        min="0"
                        max="10000"
                        value={limiteMinutosEntrenamiento}
                        onChange={(e) => setLimiteMinutosEntrenamiento(parseInt(e.target.value) || 0)}
                      />
                   </div>

                   <div className="space-y-2">
                      <Label htmlFor="limite-mensajes-chat">
                        Mensajes de Chat - IA (0 - 100,000)
                      </Label>
                      <Input
                        id="limite-mensajes-chat"
                        type="number"
                        min="0"
                        max="100000"
                        value={limiteMensajesChat}
                        onChange={(e) => setLimiteMensajesChat(parseInt(e.target.value) || 0)}
                      />
                   </div>

                   <Button 
                     onClick={handleSaveLimits}
                     disabled={saveLimitsMutation.isPending}
                     className="w-full"
                   >
                     {saveLimitsMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                     Guardar Límites
                   </Button>
                </CardContent>
              </Card>

              {/* Horas adicionales */}
              <Card>
                <CardHeader>
                  <CardTitle>Horas Adicionales</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Horas Adicionales Actuales</Label>
                    <div className="text-2xl font-bold text-green-600">
                      {currentLimits?.horas_adicionales || 0} horas
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-2">
                    <Label htmlFor="horas-adicionales">
                      Agregar Horas Adicionales
                    </Label>
                    <Input
                      id="horas-adicionales"
                      type="number"
                      min="1"
                      value={horasAdicionales}
                      onChange={(e) => setHorasAdicionales(parseInt(e.target.value) || 0)}
                      placeholder="Número de horas a agregar"
                    />
                  </div>

                  <Button 
                    onClick={handleAmpliarHoras}
                    disabled={ampliarHorasMutation.isPending}
                    variant="outline"
                    className="w-full"
                  >
                    {ampliarHorasMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    <Plus className="h-4 w-4 mr-2" />
                    Agregar Horas
                  </Button>
                </CardContent>
              </Card>
            </div>
          )}
        </>
      )}
    </div>
  );
}
