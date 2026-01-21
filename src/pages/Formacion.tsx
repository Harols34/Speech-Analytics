import React from 'react';
import Layout from "@/components/layout/Layout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ActiveScenariosManager } from '@/components/training/student/ActiveScenariosManager';
import { TrainingHistory } from '@/components/training/student/TrainingHistory';
import { Play, History } from 'lucide-react';

export default function FormacionPage() {
  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Formación</h2>
          <p className="text-muted-foreground">
            Centro de formación y desarrollo profesional
          </p>
        </div>
        
        <Tabs defaultValue="escenarios" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="escenarios" className="flex items-center gap-2">
              <Play className="h-4 w-4" />
              Escenarios Activos
            </TabsTrigger>
            <TabsTrigger value="historial" className="flex items-center gap-2">
              <History className="h-4 w-4" />
              Historial
            </TabsTrigger>
          </TabsList>

          <TabsContent value="escenarios">
            <ActiveScenariosManager />
          </TabsContent>

          <TabsContent value="historial">
            <TrainingHistory />
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}