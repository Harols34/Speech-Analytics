
import React, { useEffect, useMemo, useState } from "react";
import { InvoiceTemplate } from "@/lib/billing/types";
import TemplateFormDialog from "./TemplateFormDialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { Pencil, Plus, RefreshCcw, Search, X } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

export default function BillingTemplatesList() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [templates, setTemplates] = useState<InvoiceTemplate[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<InvoiceTemplate | null>(null);
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    if (!q) return templates;
    return templates.filter(
      (t) =>
        t.name.toLowerCase().includes(q) ||
        (t.description || "").toLowerCase().includes(q)
    );
  }, [templates, query]);

  const fetchTemplates = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("invoice_templates")
      .select("*")
      .order("created_at", { ascending: false });

    setLoading(false);
    if (error) {
      console.error("Error fetching invoice_templates", error);
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }
    setTemplates((data as unknown as InvoiceTemplate[]) || []);
  };

  useEffect(() => {
    fetchTemplates();
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="h-4 w-4 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-8 w-[260px]"
              placeholder="Buscar plantilla..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            {query && (
              <button className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground" onClick={() => setQuery("")}>
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          <Button variant="outline" onClick={fetchTemplates}>
            <RefreshCcw className="h-4 w-4 mr-2" />
            Actualizar
          </Button>
        </div>
        <Button onClick={() => { setEditing(null); setOpen(true); }}>
          <Plus className="h-4 w-4 mr-2" />
          Nueva plantilla
        </Button>
      </div>

      {loading ? (
        <div className="text-sm text-muted-foreground">Cargando plantillas...</div>
      ) : filtered.length === 0 ? (
        <Card className="p-6 text-center text-sm text-muted-foreground">
          No hay plantillas. Crea la primera.
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((t) => (
            <Card key={t.id} className="p-4 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold truncate">{t.name}</h3>
                    {t.is_active ? (
                      <Badge variant="default">Activa</Badge>
                    ) : (
                      <Badge variant="secondary">Inactiva</Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                    {t.description || "Sin descripción"}
                  </p>
                </div>
                <Button size="icon" variant="ghost" onClick={() => { setEditing(t); setOpen(true); }}>
                  <Pencil className="h-4 w-4" />
                </Button>
              </div>

              <div className="text-xs text-muted-foreground">
                <div>Encabezado: {t.header_fields?.length || 0} campos</div>
                <div>Items: {t.item_fields?.length || 0} campos</div>
                <div>Pie: {t.footer_fields?.length || 0} campos</div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <TemplateFormDialog
        open={open}
        onOpenChange={setOpen}
        template={editing}
        onSaved={fetchTemplates}
      />
    </div>
  );
}
