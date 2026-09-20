import React from 'react';

const StatusBadge = ({ status }) => {
  const getBadgeStyle = (status) => {
    switch (status.toLowerCase()) {
      case 'alta':
      case 'error':
      case 'crítica':
        return 'bg-red-100 text-red-800 border border-red-200';
      case 'resuelta':
      case 'activo':
      case 'completado':
        return 'bg-green-100 text-green-800 border border-green-200';
      case 'pendiente':
      case 'en progreso':
      case 'mantenimiento':
        return 'bg-yellow-100 text-yellow-800 border border-yellow-200';
      default:
        return 'bg-gray-100 text-gray-800 border border-gray-200';
    }
  };

  return (
    <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${getBadgeStyle(status)}`}>
      {status}
    </span>
  );
};

export default StatusBadge;
