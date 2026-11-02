import React, { useState, useRef, useEffect } from 'react';
import {
  FiUploadCloud,
  FiImage,
  FiCheckCircle,
  FiAlertCircle,
  FiMaximize2,
  FiTrash2,
  FiRefreshCw
} from 'react-icons/fi';
import { uploadImageToCloudinary } from '../services/cloudinaryService';

/**
 * Componente EvidenciaUploader (TAL-136)
 * 
 * Gestiona el ciclo completo de carga de evidencias fotográficas para Cloudinary:
 * - Estado Base: Botón / Zona de Drag&Drop listo para recibir archivos ("Subir Evidencia").
 * - Estado de Carga (isLoading): Input deshabilitado, botón y zona mutan a Spinner circular
 *   + barra de progreso indeterminada animada + texto "Procesando...".
 * - Estado Final (Subido): Transición suave que despliega miniatura con object-cover,
 *   badge de confirmación y acciones de previsualización / cambio / limpieza (TAL-133).
 */
const EvidenciaUploader = ({
  archivo,
  previewUrl,
  nombreArchivo,
  onFileLoaded,
  onClear,
  onOpenPreview,
  disabled = false,
  label = 'Evidencia Fotográfica (Cloudinary)',
  helperText = 'Formatos recomendados: PNG, JPG, WEBP (hasta 10MB)',
  className = '',
}) => {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  const fileInputRef = useRef(null);

  // Limpiar éxito temporal tras unos segundos
  useEffect(() => {
    if (uploadSuccess) {
      const timer = setTimeout(() => {
        setUploadSuccess(false);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [uploadSuccess]);

  const procesarArchivo = async (file) => {
    if (!file) return;

    // Validación básica de tipo imagen
    const esImagen = file.type.startsWith('image/') || /\.(png|jpe?g|webp|gif|bmp)$/i.test(file.name);
    if (!esImagen) {
      setErrorMessage('Por favor selecciona un archivo de imagen válido (PNG, JPG, WEBP).');
      return;
    }

    setErrorMessage(null);
    setIsUploading(true);
    setUploadProgress(15);

    try {
      // Subida con tiempo de latencia / Cloudinary API
      const result = await uploadImageToCloudinary(file, {
        onProgress: (percent) => setUploadProgress(percent),
        latencyMs: 1600,
      });

      setUploadSuccess(true);
      if (onFileLoaded) {
        onFileLoaded({
          file,
          previewUrl: result.url,
          name: file.name,
          size: file.size,
          cloudinaryResult: result,
        });
      }
    } catch {
      setErrorMessage('Error al subir imagen a Cloudinary. Intenta nuevamente.');
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
      // Reset del input para permitir volver a seleccionar si se limpia
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleInputChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      procesarArchivo(file);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled && !isUploading) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (disabled || isUploading) return;

    const file = e.dataTransfer.files?.[0];
    if (file) {
      procesarArchivo(file);
    }
  };

  const triggerSelect = () => {
    if (!disabled && !isUploading && fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  return (
    <div className={`space-y-2 ${className}`}>
      {label && (
        <label className="block text-sm font-medium text-gray-700">
          {label} <span className="text-xs text-gray-400 font-normal">(Opcional)</span>
        </label>
      )}

      {/* Input nativo de archivo: queda disabled mientras dure la carga (Criterio de Aceptación) */}
      <input
        ref={fileInputRef}
        type="file"
        id="input-archivo-cloudinary"
        data-testid="input-archivo-cloudinary"
        accept=".png,.jpg,.jpeg,.webp"
        onChange={handleInputChange}
        disabled={disabled || isUploading}
        className="hidden"
      />

      {/* RENDERIZADO CONDICIONAL CON TRANSICIONES SUAVES: BASE vs CARGA vs FINAL */}
      <div className="relative overflow-hidden rounded-xl transition-all duration-300">
        {isUploading ? (
          /* ======================================================= */
          /* ESTADO DE CARGA: Spinner circular + "Procesando..."     */
          /* + Barra de progreso indeterminada animada               */
          /* ======================================================= */
          <div
            id="uploader-estado-carga"
            role="status"
            aria-busy="true"
            aria-live="polite"
            className="border-2 border-primary/40 bg-primary-50/50 rounded-xl p-6 sm:p-7 text-center shadow-inner transition-smooth"
          >
            <div className="flex flex-col items-center justify-center space-y-4 max-w-md mx-auto">
              {/* Spinner circular con anillo brillante / pulse */}
              <div className="relative flex items-center justify-center">
                {/* Anillo de pulso fluido de fondo */}
                <div className="absolute w-16 h-16 rounded-full bg-primary/20 animate-ping" />
                
                {/* Anillo de carga (Spinner circular con gradiente) */}
                <svg
                  className="animate-spin w-12 h-12 text-primary relative z-10"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <circle
                    className="opacity-20"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="3.5"
                  />
                  <path
                    className="opacity-90"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
              </div>

              {/* Texto principal con transición suave y mensaje "Procesando..." */}
              <div className="space-y-1">
                <div className="flex items-center justify-center gap-2">
                  <span className="text-base font-bold text-primary-950 tracking-wide animate-pulse">
                    Procesando...
                  </span>
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-primary-50 text-primary border border-primary-200">
                    Cloudinary CDN
                  </span>
                </div>
                <p className="text-xs text-primary/90 font-medium">
                  Optimizando y subiendo evidencia fotográfica... Por favor espera.
                </p>
              </div>

              {/* Barra de progreso indeterminada animada (Tailwind + CSS Keyframes) */}
              <div
                className="w-full bg-primary-100/80 rounded-full h-2.5 overflow-hidden relative shadow-inner"
                role="progressbar"
                aria-valuenow={uploadProgress}
                aria-valuemin="0"
                aria-valuemax="100"
              >
                <div
                  className="bg-gradient-to-r from-primary via-primary-600 to-primary-700 h-full rounded-full animate-indeterminate"
                  style={{ width: `${Math.max(uploadProgress, 45)}%` }}
                />
              </div>

              <div className="flex items-center justify-between w-full text-[11px] text-gray-500 px-1">
                <span className="italic">Reduciendo latencia de conexión y protegiendo tu archivo</span>
                {uploadProgress > 0 && (
                  <span className="font-mono font-bold text-primary">{uploadProgress}%</span>
                )}
              </div>
            </div>
          </div>
        ) : previewUrl ? (
          /* ======================================================= */
          /* ESTADO FINAL: Evidencia Subida con Miniatura object-cover */
          /* ======================================================= */
          <div
            id="uploader-estado-subido"
            className="bg-slate-50 border border-slate-200 hover:border-primary-300 rounded-xl p-4 sm:p-5 shadow-xs transition-smooth"
          >
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
              {/* Miniatura (Thumbnail) con object-cover estricto (TAL-133) */}
              <div
                id="miniatura-imagen-subida"
                role="button"
                tabIndex={0}
                onClick={onOpenPreview}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    if (onOpenPreview) onOpenPreview();
                  }
                }}
                title="Haz clic para ampliar la imagen en el previsualizador"
                className="group relative w-24 h-24 sm:w-28 sm:h-28 rounded-xl overflow-hidden border-2 border-emerald-500 shadow-md cursor-pointer hover:border-emerald-600 hover:shadow-lg transition-all flex-shrink-0 bg-slate-900 focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <img
                  id="thumbnail-evidencia-subida"
                  src={previewUrl}
                  alt={nombreArchivo || 'Evidencia fotográfica subida'}
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                  style={{ objectFit: 'cover' }}
                />
                <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white p-1">
                  <FiMaximize2 className="w-5 h-5 mb-1" />
                  <span className="text-[10px] font-bold uppercase tracking-wider text-center">Ampliar</span>
                </div>
              </div>

              {/* Información y botones de acción */}
              <div className="flex-1 min-w-0 space-y-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1.5">
                    <FiCheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Subido a Cloudinary</span>
                  </span>
                  {archivo?.size && (
                    <span className="text-xs text-gray-500 font-mono">
                      {(archivo.size / (1024 * 1024)).toFixed(2)} MB
                    </span>
                  )}
                  {uploadSuccess && (
                    <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-lg animate-bounce">
                      ¡Carga completada!
                    </span>
                  )}
                </div>

                <p className="text-sm font-semibold text-gray-900 truncate" title={nombreArchivo || archivo?.name}>
                  {nombreArchivo || archivo?.name || 'evidencia_fotografica.webp'}
                </p>

                <p className="text-xs text-gray-500">
                  Imagen almacenada y lista. Puedes previsualizarla en alta resolución o reemplazarla.
                </p>

                {/* Acciones sobre la evidencia: Ampliar, Limpiar selección y Cambiar foto */}
                <div className="flex items-center gap-2 flex-wrap pt-1">
                  {onOpenPreview && (
                    <button
                      type="button"
                      id="btn-ampliar-evidencia"
                      onClick={onOpenPreview}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-primary bg-white border border-primary-300 hover:bg-primary-50 transition-colors shadow-2xs cursor-pointer"
                    >
                      <FiMaximize2 className="w-3.5 h-3.5" />
                      <span>Ver en grande</span>
                    </button>
                  )}

                  <button
                    type="button"
                    id="btn-cambiar-evidencia"
                    onClick={triggerSelect}
                    disabled={disabled}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 transition-colors shadow-2xs cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Seleccionar otra imagen"
                  >
                    <FiRefreshCw className="w-3.5 h-3.5 text-gray-500" />
                    <span>Cambiar foto</span>
                  </button>

                  {onClear && (
                    <button
                      type="button"
                      id="btn-limpiar-evidencia"
                      onClick={onClear}
                      disabled={disabled}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-red-700 bg-white border border-red-300 hover:bg-red-50 transition-colors shadow-2xs cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Quitar esta evidencia"
                    >
                      <FiTrash2 className="w-3.5 h-3.5 text-red-500" />
                      <span>Limpiar selección</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* ======================================================= */
          /* ESTADO BASE: Botón / Zona Drag & Drop ("Subir Evidencia") */
          /* ======================================================= */
          <div
            id="uploader-zona-drop"
            role="button"
            tabIndex={0}
            onClick={triggerSelect}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                triggerSelect();
              }
            }}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-xl p-6 sm:p-7 text-center transition-all cursor-pointer group select-none ${
              isDragging
                ? 'border-primary bg-primary-50/60 scale-[1.01] shadow-md'
                : 'border-gray-300 hover:border-primary bg-gray-50/50 hover:bg-primary-50/20 shadow-2xs'
            } ${disabled ? 'opacity-50 cursor-not-allowed pointer-events-none' : ''}`}
          >
            <div className="flex flex-col items-center justify-center space-y-3">
              <div className="w-12 h-12 rounded-xl bg-primary-50 group-hover:bg-primary-100 text-primary flex items-center justify-center transition-transform duration-200 group-hover:scale-110 shadow-2xs">
                <FiUploadCloud className="w-6 h-6" />
              </div>

              <div className="space-y-1">
                <div className="text-sm text-gray-700 font-medium">
                  {/* Botón visual mutante explícito "Subir Evidencia" */}
                  <span
                    id="btn-subir-evidencia"
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-primary hover:bg-primary-hover text-white font-semibold text-xs shadow-md hover:shadow-lg mr-2 transition-all"
                  >
                    <FiImage className="w-3.5 h-3.5" />
                    <span>Subir Evidencia</span>
                  </span>
                  <span>o arrastra y suelta tu foto aquí</span>
                </div>
                <p className="text-xs text-gray-400">
                  {helperText}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {errorMessage && (
        <p className="mt-1.5 text-xs text-red-600 flex items-center gap-1 font-medium animate-fadeIn">
          <FiAlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
          {errorMessage}
        </p>
      )}
    </div>
  );
};

export default EvidenciaUploader;
