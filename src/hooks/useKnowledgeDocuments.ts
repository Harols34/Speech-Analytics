import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { KnowledgeDocument } from '@/lib/types/training';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';

export function useKnowledgeDocuments() {
  const [documents, setDocuments] = useState<KnowledgeDocument[]>([]);
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();

  const fetchDocuments = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('knowledge_documents')
        .select('*')
        .order('uploaded_at', { ascending: false });

      if (error) throw error;
      
      const typedDocuments: KnowledgeDocument[] = (data || []).map(item => ({
        id: item.id,
        name: item.name,
        type: item.type as 'pdf' | 'doc' | 'txt' | 'manual' | 'policy',
        file_url: item.file_url,
        description: item.description,
        content_summary: item.content_summary,
        uploaded_at: item.uploaded_at,
        file_size: item.file_size,
        status: item.status as 'processing' | 'ready' | 'error',
        account_id: item.account_id,
        uploaded_by: item.uploaded_by
      }));
      
      setDocuments(typedDocuments);
    } catch (error) {
      console.error('Error fetching documents:', error);
      toast.error('Error al cargar los documentos');
    } finally {
      setLoading(false);
    }
  };

  const uploadDocument = async (document: Omit<KnowledgeDocument, 'id' | 'uploaded_at'>) => {
    try {
      const dbDocument = {
        name: document.name,
        type: document.type,
        file_url: document.file_url,
        description: document.description,
        content_summary: document.content_summary,
        file_size: document.file_size,
        status: document.status,
        account_id: document.account_id,
        uploaded_by: user?.id
      };

      const { data, error } = await supabase
        .from('knowledge_documents')
        .insert([dbDocument])
        .select()
        .single();

      if (error) throw error;
      
      const typedDocument: KnowledgeDocument = {
        id: data.id,
        name: data.name,
        type: data.type as 'pdf' | 'doc' | 'txt' | 'manual' | 'policy',
        file_url: data.file_url,
        description: data.description,
        content_summary: data.content_summary,
        uploaded_at: data.uploaded_at,
        file_size: data.file_size,
        status: data.status as 'processing' | 'ready' | 'error',
        account_id: data.account_id,
        uploaded_by: data.uploaded_by
      };
      
      setDocuments(prev => [typedDocument, ...prev]);
      toast.success('Documento subido exitosamente');
      return typedDocument;
    } catch (error) {
      console.error('Error uploading document:', error);
      toast.error('Error al subir el documento');
      throw error;
    }
  };

  const updateDocument = async (id: string, updates: Partial<KnowledgeDocument>) => {
    try {
      const dbUpdates = {
        ...(updates.name && { name: updates.name }),
        ...(updates.type && { type: updates.type }),
        ...(updates.file_url && { file_url: updates.file_url }),
        ...(updates.description !== undefined && { description: updates.description }),
        ...(updates.content_summary !== undefined && { content_summary: updates.content_summary }),
        ...(updates.file_size && { file_size: updates.file_size }),
        ...(updates.status && { status: updates.status }),
        ...(updates.account_id && { account_id: updates.account_id })
      };

      const { data, error } = await supabase
        .from('knowledge_documents')
        .update(dbUpdates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      const typedDocument: KnowledgeDocument = {
        id: data.id,
        name: data.name,
        type: data.type as 'pdf' | 'doc' | 'txt' | 'manual' | 'policy',
        file_url: data.file_url,
        description: data.description,
        content_summary: data.content_summary,
        uploaded_at: data.uploaded_at,
        file_size: data.file_size,
        status: data.status as 'processing' | 'ready' | 'error',
        account_id: data.account_id,
        uploaded_by: data.uploaded_by
      };

      setDocuments(prev => prev.map(d => 
        d.id === id ? typedDocument : d
      ));
      toast.success('Documento actualizado exitosamente');
    } catch (error) {
      console.error('Error updating document:', error);
      toast.error('Error al actualizar el documento');
      throw error;
    }
  };

  const deleteDocument = async (id: string) => {
    try {
      const { error } = await supabase
        .from('knowledge_documents')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setDocuments(prev => prev.filter(d => d.id !== id));
      toast.success('Documento eliminado exitosamente');
    } catch (error) {
      console.error('Error deleting document:', error);
      toast.error('Error al eliminar el documento');
      throw error;
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, []);

  return {
    documents,
    loading,
    uploadDocument,
    updateDocument,
    deleteDocument,
    refetch: fetchDocuments
  };
}