import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { Palette, Type, Eye, Maximize2 } from "lucide-react";

interface InvoiceData {
  billTo: {
    name: string;
    phone: string;
    address: string;
  };
  invoiceInfo: {
    number: string;
    invoiceDate: string;
    paymentDate: string;
  };
  company: {
    name: string;
    phone: string;
    address: string;
    department: string;
  };
  items: Array<{
    name: string;
    description: string;
    quantity: number;
    amount: number;
    total: number;
  }>;
}

interface TemplateCustomization {
  fontFamily: string;
  primaryColor: string;
  backgroundColor: string;
  accentColor: string;
}

interface TemplateGalleryModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: InvoiceData;
  selectedTemplate: number;
  onSelectTemplate: (templateId: number) => void;
  customization: TemplateCustomization;
  onCustomizationChange: (customization: TemplateCustomization) => void;
}

const FONT_OPTIONS = [
  { value: 'font-sans', label: 'Sans Serif (Default)' },
  { value: 'font-serif', label: 'Serif' },
  { value: 'font-mono', label: 'Monospace' },
];

const COLOR_SCHEMES = [
  { 
    name: 'Convert-IA Azul', 
    primary: 'rgb(37, 99, 235)', 
    background: 'rgb(255, 255, 255)', 
    accent: 'rgb(59, 130, 246)' 
  },
  { 
    name: 'Profesional Gris', 
    primary: 'rgb(55, 65, 81)', 
    background: 'rgb(249, 250, 251)', 
    accent: 'rgb(107, 114, 128)' 
  },
  { 
    name: 'Elegante Verde', 
    primary: 'rgb(16, 185, 129)', 
    background: 'rgb(255, 255, 255)', 
    accent: 'rgb(34, 197, 94)' 
  },
  { 
    name: 'Moderno Púrpura', 
    primary: 'rgb(147, 51, 234)', 
    background: 'rgb(255, 255, 255)', 
    accent: 'rgb(168, 85, 247)' 
  },
  { 
    name: 'Corporativo Negro', 
    primary: 'rgb(17, 24, 39)', 
    background: 'rgb(255, 255, 255)', 
    accent: 'rgb(75, 85, 99)' 
  }
];

