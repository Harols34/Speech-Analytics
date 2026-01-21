import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Loader2, Save, Zap, Plus, Minus, Wand2 } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

interface Account {
  id: string;
  name: string;
}

interface AccountWithLimits extends Account {
  limite_horas: number;
  limite_consultas: number;
  limite_minutos_entrenamiento: number;
  limite_mensajes_chat?: number;
  horas_adicionales: number;
}

export default function LimitsQuickConfig() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [bulkLimits, setBulkLimits] = useState({
    horas: 10,
    consultas: 50,
    minutos_entrenamiento: 100,
    mensajes_chat: 1000
  });
  const [confirmOpen, setConfirmOpen] = useState(false);
  const VOICE_COST_PER_HOUR = 0.5;
  const TRAINING_COST_PER_MINUTE = 0.4;
  const CHAT_COST_PER_MESSAGE = 0.0030;

  const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

  const adjust = (key: keyof typeof bulkLimits, delta: number, min: number, max: number) => {
    setBulkLimits(prev => ({ ...prev, [key]: clamp((prev[key] as number) + delta, min, max) }));
  };

  const formatCurrency = (amount: number) => new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2
  }).format(amount);

  const setPreset = (preset: "low" | "mid" | "high") => {
    if (preset === "low") {
      setBulkLimits({ horas: 5, consultas: 25, minutos_entrenamiento: 50, mensajes_chat: 500 });
    } else if (preset === "mid") {
      setBulkLimits({ horas: 10, consultas: 50, minutos_entrenamiento: 100, mensajes_chat: 1000 });
    } else {
      setBulkLimits({ horas: 50, consultas: 250, minutos_entrenamiento: 500, mensajes_chat: 5000 });
    }
  };

  // Get accounts with their current limits
  const { data: accountsWithLimits, isLoading: loadingAccounts } = useQuery({
    queryKey: ['accounts-with-limits'],
    queryFn: async () => {
      const { data: accounts, error: accountsError } = await supabase
        .from('accounts')
        .select('id, name')
        .order('name');
      
      if (accountsError) throw accountsError;

      const { data: limits, error: limitsError } = await supabase
        .from('account_limits')
        .select('*');
      
      if (limitsError) throw limitsError;

      return accounts.map(account => ({
        ...account,
        limite_horas: limits.find(l => l.account_id === account.id)?.limite_horas || 10,
        limite_consultas: limits.find(l => l.account_id === account.id)?.limite_consultas || 50,
        limite_minutos_entrenamiento: limits.find(l => l.account_id === account.id)?.limite_minutos_entrenamiento || 100,
        limite_mensajes_chat: limits.find(l => l.account_id === account.id)?.limite_mensajes_chat || 1000,
        horas_adicionales: limits.find(l => l.account_id === account.id)?.horas_adicionales || 0,
      })) as AccountWithLimits[];
    }
  });

  // Bulk update limits mutation
  const bulkUpdateMutation = useMutation({
    mutationFn: async (data: { horas: number; consultas: number; minutos_entrenamiento: number; mensajes_chat: number }) => {
      if (!accountsWithLimits) throw new Error("No accounts available");

      const updates = accountsWithLimits.map(account => ({
        account_id: account.id,
        limite_horas: data.horas,
        limite_consultas: data.consultas,
        limite_minutos_entrenamiento: data.minutos_entrenamiento,
        limite_mensajes_chat: data.mensajes_chat,
        horas_adicionales: 0, // Forzar eliminar horas adicionales en gestión rápida
        updated_at: new Date().toISOString()
      }));

      const { error } = await supabase
        .from('account_limits')
        .upsert(updates, {
          onConflict: 'account_id'
        });
      
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Límites actualizados masivamente");
      queryClient.invalidateQueries({ queryKey: ['accounts-with-limits'] });
      queryClient.invalidateQueries({ queryKey: ['account-limits'] });
    },
    onError: (error) => {
      console.error('Error updating bulk limits:', error);
      toast.error("Error al actualizar los límites");
    }
  });

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

  const handleBulkUpdate = () => {
    if (bulkLimits.horas < 0 || bulkLimits.horas > 10000) {
      toast.error("Las horas deben estar entre 0 y 10,000");
      return;
    }

    if (bulkLimits.consultas < 0 || bulkLimits.consultas > 10000) {
      toast.error("Las consultas deben estar entre 0 y 10,000");
      return;
    }

    if (bulkLimits.minutos_entrenamiento < 0 || bulkLimits.minutos_entrenamiento > 10000) {
      toast.error("Los minutos de entrenamiento deben estar entre 0 y 10,000");
      return;
    }

    if (bulkLimits.mensajes_chat < 0 || bulkLimits.mensajes_chat > 100000) {
      toast.error("Los mensajes de chat deben estar entre 0 y 100,000");
      return;
    }

    bulkUpdateMutation.mutate(bulkLimits);
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
      <Card>
        <CardHeader className="flex items-center justify-between space-y-0 py-2 px-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Zap className="h-4 w-4" />
            Configuración Masiva de Límites
          </CardTitle>
          <div className="text-xs text-muted-foreground">Afecta a todas las cuentas</div>
        </CardHeader>
        <CardContent className="space-y-4 py-3 px-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="bulk-horas">Horas de Transcripción</Label>
              <div className="flex items-center gap-2">
                <Button type="button" variant="outline" size="icon" onClick={() => adjust('horas', -10, 0, 10000)}>
                  <Minus className="h-4 w-4" />
                </Button>
                <Input
                  id="bulk-horas"
                  type="number"
                  min="0"
                  max="10000"
                  value={bulkLimits.horas}
                  onChange={(e) => setBulkLimits(prev => ({ ...prev, horas: clamp(parseInt(e.target.value) || 0, 0, 10000) }))}
                />
                <Button type="button" variant="outline" size="icon" onClick={() => adjust('horas', 10, 0, 10000)}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <div className="text-xs text-muted-foreground">0 - 10,000</div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="bulk-consultas">Consultas de Chatbot</Label>
              <div className="flex items-center gap-2">
                <Button type="button" variant="outline" size="icon" onClick={() => adjust('consultas', -50, 0, 10000)}>
                  <Minus className="h-4 w-4" />
                </Button>
                <Input
                  id="bulk-consultas"
                  type="number"
                  min="0"
                  max="10000"
                  value={bulkLimits.consultas}
                  onChange={(e) => setBulkLimits(prev => ({ ...prev, consultas: clamp(parseInt(e.target.value) || 0, 0, 10000) }))}
                />
                <Button type="button" variant="outline" size="icon" onClick={() => adjust('consultas', 50, 0, 10000)}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <div className="text-xs text-muted-foreground">0 - 10,000</div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="bulk-minutos">Minutos de Entrenamiento</Label>
              <div className="flex items-center gap-2">
                <Button type="button" variant="outline" size="icon" onClick={() => adjust('minutos_entrenamiento', -50, 0, 10000)}>
                  <Minus className="h-4 w-4" />
                </Button>
                <Input
                  id="bulk-minutos"
                  type="number"
                  min="0"
                  max="10000"
                  value={bulkLimits.minutos_entrenamiento}
                  onChange={(e) => setBulkLimits(prev => ({ ...prev, minutos_entrenamiento: clamp(parseInt(e.target.value) || 0, 0, 10000) }))}
                />
                <Button type="button" variant="outline" size="icon" onClick={() => adjust('minutos_entrenamiento', 50, 0, 10000)}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <div className="text-xs text-muted-foreground">0 - 10,000</div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="bulk-mensajes">Mensajes de Chat - IA</Label>
              <div className="flex items-center gap-2">
                <Button type="button" variant="outline" size="icon" onClick={() => adjust('mensajes_chat', -100, 0, 100000)}>
                  <Minus className="h-4 w-4" />
                </Button>
                <Input
                  id="bulk-mensajes"
                  type="number"
                  min="0"
                  max="100000"
                  value={bulkLimits.mensajes_chat}
                  onChange={(e) => setBulkLimits(prev => ({ ...prev, mensajes_chat: clamp(parseInt(e.target.value) || 0, 0, 100000) }))}
                />
                <Button type="button" variant="outline" size="icon" onClick={() => adjust('mensajes_chat', 100, 0, 100000)}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <div className="text-xs text-muted-foreground">0 - 100,000</div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs mt-1">
            <span className="text-muted-foreground flex items-center gap-1"><Wand2 className="h-3 w-3" /> Presets:</span>
            <Button type="button" variant="secondary" size="sm" onClick={() => setPreset('low')}>Bajo</Button>
            <Button type="button" variant="secondary" size="sm" onClick={() => setPreset('mid')}>Medio</Button>
            <Button type="button" variant="secondary" size="sm" onClick={() => setPreset('high')}>Alto</Button>
          </div>

          <Button 
            onClick={() => setConfirmOpen(true)}
            disabled={bulkUpdateMutation.isPending}
            className="w-full"
          >
            {bulkUpdateMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            <Save className="h-4 w-4 mr-2" />
            Aplicar a Todas las Cuentas (sin horas extra) ({accountsWithLimits?.length || 0} cuentas)
          </Button>

          <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Confirmar actualización masiva</AlertDialogTitle>
                <AlertDialogDescription>
                  <div className="space-y-2 text-sm">
                    <div>Se aplicarán estos límites a <strong>{accountsWithLimits?.length || 0}</strong> cuentas:</div>
                    <ul className="list-disc pl-5 space-y-1">
                      <li>Horas de transcripción: <strong>{bulkLimits.horas}</strong></li>
                      <li>Consultas de chatbot: <strong>{bulkLimits.consultas}</strong></li>
                      <li>Minutos de entrenamiento: <strong>{bulkLimits.minutos_entrenamiento}</strong></li>
                      <li>Mensajes de chat - IA: <strong>{bulkLimits.mensajes_chat}</strong></li>
                    </ul>
                    <div className="pt-2">
                      <div className="font-medium mb-1">Estimado mensual (aprox.)</div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
                        <div className="flex justify-between"><span>Transcripción</span><span>{formatCurrency(bulkLimits.horas * VOICE_COST_PER_HOUR)}</span></div>
                        <div className="flex justify-between"><span>Entrenamiento</span><span>{formatCurrency(bulkLimits.minutos_entrenamiento * TRAINING_COST_PER_MINUTE)}</span></div>
                        <div className="flex justify-between"><span>Mensajes Chat</span><span>{formatCurrency(bulkLimits.mensajes_chat * CHAT_COST_PER_MESSAGE)}</span></div>
                      </div>
                      <div className="flex justify-between mt-2 border-t pt-1"><span>Total</span><span className="font-semibold">{formatCurrency(
                        bulkLimits.horas * VOICE_COST_PER_HOUR +
                        bulkLimits.minutos_entrenamiento * TRAINING_COST_PER_MINUTE +
                        bulkLimits.mensajes_chat * CHAT_COST_PER_MESSAGE
                      )}</span></div>
                    </div>
                    <div className="text-amber-600 mt-2">Nota: se resetearán las horas adicionales (se establecerán en 0).</div>
                  </div>
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={bulkUpdateMutation.isPending}>Cancelar</AlertDialogCancel>
                <AlertDialogAction 
                  disabled={bulkUpdateMutation.isPending}
                  onClick={() => {
                    setConfirmOpen(false);
                    handleBulkUpdate();
                  }}
                >
                  Confirmar
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardContent>
      </Card>

      <Collapsible>
        <Card>
          <CardHeader className="flex items-center justify-between space-y-0 py-2 px-3">
            <CardTitle className="text-base">Vista Rápida de Límites Actuales</CardTitle>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm">Ver/Ocultar</Button>
            </CollapsibleTrigger>
          </CardHeader>
          <CollapsibleContent>
            <CardContent className="py-3 px-3">
              <div className="grid gap-2 md:grid-cols-2">
                {accountsWithLimits?.map((account) => (
                  <div key={account.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <div className="font-medium text-sm">{account.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {account.id.slice(0, 8)}...
                      </div>
                    </div>
                    <div className="flex gap-2 flex-wrap">
                      <Badge variant="outline">
                        {account.limite_horas}h transcripción
                      </Badge>
                      <Badge variant="outline">
                        {account.limite_consultas} consultas
                      </Badge>
                      <Badge variant="outline">
                        {account.limite_minutos_entrenamiento}min entrenamiento
                      </Badge>
                      <Badge variant="outline">
                        {account.limite_mensajes_chat} msgs chat
                      </Badge>
                      {account.horas_adicionales > 0 && (
                        <Badge variant="secondary">
                          +{account.horas_adicionales}h extra
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>
    </div>
  );
}