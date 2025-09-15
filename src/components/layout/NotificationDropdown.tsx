
import React, { useState, useRef } from "react";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useDailyReports } from "@/hooks/useDailyReports";
import DailyReportSection from "@/components/settings/notification/DailyReportSection";
import GlobalAnalysisSection from "@/components/settings/notification/GlobalAnalysisSection";
import FeedbackTrainingSection from "@/components/settings/notification/FeedbackTrainingSection";
import { useNavigate } from "react-router-dom";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useAudioSettings } from "@/hooks/useAudioSettings";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogClose,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AgentGrouped } from "@/components/settings/notification/types";

export default function NotificationDropdown() {
  const [selectedDays, setSelectedDays] = useState<number>(7);
  const { reports, isLoading: loadingReports, fetchReports } = useDailyReports(selectedDays);
  const navigate = useNavigate();
  const { settings, updateSetting, saveSettings } = useAudioSettings();
  const [showFullSettings, setShowFullSettings] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  
  // Handle date range change
  const handleDateRangeChange = (days: number) => {
    setSelectedDays(days);
    fetchReports(days);
  };

  // Check if we have any calls
  const hasCalls = reports && reports.some(report => report.callCount && report.callCount > 0);

  // Create a grouped list of agents from all reports
  const getGroupedAgents = () => {
    if (!reports || reports.length === 0) return [];
    
    const agentsMap: Record<string, AgentGrouped> = {};
    
    reports.forEach(report => {
      if (!report.agents) return;
      
      report.agents.forEach(agent => {
        if (!agentsMap[agent.id]) {
          agentsMap[agent.id] = {
            id: agent.id,
            name: agent.name,
            totalCalls: agent.callCount,
            averageScore: agent.averageScore,
            datePoints: [{
              date: report.date,
              score: agent.averageScore,
              callCount: agent.callCount
            }]
          };
        } else {
          agentsMap[agent.id].totalCalls += agent.callCount;
          
          // Calculate weighted average score
          const totalScore = agentsMap[agent.id].averageScore * 
                          (agentsMap[agent.id].totalCalls - agent.callCount);
          const newTotalScore = totalScore + (agent.averageScore * agent.callCount);
          agentsMap[agent.id].averageScore = Math.round(
            newTotalScore / agentsMap[agent.id].totalCalls
          );
          
          agentsMap[agent.id].datePoints.push({
            date: report.date,
            score: agent.averageScore,
            callCount: agent.callCount
          });
        }
      });
    });
    
    // Convert to array and sort by total calls
    return Object.values(agentsMap).sort((a: any, b: any) => b.totalCalls - a.totalCalls);
  };

  const groupedAgents = getGroupedAgents();

  // Handle button actions
  const handleViewHistory = () => {
    navigate("/calls");
  };

  const handleViewDetailedAnalysis = () => {
    navigate("/analytics");
  };

  const handleGenerateReport = () => {
    toast.success("Generando reporte completo", {
      description: "El reporte será enviado a tu correo electrónico"
    });
  };

  const handleSaveNotificationSettings = async () => {
    try {
      await saveSettings(settings);
      toast.success("Preferencias de notificaciones actualizadas");
    } catch (error) {
      console.error("Error al guardar preferencias:", error);
      toast.error("Error al actualizar preferencias");
    }
  };

  // Completely revised dialog handling to fix navigation issues
  const handleViewAllNotifications = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    document.body.style.pointerEvents = ''; // Reset any pointer-events issues
    setShowFullSettings(true);
  };

  // Fixed dialog close handler
  const handleDialogClose = () => {
    // Close with a more substantial delay to ensure complete cleanup
    setTimeout(() => {
      setShowFullSettings(false);
      // Reset pointer events and styles
      document.body.style.pointerEvents = '';
      
      // Wait a bit longer to ensure React has updated the DOM before enabling navigation
      setTimeout(() => {
        const event = new CustomEvent('navigationEnabled');
        document.dispatchEvent(event);
      }, 50);
    }, 100);
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="relative h-10 w-10 rounded-full">
            <Bell className="h-5 w-5" />
            {reports && reports.length > 0 && reports.some(r => r.callCount > 0) && (
              <span className="absolute top-0 right-0 h-2.5 w-2.5 rounded-full bg-red-600" />
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-[350px] max-h-[80vh] overflow-auto" align="end" forceMount>
          <DropdownMenuLabel className="flex justify-between items-center">
            <span>Notificaciones</span>
            <Button variant="ghost" size="sm" onClick={handleViewAllNotifications}>
              Ver todo
            </Button>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          
          <ScrollArea className="h-[calc(80vh-120px)]">
            <div className="p-2 space-y-4">
              <DailyReportSection 
                reports={reports.slice(0, 3)} 
                loadingReports={loadingReports}
                onViewHistory={handleViewHistory}
                onChangeDateRange={handleDateRangeChange}
                selectedDays={selectedDays}
                isDropdown={true}
                showDateSelector={true}
                hasCalls={hasCalls}
              />
              
              <GlobalAnalysisSection 
                reports={reports} 
                loadingReports={loadingReports}
                onViewDetailedAnalysis={handleViewDetailedAnalysis}
                onChangeDateRange={handleDateRangeChange}
                selectedDays={selectedDays}
                isDropdown={true}
                hasCalls={hasCalls}
              />
            </div>
          </ScrollArea>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Modified dialog implementation with only the Cerrar button */}
      {showFullSettings && (
        <Dialog 
          open={showFullSettings} 
          modal={true}
        >
          <DialogContent 
            ref={dialogRef}
            className="max-w-3xl max-h-[90vh] overflow-y-auto"
            onInteractOutside={(e) => {
              e.preventDefault();
              handleDialogClose();
            }}
            onEscapeKeyDown={(e) => {
              e.preventDefault();
              handleDialogClose();
            }}
          >
            <DialogHeader>
              <DialogTitle>Configuración de Notificaciones</DialogTitle>
              <DialogDescription>
                Administra todas tus preferencias de notificaciones
              </DialogDescription>
            </DialogHeader>

            {/* Remove the default X button using regular CSS */}
            <style>
              {`[data-radix-dialog-close] {
                display: none;
              }`}
            </style>

            <Tabs defaultValue="preferences" className="w-full mt-4">
              <TabsList className="grid grid-cols-3 mb-4">
                <TabsTrigger value="preferences">Preferencias</TabsTrigger>
                <TabsTrigger value="reports">Reportes Diarios</TabsTrigger>
                <TabsTrigger value="analysis">Análisis Global</TabsTrigger>
              </TabsList>

              {/* Keep the tab content the same */}
              <TabsContent value="preferences" className="space-y-4">
                <div className="space-y-4 rounded-md border p-4">
                  <h3 className="font-medium text-sm">Preferencias de Notificaciones</h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm font-medium leading-none" htmlFor="auto_feedback">
                        Recibir feedback automático
                      </Label>
                      <Switch 
                        id="auto_feedback"
                        checked={settings?.auto_feedback}
                        onCheckedChange={(checked) => {
                          updateSetting("auto_feedback", checked);
                          handleSaveNotificationSettings();
                        }} 
                      />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <Label className="text-sm font-medium leading-none" htmlFor="daily_summary">
                        Recibir resumen diario de actividad
                      </Label>
                      <Switch 
                        id="daily_summary" 
                        defaultChecked={true} 
                        onCheckedChange={() => handleSaveNotificationSettings()}
                      />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <Label className="text-sm font-medium leading-none" htmlFor="agent_notifications">
                        Notificaciones de rendimiento de agentes
                      </Label>
                      <Switch 
                        id="agent_notifications" 
                        defaultChecked={true}
                        onCheckedChange={() => handleSaveNotificationSettings()}
                      />
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="reports">
                <DailyReportSection 
                  reports={reports} 
                  loadingReports={loadingReports}
                  onViewHistory={handleViewHistory}
                  onChangeDateRange={handleDateRangeChange}
                  selectedDays={selectedDays}
                  isDropdown={false}
                  showDateSelector={true}
                  hasCalls={hasCalls}
                />
              </TabsContent>

              <TabsContent value="analysis">
                <div className="space-y-6">
                  <GlobalAnalysisSection 
                    reports={reports} 
                    loadingReports={loadingReports}
                    onViewDetailedAnalysis={handleViewDetailedAnalysis}
                    onChangeDateRange={handleDateRangeChange}
                    selectedDays={selectedDays}
                    isDropdown={false}
                    hasCalls={hasCalls}
                  />
                  
                  <FeedbackTrainingSection 
                    groupedAgents={groupedAgents}
                    loadingReports={loadingReports}
                    onGenerateReport={handleGenerateReport}
                    onChangeDateRange={handleDateRangeChange}
                    selectedDays={selectedDays}
                    hasCalls={hasCalls}
                  />
                </div>
              </TabsContent>
            </Tabs>

            {/* Keep only the Cerrar button */}
            <div className="mt-6 flex justify-end">
              <Button 
                variant="outline" 
                onClick={handleDialogClose}
              >
                Cerrar
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
