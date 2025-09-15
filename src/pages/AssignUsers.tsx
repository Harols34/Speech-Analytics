
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, UserCheck, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import Layout from "@/components/layout/Layout";
import { useAuth } from "@/context/AuthContext";

interface User {
  id: string;
  email?: string;
  full_name: string;
  role: string;
}

interface Account {
  id: string;
  name: string;
  status: string;
}

interface UserAssignment {
  id: string;
  user_id: string;
  account_id: string;
  user: User;
  account: Account;
}

const AssignUsers = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [assignments, setAssignments] = useState<UserAssignment[]>([]);
  const [selectedUser, setSelectedUser] = useState("");
  const [selectedAccount, setSelectedAccount] = useState("");

  // Only superAdmins can assign users
  if (user?.role !== "superAdmin") {
    return (
      <Layout>
        <div className="container mx-auto py-8">
          <Card>
            <CardContent className="pt-6">
              <p className="text-center text-muted-foreground">
                Solo los Super Administradores pueden asignar usuarios a cuentas.
              </p>
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      // Load users from profiles
      const { data: usersData, error: usersError } = await supabase
        .from('profiles')
        .select('id, full_name, role');

      if (usersError) throw usersError;

      // Load accounts
      const { data: accountsData, error: accountsError } = await supabase
        .from('accounts')
        .select('*')
        .order('name');

      if (accountsError) throw accountsError;

      // Load existing assignments with proper joins
      const { data: assignmentsData, error: assignmentsError } = await supabase
        .from('user_accounts')
        .select(`
          id,
          user_id,
          account_id,
          created_at
        `)
        .order('created_at', { ascending: false });

      if (assignmentsError) throw assignmentsError;

      // Get user and account details for each assignment
      const enrichedAssignments: UserAssignment[] = [];
      if (assignmentsData) {
        for (const assignment of assignmentsData) {
          const { data: userData } = await supabase
            .from('profiles')
            .select('id, full_name, role')
            .eq('id', assignment.user_id)
            .single();

          const { data: accountData } = await supabase
            .from('accounts')
            .select('id, name, status')
            .eq('id', assignment.account_id)
            .single();

          if (userData && accountData) {
            enrichedAssignments.push({
              ...assignment,
              user: userData,
              account: accountData,
            });
          }
        }
      }

      setUsers(usersData || []);
      setAccounts(accountsData || []);
      setAssignments(enrichedAssignments);
    } catch (error: any) {
      console.error("Error loading data:", error);
      toast.error("Error al cargar los datos");
    }
  };

  const handleAssign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser || !selectedAccount) {
      toast.error("Selecciona un usuario y una cuenta");
      return;
    }

    setLoading(true);

    try {
      // Check if assignment already exists
      const existingAssignment = assignments.find(
        a => a.user_id === selectedUser && a.account_id === selectedAccount
      );

      if (existingAssignment) {
        toast.error("El usuario ya está asignado a esta cuenta");
        return;
      }

      const { error } = await supabase
        .from('user_accounts')
        .insert([{
          user_id: selectedUser,
          account_id: selectedAccount,
        }]);

      if (error) throw error;

      toast.success("Usuario asignado exitosamente");
      setSelectedUser("");
      setSelectedAccount("");
      loadData(); // Reload assignments
    } catch (error: any) {
      console.error("Error assigning user:", error);
      toast.error(error.message || "Error al asignar el usuario");
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveAssignment = async (assignmentId: string) => {
    try {
      const { error } = await supabase
        .from('user_accounts')
        .delete()
        .eq('id', assignmentId);

      if (error) throw error;

      toast.success("Asignación removida exitosamente");
      loadData(); // Reload assignments
    } catch (error: any) {
      console.error("Error removing assignment:", error);
      toast.error("Error al remover la asignación");
    }
  };

  return (
    <Layout>
      <div className="container mx-auto py-8">
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={() => navigate("/accounts")}
            className="mb-4"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver a Cuentas
          </Button>
          
          <div className="flex items-center gap-2">
            <UserCheck className="h-6 w-6 text-primary" />
            <h1 className="text-3xl font-bold">Asignar Usuarios a Cuentas</h1>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Assignment Form */}
          <Card>
            <CardHeader>
              <CardTitle>Nueva Asignación</CardTitle>
              <CardDescription>
                Asigna un usuario a una cuenta específica.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleAssign} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="user">Usuario *</Label>
                  <Select value={selectedUser} onValueChange={setSelectedUser}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar usuario" />
                    </SelectTrigger>
                    <SelectContent>
                      {users.map((user) => (
                        <SelectItem key={user.id} value={user.id}>
                          {user.full_name} ({user.role})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="account">Cuenta *</Label>
                  <Select value={selectedAccount} onValueChange={setSelectedAccount}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar cuenta" />
                    </SelectTrigger>
                    <SelectContent>
                      {accounts.map((account) => (
                        <SelectItem key={account.id} value={account.id}>
                          {account.name} ({account.status})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <Button
                  type="submit"
                  disabled={loading || !selectedUser || !selectedAccount}
                  className="w-full"
                >
                  {loading ? "Asignando..." : "Asignar Usuario"}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Current Assignments */}
          <Card>
            <CardHeader>
              <CardTitle>Asignaciones Actuales</CardTitle>
              <CardDescription>
                Lista de usuarios asignados a cuentas.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {assignments.length === 0 ? (
                  <p className="text-muted-foreground text-center py-4">
                    No hay asignaciones registradas.
                  </p>
                ) : (
                  assignments.map((assignment) => (
                    <div
                      key={assignment.id}
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <div className="flex-1">
                        <p className="font-medium">{assignment.user?.full_name}</p>
                        <p className="text-sm text-muted-foreground">
                          {assignment.account?.name}
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleRemoveAssignment(assignment.id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
};

export default AssignUsers;
