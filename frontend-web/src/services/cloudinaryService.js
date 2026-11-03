import axios from 'axios';

/**
 * Servicio de Integración para Cloudinary (TAL-136)
 * 
 * Prepara la arquitectura para la subida de evidencias fotográficas a Cloudinary.
 * Cuando las variables de entorno estén presentes, realiza el POST directo a Cloudinary API.
 * Si aún no hay conexión auténtica con Cloudinary configurada en el entorno,
 * emula de manera fluida y asíncrona la latencia de red para activar y evaluar
 * las animaciones del uploader y el estado de carga (isLoading).
 */

const CLOUDINARY_CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || '';
const CLOUDINARY_UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || '';

/**
 * Indica si Cloudinary cuenta con credenciales activas configuradas.
 */
export const isCloudinaryConfigured = () => {
  return Boolean(CLOUDINARY_CLOUD_NAME && CLOUDINARY_UPLOAD_PRESET);
};

/**
 * Sube una imagen a Cloudinary o ejecuta la simulación de latencia preparada.
 * 
 * @param {File} file Archivo binario de la imagen.
 * @param {Object} options Opciones de subida y callbacks.
 * @param {Function} [options.onProgress] Callback de progreso (0 a 100).
 * @param {number} [options.latencyMs=1600] Tiempo de latencia simulada cuando no hay API keys.
 * @returns {Promise<{ url: string, public_id?: string, format?: string, width?: number, height?: number }>}
 */
export const uploadImageToCloudinary = async (file, { onProgress, latencyMs = 1600 } = {}) => {
  if (!file) {
    throw new Error('No se ha proporcionado ningún archivo para subir.');
  }

  // 1. Si existe configuración real de Cloudinary en el entorno, realizar la subida auténtica
  if (isCloudinaryConfigured()) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);

    const uploadUrl = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`;

    const response = await axios.post(uploadUrl, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: (progressEvent) => {
        if (onProgress && progressEvent.total) {
          const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          onProgress(percent);
        }
      },
    });

    return {
      url: response.data.secure_url || response.data.url,
      public_id: response.data.public_id,
      format: response.data.format,
      width: response.data.width,
      height: response.data.height,
    };
  }

  // 2. Modo Preparado / Simulado de Latencia (Criterio TAL-136)
  // Permite evaluar las transiciones fluidas de "Subir Evidencia" -> "Procesando..." -> "Subido"
  return new Promise((resolve, reject) => {
    let progress = 10;
    if (onProgress) onProgress(progress);

    const interval = setInterval(() => {
      progress += Math.floor(Math.random() * 20) + 15;
      if (progress > 90) {
        progress = 90;
      }
      if (onProgress) onProgress(progress);
    }, latencyMs / 4);

    setTimeout(() => {
      clearInterval(interval);
      if (onProgress) onProgress(100);

      try {
        const previewUrl = URL.createObjectURL(file);
        resolve({
          url: previewUrl,
          public_id: `cloudinary-mock-${Date.now()}`,
          format: file.type.split('/')[1] || 'webp',
          simulated: true,
        });
      } catch (err) {
        reject(err);
      }
    }, latencyMs);
  });
};

