
import React from "react";
import Layout from "@/components/layout/Layout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import LimitsConfiguration from "@/components/limits/LimitsConfiguration";
import LimitsMetrics from "@/components/limits/LimitsMetrics";
import LimitsQuickConfig from "@/components/limits/LimitsQuickConfig";
import { Settings, BarChart3, Zap } from "lucide-react";

export default function LimitsPage() {
  return (
    <Layout>
      <div className="container mx-auto py-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Límites</h1>
          <p className="text-muted-foreground">
            Gestiona límites de uso y visualiza métricas de consumo por cuenta.
          </p>
        </div>

        <Tabs defaultValue="quick" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="quick" className="flex items-center gap-2">
              <Zap className="h-4 w-4" />
              Gestión Rápida
            </TabsTrigger>
            <TabsTrigger value="configuration" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Configuración Individual
            </TabsTrigger>
            <TabsTrigger value="metrics" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Métricas
            </TabsTrigger>
          </TabsList>

          <TabsContent value="quick">

            <Card>
              <CardHeader>
                <CardTitle>Gestión Rápida de Límites</CardTitle>
              </CardHeader>
              <CardContent>
                <LimitsQuickConfig />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="configuration">
            <Card>
              <CardHeader>
                <CardTitle>Configuración Individual de Límites por Cuenta</CardTitle>
                <CardDescription>
                  Establece límites mensuales personalizados para horas de transcripción, consultas de chatbot y minutos de entrenamiento por cuenta específica.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <LimitsConfiguration />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="metrics">
            <Card>
              <CardHeader>
                <CardTitle>Métricas de Uso</CardTitle>
                <CardDescription>
                  Visualiza el consumo en tiempo real de todos los servicios por cuenta incluyendo entrenamiento.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <LimitsMetrics />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}
