import React from 'react';
import { LuTriangleAlert, LuCircleAlert, LuInfo } from 'react-icons/lu';
import { HiExclamationTriangle } from 'react-icons/hi2';
import { FiUser, FiClock, FiArrowRight } from 'react-icons/fi';
import { Link } from 'react-router-dom';

/**
 * Panel condicional de Incidencia Rechazada.
 * Se renderiza de manera destacada para el Reportante cuando estado === 'RECHAZADO'.
 * Utiliza tonalidades rojas suaves y advertencia (bg-red-50 text-red-800 border border-red-200)
 * mostrando de forma empática, clara y estética el Motivo de Rechazo ingresado por el técnico.
 */
const PanelIncidenciaRechazada = ({
  motivoRechazo,
  fechaRechazo,
  tecnicoNombre,
  idActivo,
}) => {
  return (
    <div
      id="panel-incidencia-rechazada"
      data-testid="panel-incidencia-rechazada"
      className="bg-red-50 text-red-800 border border-red-200 rounded-2xl p-5 sm:p-7 space-y-5 shadow-sm transition-all animate-fadeIn"
      role="region"
      aria-label="Detalle de Rechazo de la Incidencia"
    >
      {/* Cabecera del Panel con Icono Representativo de Advertencia */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-red-200/80 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-red-100 border border-red-300 flex items-center justify-center text-red-700 shadow-2xs flex-shrink-0">
            <HiExclamationTriangle className="w-6 h-6 text-red-600" aria-hidden="true" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-lg sm:text-xl font-bold text-red-950 tracking-tight">
                Incidencia Desestimada / Rechazada
              </h3>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-black uppercase tracking-wider bg-red-200/80 text-red-900 border border-red-300">
                <LuTriangleAlert className="w-3 h-3 text-red-700" />
                RECHAZADO
              </span>
            </div>
            <p className="text-xs sm:text-sm text-red-700 mt-0.5">
              El equipo técnico evaluó el caso y determinó que la incidencia no corresponde a una falla de servicio.
            </p>
          </div>
        </div>

        {fechaRechazo && (
          <div className="flex items-center gap-1.5 text-xs text-red-600 font-medium sm:self-start bg-red-100/60 px-3 py-1.5 rounded-lg border border-red-200">
            <FiClock className="w-3.5 h-3.5" />
            <span>Rechazado el {fechaRechazo}</span>
          </div>
        )}
      </div>

      {/* Bloque Grande y Visible: Motivo de Rechazo ingresado por el Técnico */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs uppercase tracking-wider font-bold text-red-900">
          <span className="flex items-center gap-1.5">
            <LuCircleAlert className="w-4 h-4 text-red-600" />
            Motivo de Rechazo ingresado por el Técnico
          </span>
          {tecnicoNombre && (
            <span className="flex items-center gap-1 lowercase text-red-700 font-normal">
              <FiUser className="w-3 h-3" />
              <span>atendido por <strong className="font-semibold text-red-900">{tecnicoNombre}</strong></span>
            </span>
          )}
        </div>

        {/* Caja Principal del Motivo con Tipografía Destacada */}
        <div className="bg-white/95 border-2 border-red-200 rounded-xl p-4 sm:p-5 shadow-xs">
          <p className="text-base sm:text-lg font-medium text-red-950 leading-relaxed whitespace-pre-wrap">
            {motivoRechazo || 'No se ingresó un detalle explicativo específico para este rechazo.'}
          </p>
        </div>
      </div>

      {/* Orientación Empática y Sugerencias de Acción para el Reportante */}
      <div className="bg-red-100/60 border border-red-200/90 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs sm:text-sm text-red-900">
        <div className="flex items-start gap-2.5">
          <LuInfo className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-semibold text-red-950">
              ¿Qué significa este estado para ti como reportante?
            </p>
            <p className="text-xs text-red-800 leading-normal">
              Indica que el activo no presenta desperfectos técnicos o que la situación obedeció a factores externos (ej. cable desenchufado, error operacional o configuración voluntaria).
            </p>
          </div>
        </div>

        {idActivo && (
          <Link
            to={`/incidencias/nueva?id_activo=${encodeURIComponent(idActivo)}`}
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-red-700 hover:bg-red-800 active:scale-98 text-white rounded-lg text-xs font-bold transition-all shadow-xs flex-shrink-0 cursor-pointer"
            title="Crear un nuevo reporte si el problema técnico persiste"
          >
            <span>Generar Nuevo Reporte</span>
            <FiArrowRight className="w-3.5 h-3.5" />
          </Link>
        )}
      </div>
    </div>
  );
};

export default PanelIncidenciaRechazada;
