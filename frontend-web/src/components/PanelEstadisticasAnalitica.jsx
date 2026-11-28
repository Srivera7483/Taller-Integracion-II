import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  FiBarChart2,
  FiClock,
  FiCheckCircle,
  FiBox,
  FiMapPin,
  FiLayers,
  FiUser,
  FiRefreshCw,
  FiAlertCircle,
  FiTrendingUp,
} from 'react-icons/fi';
import {
  puedeVerEstadisticasActivos,
  puedeVerMetricasMttr,
  fetchEstadisticasActivos,
  fetchMetricasTiempoResolucion,
} from '../services/estadisticasService';

const EsqueletoTarjeta = () => (
  <div
    role="status"
    aria-label="Cargando métricas analíticas"
    className="bg-white rounded-xl border border-gray-200 p-5 space-y-4 animate-pulse"
  >
    <div className="flex items-center justify-between">
      <div className="h-4 w-44 bg-gray-200 rounded" />
      <div className="h-6 w-20 bg-gray-100 rounded-full" />
    </div>
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      <div className="h-16 bg-gray-100 rounded-lg" />
      <div className="h-16 bg-gray-100 rounded-lg" />
      <div className="h-16 bg-gray-100 rounded-lg" />
      <div className="h-16 bg-gray-100 rounded-lg" />
    </div>
    <div className="space-y-2.5 pt-1">
      <div className="h-3 w-full bg-gray-100 rounded" />
      <div className="h-3 w-5/6 bg-gray-100 rounded" />
      <div className="h-3 w-2/3 bg-gray-100 rounded" />
    </div>
  </div>
);

/**
 * Panel analítico institucional para visualización en tiempo real de:
 * 1. Estadísticas de Activos por estado, categoría y ubicación/edificio (GET /api/v1/activos/estadisticas — TAL-6).
 * 2. Tiempo Medio de Resolución (MTTR), tasa de resolución y comparativa por técnico y activo (GET /api/v1/estadisticas/tiempo-resolucion — TAL-128).
 */
