
import React from "react";
import { InvoiceField, InvoiceFieldType } from "@/lib/billing/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Trash2, Plus } from "lucide-react";

interface FieldEditorProps {
  title: string;
  fields: InvoiceField[];
  onChange: (fields: InvoiceField[]) => void;
}

const EMPTY_FIELD: InvoiceField = {
  name: "",
  label: "",
  type: "text",
  required: false,
  calculated: false,
  options: [],
};

export default function FieldEditor({ title, fields, onChange }: FieldEditorProps) {
  const handleAdd = () => {
    onChange([...(fields || []), { ...EMPTY_FIELD }]);
  };

  const handleRemove = (idx: number) => {
    const next = [...fields];
    next.splice(idx, 1);
    onChange(next);
  };

  const handleUpdate = (idx: number, patch: Partial<InvoiceField>) => {
    const next = [...fields];
    next[idx] = { ...next[idx], ...patch };
    onChange(next);
  };

  const typeOptions: InvoiceFieldType[] = ["text", "number", "date", "select"];

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-foreground">{title}</h4>
        <Button size="sm" variant="secondary" onClick={handleAdd}>
          <Plus className="h-4 w-4 mr-1" /> Agregar campo
        </Button>
      </div>

      <div className="space-y-3">
        {fields?.length ? fields.map((f, idx) => (
          <div key={idx} className="rounded-md border p-3 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <Label htmlFor={`name-${idx}`}>Nombre (clave)</Label>
                <Input
                  id={`name-${idx}`}
                  placeholder="p. ej. numero"
                  value={f.name}
                  onChange={(e) => handleUpdate(idx, { name: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor={`label-${idx}`}>Etiqueta</Label>
                <Input
                  id={`label-${idx}`}
                  placeholder="p. ej. Nro"
                  value={f.label}
                  onChange={(e) => handleUpdate(idx, { label: e.target.value })}
                />
              </div>
              <div>
                <Label>Tipo</Label>
                <Select value={f.type} onValueChange={(v) => handleUpdate(idx, { type: v as InvoiceFieldType })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    {typeOptions.map((t) => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="flex items-center justify-between border rounded-md px-3 py-2">
                <div className="space-y-0.5">
                  <Label>Requerido</Label>
                  <p className="text-xs text-muted-foreground">Campo obligatorio</p>
                </div>
                <Switch checked={!!f.required} onCheckedChange={(v) => handleUpdate(idx, { required: v })} />
              </div>

              <div className="flex items-center justify-between border rounded-md px-3 py-2">
                <div className="space-y-0.5">
                  <Label>Calculado</Label>
                  <p className="text-xs text-muted-foreground">Se calcula automáticamente</p>
                </div>
                <Switch checked={!!f.calculated} onCheckedChange={(v) => handleUpdate(idx, { calculated: v })} />
              </div>

              {f.type === "select" && (
                <div>
                  <Label>Opciones (separadas por coma)</Label>
                  <Input
                    placeholder="Ej: USD - CREDITO, ARS - CONTADO"
                    value={(f.options || []).join(", ")}
                    onChange={(e) =>
                      handleUpdate(idx, {
                        options: e.target.value.split(",").map((o) => o.trim()).filter(Boolean),
                      })
                    }
                  />
                </div>
              )}
            </div>

            <div className="flex justify-end">
              <Button type="button" variant="destructive" size="sm" onClick={() => handleRemove(idx)}>
                <Trash2 className="h-4 w-4 mr-1" /> Eliminar
              </Button>
            </div>
          </div>
        )) : (
          <div className="text-sm text-muted-foreground">No hay campos. Agrega al menos uno.</div>
        )}
      </div>
    </div>
  );
}
