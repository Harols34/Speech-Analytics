import React, { useEffect, useMemo, useState } from "react";
import { InvoiceTemplate, InvoiceField } from "@/lib/billing/types";
import FieldEditor from "./FieldEditor";
import CompanyInfoForm from "./CompanyInfoForm";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";

interface TemplateFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  template?: InvoiceTemplate | null;
  onSaved?: () => void;
}

const DEFAULT_TEMPLATE: InvoiceTemplate = {
  name: "",
  description: "",
  company_info: { name: "Convert-IA", logo: "/favicon.ico" },
  header_fields: [],
  item_fields: [],
  footer_fields: [],
  styles: { primaryColor: "#16a34a", fontFamily: "Arial, sans-serif", fontSize: "12px" },
  is_active: true,
};

export default function TemplateFormDialog({ open, onOpenChange, template, onSaved }: TemplateFormDialogProps) {
  const { toast } = useToast();
  const [data, setData] = useState<InvoiceTemplate>(DEFAULT_TEMPLATE);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (template) {
      setData({
        id: template.id,
        name: template.name,
        description: template.description || "",
        company_info: template.company_info || {},
        header_fields: [...(template.header_fields || [])],
        item_fields: [...(template.item_fields || [])],
        footer_fields: [...(template.footer_fields || [])],
        styles: template.styles || {},
        is_active: template.is_active,
      });
    } else {
      setData(DEFAULT_TEMPLATE);
    }
  }, [template, open]);

  const disabled = useMemo(() => {
    if (!data.name) return true;
    return false;
  }, [data]);

  const save = async () => {
    setSaving(true);
    console.log("Saving invoice template", data);
    const payload = {
      name: data.name,
      description: data.description,
      company_info: (data.company_info ?? {}) as unknown as Json,
      header_fields: (data.header_fields || []) as unknown as Json,
      item_fields: (data.item_fields || []) as unknown as Json,
      footer_fields: (data.footer_fields || []) as unknown as Json,
      styles: (data.styles ?? {}) as unknown as Json,
      is_active: data.is_active,
    };

    const isEdit = !!data.id;
    const query = isEdit
      ? supabase.from("invoice_templates").update(payload).eq("id", data.id)
      : supabase.from("invoice_templates").insert(payload);

    const { data: res, error } = await query.select("*").maybeSingle();

    setSaving(false);
    if (error) {
      console.error("Error saving template", error);
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }

    toast({ title: isEdit ? "Plantilla actualizada" : "Plantilla creada", description: "Se guardó correctamente." });
    onOpenChange(false);
    onSaved?.();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !saving && onOpenChange(o)}>
      <DialogContent className="max-w-[1000px] w-[95vw]">
        <DialogHeader>
          <DialogTitle>{template ? "Editar plantilla" : "Nueva plantilla"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 max-h-[70vh] overflow-auto pr-1">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label>Nombre</Label>
              <Input
                placeholder="Formato Convert-IA"
                value={data.name}
                onChange={(e) => setData({ ...data, name: e.target.value })}
              />
            </div>
            <div className="flex items-center justify-between border rounded-md px-3 py-2 mt-6 sm:mt-0">
              <div className="space-y-0.5">
                <Label>Activo</Label>
                <p className="text-xs text-muted-foreground">Usable para nuevas facturas</p>
              </div>
              <Switch checked={!!data.is_active} onCheckedChange={(v) => setData({ ...data, is_active: v })} />
            </div>
          </div>

          <div>
            <Label>Descripción</Label>
            <Input
              placeholder="Formato de factura estándar..."
              value={data.description || ""}
              onChange={(e) => setData({ ...data, description: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <h3 className="text-sm font-semibold">Datos de la empresa</h3>
            <CompanyInfoForm value={data.company_info || {}} onChange={(v) => setData({ ...data, company_info: v })} />
          </div>

          <FieldEditor
            title="Campos de encabezado"
            fields={data.header_fields || []}
            onChange={(fields) => setData({ ...data, header_fields: fields })}
          />

          <FieldEditor
            title="Campos de items (detalle)"
            fields={data.item_fields || []}
            onChange={(fields) => setData({ ...data, item_fields: fields })}
          />

          <FieldEditor
            title="Campos de pie de factura"
            fields={data.footer_fields || []}
            onChange={(fields) => setData({ ...data, footer_fields: fields })}
          />

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <Label>Color primario (hex)</Label>
              <Input
                placeholder="#16a34a"
                value={data.styles?.primaryColor || ""}
                onChange={(e) =>
                  setData({ ...data, styles: { ...data.styles, primaryColor: e.target.value } })
                }
              />
            </div>
            <div>
              <Label>Fuente</Label>
              <Input
                placeholder="Arial, sans-serif"
                value={data.styles?.fontFamily || ""}
                onChange={(e) =>
                  setData({ ...data, styles: { ...data.styles, fontFamily: e.target.value } })
                }
              />
            </div>
            <div>
              <Label>Tamaño fuente</Label>
              <Input
                placeholder="12px"
                value={data.styles?.fontSize || ""}
                onChange={(e) =>
                  setData({ ...data, styles: { ...data.styles, fontSize: e.target.value } })
                }
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={saving}>Cancelar</Button>
          <Button onClick={save} disabled={disabled || saving}>
            {saving ? "Guardando..." : "Guardar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
