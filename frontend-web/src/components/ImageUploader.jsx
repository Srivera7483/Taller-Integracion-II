import React, { useState, useRef } from 'react';
import {
  FiUploadCloud,
  FiImage,
  FiMaximize2,
  FiTrash2,
  FiRefreshCw,
  FiFileText,
  FiAlertCircle,
  FiCheckCircle,
} from 'react-icons/fi';
import { useToast } from '../context/ToastContext';

/**
 * Límite estricto de tamaño de archivo en cliente: 5MB = 5 * 1024 * 1024 = 5,242,880 bytes (TAL-134)
 */
const MAX_FILE_SIZE_BYTES = 5242880;
const MENSAJE_ERROR_LIMITE_5MB = 'El archivo supera el límite de 5MB';

/**
 * Componente <ImageUploader /> (TAL-134 & TAL-133)
 * - Valida en cliente el peso del archivo mediante JS nativo (`file.size`) en el evento `onChange` del input `file`.
 * - Si el archivo supera los 5,242,880 bytes (5MB), cancela inmediatamente la carga, limpia el input
 *   y dispara un Toast de error informativo: "El archivo supera el límite de 5MB".
 * - Garantiza que el POST a Cloudinary/Backend nunca se ejecute con un archivo > 5MB (Criterio a).
 * - Provee interfaz reactiva al instante con indicadores visuales de estado y miniatura con `object-cover` (Criterio b).
 */
