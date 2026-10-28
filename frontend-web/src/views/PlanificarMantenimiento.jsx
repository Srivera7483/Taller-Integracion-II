import React from 'react';
import { Link } from 'react-router-dom';
import { FiCalendar, FiArrowLeft, FiShield, FiChevronRight } from 'react-icons/fi';
import PlanificarMantenimientoForm from '../components/PlanificarMantenimientoForm';

const PlanificarMantenimiento = () => {
  return (
    <div className="max-w-4xl mx-auto py-6 sm:py-8 px-4 sm:px-6 lg:px-8 space-y-6">
      {/* Cabecera y migas de pan corporativas */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/90 pb-6">
        <div>
          <nav className="flex items-center gap-1.5 text-xs text-slate-500 mb-2">
            <Link to="/inventario" className="hover:text-blue-600 transition-colors font-medium">
              Inventario de Activos
            </Link>
            <FiChevronRight className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-slate-800 font-semibold">Planificación Preventiva</span>
          </nav>

          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white flex items-center justify-center shadow-lg shadow-blue-600/20 shrink-0">
              <FiCalendar className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                Planificar Mantenimiento Preventivo
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                Programa intervenciones técnicas con anticipación para salvaguardar la disponibilidad y vida útil de los equipos.
              </p>
            </div>
          </div>
        </div>

        <Link
          to="/inventario"
          className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 hover:text-slate-900 transition-all shadow-sm self-start sm:self-center"
        >
          <FiArrowLeft className="w-4 h-4" />
          <span>Volver al Inventario</span>
        </Link>
      </div>

      {/* Tarjeta de contexto informativo institucional */}
      <div className="bg-gradient-to-r from-blue-50/90 via-indigo-50/60 to-slate-50 border border-blue-200/80 rounded-xl p-4 sm:p-5 flex items-start gap-4 shadow-sm">
        <div className="p-2.5 bg-blue-600 text-white rounded-xl shadow-sm shrink-0 mt-0.5">
          <FiShield className="w-5 h-5" />
        </div>
        <div className="text-xs sm:text-sm text-slate-700 leading-relaxed">
          <p className="font-bold text-slate-900">Protocolo de Calendarización y Cumplimiento</p>
          <p className="text-slate-600 mt-0.5 text-xs leading-normal">
            Las órdenes de trabajo planificadas quedan registradas en el cronograma institucional de infraestructura. El sistema notificará de manera proactiva al equipo técnico asignado para asegurar su ejecución oportuna.
          </p>
        </div>
      </div>

      {/* Formulario principal */}
      <PlanificarMantenimientoForm />
    </div>
  );
};

export default PlanificarMantenimiento;
