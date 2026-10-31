import React, { useEffect, useRef } from 'react';
import {
  FiX,
  FiTrash2,
  FiRefreshCw,
  FiImage,
  FiUploadCloud,
  FiAlertCircle
} from 'react-icons/fi';

/**
 * ModalPrevisualizadorImagen
 * Cumple con los requerimientos de la tarea TAL-133:
 * - Muestra la imagen adjunta en tamaño grande dentro de un Modal.
 * - Incluye un botón superpuesto de "Eliminar/Cambiar imagen" sobre el área de visualización.
 * - Permite limpiar la selección antes de realizar el POST definitivo (Criterio de Aceptación b).
 */
const ModalPrevisualizadorImagen = ({
  isOpen,
  onClose,
  imageUrl,
  imageName,
  imageSize,
  onLimpiarImagen,
  onCambiarImagen,
}) => {
  const modalRef = useRef(null);

  // Manejador de teclado para cerrar con tecla Escape
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Si no está abierto o no hay URL, no renderizar nada
  if (!isOpen || !imageUrl) return null;

  const formatearTamano = (bytes) => {
    if (!bytes || typeof bytes !== 'number') return null;
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const tamanoTexto = formatearTamano(imageSize);

  return (
    <div
      id="modal-previsualizador-overlay"
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 md:p-6 animate-fadeIn"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-preview-title"
    >
      <div
        ref={modalRef}
        id="modal-previsualizador-contenedor"
        className="relative bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col w-full max-w-4xl max-h-[92vh] transform transition-all text-slate-100"
      >
        {/* Cabecera del Modal */}
        <div className="bg-slate-800/90 border-b border-slate-700/70 px-4 sm:px-6 py-3.5 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center flex-shrink-0 border border-blue-500/30">
              <FiImage className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 id="modal-preview-title" className="text-sm sm:text-base font-bold text-white truncate">
                  {imageName || 'Evidencia Fotográfica Adjunta'}
                </h3>
                <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-blue-500/10 text-blue-300 border border-blue-500/20">
                  <FiUploadCloud className="w-3 h-3" /> Previsualización S3
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-2">
                <span>Estado: Listo para subir</span>
                {tamanoTexto && (
                  <>
                    <span>•</span>
                    <span className="font-mono text-slate-300">{tamanoTexto}</span>
                  </>
                )}
              </p>
            </div>
          </div>

          <button
            type="button"
            id="btn-cerrar-modal-preview"
            onClick={onClose}
            aria-label="Cerrar previsualizador"
            className="w-8 h-8 rounded-lg bg-slate-700/60 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
            title="Cerrar modal (Esc)"
          >
            <FiX className="w-5 h-5" />
          </button>
        </div>

        {/* Contenedor Principal de la Imagen Grande */}
        <div className="relative flex-1 bg-slate-950/95 flex items-center justify-center p-3 sm:p-6 min-h-[300px] max-h-[72vh] overflow-hidden">
          <img
            id="imagen-grande-previsualizador"
            src={imageUrl}
            alt={imageName || 'Imagen ampliada de la evidencia'}
            className="max-h-[65vh] w-auto max-w-full rounded-xl object-contain shadow-2xl select-none"
          />

          {/* BOTÓN SUPERPUESTO DE "Eliminar/Cambiar imagen" (Requerimiento estricto) */}
          {(onCambiarImagen || onLimpiarImagen) && (
            <div
              id="contenedor-botones-superpuestos"
              className="absolute bottom-4 right-4 sm:bottom-6 sm:right-6 z-20"
            >
              <div className="bg-slate-900/90 backdrop-blur-md p-1.5 sm:p-2 rounded-2xl border border-slate-700/80 shadow-2xl flex flex-wrap items-center gap-2">
                {/* Botón principal superpuesto que identifica explícitamente la acción requerida */}
                {onCambiarImagen && (
                  <button
                    type="button"
                    id="btn-eliminar-cambiar-imagen"
                    onClick={onCambiarImagen}
                    className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold bg-blue-600 hover:bg-blue-500 text-white shadow-md transition-all cursor-pointer"
                    title="Cambiar por otra foto o seleccionar una nueva imagen"
                  >
                    <FiRefreshCw className="w-4 h-4" />
                    <span>Eliminar/Cambiar imagen</span>
                  </button>
                )}

                {/* Botón directo para limpiar la selección antes del POST final (Criterio de Aceptación b) */}
                {onLimpiarImagen && (
                  <button
                    type="button"
                    id="btn-superpuesto-limpiar-imagen"
                    onClick={onLimpiarImagen}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold bg-red-600/90 hover:bg-red-600 text-white shadow-md transition-all cursor-pointer"
                    title="Limpiar y remover esta imagen del formulario"
                  >
                    <FiTrash2 className="w-4 h-4 text-red-100" />
                    <span>Limpiar selección</span>
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Barra inferior informativa */}
        <div className="bg-slate-800/80 border-t border-slate-700/70 px-4 sm:px-6 py-2.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs text-slate-400 flex-shrink-0">
          <div className="flex items-center gap-1.5">
            <FiAlertCircle className="w-4 h-4 text-amber-400 flex-shrink-0" />
            <span>
              Verifica que la foto sea nítida y muestre claramente la falla antes de enviar el reporte.
            </span>
          </div>

          <div className="flex items-center gap-3">
            {onLimpiarImagen && (
              <>
                <button
                  type="button"
                  onClick={onLimpiarImagen}
                  className="text-red-400 hover:text-red-300 underline font-medium cursor-pointer"
                >
                  Descartar foto
                </button>
                <span>•</span>
              </>
            )}
            <button
              type="button"
              onClick={onClose}
              className="text-slate-300 hover:text-white font-medium cursor-pointer"
            >
              Cerrar visor
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ModalPrevisualizadorImagen;
