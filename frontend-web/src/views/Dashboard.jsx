import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import MetricCard from '../components/MetricCard';
import StatusBadge from '../components/StatusBadge';
import {
  FiAlertTriangle,
  FiCheckCircle,
  FiClock,
  FiArrowRight,
  FiBox,
  FiActivity
} from 'react-icons/fi';
import DataTable from '../components/DataTable';
import { useToast } from '../context/ToastContext';
import { fetchIncidencias } from '../services/incidenciasService';

const Dashboard = () => {
  const { showToast } = useToast();
  const [incidencias, setIncidencias] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const cargarDatos = async () => {
      try {
        setLoading(true);
        const data = await fetchIncidencias();
        setIncidencias(data);
      } catch (error) {
        showToast('Error de conexión con el servidor API Gateway', 'error');
      } finally {
        setLoading(false);
      }
    };
    cargarDatos();
  }, [showToast]);

  // Métricas reactivas calculadas a partir de las incidencias locales
  const resumenMetricas = useMemo(() => {
    let resueltas = 0;
    let pendientes = 0;
    let criticas = 0;

    incidencias.forEach((item) => {
      const est = (item.estado || '').toLowerCase();
      if (est === 'resuelta' || est === 'completado') resueltas++;
      if (est === 'pendiente' || est === 'reportada') pendientes++;
      if (est === 'crítica' || est === 'alta') criticas++;
    });

    return { resueltas, pendientes, criticas };
  }, [incidencias]);

  const columns = [
    { header: 'ID', accessorKey: 'id', cell: (row) => <span className="font-mono font-medium text-gray-500">{row.id}</span> },
    { header: 'Descripción', accessorKey: 'descripcion', cell: (row) => <span className="font-medium text-gray-900">{row.descripcion}</span> },
    { header: 'Estado', accessorKey: 'estado', cell: (row) => <StatusBadge status={row.estado} /> },
    { header: 'Fecha', accessorKey: 'fecha' }
  ];

  // Utilizamos las incidencias reales para llenar la tabla inferior
  const recentIncidents = incidencias.slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Encabezado y Acciones Rápidas */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900 tracking-tight">Panel de Control Operativo</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Monitoreo en tiempo real de órdenes de trabajo e indicadores del sistema.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            to="/trazabilidad"
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold bg-indigo-50 border border-indigo-200 text-indigo-700 rounded-lg hover:bg-indigo-100 transition shadow-2xs"
          >
            <FiActivity className="w-3.5 h-3.5" />
            <span>Trazabilidad Activos</span>
          </Link>
          <Link
            to="/incidencias"
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 hover:text-gray-900 transition shadow-2xs"
          >
            <span>Explorar Órdenes</span>
            <FiArrowRight className="w-3.5 h-3.5" />
          </Link>
          <button
            onClick={() => showToast('Sistema de notificaciones operativo y listo para integración.', 'success')}
            className="px-3.5 py-2 bg-blue-600 text-white font-semibold text-xs rounded-lg hover:bg-blue-700 transition shadow-2xs"
          >
            Probar Notificación
          </button>
        </div>
      </div>

      {/* Tarjetas Principales de Métricas Operativas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <MetricCard
          title="Incidencias Pendientes"
          value={resumenMetricas.pendientes.toString()}
          icon={FiClock}
          color="orange"
        />
        <MetricCard
          title="Incidencias Críticas"
          value={resumenMetricas.criticas.toString()}
          icon={FiAlertTriangle}
          color="red"
        />
        <MetricCard
          title="Órdenes Resueltas"
          value={resumenMetricas.resueltas.toString()}
          icon={FiCheckCircle}
          color="green"
        />
      </div>

      {/* Tabla de Órdenes e Incidencias Recientes */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-gray-900 text-sm">Órdenes de Trabajo e Incidencias Recientes</h3>
            <p className="text-xs text-gray-500 mt-0.5">
              Listado general de reportes activos en la plataforma
            </p>
          </div>
          <Link
            to="/incidencias"
            className="text-xs text-blue-600 hover:text-blue-800 font-semibold flex items-center gap-1"
          >
            <span>Ver todas</span>
            <FiArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-600">
            <thead className="bg-gray-50 text-gray-500 uppercase text-xs">
              <tr>
                <th className="px-6 py-3 font-semibold">ID / Asunto</th>
                <th className="px-6 py-3 font-semibold">Activo</th>
                <th className="px-6 py-3 font-semibold">Estado</th>
                <th className="px-6 py-3 font-semibold">Fecha / Asignación</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {incidencias.slice(0, 5).map((inc) => (
                <tr key={inc.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <span className="font-mono text-xs font-semibold text-gray-500">{inc.id}</span>
                      <span className="font-medium text-gray-900">{inc.titulo}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {inc.id_activo ? (
                      <Link
                        to={`/trazabilidad/${encodeURIComponent(inc.id_activo)}`}
                        className="inline-flex items-center gap-1 font-mono text-xs px-2 py-0.5 bg-gray-100 hover:bg-blue-50 text-gray-800 hover:text-blue-700 rounded border border-gray-200 hover:border-blue-300 transition-colors shadow-2xs"
                        title={`Ver trazabilidad y ciclo de vida de ${inc.id_activo}`}
                      >
                        <FiBox className="w-3 h-3 text-gray-400" />
                        {inc.id_activo}
                      </Link>
                    ) : (
                      <span className="font-mono text-xs text-gray-400">N/A</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <StatusBadge status={inc.estado || 'Pendiente'} />
                  </td>
                  <td className="px-6 py-4 text-xs text-gray-500">
                    <div>{inc.fecha || 'Reciente'}</div>
                    <div className="text-[11px] text-gray-400 font-medium">{inc.asignado || 'Sin asignar'}</div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
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