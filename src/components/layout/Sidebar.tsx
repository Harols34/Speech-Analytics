import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/context/AuthContext";
import { useAccount } from "@/context/AccountContext";
import AccountSelector from "./AccountSelector";
import { BarChart3, Phone, Users, Eye, Wrench, MessageSquare, Brain, Tag, FileText, User, Building2, Settings, ChevronLeft, ChevronRight, LogOut, Search } from "lucide-react";
import { MenuItem } from "@/lib/types";
const menuItems: MenuItem[] = [{
  name: "Análisis",
  href: "/analytics",
  icon: <BarChart3 className="h-4 w-4" />,
  role: ["superAdmin", "admin", "qualityAnalyst", "supervisor", "agent"]
}, {
  name: "Llamadas",
  href: "/calls",
  icon: <Phone className="h-4 w-4" />,
  role: ["superAdmin", "admin", "qualityAnalyst", "supervisor", "agent"]
}, {
  name: "Agentes",
  href: "/agents",
  icon: <Users className="h-4 w-4" />,
  role: ["superAdmin", "admin", "supervisor"]
}, {
  name: "Supervisión",
  href: "/workforce",
  icon: <Eye className="h-4 w-4" />,
  role: ["superAdmin", "admin", "supervisor"]
}, {
  name: "Herramientas",
  href: "/tools",
  icon: <Wrench className="h-4 w-4" />,
  role: ["superAdmin", "admin"]
}, {
  name: "Consulta IA",
  href: "/chat",
  icon: <MessageSquare className="h-4 w-4" />,
  role: ["superAdmin", "admin", "qualityAnalyst", "supervisor", "agent"]
}, {
  name: "Comportamientos",
  href: "/behaviors",
  icon: <Brain className="h-4 w-4" />,
  role: ["superAdmin", "admin", "qualityAnalyst", "supervisor"]
}, {
  name: "Tipificaciones",
  href: "/tipificaciones",
  icon: <Tag className="h-4 w-4" />,
  role: ["superAdmin", "admin", "qualityAnalyst", "supervisor"]
}, {
  name: "Prompts",
  href: "/prompts",
  icon: <FileText className="h-4 w-4" />,
  role: ["superAdmin", "admin", "qualityAnalyst", "supervisor"]
}, {
  name: "Usuarios",
  href: "/users",
  icon: <User className="h-4 w-4" />,
  role: ["superAdmin", "admin"]
}, {
  name: "Cuentas",
  href: "/accounts",
  icon: <Building2 className="h-4 w-4" />,
  role: ["superAdmin"]
}];
export default function Sidebar() {
  const location = useLocation();
  const {
    user,
    signOut
  } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  // Filter menu items based on user role
  const filteredMenuItems = React.useMemo(() => {
    if (!user) return [];
    return menuItems.filter(item => item.role.includes(user.role));
  }, [user]);
  if (!user) {
    return <div className="w-64 border-r bg-gray-50/40 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>;
  }
  return <div className={cn("border-r bg-gray-50/40 transition-all duration-300 flex flex-col h-full", collapsed ? "w-16" : "w-64")}>
      {/* Header */}
      <div className="flex h-14 items-center border-b lg:h-[60px] lg:px-6 shrink-0 px-[17px] mx-[-6px]">
        <div className="flex items-center justify-between w-full mx-[-8px] py-0 my-[2px] px-[0px]">
          {!collapsed && <Link to="/" className="flex items-center gap-2 font-semibold">
              <img src="https://www.convertia.com/favicon/favicon-convertia.png" alt="Convert-IA Logo" className="h-6 w-6" />
              <span className="text-lg text-primary">Convert-IA</span>
            </Link>}
          {collapsed && <img src="https://www.convertia.com/favicon/favicon-convertia.png" alt="Convert-IA Logo" className="h-6 w-6 mx-auto" />}
          <Button variant="ghost" size="sm" onClick={() => setCollapsed(!collapsed)} className="h-8 w-8 p-0 shrink-0">
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {/* Account Selector - Only show when not collapsed */}
      {!collapsed && <AccountSelector />}

      {/* Navigation with ScrollArea */}
      <div className="flex-1 overflow-hidden">
        <ScrollArea className="h-full">
          <div className="flex flex-col gap-2 p-4">
            {filteredMenuItems.map(item => <Link key={item.href} to={item.href} className={cn("flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground", location.pathname.startsWith(item.href.split('?')[0]) ? "bg-accent text-accent-foreground" : "text-muted-foreground", collapsed && "justify-center px-2")} title={collapsed ? item.name : undefined}>
                {item.icon}
                {!collapsed && <span>{item.name}</span>}
              </Link>)}
            
            {/* Search hint for Ctrl+K */}
            {!collapsed && <div className="mt-4 p-2 bg-blue-50 rounded-lg border border-blue-200">
                <div className="flex items-center gap-2 text-xs text-blue-600">
                  <Search className="h-3 w-3" />
                  <span>Presiona <kbd className="px-1 py-0.5 bg-blue-100 rounded">Ctrl+K</kbd> para buscar</span>
                </div>
              </div>}
          </div>
        </ScrollArea>
      </div>

      {/* User Section */}
      <div className="shrink-0 mt-auto">
        <Separator />
        <div className="p-4">
          {/* Settings Link */}
          <Link to="/settings" className={cn("flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground mb-2", location.pathname === "/settings" && "bg-accent text-accent-foreground", collapsed && "justify-center px-2")} title={collapsed ? "Configuración" : undefined}>
            <Settings className="h-4 w-4" />
            {!collapsed && <span>Configuración</span>}
          </Link>

          {/* User Info and Logout */}
          {!collapsed && user && <div className="space-y-2">
              <div className="px-3 py-2 text-xs text-muted-foreground">
                <p className="font-medium text-foreground truncate">
                  {user.full_name || user.email}
                </p>
                <p className="capitalize">{user.role}</p>
              </div>
              
              <Button variant="ghost" size="sm" onClick={handleSignOut} className="w-full justify-start text-muted-foreground hover:text-accent-foreground">
                <LogOut className="h-4 w-4 mr-2" />
                Cerrar Sesión
              </Button>
            </div>}

          {/* Collapsed logout button */}
          {collapsed && <Button variant="ghost" size="sm" onClick={handleSignOut} className="w-full p-2 justify-center" title="Cerrar Sesión">
              <LogOut className="h-4 w-4" />
            </Button>}
        </div>
      </div>
    </div>;
}