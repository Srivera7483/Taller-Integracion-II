import React from 'react';
import MetricCard from '../components/MetricCard';
import StatusBadge from '../components/StatusBadge';
import AssignedOrderCard from '../components/AssignedOrderCard';
import { FiAlertTriangle, FiCheckCircle, FiClock } from 'react-icons/fi';
import { useToast } from '../context/ToastContext';

const Dashboard = () => {
  const { showToast } = useToast();

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

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="font-semibold text-gray-800">Últimas Incidencias</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-600">
            <thead className="bg-gray-50 text-gray-500 uppercase">
              <tr>
                <th className="px-6 py-3 font-medium">ID</th>
                <th className="px-6 py-3 font-medium">Descripción</th>
                <th className="px-6 py-3 font-medium">Estado</th>
                <th className="px-6 py-3 font-medium">Fecha</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {/* Ejemplo de filas vacías preparadas para el .map() */}
              <tr className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-4">#1042</td>
                <td className="px-6 py-4 font-medium text-gray-900">Caída de servidor principal</td>
                <td className="px-6 py-4"><StatusBadge status="Crítica" /></td>
                <td className="px-6 py-4">Hace 2 horas</td>
              </tr>
              <tr className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-4">#1041</td>
                <td className="px-6 py-4 font-medium text-gray-900">Actualización de base de datos</td>
                <td className="px-6 py-4"><StatusBadge status="Pendiente" /></td>
                <td className="px-6 py-4">Hace 5 horas</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Demo TAL-56: Órdenes Asignadas */}
      <div>
        <h3 className="font-semibold text-gray-800 mb-4">Mis Órdenes Asignadas (Demo TAL-56)</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <AssignedOrderCard 
            orderId="ORD-2026-001"
            title="Mantenimiento Preventivo Servidor Rack 1"
            priority="Urgente"
            status="Pendiente"
            date="Hoy, 15:00 hrs"
            location="Data Center Norte"
            onStart={() => showToast('Iniciando orden ORD-2026-001', 'info')}
            onViewDetails={() => showToast('Viendo detalles de ORD-2026-001', 'info')}
          />
          <AssignedOrderCard 
            orderId="ORD-2026-002"
            title="Revisión de Cableado Estructural Piso 3"
            priority="Media"
            status="En Progreso"
            date="Mañana, 10:00 hrs"
            location="Edificio Central - Piso 3"
            onComplete={() => showToast('Finalizando orden ORD-2026-002', 'success')}
            onViewDetails={() => showToast('Viendo detalles de ORD-2026-002', 'info')}
          />
          <AssignedOrderCard 
            orderId="ORD-2026-003"
            title="Cambio de Disco Duro NAS"
            priority="Alta"
            status="Completada"
            date="21/09/2026"
            location="Storage Room B"
            onViewDetails={() => showToast('Viendo detalles de ORD-2026-003', 'info')}
          />
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
