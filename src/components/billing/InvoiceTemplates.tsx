import React from "react";

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

interface InvoiceTemplateProps {
  data: InvoiceData;
  templateId: number;
}

export function InvoiceTemplate1({ data }: InvoiceTemplateProps) {
  const subtotal = data.items.reduce((sum, item) => sum + item.total, 0);
  
  return (
    <div className="bg-white p-8 shadow-lg max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex justify-between items-start mb-8">
        <div className="flex items-center gap-3">
          <img 
            src="https://www.convertia.com/favicon/favicon-convertia.png" 
            alt="Convert-IA Logo" 
            className="h-10 w-10"
          />
          <div>
            <h1 className="text-2xl font-bold text-blue-600">Convert-IA</h1>
            <p className="text-sm text-gray-600">Soluciones de IA</p>
          </div>
        </div>
        <div className="text-right">
          <h2 className="text-2xl font-bold text-gray-800">FACTURA</h2>
          <p className="text-gray-600">#{data.invoiceInfo.number || "000001"}</p>
        </div>
      </div>

      {/* Company Info */}
      <div className="mb-8">
        <h3 className="font-semibold text-gray-800 mb-2">De:</h3>
        <div className="text-gray-600">
          <p className="font-medium">{data.company.name || "Convert-IA"}</p>
          <p>{data.company.department || "INNOVATION AND AI SOLUTIONS"}</p>
          <p>{data.company.address || "Dirección de la empresa"}</p>
          <p>Tel: {data.company.phone || "Teléfono"}</p>
        </div>
      </div>

      {/* Bill To */}
      <div className="mb-8">
        <h3 className="font-semibold text-gray-800 mb-2">Facturar a:</h3>
        <div className="text-gray-600">
          <p className="font-medium">{data.billTo.name || "Nombre del cliente"}</p>
          <p>{data.billTo.address || "Dirección del cliente"}</p>
          <p>Tel: {data.billTo.phone || "Teléfono del cliente"}</p>
        </div>
      </div>

      {/* Invoice Details */}
      <div className="grid grid-cols-2 gap-4 mb-8">
        <div>
          <p className="text-gray-600">Fecha de emisión:</p>
          <p className="font-medium">{data.invoiceInfo.invoiceDate || new Date().toLocaleDateString()}</p>
        </div>
        <div>
          <p className="text-gray-600">Fecha de vencimiento:</p>
          <p className="font-medium">{data.invoiceInfo.paymentDate || new Date().toLocaleDateString()}</p>
        </div>
      </div>

      {/* Items Table */}
      <div className="mb-8">
        <table className="w-full border-collapse border border-gray-300">
          <thead>
            <tr className="bg-blue-50">
              <th className="border border-gray-300 p-3 text-left">Descripción</th>
              <th className="border border-gray-300 p-3 text-center">Cant.</th>
              <th className="border border-gray-300 p-3 text-right">Precio Unit.</th>
              <th className="border border-gray-300 p-3 text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            {data.items.length > 0 ? data.items.map((item, index) => (
              <tr key={index}>
                <td className="border border-gray-300 p-3">
                  <div className="font-medium">{item.name || `Producto/Servicio ${index + 1}`}</div>
                  <div className="text-sm text-gray-600">{item.description}</div>
                </td>
                <td className="border border-gray-300 p-3 text-center">{item.quantity || 1}</td>
                <td className="border border-gray-300 p-3 text-right">${(item.amount || 0).toFixed(2)}</td>
                <td className="border border-gray-300 p-3 text-right">${(item.total || 0).toFixed(2)}</td>
              </tr>
            )) : (
              <tr>
                <td className="border border-gray-300 p-3">
                  <div className="font-medium">Producto/Servicio de ejemplo</div>
                  <div className="text-sm text-gray-600">Descripción del servicio</div>
                </td>
                <td className="border border-gray-300 p-3 text-center">1</td>
                <td className="border border-gray-300 p-3 text-right">$0.00</td>
                <td className="border border-gray-300 p-3 text-right">$0.00</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Totals */}
      <div className="flex justify-end mb-8">
        <div className="w-64">
          <div className="flex justify-between py-2 border-b">
            <span>Subtotal:</span>
            <span>${subtotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between py-2 font-bold text-lg">
            <span>Total USD:</span>
            <span>${subtotal.toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="text-center text-gray-600 text-sm border-t pt-4">
        <p>Gracias por su confianza en Convert-IA</p>
        <p>Esta factura fue generada automáticamente</p>
      </div>
    </div>
  );
}