// Template Components
const Template1 = ({ data, customization }: { data: InvoiceData, customization: TemplateCustomization }) => {
  const subtotal = data.items.reduce((sum, item) => sum + item.total, 0);
  
  return (
    <div className={`${customization.fontFamily} p-8 shadow-lg`} style={{ backgroundColor: customization.backgroundColor }}>
      <div className="flex justify-between items-start mb-8">
        <div className="flex items-center gap-3">
          <img src="https://www.convertia.com/favicon/favicon-convertia.png" alt="Convert-IA" className="h-10 w-10" />
          <div>
            <h1 className="text-2xl font-bold" style={{ color: customization.primaryColor }}>Convert-IA</h1>
            <p className="text-sm text-gray-600">Soluciones de IA</p>
          </div>
        </div>
        <div className="text-right">
          <h2 className="text-3xl font-bold" style={{ color: customization.primaryColor }}>FACTURA</h2>
          <p className="text-sm text-gray-600">#{data.invoiceInfo.number}</p>
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-8 mb-8">
        <div>
          <h3 className="font-semibold mb-2" style={{ color: customization.primaryColor }}>Facturar a:</h3>
          <p className="font-medium">{data.billTo.name}</p>
          <p className="text-gray-600">{data.billTo.address}</p>
          <p className="text-gray-600">Tel: {data.billTo.phone}</p>
        </div>
        <div>
          <h3 className="font-semibold mb-2" style={{ color: customization.primaryColor }}>De:</h3>
          <p className="font-medium">{data.company.name}</p>
          <p className="text-gray-600">{data.company.department}</p>
          <p className="text-gray-600">{data.company.address}</p>
          <p className="text-gray-600">Tel: {data.company.phone}</p>
        </div>
      </div>

      <div className="mb-8">
        <table className="w-full border-collapse">
          <thead>
            <tr style={{ backgroundColor: customization.accentColor }} className="text-white">
              <th className="p-3 text-left">Descripción</th>
              <th className="p-3 text-center">Cantidad</th>
              <th className="p-3 text-right">Precio</th>
              <th className="p-3 text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            {data.items.map((item, index) => (
              <tr key={index} className="border-b">
                <td className="p-3">
                  <div className="font-medium">{item.name}</div>
                  <div className="text-sm text-gray-600">{item.description}</div>
                </td>
                <td className="p-3 text-center">{item.quantity}</td>
                <td className="p-3 text-right">${item.amount.toFixed(2)}</td>
                <td className="p-3 text-right">${item.total.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="text-right">
        <div className="inline-block">
          <div className="flex justify-between mb-2 w-48">
            <span>Subtotal:</span>
            <span>${subtotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between font-bold text-lg pt-2 border-t" style={{ color: customization.primaryColor }}>
            <span>Total:</span>
            <span>${subtotal.toFixed(2)} USD</span>
          </div>
        </div>
      </div>
    </div>
  );
};

const Template2 = ({ data, customization }: { data: InvoiceData, customization: TemplateCustomization }) => {
  const subtotal = data.items.reduce((sum, item) => sum + item.total, 0);
  
  return (
    <div className={`${customization.fontFamily} shadow-lg`} style={{ backgroundColor: customization.backgroundColor }}>
      <div className="p-8" style={{ backgroundColor: customization.primaryColor }}>
        <div className="flex justify-between items-center text-white">
          <div className="flex items-center gap-3">
            <img src="https://www.convertia.com/favicon/favicon-convertia.png" alt="Convert-IA" className="h-12 w-12" />
            <div>
              <h1 className="text-3xl font-bold">Convert-IA</h1>
              <p className="text-sm opacity-90">{data.company.department}</p>
            </div>
          </div>
          <div className="text-right">
            <h2 className="text-2xl font-bold">FACTURA</h2>
            <p>#{data.invoiceInfo.number}</p>
          </div>
        </div>
      </div>
      
      <div className="p-8">
        <div className="grid grid-cols-2 gap-8 mb-8">
          <div>
            <div className="p-4 rounded-lg" style={{ backgroundColor: `${customization.accentColor}20` }}>
              <h3 className="font-semibold mb-2" style={{ color: customization.primaryColor }}>Facturar a:</h3>
              <p className="font-medium">{data.billTo.name}</p>
              <p className="text-gray-600">{data.billTo.address}</p>
              <p className="text-gray-600">Tel: {data.billTo.phone}</p>
            </div>
          </div>
          <div>
            <div className="text-right">
              <p><strong>Fecha de Factura:</strong> {data.invoiceInfo.invoiceDate}</p>
              <p><strong>Fecha de Vencimiento:</strong> {data.invoiceInfo.paymentDate}</p>
            </div>
          </div>
        </div>

        <div className="mb-8">
          <div className="overflow-hidden rounded-lg border">
            <table className="w-full">
              <thead style={{ backgroundColor: customization.accentColor }} className="text-white">
                <tr>
                  <th className="p-4 text-left">Artículo</th>
                  <th className="p-4 text-center">Cant.</th>
                  <th className="p-4 text-right">Precio</th>
                  <th className="p-4 text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((item, index) => (
                  <tr key={index} className="border-b">
                    <td className="p-4">
                      <div className="font-medium">{item.name}</div>
                      <div className="text-sm text-gray-600">{item.description}</div>
                    </td>
                    <td className="p-4 text-center">{item.quantity}</td>
                    <td className="p-4 text-right">${item.amount.toFixed(2)}</td>
                    <td className="p-4 text-right font-semibold">${item.total.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="flex justify-end">
          <div className="w-64 p-4 rounded-lg" style={{ backgroundColor: `${customization.primaryColor}10` }}>
            <div className="flex justify-between mb-2">
              <span>Subtotal:</span>
              <span>${subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between font-bold text-xl pt-2 border-t" style={{ color: customization.primaryColor }}>
              <span>Total USD:</span>
              <span>${subtotal.toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Similar templates 3-10 would go here with different layouts...
const Template3 = ({ data, customization }: { data: InvoiceData, customization: TemplateCustomization }) => {
  const subtotal = data.items.reduce((sum, item) => sum + item.total, 0);
  
  return (
    <div className={`${customization.fontFamily} p-8 shadow-lg border-l-8`} 
         style={{ backgroundColor: customization.backgroundColor, borderLeftColor: customization.primaryColor }}>
      <div className="text-center mb-8">
        <img src="https://www.convertia.com/favicon/favicon-convertia.png" alt="Convert-IA" className="h-16 w-16 mx-auto mb-4" />
        <h1 className="text-4xl font-bold" style={{ color: customization.primaryColor }}>FACTURA</h1>
        <p className="text-lg">#{data.invoiceInfo.number}</p>
      </div>
      
      <div className="grid grid-cols-3 gap-6 mb-8">
        <div className="text-center">
          <h3 className="font-semibold mb-2 pb-1 border-b-2" style={{ borderColor: customization.accentColor }}>Factura de</h3>
          <p className="font-medium">{data.company.name}</p>
          <p className="text-sm">{data.company.department}</p>
          <p className="text-sm">{data.company.address}</p>
          <p className="text-sm">Tel: {data.company.phone}</p>
        </div>
        <div className="text-center">
          <h3 className="font-semibold mb-2 pb-1 border-b-2" style={{ borderColor: customization.accentColor }}>Facturar a</h3>
          <p className="font-medium">{data.billTo.name}</p>
          <p className="text-sm">{data.billTo.address}</p>
          <p className="text-sm">Tel: {data.billTo.phone}</p>
        </div>
        <div className="text-center">
          <h3 className="font-semibold mb-2 pb-1 border-b-2" style={{ borderColor: customization.accentColor }}>Fechas</h3>
          <p className="text-sm"><strong>Factura:</strong> {data.invoiceInfo.invoiceDate}</p>
          <p className="text-sm"><strong>Vencimiento:</strong> {data.invoiceInfo.paymentDate}</p>
        </div>
      </div>

      <div className="mb-8">
        <div className="rounded-lg overflow-hidden" style={{ border: `2px solid ${customization.accentColor}` }}>
          <div className="p-4 text-white text-center font-bold" style={{ backgroundColor: customization.primaryColor }}>
            DETALLES DE LA FACTURA
          </div>
          <table className="w-full">
            <thead style={{ backgroundColor: `${customization.accentColor}30` }}>
              <tr>
                <th className="p-3 text-left">Descripción</th>
                <th className="p-3 text-center">Cant.</th>
                <th className="p-3 text-right">Precio</th>
                <th className="p-3 text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((item, index) => (
                <tr key={index} className="border-b">
                  <td className="p-3">
                    <div className="font-medium">{item.name}</div>
                    <div className="text-sm text-gray-600">{item.description}</div>
                  </td>
                  <td className="p-3 text-center">{item.quantity}</td>
                  <td className="p-3 text-right">${item.amount.toFixed(2)}</td>
                  <td className="p-3 text-right font-semibold">${item.total.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="text-center">
        <div className="inline-block p-6 rounded-lg" style={{ backgroundColor: `${customization.primaryColor}15` }}>
          <div className="text-2xl font-bold" style={{ color: customization.primaryColor }}>
            Total: ${subtotal.toFixed(2)} USD
          </div>
        </div>
      </div>
    </div>
  );
};

const TEMPLATES = [
  { id: 1, name: 'Clásico Profesional', component: Template1 },
  { id: 2, name: 'Moderno con Header', component: Template2 },
  { id: 3, name: 'Centrado Elegante', component: Template3 },
];

export default function TemplateGalleryModal({ 
  isOpen, 
  onClose, 
  data, 
  selectedTemplate, 
  onSelectTemplate,
  customization,
  onCustomizationChange
}: TemplateGalleryModalProps) {
  const [previewTemplate, setPreviewTemplate] = useState(selectedTemplate);
  const [isLargePreviewOpen, setIsLargePreviewOpen] = useState(false);
  const [selectedColorScheme, setSelectedColorScheme] = useState(0);

  // Sync previewTemplate with selectedTemplate prop when modal opens
  React.useEffect(() => {
    if (isOpen) {
      setPreviewTemplate(selectedTemplate);
    }
  }, [selectedTemplate, isOpen]);
  
  const SelectedTemplate = TEMPLATES.find(t => t.id === previewTemplate)?.component || Template1;

  const handleColorSchemeChange = (scheme: typeof COLOR_SCHEMES[0], index: number) => {
    setSelectedColorScheme(index);
    const newCustomization = {
      ...customization,
      primaryColor: scheme.primary,
      backgroundColor: scheme.background,
      accentColor: scheme.accent
    };
    onCustomizationChange(newCustomization);
  };

  const handleFontChange = (fontFamily: string) => {
    const newCustomization = {
      ...customization,
      fontFamily
    };
    onCustomizationChange(newCustomization);
  };

  const handleSelectAndClose = () => {
    onSelectTemplate(previewTemplate);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-7xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">Galería de Plantillas de Facturación</DialogTitle>
        </DialogHeader>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Template Selection */}
          <div className="space-y-4">
            <h3 className="font-semibold text-lg">Seleccionar Plantilla</h3>
            <div className="grid grid-cols-2 gap-2 max-h-96 overflow-y-auto">
              {TEMPLATES.map((template) => (
                <Card 
                  key={template.id}
                  className={`p-3 cursor-pointer transition-all ${
                    previewTemplate === template.id 
                      ? 'ring-2 ring-primary bg-primary/5' 
                      : 'hover:bg-gray-50'
                  }`}
                  onClick={() => setPreviewTemplate(template.id)}
                >
                  <div className="text-center">
                    <div className="w-full h-20 bg-gray-100 rounded mb-2 flex items-center justify-center">
                      <span className="text-xs font-medium">Plantilla {template.id}</span>
                    </div>
                    <p className="text-xs font-medium">{template.name}</p>
                  </div>
                </Card>
              ))}
            </div>

            {/* Customization Options */}
            <div className="space-y-4 border-t pt-4">
              <h4 className="font-semibold flex items-center gap-2">
                <Palette className="h-4 w-4" />
                Personalización
              </h4>
              
              <div>
                <Label className="text-sm font-medium flex items-center gap-2 mb-2">
                  <Type className="h-4 w-4" />
                  Fuente
                </Label>
                <Select 
                  value={customization.fontFamily} 
                  onValueChange={handleFontChange}
                >
                  <SelectTrigger className="text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FONT_OPTIONS.map(font => (
                      <SelectItem key={font.value} value={font.value} className="text-xs">
                        {font.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-sm font-medium mb-2 block">Esquema de Colores</Label>
                <div className="space-y-2">
                  {COLOR_SCHEMES.map((scheme, index) => (
                    <div
                      key={index}
                      className={`flex items-center gap-2 p-2 rounded cursor-pointer transition-colors ${
                        selectedColorScheme === index 
                          ? 'bg-primary/10 border-2 border-primary' 
                          : 'hover:bg-gray-50 border-2 border-transparent'
                      }`}
                      onClick={() => handleColorSchemeChange(scheme, index)}
                    >
                      <div className="flex gap-1">
                        <div 
                          className="w-4 h-4 rounded border border-gray-200" 
                          style={{ backgroundColor: scheme.primary }}
                        />
                        <div 
                          className="w-4 h-4 rounded border border-gray-200" 
                          style={{ backgroundColor: scheme.accent }}
                        />
                      </div>
                      <span className="text-xs font-medium">{scheme.name}</span>
                      {selectedColorScheme === index && (
                        <div className="ml-auto">
                          <div className="w-2 h-2 bg-primary rounded-full"></div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Live Preview */}
          <div className="lg:col-span-2">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-semibold text-lg">Vista Previa</h3>
              <div className="space-x-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setIsLargePreviewOpen(true)}
                  className="flex items-center gap-2"
                >
                  <Maximize2 className="h-4 w-4" />
                  Vista Ampliada
                </Button>
                <Button variant="outline" onClick={onClose}>
                  Cancelar
                </Button>
                <Button onClick={handleSelectAndClose}>
                  Seleccionar Plantilla
                </Button>
              </div>
            </div>
            
            <div className="border rounded-lg overflow-hidden bg-gray-50 max-h-[650px] overflow-y-auto">
              <div className="transform scale-90 origin-top-left" style={{ width: '111%' }}>
                <div key={`${previewTemplate}-${JSON.stringify(customization)}`}>
                  <SelectedTemplate data={data} customization={customization} />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Large Preview Modal */}
        <Dialog open={isLargePreviewOpen} onOpenChange={setIsLargePreviewOpen}>
          <DialogContent className="max-w-5xl max-h-[95vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Eye className="h-5 w-5" />
                Vista Previa Completa - {TEMPLATES.find(t => t.id === previewTemplate)?.name}
              </DialogTitle>
            </DialogHeader>
            
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="bg-white shadow-2xl">
                <div key={`large-${previewTemplate}-${JSON.stringify(customization)}`}>
                  <SelectedTemplate data={data} customization={customization} />
                </div>
              </div>
            </div>
            
            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setIsLargePreviewOpen(false)}>
                Cerrar
              </Button>
              <Button onClick={() => {
                handleSelectAndClose();
                setIsLargePreviewOpen(false);
              }}>
                Seleccionar Esta Plantilla
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </DialogContent>
    </Dialog>
  );
}