import React, { useState, useEffect } from 'react';
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
  FiUploadCloud,
  FiMaximize2,
  FiAlertCircle,
  FiPlusCircle
} from 'react-icons/fi';
import StatusBadge from '../components/StatusBadge';
import api from '../services/api';
import ModalCierreMantenimiento from '../components/ModalCierreMantenimiento';
import EvidenciaUploader from '../components/EvidenciaUploader';
import { useToast } from '../context/ToastContext';
import { getUsuarioActual, hasPermission } from '../services/authService';

const getPriorityBadgeClass = (prioridad) => {
  const p = (
    typeof prioridad === 'string'
      ? prioridad
      : prioridad?.nombre_prioridad || prioridad?.nombre || ''
  ).toLowerCase();
  if (p === 'critica' || p === 'crítica') return 'bg-purple-100 text-purple-800 border-purple-300';
  if (p === 'alta') return 'bg-red-100 text-red-800 border-red-300';
  if (p === 'media') return 'bg-amber-100 text-amber-800 border-amber-300';
  return 'bg-emerald-100 text-emerald-800 border-emerald-300';
};

/**
 * Componente TarjetaEvidenciaCloudinary (TAL-136)
 * Despliega la evidencia fotográfica de la incidencia con animación fluida de carga.
 */
const TarjetaEvidenciaCloudinary = ({ url, nombre, onAmpliar }) => {
  const [cargando, setCargando] = useState(true);
  const [errorCarga, setErrorCarga] = useState(false);

  return (
    <div className="relative rounded-xl border border-gray-200 bg-slate-900/5 p-4 sm:p-5 flex flex-col md:flex-row items-center gap-5 transition-all">
      <div className="relative w-full sm:w-64 h-52 sm:h-44 rounded-xl overflow-hidden bg-slate-950 flex items-center justify-center border-2 border-primary/40 shadow-inner flex-shrink-0">
        {cargando && !errorCarga && (
          <div
            id="loading-evidencia-cloudinary"
            role="status"
            aria-live="polite"
            className="absolute inset-0 z-10 bg-slate-900/90 backdrop-blur-xs flex flex-col items-center justify-center p-4 text-center space-y-3"
          >
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
            <div className="w-3/4 bg-slate-800 rounded-full h-1.5 overflow-hidden">
              <div className="bg-gradient-to-r from-primary-500 via-primary-400 to-primary-600 h-full rounded-full animate-indeterminate" />
            </div>
          </div>
        )}

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
            className={`w-full h-full object-cover cursor-pointer transition-all duration-500 hover:scale-105 ${cargando ? 'opacity-0 scale-95' : 'opacity-100 scale-100'
              }`}
          />
        ) : (
          <div className="p-4 text-center text-xs text-red-400 flex flex-col items-center gap-1.5">
            <FiAlertCircle className="w-5 h-5 text-red-400" />
            <span>No se pudo cargar la imagen de Cloudinary</span>
          </div>
        )}

        {!cargando && !errorCarga && (
          <button
            type="button"
            onClick={() => onAmpliar(url, nombre)}
            title="Ampliar en tamaño completo"
            aria-label="Ampliar imagen"
            className="absolute bottom-2 right-2 p-1.5 rounded-lg bg-slate-900/80 hover:bg-slate-900 text-white shadow-md transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <FiMaximize2 className="w-4 h-4" aria-hidden="true" />
          </button>
        )}
      </div>

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
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold text-white bg-primary hover:bg-primary-hover active:scale-95 transition-all shadow-md hover:shadow-lg cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
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
  const [actualizandoPrioridad, setActualizandoPrioridad] = useState(false);
  const [resolviendo, setResolviendo] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [mostrarSubidorNuevo, setMostrarSubidorNuevo] = useState(false);
  const [imagenModal, setImagenModal] = useState({ url: null, nombre: null });

  const usuario = getUsuarioActual();
  const puedeClasificar = hasPermission(
    'incidencias:clasificar_prioridad');
  const puedeResolver = hasPermission(
    'incidencias:resolver');

  const cargarIncidencia = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/incidencias/${idIncidencia}`);
      if (response.data) {
        const apiData = response.data;
        const ordenAsociada = Array.isArray(apiData.ordenes_trabajo)
          ? apiData.ordenes_trabajo[0]
          : null;

        setIncidencia({
          id: apiData.id_incidencia || idIncidencia,
          titulo: apiData.titulo,
          descripcion: apiData.descripcion,
          id_activo: apiData.id_activo,
          prioridad: apiData.prioridad || apiData.prioridad_relativa || 'Media',
          prioridad_relativa: apiData.prioridad_relativa,
          estado:
            typeof apiData.estado === 'string'
              ? apiData.estado
              : apiData.estado?.nombre_estado || 'Pendiente',
          fecha_creacion: apiData.fecha_creacion || new Date().toISOString(),
          asignado:
            ordenAsociada?.tecnico_nombre ||
            apiData.tecnico_asignado ||
            apiData.asignado ||
            'Sin asignar',
          id_orden: ordenAsociada?.id_orden || null,
          resolucion:
            ordenAsociada?.diagnostico_tecnico ||
            apiData.resolucion ||
            null,
          horasInvertidas: null,
          materialesUsados: [],
          fechaCierre: ordenAsociada?.fecha_cierre || null,
          evidencias: apiData.evidencias || [],
        });
        setLoading(false);
        return;
      }
    } catch (err) {
      console.error('Error al cargar la incidencia desde PostgreSQL:', err);
      setError(err);
      showToast('Error al conectar con la base de datos de incidencias', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarIncidencia();
  }, [idIncidencia]);

  const handleCambiarPrioridad = async (nuevaPrioridad) => {
    try {
      setActualizandoPrioridad(true);
      await api.patch(`/incidencias/${idIncidencia}/prioridad`, {
        prioridad: nuevaPrioridad,
      });
      setIncidencia((prev) => ({
        ...prev,
        prioridad: nuevaPrioridad,
      }));
      showToast(`Prioridad actualizada a ${nuevaPrioridad} en PostgreSQL`, 'success');
    } catch (err) {
      showToast(
        err.response?.data?.mensaje || 'Error al clasificar prioridad',
        'error',
      );
    } finally {
      setActualizandoPrioridad(false);
    }
  };

  const handleResolverDirecto = async () => {
    try {
      setResolviendo(true);
      await api.patch(`/incidencias/${idIncidencia}/resolver`);
      setIncidencia((prev) => ({
        ...prev,
        estado: 'Resuelta',
      }));
      showToast('Incidencia marcada como Resuelta exitosamente en PostgreSQL', 'success');
    } catch (err) {
      showToast(
        err.response?.data?.mensaje || 'Error al marcar la incidencia como resuelta',
        'error',
      );
    } finally {
      setResolviendo(false);
    }
  };

  const handleAprobacionCompletada = (nuevoEstado) => {
    setIncidencia((prev) => ({
      ...prev,
      estado: nuevoEstado === 'Aprobada' ? 'Cerrada' : 'En Progreso',
    }));
  };

  const handleCierreExitoso = (datosActualizados) => {
    setIncidencia((prev) => ({
      ...prev,
      estado: 'Completada',
      resolucion: datosActualizados?.resolucion || prev?.resolucion,
      fechaCierre: new Date().toISOString(),
    }));
  };

  const handleEvidenciaSubidaDesdeDetalle = (urlEvidencia) => {
    setIncidencia((prev) => ({
      ...prev,
      evidencias: [...(prev.evidencias || []), urlEvidencia],
    }));
    setMostrarSubidorNuevo(false);
  };

  const handleAbrirPrevisualizador = (url, nombre) => {
    setImagenModal({ url, nombre });
  };

  if (loading) {
    return (
      <div className="p-8 text-center text-gray-500 font-medium">
        Cargando detalles de la incidencia...
      </div>
    );
  }

  if (error || !incidencia) {
    return (
      <div className="p-8 text-center text-red-500 font-medium">
        Error al cargar la incidencia desde la base de datos.
      </div>
    );
  }

  const estaResuelta = incidencia.estado?.toLowerCase() === 'resuelta';
  const estaCompletada = incidencia.estado?.toLowerCase() === 'completada';
  const estaRechazada = incidencia.estado?.toLowerCase() === 'rechazada';

  const evidencias = Array.isArray(incidencia.evidencias) ? incidencia.evidencias : [];

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Navegación */}
      <nav aria-label="Ruta de navegación" className="flex items-center gap-2 text-sm text-gray-600">
        <Link to="/dashboard" className="hover:text-blue-600 transition-colors">Inicio</Link>
        <FiChevronRight className="w-3.5 h-3.5" aria-hidden="true" />
        <Link to="/incidencias" className="hover:text-blue-600 transition-colors">Incidencias</Link>
        <FiChevronRight className="w-3.5 h-3.5" aria-hidden="true" />
        <span className="font-semibold text-gray-900">Incidencia {incidencia.id}</span>
      </nav>

      {/* Información principal de la incidencia */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5 sm:p-6 space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-4 border-b border-gray-100">
          <div>
            <h1 className="text-xl font-bold text-gray-900">{incidencia.titulo}</h1>
            <p className="text-xs text-gray-500 font-mono mt-0.5">ID: {incidencia.id}</p>
          </div>
          <div className="flex flex-col items-start md:items-end gap-1.5">
            <StatusBadge status={incidencia.estado} />
            <span className="text-xs text-gray-600 flex items-center gap-1 mt-1 font-mono">
              <FiClock className="w-3.5 h-3.5" aria-hidden="true" /> Creada: {new Date(incidencia.fecha_creacion).toLocaleString()}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <h4 className="text-xs uppercase tracking-wider text-gray-600 font-semibold mb-1">Activo Afectado</h4>
            <div className="flex items-center gap-2 text-gray-800 font-medium">
              <FiBox className="w-4 h-4 text-orange-600" aria-hidden="true" />
              <span>{incidencia.id_activo || 'N/A'}</span>
            </div>
          </div>
          <div>
            <h4 className="text-xs uppercase tracking-wider text-gray-600 font-semibold mb-1">Técnico Asignado</h4>
            <div className="flex items-center gap-2 text-gray-800 font-medium">
              <FiUser className="w-4 h-4 text-blue-600" aria-hidden="true" />
              <span>{incidencia.asignado || 'Sin asignar'}</span>
            </div>
          </div>
          <div>
            <h4 className="text-xs uppercase tracking-wider text-gray-600 font-semibold mb-1">Prioridad (Clasificación)</h4>
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border uppercase ${getPriorityBadgeClass(incidencia.prioridad)}`}>
                {incidencia.prioridad || 'Media'}
              </span>
              {puedeClasificar && (
                <select
                  disabled={actualizandoPrioridad}
                  value={(incidencia.prioridad || 'Media').toLowerCase()}
                  onChange={(e) => handleCambiarPrioridad(e.target.value)}
                  className="text-xs border border-gray-300 rounded-lg px-2 py-1 bg-white text-gray-700 font-medium focus:ring-2 focus:ring-primary focus:outline-none cursor-pointer"
                  title="Clasificar Prioridad (Solo Supervisor / Administrador)"
                >
                  <option value="baja">Baja</option>
                  <option value="media">Media</option>
                  <option value="alta">Alta</option>
                  <option value="critica">Crítica</option>
                </select>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <h4 className="text-xs uppercase tracking-wider text-gray-600 font-semibold">Descripción del problema</h4>
          <p className="text-sm text-gray-700 bg-gray-50 p-4 rounded-xl border border-gray-100 whitespace-pre-wrap leading-relaxed">
            {incidencia.descripcion}
          </p>
        </div>
      </div>

      {/* Sección de Evidencia Fotográfica y Cloudinary */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5 sm:p-6 space-y-4">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 border-b border-gray-100 pb-4">
          <div>
            <h2 className="font-bold text-lg text-gray-900">Evidencia Fotográfica (Cloudinary)</h2>
            <p className="text-xs text-gray-600">
              Imágenes adjuntadas por el reportante para respaldo del fallo.
            </p>
          </div>
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

        {mostrarSubidorNuevo && (
          <div className="bg-slate-50 border border-primary-200 rounded-xl p-4 space-y-3">
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
              className="inline-flex items-center gap-1.5 px-4 py-2 mt-2 bg-primary hover:bg-primary-hover text-white rounded-lg text-xs font-bold transition-all shadow-sm cursor-pointer"
            >
              <FiUploadCloud className="w-4 h-4" />
              <span>Subir Evidencia a Cloudinary</span>
            </button>
          </div>
        ) : null}
      </div>

      {/* Reporte de Mantenimiento si ya está completada */}
      {estaCompletada && (
        <div className="bg-white rounded-2xl shadow-sm border border-emerald-200 p-5 sm:p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-emerald-100 pb-3">
            <div className="flex items-center gap-2.5">
              <FiCheckCircle className="w-6 h-6 text-emerald-600" aria-hidden="true" />
              <h2 className="font-bold text-lg text-emerald-950">Mantenimiento Completado</h2>
            </div>
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
              Completada
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-emerald-50/50 p-3.5 rounded-xl border border-emerald-100">
              <span className="text-[11px] uppercase font-bold text-emerald-800 block mb-1">
                Horas Invertidas
              </span>
              <span className="text-2xl font-black text-gray-900">{incidencia.horasInvertidas || 1.5}</span>
              <span className="text-xs text-gray-600 ml-1">horas</span>
            </div>
            <div className="bg-emerald-50/50 p-3.5 rounded-xl border border-emerald-100">
              <span className="text-[11px] uppercase font-bold text-emerald-800 block mb-1">
                Materiales e Insumos
              </span>
              {incidencia.materialesUsados && incidencia.materialesUsados.length > 0 ? (
                <div className="flex flex-wrap gap-1 mt-1">
                  {incidencia.materialesUsados.map((m, idx) => (
                    <span key={idx} className="px-2 py-0.5 rounded text-xs bg-white border border-emerald-200 text-emerald-900 font-medium">
                      {m.cantidad}x {m.nombre}
                    </span>
                  ))}
                </div>
              ) : (
                <span className="text-xs text-gray-600 italic">Sin materiales adicionales.</span>
              )}
            </div>
          </div>

          <div className="space-y-1">
            <span className="text-xs uppercase font-bold text-gray-600 block flex items-center gap-1">
              <FiFileText className="w-3.5 h-3.5 text-blue-600" aria-hidden="true" /> Resolución Técnica
            </span>
            <div className="bg-gray-50 p-3.5 rounded-xl border border-gray-200 text-sm text-gray-800 whitespace-pre-wrap">
              {incidencia.resolucion || 'Intervención técnica completada satisfactoriamente.'}
            </div>
          </div>
        </div>
      )}

      {/* Acciones de mantenimiento si aún no está completada ni resuelta (TAL-194) */}
      {!estaCompletada && !estaResuelta && !estaRechazada && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5 sm:p-6 space-y-3">
          <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
            <FiCheckCircle className="w-5 h-5 text-blue-600" aria-hidden="true" />
            Acciones de Mantenimiento y Cierre
          </h3>

          {puedeResolver ? (
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-emerald-50 border border-emerald-200 p-4 rounded-xl">
              <div>
                <p className="text-xs font-bold text-emerald-950">
                  {hasPermission('incidencias:resolver')
                    ? 'Usuario autorizado para registrar el cierre.'
                    : 'Usuario con autorización de resolución.'}
                </p>
                <p className="text-xs text-emerald-800 mt-0.5">
                  Puedes registrar el diagnóstico técnico y marcar la incidencia como resuelta en PostgreSQL.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                <button
                  type="button"
                  disabled={resolviendo}
                  onClick={handleResolverDirecto}
                  className="w-full sm:w-auto px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs shadow-xs flex items-center justify-center gap-2 transition-all cursor-pointer min-h-[44px]"
                >
                  <FiCheckCircle className="w-4 h-4" />
                  <span>{resolviendo ? 'Resolviendo...' : 'Marcar como Resuelta'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(true)}
                  className="w-full sm:w-auto px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs shadow-xs flex items-center justify-center gap-2 transition-all cursor-pointer min-h-[44px]"
                >
                  <FiFileText className="w-4 h-4" />
                  <span>Diagnóstico y Cierre</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl flex items-start gap-3 text-amber-900">
              <FiShield className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div className="text-xs space-y-1">
                <p className="font-bold text-amber-950">Acceso restringido a la resolución</p>
                <p>
                  Solo el técnico asignado o usuarios con rol SUPERVISOR / ADMINISTRADOR pueden resolver esta incidencia.
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Modal de Cierre */}
      <ModalCierreMantenimiento
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        orden={{
          id_orden: incidencia.id_orden || `ORD-${incidencia.id}`,
          incidencia_id: incidencia.id,
          id: incidencia.id,
          titulo: incidencia.titulo,
          id_activo: incidencia.id_activo,
          tecnico_nombre: incidencia.asignado,
          resolucion: incidencia.resolucion,
          horasInvertidas: incidencia.horasInvertidas,
          materialesUsados: incidencia.materialesUsados,
        }}
        tecnicoActual={usuario}
        onCierreExitoso={handleCierreExitoso}
      />
    </div>
  );
};

export default DetalleIncidencia;