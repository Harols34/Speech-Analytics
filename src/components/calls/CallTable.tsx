import { Call } from "@/lib/types";
import { MoreVertical, Edit, Trash2, Info } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { memo, useState } from "react";
import { CallAnalysisInfo } from "./CallAnalysisInfo";

interface CallTableProps {
  calls: Call[];
  isLoading: boolean;
  selectedCalls: string[];
  multiSelectMode: boolean;
  onDeleteCall: (id: string) => void;
  onToggleCallSelection: (id: string) => void;
  onToggleAllCalls: (select: boolean) => void;
}

const formatDuration = (duration: number) => {
  const minutes = Math.floor(duration / 60);
  const seconds = duration % 60;
  return `${minutes}:${seconds < 10 ? "0" : ""}${seconds}`;
};

const formatDate = (dateStr: string) => {
  const date = new Date(dateStr);
  return date.toLocaleDateString();
};

const StatusBadge = memo(({ status }: { status: string }) => {
  let badgeVariant: "default" | "destructive" | "outline" | "secondary" = "secondary";
  let statusText = "";
  
  if (status === "complete") {
    badgeVariant = "default";
    statusText = "Completo";
  } else if (status === "pending") {
    badgeVariant = "secondary";
    statusText = "Pendiente";
  } else if (status === "analyzing") {
    badgeVariant = "secondary";
    statusText = "Analizando";
  } else if (status === "transcribing") {
    badgeVariant = "secondary";
    statusText = "Transcribiendo";
  } else if (status === "error") {
    badgeVariant = "destructive";
    statusText = "Error";
  } else {
    statusText = status;
  }
  
  return <Badge variant={badgeVariant}>{statusText}</Badge>;
});

StatusBadge.displayName = 'StatusBadge';

const ActionCell = memo(({ 
  id, 
  onDeleteCall, 
  call 
}: { 
  id: string; 
  onDeleteCall: (id: string) => void;
  call: Call;
}) => {
  const [showAnalysisInfo, setShowAnalysisInfo] = useState(false);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="h-8 w-8 p-0">
            <span className="sr-only">Abrir menú</span>
            <MoreVertical className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>Acciones</DropdownMenuLabel>
          <DropdownMenuItem onClick={() => setShowAnalysisInfo(true)}>
            <Info className="mr-2 h-4 w-4" />
            Ver Análisis
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link to={`/calls/${id}`}>
              <Edit className="mr-2 h-4 w-4" />
              Editar
            </Link>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => onDeleteCall(id)}
            className="text-red-500 focus:text-red-500"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Eliminar
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <CallAnalysisInfo
        open={showAnalysisInfo}
        onOpenChange={setShowAnalysisInfo}
        callData={{
          id: call.id,
          title: call.title,
          prompts: {
            summary: "Prompt de resumen aplicado", // This would come from actual data
            feedback: "Prompt de feedback aplicado", // This would come from actual data
          },
          behaviors: [
            // This would come from actual behavior data associated with the call
            { name: "Saludo", description: "Evaluación del saludo inicial" },
            { name: "Cierre", description: "Evaluación del cierre de la llamada" }
          ]
        }}
      />
    </>
  );
});

ActionCell.displayName = 'ActionCell';

export const CallTable = memo(({
  calls,
  isLoading,
  selectedCalls,
  multiSelectMode,
  onDeleteCall,
  onToggleCallSelection,
  onToggleAllCalls,
}: CallTableProps) => {
  const columns: ColumnDef<Call>[] = [
    ...(multiSelectMode ? [
      {
        id: "select",
        header: ({ table }) => (
          <Checkbox 
            checked={table.getRowModel().rows.length > 0 && selectedCalls.length === table.getRowModel().rows.length} 
            onCheckedChange={(value) => onToggleAllCalls(!!value)}
            aria-label="Select all"
          />
        ),
        cell: ({ row }) => (
          <Checkbox 
            checked={selectedCalls.includes(row.original.id)}
            onCheckedChange={() => onToggleCallSelection(row.original.id)}
            aria-label="Select row"
          />
        ),
        enableSorting: false,
        enableHiding: false,
      }
    ] : []),
    {
      accessorKey: "title",
      header: "Título",
      cell: ({ row }) => (
        <Link to={`/calls/${row.original.id}`} className="hover:underline">
          {row.getValue("title")}
        </Link>
      ),
    },
    {
      accessorKey: "duration",
      header: "Duración",
      cell: ({ row }) => formatDuration(row.getValue("duration")),
    },
    {
      accessorKey: "date",
      header: "Fecha",
      cell: ({ row }) => formatDate(row.getValue("date")),
    },
    {
      accessorKey: "agentName",
      header: "Agente",
    },
    {
      accessorKey: "statusSummary",
      header: "Resumen",
      cell: ({ row }) => {
        const summary = row.getValue("statusSummary") as string;
        if (!summary) return "-";
        
        return (
          <Badge variant="outline" className="font-normal">
            {summary}
          </Badge>
        );
      },
    },
    {
      accessorKey: "status",
      header: "Estado",
      cell: ({ row }) => <StatusBadge status={row.getValue("status")} />,
    },
    {
      id: "actions",
      header: "Acciones",
      cell: ({ row }) => (
        <ActionCell 
          id={row.original.id} 
          onDeleteCall={onDeleteCall}
          call={row.original}
        />
      ),
    },
  ];

  const table = useReactTable({
    data: calls,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  if (isLoading) {
    return (
      <div className="p-8 text-center">
        <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]" role="status">
          <span className="!absolute !-m-px !h-px !w-px !overflow-hidden !whitespace-nowrap !border-0 !p-0 ![clip:rect(0,0,0,0)]">
            Cargando...
          </span>
        </div>
        <p className="mt-2 text-muted-foreground">Cargando llamadas...</p>
      </div>
    );
  }

  if (calls.length === 0) {
    return (
      <div className="p-8 text-center">
        <p className="text-muted-foreground">No se encontraron llamadas.</p>
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        {table.getHeaderGroups().map((headerGroup) => (
          <TableRow key={headerGroup.id}>
            {headerGroup.headers.map((header) => (
              <TableHead key={header.id}>
                {header.isPlaceholder
                  ? null
                  : flexRender(
                      header.column.columnDef.header,
                      header.getContext()
                    )}
              </TableHead>
            ))}
          </TableRow>
        ))}
      </TableHeader>
      <TableBody>
        {table.getRowModel().rows.length > 0 ? (
          table.getRowModel().rows.map((row) => (
            <TableRow 
              key={row.id}
              className={selectedCalls.includes(row.original.id) ? "bg-accent/30" : ""}
              onClick={() => multiSelectMode && onToggleCallSelection(row.original.id)}
              style={{ cursor: multiSelectMode ? "pointer" : "default" }}
            >
              {row.getVisibleCells().map((cell) => (
                <TableCell key={cell.id}>
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </TableCell>
              ))}
            </TableRow>
          ))
        ) : (
          <TableRow>
            <TableCell colSpan={columns.length} className="h-24 text-center">
              No se encontraron llamadas.
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  );
});

CallTable.displayName = 'CallTable';
