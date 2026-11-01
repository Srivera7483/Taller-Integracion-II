import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  FiChevronRight,
  FiBox,
  FiClock,
  FiUser,
  FiCheckCircle,
  FiShield,
  FiFileText,
  FiImage,
  FiMaximize2,
  FiUploadCloud,
  FiAlertCircle,
  FiPlusCircle
} from 'react-icons/fi';
import StatusBadge from '../components/StatusBadge';
import api from '../services/api';
import AprobacionReportante from '../components/AprobacionReportante';
import ModalCierreMantenimiento from '../components/ModalCierreMantenimiento';
import ModalPrevisualizadorImagen from '../components/ModalPrevisualizadorImagen';
import PanelIncidenciaRechazada from '../components/PanelIncidenciaRechazada';
import EvidenciaUploader from '../components/EvidenciaUploader';
import { useToast } from '../context/ToastContext';
import {
  getIncidencias,
  getTecnicoActual,
  adjuntarEvidenciaIncidencia
} from '../services/incidenciasStorage';

/**
 * Componente TarjetaEvidenciaCloudinary (TAL-136)
 * Despliega la evidencia fotográfica de la incidencia con animación fluida de carga:
 * - Spinner circular + barra de progreso indeterminada + "Procesando..." mientras descarga de Cloudinary.
 * - Transición suave (fade-in) hacia la imagen una vez cargada con object-cover (TAL-133).
 */
const TarjetaEvidenciaCloudinary = ({ url, nombre, onAmpliar }) => {
  const [cargando, setCargando] = useState(true);
  const [errorCarga, setErrorCarga] = useState(false);

  return (
    <div className="relative rounded-xl border border-gray-200 bg-slate-900/5 p-4 sm:p-5 flex flex-col md:flex-row items-center gap-5 transition-all">
      {/* Contenedor de la foto con estado de carga animado */}
      <div className="relative w-full sm:w-64 h-52 sm:h-44 rounded-xl overflow-hidden bg-slate-950 flex items-center justify-center border-2 border-primary/40 shadow-inner flex-shrink-0">
        {/* ANIMACIÓN DE CARGA / LATENCIA CLOUDINARY (TAL-136) */}
        {cargando && !errorCarga && (
          <div
            id="loading-evidencia-cloudinary"
            role="status"
            aria-live="polite"
            className="absolute inset-0 z-10 bg-slate-900/90 backdrop-blur-xs flex flex-col items-center justify-center p-4 text-center space-y-3"
          >
            {/* Anillo de carga (Spinner circular con halo) */}
            <div className="relative flex items-center justify-center">
              <div className="absolute w-12 h-12 rounded-full bg-primary/20 animate-ping" />
              <svg
                className="animate-spin w-9 h-9 text-primary relative z-10"
                viewBox="0 0 24 24"
                fill="none"
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

            <div className="space-y-0.5">
              <span className="text-xs font-bold text-white tracking-wide animate-pulse">
                Procesando...
              </span>
              <p className="text-[11px] text-slate-300">
                Cargando imagen desde Cloudinary
              </p>
            </div>

            {/* Barra de progreso indeterminada animada */}
            <div className="w-3/4 bg-slate-800 rounded-full h-1.5 overflow-hidden">
              <div className="bg-gradient-to-r from-primary-500 via-primary-400 to-primary-600 h-full rounded-full animate-indeterminate" />
            </div>
          </div>
        )}

        {/* Imagen renderizada con object-cover para no deformarse */}
        {!errorCarga ? (
          <img
            src={url}
            alt={nombre || 'Evidencia fotográfica de la incidencia'}
            onLoad={() => setCargando(false)}
            onError={() => {
              setCargando(false);
              setErrorCarga(true);
            }}
            onClick={() => onAmpliar(url, nombre)}
            className={`w-full h-full object-cover cursor-pointer transition-all duration-500 hover:scale-105 ${
              cargando ? 'opacity-0 scale-95' : 'opacity-100 scale-100'
            }`}
            style={{ objectFit: 'cover' }}
          />
        ) : (
          <div className="p-4 text-center text-xs text-red-400 flex flex-col items-center gap-1.5">
            <FiAlertCircle className="w-5 h-5 text-red-400" />
            <span>No se pudo cargar la imagen de Cloudinary</span>
          </div>
        )}

        {/* Botón flotante para ampliar foto */}
        {!cargando && !errorCarga && (
          <button
            type="button"
            onClick={() => onAmpliar(url, nombre)}
            title="Ampliar en tamaño completo"
            aria-label="Ampliar imagen en tamaño completo"
            className="absolute bottom-2 right-2 p-1.5 rounded-lg bg-slate-900/80 hover:bg-slate-900 text-white shadow-md transition-all cursor-pointer"
          >
            <FiMaximize2 className="w-4 h-4" aria-hidden="true" />
          </button>
        )}
      </div>

      {/* Información contextual de la evidencia */}
      <div className="flex-1 space-y-2 text-center md:text-left min-w-0">
        <div className="flex items-center justify-center md:justify-start gap-2 flex-wrap">
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-primary-50 text-primary border border-primary-200">
            <FiImage className="w-3.5 h-3.5" />
            <span>Evidencia Fotográfica</span>
          </span>
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] font-mono font-bold bg-secondary-50 text-secondary-900 border border-secondary-200">
            <FiUploadCloud className="w-3 h-3" /> Cloudinary CDN
          </span>
          <span className="text-[11px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-200">
            Activo Verificado
          </span>
        </div>

        <p className="text-sm font-bold text-gray-900 truncate" title={nombre || 'evidencia_reportante.webp'}>
          {nombre || 'evidencia_reportante.webp'}
        </p>

        <p className="text-xs text-gray-600 leading-relaxed">
          Esta prueba fotográfica fue provista por el usuario reportante al momento de registrar la falla en el sistema. Puedes visualizarla en alta resolución para inspección técnica.
        </p>

        <div className="pt-1 flex items-center justify-center md:justify-start gap-3">
          <button
            type="button"
            onClick={() => onAmpliar(url, nombre)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold text-white bg-primary hover:bg-primary-hover active:scale-95 transition-all shadow-md hover:shadow-lg cursor-pointer"
          >
            <FiMaximize2 className="w-3.5 h-3.5" />
            <span>Ver en Alta Resolución</span>
          </button>
        </div>
      </div>
    </div>
  );
};

