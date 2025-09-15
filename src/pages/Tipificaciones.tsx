import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Layout from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PlusCircle, Edit, Trash2, Check, X, FileText } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Tipificacion {
  id: string;
  name: string;
  description: string | null;
  type: string;
  is_active: boolean;
  created_at: string;
  updated_at: string | null;
}

export default function TipificacionesPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [tipificaciones, setTipificaciones] = useState<Tipificacion[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingTipificacion, setEditingTipificacion] = useState<Tipificacion | null>(null);
  
  const [formState, setFormState] = useState({
    name: "",
    description: "",
    type: "general",
    is_active: true
  });
  
  const [filter, setFilter] = useState({
    name: "",
    type: "",
    showActive: true,
    showInactive: true
  });
  
  useEffect(() => {
    fetchTipificaciones();
  }, []);
  
  const fetchTipificaciones = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('tipificaciones')
        .select('*')
        .order('created_at', { ascending: false });
        
      if (error) throw error;
      
      setTipificaciones(data || []);
    } catch (err) {
      console.error("Error fetching tipificaciones:", err);
      toast.error("Error al cargar tipificaciones");
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formState.name) {
      toast.error("El nombre es obligatorio");
      return;
    }
    
    try {
      const newTipificacion = {
        name: formState.name,
        description: formState.description || null,
        type: formState.type,
        is_active: formState.is_active
      };
      
      if (editingTipificacion) {
        const { error } = await supabase
          .from('tipificaciones')
          .update(newTipificacion)
          .eq('id', editingTipificacion.id);
          
        if (error) throw error;
        
        toast.success("Tipificación actualizada correctamente");
      } else {
        const { error } = await supabase
          .from('tipificaciones')
          .insert([newTipificacion]);
          
        if (error) throw error;
        
        toast.success("Tipificación creada correctamente");
      }
      
      setFormState({
        name: "",
        description: "",
        type: "general",
        is_active: true
      });
      setEditingTipificacion(null);
      setShowForm(false);
      fetchTipificaciones();
    } catch (err) {
      console.error("Error saving tipificacion:", err);
      toast.error("Error al guardar tipificación");
    }
  };

  const handleEdit = (tipificacion: Tipificacion) => {
    setEditingTipificacion(tipificacion);
    setFormState({
      name: tipificacion.name,
      description: tipificacion.description || "",
      type: tipificacion.type,
      is_active: tipificacion.is_active
    });
    setShowForm(true);
  };
  
  const handleToggleActive = async (tipificacion: Tipificacion) => {
    try {
      const { error } = await supabase
        .from('tipificaciones')
        .update({ is_active: !tipificacion.is_active })
        .eq('id', tipificacion.id);
        
      if (error) throw error;
      
      fetchTipificaciones();
      toast.success(`Tipificación ${tipificacion.is_active ? 'desactivada' : 'activada'} correctamente`);
    } catch (err) {
      console.error("Error toggling active state:", err);
      toast.error("Error al cambiar el estado de la tipificación");
    }
  };
  
  const handleDelete = async (tipificacion: Tipificacion) => {
    try {
      const { count, error: countError } = await supabase
        .from('calls')
        .select('*', { count: 'exact' })
        .eq('tipificacion_id', tipificacion.id);
        
      if (countError) throw countError;
      
      if (count && count > 0) {
        toast.error(`No se puede eliminar. Esta tipificación está siendo usada en ${count} llamadas.`);
        return;
      }
      
      const { error } = await supabase
        .from('tipificaciones')
        .delete()
        .eq('id', tipificacion.id);
        
      if (error) throw error;
      
      fetchTipificaciones();
      toast.success("Tipificación eliminada correctamente");
    } catch (err) {
      console.error("Error deleting tipificacion:", err);
      toast.error("Error al eliminar la tipificación");
    }
  };
  
  const filteredTipificaciones = tipificaciones.filter(tip => {
    if (filter.name && !tip.name.toLowerCase().includes(filter.name.toLowerCase())) {
      return false;
    }
    
    if (filter.type && filter.type !== "all" && tip.type !== filter.type) {
      return false;
    }
    
    if (!filter.showActive && tip.is_active) {
      return false;
    }
    
    if (!filter.showInactive && !tip.is_active) {
      return false;
    }
    
    return true;
  });
  
  const handleCancel = () => {
    setShowForm(false);
    setEditingTipificacion(null);
    setFormState({
      name: "",
      description: "",
      type: "general",
      is_active: true
    });
  };
  
  const handleApplyFilter = () => {
    toast.info("Filtros aplicados");
  };
  
  const handleResetFilter = () => {
    setFilter({
      name: "",
      type: "",
      showActive: true,
      showInactive: true
    });
    toast.info("Filtros restablecidos");
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Tipificaciones</h2>
            <p className="text-muted-foreground">
              Gestiona las categorías y etiquetas para clasificar llamadas
            </p>
          </div>
          <Button 
            onClick={() => {
              setEditingTipificacion(null);
              setFormState({
                name: "",
                description: "",
                type: "general",
                is_active: true
              });
              setShowForm(true);
            }}
            className="mt-4 md:mt-0"
          >
            <PlusCircle className="mr-2 h-4 w-4" /> Nueva Tipificación
          </Button>
        </div>

        <Card className="mb-6 bg-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Filtros</CardTitle>
            <CardDescription>Filtra las tipificaciones por diferentes criterios</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <Label htmlFor="filter-name">Nombre</Label>
                <Input
                  id="filter-name"
                  value={filter.name}
                  onChange={(e) => setFilter({ ...filter, name: e.target.value })}
                  placeholder="Filtrar por nombre"
                />
              </div>
              <div>
                <Label htmlFor="filter-type">Tipo</Label>
                <Select
                  value={filter.type}
                  onValueChange={(value) => setFilter({ ...filter, type: value })}
                >
                  <SelectTrigger id="filter-type">
                    <SelectValue placeholder="Todos los tipos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos los tipos</SelectItem>
                    <SelectItem value="general">General</SelectItem>
                    <SelectItem value="venta">Venta</SelectItem>
                    <SelectItem value="soporte">Soporte</SelectItem>
                    <SelectItem value="reclamacion">Reclamación</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center space-x-2 mt-8">
                <Checkbox 
                  id="filter-active"
                  checked={filter.showActive}
                  onCheckedChange={(checked) => 
                    setFilter({ ...filter, showActive: checked === true })}
                />
                <label
                  htmlFor="filter-active"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  Mostrar activas
                </label>
              </div>
              <div className="flex items-center space-x-2 mt-8">
                <Checkbox 
                  id="filter-inactive"
                  checked={filter.showInactive}
                  onCheckedChange={(checked) => 
                    setFilter({ ...filter, showInactive: checked === true })}
                />
                <label
                  htmlFor="filter-inactive"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  Mostrar inactivas
                </label>
              </div>
            </div>
            <div className="flex justify-end mt-4 space-x-2">
              <Button variant="outline" onClick={handleResetFilter}>
                Restablecer
              </Button>
              <Button onClick={handleApplyFilter}>
                Aplicar filtros
              </Button>
            </div>
          </CardContent>
        </Card>

        {showForm && (
          <Card className="mb-6 bg-white">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">
                {editingTipificacion ? "Editar Tipificación" : "Nueva Tipificación"}
              </CardTitle>
              <CardDescription>
                {editingTipificacion ? "Modifica los datos de la tipificación" : "Introduce los datos para la nueva tipificación"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleFormSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Nombre *</Label>
                    <Input
                      id="name"
                      value={formState.name}
                      onChange={(e) => setFormState({ ...formState, name: e.target.value })}
                      placeholder="Nombre de la tipificación"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="type">Tipo</Label>
                    <Select
                      value={formState.type}
                      onValueChange={(value) => setFormState({ ...formState, type: value })}
                    >
                      <SelectTrigger id="type">
                        <SelectValue placeholder="Seleccionar tipo" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="general">General</SelectItem>
                        <SelectItem value="venta">Venta</SelectItem>
                        <SelectItem value="soporte">Soporte</SelectItem>
                        <SelectItem value="reclamacion">Reclamación</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Descripción</Label>
                  <Textarea
                    id="description"
                    value={formState.description}
                    onChange={(e) => setFormState({ ...formState, description: e.target.value })}
                    placeholder="Descripción detallada de la tipificación"
                    rows={3}
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="is_active"
                    checked={formState.is_active}
                    onCheckedChange={(checked) => 
                      setFormState({ ...formState, is_active: checked === true })}
                  />
                  <label
                    htmlFor="is_active"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    Tipificación activa
                  </label>
                </div>
                <div className="flex justify-end space-x-2">
                  <Button type="button" variant="outline" onClick={handleCancel}>
                    Cancelar
                  </Button>
                  <Button type="submit">
                    {editingTipificacion ? "Actualizar" : "Guardar"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        <Card className="bg-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Lista de Tipificaciones</CardTitle>
            <CardDescription>
              {filteredTipificaciones.length} tipificaciones encontradas
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : filteredTipificaciones.length === 0 ? (
              <div className="text-center py-8">
                <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium">No hay tipificaciones</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  No se encontraron tipificaciones con los filtros aplicados.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nombre</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Descripción</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredTipificaciones.map((tip) => (
                      <TableRow key={tip.id}>
                        <TableCell className="font-medium">{tip.name}</TableCell>
                        <TableCell>
                          <span className={`px-2 py-1 rounded-md text-xs font-medium ${
                            tip.type === 'venta' ? 'bg-green-100 text-green-800' :
                            tip.type === 'soporte' ? 'bg-blue-100 text-blue-800' :
                            tip.type === 'reclamacion' ? 'bg-red-100 text-red-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {tip.type.charAt(0).toUpperCase() + tip.type.slice(1)}
                          </span>
                        </TableCell>
                        <TableCell className="max-w-xs truncate">
                          {tip.description || <span className="text-muted-foreground italic">Sin descripción</span>}
                        </TableCell>
                        <TableCell>
                          {tip.is_active ? (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              <Check className="h-3 w-3 mr-1" /> Activa
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                              <X className="h-3 w-3 mr-1" /> Inactiva
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-right space-x-2">
                          <Button variant="ghost" size="icon" onClick={() => handleEdit(tip)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <Trash2 className="h-4 w-4 text-red-500" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>¿Confirmar eliminación?</DialogTitle>
                                <DialogDescription>
                                  Esta acción no se puede deshacer. La tipificación será eliminada permanentemente.
                                </DialogDescription>
                              </DialogHeader>
                              <DialogFooter className="mt-4">
                                <Button variant="outline" onClick={() => document.getElementById('close-dialog')?.click()}>
                                  Cancelar
                                </Button>
                                <Button variant="destructive" onClick={() => {
                                  handleDelete(tip);
                                  document.getElementById('close-dialog')?.click();
                                }}>
                                  Eliminar
                                </Button>
                                <button id="close-dialog" className="hidden" />
                              </DialogFooter>
                            </DialogContent>
                          </Dialog>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleToggleActive(tip)}
                            title={tip.is_active ? "Desactivar" : "Activar"}
                          >
                            {tip.is_active ? (
                              <X className="h-4 w-4 text-red-500" />
                            ) : (
                              <Check className="h-4 w-4 text-green-500" />
                            )}
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
