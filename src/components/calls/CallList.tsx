import { useState, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Check, X, RefreshCcw, Trash2 } from "lucide-react";
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

export default function CallList() {
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isMultiDeleteDialogOpen, setIsMultiDeleteDialogOpen] = useState(false);
  const [selectedCallId, setSelectedCallId] = useState<string | null>(null);
  const [pageSize, setPageSize] = useState<number>(20);
  const [currentPage, setCurrentPage] = useState<number>(1);
  
  // Initialize filters with proper structure
  const [filters, setFilters] = useState<CallFilters>({
    status: [],
    sentiment: [],
    result: [],
    agent: [],
    dateRange: "all",
    product: []
  });
  
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
    toggleAllCalls
  } = useCallList();

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
  }, []);

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
              onDeleteCall={(id) => {
                setSelectedCallId(id);
                setIsDeleteDialogOpen(true);
              }} 
              onToggleCallSelection={toggleCallSelection} 
              onToggleAllCalls={toggleAllCalls} 
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
  }, [isLoading, calls.length, error, currentCalls, selectedCalls, multiSelectMode, toggleCallSelection, toggleAllCalls, handleRefresh, pageSize, handlePageSizeChange, totalItems, startIndex, endIndex, pageNumbers, currentPage, totalPages, handlePageChange]);

  return (
    <div className="space-y-4 component-fade">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold tracking-tight">
          Llamadas Ver, gestionar y analizar tus llamadas
        </h2>
        <div className="flex gap-2">
          {multiSelectMode ? (
            <>
              <Button 
                variant="destructive" 
                size="sm" 
                onClick={() => setIsMultiDeleteDialogOpen(true)} 
                disabled={selectedCalls.length === 0}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Eliminar ({selectedCalls.length})
              </Button>
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
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setMultiSelectMode(true)}
              >
                <Check className="mr-2 h-4 w-4" />
                Seleccionar
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleRefresh} 
                disabled={isRefreshing}
              >
                <RefreshCcw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
                Actualizar
              </Button>
              <CallListExport 
                selectedCalls={selectedCalls.length > 0 ? calls.filter(call => selectedCalls.includes(call.id)) : undefined} 
                filteredCalls={calls} 
              />
              <CallUploadButton />
            </>
          )}
        </div>
      </div>

      <CallListFilters 
        filters={filters}
        onFiltersChange={handleFilterChange}
        agents={agents}
      />

      <div className="transition-all duration-300">
        {renderContent()}
      </div>

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
    </div>
  );
}
