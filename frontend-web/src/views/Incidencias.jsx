import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import StatusBadge from '../components/StatusBadge';
import StatusFilter from '../components/StatusFilter';
import { 
  FiSearch, 
  FiPlus, 
  FiTrash2, 
  FiBox, 
  FiClock, 
  FiUser,
  FiInfo 
} from 'react-icons/fi';
import { useToast } from '../context/ToastContext';
import { getIncidencias, clearTempIncidencias } from '../services/incidenciasStorage';

const Incidencias = () => {
  const { showToast } = useToast();
  // Cargar incidencias desde cookies y datos base al montar
  const [incidencias, setIncidencias] = useState(() => getIncidencias());
  const [terminoBusqueda, setTerminoBusqueda] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('Todas');

  const recargarIncidencias = () => {
    const data = getIncidencias();
    setIncidencias(data);
  };

  // Calcular contadores por estado
  const counts = incidencias.reduce((acc, inc) => {
    const estado = inc.estado || 'Pendiente';
    acc[estado] = (acc[estado] || 0) + 1;
    acc['Todas'] = (acc['Todas'] || 0) + 1;
    return acc;
  }, { 'Todas': 0 });

  // Filtrado reactivo en tiempo real
  const incidenciasFiltradas = incidencias.filter((inc) => {
    // Filtro por texto
    const texto = terminoBusqueda.toLowerCase();
    const coincideTitulo = inc.titulo?.toLowerCase().includes(texto);
    const coincideActivo = inc.id_activo?.toLowerCase().includes(texto);
    const coincideId = inc.id?.toLowerCase().includes(texto);
    const coincideCategoria = inc.categoria?.toLowerCase().includes(texto);
    const matchBusqueda = coincideTitulo || coincideActivo || coincideId || coincideCategoria;

    // Filtro por estado
    const incEstado = inc.estado || 'Pendiente';
    const matchEstado = filtroEstado === 'Todas' || incEstado.toLowerCase() === filtroEstado.toLowerCase();

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

  return (
    <div className="space-y-6">
      {/* Barra de Búsqueda y Acciones */}
      <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input 
            type="text" 
            value={terminoBusqueda}
            onChange={(e) => setTerminoBusqueda(e.target.value)}
            placeholder="Buscar por título, ID o activo..." 
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-sm bg-white"
          />
        </div>

        <div className="flex items-center gap-2">
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
            to="/incidencias/nueva"
            className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm shadow-sm"
          >
            <FiPlus className="w-4 h-4" /> Reportar Incidencia
          </Link>
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

      {/* Tabla de Incidencias */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-600">
            <thead className="bg-gray-50 text-gray-500 uppercase text-xs">
              <tr>
                <th className="px-6 py-3 font-semibold">ID / Asunto</th>
                <th className="px-6 py-3 font-semibold">Activo Afectado</th>
                <th className="px-6 py-3 font-semibold">Prioridad</th>
                <th className="px-6 py-3 font-semibold">Estado</th>
                <th className="px-6 py-3 font-semibold">Asignación / Fecha</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {incidenciasFiltradas.length > 0 ? (
                incidenciasFiltradas.map((inc) => (
                  <tr key={inc.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-semibold text-gray-500">
                            {inc.id}
                          </span>
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
                        <span className="flex items-center gap-1 text-gray-700 font-medium">
                          <FiUser className="w-3 h-3 text-gray-400" />
                          {inc.asignado || 'Equipo de Soporte'}
                        </span>
                        <span className="flex items-center gap-1 text-gray-400 mt-0.5">
                          <FiClock className="w-3 h-3" />
                          {inc.fecha || 'Reciente'}
                        </span>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                    <p className="font-medium">No se encontraron incidencias</p>
                    <p className="text-xs text-gray-400 mt-1">
                      {terminoBusqueda ? 'Prueba con otro término de búsqueda.' : 'Crea una nueva incidencia para comenzar.'}
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Incidencias;
