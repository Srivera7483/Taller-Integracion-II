import React from 'react';
import { FiClock, FiMapPin, FiPlay, FiEye, FiCheckCircle } from 'react-icons/fi';

const AssignedOrderCard = ({ 
  orderId, 
  title, 
  priority, 
  status, 
  date, 
  location, 
  onStart, 
  onViewDetails,
  onComplete
}) => {
  
  // Define el color del borde izquierdo según la prioridad
  const getPriorityBorder = () => {
    switch(priority?.toLowerCase()) {
      case 'urgente': return 'border-l-red-500';
      case 'alta': return 'border-l-orange-500';
      case 'media': return 'border-l-yellow-400';
      case 'baja': return 'border-l-blue-400';
      default: return 'border-l-gray-400';
    }
  };

  const getPriorityBadgeColor = () => {
    switch(priority?.toLowerCase()) {
      case 'urgente': return 'bg-red-50 text-red-700 border-red-200';
      case 'alta': return 'bg-orange-50 text-orange-700 border-orange-200';
      case 'media': return 'bg-yellow-50 text-yellow-700 border-yellow-200';
      case 'baja': return 'bg-blue-50 text-blue-700 border-blue-200';
      default: return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  }

  const getStatusBadgeColor = () => {
    switch(status?.toLowerCase()) {
      case 'pendiente': return 'bg-slate-100 text-slate-700';
      case 'en progreso': return 'bg-indigo-100 text-indigo-700';
      case 'completada': return 'bg-emerald-100 text-emerald-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div className={`bg-white rounded-xl shadow-sm border border-gray-200/75 border-l-4 ${getPriorityBorder()} hover:shadow-md transition-shadow overflow-hidden flex flex-col h-full`}>
      {/* Encabezado de la Tarjeta */}
      <div className="p-5 flex-1">
        <div className="flex justify-between items-start mb-3">
          <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
            {orderId}
          </span>
          <div className="flex gap-2">
            <span className={`px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded border ${getPriorityBadgeColor()}`}>
              {priority}
            </span>
            <span className={`px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded ${getStatusBadgeColor()}`}>
              {status}
            </span>
          </div>
        </div>

        <h3 className="text-lg font-semibold text-gray-900 mb-2 leading-tight">
          {title}
        </h3>

        {/* Metadatos (Fecha y Ubicación) */}
        <div className="space-y-2 mt-4">
          <div className="flex items-center text-sm text-gray-600 gap-2">
            <FiClock className="text-gray-400 shrink-0" />
            <span className="truncate">Límite: <span className="font-medium text-gray-700">{date}</span></span>
          </div>
          <div className="flex items-center text-sm text-gray-600 gap-2">
            <FiMapPin className="text-gray-400 shrink-0" />
            <span className="truncate">{location}</span>
          </div>
        </div>
      </div>

      {/* Pie de la Tarjeta (Botones de Acción) */}
      <div className="bg-gray-50 border-t border-gray-100 p-3 grid grid-cols-2 gap-2 mt-auto">
        <button 
          onClick={onViewDetails}
          className="flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 hover:text-blue-600 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500/20"
        >
          <FiEye className="w-4 h-4" />
          Ver Detalles
        </button>
        
        {status?.toLowerCase() === 'pendiente' ? (
          <button 
            onClick={onStart}
            className="flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500/50 shadow-sm"
          >
            <FiPlay className="w-4 h-4" />
            Iniciar
          </button>
        ) : status?.toLowerCase() === 'en progreso' ? (
          <button 
            onClick={onComplete}
            className="flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500/50 shadow-sm"
          >
            <FiCheckCircle className="w-4 h-4" />
            Finalizar
          </button>
        ) : (
          <button 
            disabled
            className="flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium text-gray-400 bg-gray-100 rounded-lg cursor-not-allowed"
          >
            <FiCheckCircle className="w-4 h-4" />
            Completada
          </button>
        )}
      </div>
    </div>
  );
};

export default AssignedOrderCard;
