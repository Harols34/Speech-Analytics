
-- Crear tabla para los formatos de factura
CREATE TABLE public.invoice_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  company_info JSONB NOT NULL DEFAULT '{}',
  header_fields JSONB NOT NULL DEFAULT '[]',
  item_fields JSONB NOT NULL DEFAULT '[]',
  footer_fields JSONB NOT NULL DEFAULT '[]',
  styles JSONB NOT NULL DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Crear tabla para las facturas generadas
CREATE TABLE public.invoices (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  template_id UUID REFERENCES public.invoice_templates(id) ON DELETE SET NULL,
  invoice_number TEXT NOT NULL,
  customer_info JSONB NOT NULL DEFAULT '{}',
  items JSONB NOT NULL DEFAULT '[]',
  totals JSONB NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'draft',
  issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date DATE,
  created_by UUID REFERENCES auth.users(id),
  account_id UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS en las tablas
ALTER TABLE public.invoice_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

-- Políticas RLS - Solo superAdmin puede acceder
CREATE POLICY "Solo superAdmin puede gestionar plantillas de factura"
  ON public.invoice_templates
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'superAdmin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'superAdmin'
    )
  );

CREATE POLICY "Solo superAdmin puede gestionar facturas"
  ON public.invoices
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'superAdmin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'superAdmin'
    )
  );

-- Triggers para updated_at
CREATE TRIGGER update_invoice_templates_updated_at
  BEFORE UPDATE ON public.invoice_templates
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_invoices_updated_at
  BEFORE UPDATE ON public.invoices
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Insertar un template de ejemplo basado en la imagen
INSERT INTO public.invoice_templates (
  name,
  description,
  company_info,
  header_fields,
  item_fields,
  footer_fields,
  styles
) VALUES (
  'Formato Convert-IA',
  'Formato de factura estándar para Convert-IA',
  '{
    "name": "Convert-IA",
    "logo": "/favicon.ico",
    "address": "",
    "phone": "",
    "email": ""
  }',
  '[
    {"name": "rut", "label": "RUT", "type": "text", "required": true},
    {"name": "tipo", "label": "Tipo", "type": "text", "required": false},
    {"name": "numero", "label": "Nro", "type": "text", "required": true},
    {"name": "fecha", "label": "Fecha", "type": "date", "required": true},
    {"name": "vencimiento", "label": "Vto", "type": "date", "required": false},
    {"name": "moneda", "label": "Mon", "type": "select", "options": ["USD - CREDITO"], "required": true},
    {"name": "clausula_venta", "label": "Clau. venta", "type": "text", "required": false}
  ]',
  '[
    {"name": "cantidad", "label": "CANT", "type": "number", "required": true},
    {"name": "unidad", "label": "UNID", "type": "text", "required": true},
    {"name": "detalle", "label": "DETALLE", "type": "text", "required": true},
    {"name": "precio", "label": "PRECIO", "type": "number", "required": true},
    {"name": "descuento", "label": "DTO/REC", "type": "number", "required": false},
    {"name": "iva", "label": "IVA", "type": "number", "required": false},
    {"name": "subtotal", "label": "SUBTOTAL", "type": "number", "calculated": true}
  ]',
  '[
    {"name": "exportacion", "label": "Exportación y Asimiladas", "type": "number", "required": false},
    {"name": "total", "label": "TOTAL", "type": "number", "calculated": true}
  ]',
  '{
    "primaryColor": "#10b981",
    "fontFamily": "Arial, sans-serif",
    "fontSize": "12px"
  }'
);
