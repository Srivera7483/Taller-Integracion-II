/**
  ============================================================================
  POLÍTICA DE SEGURIDAD CORS (Cross-Origin Resource Sharing)
  ============================================================================
  Para la integración con el miembro encargado de la API Gateway:
  En tu archivo principal (ej. main.ts), simplemente debes hacer:
    import { corsConfig } from './config/cors.config';
    app.enableCors(corsConfig);
  ============================================================================
 */

// Declaración ambiental para compatibilidad con Node.js sin requerir dependencias externas
declare const process: {
  env: Record<string, string | undefined>;
};

// Tipo de configuración compatible con NestJS y Express
export interface CorsConfigOptions {
  origin: (
    origin: string | undefined,
    callback: (err: Error | null, allow?: boolean) => void,
  ) => void;
  methods: string[];
  allowedHeaders: string[];
  exposedHeaders: string[];
  credentials: boolean;
  maxAge: number;
}

/**
  Lista blanca de orígenes permitidos por defecto para entornos de desarrollo.
  En producción se sobreescribe con la variable de entorno CORS_ORIGINS.
 */
const DEFAULT_ALLOWED_ORIGINS = [
  'http://localhost:5173', // Frontend Web (Vite / React)
  'http://localhost:3000', // API Gateway / Swagger
  'http://127.0.0.1:5173',
  'http://localhost:8081', // React Native / Metro Bundler (Móvil)
  'http://localhost:19006', // Expo Web (Móvil)
];

/**
  Obtiene la lista blanca de orígenes procesando las variables de entorno.
 */
const getAllowedOrigins = (): string[] => {
  const envOrigins = process.env.CORS_ORIGINS;
  if (!envOrigins) {
    return DEFAULT_ALLOWED_ORIGINS;
  }
  return envOrigins
    .split(',')
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0);
};

/**
  Configuración centralizada de CORS para el API Gateway.
 */
export const corsConfig: CorsConfigOptions = {
  /**
    Función validadora de origen:
    - Permite peticiones sin cabecera 'Origin' (como Postman, apps móviles nativas, cURL o Swagger).
    - Verifica que el origen del navegador pertenezca a la lista blanca.
   */
  origin: (
    origin: string | undefined,
    callback: (err: Error | null, allow?: boolean) => void,
  ) => {
    // 1. Peticiones directas o internas sin header Origin
    if (!origin) {
      return callback(null, true);
    }

    const allowedOrigins = getAllowedOrigins();

    // 2. Origen autorizado en la lista blanca
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    // 3. Bloqueo para orígenes desconocidos o no autorizados
    return callback(
      new Error(
        `[Ciberseguridad - CORS]: Acceso denegado. El origen '${origin}' no tiene permisos para consultar este servicio.`,
      ),
      false,
    );
  },

  // Verbos HTTP permitidos para operaciones REST
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD'],

  // Cabeceras HTTP autorizadas en las solicitudes
  allowedHeaders: [
    'Origin',
    'X-Requested-With',
    'Content-Type',
    'Accept',
    'Authorization', // Para tokens JWT
    'x-request-id',  // Para trazabilidad / Correlation ID inter-servicios
  ],

  // Cabeceras de respuesta que el cliente puede leer
  exposedHeaders: ['x-request-id', 'Authorization'],

  // Permite el intercambio seguro de cookies, cabeceras de autorización y credenciales
  credentials: true,

  // Caché de preflight (OPTIONS) por 24 horas (86400 segundos) para optimizar latencia de red
  maxAge: 86400,
};
