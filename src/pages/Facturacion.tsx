
import React from "react";
import { useAuth } from "@/context/AuthContext";
import InvoiceGenerator from "@/components/billing/InvoiceGenerator";
import Layout from "@/components/layout/Layout";
import { Card } from "@/components/ui/card";

export default function Facturacion() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <Layout>
        <div className="w-full h-full flex items-center justify-center">
          <div className="text-muted-foreground">Cargando...</div>
        </div>
      </Layout>
    );
  }

  if (!user || user.role !== "superAdmin") {
    return (
      <Layout>
        <div className="w-full h-full flex items-center justify-center p-6">
          <Card className="p-6 max-w-lg text-center">
            <h2 className="text-lg font-semibold">Acceso restringido</h2>
            <p className="text-sm text-muted-foreground mt-2">
              Este módulo está disponible solo para usuarios con rol superAdmin.
            </p>
          </Card>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <InvoiceGenerator />
    </Layout>
  );
}
