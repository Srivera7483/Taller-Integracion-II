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
  FiRefreshCw
} from 'react-icons/fi';
import StatusBadge from '../components/StatusBadge';
import { useToast } from '../context/ToastContext';
import api from '../services/api';

const AsignarTecnico = () => {
  const [searchParams] = useSearchParams();
  const { showToast } = useToast();

  // Estados cargados estrictamente desde la Base de Datos
  const [incidencias, setIncidencias] = useState([]);
  const [tecnicos, setTecnicos] = useState([]);
  const [loadingDatos, setLoadingDatos] = useState(true);

  // Formularios y envíos
  const [selectedIncidenciaId, setSelectedIncidenciaId] = useState('');
  const [selectedTecnicoId, setSelectedTecnicoId] = useState('');
  const [notasInstrucciones, setNotasInstrucciones] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Estados de respuesta de la API
  const [ordenEmitida, setOrdenEmitida] = useState(null);
  const [errorApi, setErrorApi] = useState(null);

  // Consulta directa a microservicios/PostgreSQL
  const cargarDatosReales = async () => {
    try {
      setLoadingDatos(true);
      setErrorApi(null);

      // 1. Obtener Incidencias
      try {
        const resIncidencias = await api.get('/incidencias?limite=50');
        const dataInc = resIncidencias.data?.datos || resIncidencias.data?.data || resIncidencias.data || [];
        setIncidencias(Array.isArray(dataInc) ? dataInc : []);
      } catch (errInc) {
        console.error('Error cargando incidencias de la BD:', errInc);
        setIncidencias([]);
      }

      // 2. Obtener Usuarios de la BD consultando endpoints estándar
      let dataUsuarios = [];
      let ultimoError = null;

      const endpointsAProbar = [
        '/usuarios?limit=100',
        '/usuarios',
        '/auth/usuarios?limit=100',
        '/auth/usuarios',
        '/incidencias/tecnicos'
      ];

      for (const endpoint of endpointsAProbar) {
        try {
          const res = await api.get(endpoint);
          const extraidos = res.data?.datos || res.data?.data || res.data?.usuarios || res.data || [];
          if (Array.isArray(extraidos) && extraidos.length > 0) {
            dataUsuarios = extraidos;
            break;
          }
        } catch (errEp) {
          if (errEp.response) {
            ultimoError = `HTTP ${errEp.response.status}: ${errEp.response.data?.message || errEp.response.statusText}`;
          } else {
            ultimoError = errEp.message;
          }
        }
      }

      // Si no se obtuvieron usuarios de ningún endpoint real
      if (dataUsuarios.length === 0) {
        setTecnicos([]);
        setErrorApi(
          ultimoError 
            ? `No se pudieron cargar los usuarios de la BD (${ultimoError}). Verifica tus permisos de acceso o el token JWT.`
            : 'No se encontraron usuarios registrados en la base de datos.'
        );
        return;
      }

      // 3. Filtrar los usuarios obtenidos de la BD que tengan rol de Técnico
      let listaFiltrada = dataUsuarios.filter((u) => {
        const rolRaw = u.rol || u.roles || u.tipo_usuario || u.nombre_rol || '';
        const rolTexto = JSON.stringify(rolRaw)
          .toUpperCase()
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "");

        return rolTexto.includes('TECNICO');
      });

      // Si la BD devolvió usuarios reales pero ninguno tiene la etiqueta 'TECNICO', se muestran los usuarios reales obtenidos
      if (listaFiltrada.length === 0 && dataUsuarios.length > 0) {
        console.warn('Usuarios obtenidos de la BD sin coincidencia de rol TECNICO. Cargando nómina real completa.');
        listaFiltrada = dataUsuarios;
      }

      setTecnicos(listaFiltrada);
    } catch (error) {
      console.error('Error general en consulta de la BD:', error);
      setErrorApi('Error al establecer conexión con la API de usuarios.');
      setTecnicos([]);
    } finally {
      setLoadingDatos(false);
    }
  };

  useEffect(() => {
    cargarDatosReales();
  }, []);

  // Preseleccionar la incidencia enviada vía URL query string
  useEffect(() => {
    const queryIncId = searchParams.get('incidenciaId');
    if (queryIncId && incidencias.length > 0) {
      const existe = incidencias.some((i) => i.id_incidencia === queryIncId);
      if (existe) {
        setSelectedIncidenciaId(queryIncId);
      }
    }
  }, [searchParams, incidencias]);

  // Filtrar incidencias no resueltas ni asignadas
  const incidenciasDisponibles = incidencias.filter((inc) => {
    const estadoStr = (typeof inc.estado === 'object' ? inc.estado?.nombre_estado : inc.estado || '').toLowerCase();
    const esCompletada = ['resuelta', 'completada', 'cerrada'].includes(estadoStr);
    return !esCompletada && !inc.tecnico_asignado;
  });

  const incidenciaSeleccionada = incidencias.find((item) => item.id_incidencia === selectedIncidenciaId);
  const tecnicoSeleccionado = tecnicos.find((t) => (t.id_usuario || t.id) === selectedTecnicoId);

  const isFormValid = Boolean(selectedIncidenciaId && selectedTecnicoId);

  // Procesar Asignación en la Base de Datos
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isFormValid || isSubmitting) return;

    setIsSubmitting(true);
    setErrorApi(null);

    const payload = {
      id_incidencia: selectedIncidenciaId,
      incidencia_id: selectedIncidenciaId,
      id_tecnico: selectedTecnicoId,
      tecnico_id: selectedTecnicoId,
      instrucciones: notasInstrucciones.trim(),
    };

    try {
      let res;
      try {
        res = await api.post('/ordenes-trabajo', payload);
      } catch {
        res = await api.post('/incidencias/ordenes-trabajo/asignar', payload);
      }

      const idOrdenEmitida = res.data?.id_orden || res.data?.id_orden_trabajo || res.data?.id || `ORD-${selectedIncidenciaId.substring(0, 8)}`;

      const datosOrdenEmitida = {
        id_orden: idOrdenEmitida,
        incidencia_id: selectedIncidenciaId,
        incidencia_titulo: incidenciaSeleccionada?.titulo || 'Incidencia de infraestructura',
        id_activo: incidenciaSeleccionada?.id_activo || 'N/A',
        tecnico_id: selectedTecnicoId,
        tecnico_nombre: tecnicoSeleccionado ? `${tecnicoSeleccionado.nombre || ''} ${tecnicoSeleccionado.apellido || ''}`.trim() : 'Técnico asignado',
        instrucciones: payload.instrucciones,
        fecha_emision: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        estado: res.data?.estado || 'Asignada',
        httpStatus: res.status || 201,
      };

      setSelectedIncidenciaId('');
      setSelectedTecnicoId('');
      setNotasInstrucciones('');
      setErrorApi(null);

      setOrdenEmitida(datosOrdenEmitida);
      showToast(`¡Orden ${idOrdenEmitida} asignada exitosamente en BD!`, 'success');
      cargarDatosReales();
    } catch (error) {
      console.error('Error al emitir orden en la BD:', error);
      const mensajeError = error.response?.data?.message || 'Fallo al intentar registrar la orden en el backend.';
      setErrorApi(mensajeError);
      showToast(mensajeError, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Breadcrumbs */}
      <nav className="flex items-center gap-2 text-sm text-gray-500">
        <Link to="/dashboard" className="hover:text-primary transition-colors">
          Inicio
        </Link>
        <FiChevronRight className="w-3.5 h-3.5" />
        <Link to="/incidencias" className="hover:text-primary transition-colors">
          Incidencias
        </Link>
        <FiChevronRight className="w-3.5 h-3.5" />
        <span className="font-semibold text-gray-900">Asignación de Órdenes</span>
      </nav>

      {/* Encabezado */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
              Asignación de Técnico a Incidencia
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-primary-50 text-primary border border-primary-200">
              Panel de Supervisor
            </span>
          </div>
          <p className="text-gray-600 text-sm mt-1">
            Selecciona una incidencia reportada y asígnala a un técnico registrado en el sistema.
          </p>
        </div>

        <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-50 text-amber-800 text-xs font-medium rounded-lg border border-amber-200 self-start md:self-auto">
          <FiShield className="w-4 h-4 text-amber-600 flex-shrink-0" />
          <span>Módulo asignado al rol <strong>Supervisor / Administrador</strong></span>
        </div>
      </div>

      {/* Banner de Orden Emitida */}
      {ordenEmitida && (
        <div id="banner-orden-emitida" className="bg-emerald-50 border border-emerald-300 rounded-xl p-5 shadow-sm text-emerald-950 transition-all">
          <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div className="p-2.5 bg-emerald-100 text-emerald-700 rounded-xl flex-shrink-0 mt-0.5 shadow-xs">
                <FiCheckCircle className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-bold text-base text-emerald-900">
                    ¡Orden de Trabajo Registrada en PostgreSQL!
                  </h3>
                  <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-emerald-200 text-emerald-800 border border-emerald-300 font-mono">
                    {ordenEmitida.httpStatus} OK
                  </span>
                </div>
                <p className="text-xs text-emerald-800">
                  La asignación fue insertada correctamente en la base de datos.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs text-emerald-950 pt-3 border-t border-emerald-200 mt-2.5">
                  <div className="bg-white/80 p-2.5 rounded-lg border border-emerald-200 shadow-2xs">
                    <span className="text-[11px] text-emerald-700 font-medium block">Código Orden</span>
                    <strong className="font-mono text-sm text-gray-900">{ordenEmitida.id_orden}</strong>
                  </div>
                  <div className="bg-white/80 p-2.5 rounded-lg border border-emerald-200 shadow-2xs">
                    <span className="text-[11px] text-emerald-700 font-medium block">Incidencia</span>
                    <strong className="font-mono text-sm text-gray-900">{ordenEmitida.incidencia_id.substring(0, 8)}...</strong>
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
              </div>
            </div>
            <div className="flex sm:flex-col items-center sm:items-end gap-2 w-full sm:w-auto flex-shrink-0">
              <button
                type="button"
                onClick={() => setOrdenEmitida(null)}
                className="text-xs px-3.5 py-2 rounded-lg bg-white border border-emerald-300 text-emerald-800 hover:bg-emerald-100 font-medium transition-colors cursor-pointer w-full sm:w-auto text-center"
              >
                Cerrar aviso
              </button>
              <Link
                to="/incidencias"
                className="text-xs px-3.5 py-2 rounded-lg bg-emerald-700 text-white hover:bg-emerald-800 font-medium transition-colors cursor-pointer shadow-sm w-full sm:w-auto text-center"
              >
                Ver en Incidencias
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Alerta de Error HTTP/API */}
      {errorApi && (
        <div id="alerta-error-api" className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-900 text-xs shadow-sm flex items-start justify-between gap-3">
          <div className="flex items-start gap-2.5">
            <FiAlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-red-800 text-sm">Error al obtener usuarios de la Base de Datos</p>
              <p className="mt-0.5 text-red-700">{errorApi}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={cargarDatosReales}
            className="px-3 py-1.5 bg-white border border-red-300 text-red-800 font-semibold rounded-lg hover:bg-red-100 flex items-center gap-1.5 flex-shrink-0 transition-colors"
          >
            <FiRefreshCw className="w-3.5 h-3.5" /> Reintentar
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Formulario Principal */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          {loadingDatos ? (
            <div className="py-12 text-center text-gray-500">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent mx-auto mb-3"></div>
              <p className="text-sm font-medium">Consultando microservicios y base de datos...</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* 1. Selector de Incidencia */}
              <div>
                <label htmlFor="select-incidencia" className="block text-sm font-semibold text-gray-800 mb-1.5">
                  1. Seleccionar Incidencia u Orden Pendiente <span className="text-red-500">*</span>
                </label>
                <select
                  id="select-incidencia"
                  value={selectedIncidenciaId}
                  onChange={(e) => setSelectedIncidenciaId(e.target.value)}
                  required
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-300 rounded-lg text-sm text-gray-900 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all cursor-pointer"
                >
                  <option value="">-- Selecciona una incidencia --</option>
                  {incidenciasDisponibles.length === 0 ? (
                    <option value="" disabled>No hay incidencias pendientes sin técnico</option>
                  ) : (
                    incidenciasDisponibles.map((inc) => (
                      <option key={inc.id_incidencia} value={inc.id_incidencia}>
                        [{inc.id_incidencia.substring(0, 8)}...] {inc.titulo}
                      </option>
                    ))
                  )}
                </select>
              </div>

              {/* Resumen Incidencia Seleccionada */}
              {incidenciaSeleccionada && (
                <div className="p-4 bg-gray-50 rounded-lg border border-gray-200 space-y-2 text-xs">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-gray-900 text-sm font-mono">
                        {incidenciaSeleccionada.id_incidencia.substring(0, 12)}...
                      </span>
                      <span className="text-gray-700 font-medium">
                        {incidenciaSeleccionada.titulo}
                      </span>
                    </div>
                    <StatusBadge status={incidenciaSeleccionada.estado?.nombre_estado || incidenciaSeleccionada.estado || 'Pendiente'} />
                  </div>
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

              {/* 2. Selector de Técnico Real (BD) */}
              <div>
                <label htmlFor="select-tecnico" className="block text-sm font-semibold text-gray-800 mb-1.5">
                  2. Técnico Responsable <span className="text-red-500">*</span>
                </label>
                <select
                  id="select-tecnico"
                  value={selectedTecnicoId}
                  onChange={(e) => setSelectedTecnicoId(e.target.value)}
                  required
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-300 rounded-lg text-sm text-gray-900 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all cursor-pointer font-medium"
                >
                  <option value="">-- Seleccionar técnico de la BD --</option>
                  {tecnicos.length === 0 ? (
                    <option value="" disabled>No hay técnicos disponibles en la base de datos</option>
                  ) : (
                    tecnicos.map((tec) => {
                      const idTec = tec.id_usuario || tec.id;
                      const nombreCompleto = `${tec.nombre || ''} ${tec.apellido || ''}`.trim() || tec.correo || tec.email || 'Técnico';
                      const correo = tec.correo || tec.email || 'Sin correo registrado';

                      return (
                        <option key={idTec} value={idTec}>
                          {nombreCompleto} ({correo})
                        </option>
                      );
                    })
                  )}
                </select>
              </div>

              {/* 3. Instrucciones */}
              <div>
                <label htmlFor="notas-asignacion" className="block text-sm font-semibold text-gray-800 mb-1.5">
                  3. Instrucciones para el Técnico <span className="text-xs font-normal text-gray-500">(Opcional)</span>
                </label>
                <textarea
                  id="notas-asignacion"
                  rows={3}
                  value={notasInstrucciones}
                  onChange={(e) => setNotasInstrucciones(e.target.value)}
                  placeholder="Ejemplo: Priorizar la revisión del cableado de red antes del cambio de módulo..."
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-300 rounded-lg text-sm text-gray-900 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all placeholder:text-gray-400"
                />
              </div>

              {/* Acciones */}
              <div className="pt-4 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-4">
                <Link
                  to="/incidencias"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium"
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
                      <span>Guardando en BD...</span>
                    </>
                  ) : (
                    <>
                      <FiSend className="w-4 h-4" />
                      <span>Asignar Orden</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Panel Lateral: Usuarios / Técnicos Reales */}
        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-gray-900 text-sm flex items-center gap-2">
                <FiUserCheck className="text-primary w-4 h-4" />
                Técnicos BD
              </h3>
              <span className="text-[11px] bg-gray-100 text-gray-600 font-semibold px-2 py-0.5 rounded-full">
                {tecnicos.length} Reales
              </span>
            </div>

            <div className="divide-y divide-gray-100 max-h-[360px] overflow-y-auto">
              {tecnicos.length === 0 ? (
                <p className="text-xs text-gray-500 py-4 text-center">Sin usuarios técnicos en la BD</p>
              ) : (
                tecnicos.map((tec) => {
                  const idTec = tec.id_usuario || tec.id;
                  const nombreCompleto = `${tec.nombre || ''} ${tec.apellido || ''}`.trim() || 'Técnico';
                  const correo = tec.correo || tec.email || 'Sin correo registrado';
                  const isSelected = selectedTecnicoId === idTec;

                  return (
                    <div
                      key={idTec}
                      onClick={() => setSelectedTecnicoId(idTec)}
                      className={`py-2.5 px-2 rounded-lg flex items-center justify-between cursor-pointer transition-colors ${
                        isSelected ? 'bg-primary-50 border border-primary-200' : 'hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-7 h-7 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center flex-shrink-0">
                          {nombreCompleto.charAt(0)}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-medium text-gray-900 truncate">{nombreCompleto}</p>
                          <p className="text-[11px] text-gray-500 truncate">{correo}</p>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AsignarTecnico;