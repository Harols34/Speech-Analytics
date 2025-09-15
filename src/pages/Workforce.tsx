
import Layout from "@/components/layout/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function WorkforcePage() {
  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Supervisión</h2>
          <p className="text-muted-foreground">
            Monitoreo y supervisión de equipos de trabajo
          </p>
        </div>
        
        <Card>
          <CardHeader>
            <CardTitle>Panel de Supervisión</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">Contenido en desarrollo...</p>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
