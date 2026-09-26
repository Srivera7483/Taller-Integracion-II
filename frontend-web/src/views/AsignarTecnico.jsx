import React, { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  FiChevronRight,
  FiUserCheck,
  FiAlertCircle,
  FiClock,
  FiShield,
  FiBox,
  FiArrowLeft,
  FiCheckCircle,
  FiSend,
  FiRefreshCw
} from 'react-icons/fi';
import StatusBadge from '../components/StatusBadge';
import { useToast } from '../context/ToastContext';
import {
  getIncidencias,
  TECNICOS_EXISTENTES,
  asignarTecnicoIncidencia
} from '../services/incidenciasStorage';
import {
  crearOrdenTrabajoApi,
  getAsignarOrdenEndpoint
} from '../services/ordenesService';

const AsignarTecnico = () => {
  const [searchParams] = useSearchParams();
  const { showToast } = useToast();

  const [incidencias, setIncidencias] = useState(() => getIncidencias());
  const [selectedTecnicoId, setSelectedTecnicoId] = useState('');
  const [notasInstrucciones, setNotasInstrucciones] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Estados reactivos para reflejar la orden emitida y el estado de integración
  const [ordenEmitida, setOrdenEmitida] = useState(null);
  const [errorApi, setErrorApi] = useState(null);
  const [historialEmitidas, setHistorialEmitidas] = useState([]);

  // Filtrar para excluir incidencias que ya poseen un técnico asignado
  const tieneTecnicoAsignado = (inc) => {
    if (!inc.asignado) return false;
    const asignadoTexto = inc.asignado.trim().toLowerCase();
    return (
      asignadoTexto !== 'sin asignar' &&
      asignadoTexto !== 'equipo de soporte' &&
      asignadoTexto !== 'equipo de guardia noc' &&
      asignadoTexto !== 'pendiente' &&
      asignadoTexto !== ''
    );
  };

  const incidenciasDisponibles = incidencias.filter((inc) => !tieneTecnicoAsignado(inc));

  // Derivación directa y limpia del ID de incidencia seleccionada (URL param > selección de usuario)
  const queryIncId = searchParams.get('incidenciaId') || '';
  const [selectedIncidenciaId, setSelectedIncidenciaId] = useState(() => {
    if (queryIncId && incidenciasDisponibles.some((i) => i.id === queryIncId)) {
      return queryIncId;
    }
    return '';
  });

  const incidenciaSeleccionada = incidencias.find((item) => item.id === selectedIncidenciaId);
  const tecnicoSeleccionado = TECNICOS_EXISTENTES.find((t) => t.id === selectedTecnicoId);

  // Validación: Se debe tener seleccionada tanto la incidencia como el técnico existente
  const isFormValid = Boolean(selectedIncidenciaId && selectedTecnicoId);

  /**
   * Envía el payload al API Gateway de forma asíncrona y procesa la respuesta.
   */
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isFormValid || isSubmitting) return;

    setIsSubmitting(true);
    setErrorApi(null);

    // Payload formal esperado por el endpoint /api/incidencias/ordenes-trabajo/asignar
    const payload = {
      incidencia_id: selectedIncidenciaId,
      tecnico_id: selectedTecnicoId,
      instrucciones: notasInstrucciones.trim(),
    };

    try {
      // 1. Envío asíncrono al API Gateway
      const res = await crearOrdenTrabajoApi(payload);

      // 2. Al recibir un 200 OK o 201 Created:
      if (res.status === 200 || res.status === 201) {
        const idOrdenEmitida =
          res.data?.id_orden ||
          res.data?.id ||
          `ORD-${Math.floor(1000 + Math.random() * 9000)}`;

        const datosOrdenEmitida = {
          id_orden: idOrdenEmitida,
          incidencia_id: payload.incidencia_id,
          incidencia_titulo: incidenciaSeleccionada?.titulo || 'Incidencia de infraestructura',
          id_activo: incidenciaSeleccionada?.id_activo || 'N/A',
          tecnico_id: payload.tecnico_id,
          tecnico_nombre: tecnicoSeleccionado?.nombre || 'Técnico asignado',
          instrucciones: payload.instrucciones,
          fecha_emision: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
          estado: res.data?.estado || 'Emitida',
          httpStatus: res.status,
          endpoint: res.endpoint,
        };

        // A) El formulario se limpia
        setSelectedIncidenciaId('');
        setSelectedTecnicoId('');
        setNotasInstrucciones('');
        setErrorApi(null);

        // B) La interfaz refleja que la orden fue emitida
        setOrdenEmitida(datosOrdenEmitida);
        setHistorialEmitidas((prev) => [datosOrdenEmitida, ...prev]);

        // C) Actualizar estado local para reflejar la incidencia como asignada
        asignarTecnicoIncidencia(
          payload.incidencia_id,
          tecnicoSeleccionado.nombre,
          payload.instrucciones
        );
        setIncidencias(getIncidencias());

        showToast(
          `¡Orden ${idOrdenEmitida} emitida con éxito (${res.status === 201 ? '201 Created' : '200 OK'})!`,
          'success'
        );
      } else {
        const detalleError =
          res.data?.message ||
          res.data?.error ||
          `Código HTTP ${res.status}`;
        console.log(`[API Gateway] Error de respuesta: ${detalleError}`, res);
        setErrorApi('Fallo en la comunicacion ERROR 502');
        showToast('Fallo en la comunicacion ERROR 502', 'error');
      }
    } catch (networkError) {
      const endpoint = getAsignarOrdenEndpoint();
      console.log(`No fue posible conectar con el API Gateway en '${endpoint}'. Verifica que el Gateway esté en ejecución.`, networkError);
      setErrorApi('Fallo en la comunicacion ERROR 502');
      showToast('Fallo en la comunicacion ERROR 502', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  /**
   * Permite probar el flujo 201 Created para pruebas de interfaz locales.
   */
  const handleSimular201 = () => {
    if (!isFormValid) return;
    const idOrdenEmitida = `ORD-${Math.floor(1000 + Math.random() * 9000)}`;
    const datosOrdenEmitida = {
      id_orden: idOrdenEmitida,
      incidencia_id: selectedIncidenciaId,
      incidencia_titulo: incidenciaSeleccionada?.titulo || 'Incidencia de infraestructura',
      id_activo: incidenciaSeleccionada?.id_activo || 'N/A',
      tecnico_id: selectedTecnicoId,
      tecnico_nombre: tecnicoSeleccionado?.nombre || 'Técnico asignado',
      instrucciones: notasInstrucciones.trim(),
      fecha_emision: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      estado: 'Emitida',
      httpStatus: 201,
      endpoint: getAsignarOrdenEndpoint(),
    };

    // El formulario se limpia
    setSelectedIncidenciaId('');
    setSelectedTecnicoId('');
    setNotasInstrucciones('');
    setErrorApi(null);

    // La interfaz refleja que la orden fue emitida
    setOrdenEmitida(datosOrdenEmitida);
    setHistorialEmitidas((prev) => [datosOrdenEmitida, ...prev]);

    asignarTecnicoIncidencia(
      datosOrdenEmitida.incidencia_id,
      datosOrdenEmitida.tecnico_nombre,
      datosOrdenEmitida.instrucciones
    );
    setIncidencias(getIncidencias());

    showToast(`¡Orden ${idOrdenEmitida} emitida con éxito (Simulación 201 Created)!`, 'success');
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Navegación tipo Breadcrumbs */}
      <nav className="flex items-center gap-2 text-sm text-gray-500">
        <Link to="/dashboard" className="hover:text-blue-600 transition-colors">
          Inicio
        </Link>
        <FiChevronRight className="w-3.5 h-3.5" />
        <Link to="/incidencias" className="hover:text-blue-600 transition-colors">
          Incidencias
        </Link>
        <FiChevronRight className="w-3.5 h-3.5" />
        <span className="font-semibold text-gray-900">Asignación de Órdenes</span>
      </nav>

      {/* Banner de Contexto y Encabezado del Supervisor */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
              Asignación de Técnico a Incidencia
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
              Panel de Supervisor
            </span>
          </div>
          <p className="text-gray-600 text-sm mt-1">
            Selecciona la orden de trabajo pendiente y designa a un técnico habilitado de la nómina oficial.
          </p>
        </div>

        {/* Indicador de rol temporal */}
        <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-50 text-amber-800 text-xs font-medium rounded-lg border border-amber-200 self-start md:self-auto">
          <FiShield className="w-4 h-4 text-amber-600 flex-shrink-0" />
          <span>Módulo asignado al rol <strong>Supervisor</strong></span>
        </div>
      </div>

      {/* BANNER PRINCIPAL: Refleja que la orden fue emitida */}
      {ordenEmitida && (
        <div
          id="banner-orden-emitida"
          className="bg-emerald-50 border border-emerald-300 rounded-xl p-5 shadow-sm text-emerald-950 transition-all animate-fadeIn"
        >
          <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div className="p-2.5 bg-emerald-100 text-emerald-700 rounded-xl flex-shrink-0 mt-0.5 shadow-xs">
                <FiCheckCircle className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-bold text-base text-emerald-900">
                    ¡Orden de Trabajo Emitida Exitosamente!
                  </h3>
                  <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-emerald-200 text-emerald-800 border border-emerald-300 font-mono">
                    {ordenEmitida.httpStatus === 201 ? '201 Created' : '200 OK'}
                  </span>
                  <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                    Estado: {ordenEmitida.estado || 'Emitida'}
                  </span>
                </div>
                <p className="text-xs text-emerald-800">
                  La orden de trabajo fue transmitida y registrada a través del API Gateway.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs text-emerald-950 pt-3 border-t border-emerald-200 mt-2.5">
                  <div className="bg-white/80 p-2.5 rounded-lg border border-emerald-200 shadow-2xs">
                    <span className="text-[11px] text-emerald-700 font-medium block">Código Orden</span>
                    <strong className="font-mono text-sm text-gray-900">{ordenEmitida.id_orden}</strong>
                  </div>
                  <div className="bg-white/80 p-2.5 rounded-lg border border-emerald-200 shadow-2xs">
                    <span className="text-[11px] text-emerald-700 font-medium block">Incidencia</span>
                    <strong className="font-mono text-sm text-gray-900">{ordenEmitida.incidencia_id}</strong>
                    <p className="text-[11px] text-gray-600 truncate">{ordenEmitida.incidencia_titulo}</p>
                  </div>
                  <div className="bg-white/80 p-2.5 rounded-lg border border-emerald-200 shadow-2xs">
                    <span className="text-[11px] text-emerald-700 font-medium block">Técnico Designado</span>
                    <strong className="text-sm text-gray-900">{ordenEmitida.tecnico_nombre}</strong>
                  </div>
                  <div className="bg-white/80 p-2.5 rounded-lg border border-emerald-200 shadow-2xs">
                    <span className="text-[11px] text-emerald-700 font-medium block">Hora de Emisión</span>
                    <span className="text-sm font-semibold text-gray-900">{ordenEmitida.fecha_emision}</span>
                  </div>
                </div>
                {ordenEmitida.instrucciones && (
                  <div className="pt-2 text-xs text-emerald-900">
                    <span className="font-semibold">Instrucciones registradas:</span>{' '}
                    <span className="italic">"{ordenEmitida.instrucciones}"</span>
                  </div>
                )}
              </div>
            </div>
            <div className="flex sm:flex-col items-center sm:items-end gap-2 w-full sm:w-auto flex-shrink-0">
              <button
                type="button"
                id="btn-cerrar-banner-emitida"
                onClick={() => setOrdenEmitida(null)}
                className="text-xs px-3.5 py-2 rounded-lg bg-white border border-emerald-300 text-emerald-800 hover:bg-emerald-100 font-medium transition-colors cursor-pointer w-full sm:w-auto text-center"
              >
                Cerrar aviso
              </button>
              <Link
                to="/incidencias"
                id="btn-ir-a-incidencias"
                className="text-xs px-3.5 py-2 rounded-lg bg-emerald-700 text-white hover:bg-emerald-800 font-medium transition-colors cursor-pointer shadow-sm w-full sm:w-auto text-center"
              >
                Ver en Incidencias
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* ALERTA DE ERROR */}
      {errorApi && (
        <div
          id="alerta-error-api"
          className="p-3.5 bg-red-50 border border-red-200 rounded-xl text-red-900 text-xs shadow-sm flex items-center justify-between gap-3 transition-all animate-fadeIn"
        >
          <div className="flex items-center gap-2.5">
            <FiAlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
            <span className="font-bold text-red-800 text-sm">
              Fallo en la comunicacion. ERROR 502
            </span>
          </div>
          <button
            type="button"
            id="btn-simular-201"
            onClick={handleSimular201}
            className="px-3 py-1.5 bg-red-100 hover:bg-red-200 text-red-800 rounded-lg font-semibold text-xs transition-colors cursor-pointer flex-shrink-0"
            title="Permite simular el comportamiento 201 Created localmente"
          >
            Simular respuesta 201 Created
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Formulario Principal de Asignación */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <form onSubmit={handleSubmit} className="space-y-6">

            {/* 1. Selector de Incidencia / Orden */}
            <div>
              <label
                htmlFor="select-incidencia"
                className="block text-sm font-semibold text-gray-800 mb-1.5"
              >
                1. Seleccionar Incidencia u Orden de Trabajo <span className="text-red-500">*</span>
              </label>
              <select
                id="select-incidencia"
                value={selectedIncidenciaId}
                onChange={(e) => setSelectedIncidenciaId(e.target.value)}
                required
                className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-300 rounded-lg text-sm text-gray-900 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all cursor-pointer"
              >
                <option value="">-- Selecciona una incidencia --</option>
                {incidenciasDisponibles.length === 0 ? (
                  <option value="" disabled>No hay incidencias pendientes sin técnico</option>
                ) : (
                  incidenciasDisponibles.map((inc) => (
                    <option key={inc.id} value={inc.id}>
                      [{inc.id}] {inc.titulo}
                    </option>
                  ))
                )}
              </select>
            </div>

            {/* Resumen de la Incidencia Seleccionada */}
            {incidenciaSeleccionada && (
              <div className="p-4 bg-gray-50 rounded-lg border border-gray-200 space-y-2 text-xs">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-gray-900 text-sm font-mono">
                      {incidenciaSeleccionada.id}
                    </span>
                    <span className="text-gray-500 font-medium">
                      {incidenciaSeleccionada.titulo}
                    </span>
                  </div>
                  <StatusBadge status={incidenciaSeleccionada.estado || 'Pendiente'} />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-gray-600 pt-1 border-t border-gray-200">
                  <div className="flex items-center gap-1.5">
                    <FiBox className="text-gray-400" />
                    <span>Activo: <strong>{incidenciaSeleccionada.id_activo || 'N/A'}</strong></span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <FiClock className="text-gray-400" />
                    <span>Asignado actual: <strong>{incidenciaSeleccionada.asignado || 'Sin asignar'}</strong></span>
                  </div>
                </div>
                {incidenciaSeleccionada.descripcion && (
                  <p className="text-gray-500 italic pt-1">
                    "{incidenciaSeleccionada.descripcion}"
                  </p>
                )}
              </div>
            )}

            {/* 2. Selector Desplegable de Técnicos Existentes */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label
                  htmlFor="select-tecnico"
                  className="block text-sm font-semibold text-gray-800"
                >
                  2. Técnico Responsable <span className="text-red-500">*</span>
                </label>
                <span className="text-xs text-gray-500">
                  (Nómina oficial de personal técnico existente)
                </span>
              </div>

              {/* Selector desplegable de técnicos */}
              <select
                id="select-tecnico"
                value={selectedTecnicoId}
                onChange={(e) => setSelectedTecnicoId(e.target.value)}
                required
                className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-300 rounded-lg text-sm text-gray-900 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all cursor-pointer font-medium"
              >
                <option value="">-- Seleccionar técnico disponible --</option>
                {TECNICOS_EXISTENTES.map((tec) => (
                  <option key={tec.id} value={tec.id}>
                    {tec.nombre} — {tec.especialidad} [{tec.disponibilidad} - {tec.turno}]
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-400 mt-1">
                Nota: La nómina de técnicos es gestionada por administración. No es posible crear técnicos nuevos desde esta vista.
              </p>
            </div>

            {/* Ficha rápida del técnico seleccionado */}
            {tecnicoSeleccionado && (
              <div className="p-4 bg-indigo-50/60 rounded-xl border border-indigo-100 flex items-center gap-4 transition-all">
                <div className="w-12 h-12 rounded-full bg-indigo-600 text-white font-bold flex items-center justify-center text-sm shadow-sm flex-shrink-0">
                  {tecnicoSeleccionado.avatar}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h4 className="font-bold text-gray-900 text-sm truncate">
                      {tecnicoSeleccionado.nombre}
                    </h4>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${tecnicoSeleccionado.disponibilidad === 'Disponible'
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : 'bg-amber-50 text-amber-700 border-amber-200'
                      }`}>
                      {tecnicoSeleccionado.disponibilidad}
                    </span>
                  </div>
                  <p className="text-xs text-indigo-900 font-medium mt-0.5">
                    {tecnicoSeleccionado.especialidad}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Turno: {tecnicoSeleccionado.turno}
                  </p>
                </div>
              </div>
            )}

            {/* 3. Instrucciones o Notas del Supervisor (Opcional) */}
            <div>
              <label
                htmlFor="notas-asignacion"
                className="block text-sm font-semibold text-gray-800 mb-1.5"
              >
                3. Instrucciones para el Técnico <span className="text-xs font-normal text-gray-500">(Opcional)</span>
              </label>
              <textarea
                id="notas-asignacion"
                rows={3}
                value={notasInstrucciones}
                onChange={(e) => setNotasInstrucciones(e.target.value)}
                placeholder="Ejemplo: Priorizar la revisión del cableado de red antes del cambio de módulo..."
                className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-300 rounded-lg text-sm text-gray-900 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all placeholder:text-gray-400"
              />
            </div>

            {/* Botón de Asignar Orden */}
            <div className="pt-4 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-4">
              <Link
                to="/incidencias"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium"
              >
                <FiArrowLeft className="w-4 h-4" /> Cancelar y Volver
              </Link>

              <button
                type="submit"
                id="btn-asignar-orden"
                disabled={!isFormValid || isSubmitting}
                className={`w-full sm:w-auto px-6 py-2.5 rounded-lg text-sm font-semibold transition-all shadow-sm flex items-center justify-center gap-2 ${isFormValid && !isSubmitting
                    ? 'bg-indigo-600 hover:bg-indigo-700 text-white cursor-pointer hover:shadow-md'
                    : 'bg-gray-200 text-gray-400 cursor-not-allowed border border-gray-300'
                  }`}
                title={
                  !isFormValid
                    ? 'Debes seleccionar una incidencia y un técnico existente para continuar'
                    : 'Enviar asignación al API Gateway'
                }
              >
                {isSubmitting ? (
                  <>
                    <FiRefreshCw className="w-4 h-4 animate-spin" />
                    <span>Emitiendo Orden...</span>
                  </>
                ) : (
                  <>
                    <FiSend className="w-4 h-4" />
                    <span>Asignar Orden</span>
                  </>
                )}
              </button>
            </div>

            {/* Aviso auxiliar si el botón está deshabilitado */}
            {!isFormValid && !ordenEmitida && (
              <p className="text-xs text-amber-600 flex items-center gap-1.5 justify-end">
                <FiAlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                Por favor selecciona una orden y un técnico para habilitar el botón "Asignar Orden".
              </p>
            )}
          </form>
        </div>

        {/* Panel Lateral: Nómina de Técnicos y Órdenes Emitidas */}
        <div className="space-y-6">
          {/* Card: Historial de Órdenes Emitidas en la sesión */}
          {historialEmitidas.length > 0 && (
            <div
              id="seccion-ordenes-emitidas"
              className="bg-white rounded-xl shadow-sm border border-emerald-200 p-5 space-y-3"
            >
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-gray-900 text-sm flex items-center gap-2">
                  <FiCheckCircle className="text-emerald-600 w-4 h-4" />
                  Órdenes Emitidas
                </h3>
                <span className="text-[11px] bg-emerald-100 text-emerald-800 font-semibold px-2 py-0.5 rounded-full">
                  {historialEmitidas.length} emitidas
                </span>
              </div>

              <div className="space-y-2">
                {historialEmitidas.map((ord) => (
                  <div
                    key={ord.id_orden}
                    className="p-3 bg-emerald-50/60 rounded-lg border border-emerald-100 text-xs space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold font-mono text-emerald-900">{ord.id_orden}</span>
                      <span className="px-1.5 py-0.5 rounded bg-emerald-200 text-emerald-800 font-semibold text-[10px]">
                        {ord.estado}
                      </span>
                    </div>
                    <p className="text-gray-700">
                      Incidencia: <span className="font-mono font-medium">{ord.incidencia_id}</span>
                    </p>
                    <p className="text-gray-600">
                      Técnico: <span className="font-medium text-gray-900">{ord.tecnico_nombre}</span>
                    </p>
                    <p className="text-[10px] text-gray-400">Emitida a las: {ord.fecha_emision}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Card: Lista de Técnicos Existentes en Nómina */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-gray-900 text-sm flex items-center gap-2">
                <FiUserCheck className="text-indigo-600 w-4 h-4" />
                Técnicos Existentes
              </h3>
              <span className="text-[11px] bg-gray-100 text-gray-600 font-semibold px-2 py-0.5 rounded-full">
                {TECNICOS_EXISTENTES.length} Registrados
              </span>
            </div>

            <div className="divide-y divide-gray-100">
              {TECNICOS_EXISTENTES.map((tec) => (
                <div
                  key={tec.id}
                  onClick={() => setSelectedTecnicoId(tec.id)}
                  className={`py-2.5 px-2 rounded-lg flex items-center justify-between cursor-pointer transition-colors ${selectedTecnicoId === tec.id
                      ? 'bg-indigo-50 border border-indigo-200'
                      : 'hover:bg-gray-50'
                    }`}
                  title="Haz clic para seleccionarlo en el formulario"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-7 h-7 rounded-full bg-gray-200 text-gray-700 text-xs font-bold flex items-center justify-center flex-shrink-0">
                      {tec.avatar}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-gray-900 truncate">
                        {tec.nombre}
                      </p>
                      <p className="text-[11px] text-gray-500 truncate">
                        {tec.especialidad}
                      </p>
                    </div>
                  </div>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium flex-shrink-0 ${tec.disponibilidad === 'Disponible'
                      ? 'bg-emerald-50 text-emerald-700'
                      : 'bg-amber-50 text-amber-700'
                    }`}>
                    {tec.disponibilidad}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AsignarTecnico;

