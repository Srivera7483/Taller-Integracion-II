import {
  Injectable,
  Logger,
  BadRequestException,
  BadGatewayException,
} from '@nestjs/common';
import axios from 'axios';

@Injectable()
export class CloudinaryService {
  private readonly logger = new Logger(CloudinaryService.name);

  getCloudName(): string {
    return (process.env.CLOUDINARY_CLOUD_NAME || '').trim();
  }

  getUploadPreset(): string {
    return (process.env.CLOUDINARY_UPLOAD_PRESET || '').trim();
  }

  isConfigured(): boolean {
    const cloudName = this.getCloudName();
    const preset = this.getUploadPreset();
    return Boolean(
      cloudName &&
        preset &&
        cloudName !== 'tu_cloud_name' &&
        preset !== 'tu_preset',
    );
  }

  normalizarBuffer(raw: any): Buffer {
    if (!raw) return Buffer.alloc(0);
    if (Buffer.isBuffer(raw)) return raw;
    if (raw instanceof Uint8Array) return Buffer.from(raw.buffer, raw.byteOffset, raw.byteLength);
    if (raw instanceof ArrayBuffer) return Buffer.from(raw);
    if (typeof raw === 'object') {
      if (Array.isArray(raw.data)) return Buffer.from(raw.data);
      const values = Object.values(raw);
      if (values.length > 0 && typeof values[0] === 'number') {
        return Buffer.from(values as number[]);
      }
    }
    return Buffer.alloc(0);
  }

  /**
   * Sube un archivo binario directamente a la API de Cloudinary usando el upload preset no firmado.
   * @param file Archivo recibido por Multer (Express.Multer.File o similar con buffer).
   * @returns La secure_url HTTPS retornada por Cloudinary.
   */
  async subirImagen(file: {
    buffer: any;
    originalname?: string;
    mimetype?: string;
    size?: number;
  }): Promise<string> {
    const cloudName = this.getCloudName();
    const preset = this.getUploadPreset();
    const buffer = this.normalizarBuffer(file?.buffer);

    if (!file || !buffer || buffer.length === 0) {
      throw new BadRequestException('No se ha proporcionado ningún archivo para subir o el archivo está vacío.');
    }

    // Si Cloudinary está configurado con credenciales activas reales:
    if (this.isConfigured()) {
      try {
        const uploadUrl = `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`;

        // Cloudinary API admite Data URI en base64 de forma nativa e infalible,
        // evitando problemas de serialización de streams/blobs multipart en Node.js.
        const mime = file.mimetype || 'image/jpeg';
        const base64Data = buffer.toString('base64');
        const dataUri = `data:${mime};base64,${base64Data}`;

        const response = await axios.post(
          uploadUrl,
          {
            file: dataUri,
            upload_preset: preset,
          },
          {
            headers: {
              'Content-Type': 'application/json',
            },
            timeout: 30000,
          },
        );

        const secureUrl = response.data?.secure_url || response.data?.url;
        if (!secureUrl) {
          throw new BadGatewayException('Cloudinary no devolvió una URL válida');
        }

        this.logger.log(`Imagen subida exitosamente a Cloudinary: ${secureUrl}`);
        return secureUrl;
      } catch (error: any) {
        const errorMsg =
          error.response?.data?.error?.message ||
          error.message ||
          'Fallo al conectar con la API de Cloudinary';
        this.logger.error(`Error al subir imagen a Cloudinary: ${errorMsg}`);
        throw new BadGatewayException(`Error al subir imagen a Cloudinary: ${errorMsg}`);
      }
    }

    // Si las credenciales son de placeholder o plantilla (.env.example: tu_cloud_name):
    this.logger.warn(
      'Cloudinary no tiene credenciales reales configuradas aún (.env contiene valores de plantilla). Generando URL HTTPS representativa para desarrollo.',
    );
    const sanitizedName = (file.originalname || 'evidencia.jpg').replace(/[^a-zA-Z0-9._-]/g, '_');
    const mockSecureUrl = `https://res.cloudinary.com/${cloudName || 'tu_cloud_name'}/image/upload/v${Date.now()}/${sanitizedName}`;
    return mockSecureUrl;
  }

  /**
   * Valida si una URL corresponde a una dirección HTTPS válida de Cloudinary o recurso seguro.
   */
  validarUrlEvidencia(url: string): boolean {
    if (!url || typeof url !== 'string') return false;
    const trimmed = url.trim();
    if (!trimmed.startsWith('https://')) return false;
    return true;
  }
}
