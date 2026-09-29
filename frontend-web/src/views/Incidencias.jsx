import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import StatusBadge from '../components/StatusBadge';
import PriorityBadge from '../components/PriorityBadge';
import StatusFilter from '../components/StatusFilter';
import {
  FiSearch,
  FiPlus,
  FiTrash2,
  FiBox,
  FiClock,
  FiUser,
  FiInfo,
  FiUserCheck,
  FiFilter,
  FiGrid,
  FiList,
  FiFileText,
  FiAlertTriangle,
  FiChevronRight
} from 'react-icons/fi';
import { useToast } from '../context/ToastContext';
import { getIncidencias, clearTempIncidencias } from '../services/incidenciasStorage';
import { evaluarPrioridadOrden } from '../services/ordenesService';

const Incidencias = () => {
  const { showToast } = useToast();

  // Cargar incidencias desde cookies y datos base al montar
  // Nota de integración con backend:
  // Cuando se conecte el endpoint GET /api/incidencias/ordenes-trabajo,
  // se puede invocar obtenerOrdenesTrabajoApi() desde un useEffect para alimentar este estado.
  const [incidencias, setIncidencias] = useState(() => getIncidencias());
  const [terminoBusqueda, setTerminoBusqueda] = useState('');
  const [filtroPrioridad, setFiltroPrioridad] = useState('todas'); // 'todas' | 'Alta' | 'Media' | 'Baja' | 'No Asignada'
  const [vistaModo, setVistaModo] = useState('tabla'); // 'tabla' | 'tarjetas'
  const [filtroEstado, setFiltroEstado] = useState('Todas');

  const recargarIncidencias = () => {
    const data = getIncidencias();
    setIncidencias(data);
  };

  // Cálculo de conteos reactivos por nivel de prioridad según el esquema ORDENES_TRABAJO
  const conteosPrioridad = useMemo(() => {
    const counts = { todas: incidencias.length, Alta: 0, Media: 0, Baja: 0, 'No Asignada': 0 };
    incidencias.forEach((item) => {
      const p = evaluarPrioridadOrden(item);
      if (counts[p] !== undefined) {
        counts[p] += 1;
      } else {
        counts['No Asignada'] += 1;
      }
    });
    return counts;
  }, [incidencias]);

  // Filtrado reactivo en tiempo real combinando término de búsqueda, estado y grado de prioridad
  const incidenciasFiltradas = useMemo(() => {
    return incidencias.filter((inc) => {
      const prioridadEvaluada = evaluarPrioridadOrden(inc);

      // 1. Filtro por Prioridad
      if (filtroPrioridad !== 'todas' && prioridadEvaluada !== filtroPrioridad) {
        return false;
      }

      // 2. Filtro por Estado
      const incEstado = inc.estado || 'Pendiente';
      if (filtroEstado !== 'Todas' && incEstado.toLowerCase() !== filtroEstado.toLowerCase()) {
        return false;
      }

      // 3. Filtro por Término de búsqueda
      if (!terminoBusqueda.trim()) return true;
      const texto = terminoBusqueda.toLowerCase();
      const coincideTitulo = inc.titulo?.toLowerCase().includes(texto);
      const coincideActivo = inc.id_activo?.toLowerCase().includes(texto);
      const coincideId = inc.id?.toLowerCase().includes(texto);
      const coincideCategoria = inc.categoria?.toLowerCase().includes(texto);
      const coincideTecnico = inc.asignado?.toLowerCase().includes(texto);
      const coincideOrden = inc.orden_trabajo?.id_orden?.toLowerCase().includes(texto);

      return (
        coincideTitulo ||
        coincideActivo ||
        coincideId ||
        coincideCategoria ||
        coincideTecnico ||
        coincideOrden
      );
    });
  }, [incidencias, terminoBusqueda, filtroPrioridad, filtroEstado]);

  // Calcular contadores por estado
  const counts = incidencias.reduce((acc, inc) => {
    const estado = inc.estado || 'Pendiente';
    acc[estado] = (acc[estado] || 0) + 1;
    acc['Todas'] = (acc['Todas'] || 0) + 1;
    return acc;
  }, { 'Todas': 0 });

  const tieneTemporales = incidencias.some((inc) => inc.esTemporal);

  const handleLimpiarPruebas = () => {
    clearTempIncidencias();
    recargarIncidencias();
    showToast('Se han eliminado los reportes temporales de prueba (cookies limpiadas)', 'info');
  };

  return (
    <div className="space-y-6">
      {/* Barra de Búsqueda, Filtro de Prioridad y Acciones Principales */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-4">
          {/* Campo de búsqueda */}
          <div className="relative flex-1 max-w-md">
            <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              id="input-buscar-incidencias"
              value={terminoBusqueda}
              onChange={(e) => setTerminoBusqueda(e.target.value)}
              placeholder="Buscar por título, ID, activo o técnico..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-sm bg-white"
            />
          </div>

          {/* Selector de Vista (Tabla vs Tarjetas) y Botones de Acción */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Conmutador de vista Tabla / Tarjetas */}
            <div className="inline-flex rounded-lg border border-gray-300 bg-white p-0.5 shadow-2xs">
              <button
                type="button"
                id="btn-vista-tabla"
                onClick={() => setVistaModo('tabla')}
                title="Vista en Tabla compacta"
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                  vistaModo === 'tabla'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                <FiList className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Tabla</span>
              </button>
              <button
                type="button"
                id="btn-vista-tarjetas"
                onClick={() => setVistaModo('tarjetas')}
                title="Vista en Tarjetas de órdenes"
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                  vistaModo === 'tarjetas'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                <FiGrid className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Tarjetas</span>
              </button>
            </div>

            {tieneTemporales && (
              <button
                onClick={handleLimpiarPruebas}
                title="Borrar las incidencias almacenadas en la cookie temporal"
                className="flex items-center gap-1.5 px-3 py-2 border border-gray-300 rounded-lg text-xs font-medium text-gray-600 hover:text-red-600 hover:bg-red-50 transition-colors bg-white shadow-sm"
              >
                <FiTrash2 className="w-3.5 h-3.5" />
                Limpiar Pruebas
              </button>
            )}

            <Link
              to="/incidencias/asignar"
              id="btn-abrir-asignar-tecnico"
              className="flex items-center justify-center gap-2 px-3.5 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium text-sm shadow-sm"
            >
              <FiUserCheck className="w-4 h-4" /> Asignar Técnico
            </Link>

            <Link
              to="/incidencias/nueva"
              className="flex items-center justify-center gap-2 px-3.5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm shadow-sm"
            >
              <FiPlus className="w-4 h-4" /> Reportar Incidencia
            </Link>
          </div>
        </div>

        {/* Barra de Filtros por Grado de Prioridad (Criterio de Aceptación) */}
        <div className="bg-white rounded-xl p-3 border border-gray-200 shadow-2xs flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-wrap" id="barra-filtro-prioridad">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-1.5 mr-1">
              <FiFilter className="w-3.5 h-3.5 text-gray-400" />
              Filtrar por Prioridad:
            </span>

            {/* Opción: Todas */}
            <button
              type="button"
              id="filtro-prioridad-todas"
              onClick={() => setFiltroPrioridad('todas')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                filtroPrioridad === 'todas'
                  ? 'bg-gray-900 text-white shadow-xs'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <span>Todas</span>
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                  filtroPrioridad === 'todas' ? 'bg-gray-700 text-white' : 'bg-gray-200 text-gray-700'
                }`}
              >
                {conteosPrioridad.todas}
              </span>
            </button>

            {/* Opción: Alta */}
            <button
              type="button"
              id="filtro-prioridad-alta"
              onClick={() => setFiltroPrioridad('Alta')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border ${
                filtroPrioridad === 'Alta'
                  ? 'bg-rose-600 text-white border-rose-600 shadow-xs ring-2 ring-rose-200'
                  : 'bg-rose-50/70 text-rose-800 border-rose-200 hover:bg-rose-100'
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${filtroPrioridad === 'Alta' ? 'bg-white' : 'bg-rose-500 animate-pulse'}`} />
              <span>Alta</span>
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                  filtroPrioridad === 'Alta' ? 'bg-rose-800 text-white' : 'bg-rose-100 text-rose-800'
                }`}
              >
                {conteosPrioridad.Alta}
              </span>
            </button>

            {/* Opción: Media */}
            <button
              type="button"
              id="filtro-prioridad-media"
              onClick={() => setFiltroPrioridad('Media')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border ${
                filtroPrioridad === 'Media'
                  ? 'bg-amber-600 text-white border-amber-600 shadow-xs ring-2 ring-amber-200'
                  : 'bg-amber-50/70 text-amber-900 border-amber-200 hover:bg-amber-100'
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${filtroPrioridad === 'Media' ? 'bg-white' : 'bg-amber-500'}`} />
              <span>Media</span>
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                  filtroPrioridad === 'Media' ? 'bg-amber-800 text-white' : 'bg-amber-100 text-amber-900'
                }`}
              >
                {conteosPrioridad.Media}
              </span>
            </button>

            {/* Opción: Baja */}
            <button
              type="button"
              id="filtro-prioridad-baja"
              onClick={() => setFiltroPrioridad('Baja')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border ${
                filtroPrioridad === 'Baja'
                  ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs ring-2 ring-emerald-200'
                  : 'bg-emerald-50/70 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${filtroPrioridad === 'Baja' ? 'bg-white' : 'bg-emerald-500'}`} />
              <span>Baja</span>
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                  filtroPrioridad === 'Baja' ? 'bg-emerald-800 text-white' : 'bg-emerald-100 text-emerald-800'
                }`}
              >
                {conteosPrioridad.Baja}
              </span>
            </button>

            {/* Opción: No Asignada */}
            {conteosPrioridad['No Asignada'] > 0 && (
              <button
                type="button"
                id="filtro-prioridad-no-asignada"
                onClick={() => setFiltroPrioridad('No Asignada')}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border ${
                  filtroPrioridad === 'No Asignada'
                    ? 'bg-gray-700 text-white border-gray-700 shadow-xs ring-2 ring-gray-200'
                    : 'bg-gray-100 text-gray-700 border-gray-200 hover:bg-gray-200'
                }`}
              >
                <span className={`w-2 h-2 rounded-full ${filtroPrioridad === 'No Asignada' ? 'bg-white' : 'bg-gray-400'}`} />
                <span>Sin Prioridad</span>
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                    filtroPrioridad === 'No Asignada' ? 'bg-gray-900 text-white' : 'bg-gray-200 text-gray-700'
                  }`}
                >
                  {conteosPrioridad['No Asignada']}
                </span>
              </button>
            )}
          </div>

          {/* Contador de registros visibles */}
          <div className="text-xs text-gray-500 font-medium">
            Mostrando <strong>{incidenciasFiltradas.length}</strong> de <strong>{incidencias.length}</strong> órdenes
          </div>
        </div>
      </div>

      {/* Filtros visuales por estado */}
      <StatusFilter 
        options={['Todas', 'Pendiente', 'En Progreso', 'Resuelta', 'Cerrada']} 
        activeFilter={filtroEstado} 
        onFilterChange={setFiltroEstado} 
        counts={counts} 
      />

      {/* Banner Informativo sobre Cookies Temporales */}
      {tieneTemporales && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start gap-3 text-sm text-blue-800">
          <FiInfo className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold">Modo de Pruebas con Cookies Activo</p>
            <p className="text-xs text-blue-700 mt-0.5">
              Los nuevos reportes creados en esta sesión se están almacenando en una cookie temporal (`temp_incidencias`). Puedes crear incidencias desde el formulario y verlas reflejadas aquí instantáneamente.
            </p>
          </div>
        </div>
      )}

      {/* Renderizado condicional: Vista Tabla vs Vista Tarjetas */}
      {vistaModo === 'tabla' ? (
        /* TABLA DE ÓRDENES E INCIDENCIAS */
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-gray-600">
              <thead className="bg-gray-50 text-gray-500 uppercase text-xs">
                <tr>
                  <th className="px-6 py-3 font-semibold">ID / Asunto / Orden</th>
                  <th className="px-6 py-3 font-semibold">Activo Afectado</th>
                  <th className="px-6 py-3 font-semibold">Prioridad (ORDENES_TRABAJO)</th>
                  <th className="px-6 py-3 font-semibold">Estado</th>
                  <th className="px-6 py-3 font-semibold">Asignación / Fecha</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {incidenciasFiltradas.length > 0 ? (
                  incidenciasFiltradas.map((inc) => {
                    const prioridadEvaluada = evaluarPrioridadOrden(inc);
                    const codigoOrden = inc.orden_trabajo?.id_orden || null;

                    return (
                      <tr key={inc.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex flex-col">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-xs font-semibold text-gray-500">
                                {inc.id}
                              </span>
                              {codigoOrden && (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                                  <FiFileText className="w-2.5 h-2.5" />
                                  {codigoOrden}
                                </span>
                              )}
                              {inc.esTemporal && (
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-indigo-50 text-indigo-700 border border-indigo-200">
                                  Cookie Temporal
                                </span>
                              )}
                            </div>
                            <span className="font-medium text-gray-900 mt-0.5">
                              {inc.titulo}
                            </span>
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

                        {/* Indicador de Prioridad con PriorityBadge evaluando el backend */}
                        <td className="px-6 py-4">
                          <PriorityBadge priority={prioridadEvaluada} size="sm" />
                        </td>

                        <td className="px-6 py-4">
                          <StatusBadge status={inc.estado || 'Pendiente'} />
                        </td>

                        <td className="px-6 py-4">
                          <div className="flex flex-col text-xs text-gray-500">
                            <span className="flex items-center gap-1.5 text-gray-700 font-medium">
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
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                      <FiAlertTriangle className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                      <p className="font-semibold text-gray-800">No se encontraron órdenes con los criterios aplicados</p>
                      <p className="text-xs text-gray-400 mt-1">
                        {filtroPrioridad !== 'todas'
                          ? `No hay órdenes registradas con prioridad "${filtroPrioridad}". Prueba seleccionando "Todas".`
                          : 'Prueba con otro término de búsqueda o crea una nueva incidencia.'}
                      </p>
                      {filtroPrioridad !== 'todas' && (
                        <button
                          type="button"
                          onClick={() => setFiltroPrioridad('todas')}
                          className="mt-3 px-3 py-1.5 text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors"
                        >
                          Restablecer a todas las prioridades
                        </button>
                      )}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* VISTA DE TARJETAS DE ÓRDENES (Cards con evaluación de prioridad de ORDENES_TRABAJO) */
        <div id="grid-tarjetas-ordenes" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {incidenciasFiltradas.length > 0 ? (
            incidenciasFiltradas.map((inc) => {
              const prioridadEvaluada = evaluarPrioridadOrden(inc);
              const codigoOrden = inc.orden_trabajo?.id_orden || null;

              return (
                <div
                  key={inc.id}
                  className="bg-white rounded-xl shadow-xs border border-gray-200 hover:border-blue-300 hover:shadow-md transition-all p-5 flex flex-col justify-between space-y-4"
                  data-prioridad={prioridadEvaluada}
                >
                  {/* Encabezado de la Tarjeta con Badges de Prioridad y Estado */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-xs font-bold text-gray-500">
                          {inc.id}
                        </span>
                        {codigoOrden && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                            {codigoOrden}
                          </span>
                        )}
                      </div>

                      {/* Indicador visual de Prioridad destacado en la tarjeta */}
                      <PriorityBadge priority={prioridadEvaluada} size="sm" variant="badge" />
                    </div>

                    <div>
                      <h4 className="font-bold text-gray-900 text-sm leading-snug line-clamp-2">
                        {inc.titulo}
                      </h4>
                      {inc.descripcion && (
                        <p className="text-xs text-gray-500 line-clamp-2 mt-1">
                          {inc.descripcion}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Cuerpo / Metadatos de la Orden de Trabajo */}
                  <div className="space-y-2.5 pt-3 border-t border-gray-100 text-xs">
                    <div className="flex items-center justify-between text-gray-600">
                      <span className="inline-flex items-center gap-1 text-gray-500">
                        <FiBox className="w-3.5 h-3.5 text-gray-400" /> Activo:
                      </span>
                      <strong className="font-mono text-[11px] text-gray-800 bg-gray-100 px-1.5 py-0.5 rounded border border-gray-200">
                        {inc.id_activo || 'N/A'}
                      </strong>
                    </div>

                    <div className="flex items-center justify-between text-gray-600">
                      <span className="inline-flex items-center gap-1 text-gray-500">
                        <FiUser className="w-3.5 h-3.5 text-gray-400" /> Técnico:
                      </span>
                      <span className="font-medium text-gray-800">
                        {inc.asignado || 'Sin asignar'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-gray-600">
                      <span className="inline-flex items-center gap-1 text-gray-500">
                        <FiClock className="w-3.5 h-3.5 text-gray-400" /> Fecha:
                      </span>
                      <span className="text-gray-500">
                        {inc.fecha || 'Reciente'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <StatusBadge status={inc.estado || 'Pendiente'} />

                      {(!inc.asignado || inc.asignado === 'Sin asignar' || inc.estado === 'Pendiente') ? (
                        <Link
                          to={`/incidencias/asignar?incidenciaId=${inc.id}`}
                          className="inline-flex items-center gap-1 px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-semibold rounded-md border border-indigo-200 transition-colors text-xs"
                        >
                          <span>Asignar</span>
                          <FiChevronRight className="w-3 h-3" />
                        </Link>
                      ) : (
                        <span className="text-[11px] text-gray-400 font-medium italic">
                          En atención
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="col-span-full bg-white rounded-xl border border-gray-200 p-12 text-center text-gray-500 shadow-xs">
              <FiAlertTriangle className="w-8 h-8 text-gray-400 mx-auto mb-2" />
              <p className="font-semibold text-gray-800">No se encontraron tarjetas con los filtros actuales</p>
              <p className="text-xs text-gray-400 mt-1">
                {filtroPrioridad !== 'todas'
                  ? `No hay tarjetas con prioridad "${filtroPrioridad}".`
                  : 'Prueba modificando tu búsqueda.'}
              </p>
              {filtroPrioridad !== 'todas' && (
                <button
                  type="button"
                  onClick={() => setFiltroPrioridad('todas')}
                  className="mt-3 px-3 py-1.5 text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors"
                >
                  Ver todas las prioridades
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Incidencias;
