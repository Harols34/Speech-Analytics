import React, { useMemo } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { UserMinus, CalendarClock, CheckCircle2 } from 'lucide-react';
import { TrainingScenario } from '@/lib/types/training';
import { ScenarioAssignment, useScenarioAssignments } from '@/hooks/useScenarioAssignments';

interface AssignmentsListDialogProps {
  scenario: TrainingScenario | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AssignmentsListDialog({ scenario, open, onOpenChange }: AssignmentsListDialogProps) {
  const { assignments, removeAssignment } = useScenarioAssignments();

  const scenarioAssignments = useMemo(() => {
    if (!scenario) return [] as ScenarioAssignment[];
    return assignments.filter(a => a.scenario_id === scenario.id);
  }, [assignments, scenario]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Asignaciones de "{scenario?.name}"</DialogTitle>
          <DialogDescription>
            Consulta los usuarios asignados a este escenario y elimina asignaciones si es necesario.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="text-sm text-muted-foreground">
            Total asignados: <span className="font-medium">{scenarioAssignments.length}</span>
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Usuario</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Asignado</TableHead>
                  <TableHead>Completado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {scenarioAssignments.map(a => (
                  <TableRow key={a.id}>
                    <TableCell>{a.user_name}</TableCell>
                    <TableCell>
                      {a.status === 'completed' ? (
                        <Badge variant="secondary" className="gap-1">
                          <CheckCircle2 className="h-3 w-3" /> Completado
                        </Badge>
                      ) : (
                        <Badge variant="destructive">Pendiente</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <CalendarClock className="h-3 w-3" />
                        {new Date(a.assigned_at).toLocaleDateString()}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {a.completed_at ? new Date(a.completed_at).toLocaleDateString() : '-'}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => removeAssignment(a.id)}
                        disabled={a.status === 'completed'}
                      >
                        <UserMinus className="h-3 w-3 mr-1" /> Quitar
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {scenarioAssignments.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                      No hay usuarios asignados.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
