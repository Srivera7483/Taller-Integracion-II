import React, { useState, useMemo, useEffect } from 'react';
import { Link } from 'react-router-dom';
import StatusBadge from '../components/StatusBadge';
import StatusFilter from '../components/StatusFilter';
import ModalCierreMantenimiento from '../components/ModalCierreMantenimiento';
import {
  FiSearch,
  FiPlus,
  FiTrash2,
  FiBox,
  FiClock,
  FiUser,
  FiInfo,
  FiUserCheck,
  FiCheckCircle,
  FiLock,
  FiExternalLink
} from 'react-icons/fi';
import { useToast } from '../context/ToastContext';
import {
  getIncidencias,
  clearTempIncidencias,
  getTecnicoActual
} from '../services/incidenciasStorage';

const Incidencias = () => {
  const { showToast } = useToast();
  // Cargar incidencias desde cookies y datos base al montar
  const [incidencias, setIncidencias] = useState(() => getIncidencias());
  const [terminoBusqueda, setTerminoBusqueda] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('Todas');
  const [tecnicoActual, setTecnicoActual] = useState(() => getTecnicoActual());

  // Estado para el modal de cierre de mantenimiento
  const [ordenSeleccionadaParaCierre, setOrdenSeleccionadaParaCierre] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Escuchar cambios de perfil técnico para actualizar ownership en tiempo real
  useEffect(() => {
    const handleCambio = () => {
      setTecnicoActual(getTecnicoActual());
    };
    window.addEventListener('tecnico-cambiado', handleCambio);
    return () => window.removeEventListener('tecnico-cambiado', handleCambio);
  }, []);

  const recargarIncidencias = () => {
    const data = getIncidencias();
    setIncidencias(data);
  };

  // Calcular contadores por estado
  const counts = incidencias.reduce(
    (acc, inc) => {
      const estado = inc.estado || 'Pendiente';
      acc[estado] = (acc[estado] || 0) + 1;
      acc['Todas'] = (acc['Todas'] || 0) + 1;

      // Conteo para Mis Asignadas
      const asignado = (inc.asignado || '').trim().toLowerCase();
      const actual = (tecnicoActual?.nombre || '').trim().toLowerCase();
      if (asignado && actual && (asignado === actual || asignado.includes(actual) || actual.includes(asignado))) {
        acc['Mis Asignadas'] = (acc['Mis Asignadas'] || 0) + 1;
      }
      return acc;
    },
    { Todas: 0, 'Mis Asignadas': 0 }
  );

  // Filtrado reactivo en tiempo real
  const incidenciasFiltradas = incidencias.filter((inc) => {
    // Filtro por texto
    const texto = terminoBusqueda.toLowerCase();
    const coincideTitulo = inc.titulo?.toLowerCase().includes(texto);
    const coincideActivo = inc.id_activo?.toLowerCase().includes(texto);
    const coincideId = inc.id?.toLowerCase().includes(texto);
    const coincideCategoria = inc.categoria?.toLowerCase().includes(texto);
    const coincideAsignado = inc.asignado?.toLowerCase().includes(texto);
    const matchBusqueda = coincideTitulo || coincideActivo || coincideId || coincideCategoria || coincideAsignado;

    // Filtro por estado / Mis Asignadas
    const incEstado = inc.estado || 'Pendiente';
    let matchEstado = true;

    if (filtroEstado === 'Todas') {
      matchEstado = true;
    } else if (filtroEstado === 'Mis Asignadas') {
      const asignado = (inc.asignado || '').trim().toLowerCase();
      const actual = (tecnicoActual?.nombre || '').trim().toLowerCase();
      matchEstado = Boolean(asignado && actual && (asignado === actual || asignado.includes(actual) || actual.includes(asignado)));
    } else {
      matchEstado = incEstado.toLowerCase() === filtroEstado.toLowerCase();
    }

    return matchBusqueda && matchEstado;
  });

  const tieneTemporales = incidencias.some((inc) => inc.esTemporal);

  const handleLimpiarPruebas = () => {
    clearTempIncidencias();
    recargarIncidencias();
    showToast('Se han eliminado los reportes temporales de prueba (cookies limpiadas)', 'info');
  };

  const getPriorityStyle = (prioridad) => {
    const p = (prioridad || '').toLowerCase();
    if (p === 'critica' || p === 'crítica') return 'text-red-600 bg-red-50 border-red-200';
    if (p === 'alta') return 'text-orange-600 bg-orange-50 border-orange-200';
    if (p === 'media') return 'text-yellow-700 bg-yellow-50 border-yellow-200';
    return 'text-emerald-700 bg-emerald-50 border-emerald-200';
  };

  const abrirModalParaIncidencia = (inc) => {
    setOrdenSeleccionadaParaCierre({
      id_orden: inc.ordenId || `ORD-${inc.id}`,
      incidencia_id: inc.id,
      id: inc.id,
      titulo: inc.titulo,
      id_activo: inc.id_activo,
      tecnico_nombre: inc.asignado,
      tecnico_id: inc.tecnico_id,
      resolucion: inc.resolucion,
      horasInvertidas: inc.horasInvertidas,
      materialesUsados: inc.materialesUsados,
      estado: inc.estado,
    });
    setIsModalOpen(true);
  };

  const handleCierreExitoso = () => {
    recargarIncidencias();
  };

  return (
    <div className="space-y-6">
      {/* Barra de Búsqueda y Acciones */}
      <div className="flex flex-col md:flex-row justify-between items-stretch md:items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={terminoBusqueda}
            onChange={(e) => setTerminoBusqueda(e.target.value)}
            placeholder="Buscar por título, ID, activo o técnico..."
            className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-sm bg-white"
          />
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          {tieneTemporales && (
            <button
              onClick={handleLimpiarPruebas}
              title="Borrar las incidencias almacenadas en la cookie temporal"
              className="flex items-center justify-center gap-1.5 px-3 py-2.5 border border-gray-300 rounded-xl text-xs font-medium text-gray-600 hover:text-red-600 hover:bg-red-50 transition-colors bg-white shadow-2xs cursor-pointer"
            >
              <FiTrash2 className="w-3.5 h-3.5" />
              Limpiar Pruebas
            </button>
          )}

          <Link
            to="/incidencias/asignar"
            id="btn-abrir-asignar-tecnico"
            className="flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors font-medium text-sm shadow-xs min-h-[44px]"
          >
            <FiUserCheck className="w-4 h-4" /> Asignar Técnico
          </Link>

          <Link
            to="/incidencias/nueva"
            className="flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors font-medium text-sm shadow-xs min-h-[44px]"
          >
            <FiPlus className="w-4 h-4" /> Reportar Incidencia
          </Link>
        </div>
      </div>

      {/* Filtros visuales por estado */}
      <div className="overflow-x-auto pb-2 -mx-4 px-4 sm:mx-0 sm:px-0">
        <StatusFilter
          options={['Todas', 'Mis Asignadas', 'Pendiente', 'Asignada', 'En Progreso', 'Completada', 'Resuelta', 'Cerrada']}
          activeFilter={filtroEstado}
          onFilterChange={setFiltroEstado}
          counts={counts}
        />
      </div>

      {/* Banner Informativo sobre Cookies Temporales */}
      {tieneTemporales && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start gap-3 text-sm text-blue-800">
          <FiInfo className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold">Modo de Pruebas con Cookies Activo</p>
            <p className="text-xs text-blue-700 mt-0.5">
              Las incidencias y confirmaciones de mantenimiento completadas se sincronizan automáticamente en la cookie (`temp_incidencias`) y en la base de datos PostgreSQL.
            </p>
          </div>
        </div>
      )}

      {/* Vista de Tarjetas (Móvil y Tablet Portrait) */}
      <div className="grid grid-cols-1 gap-4 md:hidden">
        {incidenciasFiltradas.length > 0 ? (
          incidenciasFiltradas.map((inc) => {
            const asignado = (inc.asignado || '').trim().toLowerCase();
            const actual = (tecnicoActual?.nombre || '').trim().toLowerCase();
            const esMio = Boolean(asignado && actual && (asignado === actual || asignado.includes(actual) || actual.includes(asignado)));
            const estaCompletada = inc.estado?.toLowerCase() === 'completada' || inc.estado?.toLowerCase() === 'resuelta' || inc.estado?.toLowerCase() === 'cerrada';

            return (
              <div key={inc.id} className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4 space-y-3">
                <div className="flex justify-between items-start gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-semibold text-gray-500">{inc.id}</span>
                      {inc.esTemporal && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-indigo-50 text-indigo-700 border border-indigo-200">
                          Temporal
                        </span>
                      )}
                    </div>
                    <h3 className="font-semibold text-gray-900 mt-1">{inc.titulo}</h3>
                  </div>
                  <StatusBadge status={inc.estado || 'Pendiente'} />
                </div>

                {inc.descripcion && (
                  <p className="text-xs text-gray-600 line-clamp-2">{inc.descripcion}</p>
                )}

                <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-gray-100">
                  <div className="inline-flex items-center gap-1.5 font-mono text-xs px-2 py-1 bg-gray-50 text-gray-600 rounded-md border border-gray-200">
                    <FiBox className="w-3 h-3" />
                    {inc.id_activo || 'Sin activo'}
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${getPriorityStyle(inc.prioridad)}`}>
                    {inc.prioridad ? inc.prioridad.toUpperCase() : 'MEDIA'}
                  </span>
                </div>

                <div className="flex flex-col gap-2 pt-2 border-t border-gray-100 text-xs text-gray-500">
                  <div className="flex items-center justify-between gap-1.5">
                    <div className="flex items-center gap-1.5">
                      <FiUser className="w-3.5 h-3.5 text-gray-400" />
                      <span className="font-medium text-gray-800">{inc.asignado || 'Sin asignar'}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      {/* ACCIÓN RÁPIDA DE CIERRE DE MANTENIMIENTO SEGÚN OWNERSHIP */}
                      {esMio && !estaCompletada && (
                        <button
                          type="button"
                          onClick={() => abrirModalParaIncidencia(inc)}
                          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-xs shadow-xs flex items-center gap-1 transition-all cursor-pointer min-h-[38px]"
                        >
                          <FiCheckCircle className="w-3.5 h-3.5" />
                          <span>Finalizar Tarea</span>
                        </button>
                      )}

                      {(!inc.asignado || inc.asignado === 'Sin asignar' || inc.estado === 'Pendiente') && (
                        <Link
                          to={`/incidencias/asignar?incidenciaId=${inc.id}`}
                          className="text-indigo-600 hover:text-indigo-800 font-semibold"
                        >
                          Asignar
                        </Link>
                      )}

                      <Link
                        to={`/ordenes/${inc.id}`}
                        className="p-1.5 text-gray-400 hover:text-blue-600"
                        title="Ver detalle de orden"
                      >
                        <FiExternalLink className="w-4 h-4" />
                      </Link>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 text-gray-400">
                    <FiClock className="w-3.5 h-3.5" />
                    {inc.fecha || 'Reciente'}
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="p-8 text-center bg-white rounded-2xl shadow-sm border border-gray-200">
            <p className="font-medium text-gray-500">No se encontraron incidencias</p>
          </div>
        )}
      </div>

      {/* Tabla de Incidencias (Escritorio y Tablet Landscape) */}
      <div className="hidden md:block bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-600">
            <thead className="bg-gray-50/80 text-gray-500 uppercase text-xs border-b border-gray-200">
              <tr>
                <th className="px-6 py-3.5 font-semibold">ID / Asunto</th>
                <th className="px-6 py-3.5 font-semibold">Activo Afectado</th>
                <th className="px-6 py-3.5 font-semibold">Prioridad</th>
                <th className="px-6 py-3.5 font-semibold">Estado</th>
                <th className="px-6 py-3.5 font-semibold">Asignación / Técnico</th>
                <th className="px-6 py-3.5 font-semibold text-right">Acción Técnica</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {incidenciasFiltradas.length > 0 ? (
                incidenciasFiltradas.map((inc) => {
                  const asignado = (inc.asignado || '').trim().toLowerCase();
                  const actual = (tecnicoActual?.nombre || '').trim().toLowerCase();
                  const esMio = Boolean(asignado && actual && (asignado === actual || asignado.includes(actual) || actual.includes(asignado)));
                  const estaCompletada = inc.estado?.toLowerCase() === 'completada' || inc.estado?.toLowerCase() === 'resuelta' || inc.estado?.toLowerCase() === 'cerrada';

                  return (
                    <tr key={inc.id} className="hover:bg-gray-50/70 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <div className="flex items-center gap-2">
                            <Link
                              to={`/ordenes/${inc.id}`}
                              className="font-mono text-xs font-bold text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1"
                              title="Ver orden de trabajo"
                            >
                              <span>{inc.id}</span>
                              <FiExternalLink className="w-3 h-3" />
                            </Link>
                            {inc.esTemporal && (
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-indigo-50 text-indigo-700 border border-indigo-200">
                                Cookie
                              </span>
                            )}
                          </div>
                          <span className="font-semibold text-gray-900 mt-0.5">{inc.titulo}</span>
                          {inc.descripcion && (
                            <span className="text-xs text-gray-500 line-clamp-1 mt-0.5">
                              {inc.descripcion}
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        <div className="inline-flex items-center gap-1.5 font-mono text-xs px-2.5 py-1 bg-gray-100 text-gray-800 rounded-md border border-gray-200">
                          <FiBox className="w-3.5 h-3.5 text-gray-500" />
                          {inc.id_activo || 'Sin activo'}
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold border ${getPriorityStyle(inc.prioridad)}`}>
                          {inc.prioridad ? inc.prioridad.toUpperCase() : 'MEDIA'}
                        </span>
                      </td>

                      <td className="px-6 py-4">
                        <StatusBadge status={inc.estado || 'Pendiente'} />
                      </td>

                      <td className="px-6 py-4">
                        <div className="flex flex-col text-xs text-gray-500">
                          <span className="flex items-center gap-1.5 text-gray-800 font-medium">
                            <FiUser className="w-3 h-3 text-gray-400" />
                            <span>{inc.asignado || 'Sin asignar'}</span>
                            {(!inc.asignado || inc.asignado === 'Sin asignar' || inc.estado === 'Pendiente') && (
                              <Link
                                to={`/incidencias/asignar?incidenciaId=${inc.id}`}
                                className="ml-1 text-[11px] text-indigo-600 hover:text-indigo-800 font-semibold underline"
                                title="Asignar técnico a esta orden"
                              >
                                Asignar
                              </Link>
                            )}
                          </span>
                          <span className="flex items-center gap-1 text-gray-400 mt-0.5">
                            <FiClock className="w-3 h-3" />
                            {inc.fecha || 'Reciente'}
                          </span>
                        </div>
                      </td>

                      <td className="px-6 py-4 text-right">
                        {/* BOTÓN ERGONÓMICO DE CONFIRMACIÓN DE MANTENIMIENTO SEGÚN OWNERSHIP */}
                        {estaCompletada ? (
                          <Link
                            to={`/ordenes/${inc.id}`}
                            className="inline-flex items-center gap-1 px-3 py-1.5 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-lg text-xs font-semibold hover:bg-emerald-100 transition-colors"
                          >
                            <FiCheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Ver Cierre</span>
                          </Link>
                        ) : esMio ? (
                          <button
                            type="button"
                            onClick={() => abrirModalParaIncidencia(inc)}
                            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white rounded-xl text-xs font-bold shadow-xs hover:shadow transition-all cursor-pointer min-h-[40px]"
                            title="Confirmar mantenimiento y cerrar tarea"
                          >
                            <FiCheckCircle className="w-3.5 h-3.5" />
                            <span>Finalizar Tarea</span>
                          </button>
                        ) : inc.asignado && inc.asignado !== 'Sin asignar' ? (
                          <span
                            className="inline-flex items-center gap-1 text-[11px] text-gray-400 bg-gray-50 px-2.5 py-1.5 rounded-lg border border-gray-200"
                            title={`Esta tarea está asignada a ${inc.asignado}. Solo dicho técnico puede cerrarla.`}
                          >
                            <FiLock className="w-3 h-3 text-gray-400" />
                            <span>De otro técnico</span>
                          </span>
                        ) : (
                          <span className="text-xs text-gray-400 italic">Por asignar</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                    <p className="font-medium">No se encontraron incidencias</p>
                    <p className="text-xs text-gray-400 mt-1">
                      {terminoBusqueda
                        ? 'Prueba con otro término de búsqueda.'
                        : 'Crea una nueva incidencia o asigna una orden para comenzar.'}
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL DE CIERRE DE MANTENIMIENTO TÉCNICO */}
      {ordenSeleccionadaParaCierre && (
        <ModalCierreMantenimiento
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setOrdenSeleccionadaParaCierre(null);
          }}
          orden={ordenSeleccionadaParaCierre}
          tecnicoActual={tecnicoActual}
          onCierreExitoso={handleCierreExitoso}
        />
      )}
    </div>
  );
};

export default Incidencias;
