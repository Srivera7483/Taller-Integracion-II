
import React from 'react';

const StatusBadge = ({ status }) => {
  // Normalizar el estado recibido desde el backend
  const obtenerTextoEstado = (valor) => {
    if (typeof valor === 'string') return valor;

    if (valor && typeof valor === 'object') {
      return (
        valor.nombre_estado ||
        valor.estado ||
        valor.nombre ||
        'Reportada'
      );
    }

    return 'Reportada';
  };

  const estado = obtenerTextoEstado(status);
  const estadoNormalizado = estado.trim().toLowerCase();

  const getBadgeStyle = () => {
    switch (estadoNormalizado) {
      case 'alta':
      case 'error':
      case 'crítica':
      case 'critica':
      case 'rechazado':
      case 'rechazada':
      case 'dado de baja':
      case 'dado_de_baja':
        return 'bg-red-100 text-red-800 border border-red-200';

      case 'resuelta':
      case 'operativo':
      case 'activo':
      case 'completado':
      case 'completada':
      case 'cerrada':
        return 'bg-emerald-100 text-emerald-800 border border-emerald-200';

      case 'asignada':
      case 'en progreso':
      case 'en proceso':
      case 'mantenimiento':
      case 'en mantenimiento':
      case 'en_mantenimiento':
        return 'bg-blue-100 text-blue-800 border border-blue-200';

      case 'reportada':
      case 'pendiente':
      case 'en revisión':
      case 'en revision':
      case 'en_revision':
        return 'bg-amber-100 text-amber-800 border border-amber-200';

      default:
        return 'bg-gray-100 text-gray-800 border border-gray-200';
    }
  };

  const formatearTexto = () => {
    switch (estadoNormalizado) {
      case 'reportada':
      case 'pendiente':
        return 'Reportada';
      case 'asignada':
      case 'en progreso':
      case 'en proceso':
        return 'Asignada';
      case 'resuelta':
      case 'completada':
      case 'completado':
      case 'cerrada':
        return 'Resuelta';
      case 'rechazada':
      case 'rechazado':
        return 'Rechazada';
      case 'operativo':
        return 'Operativo';
      case 'en_mantenimiento':
      case 'en mantenimiento':
        return 'En Mantenimiento';
      case 'en_revision':
      case 'en revision':
      case 'en revisión':
        return 'En Revisión';
      case 'dado_de_baja':
      case 'dado de baja':
        return 'Dado de Baja';
      default:
        return estado;
    }
  };

  return (
    <span
      className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${getBadgeStyle()}`}
    >
      {formatearTexto()}
    </span>
  );
};

export default StatusBadge;
