
import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "next-themes";
import { AuthProvider } from "./context/AuthContext";
import { AccountProvider } from "./context/AccountContext";
import { ProtectedRoute } from "./components/auth/ProtectedRoute";
import { RoleBasedRoute } from "@/components/training/RoleBasedRoute";

// Pages
import Index from "./pages/Index";
import Login from "./pages/Login";
import Analytics from "./pages/Analytics";
import Calls from "./pages/Calls";
import Agents from "./pages/Agents";
import Workforce from "./pages/Workforce";
import Tools from "./pages/Tools";
import Chat from "./pages/Chat";
import Behaviors from "./pages/Behaviors";
import Tipificaciones from "./pages/Tipificaciones";
import Prompts from "./pages/Prompts";
import Users from "./pages/Users";
import AccountsPage from "./pages/Accounts";
import Settings from "./pages/Settings";
import Limits from "./pages/Limits";
import NotFound from "./pages/NotFound";
import CreateAccount from "./pages/CreateAccount";
import AssignUsers from "./pages/AssignUsers";
import Facturacion from "./pages/Facturacion";
import AdminFormacion from "./pages/AdminFormacion";
import Formacion from "./pages/Formacion";
import Permissions from "./pages/Permissions";

import "./App.css";

// Create QueryClient outside component to prevent recreating on each render
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 10 * 60 * 1000, // 10 minutes
      gcTime: 30 * 60 * 1000, // 30 minutes
      retry: 1,
      refetchOnWindowFocus: false,
      refetchOnMount: false,
      refetchOnReconnect: false,
    },
    mutations: {
      retry: 1,
    },
  },
});

function App() {
  return (
    <React.StrictMode>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider attribute="class" defaultTheme="light">
          <TooltipProvider>
            <Router>
              <AuthProvider>
                <AccountProvider>
                  <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 w-full">
                    <Routes>
                      <Route path="/" element={<Index />} />
                      <Route path="/login" element={<Login />} />
                      
                      {/* Rutas Protegidas por Autenticación + Permisos por Módulo */}
                      <Route path="/analytics" element={
                        <ProtectedRoute>
                          <RoleBasedRoute moduleName="analytics">
                            <Analytics />
                          </RoleBasedRoute>
                        </ProtectedRoute>
                      } />
                      
                      <Route path="/calls/*" element={
                        <ProtectedRoute>
                          <RoleBasedRoute moduleName="calls">
                            <Calls />
                          </RoleBasedRoute>
                        </ProtectedRoute>
                      } />
                      
                      <Route path="/agents" element={
                        <ProtectedRoute>
                          <RoleBasedRoute moduleName="agents">
                            <Agents />
                          </RoleBasedRoute>
                        </ProtectedRoute>
                      } />
                      
                      <Route path="/workforce" element={
                        <ProtectedRoute>
                          <RoleBasedRoute moduleName="workforce">
                            <Workforce />
                          </RoleBasedRoute>
                        </ProtectedRoute>
                      } />
                      
                      <Route path="/tools" element={
                        <ProtectedRoute>
                          <RoleBasedRoute moduleName="tools">
                            <Tools />
                          </RoleBasedRoute>
                        </ProtectedRoute>
                      } />
                      
                      <Route path="/chat/*" element={
                        <ProtectedRoute>
                          <RoleBasedRoute moduleName="chat">
                            <Chat />
                          </RoleBasedRoute>
                        </ProtectedRoute>
                      } />
                      
                      <Route path="/behaviors/*" element={
                        <ProtectedRoute>
                          <RoleBasedRoute moduleName="behaviors">
                            <Behaviors />
                          </RoleBasedRoute>
                        </ProtectedRoute>
                      } />
                      
                      <Route path="/tipificaciones" element={
                        <ProtectedRoute>
                          <RoleBasedRoute moduleName="tipificaciones">
                            <Tipificaciones />
                          </RoleBasedRoute>
                        </ProtectedRoute>
                      } />
                      
                      <Route path="/prompts/*" element={
                        <ProtectedRoute>
                          <RoleBasedRoute moduleName="prompts">
                            <Prompts />
                          </RoleBasedRoute>
                        </ProtectedRoute>
                      } />
                      
                      <Route path="/users" element={
                        <ProtectedRoute>
                          <RoleBasedRoute moduleName="users">
                            <Users />
                          </RoleBasedRoute>
                        </ProtectedRoute>
                      } />
                      
                      <Route path="/accounts/*" element={
                        <ProtectedRoute>
                          <RoleBasedRoute moduleName="accounts">
                            <AccountsPage />
                          </RoleBasedRoute>
                        </ProtectedRoute>
                      } />
                      
                      <Route path="/accounts/new" element={
                        <ProtectedRoute>
                          <RoleBasedRoute moduleName="accounts">
                            <CreateAccount />
                          </RoleBasedRoute>
                        </ProtectedRoute>
                      } />
                      
                      <Route path="/accounts/assign" element={
                        <ProtectedRoute>
                          <RoleBasedRoute moduleName="accounts">
                            <AssignUsers />
                          </RoleBasedRoute>
                        </ProtectedRoute>
                      } />
                      
                      <Route path="/facturacion" element={
                        <ProtectedRoute>
                          <RoleBasedRoute moduleName="facturacion">
                            <Facturacion />
                          </RoleBasedRoute>
                        </ProtectedRoute>
                      } />
                      
                      <Route path="/limits" element={
                        <ProtectedRoute>
                          <RoleBasedRoute moduleName="limits">
                            <Limits />
                          </RoleBasedRoute>
                        </ProtectedRoute>
                      } />
                      
                      <Route path="/admin-formacion" element={
                        <ProtectedRoute>
                          <RoleBasedRoute moduleName="admin-formacion">
                            <AdminFormacion />
                          </RoleBasedRoute>
                        </ProtectedRoute>
                      } />
                      
                      <Route path="/formacion" element={
                        <ProtectedRoute>
                          <RoleBasedRoute moduleName="formacion">
                            <Formacion />
                          </RoleBasedRoute>
                        </ProtectedRoute>
                      } />
                      
                      <Route path="/permissions" element={
                        <ProtectedRoute>
                          <RoleBasedRoute moduleName="permissions">
                            <Permissions />
                          </RoleBasedRoute>
                        </ProtectedRoute>
                      } />
                      
                      <Route path="/settings" element={
                        <ProtectedRoute>
                          <Settings />
                        </ProtectedRoute>
                      } />
                      
                      <Route path="/dashboard" element={<Navigate to="/" replace />} />
                      <Route path="*" element={<NotFound />} />
                    </Routes>
                  </div>
                  <Toaster />
                </AccountProvider>
              </AuthProvider>
            </Router>
          </TooltipProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </React.StrictMode>
  );
}

export default App;
