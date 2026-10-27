import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import {
  FiCalendar,
  FiPlus,
  FiRefreshCw,
  FiActivity,
  FiCheckCircle,
  FiClock,
  FiAlertTriangle,
  FiFilter,
  FiSliders,
  FiSearch,
  FiRotateCcw,
} from 'react-icons/fi';
import FiltrosRangoFechasMantenimientos from '../components/FiltrosRangoFechasMantenimientos';
import { fetchMantenimientos } from '../services/mantenimientosService';

const Mantenimientos = () => {
  const [searchParams] = useSearchParams();
  const [mantenimientos, setMantenimientos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);
  const [filtroTexto, setFiltroTexto] = useState('');

  // Leer rango de fechas desde la URL Query String
  const startDate = searchParams.get('startDate') || '';
  const endDate = searchParams.get('endDate') || '';

  const cargarMantenimientos = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      const data = await fetchMantenimientos({
        startDate: startDate || undefined,
        endDate: endDate || undefined,
      });
      setMantenimientos(data);
    } catch (err) {
      console.error('Error al cargar agenda de mantenimientos:', err);
      setError('No fue posible cargar el cronograma de mantenimientos. Por favor, reintente.');
    } finally {
      setCargando(false);
    }
  }, [startDate, endDate]);

  useEffect(() => {
    cargarMantenimientos();
  }, [cargarMantenimientos]);

  // Filtrado local adicional por texto (búsqueda rápida dentro del rango)
  const mantenimientosFiltrados = useMemo(() => {
    if (!filtroTexto.trim()) return mantenimientos;
    const q = filtroTexto.toLowerCase();
    return mantenimientos.filter((m) => {
      const nombreActivo = m.activo?.nombre || '';
      const codigoQr = m.activo?.codigoQr || '';
      const tipo = m.tipo || '';
      const descripcion = m.descripcion || '';
      const estado = m.estado || '';
      return (
        nombreActivo.toLowerCase().includes(q) ||
        codigoQr.toLowerCase().includes(q) ||
        tipo.toLowerCase().includes(q) ||
        descripcion.toLowerCase().includes(q) ||
        estado.toLowerCase().includes(q)
      );
    });
  }, [mantenimientos, filtroTexto]);

  // Métricas para tarjetas de resumen
  const metricas = useMemo(() => {
    const total = mantenimientos.length;
    const pendientes = mantenimientos.filter((m) => m.estado === 'Pendiente' || !m.estado).length;
    const enProceso = mantenimientos.filter((m) => m.estado === 'En Proceso' || m.estado === 'EnProceso').length;
    const completados = mantenimientos.filter((m) => m.estado === 'Completado' || m.estado === 'Finalizado').length;
    return { total, pendientes, enProceso, completados };
  }, [mantenimientos]);

  const formatearFecha = (fechaStr) => {
    if (!fechaStr) return 'Fecha no especificada';
    try {
      const fecha = new Date(fechaStr);
      if (isNaN(fecha.getTime())) return fechaStr;
      return new Intl.DateTimeFormat('es-CL', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }).format(fecha);
    } catch {
      return fechaStr;
    }
  };

  const getBadgeEstado = (estado) => {
    const estadoLimpio = String(estado || 'Pendiente').toLowerCase();
    if (estadoLimpio.includes('complet')) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
          <FiCheckCircle className="w-3 h-3 text-emerald-500" />
          Completado
        </span>
      );
    }
    if (estadoLimpio.includes('proceso')) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-full bg-blue-50 text-blue-700 border border-blue-200">
          <FiActivity className="w-3 h-3 text-blue-500 animate-pulse" />
          En Proceso
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-full bg-amber-50 text-amber-700 border border-amber-200">
        <FiClock className="w-3 h-3 text-amber-500" />
        Pendiente
      </span>
    );
  };

  const hayFiltroFechaActivo = Boolean(startDate || endDate);

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Cabecera principal */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 bg-blue-100 text-blue-700 rounded-xl">
              <FiCalendar className="w-6 h-6" />
            </span>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
                Agenda de Mantenimientos
              </h1>
              <p className="text-sm text-gray-500">
                Consulta y gestión del cronograma técnico con filtrado dinámico por fechas (TAL-121).
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={cargarMantenimientos}
            disabled={cargando}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors shadow-sm cursor-pointer"
            title="Actualizar listado"
          >
            <FiRefreshCw className={`w-4 h-4 ${cargando ? 'animate-spin text-blue-600' : ''}`} />
            <span>Actualizar</span>
          </button>

          <Link
            to="/mantenimientos/planificar"
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-sm hover:shadow transition-all duration-150"
          >
            <FiPlus className="w-4 h-4" />
            <span>Planificar Mantenimiento</span>
          </Link>
        </div>
      </div>

      {/* Tarjetas de métricas rápidas */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-4 rounded-xl border border-gray-200/80 shadow-sm flex items-center gap-3">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-lg">
            <FiCalendar className="w-5 h-5" />
          </div>
          <div>
            <div className="text-2xl font-bold text-gray-900">{metricas.total}</div>
            <div className="text-xs text-gray-500 font-medium">
              {hayFiltroFechaActivo ? 'En rango seleccionado' : 'Total programados'}
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-200/80 shadow-sm flex items-center gap-3">
          <div className="p-3 bg-amber-50 text-amber-600 rounded-lg">
            <FiClock className="w-5 h-5" />
          </div>
          <div>
            <div className="text-2xl font-bold text-gray-900">{metricas.pendientes}</div>
            <div className="text-xs text-gray-500 font-medium">Pendientes</div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-200/80 shadow-sm flex items-center gap-3">
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-lg">
            <FiActivity className="w-5 h-5" />
          </div>
          <div>
            <div className="text-2xl font-bold text-gray-900">{metricas.enProceso}</div>
            <div className="text-xs text-gray-500 font-medium">En proceso</div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-200/80 shadow-sm flex items-center gap-3">
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-lg">
            <FiCheckCircle className="w-5 h-5" />
          </div>
          <div>
            <div className="text-2xl font-bold text-gray-900">{metricas.completados}</div>
            <div className="text-xs text-gray-500 font-medium">Completados</div>
          </div>
        </div>
      </div>

      {/* Toolbar superior con date pickers y sincronización Query String (TAL-121) */}
      <FiltrosRangoFechasMantenimientos
        onFiltrar={cargarMantenimientos}
        totalResultados={mantenimientosFiltrados.length}
        cargando={cargando}
      />

      {/* Mensaje de error si la petición falla */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-center justify-between text-red-800 text-sm">
          <div className="flex items-center gap-3">
            <FiAlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0" />
            <span>{error}</span>
          </div>
          <button
            onClick={cargarMantenimientos}
            className="px-3 py-1 bg-red-100 hover:bg-red-200 rounded-lg text-xs font-semibold cursor-pointer"
          >
            Reintentar
          </button>
        </div>
      )}

      {/* Tabla de mantenimientos */}
      <div className="bg-white rounded-2xl border border-gray-200/80 shadow-sm overflow-hidden">
        {/* Cabecera interna de tabla con buscador de texto rápido */}
        <div className="p-4 sm:p-5 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-gray-50/50">
          <div className="flex items-center gap-2 text-sm font-semibold text-gray-700">
            <FiSliders className="w-4 h-4 text-blue-600" />
            <span>Mantenimientos Agendados</span>
            <span className="text-xs font-medium text-gray-500 bg-gray-200/80 px-2 py-0.5 rounded-full">
              {mantenimientosFiltrados.length}
            </span>
          </div>

          <div className="relative w-full sm:w-72">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
              <FiSearch className="w-4 h-4" />
            </div>
            <input
              type="text"
              value={filtroTexto}
              onChange={(e) => setFiltroTexto(e.target.value)}
              placeholder="Buscar por activo, código o tipo..."
              className="w-full pl-9 pr-3 py-1.5 text-xs text-gray-900 bg-white border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>

        {/* Estado de carga */}
        {cargando ? (
          <div className="py-20 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-blue-600 border-t-transparent mb-3"></div>
            <p className="text-sm font-medium text-gray-600">Consultando cronograma de mantenimientos...</p>
          </div>
        ) : mantenimientosFiltrados.length > 0 ? (
          /* Tabla de datos */
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                <tr>
                  <th scope="col" className="px-6 py-3.5">ID / Activo</th>
                  <th scope="col" className="px-6 py-3.5">Fecha Programada</th>
                  <th scope="col" className="px-6 py-3.5">Tipo</th>
                  <th scope="col" className="px-6 py-3.5">Estado</th>
                  <th scope="col" className="px-6 py-3.5">Descripción Técnica</th>
                  <th scope="col" className="px-6 py-3.5 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100 text-sm">
                {mantenimientosFiltrados.map((mant) => {
                  const activo = mant.activo || {};
                  return (
                    <tr
                      key={mant.id}
                      className="hover:bg-blue-50/40 transition-colors group"
                    >
                      {/* Activo / Código */}
                      <td className="px-6 py-4">
                        <div className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                          {activo.nombre || 'Activo no asignado'}
                        </div>
                        <div className="text-xs text-gray-500 flex items-center gap-2 mt-0.5">
                          <span className="font-mono bg-gray-100 px-1.5 py-0.5 rounded text-gray-700">
                            {activo.codigoQr || mant.id_activo || mant.id}
                          </span>
                          {activo.ubicacion && (
                            <span className="text-gray-400">· {activo.ubicacion}</span>
                          )}
                        </div>
                      </td>

                      {/* Fecha Programada */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2 text-gray-900 font-medium">
                          <FiCalendar className="w-4 h-4 text-gray-400" />
                          <span>{formatearFecha(mant.fecha_programada)}</span>
                        </div>
                      </td>

                      {/* Tipo */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                          {mant.tipo || 'Preventivo'}
                        </span>
                      </td>

                      {/* Estado */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getBadgeEstado(mant.estado)}
                      </td>

                      {/* Descripción */}
                      <td className="px-6 py-4 text-gray-600 max-w-xs truncate" title={mant.descripcion}>
                        {mant.descripcion || 'Sin descripción adicional'}
                      </td>

                      {/* Acciones */}
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        {activo.id ? (
                          <Link
                            to={`/trazabilidad/${activo.id}`}
                            className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-800 hover:underline"
                          >
                            <FiActivity className="w-3.5 h-3.5" />
                            <span>Trazabilidad</span>
                          </Link>
                        ) : (
                          <span className="text-xs text-gray-400">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          /* Estado vacío */
          <div className="py-16 px-4 text-center">
            <div className="w-12 h-12 mx-auto mb-3 bg-gray-100 text-gray-400 rounded-2xl flex items-center justify-center">
              <FiCalendar className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-gray-900 mb-1">
              {hayFiltroFechaActivo
                ? 'No se encontraron mantenimientos en este rango'
                : 'No hay mantenimientos programados'}
            </h3>
            <p className="text-sm text-gray-500 max-w-md mx-auto mb-5">
              {hayFiltroFechaActivo
                ? `No existen intervenciones técnicas programadas entre ${startDate || 'el inicio'} y ${endDate || 'el fin'}.`
                : 'Aún no se han agendado mantenimientos preventivos en la plataforma.'}
            </p>

            <div className="flex items-center justify-center gap-3">
              {hayFiltroFechaActivo && (
                <Link
                  to="/mantenimientos"
                  className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-xl border border-blue-200 transition-colors cursor-pointer"
                >
                  <FiRotateCcw className="w-3.5 h-3.5" />
                  <span>Limpiar filtro de fechas (Ver todos)</span>
                </Link>
              )}

              <Link
                to="/mantenimientos/planificar"
                className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors"
              >
                <FiPlus className="w-3.5 h-3.5" />
                <span>Agendar nuevo</span>
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Mantenimientos;
