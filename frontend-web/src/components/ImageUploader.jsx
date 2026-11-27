import React, { useState, useRef } from 'react';
import {
  FiUploadCloud,
  FiImage,
  FiMaximize2,
  FiTrash2,
  FiPlus,
  FiFileText,
  FiAlertCircle,
  FiCheckCircle,
} from 'react-icons/fi';
import { useToast } from '../context/ToastContext';

/**
 * Límite estricto de tamaño de archivo en cliente: 5MB = 5 * 1024 * 1024 = 5,242,880 bytes
 * Límite máximo de evidencias por incidencia según contrato OpenAPI: 5 fotos
 */
const MAX_FILE_SIZE_BYTES = 5242880;
const MAX_EVIDENCIAS_DEFAULT = 5;
const MENSAJE_ERROR_LIMITE_5MB = 'El archivo supera el límite de 5MB';

/**
 * Componente <ImageUploader />
 * - Soporta carga múltiple de hasta `maxFiles` (por defecto 5) evidencias fotográficas.
 * - Valida en cliente el peso de cada archivo (`file.size <= 5MB`).
 * - Oculta el botón/zona para agregar fotos al alcanzar el máximo de 5 evidencias.
 * - Mantiene retrocompatibilidad con props de selección única (`archivoImagen`, `onFileAccepted`, etc.).
 */
