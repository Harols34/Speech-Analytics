
import Layout from "@/components/layout/Layout";
import UserList from "@/components/users/UserList";
import { RoleBasedRoute } from "@/components/training/RoleBasedRoute";

export default function UsersPage() {
  return (
    <Layout>
      <RoleBasedRoute 
        allowedRoles={['superAdmin', 'admin']}
        fallbackMessage="No tienes permisos para acceder a la gestión de usuarios"
      >
        <div className="space-y-6">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Usuarios</h2>
            <p className="text-muted-foreground">
              Crear y administrar usuarios del sistema
            </p>
          </div>
          <UserList />
        </div>
      </RoleBasedRoute>
    </Layout>
  );
}
