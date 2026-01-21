import React, { memo } from "react";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { TrainingSession } from "@/lib/types/training";
import { toast } from "sonner";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import * as XLSX from 'xlsx';

interface TrainingHistoryExportProps {
  sessions: TrainingSession[];
}

const TrainingHistoryExport = memo(({ sessions }: TrainingHistoryExportProps) => {
  
  const formatConversation = (conversation: TrainingSession['conversation']): string => {
    if (!conversation || conversation.length === 0) return '';
    
    return conversation.map(msg => {
      const speaker = msg.role === 'ai' ? 'Cliente (IA)' : msg.role === 'user' ? 'Asesor' : 'Sistema';
      return `${speaker}: ${msg.content}`;
    }).join(', ');
  };

  const formatDuration = (seconds?: number): string => {
    if (!seconds) return 'N/A';
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const formatDate = (dateString?: string): string => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString('es-ES');
  };

  const formatArrayToString = (arr?: string[]): string => {
    if (!arr || arr.length === 0) return '';
    return arr.join(' | ');
  };

  const getStatusText = (status: string): string => {
    switch (status) {
      case 'completed': return 'Completado';
      case 'active': return 'Activo';
      case 'cancelled': return 'Cancelado';
      default: return status;
    }
  };

  const getTypeText = (type: string): string => {
    return type === 'voice' ? 'Voz' : 'Chat';
  };

  const prepareExportData = () => {
    try {
      toast.loading("Preparando exportación...", { id: "export-training" });
      
      const exportRows = sessions.map(session => {
        const aiReport = session.ai_report || {};
        
        // Extract detailed scores from ai_report
        const detailedScores = aiReport.detailed_scores || {};
        
        return {
          // Información básica de la sesión
          "ID Sesión": session.id,
          "Usuario": session.user_name || 'Usuario desconocido',
          "Escenario": session.scenario_name || 'Escenario no especificado',
          "Tipo": getTypeText(session.type),
          "Estado": getStatusText(session.status),
          
          // Tiempos
          "Fecha Inicio": formatDate(session.started_at),
          "Fecha Finalización": formatDate(session.completed_at),
          "Duración (mm:ss)": formatDuration(session.duration_seconds),
          "Duración (segundos)": session.duration_seconds || 0,
          
          // Métricas de mensajes
          "Total Mensajes": session.mensajes_generales || 0,
          "Mensajes IA": session.mensajes_ia || 0,
          "Mensajes Usuario": session.mensajes_usuario || 0,
          
          // Puntuaciones
          "Puntuación General": aiReport.overall_score ?? session.performance_score ?? 0,
          
          // Puntuaciones detalladas del ai_report
          "Comunicación": detailedScores.communication_skills ?? '',
          "Resolución Problemas": detailedScores.problem_solving ?? '',
          "Empatía": detailedScores.empathy ?? '',
          "Conocimiento Producto": detailedScores.product_knowledge ?? '',
          "Resolución Llamada": detailedScores.call_resolution ?? '',
          
          // Resúmenes
          "Resumen Conversación": aiReport.conversation_summary || session.ai_summary || '',
          
          // Fortalezas, áreas de mejora, insights
          "Fortalezas (Insights)": formatArrayToString(aiReport.strengths || session.insights),
          "Áreas de Mejora": formatArrayToString(aiReport.areas_for_improvement || session.recommendations),
          "Recomendaciones": formatArrayToString(aiReport.recommendations || session.recommendations),
          "Insights Clave": formatArrayToString(aiReport.key_insights || []),
          
          // Conversación completa
          "Conversación Completa": formatConversation(session.conversation)
        };
      });
      
      return exportRows;
    } catch (error) {
      console.error("Error preparing export data:", error);
      toast.error("Error en la preparación de datos", { 
        id: "export-training",
        description: error instanceof Error ? error.message : "Error desconocido" 
      });
      throw error;
    }
  };

  const exportToExcel = async () => {
    try {
      const exportRows = prepareExportData();
      
      const workbook = XLSX.utils.book_new();
      const worksheet = XLSX.utils.json_to_sheet(exportRows);
      
      // Ajustar ancho de columnas
      const columnWidths = [
        { wch: 40 },  // ID Sesión
        { wch: 25 },  // Usuario
        { wch: 30 },  // Escenario
        { wch: 10 },  // Tipo
        { wch: 12 },  // Estado
        { wch: 20 },  // Fecha Inicio
        { wch: 20 },  // Fecha Finalización
        { wch: 15 },  // Duración
        { wch: 15 },  // Duración segundos
        { wch: 15 },  // Total Mensajes
        { wch: 12 },  // Mensajes IA
        { wch: 15 },  // Mensajes Usuario
        { wch: 18 },  // Puntuación General
        { wch: 15 },  // Comunicación
        { wch: 20 },  // Resolución Problemas
        { wch: 12 },  // Empatía
        { wch: 22 },  // Conocimiento Producto
        { wch: 18 },  // Resolución Llamada
        { wch: 60 },  // Resumen Conversación
        { wch: 60 },  // Evaluación Desempeño
        { wch: 60 },  // Fortalezas
        { wch: 60 },  // Áreas de Mejora
        { wch: 60 },  // Recomendaciones
        { wch: 60 },  // Insights Clave
        { wch: 100 }, // Conversación Completa
      ];
      worksheet['!cols'] = columnWidths;
      
      XLSX.utils.book_append_sheet(workbook, worksheet, "Historial Formación");
      
      const sessionCount = exportRows.length;
      const timestamp = new Date().toISOString().slice(0, 10);
      XLSX.writeFile(workbook, `historial_formacion_${sessionCount}_sesiones_${timestamp}.xlsx`);
      
      toast.success(`Exportación completada: ${sessionCount} sesiones`, { id: "export-training" });
    } catch (error) {
      console.error("Error exporting to Excel:", error);
      toast.error("Error en la exportación a Excel", { 
        id: "export-training",
        description: error instanceof Error ? error.message : "Error desconocido" 
      });
    }
  };

  const exportToCSV = async () => {
    try {
      const exportRows = prepareExportData();
      
      if (exportRows.length === 0) {
        toast.error("No hay datos para exportar", { id: "export-training" });
        return;
      }
      
      const headers = Object.keys(exportRows[0]);
      
      // Escape CSV values
      const escapeCSV = (value: any): string => {
        if (value === null || value === undefined) return '';
        const str = String(value);
        // If contains comma, newline or quote, wrap in quotes and escape existing quotes
        if (str.includes(',') || str.includes('\n') || str.includes('"')) {
          return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
      };
      
      let csvContent = '\uFEFF'; // BOM for UTF-8
      csvContent += headers.map(escapeCSV).join(',') + '\n';
      
      exportRows.forEach(row => {
        const values = headers.map(header => escapeCSV((row as any)[header]));
        csvContent += values.join(',') + '\n';
      });
      
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const sessionCount = exportRows.length;
      const timestamp = new Date().toISOString().slice(0, 10);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = `historial_formacion_${sessionCount}_sesiones_${timestamp}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      toast.success(`Exportación completada: ${sessionCount} sesiones`, { id: "export-training" });
    } catch (error) {
      console.error("Error exporting to CSV:", error);
      toast.error("Error en la exportación a CSV", { 
        id: "export-training",
        description: error instanceof Error ? error.message : "Error desconocido" 
      });
    }
  };

  const exportCount = sessions.length;

  if (exportCount === 0) {
    return null;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="flex items-center gap-2">
          <Download className="h-4 w-4" />
          <span>Exportar ({exportCount})</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuItem onClick={exportToExcel}>
          Exportar a Excel (.xlsx)
        </DropdownMenuItem>
        <DropdownMenuItem onClick={exportToCSV}>
          Exportar a CSV (.csv)
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
});

TrainingHistoryExport.displayName = 'TrainingHistoryExport';

export default TrainingHistoryExport;
