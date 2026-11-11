import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import StatusBadge from '../components/StatusBadge';
import StatusFilter from '../components/StatusFilter';
import ModalCierreMantenimiento from '../components/ModalCierreMantenimiento';
import BotonExportarExcel from '../components/BotonExportarExcel';
import { hasPermission } from '../services/authService';
import {
  FiSearch,
  FiPlus,
  FiBox,
  FiClock,
  FiUser,
  FiUserCheck,
  FiCheckCircle,
  FiLock,
  FiExternalLink,
  FiAlertTriangle
} from 'react-icons/fi';
import { useToast } from '../context/ToastContext';
import api from '../services/api';

const Incidencias = () => {
  const { showToast } = useToast();
  
  // Estados para datos reales de la BD
  const [incidencias, setIncidencias] = useState([]);
  const [totalGlobal, setTotalGlobal] = useState(null);
  const [loading, setLoading] = useState(true);
  const [terminoBusqueda, setTerminoBusqueda] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('Todas');
  
  // Estado para el modal de cierre / rechazo de mantenimiento
  const [ordenSeleccionadaParaCierre, setOrdenSeleccionadaParaCierre] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Obtener el rol y datos del usuario actual desde localStorage
  const obtenerUsuarioActual = () => {
    try {
      const usuarioStr = localStorage.getItem('usuario');
      if (!usuarioStr) return null;
      return JSON.parse(usuarioStr);
    } catch {
      return null;
    }
  };

  const usuarioAutenticado = obtenerUsuarioActual();
  const rolUsuario = usuarioAutenticado?.rol?.nombre_rol || usuarioAutenticado?.rol || null;
  const rolNormalizado = (typeof rolUsuario === 'string' ? rolUsuario : '')
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
  const idUsuarioActual =
    usuarioAutenticado?.id_usuario ||
    usuarioAutenticado?.id ||
    usuarioAutenticado?.userId ||
    null;
  const nombreUsuarioActual = `${usuarioAutenticado?.nombre || ''} ${usuarioAutenticado?.apellido || ''}`.trim();
  const esAdmin = rolNormalizado === 'ADMINISTRADOR';
  const esSupervisor = rolNormalizado === 'SUPERVISOR' || esAdmin;

  const esUuid = (valor) =>
    typeof valor === 'string' &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(valor);

  const obtenerNombreTecnicoReal = (inc) => {
    const candidato =
      inc.nombre_tecnico ||
      inc.orden_trabajo?.nombre_tecnico ||
      inc.tecnico_asignado ||
      null;
    if (!candidato) {
      return inc.id_tecnico ? `ID ${inc.id_tecnico.substring(0, 8)}` : null;
    }
    return esUuid(candidato) ? `ID ${candidato.substring(0, 8)}` : candidato;
  };

  const esIncidenciaAsignadaAMi = (inc) => {
    const idTecnicoOrden =
      inc.orden_trabajo?.id_tecnico ?? inc.id_tecnico ?? null;

    return Boolean(
      idUsuarioActual &&
      idTecnicoOrden &&
      String(idTecnicoOrden).toLowerCase() ===
        String(idUsuarioActual).toLowerCase()
    );
  };

  const cargarIncidenciasReales = async () => {
    try {
      setLoading(true);
      const [response, resumenResp] = await Promise.all([
        api.get('/incidencias?limite=50'),
        api.get('/incidencias/resumen').catch(() => null),
      ]);
      const datos = response.data.datos || response.data.data || response.data || [];
      const lista = Array.isArray(datos) ? datos : [];
      setIncidencias(lista);
      if (resumenResp?.data && typeof resumenResp.data.total === 'number') {
        setTotalGlobal(Math.max(resumenResp.data.total, lista.length));
      } else {
        setTotalGlobal(lista.length);
      }
    } catch (error) {
      console.error('Error obteniendo incidencias:', error);
      showToast('Error al conectar con la base de datos de incidencias', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void cargarIncidenciasReales();
    const handleIncidenciaCreada = () => {
      void cargarIncidenciasReales();
    };
    window.addEventListener('incidencia-creada', handleIncidenciaCreada);
    return () => window.removeEventListener('incidencia-creada', handleIncidenciaCreada);
  }, []);

  // Función auxiliar para obtener el nombre del estado
  const getNombreEstado = (estado) => {
    if (!estado) return 'Pendiente';
    return typeof estado === 'object' ? (estado.nombre_estado || estado.nombre) : estado;
  };

  // Calcular contadores por estado
  const counts = incidencias.reduce(
    (acc, inc) => {
      const estadoStr = getNombreEstado(inc.estado);
      acc[estadoStr] = (acc[estadoStr] || 0) + 1;

      if (estadoStr.toLowerCase() === 'reportada') {
        acc['Pendiente'] = (acc['Pendiente'] || 0) + 1;
      }
      if (estadoStr.toLowerCase() === 'rechazado' || estadoStr.toLowerCase() === 'rechazada') {
        acc['Rechazado'] = (acc['Rechazado'] || 0) + 1;
      }
      acc['Todas'] = (acc['Todas'] || 0) + 1;

      // Mis Asignadas (Exclusivamente incidencias con orden de trabajo asignada al usuario actual)
      if (esIncidenciaAsignadaAMi(inc)) {
        acc['Mis Asignadas'] = (acc['Mis Asignadas'] || 0) + 1;
      }
      return acc;
    },
    { Todas: 0, 'Mis Asignadas': 0, Pendiente: 0, Rechazado: 0 }
  );

  if (typeof totalGlobal === 'number' && totalGlobal > counts.Todas) {
    counts.Todas = totalGlobal;
  }

  // Filtrado reactivo en tiempo real
  const incidenciasFiltradas = incidencias.filter((inc) => {
    const texto = terminoBusqueda.toLowerCase();
    const idActivo = inc.id_activo || '';
    const nombreActivo = inc.nombre_activo || '';
    const codigoQrActivo = inc.codigo_qr_activo || '';
    const nombreTecnico = obtenerNombreTecnicoReal(inc) || '';
    const idInc = inc.id_incidencia || '';
    
    const coincideTitulo = inc.titulo?.toLowerCase().includes(texto);
    const coincideActivo =
      idActivo.toLowerCase().includes(texto) ||
      nombreActivo.toLowerCase().includes(texto) ||
      codigoQrActivo.toLowerCase().includes(texto);
    const coincideTecnico = nombreTecnico.toLowerCase().includes(texto);
    const coincideId = idInc.toLowerCase().includes(texto);
    
    const matchBusqueda = coincideTitulo || coincideActivo || coincideTecnico || coincideId;

    const incEstado = getNombreEstado(inc.estado);
    let matchEstado = true;

    if (filtroEstado === 'Todas') {
      matchEstado = true;
    } else if (filtroEstado === 'Mis Asignadas') {
      matchEstado = esIncidenciaAsignadaAMi(inc);
    } else if (filtroEstado.toLowerCase() === 'rechazado') {
      matchEstado = incEstado.toLowerCase() === 'rechazado' || incEstado.toLowerCase() === 'rechazada';
    } else if (filtroEstado.toLowerCase() === 'pendiente') {
      matchEstado = incEstado.toLowerCase() === 'pendiente' || incEstado.toLowerCase() === 'reportada';
    } else {
      matchEstado = incEstado.toLowerCase() === filtroEstado.toLowerCase();
    }

    return matchBusqueda && matchEstado;
  });

  const getPriorityStyle = (prioridad) => {
    const p = (prioridad || '').toLowerCase();
    if (p === 'critica' || p === 'crítica' || p === 'alta') return 'text-red-800 bg-red-50 border-red-200';
    if (p === 'media') return 'text-yellow-700 bg-yellow-50 border-yellow-200';
    return 'text-emerald-700 bg-emerald-50 border-emerald-200';
  };

  const abrirModalParaIncidencia = (inc) => {
    setOrdenSeleccionadaParaCierre({
      id_orden: inc.id_orden || `ORD-${inc.id_incidencia}`,
      incidencia_id: inc.id_incidencia,
      titulo: inc.titulo,
      id_activo: inc.id_activo,
      estado: getNombreEstado(inc.estado),
    });
    setIsModalOpen(true);
  };

  const handleCierreExitoso = () => {
    void cargarIncidenciasReales();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-stretch md:items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={terminoBusqueda}
            onChange={(e) => setTerminoBusqueda(e.target.value)}
            placeholder="Buscar por título, ID o activo..."
            className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary outline-none transition-all text-sm bg-white shadow-2xs"
          />
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          {esSupervisor && (
            <Link
              to="/incidencias/asignar"
              className="flex items-center justify-center gap-2 px-4 py-2.5 bg-primary-50 text-primary border border-primary-200 rounded-lg hover:bg-primary-100 transition-all font-semibold text-sm shadow-2xs min-h-[44px]"
            >
              <FiUserCheck className="w-4 h-4" /> Asignar Técnico
            </Link>
          )}

          {hasPermission('incidencias:crear') && (
            <Link
              to="/incidencias/nueva"
              className="flex items-center justify-center gap-2 px-4 py-2.5 bg-primary hover:bg-primary-hover text-white rounded-lg transition-all font-semibold text-sm shadow-md hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0 min-h-[44px]"
            >
              <FiPlus className="w-4 h-4" /> Reportar Incidencia
            </Link>
          )}

          {esAdmin && <BotonExportarExcel variant="button" />}
        </div>
      </div>

      <div className="overflow-x-auto pb-2 -mx-4 px-4 sm:mx-0 sm:px-0">
        <StatusFilter
          options={['Todas', 'Mis Asignadas', 'Pendiente', 'Asignada', 'En Progreso', 'Completada', 'Resuelta', 'Rechazado', 'Cerrada']}
          activeFilter={filtroEstado}
          onFilterChange={setFiltroEstado}
          counts={counts}
        />
      </div>

      {/* Vista de Tarjetas (Móvil y Tablet Portrait) */}
      <div className="grid grid-cols-1 gap-4 md:hidden">
        {loading ? (
          <div className="p-8 text-center bg-white rounded-xl shadow-sm border border-gray-200">
            <div className="animate-spin rounded-full h-6 w-6 border-2 border-primary border-t-transparent mx-auto"></div>
            <p className="font-medium text-gray-500 mt-2">Cargando base de datos...</p>
          </div>
        ) : incidenciasFiltradas.length > 0 ? (
          incidenciasFiltradas.map((inc) => {
            const estadoTexto = getNombreEstado(inc.estado);
            const idTexto = inc.id_incidencia;
            const nombreTecnicoReal = obtenerNombreTecnicoReal(inc);
            const etiquetaActivo =
              inc.nombre_activo ||
              inc.codigo_qr_activo ||
              (inc.id_activo ? inc.id_activo.substring(0, 8) : 'Sin activo');
            const esMio = esIncidenciaAsignadaAMi(inc);
            const estaCompletada = ['completada', 'resuelta', 'cerrada'].includes(estadoTexto.toLowerCase());
            const esRechazado = ['rechazado', 'rechazada'].includes(estadoTexto.toLowerCase());

            return (
              <div key={idTexto} className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 space-y-3">
                <div className="flex justify-between items-start gap-2">
                  <div>
                    <Link
                      to={`/incidencias/${idTexto}`}
                      className="font-mono text-xs font-bold text-primary hover:text-primary-hover hover:underline flex items-center gap-1"
                    >
                      <span>{idTexto.substring(0, 13)}...</span>
                      <FiExternalLink className="w-3 h-3" />
                    </Link>
                    <h3 className="font-semibold text-gray-900 mt-1">{inc.titulo}</h3>
                  </div>
                  <StatusBadge status={estadoTexto} />
                </div>

                {inc.descripcion && (
                  <p className="text-xs text-gray-600 line-clamp-2">{inc.descripcion}</p>
                )}

                <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-gray-100">
                  <div className="inline-flex items-center gap-1.5 font-mono text-xs px-2 py-1 bg-gray-50 text-gray-600 rounded-lg border border-gray-200">
                    <FiBox className="w-3 h-3" />
                    {etiquetaActivo}
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${getPriorityStyle(inc.prioridad)}`}>
                    {inc.prioridad ? inc.prioridad.toUpperCase() : 'MEDIA'}
                  </span>
                </div>

                <div className="flex flex-col gap-2 pt-2 border-t border-gray-100 text-xs text-gray-500">
                  <div className="flex items-center justify-between gap-1.5">
                    <div className="flex items-center gap-1.5">
                      <FiUser className="w-3.5 h-3.5 text-gray-400" />
                      <span className="font-medium text-gray-800">
                        {nombreTecnicoReal ? `Técnico: ${nombreTecnicoReal}` : 'Sin asignar'}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      {esRechazado ? (
                        <Link to={`/incidencias/${idTexto}`} className="px-3 py-1.5 bg-red-50 text-red-700 border border-red-200 rounded-lg font-semibold text-xs shadow-2xs flex items-center gap-1">
                          <FiAlertTriangle className="w-3.5 h-3.5" /> Rechazo
                        </Link>
                      ) : esMio && !estaCompletada ? (
                        <button onClick={() => abrirModalParaIncidencia(inc)} className="px-3 py-1.5 bg-emerald-700 text-white rounded-lg font-bold text-xs flex items-center gap-1">
                          <FiCheckCircle className="w-3.5 h-3.5" /> Tarea
                        </button>
                      ) : null}

                      {esSupervisor && !nombreTecnicoReal && !estaCompletada && (
                        <Link to={`/incidencias/asignar?incidenciaId=${idTexto}`} className="text-primary hover:text-primary-hover font-semibold">
                          Asignar
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="p-8 text-center bg-white rounded-xl shadow-sm border border-gray-200">
            <p className="font-medium text-gray-500">No se encontraron incidencias</p>
          </div>
        )}
      </div>

      {/* Tabla de Incidencias (Escritorio) */}
      <div className="hidden md:block bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-600">
            <thead className="bg-gray-50/80 text-gray-500 uppercase text-xs border-b border-gray-200">
              <tr>
                <th className="px-6 py-3.5 font-semibold">ID / Asunto</th>
                <th className="px-6 py-3.5 font-semibold">Activo</th>
                <th className="px-6 py-3.5 font-semibold">Prioridad</th>
                <th className="px-6 py-3.5 font-semibold">Estado</th>
                <th className="px-6 py-3.5 font-semibold">Asignación</th>
                <th className="px-6 py-3.5 font-semibold text-right">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                     <div className="animate-spin rounded-full h-6 w-6 border-2 border-primary border-t-transparent mx-auto"></div>
                  </td>
                </tr>
              ) : incidenciasFiltradas.length > 0 ? (
                incidenciasFiltradas.map((inc) => {
                  const estadoTexto = getNombreEstado(inc.estado);
                  const idTexto = inc.id_incidencia;
                  const nombreTecnicoReal = obtenerNombreTecnicoReal(inc);
                  const etiquetaActivo =
                    inc.nombre_activo ||
                    inc.codigo_qr_activo ||
                    (inc.id_activo ? inc.id_activo.substring(0, 8) : null);
                  const esMio = esIncidenciaAsignadaAMi(inc);
                  const estaCompletada = ['completada', 'resuelta', 'cerrada'].includes(estadoTexto.toLowerCase());
                  const esRechazado = ['rechazado', 'rechazada'].includes(estadoTexto.toLowerCase());

                  return (
                    <tr key={idTexto} className="hover:bg-gray-50/70 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <Link to={`/incidencias/${idTexto}`} className="font-mono text-xs font-bold text-primary hover:underline flex items-center gap-1">
                            <span>{idTexto.substring(0, 13)}...</span> <FiExternalLink className="w-3 h-3" />
                          </Link>
                          <span className="font-semibold text-gray-900 mt-0.5">{inc.titulo}</span>
                          {inc.descripcion && <span className="text-xs text-gray-500 line-clamp-1 mt-0.5">{inc.descripcion}</span>}
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        {etiquetaActivo ? (
                          <div className="inline-flex flex-col gap-0.5 font-mono text-xs px-2.5 py-1 bg-gray-100 text-gray-800 rounded-lg border border-gray-200">
                            <span className="inline-flex items-center gap-1.5 font-sans font-medium text-gray-900">
                              <FiBox className="w-3.5 h-3.5 text-gray-500 flex-shrink-0" /> {etiquetaActivo}
                            </span>
                            {inc.codigo_qr_activo && inc.nombre_activo && (
                              <span className="text-[10px] text-gray-500">{inc.codigo_qr_activo}</span>
                            )}
                          </div>
                        ) : <span className="text-xs text-gray-400">N/A</span>}
                      </td>

                      <td className="px-6 py-4">
                        <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold border ${getPriorityStyle(inc.prioridad)}`}>
                          {inc.prioridad ? inc.prioridad.toUpperCase() : 'MEDIA'}
                        </span>
                      </td>

                      <td className="px-6 py-4"><StatusBadge status={estadoTexto} /></td>

                      <td className="px-6 py-4">
                        <div className="flex flex-col text-xs text-gray-500">
                          <span className="flex items-center gap-1.5 text-gray-800 font-medium">
                            <FiUser className="w-3 h-3 text-gray-400" />
                            <span>{nombreTecnicoReal ? `Técnico: ${nombreTecnicoReal}` : 'Sin asignar'}</span>
                            {esSupervisor && !nombreTecnicoReal && !estaCompletada && (
                              <Link to={`/incidencias/asignar?incidenciaId=${idTexto}`} className="ml-1 text-[11px] text-primary hover:underline">Asignar</Link>
                            )}
                          </span>
                          <span className="flex items-center gap-1 text-gray-600 mt-0.5">
                            <FiClock className="w-3 h-3" /> {inc.fecha_creacion ? new Date(inc.fecha_creacion).toLocaleDateString() : 'Reciente'}
                          </span>
                        </div>
                      </td>

                      <td className="px-6 py-4 text-right">
                        {esRechazado ? (
                          <Link to={`/incidencias/${idTexto}`} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-50 text-red-700 border border-red-200 rounded-lg text-xs font-semibold">
                            <FiAlertTriangle className="w-3.5 h-3.5" /> Ver Rechazo
                          </Link>
                        ) : estaCompletada ? (
                          <Link to={`/incidencias/${idTexto}`} className="inline-flex items-center gap-1 px-3 py-1.5 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-lg text-xs font-semibold">
                            <FiCheckCircle className="w-3.5 h-3.5" /> Ver Cierre
                          </Link>
                        ) : esMio ? (
                          <button onClick={() => abrirModalParaIncidencia(inc)} className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-xs">
                            <FiCheckCircle className="w-3.5 h-3.5" /> Finalizar Tarea
                          </button>
                        ) : nombreTecnicoReal ? (
                          <span className="inline-flex items-center gap-1 text-[11px] text-gray-400 bg-gray-50 px-2.5 py-1.5 rounded-lg border border-gray-200">
                            <FiLock className="w-3 h-3" /> De otro técnico
                          </span>
                        ) : <span className="text-xs text-gray-400 italic">Por asignar</span>}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                    <p className="font-medium">No se encontraron incidencias</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {ordenSeleccionadaParaCierre && (
        <ModalCierreMantenimiento
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setOrdenSeleccionadaParaCierre(null);
          }}
          orden={ordenSeleccionadaParaCierre}
          tecnicoActual={usuarioAutenticado}
          onCierreExitoso={handleCierreExitoso}
        />
      )}

      {esAdmin && <BotonExportarExcel variant="floating" className="hidden lg:flex" />}
    </div>
  );
};

export default Incidencias;