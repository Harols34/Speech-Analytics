import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Trash2, Plus, Download, Printer, Eye, Search } from "lucide-react";
import TemplateGalleryModal from "./TemplateGalleryModal";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useDetailedMetrics } from "@/hooks/useDetailedMetrics";
import { format, startOfMonth, endOfMonth, subMonths } from "date-fns";
import { toast } from "sonner";
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
interface LineItem {
  id: string;
  name: string;
  description: string;
  quantity: number;
  amount: number;
  total: number;
}
interface InvoiceData {
  billTo: {
    name: string;
    phone: string;
    address: string;
  };
  shipTo: {
    sameAsBillTo: boolean;
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
  items: LineItem[];
}
interface TemplateCustomization {
  fontFamily: string;
  primaryColor: string;
  backgroundColor: string;
  accentColor: string;
}
interface Account {
  id: string;
  name: string;
}
const INITIAL_DATA: InvoiceData = {
  billTo: {
    name: "",
    phone: "3000000000",
    address: "Carrera 16a 79 25"
  },
  shipTo: {
    sameAsBillTo: true,
    name: "",
    phone: "",
    address: ""
  },
  invoiceInfo: {
    number: "",
    invoiceDate: format(new Date(), 'yyyy-MM-dd'),
    paymentDate: format(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd')
  },
  company: {
    name: "Convert-IA",
    phone: "3142334784",
    address: "Bogotá, Colombia",
    department: "INNOVATION AND AI SOLUTIONS"
  },
  items: []
};

// Template Components (same as in TemplateGalleryModal)
const Template1 = ({
  data,
  customization
}: {
  data: InvoiceData;
  customization: TemplateCustomization;
}) => {
  const subtotal = data.items.reduce((sum, item) => sum + item.total, 0);
  return <div className={`${customization.fontFamily} p-8 shadow-lg`} style={{
    backgroundColor: customization.backgroundColor
  }}>
      <div className="flex justify-between items-start mb-8">
        <div className="flex items-center gap-3">
          <img src="https://www.convertia.com/favicon/favicon-convertia.png" alt="Convert-IA" className="h-10 w-10" />
          <div>
            <h1 className="text-2xl font-bold" style={{
            color: customization.primaryColor
          }}>Convert-IA</h1>
            <p className="text-sm text-gray-600">Soluciones de IA</p>
          </div>
        </div>
        <div className="text-right">
          <h2 className="text-3xl font-bold" style={{
          color: customization.primaryColor
        }}>FACTURA</h2>
          <p className="text-sm text-gray-600">#{data.invoiceInfo.number}</p>
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-8 mb-8">
        <div>
          <h3 className="font-semibold mb-2" style={{
          color: customization.primaryColor
        }}>Facturar a:</h3>
          <p className="font-medium">{data.billTo.name}</p>
          <p className="text-gray-600">{data.billTo.address}</p>
          <p className="text-gray-600">Tel: {data.billTo.phone}</p>
        </div>
        <div>
          <h3 className="font-semibold mb-2" style={{
          color: customization.primaryColor
        }}>De:</h3>
          <p className="font-medium">{data.company.name}</p>
          <p className="text-gray-600">{data.company.department}</p>
          <p className="text-gray-600">{data.company.address}</p>
          <p className="text-gray-600">Tel: {data.company.phone}</p>
        </div>
      </div>

      <div className="mb-8">
        <table className="w-full border-collapse">
          <thead>
            <tr style={{
            backgroundColor: customization.accentColor
          }} className="text-white">
              <th className="p-3 text-left">Descripción</th>
              <th className="p-3 text-center">Cantidad</th>
              <th className="p-3 text-right">Precio</th>
              <th className="p-3 text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            {data.items.map((item, index) => <tr key={index} className="border-b">
                <td className="p-3">
                  <div className="font-medium">{item.name}</div>
                  <div className="text-sm text-gray-600">{item.description}</div>
                </td>
                <td className="p-3 text-center">{item.quantity}</td>
                <td className="p-3 text-right">${item.amount.toFixed(2)}</td>
                <td className="p-3 text-right">${item.total.toFixed(2)}</td>
              </tr>)}
          </tbody>
        </table>
      </div>

