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
  FiFileText,
  FiAlertTriangle
} from 'react-icons/fi';
import StatusBadge from '../components/StatusBadge';
import ModalCierreMantenimiento from '../components/ModalCierreMantenimiento';
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
          setOrden({
            ...apiOrden,
            id_orden: apiOrden.id_orden || idOrden,
            incidencia_id: apiOrden.id_incidencia || apiOrden.incidencia_id || 'INC-1042',
            incidencia_titulo: apiOrden.incidencia?.titulo || 'Mantenimiento Preventivo / Correctivo',
            id_activo: apiOrden.incidencia?.id_activo || 'SRV-MAIL-01',
            estado: incidenciaMatch?.estado || apiOrden.estado || 'Asignada',
            tecnico_nombre: incidenciaMatch?.asignado || apiOrden.tecnico_nombre || 'Carlos Ruiz',
            tecnico_id: apiOrden.id_tecnico || 'tec-01',
            fecha_emision: apiOrden.fecha_creacion || new Date().toISOString(),
            resolucion: incidenciaMatch?.resolucion || apiOrden.diagnostico_tecnico || null,
            horasInvertidas: incidenciaMatch?.horasInvertidas || null,
            materialesUsados: incidenciaMatch?.materialesUsados || [],
            fechaCierre: incidenciaMatch?.fechaCierre || null,
          });
          return;
        }
      } catch (apiErr) {
        console.warn('API Gateway no respondió con la orden, utilizando datos locales.', apiErr.message);
      }

      // Si no viene del API o falla, estructurar datos locales/mock consistentes
      setOrden({
        id_orden: idOrden,
        incidencia_id: incidenciaMatch?.id || 'INC-1042',
        incidencia_titulo: incidenciaMatch?.titulo || 'Fallo en sistema de correos',
        id_activo: incidenciaMatch?.id_activo || 'SRV-MAIL-01',
        estado: incidenciaMatch?.estado || 'Asignada',
        tecnico_id: 'tec-01',
        tecnico_nombre: incidenciaMatch?.asignado || 'Carlos Ruiz',
        fecha_emision: incidenciaMatch?.fecha || new Date().toISOString(),
        instrucciones: 'Revisar la configuración del servidor de correos y los puertos SMTP/IMAP.',
        diagnostico_tecnico: incidenciaMatch?.resolucion || null,
        resolucion: incidenciaMatch?.resolucion || null,
        horasInvertidas: incidenciaMatch?.horasInvertidas || null,
        materialesUsados: incidenciaMatch?.materialesUsados || [],
        fechaCierre: incidenciaMatch?.fechaCierre || null,
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
    setOrden((prev) => ({
      ...prev,
      estado: 'Completada',
      resolucion: datosActualizados.resolucion,
      horasInvertidas: datosActualizados.horasInvertidas,
      materialesUsados: datosActualizados.materialesUsados,
      fechaCierre: datosActualizados.fechaCierre,
      diagnostico_tecnico: datosActualizados.resolucion,
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

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Navegación tipo Breadcrumbs */}
      <nav className="flex items-center gap-2 text-sm text-gray-500">
        <Link to="/dashboard" className="hover:text-blue-600 transition-colors">Inicio</Link>
        <FiChevronRight className="w-3.5 h-3.5" />
        <Link to="/incidencias" className="hover:text-blue-600 transition-colors">Órdenes</Link>
        <FiChevronRight className="w-3.5 h-3.5" />
        <span className="font-semibold text-gray-900">Detalle de Orden {orden.id_orden}</span>
      </nav>

      {/* Encabezado Principal de la Orden */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5 sm:p-6">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 border-b border-gray-100 pb-5 mb-5">
          <div>
            <div className="flex items-center gap-3 mb-2 flex-wrap">
              <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Orden de Trabajo</h1>
              <span className="font-mono text-sm bg-gray-100 text-gray-700 px-2.5 py-1 rounded-md border border-gray-200 font-semibold">
                {orden.id_orden}
              </span>
            </div>
            <p className="text-gray-700 font-medium text-base">{orden.incidencia_titulo}</p>
          </div>
          <div className="flex flex-col items-start md:items-end gap-1.5">
            <StatusBadge status={orden.estado} />
            <span className="text-xs text-gray-400 flex items-center gap-1 mt-1 font-mono">
              <FiClock className="w-3.5 h-3.5" /> Emisión: {orden.fecha_emision}
            </span>
          </div>
        </div>

        {/* Detalles e Instrucciones */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div>
              <h4 className="text-xs uppercase tracking-wider text-gray-400 font-semibold mb-1">
                Técnico Designado (Supervisor)
              </h4>
              <div className="flex items-center gap-2 text-gray-900 font-semibold text-base">
                <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-700 font-bold text-xs flex items-center justify-center">
                  <FiUser className="w-4 h-4" />
                </div>
                <span>{orden.tecnico_nombre}</span>
              </div>
            </div>
            <div>
              <h4 className="text-xs uppercase tracking-wider text-gray-400 font-semibold mb-1">
                Incidencia y Activo Asociado
              </h4>
              <div className="flex items-center gap-2 text-gray-800 font-medium text-sm">
                <FiBox className="w-4 h-4 text-orange-500" />
                <span>{orden.incidencia_id}</span>
                <span className="text-gray-400">•</span>
                <span className="font-mono text-xs bg-gray-100 px-2 py-0.5 rounded text-gray-600">
                  {orden.id_activo || 'SRV-MAIL-01'}
                </span>
              </div>
            </div>
          </div>

          <div className="bg-blue-50/70 border border-blue-100 rounded-xl p-4">
            <h4 className="text-xs uppercase tracking-wider text-blue-900 font-bold mb-1.5 flex items-center gap-1.5">
              <FiInfo className="w-4 h-4 text-blue-600" /> Instrucciones del Supervisor
            </h4>
            <p className="text-xs sm:text-sm text-blue-950 leading-relaxed">
              {orden.instrucciones || 'Realizar diagnóstico preventivo y resolver la falla en el menor tiempo posible.'}
            </p>
          </div>
        </div>
      </div>

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
                <h3 className="font-bold text-lg text-emerald-950">Mantenimiento Técnico Completado</h3>
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
              <span className="text-xs text-gray-500 ml-1">horas dedicadas</span>
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
                <span className="text-xs text-gray-500 italic mt-1 block">
                  Sin materiales adicionales consumidos (solo mano de obra).
                </span>
              )}
            </div>
          </div>

          <div className="space-y-1.5 pt-2">
            <span className="text-xs uppercase font-bold text-gray-500 block flex items-center gap-1">
              <FiFileText className="w-3.5 h-3.5 text-blue-600" /> Resolución Técnica Registrada
            </span>
            <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">
              {orden.resolucion || orden.diagnostico_tecnico || 'Resolución satisfactoria del servicio.'}
            </div>
          </div>

          {orden.fechaCierre && (
            <div className="text-xs text-gray-400 text-right pt-2 border-t border-gray-100">
              Cierre formal registrado el: {orden.fechaCierre}
            </div>
          )}
        </div>
      ) : (
        /* VISTA: TAREA PENDIENTE DE COMPLETAR */
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5 sm:p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <FiCheckCircle className="w-5 h-5 text-blue-600" />
                Cierre de Tarea y Rendición de Cuentas
              </h3>
              <p className="text-xs text-gray-500 mt-0.5">
                Al concluir los trabajos en terreno, confirma la resolución, horas y materiales para cambiar el estado a <strong>Completada</strong>.
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
                  Eres el técnico designado para esta orden. Puedes ingresar al formulario finalizativo táctil para rendir cuentas de tu trabajo.
                </p>
              </div>

              <button
                type="button"
                id="btn-abrir-modal-cierre"
                onClick={() => setIsModalOpen(true)}
                className="w-full sm:w-auto px-6 py-3.5 bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white rounded-xl font-bold text-sm shadow-md hover:shadow-lg shadow-emerald-600/25 flex items-center justify-center gap-2 transition-all cursor-pointer min-h-[48px]"
              >
                <FiCheckCircle className="w-5 h-5" />
                <span>Confirmar y Cerrar Mantenimiento</span>
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
                  <h4 className="font-bold text-sm text-amber-950">
                    Formulario Finalizativo No Disponible para este Perfil
                  </h4>
                  <p className="text-xs text-amber-800 leading-relaxed">
                    Esta orden fue asignada por el supervisor a <strong>{orden.tecnico_nombre}</strong>. Tu perfil activo actual es <strong>{tecnicoActual?.nombre}</strong>.
                  </p>
                  <p className="text-[11px] text-amber-700 italic">
                    Regla de negocio: Los técnicos no eligen tareas de otros compañeros. Solo el técnico responsable asignado puede abrir el formulario finalizativo y cerrar el mantenimiento.
                  </p>
                </div>
              </div>

              <div className="pt-1 flex items-center justify-between border-t border-amber-200 text-xs">
                <span className="text-amber-800 font-medium">Acceso restringido por rol y asignación</span>
                <button
                  type="button"
                  disabled
                  title="Solo el técnico asignado puede ingresar al formulario finalizativo"
                  className="px-4 py-2 bg-gray-200 text-gray-500 rounded-lg text-xs font-semibold cursor-not-allowed opacity-70"
                >
                  Confirmación Bloqueada
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* COMPONENTE MODAL DE CIERRE DE MANTENIMIENTO TÉCNICO */}
      <ModalCierreMantenimiento
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        orden={orden}
        tecnicoActual={tecnicoActual}
        onCierreExitoso={handleCierreExitoso}
      />
    </div>
  );
};

export default DetalleOrden;
