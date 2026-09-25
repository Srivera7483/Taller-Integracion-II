import React from 'react';
import MetricCard from '../components/MetricCard';
import StatusBadge from '../components/StatusBadge';
import DataTable from '../components/DataTable';
import { FiAlertTriangle, FiCheckCircle, FiClock } from 'react-icons/fi';
import { useToast } from '../context/ToastContext';

const Dashboard = () => {
  const { showToast } = useToast();

  const columns = [
    { header: 'ID', accessorKey: 'id', cell: (row) => <span className="font-mono font-medium text-gray-500">{row.id}</span> },
    { header: 'Descripción', accessorKey: 'descripcion', cell: (row) => <span className="font-medium text-gray-900">{row.descripcion}</span> },
    { header: 'Estado', accessorKey: 'estado', cell: (row) => <StatusBadge status={row.estado} /> },
    { header: 'Fecha', accessorKey: 'fecha' }
  ];

  const recentIncidents = [
    { id: '#1042', descripcion: 'Caída de servidor principal', estado: 'Crítica', fecha: 'Hace 2 horas' },
    { id: '#1041', descripcion: 'Actualización de base de datos', estado: 'Pendiente', fecha: 'Hace 5 horas' },
    { id: '#1040', descripcion: 'Falla en router principal', estado: 'Resuelta', fecha: 'Hace 1 día' },
    { id: '#1039', descripcion: 'Mantenimiento preventivo de rack', estado: 'En Progreso', fecha: 'Hace 2 días' }
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold text-gray-800">Resumen General</h2>
        <button 
          onClick={() => showToast('¡El Toast funciona perfectamente!', 'success')}
          className="px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition shadow-sm"
        >
          Probar Toast
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <MetricCard 
          title="Incidencias Pendientes" 
          value="12" 
          icon={FiClock} 
          color="orange" 
        />
        <MetricCard 
          title="Incidencias Críticas" 
          value="3" 
          icon={FiAlertTriangle} 
          color="red" 
        />
        <MetricCard 
          title="Resueltas Hoy" 
          value="24" 
          icon={FiCheckCircle} 
          color="green" 
        />
      </div>

      <div className="mt-8">
        <DataTable 
          title="Últimas Incidencias" 
          description="Listado rápido de los últimos eventos reportados en la red."
          columns={columns} 
          data={recentIncidents} 
        />
      </div>
    </div>
  );
};

export default Dashboard;
