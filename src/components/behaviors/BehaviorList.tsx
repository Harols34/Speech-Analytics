
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Pencil, Trash2, Loader2, Plus } from "lucide-react";
import { useBehaviors, Behavior } from "@/hooks/useBehaviors";
import { toast } from "sonner";
import { BehaviorDialog } from "./BehaviorDialog";

export default function BehaviorList() {
  const { behaviors, loading, deleteBehavior, fetchBehaviors } = useBehaviors();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedBehavior, setSelectedBehavior] = useState<Behavior | null>(null);

  const handleDelete = async (id: string) => {
    if (window.confirm("¿Estás seguro de que quieres eliminar este comportamiento?")) {
      try {
        await deleteBehavior(id);
        toast.success("Comportamiento eliminado correctamente");
      } catch (error) {
        toast.error("Error al eliminar el comportamiento");
      }
    }
  };

  const handleEdit = (behavior: Behavior) => {
    setSelectedBehavior(behavior);
    setIsDialogOpen(true);
  };

  const handleCreate = () => {
    setSelectedBehavior(null);
    setIsDialogOpen(true);
  };

  const handleSuccess = () => {
    fetchBehaviors();
    setSelectedBehavior(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Cargando comportamientos...</span>
      </div>
    );
  }

  return (
    <>
      <Card className="overflow-hidden shadow-md border-gray-200">
        <div className="p-4 border-b bg-gray-50">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Lista de Comportamientos</h3>
            <Button onClick={handleCreate} size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Nuevo Comportamiento
            </Button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-gray-50">
              <TableRow>
                <TableHead className="font-semibold text-gray-700">Nombre</TableHead>
                <TableHead className="font-semibold text-gray-700">Descripción</TableHead>
                <TableHead className="font-semibold text-gray-700">Estado</TableHead>
                <TableHead className="text-right font-semibold text-gray-700">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {behaviors.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8 text-gray-500">
                    No hay comportamientos disponibles para la cuenta seleccionada
                  </TableCell>
                </TableRow>
              ) : (
                behaviors.map(behavior => (
                  <TableRow key={behavior.id} className="hover:bg-gray-50">
                    <TableCell className="font-medium">{behavior.name}</TableCell>
                    <TableCell className="max-w-xs truncate">
                      {behavior.description || "Sin descripción"}
                    </TableCell>
                    <TableCell>
                      <Badge variant={behavior.is_active ? "default" : "secondary"}>
                        {behavior.is_active ? "Activo" : "Inactivo"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right space-x-1">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => handleEdit(behavior)} 
                        className="hover:bg-gray-100"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => handleDelete(behavior.id)} 
                        className="hover:bg-red-50 text-red-600"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      <BehaviorDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        behavior={selectedBehavior}
        onSuccess={handleSuccess}
      />
    </>
  );
}
