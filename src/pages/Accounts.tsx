
import { useState, useEffect } from "react";
import { Routes, Route, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Layout from "@/components/layout/Layout";
import AccountList from "@/components/accounts/AccountList";
import AccountForm from "@/components/accounts/AccountForm";
import UserAccountAssignment from "@/components/accounts/UserAccountAssignment";
import BulkAccountUpload from "@/components/accounts/BulkAccountUpload";
import BulkUserAssignment from "@/components/accounts/BulkUserAssignment";
import { ArrowLeft, Building2, Users, Upload, UserCheck } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function AccountsPage() {
  const navigate = useNavigate();
  const { user, isAuthenticated, loading } = useAuth();

  // CORREGIDO: Solo verificar que esté autenticado y tenga el rol SuperAdmin
  useEffect(() => {
    if (!loading && isAuthenticated && user) {
      console.log("Checking access for user:", user.email, "role:", user.role);
      
      // Solo SuperAdmin puede acceder a gestión de cuentas
      if (user.role !== 'superAdmin') {
        console.log("Access denied - user is not SuperAdmin");
        toast.error("Acceso denegado", {
          description: "Solo los SuperAdmins pueden acceder a la gestión de cuentas"
        });
        navigate("/analytics");
      } else {
        console.log("Access granted - user is SuperAdmin");
      }
    }
  }, [user, isAuthenticated, loading, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
          <p className="text-muted-foreground">Cargando...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <p className="text-muted-foreground">Debes iniciar sesión para acceder a esta página</p>
          <Button onClick={() => navigate("/login")}>Iniciar Sesión</Button>
        </div>
      </div>
    );
  }

  // SOLO verificar que sea SuperAdmin
  if (user?.role !== 'superAdmin') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <p className="text-muted-foreground">No tienes permisos para acceder a esta página</p>
          <Button onClick={() => navigate("/analytics")}>Volver al Inicio</Button>
        </div>
      </div>
    );
  }

  return (
    <Layout>
      <Routes>
        <Route
          path="/"
          element={
            <div className="space-y-6">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between">
                <div>
                  <h2 className="text-3xl font-bold tracking-tight">Gestión de Cuentas</h2>
                  <p className="text-muted-foreground">
                    Administrar cuentas y asignaciones de usuarios
                  </p>
                </div>
                <div className="flex gap-2 mt-4 md:mt-0">
                  <Button onClick={() => navigate("/accounts/assign")} variant="outline">
                    <Users className="mr-2 h-4 w-4" /> Asignar Usuarios
                  </Button>
                  <Button onClick={() => navigate("/accounts/new")}>
                    <Building2 className="mr-2 h-4 w-4" /> Nueva Cuenta
                  </Button>
                </div>
              </div>

              <Tabs defaultValue="list" className="space-y-6">
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="list" className="flex items-center gap-2">
                    <Building2 className="h-4 w-4" />
                    Cuentas
                  </TabsTrigger>
                  <TabsTrigger value="bulk-accounts" className="flex items-center gap-2">
                    <Upload className="h-4 w-4" />
                    Carga Masiva
                  </TabsTrigger>
                  <TabsTrigger value="assignments" className="flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Asignaciones
                  </TabsTrigger>
                  <TabsTrigger value="bulk-assign" className="flex items-center gap-2">
                    <UserCheck className="h-4 w-4" />
                    Asign. Múltiple
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="list" className="space-y-6">
                  <AccountList />
                </TabsContent>

                <TabsContent value="bulk-accounts" className="space-y-6">
                  <BulkAccountUpload />
                </TabsContent>

                <TabsContent value="assignments" className="space-y-6">
                  <UserAccountAssignment />
                </TabsContent>

                <TabsContent value="bulk-assign" className="space-y-6">
                  <BulkUserAssignment />
                </TabsContent>
              </Tabs>
            </div>
          }
        />
        <Route
          path="/new"
          element={
            <div className="space-y-6">
              <div className="flex items-center gap-4">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate("/accounts")}
                >
                  <ArrowLeft className="h-4 w-4 mr-2" /> Volver
                </Button>
                <div>
                  <h2 className="text-3xl font-bold tracking-tight">Crear Nueva Cuenta</h2>
                  <p className="text-muted-foreground">
                    Agregar una nueva cuenta al sistema
                  </p>
                </div>
              </div>
              <AccountForm />
            </div>
          }
        />
        <Route
          path="/assign"
          element={
            <div className="space-y-6">
              <div className="flex items-center gap-4">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate("/accounts")}
                >
                  <ArrowLeft className="h-4 w-4 mr-2" /> Volver
                </Button>
                <div>
                  <h2 className="text-3xl font-bold tracking-tight">Asignar Usuarios a Cuentas</h2>
                  <p className="text-muted-foreground">
                    Gestionar las asignaciones de usuarios a cuentas
                  </p>
                </div>
              </div>
              <UserAccountAssignment />
            </div>
          }
        />
      </Routes>
    </Layout>
  );
}
