import {
  PipeTransform,
  Injectable,
  ArgumentMetadata,
} from '@nestjs/common';
import { Transform } from 'class-transformer';

export interface SanitizeXssPipeOptions {
  /**
   * 'strip' (por defecto): remueve las etiquetas <script> y vectores ejecutables dejando el contenido de texto inocuo
   * Ejemplo: "Falla <script>alert(1)</script>" -> "Falla alert(1)"
   * 'escape': escapa caracteres HTML a sus entidades seguras (&lt;, &gt;, &quot;, &#x27;, &amp;).
   */
  mode?: 'strip' | 'escape';

  /**
   * Lista de nombres de campos a sanitizar en objetos/DTOs.
   * Por defecto: ['descripcion', 'titulo', 'diagnostico_tecnico'].
   * Si se especifica '*' o arreglo vacío [], sanitiza todos los campos de tipo string.
   */
  fields?: string[];

  /**
   * Si es true, recorre recursivamente objetos y arreglos anidados.
   * Por defecto: true.
   */
  deep?: boolean;

  /**
   * Si es true, escapa los caracteres residuales peligrosos (&, <, >) después de limpiar las etiquetas.
   * Por defecto: false.
   */
  escapeResiduals?: boolean;
}

/**
 * Escapa caracteres especiales HTML a sus entidades seguras.
 */
export function escapeHtml(value: string): string {
  if (typeof value !== 'string') return value;
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

/**
 * Sanitiza un string para mitigar ataques de inyección XSS (Cross-Site Scripting).
 * Criterio TAL-140: Convierte "Falla <script>alert(1)</script>" en el texto inocuo "Falla alert(1)".
 */
export function sanitizeStringXss(
  value: string,
  options: SanitizeXssPipeOptions = {},
): string {
  if (typeof value !== 'string') return value;

  const mode = options.mode ?? 'strip';
  if (mode === 'escape') {
    return escapeHtml(value);
  }

  let sanitized = value;
  let previous = '';
  let iterations = 0;
  const MAX_ITERATIONS = 5;

  // Bucle de estabilización para prevenir bypasses por anidamiento múltiple (ej: <scr<script>ipt>)
  while (previous !== sanitized && iterations < MAX_ITERATIONS) {
    previous = sanitized;
    iterations++;

    // 1. Eliminar etiquetas <script...> y </script...> conservando el texto interior inocuo
    sanitized = sanitized.replace(/<\/?script\b[^>]*>/gi, '');

    // 2. Eliminar bloques peligrosos completos sin aporte de contenido textual útil
    sanitized = sanitized.replace(
      /<(iframe|object|embed|style|applet|meta|link|base|svg|math|form|body|html|head|frameset|frame)\b[^>]*>[\s\S]*?<\/\1>/gi,
      '',
    );
    sanitized = sanitized.replace(
      /<(iframe|object|embed|style|applet|meta|link|base|svg|math|form|body|html|head|frameset|frame)\b[^>]*\/?>/gi,
      '',
    );

    // 3. Eliminar atributos de eventos inline (onerror, onload, onclick, onmouseover, onfocus, etc.)
    sanitized = sanitized.replace(
      /\bon[a-z]+\s*=\s*(?:'[^']*'|"[^"]*"|[^\s>]+)/gi,
      '',
    );

    // 4. Eliminar pseudoprotocolos ejecutables (javascript:, vbscript:, data:text/html)
    sanitized = sanitized.replace(
      /(?:javascript|vbscript|data\s*:\s*text\/html)\s*:[^\s'">]*/gi,
      '',
    );

    // 5. Eliminar etiquetas HTML residuales comunes
    sanitized = sanitized.replace(
      /<\/?(a|img|button|input|textarea|select|p|div|span|h[1-6]|b|i|u|em|strong)\b[^>]*>/gi,
      '',
    );
  }

  // Normalizar espacios dobles o múltiples introducidos por la eliminación de tags
  sanitized = sanitized.replace(/[ \t]{2,}/g, ' ');

  if (options.escapeResiduals) {
    sanitized = escapeHtml(sanitized);
  }

  return sanitized;
}

/**
 * Decorador para class-transformer que permite sanitizar automáticamente propiedades de DTOs.
 */
export function SanitizeXss(options: SanitizeXssPipeOptions = {}): PropertyDecorator {
  return Transform(({ value }) => {
    if (typeof value === 'string') {
      return sanitizeStringXss(value, options);
    }
    return value;
  });
}

/**
 * Pipe de transformación de NestJS para sanitizar entradas de usuario y prevenir ataques XSS.
 * Puede ser utilizado a nivel global, de controlador, de ruta o de parámetro @Body().
 */
@Injectable()
export class SanitizeXssPipe implements PipeTransform<any, any> {
  private readonly mode: 'strip' | 'escape';
  private readonly fields: string[];
  private readonly deep: boolean;
  private readonly escapeResiduals: boolean;

  constructor(options: SanitizeXssPipeOptions = {}) {
    this.mode = options.mode ?? 'strip';
    this.fields = (
      options.fields ?? ['descripcion', 'titulo', 'diagnostico_tecnico']
    ).map((f) => f.toLowerCase());
    this.deep = options.deep ?? true;
    this.escapeResiduals = options.escapeResiduals ?? false;
  }

  transform(value: any, metadata?: ArgumentMetadata): any {
    if (value === null || value === undefined) {
      return value;
    }

    if (typeof value === 'string') {
      return sanitizeStringXss(value, {
        mode: this.mode,
        escapeResiduals: this.escapeResiduals,
      });
    }

    if (typeof value === 'object') {
      return this.sanitizeObject(value);
    }

    return value;
  }

  private sanitizeObject(obj: any): any {
    if (Array.isArray(obj)) {
      return obj.map((item) =>
        typeof item === 'object' && item !== null
          ? this.sanitizeObject(item)
          : typeof item === 'string'
          ? sanitizeStringXss(item, {
              mode: this.mode,
              escapeResiduals: this.escapeResiduals,
            })
          : item,
      );
    }

    const result: Record<string, any> = { ...obj };
    for (const key of Object.keys(result)) {
      const val = result[key];
      const shouldSanitize =
        this.fields.length === 0 ||
        this.fields.includes('*') ||
        this.fields.includes(key.toLowerCase());

      if (typeof val === 'string' && shouldSanitize) {
        result[key] = sanitizeStringXss(val, {
          mode: this.mode,
          escapeResiduals: this.escapeResiduals,
        });
      } else if (this.deep && typeof val === 'object' && val !== null) {
        result[key] = this.sanitizeObject(val);
      }
    }

    return result;
  }
}

