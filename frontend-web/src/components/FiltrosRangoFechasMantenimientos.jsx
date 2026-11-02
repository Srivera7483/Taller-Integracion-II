import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { FiCalendar, FiFilter, FiRotateCcw, FiAlertCircle, FiClock, FiCheck } from 'react-icons/fi';

/**
 * Componente de barra superior de herramientas (Toolbar) para filtros dinámicos
 * de rango de fechas en la vista de Mantenimientos (TAL-121).
 *
 * Criterios de Aceptación:
 * 1. Si se limpian las fechas, la tabla regresa al listado completo original.
 * 2. El componente se comunica con la lógica backend respetando formato ISO o YYYY-MM-DD.
 */
const FiltrosRangoFechasMantenimientos = ({ onFiltrar, totalResultados = 0, cargando = false }) => {
  const [searchParams, setSearchParams] = useSearchParams();

  // Inicializar estado desde la Query String de la URL (YYYY-MM-DD)
  const initialStartDate = searchParams.get('startDate') || '';
  const initialEndDate = searchParams.get('endDate') || '';

  const [startDate, setStartDate] = useState(initialStartDate);
  const [endDate, setEndDate] = useState(initialEndDate);
  const [errorValidacion, setErrorValidacion] = useState('');
  const [presetActivo, setPresetActivo] = useState('');

  // Sincronizar si la URL cambia externamente (por ejemplo navegación atrás/adelante)
  useEffect(() => {
    const urlStart = searchParams.get('startDate') || '';
    const urlEnd = searchParams.get('endDate') || '';
    setStartDate(urlStart);
    setEndDate(urlEnd);
    if (!urlStart && !urlEnd) {
      setPresetActivo('');
      setErrorValidacion('');
    }
  }, [searchParams]);

  // Validar coherencia temporal del rango
  const validarRango = (inicio, fin) => {
    if (inicio && fin) {
      const dInicio = new Date(inicio);
      const dFin = new Date(fin);
      if (dInicio > dFin) {
        return 'La Fecha Inicio no puede ser posterior a la Fecha Fin.';
      }
    }
    return '';
  };

  const actualizarQueryStringYNotificar = (nuevaFechaInicio, nuevaFechaFin) => {
    const nuevosParams = new URLSearchParams(searchParams);

    if (nuevaFechaInicio) {
      nuevosParams.set('startDate', nuevaFechaInicio);
    } else {
      nuevosParams.delete('startDate');
    }

    if (nuevaFechaFin) {
      nuevosParams.set('endDate', nuevaFechaFin);
    } else {
      nuevosParams.delete('endDate');
    }

    setSearchParams(nuevosParams);

    if (onFiltrar) {
      onFiltrar({
        startDate: nuevaFechaInicio || undefined,
        endDate: nuevaFechaFin || undefined,
      });
    }
  };

  const handleFiltrar = (e) => {
    if (e) e.preventDefault();
    const error = validarRango(startDate, endDate);
    if (error) {
      setErrorValidacion(error);
      return;
    }
    setErrorValidacion('');
    actualizarQueryStringYNotificar(startDate, endDate);
  };

  const handleLimpiar = () => {
    setStartDate('');
    setEndDate('');
    setErrorValidacion('');
    setPresetActivo('');
    actualizarQueryStringYNotificar('', '');
  };

  // Helper para formatear Date a YYYY-MM-DD
  const formatDateToYMD = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Atajos rápidos de rango para técnicos
  const aplicarPreset = (tipo) => {
    const hoy = new Date();
    let inicio = '';
    let fin = '';

    if (tipo === 'hoy') {
      inicio = formatDateToYMD(hoy);
      fin = formatDateToYMD(hoy);
    } else if (tipo === 'semana') {
      const diaSemana = hoy.getDay(); // 0 domingo, 1 lunes...
      const diffLunes = diaSemana === 0 ? -6 : 1 - diaSemana;
      const lunes = new Date(hoy);
      lunes.setDate(hoy.getDate() + diffLunes);
      const domingo = new Date(lunes);
      domingo.setDate(lunes.getDate() + 6);
      inicio = formatDateToYMD(lunes);
      fin = formatDateToYMD(domingo);
    } else if (tipo === 'mes') {
      const primerDia = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
      const ultimoDia = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0);
      inicio = formatDateToYMD(primerDia);
      fin = formatDateToYMD(ultimoDia);
    } else if (tipo === 'proximos30') {
      const mas30 = new Date(hoy);
      mas30.setDate(hoy.getDate() + 30);
      inicio = formatDateToYMD(hoy);
      fin = formatDateToYMD(mas30);
    }

    setStartDate(inicio);
    setEndDate(fin);
    setErrorValidacion('');
    setPresetActivo(tipo);
    actualizarQueryStringYNotificar(inicio, fin);
  };

  const hayFiltrosAplicados = Boolean(searchParams.get('startDate') || searchParams.get('endDate'));

  return (
    <div className="w-full bg-white rounded-xl border border-gray-200/80 shadow-sm overflow-hidden mb-6 transition-all duration-200">
      {/* Barra superior de herramientas (Toolbar) */}
      <div className="p-4 sm:p-5">
        <form onSubmit={handleFiltrar} className="space-y-4">
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
            {/* Controles de selección de rango de fechas */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 flex-1">
              {/* Fecha Inicio */}
              <div>
                <label
                  htmlFor="fecha-inicio-filtro"
                  className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1"
                >
                  Fecha Inicio (Desde)
                </label>
                <div className="relative rounded-lg shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                    <FiCalendar className="w-4 h-4" />
                  </div>
                  <input
                    type="date"
                    id="fecha-inicio-filtro"
                    name="startDate"
                    value={startDate}
                    onChange={(e) => {
                      setStartDate(e.target.value);
                      setErrorValidacion('');
                      setPresetActivo('');
                    }}
                    className="block w-full pl-10 pr-3 py-2 text-sm text-gray-900 bg-gray-50/70 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary focus:bg-white transition-colors"
                    placeholder="YYYY-MM-DD"
                  />
                </div>
              </div>

              {/* Fecha Fin */}
              <div>
                <label
                  htmlFor="fecha-fin-filtro"
                  className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1"
                >
                  Fecha Fin (Hasta)
                </label>
                <div className="relative rounded-lg shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                    <FiCalendar className="w-4 h-4" />
                  </div>
                  <input
                    type="date"
                    id="fecha-fin-filtro"
                    name="endDate"
                    value={endDate}
                    onChange={(e) => {
                      setEndDate(e.target.value);
                      setErrorValidacion('');
                      setPresetActivo('');
                    }}
                    className="block w-full pl-10 pr-3 py-2 text-sm text-gray-900 bg-gray-50/70 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary focus:bg-white transition-colors"
                    placeholder="YYYY-MM-DD"
                  />
                </div>
              </div>
            </div>

            {/* Botonera de acción principal */}
            <div className="flex items-center gap-2 pt-1 lg:pt-0">
              <button
                type="submit"
                id="btn-filtrar-mantenimientos"
                disabled={cargando}
                className="inline-flex items-center justify-center gap-2 px-5 py-2 text-sm font-bold text-white bg-primary hover:bg-primary-hover active:bg-primary-900 rounded-lg shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 cursor-pointer"
              >
                <FiFilter className="w-4 h-4" />
                <span>{cargando ? 'Filtrando...' : 'Filtrar'}</span>
              </button>

              <button
                type="button"
                id="btn-limpiar-filtros"
                onClick={handleLimpiar}
                disabled={cargando || (!startDate && !endDate && !hayFiltrosAplicados)}
                title="Limpiar rango y volver al listado original"
                className="inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 active:bg-gray-300 rounded-lg transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                <FiRotateCcw className="w-4 h-4" />
                <span>Limpiar</span>
              </button>
            </div>
          </div>

          {/* Mensaje de validación de fechas */}
          {errorValidacion && (
            <div className="flex items-center gap-2 p-2.5 text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg animate-fadeIn">
              <FiAlertCircle className="w-4 h-4 flex-shrink-0 text-red-500" />
              <span>{errorValidacion}</span>
            </div>
          )}

          {/* Presets rápidos para comodidad del técnico */}
          <div className="pt-2 border-t border-gray-100 flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
              <span className="text-xs font-medium text-gray-500 flex items-center gap-1 mr-1">
                <FiClock className="w-3.5 h-3.5" />
                Atajos:
              </span>
              <button
                type="button"
                onClick={() => aplicarPreset('hoy')}
                className={`px-2.5 py-1 text-xs rounded-lg font-medium transition-colors cursor-pointer ${
                  presetActivo === 'hoy'
                    ? 'bg-primary-50 text-primary border border-primary-200 font-semibold'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                Hoy
              </button>
              <button
                type="button"
                onClick={() => aplicarPreset('semana')}
                className={`px-2.5 py-1 text-xs rounded-lg font-medium transition-colors cursor-pointer ${
                  presetActivo === 'semana'
                    ? 'bg-primary-50 text-primary border border-primary-200 font-semibold'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                Esta semana
              </button>
              <button
                type="button"
                onClick={() => aplicarPreset('mes')}
                className={`px-2.5 py-1 text-xs rounded-lg font-medium transition-colors cursor-pointer ${
                  presetActivo === 'mes'
                    ? 'bg-primary-50 text-primary border border-primary-200 font-semibold'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                Este mes
              </button>
              <button
                type="button"
                onClick={() => aplicarPreset('proximos30')}
                className={`px-2.5 py-1 text-xs rounded-lg font-medium transition-colors cursor-pointer ${
                  presetActivo === 'proximos30'
                    ? 'bg-primary-50 text-primary border border-primary-200 font-semibold'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                Próximos 30 días
              </button>
            </div>

            {/* Indicador de estado de filtrado activo */}
            {hayFiltrosAplicados && (
              <div className="flex items-center gap-2 text-xs text-primary bg-primary-50 px-3 py-1 rounded-full border border-primary-200">
                <FiCheck className="w-3.5 h-3.5 text-primary" />
                <span>
                  Filtro activo: {searchParams.get('startDate') || 'Inicio'} → {searchParams.get('endDate') || 'Fin'} ({totalResultados} {totalResultados === 1 ? 'mantenimiento' : 'mantenimientos'})
                </span>
                <button
                  type="button"
                  onClick={handleLimpiar}
                  className="ml-1 text-primary/70 hover:text-primary font-bold cursor-pointer"
                  title="Quitar filtro"
                >
                  ×
                </button>
              </div>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};

export default FiltrosRangoFechasMantenimientos;
