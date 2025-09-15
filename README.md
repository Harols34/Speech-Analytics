# Speech Analytics – Plataforma Corporativa de Análisis de Voz con IA

## Descripción General

**Speech Analytics** es una solución avanzada para el análisis de conversaciones y llamadas, diseñada para empresas que buscan extraer valor estratégico de sus interacciones de voz. Utiliza inteligencia artificial para transcribir, analizar emociones, detectar patrones y generar métricas conversacionales, todo en una plataforma segura, escalable y fácil de integrar.

- Transcripción automática multilenguaje
- Análisis de emociones y sentimientos
- Detección de patrones de habla y comportamientos
- Métricas conversacionales y reportes personalizables
- Integración con sistemas empresariales y CRMs

Repositorio oficial: [https://github.com/convertia-it/speechanalytics](https://github.com/convertia-it/speechanalytics)

---

## Tabla de Contenidos

- [Características Principales](#características-principales)
- [Arquitectura y Tecnologías](#arquitectura-y-tecnologías)
- [Estructura del Proyecto](#estructura-del-proyecto)
- [Instalación y Puesta en Marcha](#instalación-y-puesta-en-marcha)
- [Despliegue y Entornos](#despliegue-y-entornos)
- [Seguridad y Buenas Prácticas](#seguridad-y-buenas-prácticas)
- [Contribución y Soporte](#contribución-y-soporte)

---

## Características Principales

| Módulo         | Funcionalidades                                                                 |
| -------------- | ------------------------------------------------------------------------------- |
| Transcripción  | Voz a texto en tiempo real, multi-idioma, puntuación automática                 |
| Análisis       | Detección de emociones, sentimientos, palabras clave, temas y entidades         |
| Métricas       | Velocidad, pausas, tono, fluidez, duración, participación                      |
| Integraciones  | Zapier, Slack, Google Meet, Zoom, CRMs empresariales                            |
| Seguridad      | Autenticación robusta, RLS en base de datos, cifrado de datos                   |
| UI Corporativa | Dashboard, analíticas, gestión de usuarios, cuentas y permisos                  |
| IA Conversacional | Chat asistido por IA con contexto de llamadas y cuentas                      |

---

## Arquitectura y Tecnologías

- **Frontend:**  
  - React + TypeScript  
  - Vite (entorno de desarrollo ultrarrápido)  
  - shadcn-ui y Tailwind CSS (UI moderna, accesible y responsive)  
  - React Router DOM (navegación SPA)
- **Backend & Serverless:**  
  - Supabase (PostgreSQL, autenticación, almacenamiento, funciones edge)  
  - Funciones serverless para IA, procesamiento y análisis de llamadas  
  - Modelos NLP y procesamiento de audio
- **Integraciones:**  
  - API RESTful y Webhooks  
  - Conectores para plataformas externas (Slack, Zoom, CRMs)
- **DevOps:**  
  - Soporte para despliegue en Vercel, Netlify, AWS Amplify  
  - Configuración CI/CD recomendada

---

## Estructura del Proyecto

```
Speech Analitycs/
│
├── public/                  # Archivos estáticos y recursos públicos
├── src/
│   ├── components/          # Componentes UI organizados por dominio (ai, calls, analytics, etc.)
│   ├── context/             # Contextos globales (autenticación, cuentas, etc.)
│   ├── hooks/               # Custom hooks reutilizables
│   ├── integrations/
│   │   └── supabase/        # Cliente y tipos de Supabase
│   ├── lib/                 # Lógica de negocio y utilidades
│   ├── pages/               # Páginas principales de la aplicación (Dashboard, Analytics, Calls, etc.)
│   ├── utils/               # Utilidades generales
│   └── worker/              # Workers para procesamiento en background
│
├── supabase/
│   ├── functions/           # Funciones Edge (serverless) para IA, usuarios, procesamiento de llamadas
│   ├── migrations/          # Migraciones de base de datos
│   └── user_settings.sql    # Configuración avanzada de usuarios
│
├── package.json             # Dependencias y scripts de proyecto
├── tailwind.config.ts       # Configuración de Tailwind CSS
├── vite.config.ts           # Configuración de Vite
└── README.md                # Documentación principal
```

---

## Instalación y Puesta en Marcha

### Requisitos Previos

- Node.js (v16+ recomendado)
- npm (v8+)
- Git

### Pasos de Instalación

```sh
# 1. Clonar el repositorio
git clone https://github.com/convertia-it/speechanalytics.git

# 2. Navegar al directorio del proyecto
cd "Speech Analitycs"

# 3. Instalar dependencias
npm install

# 4. Configurar variables de entorno (si aplica)
# Copia .env.example a .env y completa los valores necesarios

# 5. Iniciar servidor de desarrollo
npm run dev
```

Accede a la aplicación en [http://localhost:8080](http://localhost:8080)

---

## Despliegue y Entornos

- **Despliegue simple:**  
  Compatible con Vercel, Netlify, AWS Amplify y cualquier plataforma que soporte Node.js y Vite.
- **Variables de entorno:**  
  Configura las claves de Supabase y otros secretos en archivos `.env` (no los subas al repositorio).
- **Migraciones:**  
  Usa las migraciones de la carpeta `supabase/migrations` para mantener la base de datos sincronizada.

---

## Seguridad y Buenas Prácticas

- **Autenticación y autorización:**  
  Implementada con Supabase Auth y políticas RLS en PostgreSQL.
- **Validación de datos:**  
  Uso de Zod y validaciones en frontend y backend.
- **Gestión de secretos:**  
  Nunca subas claves privadas al repositorio. Usa variables de entorno.
- **Accesibilidad y UX:**  
  UI accesible, responsive y con soporte para teclado y lectores de pantalla.
- **Testing:**  
  Estructura preparada para pruebas unitarias con Jest y mocks para Supabase.

---

> © 2025 Speech Analytics. Todos los derechos reservados.
