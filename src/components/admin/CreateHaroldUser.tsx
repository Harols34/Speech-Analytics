
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { UserPlus } from 'lucide-react';

const CreateHaroldUser: React.FC = () => {
  const [isCreating, setIsCreating] = useState(false);

  const createHaroldUser = async () => {
    setIsCreating(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('create-user', {
        body: {
          email: 'harold.alvarez@convertia.com',
          password: 'Harold123*',
          fullName: 'harold sneid',
          role: 'agent',
          accountNames: ['Claro', 'Tigo']
        }
      });

      if (error) throw error;

      if (data.success) {
        toast.success('Usuario Harold creado exitosamente', {
          description: 'El usuario tiene acceso solo a las cuentas Claro y Tigo'
        });
      } else {
        throw new Error(data.error || 'Error desconocido');
      }
    } catch (error: any) {
      console.error('Error creating Harold user:', error);
      toast.error('Error al crear usuario', {
        description: error.message
      });
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="flex items-center">
          <UserPlus className="h-5 w-5 mr-2" />
          Crear Usuario Harold
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="text-sm text-muted-foreground">
            <p><strong>Nombre:</strong> harold sneid</p>
            <p><strong>Email:</strong> harold.alvarez@convertia.com</p>
            <p><strong>Rol:</strong> Usuario</p>
            <p><strong>Cuentas:</strong> Claro, Tigo</p>
          </div>
          
          <Button 
            onClick={createHaroldUser} 
            disabled={isCreating}
            className="w-full"
          >
            {isCreating ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Creando...
              </>
            ) : (
              <>
                <UserPlus className="h-4 w-4 mr-2" />
                Crear Usuario
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default CreateHaroldUser;
