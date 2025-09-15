
import { useState, useCallback, useEffect } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";

export type AudioSettings = {
  model: string;
  language: string;
  timestamps: boolean;
  punctuation: boolean;
  speakerDiarization: boolean;
  noiseFilter: boolean;
  normalizeAudio: boolean;
  silenceThreshold: number;
  minSilenceDuration: number;
  speechRateDetection: boolean;
  analysis_model: string;
  sentiment_analysis: boolean;
  keyword_spotting: boolean;
  auto_feedback: boolean;
};

const defaultSettings: AudioSettings = {
  model: "whisper-1",
  language: "es-ES",
  timestamps: true,
  punctuation: true,
  speakerDiarization: true,
  noiseFilter: true,
  normalizeAudio: true,
  silenceThreshold: -40,
  minSilenceDuration: 500,
  speechRateDetection: false,
  analysis_model: "gpt-4o",
  sentiment_analysis: true,
  keyword_spotting: true,
  auto_feedback: true,
};

export function useAudioSettings() {
  const [settings, setSettings] = useState<AudioSettings>(defaultSettings);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const { session } = useAuth();
  
  // Load settings from database
  const loadSettings = useCallback(async () => {
    if (!session?.user?.id) return;
    
    try {
      console.log("Loading audio settings for user:", session.user.id);
      const { data, error } = await supabase
        .from('user_settings')
        .select('*')
        .eq('user_id', session.user.id)
        .maybeSingle();
        
      if (error && error.code !== 'PGRST116') {
        throw error;
      }
      
      if (data) {
        console.log("Loaded user settings:", data);
        setSettings({
          model: data.transcription_model || defaultSettings.model,
          language: data.language || defaultSettings.language,
          timestamps: data.timestamps !== null ? data.timestamps : defaultSettings.timestamps,
          punctuation: data.punctuation !== null ? data.punctuation : defaultSettings.punctuation,
          speakerDiarization: data.speaker_diarization !== null ? data.speaker_diarization : defaultSettings.speakerDiarization,
          noiseFilter: data.noise_filter !== null ? data.noise_filter : defaultSettings.noiseFilter,
          normalizeAudio: data.normalize !== null ? data.normalize : defaultSettings.normalizeAudio,
          silenceThreshold: data.silence_threshold || defaultSettings.silenceThreshold,
          minSilenceDuration: data.min_silence_duration || defaultSettings.minSilenceDuration,
          speechRateDetection: data.speed_detection !== null ? data.speed_detection : defaultSettings.speechRateDetection,
          analysis_model: data.analysis_model || defaultSettings.analysis_model,
          sentiment_analysis: data.sentiment_analysis !== null ? data.sentiment_analysis : defaultSettings.sentiment_analysis,
          keyword_spotting: data.keyword_spotting !== null ? data.keyword_spotting : defaultSettings.keyword_spotting,
          auto_feedback: data.auto_feedback !== null ? data.auto_feedback : defaultSettings.auto_feedback,
        });
      } else {
        // If no settings found, create default settings
        await createDefaultSettings();
      }
    } catch (error) {
      console.error("Error loading audio settings:", error);
    } finally {
      setIsLoading(false);
    }
  }, [session?.user?.id]);

  // Create default settings if none exist
  const createDefaultSettings = async () => {
    if (!session?.user?.id) return;
    
    try {
      const { error } = await supabase
        .from('user_settings')
        .insert({
          user_id: session.user.id,
          transcription_model: defaultSettings.model,
          language: defaultSettings.language,
          timestamps: defaultSettings.timestamps,
          punctuation: defaultSettings.punctuation,
          speaker_diarization: defaultSettings.speakerDiarization,
          noise_filter: defaultSettings.noiseFilter,
          normalize: defaultSettings.normalizeAudio,
          silence_threshold: defaultSettings.silenceThreshold,
          min_silence_duration: defaultSettings.minSilenceDuration,
          speed_detection: defaultSettings.speechRateDetection,
          analysis_model: defaultSettings.analysis_model,
          sentiment_analysis: defaultSettings.sentiment_analysis,
          keyword_spotting: defaultSettings.keyword_spotting,
          auto_feedback: defaultSettings.auto_feedback,
        });
        
      if (error) {
        throw error;
      }
      
      console.log("Created default settings");
    } catch (error) {
      console.error("Error creating default settings:", error);
    }
  };

  // Load settings when component mounts
  useEffect(() => {
    if (session?.user?.id) {
      loadSettings();
    } else {
      setIsLoading(false);
    }
  }, [loadSettings, session?.user?.id]);

  // Update a single setting
  const updateSetting = useCallback((key: keyof AudioSettings, value: any) => {
    setSettings(prev => ({
      ...prev,
      [key]: value
    }));
    
    // Save the setting to the database immediately
    if (session?.user?.id) {
      const mappedKey = mapSettingKeyToDbColumn(key);
      
      supabase
        .from('user_settings')
        .update({ [mappedKey]: value })
        .eq('user_id', session.user.id)
        .then(({ error }) => {
          if (error) {
            console.error(`Error updating setting ${key}:`, error);
          } else {
            console.log(`Setting ${key} updated to ${value}`);
          }
        });
    }
  }, [session?.user?.id]);

  // Map setting key to database column
  const mapSettingKeyToDbColumn = (key: keyof AudioSettings): string => {
    const mapping: Record<keyof AudioSettings, string> = {
      model: 'transcription_model',
      language: 'language',
      timestamps: 'timestamps',
      punctuation: 'punctuation',
      speakerDiarization: 'speaker_diarization',
      noiseFilter: 'noise_filter',
      normalizeAudio: 'normalize',
      silenceThreshold: 'silence_threshold',
      minSilenceDuration: 'min_silence_duration',
      speechRateDetection: 'speed_detection',
      analysis_model: 'analysis_model',
      sentiment_analysis: 'sentiment_analysis',
      keyword_spotting: 'keyword_spotting',
      auto_feedback: 'auto_feedback',
    };
    
    return mapping[key] || key.toString();
  };

  // Save all settings at once
  const saveSettings = useCallback(async (settingsToSave: AudioSettings | null = null) => {
    if (!session?.user?.id) {
      toast.error("No hay sesión de usuario");
      return;
    }
    
    setIsSaving(true);
    const settingsToUpdate = settingsToSave || settings;
    
    try {
      const { error } = await supabase
        .from('user_settings')
        .update({
          transcription_model: settingsToUpdate.model,
          language: settingsToUpdate.language,
          timestamps: settingsToUpdate.timestamps,
          punctuation: settingsToUpdate.punctuation,
          speaker_diarization: settingsToUpdate.speakerDiarization,
          noise_filter: settingsToUpdate.noiseFilter,
          normalize: settingsToUpdate.normalizeAudio,
          silence_threshold: settingsToUpdate.silenceThreshold,
          min_silence_duration: settingsToUpdate.minSilenceDuration,
          speed_detection: settingsToUpdate.speechRateDetection,
          analysis_model: settingsToUpdate.analysis_model,
          sentiment_analysis: settingsToUpdate.sentiment_analysis,
          keyword_spotting: settingsToUpdate.keyword_spotting,
          auto_feedback: settingsToUpdate.auto_feedback,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', session.user.id);
        
      if (error) throw error;
      
      console.log("Settings saved successfully");
      return true;
    } catch (error) {
      console.error("Error saving settings:", error);
      throw error;
    } finally {
      setIsSaving(false);
    }
  }, [settings, session?.user?.id]);

  // Reset settings to default
  const resetSettings = useCallback(async () => {
    if (!session?.user?.id) return;
    
    setSettings(defaultSettings);
    
    try {
      await saveSettings(defaultSettings);
      toast.success("Configuración restablecida");
    } catch (error) {
      toast.error("Error al restablecer la configuración");
    }
  }, [saveSettings, session?.user?.id]);

  return {
    settings,
    isLoading,
    isSaving,
    updateSetting,
    saveSettings,
    resetSettings
  };
}
