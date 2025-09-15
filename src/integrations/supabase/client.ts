import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const SUPABASE_URL = "https://ejzidvltowbhccxukllc.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVqemlkdmx0b3diaGNjeHVrbGxjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDMwODYzOTAsImV4cCI6MjA1ODY2MjM5MH0.othvayzyELFruqXpK2O-nbOJECSz1m4kgLqfUX1pWq4";

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);