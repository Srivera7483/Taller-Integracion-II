import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  FiChevronRight,
  FiBox,
  FiClock,
  FiUser,
  FiCheckCircle,
  FiShield,
  FiLayers,
  FiFileText
} from 'react-icons/fi';
import StatusBadge from '../components/StatusBadge';
import EvidenceGallery from '../components/EvidenceGallery';
import api from '../services/api';
import AprobacionReportante from '../components/AprobacionReportante';
import ModalCierreMantenimiento from '../components/ModalCierreMantenimiento';
import { getIncidencias, getTecnicoActual } from '../services/incidenciasStorage';

const DetalleIncidencia = () => {
  const { idIncidencia } = useParams();
  const [incidencia, setIncidencia] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tecnicoActual, setTecnicoActual] = useState(() => getTecnicoActual());
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    const handleCambioTecnico = () => {
      setTecnicoActual(getTecnicoActual());
    };
    window.addEventListener('tecnico-cambiado', handleCambioTecnico);
    return () => window.removeEventListener('tecnico-cambiado', handleCambioTecnico);
  }, []);

  const cargarIncidencia = async () => {
    try {
      setLoading(true);
      // Buscar primero en datos locales
      const locales = getIncidencias();
      const encontradaLocal = locales.find((i) => i.id === idIncidencia);

      try {
        const response = await api.get(`/incidencias/${idIncidencia}`);
        if (response.data) {
          const apiData = response.data;
          let evidenciasList = apiData.evidencias || [];

          // Si el endpoint general no trajo evidencias, consultar el endpoint dedicado
          if (!evidenciasList || evidenciasList.length === 0) {
            try {
              const resEv = await api.get(`/incidencias/${idIncidencia}/evidencias`);
              if (Array.isArray(resEv.data) && resEv.data.length > 0) {
                evidenciasList = resEv.data;
              }
            } catch {
              // Silencioso
            }
          }

          setIncidencia({
            id: apiData.id_incidencia || idIncidencia,
            titulo: apiData.titulo,
            descripcion: apiData.descripcion,
            id_activo: apiData.id_activo,
            estado: encontradaLocal?.estado || apiData.estado?.nombre_estado || 'Pendiente',
            fecha_creacion: apiData.fecha_creacion || new Date().toISOString(),
            asignado: encontradaLocal?.asignado || 'Carlos Ruiz',
            resolucion: encontradaLocal?.resolucion || null,
            horasInvertidas: encontradaLocal?.horasInvertidas || null,
            materialesUsados: encontradaLocal?.materialesUsados || [],
            fechaCierre: encontradaLocal?.fechaCierre || null,
            evidencias: evidenciasList.length > 0 ? evidenciasList : (encontradaLocal?.evidencias || []),
          });
          return;
        }
      } catch (err) {
        console.warn('API incidencias no disponible o 404, usando fallback local.', err.message);
      }

      setIncidencia(
        encontradaLocal
          ? {
              ...encontradaLocal,
              evidencias: encontradaLocal.evidencias || [],
            }
          : {
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
              evidencias: [
                'https://res.cloudinary.com/infra-uct/image/upload/v1728345601/evidencias/falla_panel_proyector.jpg',
                'https://res.cloudinary.com/infra-uct/image/upload/v1728345602/evidencias/sensor_temperatura_alerta.jpg',
                'https://res.cloudinary.com/infra-uct/image/upload/v1728345603/evidencias/conector_hdmi_danado.jpg',
              ],
            }
      );
    } catch (err) {
      console.error('Error al cargar la incidencia:', err);
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarIncidencia();
  }, [idIncidencia]);

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
      resolucion: datosActualizados.resolucion,
      horasInvertidas: datosActualizados.horasInvertidas,
      materialesUsados: datosActualizados.materialesUsados,
      fechaCierre: datosActualizados.fechaCierre,
    }));
  };

  if (loading) {
    return <div className="p-8 text-center text-gray-500 font-medium">Cargando detalles de la incidencia...</div>;
  }

  if (error || !incidencia) {
    return <div className="p-8 text-center text-red-500 font-medium">Error al cargar la incidencia.</div>;
  }

  const estaResuelta = incidencia.estado?.toLowerCase() === 'resuelta';
  const estaCompletada = incidencia.estado?.toLowerCase() === 'completada';

  // Validación de Ownership
  const nombreAsignado = (incidencia.asignado || '').trim().toLowerCase();
  const nombreActual = (tecnicoActual?.nombre || '').trim().toLowerCase();
  const esTecnicoAsignado =
    Boolean(nombreAsignado) &&
    (nombreAsignado === nombreActual ||
      nombreAsignado.includes(nombreActual) ||
      nombreActual.includes(nombreAsignado));

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <nav className="flex items-center gap-2 text-sm text-gray-500">
        <Link to="/dashboard" className="hover:text-blue-600 transition-colors">Inicio</Link>
        <FiChevronRight className="w-3.5 h-3.5" />
        <Link to="/incidencias" className="hover:text-blue-600 transition-colors">Incidencias</Link>
        <FiChevronRight className="w-3.5 h-3.5" />
        <span className="font-semibold text-gray-900">Incidencia {incidencia.id}</span>
      </nav>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5 sm:p-6">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 border-b border-gray-100 pb-5 mb-5">
          <div>
            <div className="flex items-center gap-3 mb-2 flex-wrap">
              <h1 className="text-2xl font-bold text-gray-900 tracking-tight">{incidencia.titulo}</h1>
            </div>
            <span className="font-mono text-sm bg-gray-100 text-gray-600 px-2.5 py-1 rounded-md border border-gray-200 font-semibold">
              {incidencia.id}
            </span>
          </div>
          <div className="flex flex-col items-start md:items-end gap-1.5">
            <StatusBadge status={incidencia.estado} />
            <span className="text-xs text-gray-400 flex items-center gap-1 mt-1 font-mono">
              <FiClock className="w-3.5 h-3.5" /> Creada: {new Date(incidencia.fecha_creacion).toLocaleString()}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
          <div>
            <h4 className="text-xs uppercase tracking-wider text-gray-400 font-semibold mb-1">Activo Afectado</h4>
            <div className="flex items-center gap-2 text-gray-800 font-medium">
              <FiBox className="w-4 h-4 text-orange-500" />
              <span>{incidencia.id_activo || 'N/A'}</span>
            </div>
          </div>

          <div>
            <h4 className="text-xs uppercase tracking-wider text-gray-400 font-semibold mb-1">Técnico Asignado</h4>
            <div className="flex items-center gap-2 text-gray-800 font-medium">
              <FiUser className="w-4 h-4 text-blue-500" />
              <span>{incidencia.asignado || 'Sin asignar'}</span>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <h4 className="text-xs uppercase tracking-wider text-gray-400 font-semibold">Descripción del problema</h4>
          <p className="text-sm text-gray-700 bg-gray-50 p-4 rounded-xl border border-gray-100 whitespace-pre-wrap leading-relaxed">
            {incidencia.descripcion}
          </p>
        </div>
      </div>

      {/* SECCIÓN DE EVIDENCIAS FOTOGRÁFICAS (CLOUDINARY) */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5 sm:p-6">
        <EvidenceGallery
          evidencias={incidencia.evidencias}
          titulo="Fotos y Evidencias del Fallo"
        />
      </div>

      {/* REPORTE DE MANTENIMIENTO SI YA ESTÁ COMPLETADA */}
      {estaCompletada && (
        <div className="bg-white rounded-2xl shadow-sm border border-emerald-200 p-5 sm:p-6 space-y-4 animate-fadeIn">
          <div className="flex items-center justify-between border-b border-emerald-100 pb-3">
            <div className="flex items-center gap-2.5">
              <FiCheckCircle className="w-6 h-6 text-emerald-600" />
              <h3 className="font-bold text-lg text-emerald-950">Mantenimiento Completado</h3>
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
              <span className="text-xs text-gray-500 ml-1">horas</span>
            </div>
            <div className="bg-emerald-50/50 p-3.5 rounded-xl border border-emerald-100">
              <span className="text-[11px] uppercase font-bold text-emerald-700 block mb-1">
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
                <span className="text-xs text-gray-500 italic">Sin materiales adicionales.</span>
              )}
            </div>
          </div>

          <div className="space-y-1">
            <span className="text-xs uppercase font-bold text-gray-500 block flex items-center gap-1">
              <FiFileText className="w-3.5 h-3.5 text-blue-600" /> Resolución Técnica
            </span>
            <div className="bg-gray-50 p-3.5 rounded-xl border border-gray-200 text-sm text-gray-800 whitespace-pre-wrap">
              {incidencia.resolucion || 'Intervención técnica completada satisfactoriamente.'}
            </div>
          </div>
        </div>
      )}

      {/* ACCIÓN DE CIERRE SI AÚN NO ESTÁ COMPLETADA */}
      {!estaCompletada && !estaResuelta && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5 sm:p-6 space-y-3">
          <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
            <FiCheckCircle className="w-5 h-5 text-blue-600" />
            Acciones de Mantenimiento
          </h3>

          {esTecnicoAsignado ? (
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-emerald-50 border border-emerald-200 p-4 rounded-xl">
              <div>
                <p className="text-xs font-bold text-emerald-950">
                  Eres el técnico asignado por el supervisor.
                </p>
                <p className="text-xs text-emerald-800 mt-0.5">
                  Puedes abrir el formulario táctil para registrar resolución, horas invertidas y materiales.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(true)}
                className="w-full sm:w-auto px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs shadow-xs flex items-center justify-center gap-2 transition-all cursor-pointer min-h-[44px]"
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
                  Esta incidencia está asignada a <strong>{incidencia.asignado || 'otro técnico'}</strong>. Únicamente dicho técnico puede rendir cuentas de la intervención y cerrarla.
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Renderizado condicional si ya está marcada como resuelta para aprobación del reportante */}
      {estaResuelta && (
        <AprobacionReportante
          incidenciaId={incidencia.id}
          onAprobacionCompletada={handleAprobacionCompletada}
        />
      )}

      {/* MODAL DE CIERRE */}
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
        }}
        tecnicoActual={tecnicoActual}
        onCierreExitoso={handleCierreExitoso}
      />
    </div>
  );
};

export default DetalleIncidencia;
