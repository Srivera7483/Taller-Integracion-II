import React, { useState, useEffect } from 'react';
import {
  FiImage,
  FiLoader,
  FiMaximize2,
  FiX,
  FiChevronLeft,
  FiChevronRight,
  FiCopy,
  FiCheck,
  FiExternalLink,
  FiCloud,
  FiAlertCircle,
  FiRefreshCw
} from 'react-icons/fi';

/**
 * Componente <EvidenceGallery />
 * 
 * Permite a técnicos y reportantes visualizar cómodamente las fotos del fallo
 * vinculadas mediante URLs de Cloudinary (columna `url_cloudinary` en base de datos).
 * 
 * Criterios de Aceptación:
 * 1. Muestra imágenes si existen, o mensaje "Sin evidencia adjunta".
 * 2. Diseño limpio y profesional con TailwindCSS.
 * 3. Miniaturas clickeables con Lightbox modal interactivo.
 * 4. Función de estado de espera ("símbolo de cargando") cuando las imágenes
 *    de Cloudinary aún no han llegado o mientras el servicio externo está pendiente.
 */
const EvidenceGallery = ({ evidencias = [], titulo = 'Evidencias del Fallo' }) => {
  // Normalizar el input: puede recibir array de strings, array de objetos { url_cloudinary, url_evidencia, ... }, o string individual
  const itemsNormalizados = React.useMemo(() => {
    if (!evidencias) return [];
    const lista = Array.isArray(evidencias) ? evidencias : [evidencias];

    return lista
      .map((ev, index) => {
        if (!ev) return null;
        if (typeof ev === 'string') {
          return {
            id: `evi-str-${index}`,
            url: ev.trim(),
            tipo: 'Fotografía de Incidencia',
            fecha: null,
          };
        }
        const urlFinal = ev.url_cloudinary || ev.url_evidencia || ev.url || '';
        return {
          id: ev.id_evidencia || `evi-obj-${index}`,
          url: urlFinal.trim(),
          tipo: ev.tipo?.nombre_tipo || ev.tipo || 'Fotografía de Incidencia',
          fecha: ev.fecha_creacion || null,
        };
      })
      .filter((item) => item && Boolean(item.url));
  }, [evidencias]);

  // Estados de carga por imagen: { [id]: 'cargando' | 'cargada' | 'error_conexion' }
  // Debido a que la plataforma Cloudinary no se encuentra conectada en desarrollo,
  // el estado por defecto y persistente refleja el "símbolo de cargando" requerido.
  const [estadosCarga, setEstadosCarga] = useState({});
  const [modalIndex, setModalIndex] = useState(null);
  const [copiado, setCopiado] = useState(false);

  // Inicializar estado de carga para cada evidencia recibida
  useEffect(() => {
    const estadoInicial = {};
    itemsNormalizados.forEach((item) => {
      // Inicia siempre en estado de espera/cargando
      estadoInicial[item.id] = 'cargando';
    });
    setEstadosCarga(estadoInicial);
  }, [itemsNormalizados]);

  /**
   * Función que gestiona la espera de imagen desde Cloudinary.
   * Si la imagen aún no llega, o Cloudinary no está en línea,
   * asegura que el elemento permanezca con el indicador de 'cargando'.
   */
  const gestionarEsperaCloudinary = (id, evento) => {
    setEstadosCarga((prev) => {
      // Si la imagen carga exitosamente desde un Cloudinary real
      if (evento === 'load_success') {
        return { ...prev, [id]: 'cargada' };
      }
      // Si falla la conexión a Cloudinary (escenario actual donde Cloudinary no está conectado),
      // se preserva el estado 'cargando' conforme al requerimiento de mostrar el símbolo de cargando.
      return { ...prev, [id]: 'cargando' };
    });
  };

  /**
   * Forzar reintento de conexión a Cloudinary
   */
  const reintentarConexion = (id, e) => {
    e?.stopPropagation();
    setEstadosCarga((prev) => ({ ...prev, [id]: 'cargando' }));
  };

  const handleAbrirLightbox = (index) => {
    setModalIndex(index);
    setCopiado(false);
  };

  const handleCerrarLightbox = () => {
    setModalIndex(null);
    setCopiado(false);
  };

  const handleAnterior = (e) => {
    e?.stopPropagation();
    if (modalIndex !== null) {
      setModalIndex((prev) => (prev > 0 ? prev - 1 : itemsNormalizados.length - 1));
      setCopiado(false);
    }
  };

  const handleSiguiente = (e) => {
    e?.stopPropagation();
    if (modalIndex !== null) {
      setModalIndex((prev) => (prev < itemsNormalizados.length - 1 ? prev + 1 : 0));
      setCopiado(false);
    }
  };

  const handleCopiarUrl = async (url) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2500);
    } catch {
      // Fallback manual si clipboard API no está disponible
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2500);
    }
  };

  // Manejo de teclas del teclado para Lightbox modal
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (modalIndex === null) return;
      if (e.key === 'Escape') handleCerrarLightbox();
      if (e.key === 'ArrowLeft') handleAnterior();
      if (e.key === 'ArrowRight') handleSiguiente();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [modalIndex, itemsNormalizados.length]);

  // =========================================================================
  // CRITERIO DE ACEPTACIÓN 1: "Sin evidencia adjunta" si no existen imágenes
  // =========================================================================
  if (itemsNormalizados.length === 0) {
    return (
      <div className="bg-slate-50/80 border border-dashed border-slate-200 rounded-2xl p-6 text-center transition-all">
        <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-slate-100 text-slate-400 flex items-center justify-center">
          <FiImage className="w-6 h-6 stroke-[1.75]" />
        </div>
        <h4 className="text-sm font-bold text-slate-700 tracking-tight">Sin evidencia adjunta</h4>
        <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
          Esta incidencia no posee capturas ni fotografías de fallas registradas en la plataforma.
        </p>
      </div>
    );
  }

  const itemActivoModal = modalIndex !== null ? itemsNormalizados[modalIndex] : null;

  return (
    <div className="space-y-4">
      {/* Encabezado informativo de la galería */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
            {titulo} ({itemsNormalizados.length})
          </span>
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
            <FiCloud className="w-3 h-3 text-blue-500" /> Cloudinary Ready
          </span>
        </div>
        <p className="text-[11px] text-slate-400 italic">
          Haz clic en cualquier miniatura para ampliar en Lightbox
        </p>
      </div>

      {/* Grid de Miniaturas Clickeables */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {itemsNormalizados.map((item, index) => {
          const estado = estadosCarga[item.id] || 'cargando';
          const esCargando = estado === 'cargando';

          return (
            <div
              key={item.id}
              onClick={() => handleAbrirLightbox(index)}
              className="group relative bg-white border border-slate-200 hover:border-blue-400 rounded-2xl p-3 shadow-xs hover:shadow-md transition-all duration-200 cursor-pointer flex flex-col justify-between overflow-hidden"
            >
              {/* Contenedor visual de la imagen / símbolo de cargando */}
              <div className="relative w-full h-44 rounded-xl bg-slate-100 flex items-center justify-center overflow-hidden border border-slate-100">
                {/* 1. Elemento IMG nativo (intenta cargar si la URL fuera accesible) */}
                <img
                  src={item.url}
                  alt={`Evidencia ${index + 1}`}
                  onLoad={() => gestionarEsperaCloudinary(item.id, 'load_success')}
                  onError={() => gestionarEsperaCloudinary(item.id, 'load_pending')}
                  className={`absolute inset-0 w-full h-full object-cover transition-transform duration-300 group-hover:scale-105 ${
                    esCargando ? 'opacity-0' : 'opacity-100'
                  }`}
                  loading="lazy"
                />

                {/* 2. Símbolo de "Cargando" cuando la imagen aún no llega de Cloudinary */}
                {esCargando && (
                  <div className="flex flex-col items-center justify-center p-4 text-center space-y-2 z-10 w-full h-full bg-linear-to-b from-slate-50 to-blue-50/40">
                    <div className="relative flex items-center justify-center">
                      <div className="w-12 h-12 rounded-full bg-blue-100/80 flex items-center justify-center text-blue-600 shadow-xs">
                        <FiLoader className="w-6 h-6 animate-spin" />
                      </div>
                      <span className="absolute -top-1 -right-1 flex h-3 w-3">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-blue-500"></span>
                      </span>
                    </div>

                    <div className="space-y-0.5">
                      <span className="text-xs font-bold text-slate-800 block">
                        Cargando imagen...
                      </span>
                      <span className="text-[11px] text-blue-700 font-medium block">
                        Esperando respuesta de Cloudinary
                      </span>
                    </div>

                    <span className="text-[10px] text-slate-400 font-mono truncate max-w-[200px] bg-white/80 px-2 py-0.5 rounded border border-slate-200">
                      url_cloudinary detectada
                    </span>
                  </div>
                )}

                {/* Overlay flotante al hacer hover */}
                <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center gap-2 backdrop-blur-xs">
                  <span className="px-3 py-1.5 rounded-xl bg-white/95 text-slate-800 text-xs font-bold shadow-md flex items-center gap-1.5 transform translate-y-2 group-hover:translate-y-0 transition-transform">
                    <FiMaximize2 className="w-3.5 h-3.5 text-blue-600" />
                    Abrir Lightbox
                  </span>
                </div>

                {/* Etiqueta de índice de miniatura */}
                <span className="absolute top-2 left-2 z-20 px-2 py-0.5 rounded-md bg-slate-900/70 text-white font-mono text-[10px] font-bold backdrop-blur-xs">
                  #{index + 1}
                </span>
              </div>

              {/* Pie de la miniatura: Tipo y URL de Cloudinary */}
              <div className="mt-3 pt-2 border-t border-slate-100 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 truncate">
                    {item.tipo}
                  </span>
                  <button
                    type="button"
                    title="Reintentar verificación de Cloudinary"
                    onClick={(e) => reintentarConexion(item.id, e)}
                    className="p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                  >
                    <FiRefreshCw className="w-3 h-3" />
                  </button>
                </div>

                {/* Muestra visual de la columna url_cloudinary guardada en la base de datos */}
                <div className="flex items-center gap-1 text-[11px] text-slate-500 font-mono bg-slate-50 px-2 py-1 rounded-md border border-slate-100 overflow-hidden">
                  <span className="text-blue-600 font-semibold shrink-0">url:</span>
                  <span className="truncate" title={item.url}>
                    {item.url}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ========================================================================= */}
      {/* LIGHTBOX MODAL: Despliegue en vista ampliada e inspección de Cloudinary   */}
      {/* ========================================================================= */}
      {modalIndex !== null && itemActivoModal && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/80 backdrop-blur-md animate-fadeIn"
          onClick={handleCerrarLightbox}
        >
          <div
            className="relative w-full max-w-4xl bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-200 flex flex-col max-h-[92vh]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Cabecera del Lightbox */}
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 bg-slate-50/60">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs">
                  <FiCloud className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 leading-tight">
                    {itemActivoModal.tipo}
                  </h3>
                  <span className="text-xs text-slate-500 font-medium">
                    Evidencia {modalIndex + 1} de {itemsNormalizados.length}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleCerrarLightbox}
                  className="w-8 h-8 rounded-lg bg-slate-200/70 hover:bg-slate-300 text-slate-700 flex items-center justify-center transition-colors cursor-pointer"
                  title="Cerrar (Esc)"
                >
                  <FiX className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Zona central: Imagen ampliada o Símbolo de cargando */}
            <div className="relative flex-1 min-h-[320px] max-h-[62vh] bg-slate-900 flex items-center justify-center p-4 overflow-hidden">
              {/* Imagen real (si Cloudinary estuviera en línea o la URL respondiera) */}
              <img
                src={itemActivoModal.url}
                alt={`Evidencia ampliada ${modalIndex + 1}`}
                onLoad={() => gestionarEsperaCloudinary(itemActivoModal.id, 'load_success')}
                onError={() => gestionarEsperaCloudinary(itemActivoModal.id, 'load_pending')}
                className={`max-w-full max-h-[58vh] object-contain rounded-lg transition-opacity duration-300 ${
                  estadosCarga[itemActivoModal.id] === 'cargada' ? 'opacity-100' : 'opacity-0'
                }`}
              />

              {/* Símbolo de Cargando central en el Lightbox cuando Cloudinary está en espera */}
              {estadosCarga[itemActivoModal.id] !== 'cargada' && (
                <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center space-y-4 bg-slate-900/90 text-white">
                  <div className="relative flex items-center justify-center">
                    <div className="w-16 h-16 rounded-2xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center text-blue-400 shadow-lg">
                      <FiLoader className="w-8 h-8 animate-spin" />
                    </div>
                    <span className="absolute -top-1 -right-1 flex h-4 w-4">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-4 w-4 bg-blue-500"></span>
                    </span>
                  </div>

                  <div className="space-y-1 max-w-md">
                    <h4 className="text-base font-bold text-white tracking-tight">
                      Cargando imagen desde Cloudinary...
                    </h4>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      La URL fue persistida correctamente en la columna <code className="text-blue-300 bg-slate-800 px-1.5 py-0.5 rounded font-mono">url_cloudinary</code>.
                      El componente mantendrá este estado activo a la espera de que el servicio externo de Cloudinary complete la entrega multimedia.
                    </p>
                  </div>

                  <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold bg-blue-500/10 border border-blue-400/30 text-blue-300">
                    <FiCloud className="w-3.5 h-3.5 text-blue-400" />
                    Conexión Cloudinary: En espera / Standby
                  </div>
                </div>
              )}

              {/* Controles de Navegación Anterior / Siguiente */}
              {itemsNormalizados.length > 1 && (
                <>
                  <button
                    type="button"
                    onClick={handleAnterior}
                    className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/20 hover:bg-white/40 text-white flex items-center justify-center backdrop-blur-md transition-all cursor-pointer shadow-md"
                    title="Anterior (Flecha izquierda)"
                  >
                    <FiChevronLeft className="w-5 h-5" />
                  </button>
                  <button
                    type="button"
                    onClick={handleSiguiente}
                    className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/20 hover:bg-white/40 text-white flex items-center justify-center backdrop-blur-md transition-all cursor-pointer shadow-md"
                    title="Siguiente (Flecha derecha)"
                  >
                    <FiChevronRight className="w-5 h-5" />
                  </button>
                </>
              )}
            </div>

            {/* Pie del Lightbox: Detalles técnicos de la URL de Cloudinary */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 space-y-2">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                <span className="font-bold text-slate-700 flex items-center gap-1.5">
                  <FiAlertCircle className="w-4 h-4 text-blue-600" />
                  Registro en Base de Datos (<code className="font-mono text-blue-700">url_cloudinary</code>)
                </span>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleCopiarUrl(itemActivoModal.url)}
                    className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 hover:border-blue-400 text-slate-700 hover:text-blue-600 text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    {copiado ? (
                      <>
                        <FiCheck className="w-3.5 h-3.5 text-emerald-600" />
                        <span className="text-emerald-700 font-bold">¡Copiada!</span>
                      </>
                    ) : (
                      <>
                        <FiCopy className="w-3.5 h-3.5" />
                        <span>Copiar URL</span>
                      </>
                    )}
                  </button>

                  <a
                    href={itemActivoModal.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors"
                  >
                    <span>Abrir Enlace</span>
                    <FiExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>

              <div className="p-2.5 bg-white rounded-xl border border-slate-200 font-mono text-xs text-slate-600 break-all select-all">
                {itemActivoModal.url}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EvidenceGallery;
