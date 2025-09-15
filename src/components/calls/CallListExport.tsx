
import React, { memo } from "react";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { Call } from "@/lib/types";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import * as XLSX from 'xlsx';
import { downloadAudio, getFilenameWithFormat } from "../calls/detail/audio/audioUtils";

interface CallListExportProps {
  selectedCalls?: Call[];
  filteredCalls: Call[];
}

const CallListExport = memo(({ selectedCalls, filteredCalls }: CallListExportProps) => {
  const prepareExportData = async () => {
    try {
      toast.loading("Preparando exportación...", { id: "export" });
      
      let calls: Call[] = [];
      
      // Use selected calls if provided, otherwise use filtered calls
      if (selectedCalls && selectedCalls.length > 0) {
        calls = selectedCalls;
      } else {
        // Use filtered calls
        calls = filteredCalls;
      }
      
      // Get tipificaciones in a single batch for efficiency
      let tipificacionMap = new Map();
      
      if (calls.some(call => call.tipificacionId)) {
        const tipificacionIds = calls
          .map(call => call.tipificacionId)
          .filter(id => id) as string[];
          
        if (tipificacionIds.length > 0) {
          const { data: tipificacionesData } = await supabase
            .from('tipificaciones')
            .select('id, name')
            .in('id', Array.from(new Set(tipificacionIds)));
            
          if (tipificacionesData) {
            tipificacionesData.forEach(tip => {
              tipificacionMap.set(tip.id, tip.name);
            });
          }
        }
      }
      
      const exportRows = calls.map(call => {
        const date = new Date(call.date);
        const formattedDate = date.toLocaleString();
        
        const tipificacionName = call.tipificacionId ? 
          tipificacionMap.get(call.tipificacionId) || "Sin asignar" : 
          "Sin asignar";
        
        return {
          "Título": call.title,
          "Duración (seg)": call.duration,
          "Fecha": formattedDate,
          "Asesor": call.agentName,
          "Tipificación": tipificacionName,
          "Estado": call.status === "complete" ? "Completo" : 
                   call.status === "pending" ? "Pendiente" : 
                   call.status === "analyzing" ? "Analizando" : 
                   call.status === "transcribing" ? "Transcribiendo" : 
                   call.status === "error" ? "Error" : call.status,
          "Resumen Estado": call.statusSummary || "",
          "Resumen": call.summary || ""
        };
      });
      
      const headers = exportRows.length > 0 ? 
        Object.keys(exportRows[0]) : 
        [
          "Título", 
          "Duración (seg)", 
          "Fecha", 
          "Asesor", 
          "Tipificación", 
          "Estado",
          "Resumen Estado",
          "Resumen"
        ];
      
      return { exportRows, headers };
    } catch (error) {
      console.error("Error preparing export data:", error);
      toast.error("Error en la preparación de datos", { 
        id: "export",
        description: error instanceof Error ? error.message : "Error desconocido" 
      });
      throw error;
    }
  };

  const exportToExcel = async () => {
    try {
      const { exportRows } = await prepareExportData();
      
      const workbook = XLSX.utils.book_new();
      const worksheet = XLSX.utils.json_to_sheet(exportRows);
      
      XLSX.utils.book_append_sheet(workbook, worksheet, "Llamadas");
      
      // Add export information
      const callCount = exportRows.length;
      const timestamp = new Date().toISOString().slice(0,10);
      XLSX.writeFile(workbook, `llamadas_${callCount}_registros_${timestamp}.xlsx`);
      
      toast.success(`Exportación completada: ${callCount} registros`, { id: "export" });
    } catch (error) {
      console.error("Error exporting to Excel:", error);
      toast.error("Error en la exportación a Excel", { 
        id: "export",
        description: error instanceof Error ? error.message : "Error desconocido" 
      });
    }
  };

  const exportToText = async () => {
    try {
      const { exportRows, headers } = await prepareExportData();
      
      let textContent = headers.join('\t') + '\n';
      
      exportRows.forEach(row => {
        const values = headers.map(header => {
          const value = row[header];
          if (value === null || value === undefined) return '';
          if (typeof value === 'string') return value.replace(/\t/g, ' ');
          return value;
        });
        textContent += values.join('\t') + '\n';
      });
      
      const blob = new Blob([textContent], { type: 'text/plain;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const callCount = exportRows.length;
      const timestamp = new Date().toISOString().slice(0,10);
      
      // Fixed function call - using the correct number of arguments
      const filename = `llamadas_${callCount}_registros_${timestamp}.txt`;
      downloadAudio(url, filename);
      
      toast.success(`Exportación completada: ${callCount} registros`, { id: "export" });
    } catch (error) {
      console.error("Error exporting to text:", error);
      toast.error("Error en la exportación a texto", { 
        id: "export",
        description: error instanceof Error ? error.message : "Error desconocido" 
      });
    }
  };

  // Calculate export count
  const exportCount = selectedCalls?.length || filteredCalls.length;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="flex items-center gap-2">
          <Download className="h-4 w-4" />
          <span>Exportar{exportCount ? ` (${exportCount})` : ''}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuItem onClick={exportToExcel}>
          Exportar a Excel (.xlsx) {exportCount ? `(${exportCount})` : ''}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={exportToText}>
          Exportar a Texto (.txt) {exportCount ? `(${exportCount})` : ''}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
});

CallListExport.displayName = 'CallListExport';

export default CallListExport;
