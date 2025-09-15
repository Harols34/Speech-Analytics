import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";

interface UserSettings {
  speaker_diarization?: boolean;
  sentiment_analysis?: boolean;
  auto_feedback?: boolean;
  keyword_spotting?: boolean;
  notifications?: any;
  silence_detection?: boolean;
  silence_threshold?: number;
  min_silence_duration?: number;
  normalize?: boolean;
  noise_filter?: boolean;
  speed_detection?: boolean;
  punctuation?: boolean;
  timestamps?: boolean;
  analysis_model?: string;
  language?: string;
  transcription_model?: string;
  openai_api_key?: string;
}

export function useUserSettings() {
  const [settings, setSettings] = useState<UserSettings>({});
  const [loading, setLoading] = useState(false);
  const { user, session } = useAuth();

  const loadSettings = async () => {
    if (!user || !session) return;

    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('user_settings')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.error("Error loading user settings:", error);
        return;
      }

      if (data) {
        setSettings(data);
      }
    } catch (error) {
      console.error("Error loading user settings:", error);
    } finally {
      setLoading(false);
    }
  };

  const updateSettings = async (newSettings: Partial<UserSettings>) => {
    if (!user || !session) return;

    try {
      const { error } = await supabase
        .from('user_settings')
        .upsert({
          user_id: user.id,
          ...newSettings,
          updated_at: new Date().toISOString(),
        });

      if (error) throw error;

      setSettings(prev => ({ ...prev, ...newSettings }));
    } catch (error) {
      console.error("Error updating user settings:", error);
      throw error;
    }
  };

  useEffect(() => {
    if (user && session) {
      loadSettings();
    }
  }, [user, session]);

  return {
    settings,
    loading,
    updateSettings,
    refreshSettings: loadSettings,
  };
}