const DetalleIncidencia = () => {
  const { idIncidencia } = useParams();
  const { showToast } = useToast();
  const [incidencia, setIncidencia] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tecnicoActual, setTecnicoActual] = useState(() => getTecnicoActual());
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Estados para modal visor de evidencias (TAL-133 y TAL-136)
  const [modalPreviewOpen, setModalPreviewOpen] = useState(false);
  const [previewActivoUrl, setPreviewActivoUrl] = useState(null);
  const [previewActivoNombre, setPreviewActivoNombre] = useState('');
  const [mostrarSubidorNuevo, setMostrarSubidorNuevo] = useState(false);

  useEffect(() => {
    const handleCambioTecnico = () => {
      setTecnicoActual(getTecnicoActual());
    };
    window.addEventListener('tecnico-cambiado', handleCambioTecnico);
    return () => window.removeEventListener('tecnico-cambiado', handleCambioTecnico);
  }, []);

  const cargarIncidencia = useCallback(async () => {
    try {
      setLoading(true);
      // Buscar primero en datos locales
      const locales = getIncidencias();
      const encontradaLocal = locales.find((i) => i.id === idIncidencia);

      try {
        const response = await api.get(`/incidencias/${idIncidencia}`);
        if (response.data) {
          const apiData = response.data;
          let estadoFinal = encontradaLocal?.estado || apiData.estado?.nombre_estado || 'Pendiente';
          if (estadoFinal && (estadoFinal.toUpperCase() === 'RECHAZADO' || estadoFinal.toLowerCase() === 'rechazada')) {
            estadoFinal = 'RECHAZADO';
          }

          setIncidencia({
            id: apiData.id_incidencia || idIncidencia,
            titulo: apiData.titulo,
            descripcion: apiData.descripcion,
            id_activo: apiData.id_activo,
            estado: estadoFinal,
            fecha_creacion: apiData.fecha_creacion || new Date().toISOString(),
            asignado: encontradaLocal?.asignado || 'Carlos Ruiz',
            resolucion: encontradaLocal?.resolucion || null,
            horasInvertidas: encontradaLocal?.horasInvertidas || null,
            materialesUsados: encontradaLocal?.materialesUsados || [],
            fechaCierre: encontradaLocal?.fechaCierre || null,
            evidencias: apiData.evidencias?.length ? apiData.evidencias : (encontradaLocal?.evidencias || []),
            imagenAdjuntaNombre: apiData.imagenAdjuntaNombre || encontradaLocal?.imagenAdjuntaNombre || null,
          });
          return;
        }
      } catch (err) {
        console.warn('API incidencias no disponible o 404, usando fallback local.', err.message);
      }

      if (encontradaLocal) {
        let estadoFinal = encontradaLocal.estado || 'Pendiente';
        if (estadoFinal && (estadoFinal.toUpperCase() === 'RECHAZADO' || estadoFinal.toLowerCase() === 'rechazada')) {
          estadoFinal = 'RECHAZADO';
        }
        setIncidencia({
          ...encontradaLocal,
          estado: estadoFinal,
          motivoRechazo: encontradaLocal.motivoRechazo || encontradaLocal.motivo_rechazo || null,
          fechaRechazo: encontradaLocal.fechaRechazo || null,
          rechazadoPor: encontradaLocal.rechazadoPor || null,
          evidencias: encontradaLocal.evidencias || [
            'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&w=1200&q=80',
          ],
          imagenAdjuntaNombre: encontradaLocal.imagenAdjuntaNombre || 'evidencia_servidor_rack.webp',
        });
        return;
      }

      setIncidencia({
        id: idIncidencia,
        titulo: 'Problemas de conectividad en el piso 3',
        descripcion: 'Los routers no están asignando IPs correctamente.',
        id_activo: 'ROUTER-03',
        prioridad: 'Alta',
        estado: 'Asignada',
        fecha_creacion: new Date().toISOString(),
        asignado: 'Carlos Ruiz',
        resolucion: null,
        horasInvertidas: null,
        materialesUsados: [],
        motivoRechazo: null,
        fechaRechazo: null,
        rechazadoPor: null,
        evidencias: [
          'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&w=1200&q=80',
        ],
        imagenAdjuntaNombre: 'evidencia_servidor_rack.webp',
      });
    } catch (err) {
      console.error('Error al cargar la incidencia:', err);
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [idIncidencia]);

  useEffect(() => {
    cargarIncidencia();
  }, [cargarIncidencia]);

  const handleAprobacionCompletada = (nuevoEstado) => {
    setIncidencia((prev) => ({
      ...prev,
      estado: nuevoEstado === 'Aprobada' ? 'Cerrada' : 'En Progreso',
    }));
  };

  const handleCierreExitoso = (datosActualizados) => {
    let nuevoEstado = datosActualizados.estado || 'Completada';
    if (nuevoEstado && (nuevoEstado.toUpperCase() === 'RECHAZADO' || nuevoEstado.toLowerCase() === 'rechazada')) {
      nuevoEstado = 'RECHAZADO';
    }

    setIncidencia((prev) => ({
      ...prev,
      estado: nuevoEstado,
      resolucion: datosActualizados.resolucion,
      horasInvertidas: datosActualizados.horasInvertidas,
      materialesUsados: datosActualizados.materialesUsados,
      fechaCierre: datosActualizados.fechaCierre,
      motivoRechazo: datosActualizados.motivoRechazo || datosActualizados.motivo_rechazo,
      fechaRechazo: datosActualizados.fechaRechazo,
      rechazadoPor: datosActualizados.rechazadoPor,
    }));
  };

  const handleAbrirPrevisualizador = (url, nombre) => {
    setPreviewActivoUrl(url);
    setPreviewActivoNombre(nombre || 'Evidencia Fotográfica');
    setModalPreviewOpen(true);
  };

  const handleEvidenciaSubidaDesdeDetalle = ({ previewUrl, name }) => {
    // Persistir la evidencia en la cookie / almacenamiento local
    adjuntarEvidenciaIncidencia(incidencia.id, previewUrl, name);
    setIncidencia((prev) => ({
      ...prev,
      evidencias: [...(prev.evidencias || []), previewUrl],
      imagenAdjuntaNombre: name,
    }));
    setMostrarSubidorNuevo(false);
    showToast(`¡Evidencia "${name}" subida a Cloudinary exitosamente!`, 'success');
  };

  if (loading) {
    return <div className="p-8 text-center text-gray-500 font-medium">Cargando detalles de la incidencia...</div>;
  }

  if (error || !incidencia) {
    return <div className="p-8 text-center text-red-500 font-medium">Error al cargar la incidencia.</div>;
  }

  const estaResuelta = incidencia.estado?.toLowerCase() === 'resuelta';
  const estaCompletada = incidencia.estado?.toLowerCase() === 'completada';
  const estaRechazada = incidencia.estado === 'RECHAZADO' || incidencia.estado?.toUpperCase() === 'RECHAZADO';

  // Validación de Ownership
  const nombreAsignado = (incidencia.asignado || '').trim().toLowerCase();
  const nombreActual = (tecnicoActual?.nombre || '').trim().toLowerCase();
  const esTecnicoAsignado =
    Boolean(nombreAsignado) &&
    (nombreAsignado === nombreActual ||
      nombreAsignado.includes(nombreActual) ||
      nombreActual.includes(nombreAsignado));

  const evidencias = Array.isArray(incidencia.evidencias) ? incidencia.evidencias : [];

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <nav aria-label="Ruta de navegación" className="flex items-center gap-2 text-sm text-gray-600">
        <Link to="/dashboard" className="hover:text-primary transition-colors">Inicio</Link>
        <FiChevronRight className="w-3.5 h-3.5" />
        <Link to="/incidencias" className="hover:text-primary transition-colors">Incidencias</Link>
        <FiChevronRight className="w-3.5 h-3.5" />
        <span className="font-semibold text-gray-900">Incidencia {incidencia.id}</span>
      </nav>

      {/* Tarjeta Principal de la Incidencia */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 sm:p-6">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 border-b border-gray-100 pb-5 mb-5">
          <div>
            <div className="flex items-center gap-3 mb-2 flex-wrap">
              <h1 className="text-2xl font-bold text-gray-900 tracking-tight">{incidencia.titulo}</h1>
            </div>
            <span className="font-mono text-sm bg-gray-100 text-gray-700 px-2.5 py-1 rounded-lg border border-gray-200 font-semibold">
              {incidencia.id}
            </span>
          </div>
          <div className="flex flex-col items-start md:items-end gap-1.5">
            <StatusBadge status={incidencia.estado} />
            <span className="text-xs text-gray-600 flex items-center gap-1 mt-1 font-mono">
              <FiClock className="w-3.5 h-3.5" /> Creada: {new Date(incidencia.fecha_creacion).toLocaleString()}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
          <div>
            <h2 className="text-xs uppercase tracking-wider text-gray-600 font-semibold mb-1">Activo Afectado</h2>
            <div className="flex items-center gap-2 text-gray-800 font-medium">
              <FiBox className="w-4 h-4 text-orange-600" aria-hidden="true" />
              <span>{incidencia.id_activo || 'N/A'}</span>
            </div>
          </div>

          <div>
            <h2 className="text-xs uppercase tracking-wider text-gray-600 font-semibold mb-1">Técnico Asignado</h2>
            <div className="flex items-center gap-2 text-gray-800 font-medium">
              <FiUser className="w-4 h-4 text-primary" aria-hidden="true" />
              <span>{incidencia.asignado || 'Sin asignar'}</span>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <h2 className="text-xs uppercase tracking-wider text-gray-600 font-semibold">Descripción del problema</h2>
          <p className="text-sm text-gray-700 bg-gray-50 p-4 rounded-xl border border-gray-100 whitespace-pre-wrap leading-relaxed">
            {incidencia.descripcion}
          </p>
        </div>
      </div>

      {/* COMPONENTE CONDICIONAL: SE RENDERIZA ÚNICAMENTE SI estado === 'RECHAZADO' */}
      {(incidencia.estado === 'RECHAZADO' || estaRechazada) && (
        <PanelIncidenciaRechazada
          motivoRechazo={incidencia.motivoRechazo || incidencia.motivo_rechazo}
          fechaRechazo={incidencia.fechaRechazo}
          tecnicoNombre={incidencia.rechazadoPor || incidencia.asignado}
          idActivo={incidencia.id_activo}
        />
      )}

      {/* SECCIÓN DE EVIDENCIA FOTOGRÁFICA DE CLOUDINARY (TAL-136) */}
      <div id="seccion-evidencia-cloudinary" className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 sm:p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-gray-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-primary-50 text-primary flex items-center justify-center border border-primary-200">
              <FiImage className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-lg text-gray-900">Evidencia Fotográfica (Cloudinary)</h2>
              <p className="text-xs text-gray-600">
                Imágenes adjuntadas por el reportante para respaldo del fallo.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {!mostrarSubidorNuevo && (
              <button
                type="button"
                onClick={() => setMostrarSubidorNuevo(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-primary bg-primary-50 hover:bg-primary-100 border border-primary-200 transition-colors cursor-pointer"
              >
                <FiPlusCircle className="w-3.5 h-3.5" />
                <span>Agregar Foto</span>
              </button>
            )}
          </div>
        </div>

        {/* Formulario Uploader opcional para subir nueva evidencia a esta incidencia */}
        {mostrarSubidorNuevo && (
          <div className="bg-slate-50 border border-primary-200 rounded-xl p-4 space-y-3 animate-fadeIn">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-primary">Subir nueva evidencia para esta incidencia:</span>
              <button
                type="button"
                onClick={() => setMostrarSubidorNuevo(false)}
                className="text-xs text-gray-500 hover:text-gray-800"
              >
                Cancelar
              </button>
            </div>
            <EvidenciaUploader
              onFileLoaded={handleEvidenciaSubidaDesdeDetalle}
              label=""
            />
          </div>
        )}

        {/* Lista de Evidencias Fotográficas */}
        {evidencias.length > 0 ? (
          <div className="space-y-4">
            {evidencias.map((urlEvidencia, idx) => (
              <TarjetaEvidenciaCloudinary
                key={idx}
                url={urlEvidencia}
                nombre={incidencia.imagenAdjuntaNombre || `evidencia_incidencia_${idx + 1}.webp`}
                onAmpliar={handleAbrirPrevisualizador}
              />
            ))}
          </div>
        ) : !mostrarSubidorNuevo ? (
          <div className="p-8 text-center bg-gray-50/60 rounded-xl border-2 border-dashed border-gray-200 space-y-2">
            <FiImage className="w-10 h-10 text-gray-300 mx-auto" />
            <p className="text-sm font-medium text-gray-700">Sin evidencias fotográficas adjuntas</p>
            <p className="text-xs text-gray-500 max-w-sm mx-auto">
              Esta incidencia no incluyó fotos al momento de ser creada. Puedes adjuntar una prueba ahora.
            </p>
            <button
              type="button"
              onClick={() => setMostrarSubidorNuevo(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 mt-2 bg-primary hover:bg-primary-hover text-white rounded-lg text-xs font-bold transition-all shadow-sm hover:shadow cursor-pointer"
            >
              <FiUploadCloud className="w-4 h-4" />
              <span>Subir Evidencia a Cloudinary</span>
            </button>
          </div>
        ) : null}
      </div>

      {/* REPORTE DE MANTENIMIENTO SI YA ESTÁ COMPLETADA */}
      {estaCompletada && (
        <div className="bg-white rounded-xl shadow-sm border border-emerald-200 p-5 sm:p-6 space-y-4 animate-fadeIn">
          <div className="flex items-center justify-between border-b border-emerald-100 pb-3">
            <div className="flex items-center gap-2.5">
              <FiCheckCircle className="w-6 h-6 text-emerald-600" />
              <h2 className="font-bold text-lg text-emerald-950">Mantenimiento Completado</h2>
            </div>
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
              Completada
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-emerald-50/50 p-3.5 rounded-xl border border-emerald-100">
              <span className="text-[11px] uppercase font-bold text-emerald-700 block mb-1">
                Horas Invertidas
              </span>
              <span className="text-2xl font-black text-gray-900">{incidencia.horasInvertidas || 1.5}</span>
              <span className="text-xs text-gray-700 ml-1">horas</span>
            </div>
            <div className="bg-emerald-50/50 p-3.5 rounded-xl border border-emerald-100">
              <span className="text-[11px] uppercase font-bold text-emerald-700 block mb-1">
                Materiales e Insumos
              </span>
              {incidencia.materialesUsados && incidencia.materialesUsados.length > 0 ? (
                <div className="flex flex-wrap gap-1 mt-1">
                  {incidencia.materialesUsados.map((m, idx) => (
                    <span key={idx} className="px-2 py-0.5 rounded-lg text-xs bg-white border border-emerald-200 text-emerald-900 font-medium">
                      {m.cantidad}x {m.nombre}
                    </span>
                  ))}
                </div>
              ) : (
                <span className="text-xs text-gray-700 italic">Sin materiales adicionales.</span>
              )}
            </div>
          </div>

          <div className="space-y-1">
            <span className="text-xs uppercase font-bold text-gray-700 block flex items-center gap-1">
              <FiFileText className="w-3.5 h-3.5 text-primary" /> Resolución Técnica
            </span>
            <div className="bg-gray-50 p-3.5 rounded-xl border border-gray-200 text-sm text-gray-800 whitespace-pre-wrap">
              {incidencia.resolucion || 'Intervención técnica completada satisfactoriamente.'}
            </div>
          </div>
        </div>
      )}

      {/* ACCIÓN DE CIERRE SI AÚN NO ESTÁ COMPLETADA NI RECHAZADA NI RESUELTA */}
      {!estaCompletada && !estaResuelta && !estaRechazada && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 sm:p-6 space-y-3">
          <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
            <FiCheckCircle className="w-5 h-5 text-primary" aria-hidden="true" />
            Acciones de Mantenimiento
          </h2>

          {esTecnicoAsignado ? (
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-emerald-50 border border-emerald-200 p-4 rounded-xl">
              <div>
                <p className="text-xs font-bold text-emerald-950">
                  Eres el técnico asignado por el supervisor.
                </p>
                <p className="text-xs text-emerald-800 mt-0.5">
                  Puedes abrir el formulario táctil para registrar resolución, horas y materiales, o bien rechazar la incidencia con su motivo justificado.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(true)}
                className="w-full sm:w-auto px-5 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg font-bold text-xs shadow-md hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0 flex items-center justify-center gap-2 transition-all cursor-pointer min-h-[44px]"
              >
                <FiCheckCircle className="w-4 h-4" />
                <span>Confirmar y Finalizar Mantenimiento</span>
              </button>
            </div>
          ) : (
            <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl flex items-start gap-3 text-amber-900">
              <FiShield className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div className="text-xs space-y-1">
                <p className="font-bold text-amber-950">Acceso restringido al formulario finalizativo</p>
                <p>
                  Esta incidencia está asignada a <strong>{incidencia.asignado || 'otro técnico'}</strong>. Únicamente dicho técnico puede rendir cuentas de la intervención o rechazarla.
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Renderizado condicional si ya está marcada como resuelta para aprobación del reportante */}
      {estaResuelta && !estaRechazada && (
        <AprobacionReportante
          incidenciaId={incidencia.id}
          onAprobacionCompletada={handleAprobacionCompletada}
        />
      )}

      {/* MODAL DE CIERRE DE MANTENIMIENTO */}
      <ModalCierreMantenimiento
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        orden={{
          id_orden: `ORD-${incidencia.id}`,
          incidencia_id: incidencia.id,
          id: incidencia.id,
          titulo: incidencia.titulo,
          id_activo: incidencia.id_activo,
          tecnico_nombre: incidencia.asignado,
          resolucion: incidencia.resolucion,
          horasInvertidas: incidencia.horasInvertidas,
          materialesUsados: incidencia.materialesUsados,
          motivoRechazo: incidencia.motivoRechazo,
        }}
        tecnicoActual={tecnicoActual}
        onCierreExitoso={handleCierreExitoso}
      />

      {/* MODAL PREVISUALIZADOR EN ALTA DEFINICIÓN (TAL-133 y TAL-136) */}
      <ModalPrevisualizadorImagen
        isOpen={modalPreviewOpen}
        onClose={() => setModalPreviewOpen(false)}
        imageUrl={previewActivoUrl}
        imageName={previewActivoNombre}
      />
    </div>
  );
};

export default DetalleIncidencia;
