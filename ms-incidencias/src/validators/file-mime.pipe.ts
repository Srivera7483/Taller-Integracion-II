import {
  PipeTransform,
  Injectable,
  ArgumentMetadata,
  HttpStatus,
  HttpException,
  UnsupportedMediaTypeException,
  BadRequestException,
} from '@nestjs/common';

/**
 * Tipos MIME e extensiones permitidas según requerimiento TAL-127
 */
export const MIMES_IMAGEN_PERMITIDOS: readonly string[] = [
  'image/jpeg',
  'image/png',
  'image/webp',
];

export const EXTENSIONES_IMAGEN_PERMITIDAS: readonly string[] = [
  'jpg',
  'jpeg',
  'png',
  'webp',
];

export interface FileMimeValidationOptions {
  allowedMimes?: string[];
  allowedExtensions?: string[];
  errorStatusCode?: HttpStatus.UNSUPPORTED_MEDIA_TYPE | HttpStatus.BAD_REQUEST;
  required?: boolean;
}

/**
 * Extrae la extensión en minúsculas de un nombre de archivo o URL.
 */
export function extraerExtension(nombreArchivo?: string): string {
  if (!nombreArchivo || typeof nombreArchivo !== 'string') return '';
  // Limpiar parámetros de consulta en caso de que sea una URL (ej: foto.jpg?v=2)
  const limpio = nombreArchivo.split('?')[0].split('#')[0].trim();
  const ultimaPosicion = limpio.lastIndexOf('.');
  if (ultimaPosicion === -1 || ultimaPosicion === limpio.length - 1) {
    return '';
  }
  return limpio.substring(ultimaPosicion + 1).toLowerCase();
}

/**
 * Detecta el tipo MIME real inspeccionando los Magic Numbers (encabezados binarios) del archivo.
 * Previene la falsificación de extensiones (ej: ejecutables o PDFs renombrados a .jpg).
 */
export function detectarMimePorMagicNumbers(buffer?: Buffer | Uint8Array | null): string | null {
  if (!buffer || buffer.length < 2) {
    return null;
  }

  // 1. JPEG / JPG: FF D8 FF
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return 'image/jpeg';
  }

  // 2. PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buffer.length >= 8 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return 'image/png';
  }

  // 3. WebP: RIFF (bytes 0-3) + WEBP (bytes 8-11)
  if (
    buffer.length >= 12 &&
    buffer[0] === 0x52 && // 'R'
    buffer[1] === 0x49 && // 'I'
    buffer[2] === 0x46 && // 'F'
    buffer[3] === 0x46 && // 'F'
    buffer[8] === 0x57 && // 'W'
    buffer[9] === 0x45 && // 'E'
    buffer[10] === 0x42 && // 'B'
    buffer[11] === 0x50 // 'P'
  ) {
    return 'image/webp';
  }

  // 4. PDF: %PDF (25 50 44 46)
  if (
    buffer.length >= 4 &&
    buffer[0] === 0x25 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x44 &&
    buffer[3] === 0x46
  ) {
    return 'application/pdf';
  }

  // 5. EXE (Windows PE / DOS executable): 4D 5A ('MZ')
  if (buffer[0] === 0x4d && buffer[1] === 0x5a) {
    return 'application/x-msdownload';
  }

  // 6. SVG: Texto XML o etiqueta <svg
  if (buffer.length >= 4) {
    const encabezadoTexto = buffer.subarray(0, Math.min(buffer.length, 256)).toString('utf-8').trim().toLowerCase();
    if (encabezadoTexto.startsWith('<?xml') || encabezadoTexto.includes('<svg')) {
      return 'image/svg+xml';
    }
  }

  // 7. ZIP / JAR / APK: PK.. (50 4B 03 04)
  if (
    buffer.length >= 4 &&
    buffer[0] === 0x50 &&
    buffer[1] === 0x4b &&
    (buffer[2] === 0x03 || buffer[2] === 0x05 || buffer[2] === 0x07) &&
    (buffer[3] === 0x04 || buffer[3] === 0x06 || buffer[3] === 0x08)
  ) {
    return 'application/zip';
  }

  return null;
}

/**
 * Valida la extensión de una URL o nombre de evidencia.
 * Rechaza extensiones no permitidas (.exe, .pdf, .svg, etc.).
 */
