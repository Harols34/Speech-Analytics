
import { Hono } from "hono";
import { cors } from "hono/cors";

// Define environment interface
interface Env {
  // Define your environment variables here if needed
}

// Implementar caché para respuestas frecuentes con mayor tiempo de caché
const cache = new Map<string, { data: any, timestamp: number }>();
const CACHE_TTL = 900000; // 15 minutos en milisegundos (aumentado de 5 a 15 minutos)

// Función para verificar la caché
function getCachedResponse(key: string) {
  const now = Date.now();
  const cachedData = cache.get(key);
  
  if (cachedData && now - cachedData.timestamp < CACHE_TTL) {
    return cachedData.data;
  }
  
  return null;
}

// Función para guardar respuesta en caché
function setCachedResponse(key: string, data: any) {
  cache.set(key, { data, timestamp: Date.now() });
}

// Create Hono app
const app = new Hono<{ Bindings: Env }>();

// Add CORS middleware to allow cross-origin requests
app.use("*", cors({
  origin: "*",
  allowHeaders: ["Content-Type", "Authorization"],
  allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  exposeHeaders: ["Content-Length"],
  maxAge: 600,
}));

// Define basic routes with caching
app.get("/api/", (c) => {
  const cacheKey = "api_root";
  const cached = getCachedResponse(cacheKey);
  
  if (cached) {
    return c.json(cached);
  }
  
  const response = { name: "Speech Analytics API", status: "OK" };
  setCachedResponse(cacheKey, response);
  return c.json(response);
});

// Health check route - no cachear ya que necesitamos timestamp actualizado
app.get("/api/health", (c) => c.json({ 
  status: "healthy", 
  timestamp: new Date().toISOString(),
  version: "1.0.0"
}));

// Analytics API status with caching
app.get("/api/status/transcription", async (c) => {
  const cacheKey = "transcription_status";
  const cached = getCachedResponse(cacheKey);
  
  if (cached) {
    return c.json(cached);
  }
  
  const response = {
    service: "transcription",
    status: "operational",
    provider: "OpenAI Whisper",
    features: [
      "Alta precisión en reconocimiento automático de voz",
      "Diarización basada en características acústicas",
      "Detección de silencios optimizada",
      "Identificación mejorada de hablantes",
      "Transcripción adaptada a español latinoamericano"
    ],
    timestamp: new Date().toISOString()
  };
  
  setCachedResponse(cacheKey, response);
  return c.json(response);
});

// Nueva ruta para configuración de transcripción avanzada con caching
app.get("/api/config/transcription", async (c) => {
  const cacheKey = "transcription_config";
  const cached = getCachedResponse(cacheKey);
  
  if (cached) {
    return c.json(cached);
  }
  
  const response = {
    model: "whisper-1",
    language: "es",
    temperature: 0,
    response_format: "verbose_json",
    timestamp_granularities: ["segment", "word"],
    diarization: {
      enabled: true,
      speakers: ["Asesor", "Cliente"],
      method: "acoustic"
    }
  };
  
  setCachedResponse(cacheKey, response);
  return c.json(response);
});

// Nueva ruta para obtener la lista de usuarios (para admins)
app.get("/api/users", async (c) => {
  const cacheKey = "users_list";
  const cached = getCachedResponse(cacheKey);
  
  if (cached) {
    return c.json(cached);
  }
  
  // Simulamos obtener la lista de usuarios
  // En producción, aquí se conectaría a la base de datos
  const response = {
    users: [
      { id: "1", name: "Admin Usuario", role: "admin" },
      { id: "2", name: "Agente Ejemplo", role: "agent" },
      { id: "3", name: "Supervisor Demo", role: "supervisor" }
    ],
    timestamp: new Date().toISOString()
  };
  
  setCachedResponse(cacheKey, response);
  return c.json(response);
});

// Export the app
export default app;
