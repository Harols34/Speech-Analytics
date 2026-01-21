
import { useState, useCallback, useMemo, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Check, X, RefreshCcw, Trash2, AlertTriangle, Clock, MessageSquare } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import CallUploadButton from "./CallUploadButton";
import CallListFilters, { CallFilters } from "./CallListFilters";
import CallListExport from "./CallListExport";
import { useCallList } from "@/hooks/useCallList";
import { CallTable } from "./CallTable";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";
import { useAuth } from "@/context/AuthContext";
import { useAccount } from "@/context/AccountContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { useDetailedMetrics } from "@/hooks/useDetailedMetrics";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

export default function CallList() {
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isMultiDeleteDialogOpen, setIsMultiDeleteDialogOpen] = useState(false);
  const [isCleanPlatformDialogOpen, setIsCleanPlatformDialogOpen] = useState(false);
  const [selectedCallId, setSelectedCallId] = useState<string | null>(null);
  const [pageSize, setPageSize] = useState<number>(20);
  const [currentPage, setCurrentPage] = useState<number>(1);
  
  const { user } = useAuth();
  const { selectedAccountId } = useAccount();
  const isSuperAdmin = user?.role === 'superAdmin';
  
  // Metrics for consumption with month navigation
  const [metricsMonth, setMetricsMonth] = useState<Date>(new Date());
  const metricsFrom = format(startOfMonth(metricsMonth), 'yyyy-MM-dd');
  const metricsTo = format(endOfMonth(metricsMonth), 'yyyy-MM-dd');
  const { data: metricsData, isLoading: loadingMetrics, refetch: refetchMetrics } = useDetailedMetrics(selectedAccountId || "all", metricsFrom, metricsTo);
  const accountMetrics = metricsData && metricsData.length > 0 ? metricsData[0] : null;

  const goPrevMonth = useCallback(() => {
    const d = new Date(metricsMonth);
    d.setMonth(d.getMonth() - 1);
    setMetricsMonth(d);
  }, [metricsMonth]);

  const goNextMonth = useCallback(() => {
    const d = new Date(metricsMonth);
    d.setMonth(d.getMonth() + 1);
    setMetricsMonth(d);
  }, [metricsMonth]);

  useEffect(() => {
    refetchMetrics();
  }, [metricsMonth, selectedAccountId, refetchMetrics]);
  
  // Initialize filters with proper structure
  const [filters, setFilters] = useState<CallFilters>({
    status: [],
    sentiment: [],
    result: [],
    agent: [],
    dateRange: "all",
    product: [],
    query: ""
  });

  // Persist filters per account
  const storageKey = selectedAccountId ? `calls_filters_${selectedAccountId}` : null;

  useEffect(() => {
    if (storageKey) {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        try {
          const parsed = JSON.parse(saved) as CallFilters;
          setFilters(parsed);
        } catch {}
      }
    }
  }, [storageKey]);

  useEffect(() => {
    if (storageKey) {
      localStorage.setItem(storageKey, JSON.stringify(filters));
    }
  }, [filters, storageKey]);
  
  const {
    calls,
    isLoading,
    selectedCalls,
    isRefreshing,
    error,
    multiSelectMode,
    setMultiSelectMode,
    fetchCalls,
    handleRefresh,
    deleteCall,
    deleteMultipleCalls,
    toggleCallSelection,
    toggleAllCalls,
    cleanPlatform
  } = useCallList();

  // Listen for account changes and refresh data
  useEffect(() => {
    const handleAccountChange = () => {
      fetchCalls();
    };
    
    window.addEventListener('accountChanged', handleAccountChange);
    return () => window.removeEventListener('accountChanged', handleAccountChange);
  }, [fetchCalls]);

  // Get agents for filter options
  const agents = useMemo(() => {
    const uniqueAgents = calls.reduce((acc, call) => {
      if (call.agent_id && call.agentName && !acc.find(a => a.id === call.agent_id)) {
        acc.push({ id: call.agent_id, name: call.agentName });
      }
      return acc;
    }, [] as { id: string; name: string }[]);
    return uniqueAgents;
  }, [calls]);

  // Pagination memoization for performance
  const {
    totalItems,
    totalPages,
    startIndex,
    endIndex,
    currentCalls
  } = useMemo(() => {
    const totalItems = calls.length;
    const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = Math.min(startIndex + pageSize, totalItems);
    const currentCalls = calls.slice(startIndex, endIndex);
    return {
      totalItems,
      totalPages,
      startIndex,
      endIndex,
      currentCalls
    };
  }, [calls, currentPage, pageSize]);

  // Optimized filter change handler
  const handleFilterChange = useCallback((newFilters: CallFilters) => {
    console.log("Filter change detected:", newFilters);
    setFilters(newFilters);
    setCurrentPage(1); // Reset to first page on filter change
    fetchCalls(newFilters, true);
  }, [fetchCalls]);

  const handlePageSizeChange = useCallback((value: string) => {
    const newSize = parseInt(value);
    setPageSize(newSize);
    setCurrentPage(1); // Reset to first page when changing page size
  }, []);

  const handlePageChange = useCallback((page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
      // Scroll to top when changing page for better UX
      window.scrollTo({
        top: 0,
        behavior: 'smooth'
      });
    }
  }, [totalPages]);

  // Generate array of page numbers to display - memoized
  const pageNumbers = useMemo(() => {
    const pages = [];
    const maxVisiblePages = 5;
    if (totalPages <= maxVisiblePages) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Always show first page
      pages.push(1);

      // Calculate start and end of middle pages
      let start = Math.max(2, currentPage - 1);
      let end = Math.min(currentPage + 1, totalPages - 1);

      // Adjust if we're near the beginning
      if (currentPage <= 3) {
        end = 4;
      }

      // Adjust if we're near the end
      if (currentPage >= totalPages - 2) {
        start = totalPages - 3;
      }

      // Add ellipsis after first page if needed
      if (start > 2) {
        pages.push("ellipsis");
      }

      // Add middle pages
      for (let i = start; i <= end; i++) {
        pages.push(i);
      }

      // Add ellipsis before last page if needed
      if (end < totalPages - 1) {
        pages.push("ellipsis");
      }

      // Always show last page
      pages.push(totalPages);
    }
    return pages;
  }, [currentPage, totalPages]);

  // Optimized content rendering with early return patterns
  const renderContent = useCallback(() => {
    if (isLoading && calls.length === 0) {
      return (
        <div className="space-y-4">
          <div className="rounded-md border">
            <ScrollArea className="h-[400px]">
              <div className="p-4 space-y-4">
                {Array(5).fill(0).map((_, i) => (
                  <div key={i} className="space-y-2">
                    <Skeleton className="h-5 w-full" />
                    <Skeleton className="h-5 w-3/4" />
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        </div>
      );
    }

    if (error) {
      return (
        <div className="bg-destructive/15 text-destructive p-4 rounded-md">
          <p className="font-medium">Error al cargar las llamadas</p>
          <p className="text-sm">{error}</p>
          <Button variant="outline" size="sm" className="mt-2" onClick={handleRefresh}>
            <RefreshCcw className="mr-2 h-4 w-4" />
            Intentar nuevamente
          </Button>
        </div>
      );
    }

    if (calls.length === 0) {
      return (
        <div className="p-8 text-center border rounded-md">
          <p className="text-muted-foreground">No se encontraron llamadas.</p>
        </div>
      );
    }

    return (
      <>
        <div className="rounded-md border">
          <ScrollArea className="h-[calc(100vh-350px)]">
            <CallTable 
              calls={currentCalls} 
              isLoading={isLoading} 
              selectedCalls={selectedCalls} 
              multiSelectMode={multiSelectMode} 
              onDeleteCall={isSuperAdmin ? (id) => {
                setSelectedCallId(id);
                setIsDeleteDialogOpen(true);
              } : undefined} 
              onToggleCallSelection={toggleCallSelection} 
              onToggleAllCalls={toggleAllCalls}
              isSuperAdmin={isSuperAdmin}
            />
          </ScrollArea>
        </div>

        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mt-4">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Mostrar</span>
            <Select value={pageSize.toString()} onValueChange={handlePageSizeChange}>
              <SelectTrigger className="w-[80px]">
                <SelectValue placeholder="20" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="20">20</SelectItem>
                <SelectItem value="30">30</SelectItem>
                <SelectItem value="50">50</SelectItem>
                <SelectItem value="100">100</SelectItem>
                <SelectItem value="150">150</SelectItem>
                <SelectItem value="250">250</SelectItem>
              </SelectContent>
            </Select>
            <span className="text-sm text-muted-foreground">por página</span>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            <span className="text-sm text-muted-foreground">
              {totalItems === 0 ? "0" : startIndex + 1} - {endIndex} de {totalItems} llamadas
            </span>
          </div>

          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious 
                  onClick={() => handlePageChange(currentPage - 1)} 
                  className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"} 
                />
              </PaginationItem>
              
              {pageNumbers.map((page, index) => (
                <PaginationItem key={index}>
                  {page === "ellipsis" ? (
                    <span className="px-4 py-2">...</span>
                  ) : (
                    <PaginationLink 
                      isActive={page === currentPage} 
                      onClick={() => typeof page === "number" && handlePageChange(page)}
                    >
                      {page}
                    </PaginationLink>
                  )}
                </PaginationItem>
              ))}
              
              <PaginationItem>
                <PaginationNext 
                  onClick={() => handlePageChange(currentPage + 1)} 
                  className={currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"} 
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      </>
    );
  }, [isLoading, calls.length, error, currentCalls, selectedCalls, multiSelectMode, toggleCallSelection, toggleAllCalls, handleRefresh, pageSize, handlePageSizeChange, totalItems, startIndex, endIndex, pageNumbers, currentPage, totalPages, handlePageChange, isSuperAdmin]);

  return (
    <div className="space-y-4 component-fade">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold tracking-tight">
          Llamadas Ver, gestionar y analizar tus llamadas
        </h2>
        <div className="flex gap-2">
          {multiSelectMode ? (
            <>
              {isSuperAdmin && (
                <Button 
                  variant="destructive" 
                  size="sm" 
                  onClick={() => setIsMultiDeleteDialogOpen(true)} 
                  disabled={selectedCalls.length === 0}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Eliminar ({selectedCalls.length})
                </Button>
              )}
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setMultiSelectMode(false)}
              >
                <X className="mr-2 h-4 w-4" />
                Cancelar
              </Button>
            </>
          ) : (
            <>
              {isSuperAdmin && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setMultiSelectMode(true)}
                >
                  <Check className="mr-2 h-4 w-4" />
                  Seleccionar
                </Button>
              )}
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleRefresh} 
                disabled={isRefreshing}
              >
                <RefreshCcw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
                Actualizar
              </Button>
              {isSuperAdmin && (
                <Button 
                  variant="destructive" 
                  size="sm" 
                  onClick={() => setIsCleanPlatformDialogOpen(true)}
                >
                  <AlertTriangle className="mr-2 h-4 w-4" />
                  Limpiar Todo
                </Button>
              )}
              <CallListExport 
                selectedCalls={selectedCalls.length > 0 ? calls.filter(call => selectedCalls.includes(call.id)) : undefined} 
                filteredCalls={calls} 
              />
              {user?.role !== 'agent' && <CallUploadButton />}
            </>
          )}
        </div>
      </div>

      {user?.role !== 'agent' && (
        <CallListFilters 
          filters={filters}
          onFiltersChange={handleFilterChange}
          agents={agents}
        />
      )}

      {/* Consumo - Speech analytics (Transcripción y Consultas de Chatbot) */}
      <Collapsible defaultOpen={false}>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 py-2 px-3">
            <CardTitle className="text-base">Consumo</CardTitle>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="hover-scale">
                Ver/Ocultar
              </Button>
            </CollapsibleTrigger>
          </CardHeader>
          <CollapsibleContent>
            <CardContent className="py-3 px-3">
              <div className="flex items-center justify-between mb-2 text-xs text-muted-foreground">
                <button className="px-2 py-1 rounded border" onClick={goPrevMonth} type="button">◀</button>
                <span>{format(metricsMonth, 'MMMM yyyy')}</span>
                <button className="px-2 py-1 rounded border" onClick={goNextMonth} type="button">▶</button>
              </div>
              {loadingMetrics ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  <Skeleton className="h-14 w-full" />
                  <Skeleton className="h-14 w-full" />
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="text-[11px] uppercase tracking-wide text-muted-foreground font-medium">Speech analytics</div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label className="flex items-center gap-1.5 text-sm">
                        <Clock className="h-3 w-3" />
                        Transcripción
                      </Label>
                      <Progress 
                        value={Math.min(accountMetrics?.porcentaje_transcripcion || 0, 100)} 
                        className={`h-1.5 ${(accountMetrics?.porcentaje_transcripcion || 0) >= 100 ? 'bg-red-100' : (accountMetrics?.porcentaje_transcripcion || 0) >= 90 ? 'bg-yellow-100' : ''}`}
                      />
                      <div className="flex justify-between text-[11px] text-muted-foreground">
                        <span>{(accountMetrics?.porcentaje_transcripcion || 0).toFixed(1)}% utilizado</span>
                        {accountMetrics && (
                          <span>
                            {(accountMetrics.uso_transcripcion_mes || 0).toFixed(2)} / {(accountMetrics.limite_horas + (accountMetrics.horas_adicionales || 0))} horas
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <Label className="flex items-center gap-1.5 text-sm">
                        <MessageSquare className="h-3 w-3" />
                        Consultas de Chatbot
                      </Label>
                      <Progress 
                        value={Math.min(accountMetrics?.porcentaje_consultas || 0, 100)} 
                        className={`h-1.5 ${(accountMetrics?.porcentaje_consultas || 0) >= 100 ? 'bg-red-100' : (accountMetrics?.porcentaje_consultas || 0) >= 90 ? 'bg-yellow-100' : ''}`}
                      />
                      <div className="flex justify-between text-[11px] text-muted-foreground">
                        <span>{(accountMetrics?.porcentaje_consultas || 0).toFixed(1)}% utilizado</span>
                        {accountMetrics && (
                          <span>
                            {(accountMetrics.uso_consultas_mes || 0)} / {(accountMetrics.limite_consultas || 0)} consultas
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      <div className="transition-all duration-300">
        {renderContent()}
      </div>

      {/* Only show delete dialogs for superAdmin */}
      {isSuperAdmin && (
        <>
          <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
                <AlertDialogDescription>
                  Esta acción no se puede deshacer. ¿Deseas eliminar esta llamada?
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={() => {
                  if (selectedCallId) {
                    deleteCall(selectedCallId);
                  }
                  setIsDeleteDialogOpen(false);
                  setSelectedCallId(null);
                }}>
                  Eliminar
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          <AlertDialog open={isMultiDeleteDialogOpen} onOpenChange={setIsMultiDeleteDialogOpen}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
                <AlertDialogDescription>
                  Vas a eliminar {selectedCalls.length} llamadas. Esta acción no se puede deshacer.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={deleteMultipleCalls}>
                  Eliminar
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          <AlertDialog open={isCleanPlatformDialogOpen} onOpenChange={setIsCleanPlatformDialogOpen}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle className="text-destructive">⚠️ Limpiar Toda la Plataforma</AlertDialogTitle>
                <AlertDialogDescription>
                  <div className="space-y-2">
                    <p className="font-semibold">Esta acción eliminará PERMANENTEMENTE:</p>
                    <ul className="list-disc pl-5 space-y-1">
                      <li>Todas las llamadas</li>
                      <li>Todos los mensajes de chat</li>
                      <li>Todos los feedbacks</li>
                      <li>Todo el historial de uso</li>
                    </ul>
                    <p className="text-destructive font-semibold mt-3">
                      Esta acción NO se puede deshacer. ¿Estás completamente seguro?
                    </p>
                  </div>
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction 
                  onClick={cleanPlatform}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Sí, Limpiar Todo
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </>
      )}
    </div>
  );
}