const PanelEstadisticasAnalitica = ({ soloActivos = false, refreshTrigger = 0 }) => {
  const autorizadoActivos = puedeVerEstadisticasActivos();
  const autorizadoMttr = !soloActivos && puedeVerMetricasMttr();

  const [estadisticasActivos, setEstadisticasActivos] = useState(null);
  const [cargandoActivos, setCargandoActivos] = useState(() => autorizadoActivos);
  const [errorActivos, setErrorActivos] = useState(false);

  const [metricasMttr, setMetricasMttr] = useState(null);
  const [cargandoMttr, setCargandoMttr] = useState(() => autorizadoMttr);
  const [errorMttr, setErrorMttr] = useState(false);

  const [actualizandoManual, setActualizandoManual] = useState(false);

  const consultarActivos = useCallback(async () => {
    if (!autorizadoActivos) return;
    try {
      const datos = await fetchEstadisticasActivos();
      setEstadisticasActivos(datos);
      setErrorActivos(false);
    } catch {
      setErrorActivos(true);
    } finally {
      setCargandoActivos(false);
    }
  }, [autorizadoActivos]);

  const consultarMttr = useCallback(async () => {
    if (!autorizadoMttr) return;
    try {
      const datos = await fetchMetricasTiempoResolucion();
      setMetricasMttr(datos);
      setErrorMttr(false);
    } catch {
      setErrorMttr(true);
    } finally {
      setCargandoMttr(false);
    }
  }, [autorizadoMttr]);

  useEffect(() => {
    let cancelado = false;

    if (autorizadoActivos) {
      fetchEstadisticasActivos()
        .then((datos) => {
          if (cancelado) return;
          setEstadisticasActivos(datos);
          setErrorActivos(false);
        })
        .catch(() => {
          if (!cancelado) setErrorActivos(true);
        })
        .finally(() => {
          if (!cancelado) setCargandoActivos(false);
        });
    }

    if (autorizadoMttr) {
      fetchMetricasTiempoResolucion()
        .then((datos) => {
          if (cancelado) return;
          setMetricasMttr(datos);
          setErrorMttr(false);
        })
        .catch(() => {
          if (!cancelado) setErrorMttr(true);
        })
        .finally(() => {
          if (!cancelado) setCargandoMttr(false);
        });
    }

    return () => {
      cancelado = true;
    };
  }, [autorizadoActivos, autorizadoMttr, refreshTrigger]);

  const handleRecargaManual = async () => {
    setActualizandoManual(true);
    if (autorizadoActivos && !estadisticasActivos) setCargandoActivos(true);
    if (autorizadoMttr && !metricasMttr) setCargandoMttr(true);
    await Promise.all([consultarActivos(), consultarMttr()]);
    setActualizandoManual(false);
  };

  // Criterio 3: Control de acceso RBAC — oculto para roles sin permiso `estadisticas:ver`
  if (!autorizadoActivos && !autorizadoMttr) {
    return null;
  }

  return (
    <section
      id="panel-analitica-institucional"
      aria-label="Indicadores analíticos de activos y tiempos de resolución"
      className="space-y-6"
    >
      {/* Encabezado de la sección analítica */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-primary-50 text-primary border border-primary-200">
            <FiBarChart2 className="w-4 h-4" aria-hidden="true" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm font-bold text-gray-900">
                {soloActivos
                  ? 'Estadísticas del Parque de Activos'
                  : 'Visualización de Métricas y KPIs Operativos'}
              </h3>
              {(estadisticasActivos?.origenDatos === 'offline_indexeddb' ||
                metricasMttr?.origenDatos === 'offline_indexeddb') && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                  Caché Offline (IndexedDB)
                </span>
              )}
              {metricasMttr?.origenDatos === 'fallback_incidencias' && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                  Calculado desde Incidencias
                </span>
              )}
            </div>
            <p className="text-xs text-gray-500">
              {autorizadoMttr
                ? 'Distribución de activos por categoría/ubicación y Tiempo Medio de Resolución (MTTR)'
                : 'Resumen en tiempo real de operatividad, categorías y distribución por edificio'}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleRecargaManual}
          disabled={actualizandoManual || cargandoActivos || cargandoMttr}
          aria-label="Actualizar métricas analíticas"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-gray-700 bg-white hover:bg-gray-50 border border-gray-300 rounded-lg transition shadow-2xs disabled:opacity-50 cursor-pointer w-fit focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          <FiRefreshCw
            className={`w-3.5 h-3.5 ${
              actualizandoManual || cargandoActivos || cargandoMttr ? 'animate-spin text-primary' : ''
            }`}
            aria-hidden="true"
          />
          <span>{actualizandoManual ? 'Actualizando...' : 'Actualizar métricas'}</span>
        </button>
      </div>

      {/* BLOQUE 1 (TAL-128): Métricas MTTR y Tasa de Resolución — Solo ADMINISTRADOR con estadisticas:ver */}
      {autorizadoMttr && (
        <div>
          {cargandoMttr && !metricasMttr ? (
            <EsqueletoTarjeta />
          ) : errorMttr && !metricasMttr ? (
            <div className="bg-white rounded-xl border border-amber-200 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 text-xs text-amber-800">
                <FiAlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0" aria-hidden="true" />
                <span>
                  Las métricas de Tiempo Medio de Resolución (MTTR) no están disponibles temporalmente.
                </span>
              </div>
              <button
                type="button"
                onClick={handleRecargaManual}
                className="px-3 py-1.5 text-xs font-semibold bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-lg transition cursor-pointer w-fit"
              >
                Reintentar
              </button>
            </div>
          ) : metricasMttr ? (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 space-y-5">
              {/* Tarjetas resumen MTTR, Tasa de Resolución y Órdenes Cerradas */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-4 rounded-xl bg-blue-50/60 border border-blue-100 flex items-start justify-between">
                  <div>
                    <span className="text-xs font-semibold text-blue-800 uppercase tracking-wide">
                      MTTR Promedio Global
                    </span>
                    <p
                      id="kpi-mttr-valor"
                      className="text-2xl font-extrabold text-gray-900 mt-1"
                    >
                      {metricasMttr.mttrFormateado}
                    </p>
                    <span className="text-[11px] text-gray-600">
                      Tiempo medio desde orden hasta resolución
                    </span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-blue-100 text-blue-700">
                    <FiClock className="w-5 h-5" aria-hidden="true" />
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-emerald-50/60 border border-emerald-100 flex items-start justify-between">
                  <div>
                    <span className="text-xs font-semibold text-emerald-800 uppercase tracking-wide">
                      Tasa de Resolución
                    </span>
                    <p
                      id="kpi-tasa-resolucion"
                      className="text-2xl font-extrabold text-gray-900 mt-1"
                    >
                      {`${metricasMttr.tasaResolucion}%`}
                    </p>
                    <span className="text-[11px] text-gray-600">
                      Sobre {metricasMttr.totalIncidenciasGlobal} incidencias registradas
                    </span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-emerald-100 text-emerald-700">
                    <FiTrendingUp className="w-5 h-5" aria-hidden="true" />
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-indigo-50/60 border border-indigo-100 flex items-start justify-between">
                  <div>
                    <span className="text-xs font-semibold text-indigo-800 uppercase tracking-wide">
                      Órdenes Computadas (MTTR)
                    </span>
                    <p className="text-2xl font-extrabold text-gray-900 mt-1">
                      {metricasMttr.totalOrdenesCerradas}
                    </p>
                    <span className="text-[11px] text-gray-600">
                      Órdenes con ciclo de resolución cerrado
                    </span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-indigo-100 text-indigo-700">
                    <FiCheckCircle className="w-5 h-5" aria-hidden="true" />
                  </div>
                </div>
              </div>

              {/* Estado vacío cuando aún no hay órdenes resueltas */}
              {metricasMttr.sinOrdenesResueltas ? (
                <div className="py-6 px-4 text-center bg-gray-50 rounded-xl border border-dashed border-gray-200">
                  <p className="text-xs font-semibold text-gray-700">
                    Aún no existen órdenes de trabajo resueltas para comparar tiempos por técnico o activo.
                  </p>
                  <p className="text-[11px] text-gray-500 mt-1">
                    En cuanto se resuelvan incidencias con orden asignada, aquí se mostrará el desglose comparativo en horas.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-1">
                  {/* Comparativa de tiempos por Técnico */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold text-gray-800 uppercase tracking-wider flex items-center gap-1.5">
                        <FiUser className="w-3.5 h-3.5 text-primary" aria-hidden="true" />
                        <span>Tiempo de Atención por Técnico</span>
                      </h4>
                      <span className="text-[11px] text-gray-500">Promedio (horas)</span>
                    </div>

                    {metricasMttr.desglosePorTecnico.length === 0 ? (
                      <p className="text-xs text-gray-500 italic">Sin registros por técnico.</p>
                    ) : (
                      <ul className="space-y-2.5">
                        {metricasMttr.desglosePorTecnico.slice(0, 6).map((tec) => (
                          <li key={tec.id_tecnico} className="space-y-1">
                            <div className="flex items-center justify-between text-xs">
                              <span className="font-semibold text-gray-800 truncate pr-2">
                                {tec.nombre_tecnico}
                              </span>
                              <span className="font-mono text-gray-700 whitespace-nowrap">
                                <strong>{tec.promedioHoras} h</strong>{' '}
                                <span className="text-gray-500">
                                  ({tec.totalOrdenesCerradas}{' '}
                                  {tec.totalOrdenesCerradas === 1 ? 'orden' : 'órdenes'})
                                </span>
                              </span>
                            </div>
                            <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-blue-600 rounded-full transition-all duration-300"
                                style={{ width: `${tec.porcentajeBarra}%` }}
                              />
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  {/* Comparativa de tiempos por Activo */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold text-gray-800 uppercase tracking-wider flex items-center gap-1.5">
                        <FiBox className="w-3.5 h-3.5 text-indigo-600" aria-hidden="true" />
                        <span>Tiempo de Atención por Activo</span>
                      </h4>
                      <span className="text-[11px] text-gray-500">Promedio (horas)</span>
                    </div>

                    {metricasMttr.desglosePorActivo.length === 0 ? (
                      <p className="text-xs text-gray-500 italic">Sin registros por activo.</p>
                    ) : (
                      <ul className="space-y-2.5">
                        {metricasMttr.desglosePorActivo.slice(0, 6).map((act) => (
                          <li key={act.id_activo} className="space-y-1">
                            <div className="flex items-center justify-between text-xs">
                              <Link
                                to={`/trazabilidad/${encodeURIComponent(act.id_activo)}`}
                                className="font-semibold text-indigo-700 hover:underline truncate pr-2 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                                title={`Ver trazabilidad de ${act.nombre_activo}`}
                              >
                                {act.nombre_activo}
                              </Link>
                              <span className="font-mono text-gray-700 whitespace-nowrap">
                                <strong>{act.promedioHoras} h</strong>{' '}
                                <span className="text-gray-500">
                                  ({act.totalOrdenesCerradas}{' '}
                                  {act.totalOrdenesCerradas === 1 ? 'falla' : 'fallas'})
                                </span>
                              </span>
                            </div>
                            <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-indigo-600 rounded-full transition-all duration-300"
                                style={{ width: `${act.porcentajeBarra}%` }}
                              />
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              )}

              {/* Distribución global por estado y prioridad si existen datos */}
              {(metricasMttr.distribucionEstados.length > 0 ||
                metricasMttr.distribucionPrioridades.length > 0) && (
                <div className="pt-3 border-t border-gray-100 flex flex-wrap items-center justify-between gap-3 text-xs">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="font-semibold text-gray-600 mr-1">Por estado:</span>
                    {metricasMttr.distribucionEstados.map((item) => (
                      <span
                        key={item.estado}
                        className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-700 font-medium border border-gray-200"
                      >
                        {item.estado}: <strong>{item.total}</strong>
                      </span>
                    ))}
                  </div>
                  {metricasMttr.distribucionPrioridades.length > 0 && (
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="font-semibold text-gray-600 mr-1">Por prioridad:</span>
                      {metricasMttr.distribucionPrioridades.map((item) => (
                        <span
                          key={item.prioridad}
                          className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-medium border border-slate-200 uppercase text-[11px]"
                        >
                          {item.prioridad}: <strong>{item.total}</strong>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : null}
        </div>
      )}

      {/* BLOQUE 2 (TAL-6): Estadísticas de Activos por Categoría y Ubicación — SUPERVISOR y ADMINISTRADOR */}
      {autorizadoActivos && (
        <div>
          {cargandoActivos && !estadisticasActivos ? (
            <EsqueletoTarjeta />
          ) : errorActivos && !estadisticasActivos ? (
            <div className="bg-white rounded-xl border border-amber-200 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 text-xs text-amber-800">
                <FiAlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0" aria-hidden="true" />
                <span>
                  No se pudieron cargar las estadísticas de inventario en este momento.
                </span>
              </div>
              <button
                type="button"
                onClick={handleRecargaManual}
                className="px-3 py-1.5 text-xs font-semibold bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-lg transition cursor-pointer w-fit"
              >
                Reintentar
              </button>
            </div>
          ) : estadisticasActivos ? (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 space-y-5">
              {/* Resumen superior del inventario */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="p-3.5 rounded-xl bg-gray-50 border border-gray-200/80">
                  <span className="text-[11px] font-semibold text-gray-600 uppercase">
                    Activos Totales
                  </span>
                  <p
                    id="kpi-total-activos"
                    className="text-xl font-extrabold text-gray-900 mt-0.5"
                  >
                    {estadisticasActivos.totalActivos}
                  </p>
                  <span className="text-[11px] text-gray-600">
                    {estadisticasActivos.resumen.disponibles} disponibles
                  </span>
                </div>

                <div className="p-3.5 rounded-xl bg-emerald-50/60 border border-emerald-200/70">
                  <span className="text-[11px] font-semibold text-emerald-800 uppercase">
                    Operatividad
                  </span>
                  <p className="text-xl font-extrabold text-emerald-900 mt-0.5">
                    {`${estadisticasActivos.porcentajes.tasaOperatividad}%`}
                  </p>
                  <span className="text-[11px] text-emerald-700">
                    {estadisticasActivos.porEstado.operativos} equipos operativos
                  </span>
                </div>

                <div className="p-3.5 rounded-xl bg-amber-50/60 border border-amber-200/70">
                  <span className="text-[11px] font-semibold text-amber-800 uppercase">
                    En Mantenimiento / Revisión
                  </span>
                  <p className="text-xl font-extrabold text-amber-900 mt-0.5">
                    {estadisticasActivos.porEstado.enMantenimiento +
                      estadisticasActivos.porEstado.enRevision}
                  </p>
                  <span className="text-[11px] text-amber-700">
                    {estadisticasActivos.porEstado.enMantenimiento} mant. ·{' '}
                    {estadisticasActivos.porEstado.enRevision} rev.
                  </span>
                </div>

                <div className="p-3.5 rounded-xl bg-rose-50/60 border border-rose-200/70">
                  <span className="text-[11px] font-semibold text-rose-800 uppercase">
                    Dados de Baja
                  </span>
                  <p className="text-xl font-extrabold text-rose-900 mt-0.5">
                    {estadisticasActivos.porEstado.dadosDeBaja}
                  </p>
                  <span className="text-[11px] text-rose-700">
                    {`${estadisticasActivos.porcentajes.tasaBaja}% del inventario`}
                  </span>
                </div>
              </div>

              {estadisticasActivos.estaVacio ? (
                <div className="py-6 px-4 text-center bg-gray-50 rounded-xl border border-dashed border-gray-200">
                  <p className="text-xs font-semibold text-gray-700">
                    No existen activos registrados actualmente en el catálogo para desglosar.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-1">
                  {/* Distribución por Categoría */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold text-gray-800 uppercase tracking-wider flex items-center gap-1.5">
                        <FiLayers className="w-3.5 h-3.5 text-emerald-700" aria-hidden="true" />
                        <span>Distribución por Categoría</span>
                      </h4>
                      <span className="text-[11px] text-gray-500">Equipos (%)</span>
                    </div>

                    <ul className="space-y-2.5">
                      {estadisticasActivos.distribucionCategorias.map((cat) => (
                        <li key={cat.clave} className="space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-semibold text-gray-800">{cat.etiqueta}</span>
                            <span className="font-mono text-gray-700">
                              <strong>{cat.total}</strong>{' '}
                              <span className="text-gray-500">({cat.porcentaje}%)</span>
                            </span>
                          </div>
                          <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-emerald-600 rounded-full transition-all duration-300"
                              style={{ width: `${Math.max(4, cat.porcentaje)}%` }}
                            />
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Distribución por Ubicación / Edificio */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold text-gray-800 uppercase tracking-wider flex items-center gap-1.5">
                        <FiMapPin className="w-3.5 h-3.5 text-primary" aria-hidden="true" />
                        <span>Distribución por Ubicación / Edificio</span>
                      </h4>
                      <span className="text-[11px] text-gray-500">Equipos (%)</span>
                    </div>

                    <ul className="space-y-2.5">
                      {estadisticasActivos.distribucionUbicaciones.slice(0, 6).map((ubi) => (
                        <li key={ubi.etiqueta} className="space-y-1">
                          <div className="flex items-center justify-between text-xs gap-2">
                            <span className="font-medium text-gray-800 truncate" title={ubi.etiqueta}>
                              {ubi.etiqueta}
                            </span>
                            <span className="font-mono text-gray-700 whitespace-nowrap">
                              <strong>{ubi.total}</strong>{' '}
                              <span className="text-gray-500">({ubi.porcentaje}%)</span>
                            </span>
                          </div>
                          <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-primary rounded-full transition-all duration-300"
                              style={{ width: `${Math.max(4, ubi.porcentaje)}%` }}
                            />
                          </div>
                        </li>
                      ))}
                    </ul>

                    {estadisticasActivos.distribucionEdificios.length > 0 && (
                      <div className="pt-2 flex flex-wrap items-center gap-1.5 text-[11px]">
                        <span className="font-semibold text-gray-600">Resumen por edificio:</span>
                        {estadisticasActivos.distribucionEdificios.map((ed) => (
                          <span
                            key={ed.edificio}
                            className="px-2 py-0.5 rounded-full bg-primary-50 text-primary font-semibold border border-primary-200"
                          >
                            {ed.edificio}: {ed.total}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ) : null}
        </div>
      )}
    </section>
  );
};

export default PanelEstadisticasAnalitica;
