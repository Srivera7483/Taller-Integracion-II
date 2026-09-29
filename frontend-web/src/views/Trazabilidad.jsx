import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import {
  FiActivity,
  FiBox,
  FiAlertTriangle,
  FiTool,
  FiCheckCircle,
  FiClock,
  FiMapPin,
  FiCalendar,
  FiFilter,
  FiRefreshCw
} from 'react-icons/fi';
import StatusBadge from '../components/StatusBadge';
import TimelineActivo from '../components/TimelineActivo';
import { useToast } from '../context/ToastContext';
import {
  obtenerTrazabilidadActivoApi,
  obtenerCatalogoActivosResumen
} from '../services/trazabilidadService';

const Trazabilidad = () => {
  const { idActivo } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const { showToast } = useToast();

  // Activo actual (prioriza param de ruta, luego query param, o por defecto el primero)
  const activoInicial = idActivo || searchParams.get('id_activo') || 'ACT-2026-0001';
  const [activoSeleccionado, setActivoSeleccionado] = useState(activoInicial);

  const [datosTrazabilidad, setDatosTrazabilidad] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [filtroTipo, setFiltroTipo] = useState('todos'); // 'todos' | 'fallo' | 'mantenimiento' | 'resolucion' | 'adquisicion'
  const [paginaActual, setPaginaActual] = useState(1);
  const limitePorPagina = 10;

  // Lista de activos disponibles para el selector rápido
  const listaActivos = obtenerCatalogoActivosResumen();

  const cargarDatos = useCallback(async () => {
    setCargando(true);
    try {
      const resp = await obtenerTrazabilidadActivoApi(activoSeleccionado, {
        page: paginaActual,
        limit: limitePorPagina,
        tipoFiltro: filtroTipo,
      });

      if (resp.ok) {
        setDatosTrazabilidad(resp.data);
      }
    } catch (error) {
      console.error('Error al consultar trazabilidad:', error);
      showToast('No fue posible cargar el historial de trazabilidad del activo', 'error');
    } finally {
      setCargando(false);
    }
  }, [activoSeleccionado, paginaActual, filtroTipo, showToast]);

  useEffect(() => {
    cargarDatos();
  }, [cargarDatos]);

  const handleCambiarActivo = (nuevoId) => {
    setActivoSeleccionado(nuevoId);
    setPaginaActual(1);
    setSearchParams({ id_activo: nuevoId });
  };

  const activo = datosTrazabilidad?.activo;
  const resumen = datosTrazabilidad?.resumenEstadistico;

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* 1. Encabezado de la Vista y Selector Rápido de Activo */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-gray-200 shadow-2xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-blue-50 text-blue-600">
              <FiActivity className="w-5 h-5" />
            </span>
            <h2 className="text-xl font-bold text-gray-900 tracking-tight">
              Trazabilidad y Ciclo de Vida del Activo
            </h2>
          </div>
          <p className="text-xs text-gray-500 mt-1 max-w-2xl">
            Historial consolidado de incidencias históricas, reparaciones realizadas y cambios de estado.
          </p>
        </div>

        {/* Selector de Activo y Botón Refrescar */}
        <div className="flex items-center flex-wrap gap-2.5">
          <div className="relative">
            <select
              id="selector-activo-trazabilidad"
              value={activoSeleccionado}
              onChange={(e) => handleCambiarActivo(e.target.value)}
              className="px-3 py-2 text-xs font-semibold bg-gray-50 border border-gray-300 rounded-xl text-gray-800 focus:ring-2 focus:ring-blue-500 focus:outline-none transition shadow-2xs pr-8"
            >
              {listaActivos.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.id} - {item.nombre}
                </option>
              ))}
            </select>
          </div>

          {/* Botón de Refrescar */}
          <button
            type="button"
            onClick={cargarDatos}
            title="Refrescar trazabilidad"
            className="p-2 text-gray-500 hover:text-gray-800 hover:bg-gray-100 rounded-xl transition border border-gray-200"
          >
            <FiRefreshCw className={`w-4 h-4 ${cargando ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* 2. Tarjeta Resumen del Activo Seleccionado */}
      {activo && (
        <div className="bg-white rounded-2xl p-5 border border-gray-200 shadow-2xs space-y-4">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-700 text-white flex items-center justify-center shadow-md shadow-blue-500/20 flex-shrink-0">
                <FiBox className="w-7 h-7" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono text-xs font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                    {activo.codigoQr || activo.id}
                  </span>
                  <span className="text-xs font-semibold px-2 py-0.5 bg-gray-100 text-gray-700 rounded border border-gray-200">
                    {activo.categoria}
                  </span>
                  <StatusBadge status={activo.estadoActual} />
                </div>
                <h3 className="text-lg font-bold text-gray-900 mt-1 break-words">
                  {activo.nombre}
                </h3>
                <p className="text-xs text-gray-500 font-mono mt-0.5 break-words">
                  Modelo: {activo.modelo} • N/S: {activo.numeroSerie}
                </p>
              </div>
            </div>

            {/* Acción Rápida: Reportar Nueva Falla sobre este equipo */}
            <div className="flex items-center gap-2 flex-shrink-0">
              <Link
                to={`/incidencias/nueva?id_activo=${encodeURIComponent(activo.id)}`}
                className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200 rounded-xl hover:bg-rose-100 hover:text-rose-800 transition shadow-2xs"
              >
                <FiAlertTriangle className="w-4 h-4 text-rose-600" />
                <span>Reportar Falla en este Activo</span>
              </Link>
            </div>
          </div>

          {/* Franja de Metadatos oficiales del Activo (Esquema ms-activos / OpenAPI) */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-gray-100 text-xs text-gray-600">
            <div className="flex items-center gap-2">
              <FiMapPin className="text-gray-400 w-4 h-4 flex-shrink-0" />
              <div className="truncate">
                <span className="text-gray-400 block text-[10px] uppercase font-bold">Ubicación</span>
                <span className="font-semibold text-gray-800">{activo.ubicacion}</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <FiCalendar className="text-gray-400 w-4 h-4 flex-shrink-0" />
              <div className="truncate">
                <span className="text-gray-400 block text-[10px] uppercase font-bold">Fecha de Registro</span>
                <span className="font-semibold text-gray-800">
                  {activo.fechaRegistro ? new Date(activo.fechaRegistro).toLocaleDateString() : 'N/D'}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <FiBox className="text-gray-400 w-4 h-4 flex-shrink-0" />
              <div className="truncate">
                <span className="text-gray-400 block text-[10px] uppercase font-bold">Categoría</span>
                <span className="font-semibold text-gray-800">{activo.categoria}</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <FiActivity className="text-gray-400 w-4 h-4 flex-shrink-0" />
              <div className="truncate">
                <span className="text-gray-400 block text-[10px] uppercase font-bold">Estado Operativo</span>
                <span className="font-bold text-gray-900">{activo.estadoActual}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3. Tarjetas KPI de Resumen del Historial */}
      {resumen && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-2xs flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Hitos Totales</p>
              <p className="text-2xl font-bold text-gray-900 font-mono mt-0.5">{resumen.totalHitos}</p>
            </div>
            <div className="w-9 h-9 rounded-xl bg-gray-100 text-gray-700 flex items-center justify-center">
              <FiClock className="w-4 h-4" />
            </div>
          </div>

          <div className="bg-rose-50/70 p-4 rounded-xl border border-rose-200 shadow-2xs flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold text-rose-800 uppercase tracking-wider">Fallos Registrados</p>
              <p className="text-2xl font-bold text-rose-950 font-mono mt-0.5">{resumen.totalFallos}</p>
            </div>
            <div className="w-9 h-9 rounded-xl bg-rose-200/80 text-rose-800 flex items-center justify-center">
              <FiAlertTriangle className="w-4 h-4" />
            </div>
          </div>

          <div className="bg-blue-50/70 p-4 rounded-xl border border-blue-200 shadow-2xs flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold text-blue-800 uppercase tracking-wider">Mantenimientos</p>
              <p className="text-2xl font-bold text-blue-950 font-mono mt-0.5">{resumen.totalMantenimientos}</p>
            </div>
            <div className="w-9 h-9 rounded-xl bg-blue-200/80 text-blue-800 flex items-center justify-center">
              <FiTool className="w-4 h-4" />
            </div>
          </div>

          <div className="bg-emerald-50/70 p-4 rounded-xl border border-emerald-200 shadow-2xs flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider">Resoluciones</p>
              <p className="text-2xl font-bold text-emerald-950 font-mono mt-0.5">{resumen.totalResoluciones}</p>
            </div>
            <div className="w-9 h-9 rounded-xl bg-emerald-200/80 text-emerald-800 flex items-center justify-center">
              <FiCheckCircle className="w-4 h-4" />
            </div>
          </div>
        </div>
      )}

      {/* 4. Línea de Tiempo del Ciclo de Vida */}
      <div className="space-y-4">
        {/* Barra de Filtros de Tipos de Eventos */}
        <div className="bg-white rounded-xl p-3 border border-gray-200 shadow-2xs flex items-center justify-between flex-wrap gap-2.5">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1.5 mr-1">
              <FiFilter className="w-3.5 h-3.5 text-gray-400" />
              Filtrar Hitos:
            </span>

            {/* Todos */}
            <button
              type="button"
              onClick={() => setFiltroTipo('todos')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                filtroTipo === 'todos'
                  ? 'bg-gray-900 text-white shadow-xs'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Todos ({resumen?.totalHitos || 0})
            </button>

            {/* Solo Fallos (Rojo) */}
            <button
              type="button"
              onClick={() => setFiltroTipo('fallo')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${
                filtroTipo === 'fallo'
                  ? 'bg-rose-600 text-white border-rose-600 shadow-xs'
                  : 'bg-rose-50/70 text-rose-800 border-rose-200 hover:bg-rose-100'
              }`}
            >
              <FiAlertTriangle className="w-3.5 h-3.5" />
              <span>Fallos ({resumen?.totalFallos || 0})</span>
            </button>

            {/* Solo Mantenimientos (Azul) */}
            <button
              type="button"
              onClick={() => setFiltroTipo('mantenimiento')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${
                filtroTipo === 'mantenimiento'
                  ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                  : 'bg-blue-50/70 text-blue-800 border-blue-200 hover:bg-blue-100'
              }`}
            >
              <FiTool className="w-3.5 h-3.5" />
              <span>Mantenimientos ({resumen?.totalMantenimientos || 0})</span>
            </button>

            {/* Solo Resoluciones (Verde) */}
            <button
              type="button"
              onClick={() => setFiltroTipo('resolucion')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${
                filtroTipo === 'resolucion'
                  ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                  : 'bg-emerald-50/70 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
              }`}
            >
              <FiCheckCircle className="w-3.5 h-3.5" />
              <span>Resoluciones ({resumen?.totalResoluciones || 0})</span>
            </button>
          </div>
        </div>

        {/* Componente Visual del Timeline Vertical */}
        <div className="bg-white rounded-2xl p-5 sm:p-6 border border-gray-200 shadow-2xs">
          <TimelineActivo
            eventos={datosTrazabilidad?.trazabilidad || []}
            paginacion={datosTrazabilidad?.paginacion}
            onCambiarPagina={(nuevaPag) => setPaginaActual(nuevaPag)}
            cargando={cargando}
          />
        </div>
      </div>
    </div>
  );
};

export default Trazabilidad;
