import Layout from '@/components/layout/Layout';
import { PermissionsAssignment } from '@/components/permissions/PermissionsAssignment';
import { Shield } from 'lucide-react';

export default function Permissions() {
  return (
    <Layout>
        <div className="space-y-6">
          <div>
            <h2 className="text-3xl font-bold tracking-tight flex items-center gap-2">
              <Shield className="h-8 w-8" />
              Gestión de Permisos
            </h2>
            <p className="text-muted-foreground mt-1">
              Asigna permisos por rol o usuario de forma individual
            </p>
          </div>

        <PermissionsAssignment />
        </div>
    </Layout>
  );
}
