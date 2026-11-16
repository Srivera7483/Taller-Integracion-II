import React, { useState, useEffect } from 'react';
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
  FiRefreshCw,
  FiRepeat
} from 'react-icons/fi';
import StatusBadge from '../components/StatusBadge';
import { useToast } from '../context/ToastContext';
import api from '../services/api';
import { isKillSwitchError } from '../services/killSwitchService';
import { useDraftState } from '../hooks/useDraftState';

const ESTADOS_CERRADOS = ['resuelta', 'completada', 'cerrada', 'rechazada', 'cancelada'];

const AsignarTecnico = () => {
  const [searchParams] = useSearchParams();
  const { showToast } = useToast();

  const [incidencias, setIncidencias] = useState([]);
  const [tecnicos, setTecnicos] = useState([]);
  const [loadingDatos, setLoadingDatos] = useState(true);

  // Formularios y envíos (TAL-188: borradores locales que sobreviven a la pantalla de mantenimiento)
  const [selectedIncidenciaId, setSelectedIncidenciaId] = useDraftState('asignacion', 'incidenciaId', '');
  const [selectedTecnicoId, setSelectedTecnicoId] = useDraftState('asignacion', 'tecnicoId', '');
  const [notasInstrucciones, setNotasInstrucciones] = useDraftState('asignacion', 'notas', '');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [ordenEmitida, setOrdenEmitida] = useState(null);
  const [errorApi, setErrorApi] = useState(null);

  const cargarDatosReales = async () => {
    try {
      setLoadingDatos(true);
      setErrorApi(null);

      // 1. Obtener Incidencias reales de PostgreSQL
      try {
        const resIncidencias = await api.get('/incidencias?limite=50');
        const dataInc = resIncidencias.data?.datos || resIncidencias.data?.data || resIncidencias.data || [];
        setIncidencias(Array.isArray(dataInc) ? dataInc : []);
      } catch (errInc) {
        console.error('Error cargando incidencias:', errInc.response?.data || errInc);
        const msgInc = errInc.response?.data?.message;
        setErrorApi(
          `No se pudieron cargar las incidencias (${Array.isArray(msgInc) ? msgInc.join(', ') : msgInc || errInc.message}).`
        );
        setIncidencias([]);
      }

      // 2. Obtener Usuarios reales desde ms-auth vía API Gateway
      let dataUsuarios = [];
      let ultimoError = null;
      const endpointsAProbar = ['/usuarios?limit=100', '/usuarios', '/auth/usuarios?limit=100', '/auth/usuarios'];

      for (const endpoint of endpointsAProbar) {
        try {
          const res = await api.get(endpoint);
          const extraidos = res.data?.datos || res.data?.data || res.data?.usuarios || res.data || [];
          if (Array.isArray(extraidos) && extraidos.length > 0) {
            dataUsuarios = extraidos;
            break;
          }
        } catch (errEp) {
          ultimoError = errEp.response
            ? `HTTP ${errEp.response.status}: ${errEp.response.data?.message || errEp.response.statusText}`
            : errEp.message;
        }
      }

      if (dataUsuarios.length === 0) {
        setTecnicos([]);
        setErrorApi(
          ultimoError
            ? `No se pudieron cargar los técnicos (${ultimoError}).`
            : 'No se encontraron usuarios registrados en la base de datos.'
        );
        return;
      }

      const listaTecnicos = dataUsuarios.filter((u) => {
        if (u.activo === false) return false;
        const rolRaw = u.rol || u.roles || u.tipo_usuario || u.nombre_rol || '';
        const rolTexto = JSON.stringify(rolRaw)
          .toUpperCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '');
        return rolTexto.includes('TECNICO');
      });

      setTecnicos(listaTecnicos);
    } catch (error) {
      console.error('Error general en consulta de BD:', error);
      setErrorApi('Error al establecer conexión con los microservicios.');
      setTecnicos([]);
    } finally {
      setLoadingDatos(false);
    }
  };

  useEffect(() => {
    cargarDatosReales();
  }, []);

  // Preseleccionar incidencia enviada vía query param (?incidenciaId=...)
  useEffect(() => {
    const queryIncId = searchParams.get('incidenciaId');
    if (queryIncId && incidencias.length > 0) {
      const encontrada = incidencias.find((i) => i.id_incidencia === queryIncId);
      if (encontrada) {
        const estadoStr = (typeof encontrada.estado === 'object' ? encontrada.estado?.nombre_estado : encontrada.estado || '').toLowerCase();
        if (!ESTADOS_CERRADOS.includes(estadoStr)) {
          setSelectedIncidenciaId(queryIncId);
        }
      }
    }
  }, [searchParams, incidencias]);

  // Todas las incidencias abiertas (tanto sin asignar como asignadas para reasignación)
  const incidenciasGestionables = incidencias.filter((inc) => {
    const estadoStr = (typeof inc.estado === 'object' ? inc.estado?.nombre_estado : inc.estado || '').toLowerCase();
    return !ESTADOS_CERRADOS.includes(estadoStr);
  });

  const incidenciaSeleccionada = incidencias.find((item) => item.id_incidencia === selectedIncidenciaId);
  const idTecnicoActualIncidencia =
    incidenciaSeleccionada?.id_tecnico_asignado ||
    incidenciaSeleccionada?.ordenes_trabajo?.[0]?.id_tecnico ||
    (typeof incidenciaSeleccionada?.tecnico_asignado === 'string' && incidenciaSeleccionada.tecnico_asignado.includes('-')
      ? incidenciaSeleccionada.tecnico_asignado
      : null);

  const esReasignacion = Boolean(idTecnicoActualIncidencia);
  const tecnicoActualObj = tecnicos.find((t) => (t.id_usuario || t.id) === idTecnicoActualIncidencia);
  const nombreTecnicoActual = tecnicoActualObj
    ? `${tecnicoActualObj.nombre || ''} ${tecnicoActualObj.apellido || ''}`.trim()
    : idTecnicoActualIncidencia
      ? `ID: ${idTecnicoActualIncidencia.substring(0, 8)}...`
      : null;

  const tecnicoSeleccionado = tecnicos.find((t) => (t.id_usuario || t.id) === selectedTecnicoId);
  const mismoTecnicoSeleccionado = Boolean(
    esReasignacion && selectedTecnicoId && selectedTecnicoId === idTecnicoActualIncidencia
  );

  const isFormValid = Boolean(selectedIncidenciaId && selectedTecnicoId && !mismoTecnicoSeleccionado);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isFormValid || isSubmitting) return;

    setIsSubmitting(true);
    setErrorApi(null);

    const payload = {
      id_incidencia: selectedIncidenciaId,
      id_tecnico: selectedTecnicoId,
      ...(notasInstrucciones.trim() ? { diagnostico_tecnico: notasInstrucciones.trim() } : {}),
    };

    try {
      const res = await api.post('/ordenes-trabajo/asignar', payload);
      const idOrdenEmitida = res.data?.id_orden || `ORD-${selectedIncidenciaId.substring(0, 8)}`;

      const datosOrdenEmitida = {
        id_orden: idOrdenEmitida,
        incidencia_id: selectedIncidenciaId,
        incidencia_titulo: incidenciaSeleccionada?.titulo || 'Incidencia de infraestructura',
        tecnico_id: selectedTecnicoId,
        tecnico_nombre: tecnicoSeleccionado
          ? `${tecnicoSeleccionado.nombre || ''} ${tecnicoSeleccionado.apellido || ''}`.trim()
          : 'Técnico asignado',
        es_reasignacion: esReasignacion,
        fecha_emision: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        httpStatus: res.status || 201,
      };

      setSelectedIncidenciaId('');
      setSelectedTecnicoId('');
      setNotasInstrucciones('');
      setOrdenEmitida(datosOrdenEmitida);

      showToast(
        esReasignacion
          ? `¡Incidencia reasignada exitosamente (Orden ${idOrdenEmitida.substring(0, 8)}...)!`
          : `¡Orden ${idOrdenEmitida.substring(0, 8)}... asignada exitosamente!`,
        'success'
      );
      await cargarDatosReales();
    } catch (error) {
      if (isKillSwitchError(error)) {
        return;
      }
      const mensajeError =
        error.response?.data?.message || 'Fallo al registrar la asignación en el servidor.';
      setErrorApi(Array.isArray(mensajeError) ? mensajeError.join(', ') : mensajeError);
      showToast('No se pudo completar la asignación', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <nav className="flex items-center gap-2 text-sm text-gray-500">
        <Link to="/dashboard" className="hover:text-primary transition-colors">Inicio</Link>
        <FiChevronRight className="w-3.5 h-3.5" />
        <Link to="/incidencias" className="hover:text-primary transition-colors">Incidencias</Link>
        <FiChevronRight className="w-3.5 h-3.5" />
        <span className="font-semibold text-gray-900">
          {esReasignacion ? 'Reasignación de Técnico' : 'Asignación de Órdenes'}
        </span>
      </nav>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
              {esReasignacion ? 'Reasignar Técnico a Incidencia' : 'Asignación de Técnico a Incidencia'}
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-primary-50 text-primary border border-primary-200">
              Panel de Supervisor
            </span>
          </div>
          <p className="text-gray-600 text-sm mt-1">
            Asigna o reasigna incidencias activas a técnicos registrados en la base de datos.
          </p>
        </div>

        <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-50 text-amber-800 text-xs font-medium rounded-lg border border-amber-200 self-start md:self-auto">
          <FiShield className="w-4 h-4 text-amber-600 flex-shrink-0" />
          <span>Rol <strong>Supervisor / Administrador</strong></span>
        </div>
      </div>

      {ordenEmitida && (
        <div id="banner-orden-emitida" className="bg-emerald-50 border border-emerald-300 rounded-xl p-5 shadow-sm text-emerald-950">
          <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div className="p-2.5 bg-emerald-100 text-emerald-700 rounded-xl flex-shrink-0 mt-0.5">
                <FiCheckCircle className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-bold text-base text-emerald-900">
                    {ordenEmitida.es_reasignacion
                      ? '¡Reasignación Registrada en PostgreSQL!'
                      : '¡Orden de Trabajo Registrada en PostgreSQL!'}
                  </h3>
                  <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-emerald-200 text-emerald-800 font-mono">
                    {ordenEmitida.httpStatus} CREATED
                  </span>
                </div>
                <p className="text-xs text-emerald-800">
                  La orden quedó vinculada al técnico y registrada en la trazabilidad de la incidencia.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs pt-2">
                  <div className="bg-white/80 p-2.5 rounded-lg border border-emerald-200">
                    <span className="text-[11px] text-emerald-700 font-medium block">ID Orden</span>
                    <strong className="font-mono text-gray-900">{ordenEmitida.id_orden.substring(0, 12)}...</strong>
                  </div>
                  <div className="bg-white/80 p-2.5 rounded-lg border border-emerald-200">
                    <span className="text-[11px] text-emerald-700 font-medium block">Técnico Designado</span>
                    <strong className="text-gray-900">{ordenEmitida.tecnico_nombre}</strong>
                  </div>
                  <div className="bg-white/80 p-2.5 rounded-lg border border-emerald-200">
                    <span className="text-[11px] text-emerald-700 font-medium block">Hora de Emisión</span>
                    <strong className="text-gray-900">{ordenEmitida.fecha_emision}</strong>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex sm:flex-col items-center sm:items-end gap-2 w-full sm:w-auto">
              <button
                type="button"
                onClick={() => setOrdenEmitida(null)}
                className="text-xs px-3.5 py-2 rounded-lg bg-white border border-emerald-300 text-emerald-800 hover:bg-emerald-100 font-medium cursor-pointer w-full sm:w-auto"
              >
                Cerrar aviso
              </button>
              <Link
                to={`/incidencias/${ordenEmitida.incidencia_id}`}
                className="text-xs px-3.5 py-2 rounded-lg bg-emerald-700 text-white hover:bg-emerald-800 font-medium w-full sm:w-auto text-center"
              >
                Ver Detalle
              </Link>
            </div>
          </div>
        </div>
      )}

      {errorApi && (
        <div id="alerta-error-api" className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-900 text-xs shadow-sm flex items-start justify-between gap-3">
          <div className="flex items-start gap-2.5">
            <FiAlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-red-800 text-sm">Error en la operación</p>
              <p className="mt-0.5 text-red-700">{errorApi}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={cargarDatosReales}
            className="px-3 py-1.5 bg-white border border-red-300 text-red-800 font-semibold rounded-lg hover:bg-red-100 flex items-center gap-1.5 flex-shrink-0 cursor-pointer"
          >
            <FiRefreshCw className="w-3.5 h-3.5" /> Reintentar
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          {loadingDatos ? (
            <div className="py-12 text-center text-gray-500">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent mx-auto mb-3" />
              <p className="text-sm font-medium">Consultando incidencias y técnicos en la base de datos...</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label htmlFor="select-incidencia" className="block text-sm font-semibold text-gray-800 mb-1.5">
                  1. Seleccionar Incidencia Activa <span className="text-red-500">*</span>
                </label>
                <select
                  id="select-incidencia"
                  value={selectedIncidenciaId}
                  onChange={(e) => {
                    setSelectedIncidenciaId(e.target.value);
                    setSelectedTecnicoId('');
                  }}
                  required
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-300 rounded-lg text-sm text-gray-900 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none cursor-pointer"
                >
                  <option value="">-- Selecciona una incidencia --</option>
                  {incidenciasGestionables.map((inc) => {
                    const tieneTec = Boolean(inc.id_tecnico_asignado || inc.ordenes_trabajo?.length);
                    return (
                      <option key={inc.id_incidencia} value={inc.id_incidencia}>
                        [{inc.id_incidencia.substring(0, 8)}] {inc.titulo} {tieneTec ? '(Ya asignada — Reasignar)' : '(Sin asignar)'}
                      </option>
                    );
                  })}
                </select>
              </div>

              {incidenciaSeleccionada && (
                <div className="p-4 bg-gray-50 rounded-lg border border-gray-200 space-y-2.5 text-xs">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-bold text-gray-900 text-sm">
                      {incidenciaSeleccionada.titulo}
                    </span>
                    <StatusBadge status={incidenciaSeleccionada.estado?.nombre_estado || incidenciaSeleccionada.estado || 'Reportada'} />
                  </div>

                  {esReasignacion && (
                    <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-lg text-amber-900 flex items-center gap-2">
                      <FiRepeat className="w-4 h-4 text-amber-600 flex-shrink-0" />
                      <span>
                        <strong>Modo Reasignación:</strong> Actualmente asignada a{' '}
                        <strong className="underline">{nombreTecnicoActual}</strong>. Al confirmar, la orden pasará al nuevo técnico.
                      </span>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-gray-600 pt-1 border-t border-gray-200">
                    <div className="flex items-center gap-1.5">
                      <FiBox className="text-gray-400" />
                      <span>Activo: <strong>{incidenciaSeleccionada.id_activo ? incidenciaSeleccionada.id_activo.substring(0, 8) : 'N/A'}</strong></span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <FiClock className="text-gray-400" />
                      <span>Reportado: <strong>{incidenciaSeleccionada.fecha_creacion ? new Date(incidenciaSeleccionada.fecha_creacion).toLocaleDateString() : 'Reciente'}</strong></span>
                    </div>
                  </div>
                </div>
              )}

              <div>
                <label htmlFor="select-tecnico" className="block text-sm font-semibold text-gray-800 mb-1.5">
                  2. {esReasignacion ? 'Nuevo Técnico Responsable' : 'Técnico Responsable'} <span className="text-red-500">*</span>
                </label>
                <select
                  id="select-tecnico"
                  value={selectedTecnicoId}
                  onChange={(e) => setSelectedTecnicoId(e.target.value)}
                  required
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-300 rounded-lg text-sm text-gray-900 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none cursor-pointer font-medium"
                >
                  <option value="">-- Seleccionar técnico registrado --</option>
                  {tecnicos.map((tec) => {
                    const idTec = tec.id_usuario || tec.id;
                    const nombreCompleto = `${tec.nombre || ''} ${tec.apellido || ''}`.trim() || tec.correo || 'Técnico';
                    const correo = tec.correo || tec.email || '';
                    const esElActual = idTec === idTecnicoActualIncidencia;
                    return (
                      <option key={idTec} value={idTec} disabled={esElActual}>
                        {nombreCompleto} {correo ? `(${correo})` : ''} {esElActual ? '— [Asignado actualmente]' : ''}
                      </option>
                    );
                  })}
                </select>
                {mismoTecnicoSeleccionado && (
                  <p className="text-xs text-red-600 mt-1">
                    Debes elegir un técnico distinto al que ya tiene asignada esta incidencia.
                  </p>
                )}
              </div>

              <div>
                <label htmlFor="notas-asignacion" className="block text-sm font-semibold text-gray-800 mb-1.5">
                  3. Instrucciones o Motivo de {esReasignacion ? 'Reasignación' : 'Asignación'}{' '}
                  <span className="text-xs font-normal text-gray-500">(Opcional)</span>
                </label>
                <textarea
                  id="notas-asignacion"
                  rows={3}
                  value={notasInstrucciones}
                  onChange={(e) => setNotasInstrucciones(e.target.value)}
                  placeholder="Ejemplo: Priorizar revisión en terreno o indicar contexto técnico..."
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-300 rounded-lg text-sm text-gray-900 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                />
              </div>

              <div className="pt-4 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-4">
                <Link
                  to="/incidencias"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm font-medium"
                >
                  <FiArrowLeft className="w-4 h-4" /> Cancelar y Volver
                </Link>

                <button
                  type="submit"
                  disabled={!isFormValid || isSubmitting}
                  className={`w-full sm:w-auto px-6 py-2.5 rounded-lg text-sm font-semibold transition-all shadow-md flex items-center justify-center gap-2 ${
                    isFormValid && !isSubmitting
                      ? 'bg-primary hover:bg-primary-hover text-white cursor-pointer'
                      : 'bg-gray-200 text-gray-400 cursor-not-allowed border border-gray-300'
                  }`}
                >
                  {isSubmitting ? (
                    <>
                      <FiRefreshCw className="w-4 h-4 animate-spin" />
                      <span>Guardando...</span>
                    </>
                  ) : (
                    <>
                      {esReasignacion ? <FiRepeat className="w-4 h-4" /> : <FiSend className="w-4 h-4" />}
                      <span>{esReasignacion ? 'Confirmar Reasignación' : 'Asignar Orden'}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-gray-900 text-sm flex items-center gap-2">
              <FiUserCheck className="text-primary w-4 h-4" />
              Técnicos Disponibles
            </h3>
            <span className="text-[11px] bg-gray-100 text-gray-600 font-semibold px-2 py-0.5 rounded-full">
              {tecnicos.length} Activos
            </span>
          </div>

          <div className="divide-y divide-gray-100 max-h-[380px] overflow-y-auto">
            {tecnicos.length === 0 ? (
              <p className="text-xs text-gray-500 py-4 text-center">Sin técnicos activos en la BD</p>
            ) : (
              tecnicos.map((tec) => {
                const idTec = tec.id_usuario || tec.id;
                const nombreCompleto = `${tec.nombre || ''} ${tec.apellido || ''}`.trim() || 'Técnico';
                const correo = tec.correo || tec.email || '';
                const isSelected = selectedTecnicoId === idTec;
                const esElActual = idTec === idTecnicoActualIncidencia;

                return (
                  <button
                    key={idTec}
                    type="button"
                    disabled={esElActual}
                    onClick={() => setSelectedTecnicoId(idTec)}
                    className={`w-full text-left py-2.5 px-2.5 rounded-lg flex items-center justify-between transition-colors ${
                      esElActual
                        ? 'opacity-50 cursor-not-allowed bg-gray-50'
                        : isSelected
                          ? 'bg-primary-50 border border-primary-200 cursor-pointer'
                          : 'hover:bg-gray-50 cursor-pointer'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-7 h-7 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center flex-shrink-0">
                        {nombreCompleto.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-gray-900 truncate">{nombreCompleto}</p>
                        <p className="text-[11px] text-gray-500 truncate">{correo}</p>
                      </div>
                    </div>
                    {esElActual && (
                      <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-amber-100 text-amber-800">
                        Actual
                      </span>
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AsignarTecnico;