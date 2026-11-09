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
  FiSliders,
  FiSearch,
  FiRotateCcw,
  FiHash,
} from 'react-icons/fi';
import FiltrosRangoFechasMantenimientos from '../components/FiltrosRangoFechasMantenimientos';
import { fetchMantenimientos } from '../services/mantenimientosService';
import { hasPermission } from '../services/authService';

const calcularVigenciaFecha = (fechaProgramada) => {
  if (!fechaProgramada) return 'programado';
  const fecha = new Date(fechaProgramada);
  if (isNaN(fecha.getTime())) return 'programado';

  const ahora = new Date();
  const inicioHoy = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate(), 0, 0, 0, 0);
  const finHoy = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate(), 23, 59, 59, 999);

  if (fecha < inicioHoy) return 'vencido';
  if (fecha >= inicioHoy && fecha <= finHoy) return 'hoy';
  return 'programado';
};

const Mantenimientos = () => {
  const [searchParams] = useSearchParams();
  const [mantenimientos, setMantenimientos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);
  const [filtroTexto, setFiltroTexto] = useState('');

  // Control de permisos RBAC para programar mantenimientos preventivos
  const puedeCrearMantenimientos = hasPermission('mantenimientos:crear');

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
    } catch {
      setError('No fue posible cargar el cronograma de mantenimientos. Por favor, reintente.');
    } finally {
      setCargando(false);
    }
  }, [startDate, endDate]);

  useEffect(() => {
    void cargarMantenimientos();
  }, [cargarMantenimientos]);

  // Filtrado local adicional por texto basado en los atributos reales de MANTENIMIENTOS_PREVENTIVOS y ACTIVOS
  const mantenimientosFiltrados = useMemo(() => {
    if (!filtroTexto.trim()) return mantenimientos;
    const q = filtroTexto.toLowerCase();
    return mantenimientos.filter((m) => {
      const idMant = String(m.id_mantenimiento || m.id || '');
      const idActivo = String(m.id_activo || '');
      const nombreActivo = m.activo?.nombre || '';
      const codigoQr = m.activo?.codigoQr || m.activo?.codigo_qr || '';
      const ubicacion = typeof m.activo?.ubicacion === 'string' ? m.activo.ubicacion : '';
      return (
        idMant.toLowerCase().includes(q) ||
        idActivo.toLowerCase().includes(q) ||
        nombreActivo.toLowerCase().includes(q) ||
        codigoQr.toLowerCase().includes(q) ||
        ubicacion.toLowerCase().includes(q)
      );
    });
  }, [mantenimientos, filtroTexto]);

  // Métricas derivadas directamente de fecha_programada (MANTENIMIENTOS_PREVENTIVOS)
  const metricas = useMemo(() => {
    const total = mantenimientos.length;
    let programados = 0;
    let paraHoy = 0;
    let vencidos = 0;

    for (const m of mantenimientos) {
      const vigencia = calcularVigenciaFecha(m.fecha_programada);
      if (vigencia === 'vencido') vencidos++;
      else if (vigencia === 'hoy') paraHoy++;
      else programados++;
    }

    return { total, programados, paraHoy, vencidos };
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

  const renderBadgeVigencia = (fechaProgramada) => {
    const vigencia = calcularVigenciaFecha(fechaProgramada);
    if (vigencia === 'vencido') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-full bg-rose-50 text-rose-700 border border-rose-200">
          <FiAlertTriangle className="w-3 h-3 text-rose-500" />
          Plazo Vencido
        </span>
      );
    }
    if (vigencia === 'hoy') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-full bg-amber-50 text-amber-700 border border-amber-200">
          <FiClock className="w-3 h-3 text-amber-500 animate-pulse" />
          Programado Hoy
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
        <FiCheckCircle className="w-3 h-3 text-emerald-500" />
        Próximo en Agenda
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
            <span className="p-2 bg-primary-50 text-primary rounded-lg border border-primary-200">
              <FiCalendar className="w-6 h-6" />
            </span>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
                Agenda de Mantenimientos Preventivos
              </h1>
              <p className="text-sm text-gray-500">
                Consulta y gestión del cronograma preventivo de activos con filtrado dinámico por fechas.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={cargarMantenimientos}
            disabled={cargando}
            aria-label="Actualizar mantenimientos"
            className="inline-flex items-center gap-2 px-3.5 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring transition-colors shadow-sm cursor-pointer"
            title="Actualizar listado"
          >
            <FiRefreshCw className={`w-4 h-4 ${cargando ? 'animate-spin text-primary' : ''}`} />
            <span>Actualizar</span>
          </button>

          {/* Botón de Planificación protegido por permiso RBAC */}
          {puedeCrearMantenimientos && (
            <Link
              to="/mantenimientos/planificar"
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-bold text-white bg-primary hover:bg-primary-hover rounded-lg shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all duration-150"
            >
              <FiPlus className="w-4 h-4" />
              <span>Planificar Mantenimiento</span>
            </Link>
          )}
        </div>
      </div>

      {/* Tarjetas de métricas basadas en fecha_programada */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-4 rounded-xl border border-gray-200/80 shadow-sm flex items-center gap-3">
          <div className="p-3 bg-primary-50 text-primary rounded-lg">
            <FiCalendar className="w-5 h-5" />
          </div>
          <div>
            <div className="text-2xl font-bold text-gray-900">{metricas.total}</div>
            <div className="text-xs text-gray-500 font-medium">
              {hayFiltroFechaActivo ? 'En rango seleccionado' : 'Total registrados'}
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-200/80 shadow-sm flex items-center gap-3">
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-lg">
            <FiCheckCircle className="w-5 h-5" />
          </div>
          <div>
            <div className="text-2xl font-bold text-gray-900">{metricas.programados}</div>
            <div className="text-xs text-gray-500 font-medium">Próximos en agenda</div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-200/80 shadow-sm flex items-center gap-3">
          <div className="p-3 bg-amber-50 text-amber-600 rounded-lg">
            <FiClock className="w-5 h-5" />
          </div>
          <div>
            <div className="text-2xl font-bold text-gray-900">{metricas.paraHoy}</div>
            <div className="text-xs text-gray-500 font-medium">Programados hoy</div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-200/80 shadow-sm flex items-center gap-3">
          <div className="p-3 bg-rose-50 text-rose-600 rounded-lg">
            <FiAlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <div className="text-2xl font-bold text-gray-900">{metricas.vencidos}</div>
            <div className="text-xs text-gray-500 font-medium">Plazo vencido</div>
          </div>
        </div>
      </div>

      {/* Toolbar superior con date pickers y sincronización Query String */}
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
            className="px-3 py-1 bg-red-100 hover:bg-red-200 rounded-lg text-xs font-semibold cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring"
          >
            Reintentar
          </button>
        </div>
      )}

      {/* Tabla de mantenimientos preventivos (MANTENIMIENTOS_PREVENTIVOS) */}
      <div className="bg-white rounded-xl border border-gray-200/80 shadow-sm overflow-hidden">
        {/* Cabecera interna de tabla con buscador de texto rápido */}
        <div className="p-4 sm:p-5 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-gray-50/50">
          <div className="flex items-center gap-2 text-sm font-semibold text-gray-700">
            <FiSliders className="w-4 h-4 text-primary" />
            <span>Mantenimientos Preventivos Agendados</span>
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
              placeholder="Buscar por activo, código QR o ID..."
              className="w-full pl-9 pr-3 py-1.5 text-xs text-gray-900 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring outline-none transition-all"
            />
          </div>
        </div>

        {/* Estado de carga */}
        {cargando ? (
          <div className="py-20 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-primary border-t-transparent mb-3"></div>
            <p className="text-sm font-medium text-gray-600">Consultando cronograma de mantenimientos...</p>
          </div>
        ) : mantenimientosFiltrados.length > 0 ? (
          <>
            {/* Vista Móvil / Tablet Estrecha (< md): Tarjetas Apiladas */}
            <div className="md:hidden p-3 sm:p-4 space-y-3">
              {mantenimientosFiltrados.map((mant) => {
                const idMantenimiento = mant.id_mantenimiento || mant.id;
                const activo = mant.activo || {};
                const idActivo = activo.id || mant.id_activo;
                return (
                  <div
                    key={idMantenimiento}
                    className="bg-white rounded-xl p-4 border border-gray-200 shadow-2xs space-y-3 hover:border-gray-300 transition-all"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h4 className="font-bold text-sm text-gray-900 leading-snug">
                          {activo.nombre || `Activo ${idActivo}`}
                        </h4>
                        <div className="text-xs text-gray-500 flex items-center gap-1.5 mt-0.5">
                          <span className="font-mono bg-gray-100 px-1.5 py-0.5 rounded-md text-gray-700 text-[11px]">
                            {activo.codigoQr || idActivo}
                          </span>
                          {activo.ubicacion && (
                            <span className="text-gray-400">· {activo.ubicacion}</span>
                          )}
                        </div>
                      </div>
                      {renderBadgeVigencia(mant.fecha_programada)}
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs bg-gray-50/80 p-2.5 rounded-lg border border-gray-100">
                      <div>
                        <span className="text-gray-400 block text-[10px] uppercase font-bold">Fecha Programada</span>
                        <div className="flex items-center gap-1 font-medium text-gray-800 mt-0.5">
                          <FiCalendar className="w-3.5 h-3.5 text-gray-400" />
                          <span>{formatearFecha(mant.fecha_programada)}</span>
                        </div>
                      </div>
                      <div>
                        <span className="text-gray-400 block text-[10px] uppercase font-bold">Fecha de Creación</span>
                        <div className="flex items-center gap-1 font-medium text-gray-700 mt-0.5">
                          <FiClock className="w-3.5 h-3.5 text-gray-400" />
                          <span>{formatearFecha(mant.fecha_creacion)}</span>
                        </div>
                      </div>
                      <div className="col-span-2 pt-1 border-t border-gray-200/60 flex items-center justify-between text-[11px] text-gray-500">
                        <span className="font-semibold uppercase text-[10px] text-gray-400">ID Mantenimiento</span>
                        <span className="font-mono text-gray-700">{idMantenimiento}</span>
                      </div>
                    </div>

                    {idActivo && (
                      <div className="pt-1">
                        <Link
                          to={`/trazabilidad/${idActivo}`}
                          className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold text-primary bg-primary-50 hover:bg-primary-100 border border-primary-200 rounded-lg transition-colors shadow-2xs"
                        >
                          <FiActivity className="w-3.5 h-3.5 text-primary" />
                          <span>Ver Trazabilidad del Activo</span>
                        </Link>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Vista Escritorio / Tablet Landscape (>= md): Tabla alineada con MANTENIMIENTOS_PREVENTIVOS */}
            <div className="hidden md:block overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  <tr>
                    <th scope="col" className="px-6 py-3.5">ID Mantenimiento</th>
                    <th scope="col" className="px-6 py-3.5">Activo (id_activo)</th>
                    <th scope="col" className="px-6 py-3.5">Fecha Programada</th>
                    <th scope="col" className="px-6 py-3.5">Fecha de Creación</th>
                    <th scope="col" className="px-6 py-3.5">Vigencia</th>
                    <th scope="col" className="px-6 py-3.5 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-100 text-sm">
                  {mantenimientosFiltrados.map((mant) => {
                    const idMantenimiento = mant.id_mantenimiento || mant.id;
                    const activo = mant.activo || {};
                    const idActivo = activo.id || mant.id_activo;
                    return (
                      <tr
                        key={idMantenimiento}
                        className="hover:bg-primary-50/30 transition-colors group"
                      >
                        {/* id_mantenimiento */}
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="inline-flex items-center gap-1.5 font-mono text-xs font-semibold text-gray-700 bg-gray-100 px-2.5 py-1 rounded-lg border border-gray-200">
                            <FiHash className="w-3.5 h-3.5 text-gray-400" />
                            <span>{String(idMantenimiento).slice(0, 12)}</span>
                          </div>
                        </td>

                        {/* id_activo + datos enriquecidos del activo */}
                        <td className="px-6 py-4">
                          <div className="font-semibold text-gray-900 group-hover:text-primary transition-colors">
                            {activo.nombre || `Activo ${idActivo}`}
                          </div>
                          <div className="text-xs text-gray-500 flex items-center gap-2 mt-0.5">
                            <span className="font-mono bg-gray-100 px-1.5 py-0.5 rounded-lg text-gray-700">
                              {activo.codigoQr || idActivo}
                            </span>
                            {activo.ubicacion && (
                              <span className="text-gray-400">· {activo.ubicacion}</span>
                            )}
                          </div>
                        </td>

                        {/* fecha_programada */}
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2 text-gray-900 font-medium">
                            <FiCalendar className="w-4 h-4 text-primary" />
                            <span>{formatearFecha(mant.fecha_programada)}</span>
                          </div>
                        </td>

                        {/* fecha_creacion */}
                        <td className="px-6 py-4 whitespace-nowrap text-gray-600 text-xs">
                          <div className="flex items-center gap-1.5">
                            <FiClock className="w-3.5 h-3.5 text-gray-400" />
                            <span>{formatearFecha(mant.fecha_creacion)}</span>
                          </div>
                        </td>

                        {/* Vigencia calculada a partir de fecha_programada */}
                        <td className="px-6 py-4 whitespace-nowrap">
                          {renderBadgeVigencia(mant.fecha_programada)}
                        </td>

                        {/* Acciones */}
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          {idActivo ? (
                            <Link
                              to={`/trazabilidad/${idActivo}`}
                              className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:text-primary-hover hover:underline"
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
          </>
        ) : (
          /* Estado vacío */
          <div className="py-16 px-4 text-center">
            <div className="w-12 h-12 mx-auto mb-3 bg-gray-100 text-gray-400 rounded-xl flex items-center justify-center">
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
                  className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-primary bg-primary-50 hover:bg-primary-100 rounded-lg border border-primary-200 transition-colors cursor-pointer"
                >
                  <FiRotateCcw className="w-3.5 h-3.5" />
                  <span>Limpiar filtro de fechas (Ver todos)</span>
                </Link>
              )}

              {puedeCrearMantenimientos && (
                <Link
                  to="/mantenimientos/planificar"
                  className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-primary hover:bg-primary-hover rounded-lg transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0"
                >
                  <FiPlus className="w-3.5 h-3.5" />
                  <span>Agendar nuevo</span>
                </Link>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Mantenimientos;