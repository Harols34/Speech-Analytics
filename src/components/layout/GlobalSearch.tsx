
import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Command } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";

interface SearchItem {
  id: string;
  title: string;
  description: string;
  path: string;
  category: string;
  icon: string;
  keywords: string[];
  requiredRoles: string[];
}

interface GlobalSearchProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const GlobalSearch = ({ open, onOpenChange }: GlobalSearchProps) => {
  const [query, setQuery] = useState("");
  const [filteredItems, setFilteredItems] = useState<SearchItem[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const navigate = useNavigate();
  const { user } = useAuth();

  const allSearchItems: SearchItem[] = [
    {
      id: "analytics",
      title: "Análisis",
      description: "Métricas de llamadas e insights de rendimiento",
      path: "/analytics",
      category: "Operación",
      icon: "📊",
      keywords: ["analisis", "metricas", "estadisticas", "dashboard", "kpi"],
      requiredRoles: ["superAdmin", "admin", "qualityAnalyst", "supervisor", "agent"]
    },
    {
      id: "calls",
      title: "Llamadas",
      description: "Ver, gestionar y analizar llamadas",
      path: "/calls",
      category: "Operación",
      icon: "📞",
      keywords: ["llamadas", "conversaciones", "grabaciones", "telefono"],
      requiredRoles: ["superAdmin", "admin", "qualityAnalyst", "supervisor", "agent"]
    },
    {
      id: "agents",
      title: "Agentes",
      description: "Gestión de agentes de ventas",
      path: "/agents",
      category: "Operación",
      icon: "👥",
      keywords: ["agentes", "vendedores", "equipo", "personal"],
      requiredRoles: ["superAdmin", "admin", "qualityAnalyst", "supervisor"]
    },
    {
      id: "workforce",
      title: "Supervisión",
      description: "Monitoreo y supervisión de equipos",
      path: "/workforce",
      category: "Operación",
      icon: "👁️",
      keywords: ["supervision", "monitoreo", "control", "equipos"],
      requiredRoles: ["superAdmin", "admin", "supervisor"]
    },
    {
      id: "tools",
      title: "Herramientas",
      description: "Herramientas de análisis y procesamiento",
      path: "/tools",
      category: "Operación",
      icon: "🔧",
      keywords: ["herramientas", "utilidades", "procesamiento"],
      requiredRoles: ["superAdmin", "admin", "qualityAnalyst", "supervisor"]
    },
    {
      id: "chat",
      title: "Chat IA",
      description: "Asistente de inteligencia artificial",
      path: "/chat",
      category: "IA",
      icon: "🤖",
      keywords: ["chat", "ia", "artificial", "asistente", "bot"],
      requiredRoles: ["superAdmin", "admin", "qualityAnalyst", "supervisor", "agent"]
    },
    {
      id: "behaviors",
      title: "Comportamientos",
      description: "Análisis de patrones de comportamiento",
      path: "/behaviors",
      category: "IA",
      icon: "🧠",
      keywords: ["comportamientos", "patrones", "analisis", "conducta"],
      requiredRoles: ["superAdmin", "admin", "qualityAnalyst", "supervisor"]
    },
    {
      id: "tipificaciones",
      title: "Tipificaciones",
      description: "Categorización y etiquetado",
      path: "/tipificaciones",
      category: "IA",
      icon: "🏷️",
      keywords: ["tipificaciones", "categorias", "etiquetas", "clasificacion"],
      requiredRoles: ["superAdmin", "admin", "qualityAnalyst", "supervisor"]
    },
    {
      id: "prompts",
      title: "Prompts",
      description: "Gestión de prompts de IA",
      path: "/prompts",
      category: "IA",
      icon: "✏️",
      keywords: ["prompts", "plantillas", "instrucciones", "ia"],
      requiredRoles: ["superAdmin", "admin"]
    },
    {
      id: "users",
      title: "Usuarios",
      description: "Gestión de usuarios del sistema",
      path: "/users",
      category: "Administración",
      icon: "👤",
      keywords: ["usuarios", "cuentas", "perfiles", "administracion"],
      requiredRoles: ["superAdmin", "admin"]
    },
    {
      id: "accounts",
      title: "Cuentas",
      description: "Gestión de cuentas empresariales",
      path: "/accounts",
      category: "Administración",
      icon: "🏢",
      keywords: ["cuentas", "empresas", "organizaciones", "clientes"],
      requiredRoles: ["superAdmin"]
    },
    {
      id: "settings",
      title: "Configuración",
      description: "Configuración del sistema y perfil",
      path: "/settings",
      category: "Sistema",
      icon: "⚙️",
      keywords: ["configuracion", "ajustes", "perfil", "sistema"],
      requiredRoles: ["superAdmin", "admin", "qualityAnalyst", "supervisor", "agent"]
    }
  ];

  // Filter items based on user role
  const getAvailableItems = useCallback(() => {
    if (!user?.role) return [];
    
    return allSearchItems.filter(item => 
      item.requiredRoles.includes(user.role)
    );
  }, [user?.role]);

  const filterItems = useCallback((searchQuery: string) => {
    const availableItems = getAvailableItems();
    
    if (!searchQuery.trim()) {
      setFilteredItems(availableItems.slice(0, 8)); // Show first 8 available items
      return;
    }

    const filtered = availableItems.filter(item => {
      const searchTerm = searchQuery.toLowerCase();
      return (
        item.title.toLowerCase().includes(searchTerm) ||
        item.description.toLowerCase().includes(searchTerm) ||
        item.keywords.some(keyword => keyword.includes(searchTerm))
      );
    });

    setFilteredItems(filtered);
    setSelectedIndex(0);
  }, [getAvailableItems]);

  useEffect(() => {
    if (open) {
      filterItems(query);
    }
  }, [query, filterItems, open, user?.role]);

  useEffect(() => {
    if (!open) {
      setQuery("");
      setSelectedIndex(0);
    } else {
      // Reset items when opening
      filterItems("");
    }
  }, [open, filterItems]);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!open) return;

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setSelectedIndex(prev => (prev + 1) % filteredItems.length);
        break;
      case "ArrowUp":
        e.preventDefault();
        setSelectedIndex(prev => (prev - 1 + filteredItems.length) % filteredItems.length);
        break;
      case "Enter":
        e.preventDefault();
        if (filteredItems[selectedIndex]) {
          navigate(filteredItems[selectedIndex].path);
          onOpenChange(false);
        }
        break;
      case "Escape":
        onOpenChange(false);
        break;
    }
  }, [open, filteredItems, selectedIndex, navigate, onOpenChange]);

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  const handleItemClick = (item: SearchItem) => {
    navigate(item.path);
    onOpenChange(false);
  };

  if (!user) {
    return null; // Don't render search if no user
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl p-0 overflow-hidden">
        <DialogHeader className="px-4 py-3 border-b">
          <div className="flex items-center gap-3">
            <Search className="h-5 w-5 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar módulos disponibles..."
              className="border-0 bg-transparent text-lg focus-visible:ring-0 focus-visible:ring-offset-0"
              autoFocus
            />
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Command className="h-3 w-3" />
              <span>K</span>
            </div>
          </div>
        </DialogHeader>

        <div className="max-h-96 overflow-y-auto">
          {filteredItems.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              <Search className="h-8 w-8 mx-auto mb-3 opacity-50" />
              <p>No se encontraron módulos disponibles</p>
              <p className="text-sm">Intenta con otros términos de búsqueda</p>
            </div>
          ) : (
            <div className="p-2">
              {filteredItems.map((item, index) => (
                <button
                  key={item.id}
                  onClick={() => handleItemClick(item)}
                  className={cn(
                    "w-full flex items-center gap-3 p-3 rounded-lg text-left transition-colors",
                    index === selectedIndex
                      ? "bg-primary/10 text-primary"
                      : "hover:bg-gray-50"
                  )}
                >
                  <span className="text-2xl">{item.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium truncate">{item.title}</h3>
                      <span className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded-full">
                        {item.category}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground truncate mt-1">
                      {item.description}
                    </p>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    ↵
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="px-4 py-3 border-t bg-gray-50 text-xs text-muted-foreground">
          <div className="flex items-center justify-between">
            <span>Navega con ↑↓ • Selecciona con ↵</span>
            <span>ESC para cerrar • Solo módulos con acceso</span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default GlobalSearch;
