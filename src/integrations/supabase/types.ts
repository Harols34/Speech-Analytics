export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
      account_limits: {
        Row: {
          account_id: string
          creado_por: string | null
          fecha_creacion: string
          horas_adicionales: number | null
          id: string
          limite_consultas: number
          limite_horas: number
          limite_mensajes_chat: number | null
          limite_minutos_entrenamiento: number | null
          updated_at: string
        }
        Insert: {
          account_id: string
          creado_por?: string | null
          fecha_creacion?: string
          horas_adicionales?: number | null
          id?: string
          limite_consultas?: number
          limite_horas?: number
          limite_mensajes_chat?: number | null
          limite_minutos_entrenamiento?: number | null
          updated_at?: string
        }
        Update: {
          account_id?: string
          creado_por?: string | null
          fecha_creacion?: string
          horas_adicionales?: number | null
          id?: string
          limite_consultas?: number
          limite_horas?: number
          limite_mensajes_chat?: number | null
          limite_minutos_entrenamiento?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "account_limits_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: true
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "account_limits_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: true
            referencedRelation: "limits_dashboard"
            referencedColumns: ["account_id"]
          },
          {
            foreignKeyName: "account_limits_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: true
            referencedRelation: "limits_dashboard_v2"
            referencedColumns: ["account_id"]
          },
        ]
      }
      accounts: {
        Row: {
          created_at: string
          id: string
          name: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      agents: {
        Row: {
          account_id: string | null
          created_at: string | null
          id: string
          join_date: string
          name: string
          status: string
          supervisor: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          account_id?: string | null
          created_at?: string | null
          id?: string
          join_date?: string
          name: string
          status?: string
          supervisor?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          account_id?: string | null
          created_at?: string | null
          id?: string
          join_date?: string
          name?: string
          status?: string
          supervisor?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "agents_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agents_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "limits_dashboard"
            referencedColumns: ["account_id"]
          },
          {
            foreignKeyName: "agents_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "limits_dashboard_v2"
            referencedColumns: ["account_id"]
          },
        ]
      }
      app_settings: {
        Row: {
          created_at: string
          id: string
          key: string
          updated_at: string
          value: Json
        }
        Insert: {
          created_at?: string
          id?: string
          key: string
          updated_at?: string
          value: Json
        }
        Update: {
          created_at?: string
          id?: string
          key?: string
          updated_at?: string
          value?: Json
        }
        Relationships: []
      }
      behaviors: {
        Row: {
          account_id: string | null
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_active: boolean
          name: string
          prompt: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          account_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          prompt: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          account_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          prompt?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "behaviors_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "behaviors_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "limits_dashboard"
            referencedColumns: ["account_id"]
          },
          {
            foreignKeyName: "behaviors_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "limits_dashboard_v2"
            referencedColumns: ["account_id"]
          },
        ]
      }
      call_chat_messages: {
        Row: {
          account_id: string | null
          call_id: string
          content: string
          id: string
          role: string
          timestamp: string
          user_id: string | null
        }
        Insert: {
          account_id?: string | null
          call_id: string
          content: string
          id?: string
          role: string
          timestamp?: string
          user_id?: string | null
        }
        Update: {
          account_id?: string | null
          call_id?: string
          content?: string
          id?: string
          role?: string
          timestamp?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "call_chat_messages_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "call_chat_messages_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "limits_dashboard"
            referencedColumns: ["account_id"]
          },
          {
            foreignKeyName: "call_chat_messages_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "limits_dashboard_v2"
            referencedColumns: ["account_id"]
          },
          {
            foreignKeyName: "call_chat_messages_call_id_fkey"
            columns: ["call_id"]
            isOneToOne: false
            referencedRelation: "calls"
            referencedColumns: ["id"]
          },
        ]
      }
      calls: {
        Row: {
          account_id: string | null
          agent_id: string | null
          agent_name: string
          audio_url: string
          call_topic: string | null
          content_embedding: string | null
          created_at: string
          date: string
          duration: number
          entities: string[] | null
          filename: string
          id: string
          product: string | null
          progress: number
          reason: string | null
          result: string | null
          sentiment: string | null
          speaker_analysis: Json | null
          status: string
          status_summary: string | null
          summary: string | null
          tipificacion_id: string | null
          title: string
          topics: string[] | null
          transcription: string | null
          updated_at: string
        }
        Insert: {
          account_id?: string | null
          agent_id?: string | null
          agent_name: string
          audio_url: string
          call_topic?: string | null
          content_embedding?: string | null
          created_at?: string
          date?: string
          duration?: number
          entities?: string[] | null
          filename: string
          id?: string
          product?: string | null
          progress?: number
          reason?: string | null
          result?: string | null
          sentiment?: string | null
          speaker_analysis?: Json | null
          status?: string
          status_summary?: string | null
          summary?: string | null
          tipificacion_id?: string | null
          title: string
          topics?: string[] | null
          transcription?: string | null
          updated_at?: string
        }
        Update: {
          account_id?: string | null
          agent_id?: string | null
          agent_name?: string
          audio_url?: string
          call_topic?: string | null
          content_embedding?: string | null
          created_at?: string
          date?: string
          duration?: number
          entities?: string[] | null
          filename?: string
          id?: string
          product?: string | null
          progress?: number
          reason?: string | null
          result?: string | null
          sentiment?: string | null
          speaker_analysis?: Json | null
          status?: string
          status_summary?: string | null
          summary?: string | null
          tipificacion_id?: string | null
          title?: string
          topics?: string[] | null
          transcription?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "calls_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calls_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "limits_dashboard"
            referencedColumns: ["account_id"]
          },
          {
            foreignKeyName: "calls_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "limits_dashboard_v2"
            referencedColumns: ["account_id"]
          },
          {
            foreignKeyName: "calls_tipificacion_id_fkey"
            columns: ["tipificacion_id"]
            isOneToOne: false
            referencedRelation: "tipificaciones"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_messages: {
        Row: {
          account_id: string | null
          call_id: string | null
          content: string
          id: string
          role: string
          timestamp: string
          user_id: string | null
        }
        Insert: {
          account_id?: string | null
          call_id?: string | null
          content: string
          id?: string
          role: string
          timestamp?: string
          user_id?: string | null
        }
        Update: {
          account_id?: string | null
          call_id?: string | null
          content?: string
          id?: string
          role?: string
          timestamp?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_messages_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "limits_dashboard"
            referencedColumns: ["account_id"]
          },
          {
            foreignKeyName: "chat_messages_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "limits_dashboard_v2"
            referencedColumns: ["account_id"]
          },
          {
            foreignKeyName: "chat_messages_call_id_fkey"
            columns: ["call_id"]
            isOneToOne: false
            referencedRelation: "calls"
            referencedColumns: ["id"]
          },
        ]
      }
      custom_roles: {
        Row: {
          created_at: string | null
          created_by: string | null
          description: string | null
          display_name: string
          id: string
          name: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          display_name: string
          id?: string
          name: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          display_name?: string
          id?: string
          name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      feedback: {
        Row: {
          account_id: string | null
          behaviors_analysis: Json | null
          call_id: string
          created_at: string
          entities: string[] | null
          id: string
          negative: string[] | null
          opportunities: string[] | null
          positive: string[] | null
          score: number
          sentiment: string | null
          topics: string[] | null
          updated_at: string
        }
        Insert: {
          account_id?: string | null
          behaviors_analysis?: Json | null
          call_id: string
          created_at?: string
          entities?: string[] | null
          id?: string
          negative?: string[] | null
          opportunities?: string[] | null
          positive?: string[] | null
          score?: number
          sentiment?: string | null
          topics?: string[] | null
          updated_at?: string
        }
        Update: {
          account_id?: string | null
          behaviors_analysis?: Json | null
          call_id?: string
          created_at?: string
          entities?: string[] | null
          id?: string
          negative?: string[] | null
          opportunities?: string[] | null
          positive?: string[] | null
          score?: number
          sentiment?: string | null
          topics?: string[] | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "feedback_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feedback_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "limits_dashboard"
            referencedColumns: ["account_id"]
          },
          {
            foreignKeyName: "feedback_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "limits_dashboard_v2"
            referencedColumns: ["account_id"]
          },
          {
            foreignKeyName: "feedback_call_id_fkey"
            columns: ["call_id"]
            isOneToOne: false
            referencedRelation: "calls"
            referencedColumns: ["id"]
          },
        ]
      }
      invoice_templates: {
        Row: {
          company_info: Json
          created_at: string
          created_by: string | null
          description: string | null
          footer_fields: Json
          header_fields: Json
          id: string
          is_active: boolean
          item_fields: Json
          name: string
          styles: Json
          updated_at: string
        }
        Insert: {
          company_info?: Json
          created_at?: string
          created_by?: string | null
          description?: string | null
          footer_fields?: Json
          header_fields?: Json
          id?: string
          is_active?: boolean
          item_fields?: Json
          name: string
          styles?: Json
          updated_at?: string
        }
        Update: {
          company_info?: Json
          created_at?: string
          created_by?: string | null
          description?: string | null
          footer_fields?: Json
          header_fields?: Json
          id?: string
          is_active?: boolean
          item_fields?: Json
          name?: string
          styles?: Json
          updated_at?: string
        }
        Relationships: []
      }
      invoices: {
        Row: {
          account_id: string | null
          created_at: string
          created_by: string | null
          customer_info: Json
          due_date: string | null
          id: string
          invoice_number: string
          issue_date: string
          items: Json
          status: string
          template_id: string | null
          totals: Json
          updated_at: string
        }
        Insert: {
          account_id?: string | null
          created_at?: string
          created_by?: string | null
          customer_info?: Json
          due_date?: string | null
          id?: string
          invoice_number: string
          issue_date?: string
          items?: Json
          status?: string
          template_id?: string | null
          totals?: Json
          updated_at?: string
        }
        Update: {
          account_id?: string | null
          created_at?: string
          created_by?: string | null
          customer_info?: Json
          due_date?: string | null
          id?: string
          invoice_number?: string
          issue_date?: string
          items?: Json
          status?: string
          template_id?: string | null
          totals?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoices_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "invoice_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      knowledge_documents: {
        Row: {
          account_id: string | null
          content_summary: string | null
          description: string | null
          file_size: number
          file_url: string
          id: string
          name: string
          status: string
          type: string
          uploaded_at: string
          uploaded_by: string | null
        }
        Insert: {
          account_id?: string | null
          content_summary?: string | null
          description?: string | null
          file_size?: number
          file_url: string
          id?: string
          name: string
          status?: string
          type: string
          uploaded_at?: string
          uploaded_by?: string | null
        }
        Update: {
          account_id?: string | null
          content_summary?: string | null
          description?: string | null
          file_size?: number
          file_url?: string
          id?: string
          name?: string
          status?: string
          type?: string
          uploaded_at?: string
          uploaded_by?: string | null
        }
        Relationships: []
      }
      module_actions: {
        Row: {
          action_key: string
          created_at: string
          description: string | null
          display_name: string
          id: string
          module_id: string
          name: string
        }
        Insert: {
          action_key: string
          created_at?: string
          description?: string | null
          display_name: string
          id?: string
          module_id: string
          name: string
        }
        Update: {
          action_key?: string
          created_at?: string
          description?: string | null
          display_name?: string
          id?: string
          module_id?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "module_actions_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "system_modules"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          biography: string | null
          created_at: string
          full_name: string | null
          id: string
          language: string
          role: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          biography?: string | null
          created_at?: string
          full_name?: string | null
          id: string
          language?: string
          role?: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          biography?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          language?: string
          role?: string
          updated_at?: string
        }
        Relationships: []
      }
      prompts: {
        Row: {
          account_id: string | null
          active: boolean
          content: string
          created_at: string
          id: string
          name: string
          type: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          account_id?: string | null
          active?: boolean
          content: string
          created_at?: string
          id?: string
          name: string
          type: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          account_id?: string | null
          active?: boolean
          content?: string
          created_at?: string
          id?: string
          name?: string
          type?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "prompts_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prompts_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "limits_dashboard"
            referencedColumns: ["account_id"]
          },
          {
            foreignKeyName: "prompts_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "limits_dashboard_v2"
            referencedColumns: ["account_id"]
          },
        ]
      }
      role_permissions: {
        Row: {
          allowed_actions: string[] | null
          can_access: boolean | null
          created_at: string
          id: string
          module_id: string
          role: string
          updated_at: string
        }
        Insert: {
          allowed_actions?: string[] | null
          can_access?: boolean | null
          created_at?: string
          id?: string
          module_id: string
          role: string
          updated_at?: string
        }
        Update: {
          allowed_actions?: string[] | null
          can_access?: boolean | null
          created_at?: string
          id?: string
          module_id?: string
          role?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "role_permissions_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "system_modules"
            referencedColumns: ["id"]
          },
        ]
      }
      scenario_assignments: {
        Row: {
          account_id: string | null
          assigned_at: string
          assigned_by: string | null
          completed_at: string | null
          id: string
          scenario_id: string
          status: string
          user_id: string
        }
        Insert: {
          account_id?: string | null
          assigned_at?: string
          assigned_by?: string | null
          completed_at?: string | null
          id?: string
          scenario_id: string
          status?: string
          user_id: string
        }
        Update: {
          account_id?: string | null
          assigned_at?: string
          assigned_by?: string | null
          completed_at?: string | null
          id?: string
          scenario_id?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "scenario_assignments_scenario_id_fkey"
            columns: ["scenario_id"]
            isOneToOne: false
            referencedRelation: "training_scenarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scenario_assignments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      system_modules: {
        Row: {
          created_at: string
          description: string | null
          display_name: string
          icon: string | null
          id: string
          name: string
          order_index: number | null
          parent_module_id: string | null
          route: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          display_name: string
          icon?: string | null
          id?: string
          name: string
          order_index?: number | null
          parent_module_id?: string | null
          route?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          display_name?: string
          icon?: string | null
          id?: string
          name?: string
          order_index?: number | null
          parent_module_id?: string | null
          route?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "system_modules_parent_module_id_fkey"
            columns: ["parent_module_id"]
            isOneToOne: false
            referencedRelation: "system_modules"
            referencedColumns: ["id"]
          },
        ]
      }
      tipificaciones: {
        Row: {
          account_id: string | null
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          type: string
          updated_at: string | null
        }
        Insert: {
          account_id?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          type: string
          updated_at?: string | null
        }
        Update: {
          account_id?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tipificaciones_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tipificaciones_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "limits_dashboard"
            referencedColumns: ["account_id"]
          },
          {
            foreignKeyName: "tipificaciones_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "limits_dashboard_v2"
            referencedColumns: ["account_id"]
          },
        ]
      }
      training_messages: {
        Row: {
          audio_url: string | null
          content: string
          duration: number | null
          id: string
          role: string
          session_id: string
          timestamp: string
        }
        Insert: {
          audio_url?: string | null
          content: string
          duration?: number | null
          id?: string
          role: string
          session_id: string
          timestamp?: string
        }
        Update: {
          audio_url?: string | null
          content?: string
          duration?: number | null
          id?: string
          role?: string
          session_id?: string
          timestamp?: string
        }
        Relationships: [
          {
            foreignKeyName: "training_messages_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "training_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      training_plans: {
        Row: {
          agent_id: string
          created_at: string
          id: string
          plan_content: string
          status: string
          updated_at: string
        }
        Insert: {
          agent_id: string
          created_at?: string
          id?: string
          plan_content: string
          status?: string
          updated_at?: string
        }
        Update: {
          agent_id?: string
          created_at?: string
          id?: string
          plan_content?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      training_reports: {
        Row: {
          agent_count: number
          created_at: string
          id: string
          report_content: string
        }
        Insert: {
          agent_count?: number
          created_at?: string
          id?: string
          report_content: string
        }
        Update: {
          agent_count?: number
          created_at?: string
          id?: string
          report_content?: string
        }
        Relationships: []
      }
      training_scenarios: {
        Row: {
          account_id: string | null
          call_completion_rules: Json | null
          category: string
          client_personality: Json
          context: string | null
          created_at: string
          created_by: string | null
          custom_evaluation_instructions: string | null
          description: string | null
          difficulty: string
          duration_minutes: number
          evaluation_criteria: Json | null
          expected_outcome: string | null
          id: string
          is_active: boolean
          knowledge_base: string | null
          knowledge_documents: string[] | null
          name: string
          objectives: string[] | null
          updated_at: string
          voice_id: string | null
          voice_name: string | null
        }
        Insert: {
          account_id?: string | null
          call_completion_rules?: Json | null
          category: string
          client_personality?: Json
          context?: string | null
          created_at?: string
          created_by?: string | null
          custom_evaluation_instructions?: string | null
          description?: string | null
          difficulty: string
          duration_minutes?: number
          evaluation_criteria?: Json | null
          expected_outcome?: string | null
          id?: string
          is_active?: boolean
          knowledge_base?: string | null
          knowledge_documents?: string[] | null
          name: string
          objectives?: string[] | null
          updated_at?: string
          voice_id?: string | null
          voice_name?: string | null
        }
        Update: {
          account_id?: string | null
          call_completion_rules?: Json | null
          category?: string
          client_personality?: Json
          context?: string | null
          created_at?: string
          created_by?: string | null
          custom_evaluation_instructions?: string | null
          description?: string | null
          difficulty?: string
          duration_minutes?: number
          evaluation_criteria?: Json | null
          expected_outcome?: string | null
          id?: string
          is_active?: boolean
          knowledge_base?: string | null
          knowledge_documents?: string[] | null
          name?: string
          objectives?: string[] | null
          updated_at?: string
          voice_id?: string | null
          voice_name?: string | null
        }
        Relationships: []
      }
      training_sessions: {
        Row: {
          account_id: string | null
          ai_report: Json | null
          ai_summary: string | null
          completed_at: string | null
          conversation: Json
          duration_seconds: number | null
          id: string
          insights: string[] | null
          mensajes_generales: number | null
          mensajes_ia: number | null
          mensajes_usuario: number | null
          performance_score: number | null
          recommendations: string[] | null
          recording_url: string | null
          scenario_id: string | null
          scenario_name: string | null
          started_at: string
          status: string
          type: string
          updated_at: string | null
          user_id: string
          user_name: string | null
        }
        Insert: {
          account_id?: string | null
          ai_report?: Json | null
          ai_summary?: string | null
          completed_at?: string | null
          conversation?: Json
          duration_seconds?: number | null
          id?: string
          insights?: string[] | null
          mensajes_generales?: number | null
          mensajes_ia?: number | null
          mensajes_usuario?: number | null
          performance_score?: number | null
          recommendations?: string[] | null
          recording_url?: string | null
          scenario_id?: string | null
          scenario_name?: string | null
          started_at?: string
          status?: string
          type: string
          updated_at?: string | null
          user_id: string
          user_name?: string | null
        }
        Update: {
          account_id?: string | null
          ai_report?: Json | null
          ai_summary?: string | null
          completed_at?: string | null
          conversation?: Json
          duration_seconds?: number | null
          id?: string
          insights?: string[] | null
          mensajes_generales?: number | null
          mensajes_ia?: number | null
          mensajes_usuario?: number | null
          performance_score?: number | null
          recommendations?: string[] | null
          recording_url?: string | null
          scenario_id?: string | null
          scenario_name?: string | null
          started_at?: string
          status?: string
          type?: string
          updated_at?: string | null
          user_id?: string
          user_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "training_sessions_scenario_id_fkey"
            columns: ["scenario_id"]
            isOneToOne: false
            referencedRelation: "training_scenarios"
            referencedColumns: ["id"]
          },
        ]
      }
      usage_tracking: {
        Row: {
          account_id: string
          cantidad: number
          costo_usd: number | null
          created_at: string
          fecha: string
          id: string
          modelo_openai: string | null
          origen: string | null
          subtipo: string | null
          tipo: string
          tokens_used: number | null
        }
        Insert: {
          account_id: string
          cantidad?: number
          costo_usd?: number | null
          created_at?: string
          fecha?: string
          id?: string
          modelo_openai?: string | null
          origen?: string | null
          subtipo?: string | null
          tipo: string
          tokens_used?: number | null
        }
        Update: {
          account_id?: string
          cantidad?: number
          costo_usd?: number | null
          created_at?: string
          fecha?: string
          id?: string
          modelo_openai?: string | null
          origen?: string | null
          subtipo?: string | null
          tipo?: string
          tokens_used?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "usage_tracking_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "usage_tracking_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "limits_dashboard"
            referencedColumns: ["account_id"]
          },
          {
            foreignKeyName: "usage_tracking_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "limits_dashboard_v2"
            referencedColumns: ["account_id"]
          },
        ]
      }
      user_accounts: {
        Row: {
          account_id: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          account_id: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          account_id?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_accounts_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_accounts_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "limits_dashboard"
            referencedColumns: ["account_id"]
          },
          {
            foreignKeyName: "user_accounts_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "limits_dashboard_v2"
            referencedColumns: ["account_id"]
          },
        ]
      }
      user_permissions: {
        Row: {
          allowed_actions: string[] | null
          can_access: boolean | null
          created_at: string
          id: string
          module_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          allowed_actions?: string[] | null
          can_access?: boolean | null
          created_at?: string
          id?: string
          module_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          allowed_actions?: string[] | null
          can_access?: boolean | null
          created_at?: string
          id?: string
          module_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_permissions_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "system_modules"
            referencedColumns: ["id"]
          },
        ]
      }
      user_settings: {
        Row: {
          analysis_model: string | null
          auto_feedback: boolean | null
          created_at: string | null
          id: string
          keyword_spotting: boolean | null
          language: string | null
          min_silence_duration: number | null
          noise_filter: boolean | null
          normalize: boolean | null
          notifications: Json | null
          openai_key: string | null
          punctuation: boolean | null
          sentiment_analysis: boolean | null
          silence_detection: boolean | null
          silence_threshold: number | null
          speaker_diarization: boolean | null
          speed_detection: boolean | null
          timestamps: boolean | null
          transcription_model: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          analysis_model?: string | null
          auto_feedback?: boolean | null
          created_at?: string | null
          id?: string
          keyword_spotting?: boolean | null
          language?: string | null
          min_silence_duration?: number | null
          noise_filter?: boolean | null
          normalize?: boolean | null
          notifications?: Json | null
          openai_key?: string | null
          punctuation?: boolean | null
          sentiment_analysis?: boolean | null
          silence_detection?: boolean | null
          silence_threshold?: number | null
          speaker_diarization?: boolean | null
          speed_detection?: boolean | null
          timestamps?: boolean | null
          transcription_model?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          analysis_model?: string | null
          auto_feedback?: boolean | null
          created_at?: string | null
          id?: string
          keyword_spotting?: boolean | null
          language?: string | null
          min_silence_duration?: number | null
          noise_filter?: boolean | null
          normalize?: boolean | null
          notifications?: Json | null
          openai_key?: string | null
          punctuation?: boolean | null
          sentiment_analysis?: boolean | null
          silence_detection?: boolean | null
          silence_threshold?: number | null
          speaker_diarization?: boolean | null
          speed_detection?: boolean | null
          timestamps?: boolean | null
          transcription_model?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      limits_dashboard: {
        Row: {
          account_id: string | null
          account_name: string | null
          costo_total_mes: number | null
          limite_consultas: number | null
          limite_horas: number | null
          porcentaje_consultas: number | null
          porcentaje_transcripcion: number | null
          uso_consultas_mes: number | null
          uso_transcripcion_mes: number | null
        }
        Relationships: []
      }
      limits_dashboard_v2: {
        Row: {
          account_id: string | null
          account_name: string | null
          costo_total_mes: number | null
          horas_adicionales: number | null
          limite_consultas: number | null
          limite_horas: number | null
          porcentaje_consultas: number | null
          porcentaje_transcripcion: number | null
          tokens_totales_mes: number | null
          total_grabaciones: number | null
          uso_chat_general_mes: number | null
          uso_chat_llamada_mes: number | null
          uso_consultas_mes: number | null
          uso_transcripcion_mes: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      ampliar_horas_adicionales: {
        Args: { p_account_id: string; p_horas_adicionales: number }
        Returns: boolean
      }
      analyze_call_topics_from_content: {
        Args: never
        Returns: {
          call_ids: string[]
          call_titles: string[]
          count: number
          percentage: number
          topic: string
        }[]
      }
      can_access_training: { Args: never; Returns: boolean }
      can_chat_for_account: {
        Args: { p_account_id: string; p_subtipo?: string }
        Returns: boolean
      }
      can_manage_training: { Args: never; Returns: boolean }
      can_train_for_account: {
        Args: { p_account_id: string }
        Returns: boolean
      }
      can_transcribe_for_account: {
        Args: { p_account_id: string }
        Returns: boolean
      }
      check_account_limits: {
        Args: { p_account_id: string; p_tipo: string }
        Returns: {
          limite_alcanzado: boolean
          limite_total: number
          porcentaje_uso: number
          uso_actual: number
        }[]
      }
      check_account_limits_v2: {
        Args: { p_account_id: string; p_subtipo?: string; p_tipo: string }
        Returns: {
          horas_adicionales: number
          limite_alcanzado: boolean
          limite_total: number
          porcentaje_uso: number
          uso_actual: number
        }[]
      }
      check_chat_training_limit: {
        Args: { p_account_id: string }
        Returns: {
          limite_alcanzado: boolean
          limite_total: number
          porcentaje_uso: number
          uso_actual: number
        }[]
      }
      check_user_permission: {
        Args: {
          p_action_key?: string
          p_module_name: string
          p_user_id: string
        }
        Returns: boolean
      }
      check_voice_training_limit: {
        Args: { p_account_id: string }
        Returns: {
          limite_alcanzado: boolean
          limite_total: number
          porcentaje_uso: number
          uso_actual: number
        }[]
      }
      clean_platform: { Args: never; Returns: boolean }
      count_calls_by_account: {
        Args: { account_uuid: string }
        Returns: number
      }
      crear_comportamiento: {
        Args: {
          p_description: string
          p_is_active: boolean
          p_name: string
          p_prompt: string
        }
        Returns: string
      }
      delete_call_with_messages: {
        Args: { call_id_param: string }
        Returns: boolean
      }
      delete_multiple_calls: { Args: { call_ids: string[] }; Returns: boolean }
      ensure_account_folder: {
        Args: { account_uuid: string }
        Returns: boolean
      }
      ensure_audio_account_folder: {
        Args: { account_uuid: string }
        Returns: boolean
      }
      get_account_detailed_metrics: {
        Args: {
          p_account_id?: string
          p_date_from?: string
          p_date_to?: string
        }
        Returns: {
          account_id: string
          account_name: string
          costo_total_mes: number
          horas_adicionales: number
          limite_consultas: number
          limite_horas: number
          limite_mensajes_chat: number
          limite_minutos_entrenamiento: number
          porcentaje_consultas: number
          porcentaje_entrenamiento: number
          porcentaje_mensajes_chat: number
          porcentaje_transcripcion: number
          tokens_totales_mes: number
          total_grabaciones: number
          uso_chat_general_mes: number
          uso_chat_llamada_mes: number
          uso_consultas_mes: number
          uso_mensajes_chat_mes: number
          uso_minutos_entrenamiento_mes: number
          uso_transcripcion_mes: number
        }[]
      }
      get_call_topics_statistics: {
        Args: never
        Returns: {
          call_ids: number[]
          count: number
          percentage: number
          topic: string
        }[]
      }
      get_effective_permissions_for_user: {
        Args: { p_user_id: string }
        Returns: {
          allowed_actions: string[]
          can_access: boolean
          module_id: string
          module_name: string
        }[]
      }
      get_permissions_for_role: {
        Args: { p_role: string }
        Returns: {
          allowed_actions: string[]
          can_access: boolean
          module_id: string
          module_name: string
        }[]
      }
      get_real_time_usage: {
        Args: { p_account_id: string; p_subtipo?: string; p_tipo: string }
        Returns: number
      }
      get_scenario_stats: {
        Args: { scenario_uuid: string }
        Returns: {
          assigned_count: number
          avg_duration_minutes: number
          avg_score: number
          completed_assignments: number
          total_sessions: number
        }[]
      }
      get_user_accounts: { Args: never; Returns: string[] }
      get_users_for_account: {
        Args: { p_account_id: string }
        Returns: {
          full_name: string
          id: string
          role: string
        }[]
      }
      has_elevated_role: { Args: { _user_id?: string }; Returns: boolean }
      is_super_admin: { Args: never; Returns: boolean }
      is_super_admin_user: { Args: never; Returns: boolean }
      match_calls: {
        Args: {
          match_count?: number
          match_threshold?: number
          query_embedding: string
        }
        Returns: {
          agent_name: string
          call_date: string
          call_topic: string
          id: string
          similarity: number
          summary: string
          title: string
        }[]
      }
      register_usage: {
        Args: {
          p_account_id: string
          p_cantidad: number
          p_costo_usd?: number
          p_origen?: string
          p_tipo: string
        }
        Returns: undefined
      }
      register_usage_v2: {
        Args: {
          p_account_id: string
          p_cantidad: number
          p_costo_usd?: number
          p_modelo_openai?: string
          p_origen?: string
          p_subtipo?: string
          p_tipo: string
          p_tokens_used?: number
        }
        Returns: undefined
      }
      save_training_analysis_secure: {
        Args: {
          p_ai_report: Json
          p_ai_summary: string
          p_insights: string[]
          p_performance_score: number
          p_recommendations: string[]
          p_session_id: string
        }
        Returns: undefined
      }
      save_training_session_secure:
        | {
            Args: {
              p_account_id: string
              p_ai_summary: string
              p_completed_at: string
              p_conversation: Json
              p_duration_seconds: number
              p_id: string
              p_mensajes_generales: number
              p_mensajes_ia: number
              p_mensajes_usuario: number
              p_performance_score: number
              p_scenario_id: string
              p_started_at: string
              p_status: string
              p_type: string
              p_user_id: string
              p_user_name: string
            }
            Returns: {
              account_id: string | null
              ai_report: Json | null
              ai_summary: string | null
              completed_at: string | null
              conversation: Json
              duration_seconds: number | null
              id: string
              insights: string[] | null
              mensajes_generales: number | null
              mensajes_ia: number | null
              mensajes_usuario: number | null
              performance_score: number | null
              recommendations: string[] | null
              recording_url: string | null
              scenario_id: string | null
              scenario_name: string | null
              started_at: string
              status: string
              type: string
              updated_at: string | null
              user_id: string
              user_name: string | null
            }
            SetofOptions: {
              from: "*"
              to: "training_sessions"
              isOneToOne: true
              isSetofReturn: false
            }
          }
        | {
            Args: {
              p_account_id: string
              p_ai_summary: string
              p_client_personality?: Json
              p_completed_at: string
              p_context?: string
              p_conversation: Json
              p_duration_seconds: number
              p_id: string
              p_mensajes_generales: number
              p_mensajes_ia: number
              p_mensajes_usuario: number
              p_objectives?: string[]
              p_performance_score: number
              p_scenario_category?: string
              p_scenario_description?: string
              p_scenario_difficulty?: string
              p_scenario_id: string
              p_scenario_name?: string
              p_started_at: string
              p_status: string
              p_type: string
              p_user_id: string
              p_user_name: string
            }
            Returns: {
              account_id: string | null
              ai_report: Json | null
              ai_summary: string | null
              completed_at: string | null
              conversation: Json
              duration_seconds: number | null
              id: string
              insights: string[] | null
              mensajes_generales: number | null
              mensajes_ia: number | null
              mensajes_usuario: number | null
              performance_score: number | null
              recommendations: string[] | null
              recording_url: string | null
              scenario_id: string | null
              scenario_name: string | null
              started_at: string
              status: string
              type: string
              updated_at: string | null
              user_id: string
              user_name: string | null
            }
            SetofOptions: {
              from: "*"
              to: "training_sessions"
              isOneToOne: true
              isSetofReturn: false
            }
          }
      sync_role_permissions_for_role: {
        Args: { p_role: string }
        Returns: undefined
      }
      update_training_session_recording: {
        Args: { p_recording_url: string; p_session_id: string }
        Returns: undefined
      }
      user_has_module_permission: {
        Args: { p_module_name: string; p_user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
