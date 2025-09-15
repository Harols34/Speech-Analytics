
import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import UserEditModal from "./UserEditModal";
import { Edit2, Plus, Search, Trash2, Users, RefreshCw } from "lucide-react";

interface User {
  id: string;
  email: string;
  created_at: string;
  last_sign_in_at?: string;
  profile?: {
    full_name?: string;
    role?: string;
    language?: string;
  };
}

export default function UserList() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [deleteUserId, setDeleteUserId] = useState<string | null>(null);
  const [editUserId, setEditUserId] = useState<string | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const { user: currentUser } = useAuth();

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);

      // Get all user emails from edge function
      const { data: usersData, error: usersError } = await supabase.functions.invoke('getAllUserEmails', {
        body: { timestamp: new Date().getTime() }
      });

      if (usersError) {
        throw usersError;
      }

      // Get all profiles
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*');

      if (profilesError) {
        throw profilesError;
      }

      // Merge user data with profiles
      const mergedUsers = Object.entries(usersData?.userData || {}).map(([id, userData]: [string, any]) => {
        const profile = profiles?.find(p => p.id === id);
        return {
          id,
          email: userData.email,
          created_at: userData.created_at,
          last_sign_in_at: userData.last_sign_in_at,
          profile: profile ? {
            full_name: profile.full_name,
            role: profile.role,
            language: profile.language
          } : undefined
        };
      });

      setUsers(mergedUsers);
    } catch (error: any) {
      console.error("Error fetching users:", error);
      toast.error("Error al cargar usuarios", {
        description: error.message || "Hubo un problema al cargar la lista de usuarios.",
        duration: 3000,
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const filteredUsers = users.filter(user =>
    user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.profile?.full_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const deleteUser = async () => {
    if (!deleteUserId) return;

    try {
      const { error } = await supabase.functions.invoke('deleteUser', {
        body: { userId: deleteUserId }
      });

      if (error) throw error;

      toast.success("Usuario eliminado exitosamente");
      fetchUsers();
    } catch (error: any) {
      console.error("Error deleting user:", error);
      toast.error("Error al eliminar usuario", {
        description: error.message || "Hubo un problema al eliminar el usuario.",
        duration: 3000,
      });
    } finally {
      setDeleteUserId(null);
    }
  };

  const getRoleColor = (role?: string) => {
    switch (role) {
      case 'superAdmin':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'admin':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'qualityAnalyst':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'supervisor':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'agent':
        return 'bg-green-100 text-green-800 border-green-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const handleEditUser = (userId: string) => {
    setEditUserId(userId);
    setIsEditModalOpen(true);
  };

  const handleCloseEditModal = () => {
    setIsEditModalOpen(false);
    setEditUserId(null);
  };

  const handleEditSuccess = () => {
    fetchUsers();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              <CardTitle>Lista de Usuarios ({filteredUsers.length})</CardTitle>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={fetchUsers}
                disabled={loading}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Actualizar
              </Button>
              <Button size="sm" onClick={() => window.location.href = '/users/new'}>
                <Plus className="h-4 w-4 mr-2" />
                Crear Usuario
              </Button>
            </div>
          </div>
          
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Buscar por email o nombre..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardHeader>
        
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Usuario</TableHead>
                  <TableHead>Rol</TableHead>
                  <TableHead>Idioma</TableHead>
                  <TableHead>Último acceso</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium">{user.profile?.full_name || 'Sin nombre'}</span>
                        <span className="text-sm text-muted-foreground">{user.email}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={getRoleColor(user.profile?.role)}>
                        {user.profile?.role || 'Sin rol'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className="capitalize">{user.profile?.language || 'es'}</span>
                    </TableCell>
                    <TableCell>
                      {user.last_sign_in_at 
                        ? new Date(user.last_sign_in_at).toLocaleDateString()
                        : 'Nunca'
                      }
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEditUser(user.id)}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        {currentUser?.role === "superAdmin" && user.id !== currentUser.id && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setDeleteUserId(user.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {filteredUsers.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8">
                      <div className="text-muted-foreground">
                        {searchTerm ? 'No se encontraron usuarios que coincidan con la búsqueda.' : 'No hay usuarios registrados.'}
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <UserEditModal
        userId={editUserId}
        isOpen={isEditModalOpen}
        onClose={handleCloseEditModal}
        onSuccess={handleEditSuccess}
      />

      <AlertDialog open={!!deleteUserId} onOpenChange={() => setDeleteUserId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. ¿Deseas eliminar este usuario permanentemente?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={deleteUser}>
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