export function validarExtensionEvidencia(urlONombre: string): boolean {
  const ext = extraerExtension(urlONombre);
  if (!ext || !EXTENSIONES_IMAGEN_PERMITIDAS.includes(ext)) {
    throw new UnsupportedMediaTypeException(
      `Extensión de archivo '.${ext || 'desconocida'}' no permitida. Solo se aceptan extensiones de imagen: .jpg, .jpeg, .png, .webp`,
    );
  }
  return true;
}

/**
 * Pipe de validación estricta de archivos de evidencia para NestJS (TAL-127).
 * Valida de forma triple:
 * 1. Extensión del archivo (.jpg, .jpeg, .png, .webp).
 * 2. Cabecera Content-Type / MIME declarada por el cliente.
 * 3. Magic Numbers (encabezado binario real en Buffer) para evitar ejecutables o PDFs camuflados.
 */
@Injectable()
export class FileMimeValidationPipe implements PipeTransform<any, any> {
  private readonly allowedMimes: string[];
  private readonly allowedExtensions: string[];
  private readonly errorStatusCode: HttpStatus;
  private readonly required: boolean;

  constructor(options: FileMimeValidationOptions = {}) {
    this.allowedMimes = (options.allowedMimes ?? MIMES_IMAGEN_PERMITIDOS).map((m) =>
      m.toLowerCase(),
    );
    this.allowedExtensions = (options.allowedExtensions ?? EXTENSIONES_IMAGEN_PERMITIDAS).map((e) =>
      e.toLowerCase(),
    );
    this.errorStatusCode =
      options.errorStatusCode ?? HttpStatus.UNSUPPORTED_MEDIA_TYPE;
    this.required = options.required ?? true;
  }

  transform(file: any, metadata?: ArgumentMetadata): any {
    // 1. Verificación de presencia del archivo
    if (!file) {
      if (this.required) {
        throw new BadRequestException('El archivo de evidencia es requerido');
      }
      return file;
    }

    const originalname = file.originalname || file.name || '';
    const mimetype = (file.mimetype || file.type || '').toLowerCase().trim();
    const buffer: Buffer | undefined = file.buffer;

    // 2. Validación de extensión del archivo
    const extension = extraerExtension(originalname);
    if (!extension || !this.allowedExtensions.includes(extension)) {
      this.lanzarError(
        `Extensión de archivo '.${extension || 'desconocida'}' no permitida. Solo se aceptan extensiones: ${this.allowedExtensions.map((e) => `.${e}`).join(', ')}`,
      );
    }

    // 3. Validación de cabecera Content-Type (MIME)
    if (!mimetype || !this.allowedMimes.includes(mimetype)) {
      this.lanzarError(
        `Tipo MIME '${mimetype || 'no especificado'}' no soportado. Solo se permiten archivos multimedia: ${this.allowedMimes.join(', ')}`,
      );
    }

    // 4. Validación binaria de Magic Numbers (Evita spoofing de archivos maliciosos)
    if (buffer && Buffer.isBuffer(buffer)) {
      const mimeReal = detectarMimePorMagicNumbers(buffer);

      if (!mimeReal || !this.allowedMimes.includes(mimeReal)) {
        const descripcionDetectada = mimeReal
          ? `Tipo real detectado: '${mimeReal}'`
          : 'El contenido binario no corresponde a ninguna firma de imagen válida';
        this.lanzarError(
          `Archivo rechazado por incoherencia binaria (Magic Numbers). ${descripcionDetectada}. Solo se permiten imágenes JPEG, PNG o WebP auténticas.`,
        );
      }

      // Validar coherencia entre la extensión y el formato binario real detectado
      if (extension === 'png' && mimeReal !== 'image/png') {
        this.lanzarError('El archivo tiene extensión .png pero su contenido binario no corresponde a PNG.');
      }
      if ((extension === 'jpg' || extension === 'jpeg') && mimeReal !== 'image/jpeg') {
        this.lanzarError('El archivo tiene extensión .jpg/.jpeg pero su contenido binario no corresponde a JPEG.');
      }
      if (extension === 'webp' && mimeReal !== 'image/webp') {
        this.lanzarError('El archivo tiene extensión .webp pero su contenido binario no corresponde a WebP.');
      }
    }

    return file;
  }

  private lanzarError(mensaje: string): never {
    if (this.errorStatusCode === HttpStatus.BAD_REQUEST) {
      throw new BadRequestException(mensaje);
    }
    throw new UnsupportedMediaTypeException(mensaje);
  }
}