      <div className="text-right">
        <div className="inline-block">
          <div className="flex justify-between mb-2 w-48">
            <span>Subtotal:</span>
            <span>${subtotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between font-bold text-lg pt-2 border-t" style={{
          color: customization.primaryColor
        }}>
            <span>Total:</span>
            <span>${subtotal.toFixed(2)} USD</span>
          </div>
        </div>
      </div>
    </div>;
};
const Template2 = ({
  data,
  customization
}: {
  data: InvoiceData;
  customization: TemplateCustomization;
}) => {
  const subtotal = data.items.reduce((sum, item) => sum + item.total, 0);
  return <div className={`${customization.fontFamily} shadow-lg`} style={{
    backgroundColor: customization.backgroundColor
  }}>
      <div className="p-8" style={{
      backgroundColor: customization.primaryColor
    }}>
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
            <div className="p-4 rounded-lg" style={{
            backgroundColor: `${customization.accentColor}20`
          }}>
              <h3 className="font-semibold mb-2" style={{
              color: customization.primaryColor
            }}>Facturar a:</h3>
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
              <thead style={{
              backgroundColor: customization.accentColor
            }} className="text-white">
                <tr>
                  <th className="p-4 text-left">Artículo</th>
                  <th className="p-4 text-center">Cant.</th>
                  <th className="p-4 text-right">Precio</th>
                  <th className="p-4 text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((item, index) => <tr key={index} className="border-b">
                    <td className="p-4">
                      <div className="font-medium">{item.name}</div>
                      <div className="text-sm text-gray-600">{item.description}</div>
                    </td>
                    <td className="p-4 text-center">{item.quantity}</td>
                    <td className="p-4 text-right">${item.amount.toFixed(2)}</td>
                    <td className="p-4 text-right font-semibold">${item.total.toFixed(2)}</td>
                  </tr>)}
              </tbody>
            </table>
          </div>
        </div>

        <div className="flex justify-end">
          <div className="w-64 p-4 rounded-lg" style={{
          backgroundColor: `${customization.primaryColor}10`
        }}>
            <div className="flex justify-between mb-2">
              <span>Subtotal:</span>
              <span>${subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between font-bold text-xl pt-2 border-t" style={{
            color: customization.primaryColor
          }}>
              <span>Total USD:</span>
              <span>${subtotal.toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>;
};
const Template3 = ({
  data,
  customization
}: {
  data: InvoiceData;
  customization: TemplateCustomization;
}) => {
  const subtotal = data.items.reduce((sum, item) => sum + item.total, 0);
  return <div className={`${customization.fontFamily} p-8 shadow-lg border-l-8`} style={{
    backgroundColor: customization.backgroundColor,
    borderLeftColor: customization.primaryColor
  }}>
      <div className="text-center mb-8">
        <img src="https://www.convertia.com/favicon/favicon-convertia.png" alt="Convert-IA" className="h-16 w-16 mx-auto mb-4" />
        <h1 className="text-4xl font-bold" style={{
        color: customization.primaryColor
      }}>FACTURA</h1>
        <p className="text-lg">#{data.invoiceInfo.number}</p>
      </div>
      
      <div className="grid grid-cols-3 gap-6 mb-8">
        <div className="text-center">
          <h3 className="font-semibold mb-2 pb-1 border-b-2" style={{
          borderColor: customization.accentColor
        }}>Factura de</h3>
          <p className="font-medium">{data.company.name}</p>
          <p className="text-sm">{data.company.department}</p>
          <p className="text-sm">{data.company.address}</p>
          <p className="text-sm">Tel: {data.company.phone}</p>
        </div>
        <div className="text-center">
          <h3 className="font-semibold mb-2 pb-1 border-b-2" style={{
          borderColor: customization.accentColor
        }}>Facturar a</h3>
          <p className="font-medium">{data.billTo.name}</p>
          <p className="text-sm">{data.billTo.address}</p>
          <p className="text-sm">Tel: {data.billTo.phone}</p>
        </div>
        <div className="text-center">
          <h3 className="font-semibold mb-2 pb-1 border-b-2" style={{
          borderColor: customization.accentColor
        }}>Fechas</h3>
          <p className="text-sm"><strong>Factura:</strong> {data.invoiceInfo.invoiceDate}</p>
          <p className="text-sm"><strong>Vencimiento:</strong> {data.invoiceInfo.paymentDate}</p>
        </div>
      </div>

      <div className="mb-8">
        <div className="rounded-lg overflow-hidden" style={{
        border: `2px solid ${customization.accentColor}`
      }}>
          <div className="p-4 text-white text-center font-bold" style={{
          backgroundColor: customization.primaryColor
        }}>
            DETALLES DE LA FACTURA
          </div>
          <table className="w-full">
            <thead style={{
            backgroundColor: `${customization.accentColor}30`
          }}>
              <tr>
                <th className="p-3 text-left">Descripción</th>
                <th className="p-3 text-center">Cant.</th>
                <th className="p-3 text-right">Precio</th>
                <th className="p-3 text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((item, index) => <tr key={index} className="border-b">
                  <td className="p-3">
                    <div className="font-medium">{item.name}</div>
                    <div className="text-sm text-gray-600">{item.description}</div>
                  </td>
                  <td className="p-3 text-center">{item.quantity}</td>
                  <td className="p-3 text-right">${item.amount.toFixed(2)}</td>
                  <td className="p-3 text-right font-semibold">${item.total.toFixed(2)}</td>
                </tr>)}
            </tbody>
          </table>
        </div>
      </div>

      <div className="text-center">
        <div className="inline-block p-6 rounded-lg" style={{
        backgroundColor: `${customization.primaryColor}15`
      }}>
          <div className="text-2xl font-bold" style={{
          color: customization.primaryColor
        }}>
            Total: ${subtotal.toFixed(2)} USD
          </div>
        </div>
      </div>
    </div>;
};
const TEMPLATE_PREVIEWS = [{
  id: 1,
  name: "Plantilla Clásica",
  component: Template1
}, {
  id: 2,
  name: "Plantilla Moderna",
  component: Template2
}, {
  id: 3,
  name: "Plantilla Minimalista",
  component: Template3
}];
export default function InvoiceGenerator() {
  const [data, setData] = useState<InvoiceData>(INITIAL_DATA);
  const [selectedTemplate, setSelectedTemplate] = useState<number>(1);
  const [selectedAccount, setSelectedAccount] = useState<string>("");
  const [invoiceCounter, setInvoiceCounter] = useState<number>(1);
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState<boolean>(false);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState<boolean>(false);
  const [selectedMonth, setSelectedMonth] = useState<Date>(new Date());
  const [dateFrom, setDateFrom] = useState<string>(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
  const [dateTo, setDateTo] = useState<string>(format(endOfMonth(new Date()), 'yyyy-MM-dd'));
  const [customization, setCustomization] = useState<TemplateCustomization>({
    fontFamily: 'font-sans',
    primaryColor: 'rgb(37, 99, 235)',
    backgroundColor: 'rgb(255, 255, 255)',
    accentColor: 'rgb(59, 130, 246)'
  });

  // Get accounts
  const {
    data: accounts,
    isLoading: loadingAccounts
  } = useQuery({
    queryKey: ['accounts'],
    queryFn: async () => {
      const {
        data,
        error
      } = await supabase.from('accounts').select('id, name').order('name');
      if (error) {
        console.error('Error fetching accounts:', error);
        throw error;
      }
      return data as Account[];
    }
  });

  // Get metrics for selected account and date range
  const {
    data: metricsData,
    refetch: refetchMetrics
  } = useDetailedMetrics(selectedAccount || "all", dateFrom, dateTo);

  // Refetch metrics when date range changes
  useEffect(() => {
    if (selectedAccount) {
      refetchMetrics();
    }
  }, [dateFrom, dateTo, selectedAccount, refetchMetrics]);

  // Auto-fill invoice data when account is selected
  useEffect(() => {
    if (selectedAccount && metricsData && metricsData.length > 0) {
      const accountMetrics = metricsData.find(m => m.account_id === selectedAccount);
      if (accountMetrics) {
        // Calculate costs - Separated by Voice and Chat modes
        const infraCost = 1; // Fixed infra quantity
        const hoursUsed = accountMetrics.uso_transcripcion_mes;
        const hoursUnitPrice = 0.50; // Voice mode: hours * $0.50
        const hoursTotal = hoursUsed * hoursUnitPrice;
        const trainingMinutesUsed = accountMetrics.uso_minutos_entrenamiento_mes || 0;
        const trainingUnitPrice = 0.40; // Voice mode: minutes * $0.40
        const trainingTotal = trainingMinutesUsed * trainingUnitPrice;
        const chatMessagesUsed = accountMetrics.uso_mensajes_chat_mes || 0;
        const chatUnitPrice = 0.0030; // Chat mode: messages * $0.0030
        const chatTotal = chatMessagesUsed * chatUnitPrice;

        // Auto-fill bill to with account name
        const newData = {
          ...data,
          billTo: {
            name: accountMetrics.account_name,
            phone: "3000000000",
            address: "Carrera 16a 79 25"
          },
          invoiceInfo: {
            ...data.invoiceInfo,
            number: `INV-${invoiceCounter.toString().padStart(4, '0')}`
          },
          items: [{
            id: "infra",
            name: "Infraestructura",
            description: "Servicios de infraestructura mensual",
            quantity: infraCost,
            amount: 25.00,
            total: 25.00
          }, {
            id: "voice-hours",
            name: "transcripción",
            description: `Horas procesadas: ${hoursUsed.toFixed(2)}`,
            quantity: parseFloat(hoursUsed.toFixed(2)),
            amount: hoursUnitPrice,
            total: parseFloat((hoursUsed * hoursUnitPrice).toFixed(2))
          }, {
            id: "voice-training",
            name: "Modo Voz - Minutos de Entrenamiento",
            description: `Minutos utilizados: ${trainingMinutesUsed.toFixed(2)}`,
            quantity: parseFloat(trainingMinutesUsed.toFixed(2)),
            amount: trainingUnitPrice,
            total: parseFloat(trainingTotal.toFixed(2))
          }, {
            id: "chat-messages",
            name: "Modo Chat - Mensajes de IA",
            description: `Mensajes generados: ${chatMessagesUsed.toLocaleString()}`,
            quantity: chatMessagesUsed,
            amount: chatUnitPrice,
            total: parseFloat(chatTotal.toFixed(4))
          }]
        };
        setData(newData);
      }
    }
  }, [selectedAccount, metricsData, invoiceCounter]);

  // Load/save invoice counter from localStorage
  useEffect(() => {
    const savedCounter = localStorage.getItem('invoiceCounter');
    if (savedCounter) {
      setInvoiceCounter(parseInt(savedCounter, 10));
    }
  }, []);
  const saveInvoiceCounter = (counter: number) => {
    localStorage.setItem('invoiceCounter', counter.toString());
    setInvoiceCounter(counter);
  };

  // Update date range when selected month changes
  useEffect(() => {
    const monthStart = startOfMonth(selectedMonth);
    const monthEnd = endOfMonth(selectedMonth);
    setDateFrom(format(monthStart, 'yyyy-MM-dd'));
    setDateTo(format(monthEnd, 'yyyy-MM-dd'));
  }, [selectedMonth]);

  // Generate month options for the last 12 months
  const generateMonthOptions = () => {
    const options = [];
    const months = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    for (let i = 0; i < 12; i++) {
      const date = subMonths(new Date(), i);
      const monthName = months[date.getMonth()];
      const year = date.getFullYear();
      options.push({
        value: format(date, 'yyyy-MM'),
        label: `${monthName} ${year}`,
        date: date
      });
    }
    return options;
  };
  const handleMonthChange = (monthKey: string) => {
    const monthOptions = generateMonthOptions();
    const selectedOption = monthOptions.find(option => option.value === monthKey);
    if (selectedOption) {
      setSelectedMonth(selectedOption.date);
    }
  };
  const updateField = <T extends keyof InvoiceData,>(section: T, field: string, value: any) => {
    setData(prev => ({
      ...prev,
      [section]: {
        ...(prev[section] as any),
        [field]: value
      }
    }));
  };
  const addItem = () => {
    const newItem: LineItem = {
      id: Date.now().toString(),
      name: "",
      description: "",
      quantity: 1,
      amount: 0,
      total: 0
    };
    setData(prev => ({
      ...prev,
      items: [...prev.items, newItem]
    }));
  };
  const updateItem = (id: string, field: keyof LineItem, value: any) => {
    setData(prev => ({
      ...prev,
      items: prev.items.map(item => {
        if (item.id === id) {
          const updated = {
            ...item,
            [field]: value
          };
          if (field === 'quantity' || field === 'amount') {
            updated.total = updated.quantity * updated.amount;
          }
          return updated;
        }
        return item;
      })
    }));
  };
  const removeItem = (id: string) => {
    setData(prev => ({
      ...prev,
      items: prev.items.filter(item => item.id !== id)
    }));
  };
  const calculateSubtotal = () => {
    return data.items.reduce((sum, item) => sum + item.total, 0);
  };
  const handleDownloadPDF = async () => {
    try {
      // Create a hidden div with the invoice content
      const invoiceElement = document.createElement('div');
      invoiceElement.style.position = 'absolute';
      invoiceElement.style.top = '-9999px';
      invoiceElement.style.left = '-9999px';
      invoiceElement.style.backgroundColor = 'white';
      invoiceElement.style.width = '210mm';
      invoiceElement.style.padding = '20mm';

      // Get the selected template component
      const SelectedTemplate = TEMPLATE_PREVIEWS.find(t => t.id === selectedTemplate)?.component || Template1;

      // Render the template (we need to use React.render approach or innerHTML)
      invoiceElement.innerHTML = `
        <div style="font-family: ${customization.fontFamily}; background-color: ${customization.backgroundColor}; padding: 2rem;">
          <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 2rem;">
            <div style="display: flex; align-items: center; gap: 1rem;">
              <img src="https://www.convertia.com/favicon/favicon-convertia.png" alt="Convert-IA" style="height: 2.5rem; width: 2.5rem;" />
              <div>
                <h1 style="color: ${customization.primaryColor}; font-size: 1.5rem; font-weight: bold; margin: 0;">Convert-IA</h1>
                <p style="color: #6b7280; font-size: 0.875rem; margin: 0;">Soluciones de IA</p>
              </div>
            </div>
            <div style="text-align: right;">
              <h2 style="color: ${customization.primaryColor}; font-size: 1.875rem; font-weight: bold; margin: 0;">FACTURA</h2>
              <p style="color: #6b7280; font-size: 0.875rem; margin: 0;">#${data.invoiceInfo.number}</p>
            </div>
          </div>
          
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 2rem; margin-bottom: 2rem;">
            <div>
              <h3 style="color: ${customization.primaryColor}; font-weight: 600; margin-bottom: 0.5rem;">Facturar a:</h3>
              <p style="font-weight: 500; margin: 0;">${data.billTo.name}</p>
              <p style="color: #6b7280; margin: 0;">${data.billTo.address}</p>
              <p style="color: #6b7280; margin: 0;">Tel: ${data.billTo.phone}</p>
            </div>
            <div>
              <h3 style="color: ${customization.primaryColor}; font-weight: 600; margin-bottom: 0.5rem;">De:</h3>
              <p style="font-weight: 500; margin: 0;">${data.company.name}</p>
              <p style="color: #6b7280; margin: 0;">${data.company.department}</p>
              <p style="color: #6b7280; margin: 0;">${data.company.address}</p>
              <p style="color: #6b7280; margin: 0;">Tel: ${data.company.phone}</p>
            </div>
          </div>

          <div style="margin-bottom: 2rem;">
            <table style="width: 100%; border-collapse: collapse;">
              <thead>
                <tr style="background-color: ${customization.accentColor}; color: white;">
                  <th style="padding: 0.75rem; text-align: left;">Descripción</th>
                  <th style="padding: 0.75rem; text-align: center;">Cantidad</th>
                  <th style="padding: 0.75rem; text-align: right;">Precio</th>
                  <th style="padding: 0.75rem; text-align: right;">Total</th>
                </tr>
              </thead>
              <tbody>
                ${data.items.map(item => `
                  <tr style="border-bottom: 1px solid #e5e7eb;">
                    <td style="padding: 0.75rem;">
                      <div style="font-weight: 500;">${item.name}</div>
                      <div style="color: #6b7280; font-size: 0.875rem;">${item.description}</div>
                    </td>
                    <td style="padding: 0.75rem; text-align: center;">${item.quantity}</td>
                    <td style="padding: 0.75rem; text-align: right;">$${item.amount.toFixed(2)}</td>
                    <td style="padding: 0.75rem; text-align: right;">$${item.total.toFixed(2)}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>

          <div style="text-align: right;">
            <div style="display: inline-block;">
              <div style="display: flex; justify-content: space-between; margin-bottom: 0.5rem; width: 12rem;">
                <span>Subtotal:</span>
                <span>$${calculateSubtotal().toFixed(2)}</span>
              </div>
              <div style="display: flex; justify-content: space-between; font-weight: bold; font-size: 1.125rem; padding-top: 0.5rem; border-top: 1px solid #e5e7eb; color: ${customization.primaryColor};">
                <span>Total:</span>
                <span>$${calculateSubtotal().toFixed(2)} USD</span>
              </div>
            </div>
          </div>
        </div>
      `;
      document.body.appendChild(invoiceElement);

      // Generate canvas from the element
      const canvas = await html2canvas(invoiceElement, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff'
      });

      // Remove the temporary element
      document.body.removeChild(invoiceElement);

      // Create PDF
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgData = canvas.toDataURL('image/png');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = canvas.height * pdfWidth / canvas.width;
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`Factura-${data.invoiceInfo.number}.pdf`);

      // Increment invoice counter when downloading
      saveInvoiceCounter(invoiceCounter + 1);
      toast.success(`Factura ${data.invoiceInfo.number} descargada en PDF`);
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('Error al generar el PDF');
    }
  };
  const handleDownloadWord = async () => {
    try {
      const subtotal = calculateSubtotal();

      // Create HTML content for Word document
      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>Factura ${data.invoiceInfo.number}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 40px; }
            .header { text-align: center; margin-bottom: 30px; }
            .company-logo { display: flex; align-items: center; gap: 15px; margin-bottom: 20px; }
            .invoice-title { color: #2563EB; font-size: 28px; font-weight: bold; margin: 0; }
            .invoice-number { color: #6B7280; font-size: 16px; margin: 5px 0; }
            .section { margin: 20px 0; }
            .section-title { color: #2563EB; font-weight: bold; font-size: 16px; margin-bottom: 10px; }
            .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 30px; margin: 20px 0; }
            .info-box { padding: 15px; border-left: 4px solid #3B82F6; background-color: #F8FAFC; }
            table { width: 100%; border-collapse: collapse; margin: 20px 0; }
            th { background-color: #3B82F6; color: white; padding: 12px; text-align: left; }
            td { padding: 12px; border-bottom: 1px solid #E5E7EB; }
            .item-name { font-weight: bold; }
            .item-description { color: #6B7280; font-size: 14px; }
            .total-section { text-align: right; margin-top: 30px; }
            .total-box { display: inline-block; padding: 20px; border: 2px solid #2563EB; }
            .total-amount { color: #2563EB; font-size: 24px; font-weight: bold; }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="company-logo">
              <div>
                <h1 style="color: #2563EB; font-size: 24px; margin: 0;">Convert-IA</h1>
                <p style="color: #6B7280; margin: 0;">Soluciones de IA</p>
              </div>
            </div>
            <h2 class="invoice-title">FACTURA</h2>
            <p class="invoice-number">#${data.invoiceInfo.number}</p>
          </div>

          <div class="info-grid">
            <div class="info-box">
              <div class="section-title">Facturar a:</div>
              <div class="item-name">${data.billTo.name}</div>
              <div>${data.billTo.address}</div>
              <div>Tel: ${data.billTo.phone}</div>
            </div>
            <div class="info-box">
              <div class="section-title">De:</div>
              <div class="item-name">${data.company.name}</div>
              <div>${data.company.department}</div>
              <div>${data.company.address}</div>
              <div>Tel: ${data.company.phone}</div>
            </div>
          </div>

          <div class="section">
            <div class="section-title">DETALLES DE LA FACTURA</div>
            <table>
              <thead>
                <tr>
                  <th>Descripción</th>
                  <th style="text-align: center;">Cantidad</th>
                  <th style="text-align: right;">Precio</th>
                  <th style="text-align: right;">Total</th>
                </tr>
              </thead>
              <tbody>
                ${data.items.map(item => `
                  <tr>
                    <td>
                      <div class="item-name">${item.name}</div>
                      <div class="item-description">${item.description}</div>
                    </td>
                    <td style="text-align: center;">${item.quantity}</td>
                    <td style="text-align: right;">$${item.amount.toFixed(2)}</td>
                    <td style="text-align: right;">$${item.total.toFixed(2)}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>

          <div class="total-section">
            <div class="total-box">
              <div>Subtotal: $${subtotal.toFixed(2)}</div>
              <div class="total-amount">Total: $${subtotal.toFixed(2)} USD</div>
            </div>
          </div>

          <div style="margin-top: 40px; text-align: center; color: #6B7280; font-size: 12px;">
            <p>Fecha de emisión: ${data.invoiceInfo.invoiceDate}</p>
            <p>Fecha de vencimiento: ${data.invoiceInfo.paymentDate}</p>
          </div>
        </body>
        </html>
      `;

      // Create blob and download
      const blob = new Blob([htmlContent], {
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      });

      // Create download link
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Factura-${data.invoiceInfo.number}.doc`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      // Increment invoice counter when downloading
      saveInvoiceCounter(invoiceCounter + 1);
      toast.success(`Factura ${data.invoiceInfo.number} descargada en Word`);
    } catch (error) {
      console.error('Error generating Word document:', error);
      toast.error('Error al generar el documento Word');
    }
  };
  const handlePrint = () => {
    try {
      // Create a new window for printing
      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        toast.error('No se pudo abrir la ventana de impresión');
        return;
      }
      const subtotal = calculateSubtotal();

      // Generate HTML content for printing
      const printContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>Factura ${data.invoiceInfo.number}</title>
          <style>
            @media print {
              @page { margin: 0.5in; }
            }
            body { 
              font-family: Arial, sans-serif; 
              margin: 0; 
              padding: 20px;
              color: #000;
              background: white;
            }
            .invoice-container {
              max-width: 800px;
              margin: 0 auto;
            }
            .header {
              display: flex;
              justify-content: space-between;
              align-items: flex-start;
              margin-bottom: 30px;
              padding-bottom: 20px;
              border-bottom: 2px solid ${customization.primaryColor};
            }
            .logo-section {
              display: flex;
              align-items: center;
              gap: 15px;
            }
            .company-name {
              color: ${customization.primaryColor};
              font-size: 24px;
              font-weight: bold;
              margin: 0;
            }
            .company-tagline {
              color: #6B7280;
              font-size: 14px;
              margin: 0;
            }
            .invoice-title {
              color: ${customization.primaryColor};
              font-size: 36px;
              font-weight: bold;
              margin: 0;
              text-align: right;
            }
            .invoice-number {
              color: #6B7280;
              font-size: 14px;
              margin: 5px 0 0 0;
              text-align: right;
            }
            .billing-info {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 40px;
              margin: 30px 0;
            }
            .info-section h3 {
              color: ${customization.primaryColor};
              font-weight: bold;
              font-size: 16px;
              margin-bottom: 10px;
            }
            .info-section p {
              margin: 3px 0;
              line-height: 1.4;
            }
            .client-name {
              font-weight: bold;
              font-size: 16px;
            }
            .items-table {
              width: 100%;
              border-collapse: collapse;
              margin: 30px 0;
            }
            .items-table th {
              background-color: ${customization.accentColor};
              color: white;
              padding: 12px;
              text-align: left;
              font-weight: bold;
            }
            .items-table th:nth-child(2) { text-align: center; }
            .items-table th:nth-child(3), 
            .items-table th:nth-child(4) { text-align: right; }
            .items-table td {
              padding: 12px;
              border-bottom: 1px solid #E5E7EB;
            }
            .items-table td:nth-child(2) { text-align: center; }
            .items-table td:nth-child(3), 
            .items-table td:nth-child(4) { text-align: right; }
            .item-name {
              font-weight: bold;
              margin-bottom: 3px;
            }
            .item-description {
              color: #6B7280;
              font-size: 13px;
            }
            .totals-section {
              text-align: right;
              margin-top: 30px;
            }
            .totals-box {
              display: inline-block;
              min-width: 250px;
            }
            .subtotal-row {
              display: flex;
              justify-content: space-between;
              margin-bottom: 8px;
              padding-bottom: 8px;
            }
            .total-row {
              display: flex;
              justify-content: space-between;
              font-weight: bold;
              font-size: 18px;
              padding-top: 10px;
              border-top: 2px solid ${customization.primaryColor};
              color: ${customization.primaryColor};
            }
            .dates-section {
              margin-top: 40px;
              padding-top: 20px;
              border-top: 1px solid #E5E7EB;
              text-align: center;
              color: #6B7280;
              font-size: 12px;
            }
          </style>
        </head>
        <body>
          <div class="invoice-container">
            <div class="header">
              <div class="logo-section">
                <div>
                  <h1 class="company-name">Convert-IA</h1>
                  <p class="company-tagline">Soluciones de IA</p>
                </div>
              </div>
              <div>
                <h2 class="invoice-title">FACTURA</h2>
                <p class="invoice-number">#${data.invoiceInfo.number}</p>
              </div>
            </div>

            <div class="billing-info">
              <div class="info-section">
                <h3>Facturar a:</h3>
                <p class="client-name">${data.billTo.name}</p>
                <p>${data.billTo.address}</p>
                <p>Tel: ${data.billTo.phone}</p>
              </div>
              <div class="info-section">
                <h3>De:</h3>
                <p class="client-name">${data.company.name}</p>
                <p>${data.company.department}</p>
                <p>${data.company.address}</p>
                <p>Tel: ${data.company.phone}</p>
              </div>
            </div>

            <table class="items-table">
              <thead>
                <tr>
                  <th>Descripción</th>
                  <th>Cantidad</th>
                  <th>Precio</th>
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                ${data.items.map(item => `
                  <tr>
                    <td>
                      <div class="item-name">${item.name}</div>
                      <div class="item-description">${item.description}</div>
                    </td>
                    <td>${item.quantity}</td>
                    <td>$${item.amount.toFixed(2)}</td>
                    <td><strong>$${item.total.toFixed(2)}</strong></td>
                  </tr>
                `).join('')}
              </tbody>
            </table>

            <div class="totals-section">
              <div class="totals-box">
                <div class="subtotal-row">
                  <span>Subtotal:</span>
                  <span>$${subtotal.toFixed(2)}</span>
                </div>
                <div class="total-row">
                  <span>Total:</span>
                  <span>$${subtotal.toFixed(2)} USD</span>
                </div>
              </div>
            </div>

            <div class="dates-section">
              <p>Fecha de emisión: ${data.invoiceInfo.invoiceDate}</p>
              <p>Fecha de vencimiento: ${data.invoiceInfo.paymentDate}</p>
            </div>
          </div>
        </body>
        </html>
      `;

      // Write content to print window
      printWindow.document.write(printContent);
      printWindow.document.close();

      // Wait for content to load, then print
      printWindow.onload = () => {
        setTimeout(() => {
          printWindow.print();
          printWindow.close();
        }, 100);
      };

      // Increment invoice counter when printing  
      saveInvoiceCounter(invoiceCounter + 1);
      toast.success(`Factura ${data.invoiceInfo.number} enviada a imprimir`);
    } catch (error) {
      console.error('Error printing invoice:', error);
      toast.error('Error al imprimir la factura');
    }
  };
  const SelectedTemplate = TEMPLATE_PREVIEWS.find(t => t.id === selectedTemplate)?.component || Template1;
  return <div className="w-full max-w-[1400px] mx-auto p-4">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Panel - Form */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-xl font-bold">Generador de Facturas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Month Selection */}
              <div>
                <Label className="text-sm font-medium mb-3 block">Seleccionar mes para facturar</Label>
                <Select value={format(selectedMonth, 'yyyy-MM')} onValueChange={handleMonthChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona un mes" />
                  </SelectTrigger>
                  <SelectContent>
                    {generateMonthOptions().map(option => <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              {/* Account Selection */}
              <div>
                <Label className="text-sm font-medium mb-3 block">Seleccionar cuenta para facturar</Label>
                <Select value={selectedAccount} onValueChange={setSelectedAccount}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona una cuenta" />
                  </SelectTrigger>
                  <SelectContent>
                    {loadingAccounts ? <SelectItem value="loading" disabled>Cargando cuentas...</SelectItem> : accounts?.map(account => <SelectItem key={account.id} value={account.id}>
                          {account.name}
                        </SelectItem>)}
                  </SelectContent>
                </Select>
                {selectedAccount && <p className="text-xs text-muted-foreground mt-2">
                    Los datos se llenarán automáticamente basados en el uso de la cuenta seleccionada
                  </p>}
              </div>

              {/* Bill To Section */}
              <div>
                <Label className="text-sm font-medium mb-3 block">Facturar a</Label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">Nombre</Label>
                    <Input placeholder="Nombre del cliente" value={data.billTo.name} onChange={e => updateField('billTo', 'name', e.target.value)} />
                  </div>
                  <div>
                    <Label className="text-xs">Teléfono</Label>
                    <Input placeholder="(555) 123-4567" value={data.billTo.phone} onChange={e => updateField('billTo', 'phone', e.target.value)} />
                  </div>
                </div>
                <div className="mt-2">
                  <Label className="text-xs">Dirección</Label>
                  <Input placeholder="Dirección del cliente" value={data.billTo.address} onChange={e => updateField('billTo', 'address', e.target.value)} />
                </div>
              </div>

              {/* Ship To Section */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Label className="text-sm font-medium">Enviar a</Label>
                  <Checkbox id="sameAsBillTo" checked={data.shipTo.sameAsBillTo} onCheckedChange={checked => updateField('shipTo', 'sameAsBillTo', checked)} />
                  <Label htmlFor="sameAsBillTo" className="text-xs">Igual que facturar a</Label>
                </div>
                {!data.shipTo.sameAsBillTo && <div className="space-y-2">
                    <Input placeholder="Nombre" value={data.shipTo.name} onChange={e => updateField('shipTo', 'name', e.target.value)} />
                    <Input placeholder="Teléfono" value={data.shipTo.phone} onChange={e => updateField('shipTo', 'phone', e.target.value)} />
                    <Input placeholder="Dirección" value={data.shipTo.address} onChange={e => updateField('shipTo', 'address', e.target.value)} />
                  </div>}
              </div>

              {/* Invoice Information */}
              <div>
                <Label className="text-sm font-medium mb-3 block">Información de la factura</Label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <Label className="text-xs">Número de factura</Label>
                    <Input placeholder="V37" value={data.invoiceInfo.number} onChange={e => updateField('invoiceInfo', 'number', e.target.value)} />
                  </div>
                  <div>
                    <Label className="text-xs">Fecha de factura</Label>
                    <Input type="date" value={data.invoiceInfo.invoiceDate} onChange={e => updateField('invoiceInfo', 'invoiceDate', e.target.value)} />
                  </div>
                  <div>
                    <Label className="text-xs">Fecha de vencimiento</Label>
                    <Input type="date" value={data.invoiceInfo.paymentDate} onChange={e => updateField('invoiceInfo', 'paymentDate', e.target.value)} />
                  </div>
                </div>
              </div>

              {/* Your Company */}
              <div>
                <Label className="text-sm font-medium mb-3 block">Información de la empresa</Label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">Nombre de la empresa</Label>
                    <Input placeholder="Convert-IA" value={data.company.name} onChange={e => updateField('company', 'name', e.target.value)} />
                  </div>
                  <div>
                    <Label className="text-xs">Teléfono</Label>
                    <Input placeholder="(555) 555-5555" value={data.company.phone} onChange={e => updateField('company', 'phone', e.target.value)} />
                  </div>
                </div>
                <div className="mt-2">
                  <Label className="text-xs">Dirección</Label>
                  <Input placeholder="Dirección de la empresa" value={data.company.address} onChange={e => updateField('company', 'address', e.target.value)} />
                </div>
                <div className="mt-2">
                  <Label className="text-xs">Departamento</Label>
                  <Input placeholder="Departamento" value={data.company.department} onChange={e => updateField('company', 'department', e.target.value)} />
                </div>
              </div>

              {/* Item Details */}
              <div>
                <Label className="text-sm font-medium mb-3 block">Detalles de productos/servicios</Label>
                <div className="space-y-3">
                  {data.items.map(item => <Card key={item.id} className="p-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-2">
                        <div>
                          <Label className="text-xs">Nombre</Label>
                          <Input value={item.name} onChange={e => updateItem(item.id, 'name', e.target.value)} />
                        </div>
                        <div>
                          <Label className="text-xs">Cantidad</Label>
                          <Input type="number" value={item.quantity} onChange={e => updateItem(item.id, 'quantity', parseInt(e.target.value) || 0)} />
                        </div>
                        <div>
                          <Label className="text-xs">Precio (USD)</Label>
                          <Input type="number" step="0.01" value={item.amount} onChange={e => updateItem(item.id, 'amount', parseFloat(e.target.value) || 0)} />
                        </div>
                        <div>
                          <Label className="text-xs">Total (USD)</Label>
                          <div className="flex items-center gap-2">
                            <Input value={item.total.toFixed(2)} readOnly className="bg-muted" />
                            <Button variant="outline" size="sm" onClick={() => removeItem(item.id)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                      <div>
                        <Label className="text-xs">Descripción</Label>
                        <Textarea placeholder="Descripción del producto/servicio" value={item.description} onChange={e => updateItem(item.id, 'description', e.target.value)} className="mt-1" />
                      </div>
                    </Card>)}
                  
                  <Button onClick={addItem} variant="outline" className="w-full">
                    <Plus className="h-4 w-4 mr-2" />
                    Agregar producto/servicio
                  </Button>
                </div>
              </div>

              {/* Totals */}
              <Card className="p-4 bg-muted/50">
                <div className="text-right space-y-2">
                  <div className="text-lg font-semibold">
                    Subtotal: ${calculateSubtotal().toFixed(2)} USD
                  </div>
                  <div className="text-xl font-bold">
                    Total: ${calculateSubtotal().toFixed(2)} USD
                  </div>
                </div>
              </Card>
            </CardContent>
          </Card>
        </div>

        {/* Right Panel - Template Gallery and Preview */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Plantillas de facturación</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex gap-2">
                  <Button variant="outline" className="flex-1" size="lg" onClick={() => setIsTemplateModalOpen(true)}>
                    <Eye className="h-4 w-4 mr-2" />
                    Ver galería de plantillas
                  </Button>
                  
                  
                </div>
                
                <div className="text-center p-4 border rounded-lg bg-muted/20">
                  <p className="text-sm text-muted-foreground">
                    Plantilla seleccionada: <strong>Plantilla {selectedTemplate}</strong>
                  </p>
                </div>
              </div>
              
              <div className="space-y-4 mt-6">
                <Button className="w-full font-medium" size="lg" onClick={handleDownloadPDF} disabled={!selectedAccount || data.items.length === 0}>
                  <Download className="h-4 w-4 mr-2" />
                  Descargar PDF
                </Button>
                
                <Button className="w-full font-medium" size="lg" onClick={handleDownloadWord} disabled={!selectedAccount || data.items.length === 0}>
                  <Download className="h-4 w-4 mr-2" />
                  Descargar Word
                </Button>
                <Button className="w-full font-medium" size="lg" onClick={handlePrint} disabled={!selectedAccount || data.items.length === 0}>
                  <Printer className="h-4 w-4 mr-2" />
                  Imprimir Factura
                </Button>
              </div>
              
              {(!selectedAccount || data.items.length === 0) && <p className="text-xs text-muted-foreground text-center mt-4">
                  Selecciona una cuenta para habilitar las opciones de descarga e impresión
                </p>}
            </CardContent>
          </Card>
          
          {/* Live Preview */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle>Vista previa</CardTitle>
              <Button variant="outline" size="sm" onClick={() => setIsPreviewModalOpen(true)}>
                <Search className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              <div className="max-h-[500px] overflow-y-auto border rounded-lg bg-gray-50 p-4">
                <div className="scale-75 origin-top-left" style={{
                width: '133%',
                height: '133%'
              }}>
                  <SelectedTemplate data={data} customization={customization} />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
      
      {/* Preview Modal */}
      <Dialog open={isPreviewModalOpen} onOpenChange={setIsPreviewModalOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Vista previa completa de la factura</DialogTitle>
          </DialogHeader>
          <div className="p-4">
            <SelectedTemplate data={data} customization={customization} />
          </div>
        </DialogContent>
      </Dialog>

      {/* Template Gallery Modal */}
      <TemplateGalleryModal isOpen={isTemplateModalOpen} onClose={() => setIsTemplateModalOpen(false)} data={data} selectedTemplate={selectedTemplate} onSelectTemplate={setSelectedTemplate} customization={customization} onCustomizationChange={setCustomization} />
    </div>;
}