const ImageUploader = ({
  archivoImagen,
  imagenPreviewUrl,
  adjuntoNombre,
  onFileAccepted,
  onClearFile,
  onOpenModal,
  disabled = false,
  fileInputRef: externalFileInputRef,
  maxSizeBytes = MAX_FILE_SIZE_BYTES,
}) => {
  const internalFileInputRef = useRef(null);
  const inputRef = externalFileInputRef || internalFileInputRef;
  const { showToast } = useToast();

  // Estado reactivo instantáneo para feedback visual en la interfaz (Criterio b)
  const [errorTamano, setErrorTamano] = useState(null);
  const [archivoRechazadoInfo, setArchivoRechazadoInfo] = useState(null);
  const [isDragging, setIsDragging] = useState(false);

  const procesarArchivoSeleccionado = (file, inputElement = null) => {
    if (!file) return;

    // Validación nativa JS (file.size > 5,242,880 bytes)
    if (file.size > maxSizeBytes) {
      const pesoMB = (file.size / (1024 * 1024)).toFixed(2);

      // 1. Cancelar la carga limpiando el input file y cualquier selección previa
      if (inputElement) {
        inputElement.value = '';
      } else if (inputRef.current) {
        inputRef.current.value = '';
      }

      if (onClearFile) {
        onClearFile({ silent: true });
      }

      // 2. Actualizar interfaz reactiva al instante
      setErrorTamano(MENSAJE_ERROR_LIMITE_5MB);
      setArchivoRechazadoInfo({
        nombre: file.name,
        tamanoBytes: file.size,
        tamanoMB: pesoMB,
      });

      // 3. Disparar inmediatamente el Toast de error informativo requerido
      showToast(MENSAJE_ERROR_LIMITE_5MB, 'error');
      return;
    }

    // Si el archivo cumple con el límite (<= 5,242,880 bytes), limpiar errores y aceptar carga
    setErrorTamano(null);
    setArchivoRechazadoInfo(null);

    if (onFileAccepted) {
      onFileAccepted(file);
    }
  };

  const handleInputChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    procesarArchivoSeleccionado(file, e.target);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) {
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
    if (disabled) return;

    const file = e.dataTransfer?.files?.[0];
    if (!file) return;
    procesarArchivoSeleccionado(file, inputRef.current);
  };

  const handleTriggerSelector = () => {
    if (disabled) return;
    if (inputRef.current) {
      inputRef.current.click();
    }
  };

  const handleLimpiarSeleccion = () => {
    setErrorTamano(null);
    setArchivoRechazadoInfo(null);
    if (inputRef.current) {
      inputRef.current.value = '';
    }
    if (onClearFile) {
      onClearFile({ silent: false });
    }
  };

  return (
    <div id="image-uploader-component" className="space-y-3">
      {/* Input de archivo subyacente con validación en evento onChange */}
      <input
        ref={inputRef}
        type="file"
        id="input-archivo-evidencia"
        onChange={handleInputChange}
        disabled={disabled}
        className="hidden"
        accept=".png,.jpg,.jpeg,.webp,.gif,.log,.txt,.pdf"
      />

      {/* Banner reactivo instantáneo cuando un archivo supera los 5MB (Criterio b) */}
      {errorTamano && (
        <div
          id="alerta-error-tamano-archivo"
          role="alert"
          className="bg-red-50 border border-red-200 rounded-xl p-3.5 flex items-start justify-between gap-3 text-red-800 transition-all animate-fadeIn"
        >
          <div className="flex items-start gap-2.5 min-w-0">
            <FiAlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div className="text-xs space-y-1 min-w-0">
              <p className="font-bold text-red-900">{errorTamano}</p>
              {archivoRechazadoInfo && (
                <p className="text-red-700 truncate">
                  Archivo rechazado: <span className="font-semibold">{archivoRechazadoInfo.nombre}</span>{' '}
                  <span className="font-mono">
                    ({archivoRechazadoInfo.tamanoMB} MB / {archivoRechazadoInfo.tamanoBytes.toLocaleString()} bytes)
                  </span>
                  . El máximo permitido es <strong>5MB (5,242,880 bytes)</strong>.
                </p>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              setErrorTamano(null);
              setArchivoRechazadoInfo(null);
            }}
            className="text-xs font-semibold text-red-700 hover:text-red-900 px-2 py-1 rounded hover:bg-red-100 transition-colors flex-shrink-0 cursor-pointer"
          >
            Cerrar
          </button>
        </div>
      )}

      {imagenPreviewUrl ? (
        /* Miniatura (Thumbnail) en el formulario cuando se adjunta una imagen válida (<= 5MB) */
        <div
          id="contenedor-thumbnail-evidencia"
          className="bg-slate-50 border border-slate-200 rounded-xl p-4 transition-all"
        >
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            {/* Miniatura clickable (Thumbnail) */}
            <div
              id="miniatura-imagen-clickable"
              role="button"
              tabIndex={0}
              onClick={onOpenModal}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  if (onOpenModal) onOpenModal();
                }
              }}
              title="Clic sobre la miniatura para abrir en tamaño grande (Modal UI)"
              className="group relative w-24 h-24 sm:w-28 sm:h-28 rounded-xl overflow-hidden border-2 border-blue-500 shadow-md cursor-pointer hover:border-blue-700 hover:shadow-lg transition-all flex-shrink-0 bg-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              {/* TAL-133 Criterio a: El thumbnail utiliza la propiedad object-cover para no deformar la foto */}
              <img
                id="thumbnail-imagen-adjunta"
                src={imagenPreviewUrl}
                alt={adjuntoNombre || 'Miniatura de evidencia adjunta'}
                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                style={{ objectFit: 'cover' }}
              />
              <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white p-1">
                <FiMaximize2 className="w-5 h-5 mb-1" />
                <span className="text-[10px] font-bold uppercase tracking-wider text-center">Ampliar</span>
              </div>
            </div>

            {/* Detalles y Acciones de la Imagen */}
            <div className="flex-1 min-w-0 space-y-2">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-blue-100 text-blue-800 border border-blue-200 flex items-center gap-1">
                  <FiImage className="w-3 h-3" /> Imagen Adjunta
                </span>
                {archivoImagen?.size && (
                  <span className="text-xs text-gray-500 font-mono">
                    {(archivoImagen.size / (1024 * 1024)).toFixed(2)} MB / 5.00 MB máx.
                  </span>
                )}
                <span className="text-[11px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 inline-flex items-center gap-1">
                  <FiCheckCircle className="w-3 h-3" /> Tamaño válido (&le; 5MB)
                </span>
              </div>

              <p className="text-sm font-semibold text-gray-900 truncate" title={adjuntoNombre}>
                {adjuntoNombre}
              </p>

              <p className="text-xs text-gray-500">
                Haz clic sobre la miniatura para verificar en tamaño grande la foto antes de enviar.
              </p>

              {/* Acciones directas sobre la selección */}
              <div className="flex items-center gap-2 flex-wrap pt-1">
                <button
                  type="button"
                  id="btn-abrir-modal-desde-formulario"
                  onClick={onOpenModal}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-blue-700 bg-white border border-blue-300 hover:bg-blue-50 transition-colors shadow-2xs cursor-pointer"
                >
                  <FiMaximize2 className="w-3.5 h-3.5" />
                  <span>Ver en tamaño grande</span>
                </button>

                <button
                  type="button"
                  id="btn-limpiar-seleccion-imagen"
                  onClick={handleLimpiarSeleccion}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-red-700 bg-white border border-red-300 hover:bg-red-50 transition-colors shadow-2xs cursor-pointer"
                  title="Limpiar la selección antes de enviar el POST final"
                >
                  <FiTrash2 className="w-3.5 h-3.5 text-red-500" />
                  <span>Limpiar selección</span>
                </button>

                <button
                  type="button"
                  id="btn-cambiar-imagen-formulario"
                  onClick={handleTriggerSelector}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 transition-colors shadow-2xs cursor-pointer"
                  title="Cambiar por otra foto"
                >
                  <FiRefreshCw className="w-3.5 h-3.5 text-gray-500" />
                  <span>Cambiar foto</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : adjuntoNombre ? (
        /* Caso archivo no-imagen válido (<= 5MB) */
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <FiFileText className="w-6 h-6 text-blue-600" />
            <div>
              <p className="text-sm font-semibold text-gray-900">{adjuntoNombre}</p>
              <p className="text-xs text-gray-500">
                Documento de registro adjunto
                {archivoImagen?.size ? ` (${(archivoImagen.size / (1024 * 1024)).toFixed(2)} MB)` : ''}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleLimpiarSeleccion}
            className="text-xs font-semibold text-red-600 hover:text-red-700 px-3 py-1.5 rounded-lg border border-red-200 bg-white hover:bg-red-50 transition-colors cursor-pointer"
          >
            Limpiar archivo
          </button>
        </div>
      ) : (
        /* Dropzone inicial cuando no hay archivo seleccionado o tras cancelar carga > 5MB */
        <div
          id="dropzone-image-uploader"
          onClick={handleTriggerSelector}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`relative border-2 border-dashed rounded-xl p-6 text-center transition-all cursor-pointer group ${
            errorTamano
              ? 'border-red-300 hover:border-red-500 bg-red-50/20 hover:bg-red-50/40'
              : isDragging
              ? 'border-blue-500 bg-blue-50/40'
              : 'border-gray-300 hover:border-blue-500 bg-gray-50/50 hover:bg-blue-50/20'
          }`}
        >
          <div className="flex flex-col items-center justify-center space-y-2">
            <div
              className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${
                errorTamano
                  ? 'bg-red-100 text-red-600 group-hover:bg-red-200'
                  : 'bg-blue-50 group-hover:bg-blue-100 text-blue-600'
              }`}
            >
              <FiUploadCloud className="w-6 h-6" />
            </div>
            <div className="text-sm text-gray-600">
              <span className="font-semibold text-blue-600 hover:underline">Haz clic para subir una foto</span> o
              arrastra y suelta aquí
            </div>
            <p className="text-xs text-gray-400">
              Formatos permitidos: PNG, JPG, WEBP (Máximo 5MB — 5,242,880 bytes)
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default ImageUploader;