const ImageUploader = ({
  // Props multi-archivo (máx. 5)
  archivos,
  onFilesAdded,
  onRemoveFile,
  onClearAll,
  onOpenPreview,
  maxFiles = MAX_EVIDENCIAS_DEFAULT,
  // Props retrocompatibles de archivo único
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

  const [errorTamano, setErrorTamano] = useState(null);
  const [archivoRechazadoInfo, setArchivoRechazadoInfo] = useState(null);
  const [isDragging, setIsDragging] = useState(false);

  const esModoMultiple = Array.isArray(archivos);
  const listaArchivos = esModoMultiple
    ? archivos
    : imagenPreviewUrl || adjuntoNombre
      ? [
          {
            id: 'single-file',
            file: archivoImagen,
            previewUrl: imagenPreviewUrl,
            name: adjuntoNombre || archivoImagen?.name || 'Evidencia adjunta',
            size: archivoImagen?.size || 0,
          },
        ]
      : [];

  const limiteAlcanzado = listaArchivos.length >= maxFiles;
  const cuposDisponibles = Math.max(0, maxFiles - listaArchivos.length);

  const procesarArchivosSeleccionados = (fileList, inputElement = null) => {
    const seleccionados = Array.from(fileList || []).filter(Boolean);
    if (seleccionados.length === 0) return;

    if (inputElement) {
      inputElement.value = '';
    } else if (inputRef.current) {
      inputRef.current.value = '';
    }

    if (esModoMultiple && cuposDisponibles <= 0) {
      showToast(`Máximo ${maxFiles} fotos permitidas por incidencia`, 'warning');
      return;
    }

    const validos = [];
    let archivoMuyPesado = null;

    for (const file of seleccionados) {
      if (file.size > maxSizeBytes) {
        archivoMuyPesado = file;
        continue;
      }
      validos.push(file);
    }

    if (archivoMuyPesado) {
      const pesoMB = (archivoMuyPesado.size / (1024 * 1024)).toFixed(2);
      setErrorTamano(MENSAJE_ERROR_LIMITE_5MB);
      setArchivoRechazadoInfo({
        nombre: archivoMuyPesado.name,
        tamanoBytes: archivoMuyPesado.size,
        tamanoMB: pesoMB,
      });
      showToast(MENSAJE_ERROR_LIMITE_5MB, 'error');

      if (!esModoMultiple && onClearFile) {
        onClearFile({ silent: true });
      }
    } else {
      setErrorTamano(null);
      setArchivoRechazadoInfo(null);
    }

    if (validos.length === 0) return;

    if (esModoMultiple) {
      let archivosAInsertar = validos;
      if (validos.length > cuposDisponibles) {
        archivosAInsertar = validos.slice(0, cuposDisponibles);
        showToast(
          `Solo se agregaron ${archivosAInsertar.length} foto(s). El máximo permitido es ${maxFiles} fotos por incidencia.`,
          'warning',
        );
      }
      if (onFilesAdded) {
        onFilesAdded(archivosAInsertar);
      }
    } else if (onFileAccepted) {
      onFileAccepted(validos[0]);
    }
  };

  const handleInputChange = (e) => {
    procesarArchivosSeleccionados(e.target.files, e.target);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled && !limiteAlcanzado) {
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
    if (disabled || limiteAlcanzado) return;
    procesarArchivosSeleccionados(e.dataTransfer?.files, inputRef.current);
  };

  const handleTriggerSelector = () => {
    if (disabled || limiteAlcanzado) return;
    if (inputRef.current) {
      inputRef.current.click();
    }
  };

  const handleEliminarIndividual = (item) => {
    setErrorTamano(null);
    setArchivoRechazadoInfo(null);
    if (esModoMultiple && onRemoveFile) {
      onRemoveFile(item.id);
    } else if (onClearFile) {
      onClearFile({ silent: false });
    }
  };

  const handleLimpiarTodo = () => {
    setErrorTamano(null);
    setArchivoRechazadoInfo(null);
    if (inputRef.current) {
      inputRef.current.value = '';
    }
    if (esModoMultiple && onClearAll) {
      onClearAll();
    } else if (onClearFile) {
      onClearFile({ silent: false });
    }
  };

  const handleAmpliar = (item) => {
    if (onOpenPreview) {
      onOpenPreview(item);
    } else if (onOpenModal) {
      onOpenModal();
    }
  };

  return (
    <div id="image-uploader-component" className="space-y-3">
      {/* Input de archivo subyacente (habilita multiple hasta maxFiles) */}
      <input
        ref={inputRef}
        type="file"
        id="input-archivo-evidencia"
        multiple={esModoMultiple && maxFiles > 1}
        onChange={handleInputChange}
        disabled={disabled || limiteAlcanzado}
        className="hidden focus-visible:ring focus-visible:ring-2 focus-visible:ring-primary"
        accept=".png,.jpg,.jpeg,.webp,.gif,.log,.txt,.pdf"
      />

      {/* Banner reactivo instantáneo cuando un archivo supera los 5MB */}
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
            aria-label="Cerrar"
            className="text-xs font-semibold text-red-700 hover:text-red-900 px-2 py-1 rounded hover:bg-red-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring transition-colors flex-shrink-0 cursor-pointer"
          >
            Cerrar
          </button>
        </div>
      )}

      {/* Listado de evidencias adjuntas (1 a 5 fotos) */}
      {listaArchivos.length > 0 && (
        <div
          id="contenedor-thumbnail-evidencia"
          className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3 transition-all"
        >
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2.5 py-0.5 rounded-lg text-[11px] font-bold bg-primary-50 text-primary border border-primary-200 inline-flex items-center gap-1">
                <FiImage className="w-3.5 h-3.5" />
                <span>
                  {listaArchivos.length} / {maxFiles} {listaArchivos.length === 1 ? 'foto adjunta' : 'fotos adjuntas'}
                </span>
              </span>
              {limiteAlcanzado ? (
                <span className="text-[11px] font-semibold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-lg border border-amber-200 inline-flex items-center gap-1">
                  <FiCheckCircle className="w-3 h-3" /> Límite máximo alcanzado ({maxFiles}/{maxFiles})
                </span>
              ) : (
                <span className="text-[11px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-200 inline-flex items-center gap-1">
                  <FiCheckCircle className="w-3 h-3" /> Tamaño válido (&le; 5MB c/u)
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              {/* El botón de agregar fotos se oculta automáticamente al llegar a maxFiles (5) */}
              {!limiteAlcanzado && (
                <button
                  type="button"
                  id="btn-agregar-mas-fotos"
                  onClick={handleTriggerSelector}
                  disabled={disabled}
                  aria-label="Agregar más fotos"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-primary bg-white border border-primary-300 hover:bg-primary-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary transition-colors shadow-2xs cursor-pointer disabled:opacity-50"
                >
                  <FiPlus className="w-3.5 h-3.5" />
                  <span>Agregar foto ({cuposDisponibles} disp.)</span>
                </button>
              )}

              <button
                type="button"
                id="btn-limpiar-seleccion-imagen"
                onClick={handleLimpiarTodo}
                disabled={disabled}
                aria-label="Eliminar todas las fotos"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-red-700 bg-white border border-red-300 hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 transition-colors shadow-2xs cursor-pointer disabled:opacity-50"
              >
                <FiTrash2 className="w-3.5 h-3.5 text-red-500" />
                <span>{listaArchivos.length > 1 ? 'Limpiar todas' : 'Limpiar selección'}</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {listaArchivos.map((item, idx) => (
              <div
                key={item.id || idx}
                className="bg-white border border-gray-200 rounded-xl p-2.5 flex items-center gap-3 shadow-2xs"
              >
                {item.previewUrl ? (
                  <div
                    id={idx === 0 ? 'miniatura-imagen-clickable' : undefined}
                    role="button"
                    tabIndex={0}
                    onClick={() => handleAmpliar(item)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        handleAmpliar(item);
                      }
                    }}
                    title="Clic para ampliar la imagen"
                    aria-label={`Ampliar ${item.name}`}
                    className="group relative w-16 h-16 rounded-lg overflow-hidden border-2 border-primary/70 cursor-pointer hover:border-primary transition-all flex-shrink-0 bg-slate-900"
                  >
                    <img
                      id={idx === 0 ? 'thumbnail-imagen-adjunta' : undefined}
                      src={item.previewUrl}
                      alt={item.name}
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                      style={{ objectFit: 'cover' }}
                    />
                    <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                      <FiMaximize2 className="w-4 h-4" />
                    </div>
                  </div>
                ) : (
                  <div className="w-16 h-16 rounded-lg bg-gray-100 border border-gray-200 flex items-center justify-center flex-shrink-0 text-primary">
                    <FiFileText className="w-6 h-6" />
                  </div>
                )}

                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-gray-900 truncate" title={item.name}>
                    {item.name}
                  </p>
                  <p className="text-[11px] text-gray-500 font-mono">
                    {item.size ? `${(item.size / (1024 * 1024)).toFixed(2)} MB` : 'Listo'}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    {item.previewUrl && (
                      <button
                        type="button"
                        onClick={() => handleAmpliar(item)}
                        className="text-[11px] font-semibold text-primary hover:underline cursor-pointer"
                      >
                        Ampliar
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => handleEliminarIndividual(item)}
                      disabled={disabled}
                      aria-label={`Eliminar ${item.name}`}
                      className="text-[11px] font-semibold text-red-600 hover:underline cursor-pointer disabled:opacity-50"
                    >
                      Quitar
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Dropzone inicial (solo visible cuando aún no se alcanza el límite de 5 y no hay fotos o se quiere arrastrar) */}
      {listaArchivos.length === 0 && !limiteAlcanzado && (
        <div
          id="dropzone-image-uploader"
          tabIndex={0}
          role="button"
          aria-label="Subir evidencias fotográficas"
          onClick={handleTriggerSelector}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              handleTriggerSelector();
            }
          }}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`relative border-2 border-dashed rounded-xl p-6 text-center transition-all cursor-pointer group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring ${
            errorTamano
              ? 'border-red-300 hover:border-red-500 bg-red-50/20 hover:bg-red-50/40'
              : isDragging
                ? 'border-primary bg-primary-50/40'
                : 'border-gray-300 hover:border-primary bg-gray-50/50 hover:bg-primary-50/20'
          }`}
        >
          <div className="flex flex-col items-center justify-center space-y-2">
            <div
              className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${
                errorTamano
                  ? 'bg-red-100 text-red-600 group-hover:bg-red-200'
                  : 'bg-primary-50 group-hover:bg-primary-100 text-primary'
              }`}
            >
              <FiUploadCloud className="w-6 h-6" />
            </div>
            <div className="text-sm text-gray-600">
              <span className="font-semibold text-primary hover:underline">
                Haz clic para subir fotos (hasta {maxFiles})
              </span>{' '}
              o arrastra y suelta aquí
            </div>
            <p className="text-xs text-gray-400">
              Formatos permitidos: PNG, JPG, WEBP (Máximo {maxFiles} fotos — 5MB por archivo)
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default ImageUploader;
