import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  FiChevronRight,
  FiBox,
  FiClock,
  FiUser,
  FiInfo,
  FiCheckCircle,
  FiShield,
  FiLayers,
  FiFileText
} from 'react-icons/fi';
import StatusBadge from '../components/StatusBadge';
import ModalCierreMantenimiento from '../components/ModalCierreMantenimiento';
import PanelIncidenciaRechazada from '../components/PanelIncidenciaRechazada';
import { getTecnicoActual, getIncidencias } from '../services/incidenciasStorage';
import api from '../services/api';

const DetalleOrden = () => {
  const { idOrden } = useParams();
  const [orden, setOrden] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tecnicoActual, setTecnicoActual] = useState(() => getTecnicoActual());
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Escuchar cambios de perfil técnico para actualizar ownership en tiempo real
  useEffect(() => {
    const handleCambioTecnico = () => {
      setTecnicoActual(getTecnicoActual());
    };
    window.addEventListener('tecnico-cambiado', handleCambioTecnico);
    return () => window.removeEventListener('tecnico-cambiado', handleCambioTecnico);
  }, []);

  const cargarOrden = async () => {
    try {
      setLoading(true);
      // 1. Intentar consultar desde el almacenamiento local persistente primero
      const incidenciasLocales = getIncidencias();
      const incidenciaMatch = incidenciasLocales.find(
        (i) => i.id === idOrden || i.ordenId === idOrden || i.id === 'INC-1042'
      );

      // 2. Intentar obtener la orden desde el API real a través del API Gateway
      try {
        const response = await api.get(`/ordenes-trabajo/${idOrden}`);
        if (response.data) {
          const apiOrden = response.data;
          let estadoFinal = incidenciaMatch?.estado || apiOrden.estado || 'Asignada';
          if (estadoFinal && (estadoFinal.toUpperCase() === 'RECHAZADO' || estadoFinal.toLowerCase() === 'rechazada')) {
            estadoFinal = 'RECHAZADO';
          }

          setOrden({
            ...apiOrden,
            id_orden: apiOrden.id_orden || idOrden,
            incidencia_id: apiOrden.id_incidencia || apiOrden.incidencia_id || 'INC-1042',
            incidencia_titulo: apiOrden.incidencia?.titulo || 'Mantenimiento Preventivo / Correctivo',
            id_activo: apiOrden.incidencia?.id_activo || 'SRV-MAIL-01',
            estado: estadoFinal,
            tecnico_nombre: incidenciaMatch?.asignado || apiOrden.tecnico_nombre || 'Carlos Ruiz',
            tecnico_id: apiOrden.id_tecnico || 'tec-01',
            fecha_emision: apiOrden.fecha_creacion || new Date().toISOString(),
            resolucion: incidenciaMatch?.resolucion || apiOrden.diagnostico_tecnico || null,
            horasInvertidas: incidenciaMatch?.horasInvertidas || null,
            materialesUsados: incidenciaMatch?.materialesUsados || [],
            fechaCierre: incidenciaMatch?.fechaCierre || null,
            motivoRechazo: incidenciaMatch?.motivoRechazo || incidenciaMatch?.motivo_rechazo || null,
            fechaRechazo: incidenciaMatch?.fechaRechazo || null,
          });
          return;
        }
      } catch (apiErr) {
        console.warn('API Gateway no respondió con la orden, utilizando datos locales.', apiErr.message);
      }

      // Si no viene del API o falla, estructurar datos locales/mock consistentes
      let estadoFinal = incidenciaMatch?.estado || 'Asignada';
      if (estadoFinal && (estadoFinal.toUpperCase() === 'RECHAZADO' || estadoFinal.toLowerCase() === 'rechazada')) {
        estadoFinal = 'RECHAZADO';
      }

      setOrden({
        id_orden: idOrden,
        incidencia_id: incidenciaMatch?.id || 'INC-1042',
        incidencia_titulo: incidenciaMatch?.titulo || 'Fallo en sistema de correos',
        id_activo: incidenciaMatch?.id_activo || 'SRV-MAIL-01',
        estado: estadoFinal,
        tecnico_id: 'tec-01',
        tecnico_nombre: incidenciaMatch?.asignado || 'Carlos Ruiz',
        fecha_emision: incidenciaMatch?.fecha || new Date().toISOString(),
        instrucciones: 'Revisar la configuración del servidor de correos y los puertos SMTP/IMAP.',
        diagnostico_tecnico: incidenciaMatch?.resolucion || null,
        resolucion: incidenciaMatch?.resolucion || null,
        horasInvertidas: incidenciaMatch?.horasInvertidas || null,
        materialesUsados: incidenciaMatch?.materialesUsados || [],
        fechaCierre: incidenciaMatch?.fechaCierre || null,
        motivoRechazo: incidenciaMatch?.motivoRechazo || incidenciaMatch?.motivo_rechazo || null,
        fechaRechazo: incidenciaMatch?.fechaRechazo || null,
      });
    } catch (err) {
      console.error('Error general al cargar orden:', err);
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarOrden();
  }, [idOrden]);

  const handleCierreExitoso = (datosActualizados) => {
    let nuevoEstado = datosActualizados.estado || 'Completada';
    if (nuevoEstado && (nuevoEstado.toUpperCase() === 'RECHAZADO' || nuevoEstado.toLowerCase() === 'rechazada')) {
      nuevoEstado = 'RECHAZADO';
    }

    setOrden((prev) => ({
      ...prev,
      estado: nuevoEstado,
      resolucion: datosActualizados.resolucion,
      horasInvertidas: datosActualizados.horasInvertidas,
      materialesUsados: datosActualizados.materialesUsados,
      fechaCierre: datosActualizados.fechaCierre,
      diagnostico_tecnico: datosActualizados.resolucion,
      motivoRechazo: datosActualizados.motivoRechazo || datosActualizados.motivo_rechazo,
      fechaRechazo: datosActualizados.fechaRechazo,
    }));
  };

  if (loading) {
    return <div className="p-8 text-center text-gray-500 font-medium">Cargando detalles de la orden...</div>;
  }

  if (error || !orden) {
    return <div className="p-8 text-center text-red-500 font-medium">Error al cargar la orden de trabajo.</div>;
  }

  // Validación de Ownership: ¿Es el técnico asignado?
  const nombreAsignado = (orden.tecnico_nombre || '').trim().toLowerCase();
  const nombreActual = (tecnicoActual?.nombre || '').trim().toLowerCase();
  const esTecnicoAsignado =
    Boolean(nombreAsignado) &&
    (nombreAsignado === nombreActual ||
      nombreAsignado.includes(nombreActual) ||
      nombreActual.includes(nombreAsignado) ||
      orden.tecnico_id === tecnicoActual?.id);

  const estaCompletada =
    orden.estado?.toLowerCase() === 'completada' ||
    orden.estado?.toLowerCase() === 'resuelta';

  const estaRechazada =
    orden.estado === 'RECHAZADO' ||
    orden.estado?.toUpperCase() === 'RECHAZADO' ||
    orden.estado?.toLowerCase() === 'rechazada';

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Navegación tipo Breadcrumbs */}
      <nav aria-label="Ruta de navegación" className="flex items-center gap-2 text-sm text-gray-600">
        <Link to="/dashboard" className="hover:text-blue-600 transition-colors">Inicio</Link>
        <FiChevronRight className="w-3.5 h-3.5" />
        <Link to="/incidencias" className="hover:text-blue-600 transition-colors">Incidencias</Link>
        <FiChevronRight className="w-3.5 h-3.5" />
        <span className="font-semibold text-gray-900">Orden {orden.id_orden}</span>
      </nav>

      {/* TARJETA PRINCIPAL DE LA ORDEN DE TRABAJO */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        {/* Cabecera */}
        <div className="p-5 sm:p-6 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-gray-50 to-white">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <span className="font-mono text-sm font-bold bg-blue-50 text-blue-700 px-2.5 py-1 rounded-md border border-blue-200">
                {orden.id_orden}
              </span>
              <StatusBadge status={orden.estado} />
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight">
              {orden.incidencia_titulo}
            </h1>
          </div>

          <div className="text-xs text-gray-600 flex items-center gap-1.5 font-mono">
            <FiClock className="w-4 h-4" />
            <span>Emitida: {new Date(orden.fecha_emision).toLocaleDateString()}</span>
          </div>
        </div>

        {/* Metadatos en Grid */}
        <div className="p-5 sm:p-6 space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-3.5 bg-gray-50 rounded-xl border border-gray-100">
              <span className="text-[11px] uppercase tracking-wider text-gray-600 font-semibold block mb-1">
                Incidencia Asociada
              </span>
              <div className="flex items-center gap-2">
                <Link
                  to={`/incidencias/${orden.incidencia_id}`}
                  className="font-mono text-xs font-bold text-blue-700 hover:text-blue-900 hover:underline flex items-center gap-1"
                >
                  <span>{orden.incidencia_id}</span>
                </Link>
              </div>
            </div>

            <div className="p-3.5 bg-gray-50 rounded-xl border border-gray-100">
              <span className="text-[11px] uppercase tracking-wider text-gray-600 font-semibold block mb-1">
                Activo Afectado
              </span>
              <div className="flex items-center gap-1.5 text-xs text-gray-800 font-semibold">
                <FiBox className="w-3.5 h-3.5 text-orange-600" aria-hidden="true" />
                <span className="font-mono">{orden.id_activo}</span>
              </div>
            </div>

            <div className="p-3.5 bg-gray-50 rounded-xl border border-gray-100">
              <span className="text-[11px] uppercase tracking-wider text-gray-600 font-semibold block mb-1">
                Técnico Designado
              </span>
              <div className="flex items-center gap-1.5 text-xs text-gray-800 font-semibold">
                <FiUser className="w-3.5 h-3.5 text-indigo-600" aria-hidden="true" />
                <span>{orden.tecnico_nombre}</span>
              </div>
            </div>
          </div>

          <div className="bg-blue-50/70 border border-blue-100 rounded-xl p-4">
            <h2 className="text-xs uppercase tracking-wider text-blue-900 font-bold mb-1.5 flex items-center gap-1.5">
              <FiInfo className="w-4 h-4 text-blue-600" aria-hidden="true" /> Instrucciones del Supervisor
            </h2>
            <p className="text-xs sm:text-sm text-blue-950 leading-relaxed">
              {orden.instrucciones || 'Realizar diagnóstico preventivo y resolver la falla en el menor tiempo posible.'}
            </p>
          </div>
        </div>
      </div>

      {/* COMPONENTE CONDICIONAL SI ESTÁ RECHAZADA */}
      {estaRechazada && (
        <PanelIncidenciaRechazada
          motivoRechazo={orden.motivoRechazo || orden.diagnostico_tecnico}
          fechaRechazo={orden.fechaRechazo}
          tecnicoNombre={orden.tecnico_nombre}
          idActivo={orden.id_activo}
        />
      )}

      {/* SECCIÓN FINALIZATIVA: SEGÚN ESTADO Y OWNERSHIP DEL TÉCNICO */}
      {estaCompletada ? (
        /* VISTA: MANTENIMIENTO YA CONFIRMADO Y COMPLETADO */
        <div id="seccion-reporte-cierre" className="bg-white rounded-2xl shadow-sm border border-emerald-200 p-6 space-y-5 animate-fadeIn">
          <div className="flex items-center justify-between border-b border-emerald-100 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center flex-shrink-0">
                <FiCheckCircle className="w-6 h-6" />
              </div>
              <div>
                <h2 className="font-bold text-lg text-emerald-950">Mantenimiento Técnico Completado</h2>
                <p className="text-xs text-emerald-700">
                  El técnico responsable ha cerrado esta tarea y rendido cuentas de su trabajo.
                </p>
              </div>
            </div>
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
              Completada
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-emerald-50/40 p-4 rounded-xl border border-emerald-100">
              <span className="text-[11px] uppercase font-bold text-emerald-700 block mb-1 flex items-center gap-1">
                <FiClock className="w-3.5 h-3.5" /> Horas Invertidas
              </span>
              <span className="text-2xl font-black text-gray-900">{orden.horasInvertidas || 1.5}</span>
              <span className="text-xs text-gray-700 ml-1">horas dedicadas</span>
            </div>

            <div className="bg-emerald-50/40 p-4 rounded-xl border border-emerald-100 md:col-span-2">
              <span className="text-[11px] uppercase font-bold text-emerald-700 block mb-1 flex items-center gap-1">
                <FiLayers className="w-3.5 h-3.5" /> Materiales e Insumos Usados
              </span>
              {orden.materialesUsados && orden.materialesUsados.length > 0 ? (
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {orden.materialesUsados.map((m, idx) => (
                    <span
                      key={idx}
                      className="px-2.5 py-1 rounded-md text-xs font-semibold bg-white border border-emerald-200 text-emerald-900 shadow-2xs"
                    >
                      {m.cantidad}x {m.nombre}
                    </span>
                  ))}
                </div>
              ) : (
                <span className="text-xs text-gray-700 italic mt-1 block">
                  Sin materiales adicionales consumidos (solo mano de obra).
                </span>
              )}
            </div>
          </div>

          <div className="space-y-1.5 pt-2">
            <span className="text-xs uppercase font-bold text-gray-700 block flex items-center gap-1">
              <FiFileText className="w-3.5 h-3.5 text-blue-600" /> Resolución Técnica Registrada
            </span>
            <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">
              {orden.resolucion || orden.diagnostico_tecnico || 'Resolución satisfactoria del servicio.'}
            </div>
          </div>

          {orden.fechaCierre && (
            <div className="text-xs text-gray-600 text-right pt-2 border-t border-gray-100">
              Cierre formal registrado el: {orden.fechaCierre}
            </div>
          )}
        </div>
      ) : !estaRechazada ? (
        /* VISTA: TAREA PENDIENTE DE COMPLETAR O RECHAZAR */
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5 sm:p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <FiCheckCircle className="w-5 h-5 text-blue-600" aria-hidden="true" />
                Cierre de Tarea y Rendición de Cuentas
              </h2>
              <p className="text-xs text-gray-600 mt-0.5">
                Al concluir o desestimar los trabajos en terreno, puedes confirmar la resolución o rechazar la incidencia explicando el motivo.
              </p>
            </div>
          </div>

          {/* EVALUACIÓN DE OWNERSHIP / ACCESO AL FORMULARIO */}
          {esTecnicoAsignado ? (
            /* TÉCNICO ASIGNADO: BOTÓN PRINCIPAL HABILITADO */
            <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 rounded-xl p-4 sm:p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-200 text-emerald-900 font-mono">
                    Técnico Asignado
                  </span>
                  <strong className="text-sm text-emerald-950">{tecnicoActual?.nombre}</strong>
                </div>
                <p className="text-xs text-emerald-800">
                  Eres el técnico designado para esta orden. Puedes ingresar al formulario para confirmar el mantenimiento o rechazar la incidencia con su justificación.
                </p>
              </div>

              <button
                type="button"
                id="btn-abrir-modal-cierre"
                onClick={() => setIsModalOpen(true)}
                className="w-full sm:w-auto px-6 py-3.5 bg-emerald-700 hover:bg-emerald-800 active:scale-98 text-white rounded-xl font-bold text-sm shadow-md hover:shadow-lg shadow-emerald-700/25 flex items-center justify-center gap-2 transition-all cursor-pointer min-h-[48px]"
              >
                <FiCheckCircle className="w-5 h-5" />
                <span>Gestionar Cierre / Rechazo</span>
              </button>
            </div>
          ) : (
            /* OTRO TÉCNICO: REGLA DE NEGOCIO APLICADA - ACCESO DENEGADO */
            <div
              id="banner-acceso-denegado-ownership"
              className="bg-amber-50 border-2 border-dashed border-amber-300 rounded-xl p-4 sm:p-5 text-amber-900 space-y-3"
            >
              <div className="flex items-start gap-3">
                <FiShield className="w-6 h-6 text-amber-600 flex-shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <h3 className="font-bold text-sm text-amber-950">
                    Formulario Finalizativo No Disponible para este Perfil
                  </h3>
                  <p className="text-xs text-amber-800 leading-relaxed">
                    Esta orden fue asignada por el supervisor a <strong>{orden.tecnico_nombre}</strong>. Tu perfil activo actual es <strong>{tecnicoActual?.nombre}</strong>.
                  </p>
                  <p className="text-[11px] text-amber-700 italic">
                    Regla de negocio: Los técnicos solo pueden rendir cuentas de las tareas que les fueron asignadas directamente.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      ) : null}

      {/* MODAL DE CIERRE / RECHAZO */}
      <ModalCierreMantenimiento
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        orden={{
          id_orden: orden.id_orden,
          incidencia_id: orden.incidencia_id,
          id: orden.incidencia_id,
          titulo: orden.incidencia_titulo,
          id_activo: orden.id_activo,
          tecnico_nombre: orden.tecnico_nombre,
          tecnico_id: orden.tecnico_id,
          resolucion: orden.resolucion,
          horasInvertidas: orden.horasInvertidas,
          materialesUsados: orden.materialesUsados,
          motivoRechazo: orden.motivoRechazo,
        }}
        tecnicoActual={tecnicoActual}
        onCierreExitoso={handleCierreExitoso}
      />
    </div>
  );
};

export default DetalleOrden;
