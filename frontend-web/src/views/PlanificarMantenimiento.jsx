import React from 'react';
import { Link } from 'react-router-dom';
import { FiCalendar, FiArrowLeft, FiShield } from 'react-icons/fi';
import PlanificarMantenimientoForm from '../components/PlanificarMantenimientoForm';

const PlanificarMantenimiento = () => {
  return (
    <div className="max-w-4xl mx-auto py-6 px-4 sm:px-6 lg:px-8 space-y-6">
      {/* Cabecera y migas de pan */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-200/80 pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
            <Link to="/inventario" className="hover:text-blue-600 transition-colors">
              Inventario de Activos
            </Link>
            <span>/</span>
            <span className="text-gray-800 font-medium">Planificación de Mantenimiento</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight flex items-center gap-2.5">
            <FiCalendar className="w-6 h-6 text-blue-600" />
            <span>Agendar Mantenimiento Preventivo</span>
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            Programa revisiones técnicas y mantenimientos periódicos para salvaguardar la operatividad de los equipos.
          </p>
        </div>

        <Link
          to="/inventario"
          className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors shadow-2xs self-start sm:self-center"
        >
          <FiArrowLeft className="w-3.5 h-3.5" />
          <span>Volver al Inventario</span>
        </Link>
      </div>

      {/* Tarjeta de contexto informativo */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200/80 rounded-2xl p-4 flex items-start gap-3.5 shadow-2xs">
        <div className="p-2 bg-blue-600 text-white rounded-xl shadow-xs shrink-0">
          <FiShield className="w-4 h-4" />
        </div>
        <div className="text-xs text-blue-900 leading-relaxed">
          <p className="font-bold text-blue-950">Procedimiento Institucional de Mantenimiento</p>
          <p className="text-blue-800/90 mt-0.5">
            Las fechas agendadas se registran en la base de datos de infraestructura y disparan automáticamente alertas
            preventivas al equipo técnico asignado para asegurar su cumplimiento oportuno.
          </p>
        </div>
      </div>

      {/* Formulario principal */}
      <PlanificarMantenimientoForm />
    </div>
  );
};

export default PlanificarMantenimiento;