export function InvoiceTemplate2({ data }: InvoiceTemplateProps) {
  const subtotal = data.items.reduce((sum, item) => sum + item.total, 0);
  
  return (
    <div className="bg-white p-8 shadow-lg max-w-2xl mx-auto">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-800 text-white p-6 -m-8 mb-8">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <img 
              src="https://www.convertia.com/favicon/favicon-convertia.png" 
              alt="Convert-IA Logo" 
              className="h-12 w-12 bg-white p-2 rounded"
            />
            <div>
              <h1 className="text-2xl font-bold">Convert-IA</h1>
              <p className="text-blue-100">Inteligencia Artificial</p>
            </div>
          </div>
          <div className="text-right">
            <h2 className="text-2xl font-bold">INVOICE</h2>
            <p className="text-blue-100">#{data.invoiceInfo.number || "000001"}</p>
          </div>
        </div>
      </div>

      {/* Info Section */}
      <div className="grid grid-cols-2 gap-8 mb-8">
        <div>
          <h3 className="font-semibold text-gray-800 mb-3 text-blue-600">Información de la empresa:</h3>
          <div className="text-gray-700">
            <p className="font-medium">{data.company.name || "Convert-IA"}</p>
            <p>{data.company.department || "INNOVATION AND AI SOLUTIONS"}</p>
            <p>{data.company.address || "Dirección de la empresa"}</p>
            <p>Teléfono: {data.company.phone || "Teléfono"}</p>
          </div>
        </div>
        <div>
          <h3 className="font-semibold text-gray-800 mb-3 text-blue-600">Facturar a:</h3>
          <div className="text-gray-700">
            <p className="font-medium">{data.billTo.name || "Nombre del cliente"}</p>
            <p>{data.billTo.address || "Dirección del cliente"}</p>
            <p>Teléfono: {data.billTo.phone || "Teléfono del cliente"}</p>
          </div>
        </div>
      </div>

      {/* Dates */}
      <div className="bg-gray-50 p-4 rounded-lg mb-8">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <span className="font-medium text-gray-800">Fecha de emisión: </span>
            <span>{data.invoiceInfo.invoiceDate || new Date().toLocaleDateString()}</span>
          </div>
          <div>
            <span className="font-medium text-gray-800">Fecha de vencimiento: </span>
            <span>{data.invoiceInfo.paymentDate || new Date().toLocaleDateString()}</span>
          </div>
        </div>
      </div>

      {/* Items */}
      <div className="mb-8">
        <h3 className="font-semibold text-gray-800 mb-4 text-blue-600">Detalles de la factura:</h3>
        <div className="space-y-3">
          {data.items.length > 0 ? data.items.map((item, index) => (
            <div key={index} className="flex justify-between items-center p-4 border rounded-lg">
              <div className="flex-1">
                <h4 className="font-medium">{item.name || `Producto/Servicio ${index + 1}`}</h4>
                <p className="text-sm text-gray-600">{item.description}</p>
                <p className="text-sm text-gray-500">Cantidad: {item.quantity || 1} × ${(item.amount || 0).toFixed(2)}</p>
              </div>
              <div className="text-right">
                <p className="text-lg font-semibold">${(item.total || 0).toFixed(2)}</p>
              </div>
            </div>
          )) : (
            <div className="flex justify-between items-center p-4 border rounded-lg">
              <div className="flex-1">
                <h4 className="font-medium">Producto/Servicio de ejemplo</h4>
                <p className="text-sm text-gray-600">Descripción del servicio</p>
                <p className="text-sm text-gray-500">Cantidad: 1 × $0.00</p>
              </div>
              <div className="text-right">
                <p className="text-lg font-semibold">$0.00</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Total */}
      <div className="bg-blue-50 p-6 rounded-lg">
        <div className="flex justify-between items-center">
          <span className="text-xl font-semibold text-gray-800">Total a pagar (USD):</span>
          <span className="text-2xl font-bold text-blue-600">${subtotal.toFixed(2)}</span>
        </div>
      </div>

      {/* Footer */}
      <div className="text-center text-gray-600 text-sm mt-8 pt-4 border-t">
        <p className="font-medium">Convert-IA - Transformando el futuro con Inteligencia Artificial</p>
      </div>
    </div>
  );
}

export function InvoiceTemplate3({ data }: InvoiceTemplateProps) {
  const subtotal = data.items.reduce((sum, item) => sum + item.total, 0);
  
  return (
    <div className="bg-white p-8 shadow-lg max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex justify-between items-center mb-8 pb-6 border-b-2 border-blue-200">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <img 
              src="https://www.convertia.com/favicon/favicon-convertia.png" 
              alt="Convert-IA Logo" 
              className="h-8 w-8"
            />
            <h1 className="text-xl font-bold text-blue-700">Convert-IA</h1>
          </div>
          <p className="text-gray-600 text-sm">Soluciones de Inteligencia Artificial</p>
          <p className="text-gray-600 text-sm">{data.company.department || "INNOVATION AND AI SOLUTIONS"}</p>
          <p className="text-gray-600 text-sm">{data.company.address || "Dirección de la empresa"}</p>
          <p className="text-gray-600 text-sm">Tel: {data.company.phone || "Teléfono"}</p>
        </div>
        <div className="text-right">
          <div className="bg-blue-600 text-white px-4 py-2 rounded-lg mb-2">
            <h2 className="text-lg font-bold">FACTURA</h2>
          </div>
          <p className="text-gray-600">No. {data.invoiceInfo.number || "000001"}</p>
          <p className="text-gray-600 text-sm">{data.invoiceInfo.invoiceDate || new Date().toLocaleDateString()}</p>
        </div>
      </div>

      {/* Client Info */}
      <div className="mb-8">
        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="font-semibold text-gray-800 mb-2">Cliente:</h3>
          <p className="font-medium text-gray-800">{data.billTo.name || "Nombre del cliente"}</p>
          <p className="text-gray-600">{data.billTo.address || "Dirección del cliente"}</p>
          <p className="text-gray-600">Tel: {data.billTo.phone || "Teléfono del cliente"}</p>
        </div>
      </div>

      {/* Invoice Details */}
      <div className="mb-6">
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div>
            <span className="text-gray-600">Fecha de emisión:</span>
            <p className="font-medium">{data.invoiceInfo.invoiceDate || new Date().toLocaleDateString()}</p>
          </div>
          <div>
            <span className="text-gray-600">Vencimiento:</span>
            <p className="font-medium">{data.invoiceInfo.paymentDate || new Date().toLocaleDateString()}</p>
          </div>
          <div>
            <span className="text-gray-600">Moneda:</span>
            <p className="font-medium">USD ($)</p>
          </div>
        </div>
      </div>

      {/* Items Table */}
      <div className="mb-6">
        <table className="w-full">
          <thead>
            <tr className="border-b-2 border-gray-300">
              <th className="text-left py-3 text-gray-700">Descripción</th>
              <th className="text-center py-3 text-gray-700">Cant.</th>
              <th className="text-right py-3 text-gray-700">Precio</th>
              <th className="text-right py-3 text-gray-700">Total</th>
            </tr>
          </thead>
          <tbody>
            {data.items.length > 0 ? data.items.map((item, index) => (
              <tr key={index} className="border-b border-gray-200">
                <td className="py-3">
                  <div className="font-medium">{item.name || `Producto/Servicio ${index + 1}`}</div>
                  {item.description && <div className="text-sm text-gray-600">{item.description}</div>}
                </td>
                <td className="py-3 text-center">{item.quantity || 1}</td>
                <td className="py-3 text-right">${(item.amount || 0).toFixed(2)}</td>
                <td className="py-3 text-right font-medium">${(item.total || 0).toFixed(2)}</td>
              </tr>
            )) : (
              <tr className="border-b border-gray-200">
                <td className="py-3">
                  <div className="font-medium">Producto/Servicio de ejemplo</div>
                  <div className="text-sm text-gray-600">Descripción del servicio</div>
                </td>
                <td className="py-3 text-center">1</td>
                <td className="py-3 text-right">$0.00</td>
                <td className="py-3 text-right font-medium">$0.00</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Totals */}
      <div className="flex justify-end mb-8">
        <div className="w-80">
          <div className="space-y-2 text-right">
            <div className="flex justify-between py-1">
              <span className="text-gray-600">Subtotal:</span>
              <span>${subtotal.toFixed(2)}</span>
            </div>
            <div className="border-t-2 border-blue-600 pt-2">
              <div className="flex justify-between">
                <span className="text-lg font-bold text-gray-800">Total USD:</span>
                <span className="text-lg font-bold text-blue-600">${subtotal.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="text-center border-t pt-4">
        <p className="text-sm text-gray-600">Convert-IA | Transformamos tu negocio con IA</p>
        <p className="text-xs text-gray-500 mt-1">Esta factura fue generada electrónicamente</p>
      </div>
    </div>
  );
}