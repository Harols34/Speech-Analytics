
import { useState, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { X, Filter, RotateCcw } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

export interface CallFilters {
  status: string[];
  sentiment: string[];
  result: string[];
  agent: string[];
  dateRange: string;
  product: string[];
}

interface CallListFiltersProps {
  filters: CallFilters;
  onFiltersChange: (filters: CallFilters) => void;
  agents: { id: string; name: string }[];
}

const statusOptions = [
  { value: "pending", label: "Pendiente" },
  { value: "transcribing", label: "Transcribiendo" },
  { value: "analyzing", label: "Analizando" },
  { value: "complete", label: "Completo" },
  { value: "error", label: "Error" }
];

const sentimentOptions = [
  { value: "positive", label: "Positivo" },
  { value: "neutral", label: "Neutral" },
  { value: "negative", label: "Negativo" }
];

const resultOptions = [
  { value: "venta", label: "Venta" },
  { value: "no venta", label: "No venta" },
  { value: "", label: "Sin resultado" }
];

const productOptions = [
  { value: "fijo", label: "Fijo" },
  { value: "móvil", label: "Móvil" },
  { value: "", label: "Sin producto" }
];

const dateRangeOptions = [
  { value: "today", label: "Hoy" },
  { value: "week", label: "Esta semana" },
  { value: "month", label: "Este mes" },
  { value: "all", label: "Todos" }
];

export default function CallListFilters({ filters, onFiltersChange, agents }: CallListFiltersProps) {
  const [isOpen, setIsOpen] = useState(false);

  // Memoize active filters count to prevent unnecessary re-calculations
  const activeFiltersCount = useMemo(() => {
    const { status, sentiment, result, agent, dateRange, product } = filters;
    let count = 0;
    if (status.length > 0) count++;
    if (sentiment.length > 0) count++;
    if (result.length > 0) count++;
    if (agent.length > 0) count++;
    if (dateRange && dateRange !== "all") count++;
    if (product.length > 0) count++;
    return count;
  }, [filters]);

  // Optimized filter handlers with useCallback
  const handleMultiSelectChange = useCallback((filterKey: keyof CallFilters, value: string) => {
    if (Array.isArray(filters[filterKey])) {
      const currentValues = filters[filterKey] as string[];
      const newValues = currentValues.includes(value)
        ? currentValues.filter(v => v !== value)
        : [...currentValues, value];
      
      onFiltersChange({
        ...filters,
        [filterKey]: newValues
      });
    }
  }, [filters, onFiltersChange]);

  const handleDateRangeChange = useCallback((value: string) => {
    onFiltersChange({
      ...filters,
      dateRange: value
    });
  }, [filters, onFiltersChange]);

  const clearAllFilters = useCallback(() => {
    const clearedFilters: CallFilters = {
      status: [],
      sentiment: [],
      result: [],
      agent: [],
      dateRange: "all",
      product: []
    };
    onFiltersChange(clearedFilters);
    console.log("Aplicando filtros:", clearedFilters);
  }, [onFiltersChange]);

  const removeFilter = useCallback((filterKey: keyof CallFilters, value?: string) => {
    if (filterKey === "dateRange") {
      onFiltersChange({
        ...filters,
        dateRange: "all"
      });
    } else if (Array.isArray(filters[filterKey]) && value) {
      const currentValues = filters[filterKey] as string[];
      onFiltersChange({
        ...filters,
        [filterKey]: currentValues.filter(v => v !== value)
      });
    }
  }, [filters, onFiltersChange]);

  // Memoize filter options rendering
  const renderFilterSelect = useCallback((
    title: string,
    filterKey: keyof CallFilters,
    options: { value: string; label: string }[]
  ) => (
    <div className="space-y-2">
      <Label className="text-sm font-medium">{title}</Label>
      <div className="space-y-1">
        {options.map(option => (
          <label key={option.value} className="flex items-center space-x-2 cursor-pointer">
            <input
              type="checkbox"
              checked={Array.isArray(filters[filterKey]) && (filters[filterKey] as string[]).includes(option.value)}
              onChange={() => handleMultiSelectChange(filterKey, option.value)}
              className="rounded border-gray-300"
            />
            <span className="text-sm">{option.label}</span>
          </label>
        ))}
      </div>
    </div>
  ), [filters, handleMultiSelectChange]);

  // Memoize agent options
  const agentOptions = useMemo(() => 
    agents.map(agent => ({ value: agent.id, label: agent.name })),
    [agents]
  );

  return (
    <div className="space-y-4">
      {/* Active Filters Display */}
      {activeFiltersCount > 0 && (
        <div className="flex flex-wrap gap-2 items-center">
          <span className="text-sm text-muted-foreground">Filtros activos:</span>
          
          {filters.status.map(status => (
            <Badge key={`status-${status}`} variant="secondary" className="flex items-center gap-1">
              Estado: {statusOptions.find(opt => opt.value === status)?.label}
              <X 
                className="h-3 w-3 cursor-pointer" 
                onClick={() => removeFilter("status", status)}
              />
            </Badge>
          ))}
          
          {filters.sentiment.map(sentiment => (
            <Badge key={`sentiment-${sentiment}`} variant="secondary" className="flex items-center gap-1">
              Sentimiento: {sentimentOptions.find(opt => opt.value === sentiment)?.label}
              <X 
                className="h-3 w-3 cursor-pointer" 
                onClick={() => removeFilter("sentiment", sentiment)}
              />
            </Badge>
          ))}
          
          {filters.result.map(result => (
            <Badge key={`result-${result}`} variant="secondary" className="flex items-center gap-1">
              Resultado: {resultOptions.find(opt => opt.value === result)?.label}
              <X 
                className="h-3 w-3 cursor-pointer" 
                onClick={() => removeFilter("result", result)}
              />
            </Badge>
          ))}
          
          {filters.product.map(product => (
            <Badge key={`product-${product}`} variant="secondary" className="flex items-center gap-1">
              Producto: {productOptions.find(opt => opt.value === product)?.label}
              <X 
                className="h-3 w-3 cursor-pointer" 
                onClick={() => removeFilter("product", product)}
              />
            </Badge>
          ))}
          
          {filters.agent.map(agentId => (
            <Badge key={`agent-${agentId}`} variant="secondary" className="flex items-center gap-1">
              Agente: {agents.find(agent => agent.id === agentId)?.name || agentId}
              <X 
                className="h-3 w-3 cursor-pointer" 
                onClick={() => removeFilter("agent", agentId)}
              />
            </Badge>
          ))}
          
          {filters.dateRange && filters.dateRange !== "all" && (
            <Badge variant="secondary" className="flex items-center gap-1">
              Período: {dateRangeOptions.find(opt => opt.value === filters.dateRange)?.label}
              <X 
                className="h-3 w-3 cursor-pointer" 
                onClick={() => removeFilter("dateRange")}
              />
            </Badge>
          )}
          
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={clearAllFilters}
            className="h-6 px-2"
          >
            <RotateCcw className="h-3 w-3 mr-1" />
            Limpiar todo
          </Button>
        </div>
      )}

      {/* Filter Panel */}
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <Button variant="outline" className="w-full justify-between">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4" />
              Filtros
              {activeFiltersCount > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {activeFiltersCount}
                </Badge>
              )}
            </div>
          </Button>
        </CollapsibleTrigger>
        
        <CollapsibleContent>
          <Card className="mt-2">
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {renderFilterSelect("Estado", "status", statusOptions)}
                {renderFilterSelect("Sentimiento", "sentiment", sentimentOptions)}
                {renderFilterSelect("Resultado", "result", resultOptions)}
                {renderFilterSelect("Producto", "product", productOptions)}
                {renderFilterSelect("Agente", "agent", agentOptions)}
                
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Período</Label>
                  <Select value={filters.dateRange} onValueChange={handleDateRangeChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar período" />
                    </SelectTrigger>
                    <SelectContent>
                      {dateRangeOptions.map(option => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
