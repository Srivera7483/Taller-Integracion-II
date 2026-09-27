import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import MetricCard from '../components/MetricCard';
import StatusBadge from '../components/StatusBadge';
import PriorityBadge from '../components/PriorityBadge';
import {
  FiAlertTriangle,
  FiCheckCircle,
  FiClock,
  FiArrowRight,
  FiTrendingUp,
  FiBox,
  FiLayers
} from 'react-icons/fi';
import { useToast } from '../context/ToastContext';
import { getIncidencias } from '../services/incidenciasStorage';
import { evaluarPrioridadOrden } from '../services/ordenesService';

const Dashboard = () => {
  const { showToast } = useToast();
  const incidencias = useMemo(() => getIncidencias(), []);

  // Métricas reactivas calculadas a partir del campo prioridad de ORDENES_TRABAJO
  const resumenPrioridades = useMemo(() => {
    let alta = 0;
    let media = 0;
    let baja = 0;
    let resueltas = 0;
    let pendientes = 0;

    incidencias.forEach((item) => {
      const p = evaluarPrioridadOrden(item);
      if (p === 'Alta') alta++;
      if (p === 'Media') media++;
      if (p === 'Baja') baja++;

      const est = (item.estado || '').toLowerCase();
      if (est === 'resuelta' || est === 'completado') resueltas++;
      if (est === 'pendiente' || est === 'reportada') pendientes++;
    });

    return { alta, media, baja, resueltas, pendientes };
  }, [incidencias]);

  return (
    <div className="space-y-6">
      {/* Encabezado y Acciones Rápidas */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900 tracking-tight">Panel de Control Operativo</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Monitoreo en tiempo real de órdenes de trabajo, activos e indicadores de prioridad.
          </p>
        </div>
        <div className="flex items-center gap-2">
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
          value={resumenPrioridades.pendientes.toString()}
          icon={FiClock}
          color="orange"
        />
        <MetricCard
          title="Órdenes de Prioridad Alta"
          value={resumenPrioridades.alta.toString()}
          icon={FiAlertTriangle}
          color="red"
        />
        <MetricCard
          title="Órdenes Resueltas"
          value={resumenPrioridades.resueltas.toString()}
          icon={FiCheckCircle}
          color="green"
        />
      </div>

      {/* Franja de Indicadores de Prioridad (Evaluación del backend ORDENES_TRABAJO) */}
      <div className="bg-white rounded-xl shadow-2xs border border-gray-200 p-5">
        <div className="flex items-center gap-2 mb-4">
          <FiLayers className="text-indigo-600 w-4 h-4" />
          <h3 className="font-bold text-sm text-gray-900">Distribución de Órdenes por Grado de Prioridad</h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Card Prioridad Alta */}
          <div className="p-4 rounded-xl bg-rose-50/70 border border-rose-200 flex items-center justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
                <span className="text-xs font-bold text-rose-800 uppercase tracking-wider">Alta Prioridad</span>
              </div>
              <p className="text-2xl font-bold text-rose-950 font-mono">{resumenPrioridades.alta}</p>
              <p className="text-[11px] text-rose-700">Requiere atención inmediata</p>
            </div>
            <PriorityBadge priority="Alta" size="md" />
          </div>

          {/* Card Prioridad Media */}
          <div className="p-4 rounded-xl bg-amber-50/70 border border-amber-200 flex items-center justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-500" />
                <span className="text-xs font-bold text-amber-800 uppercase tracking-wider">Media Prioridad</span>
              </div>
              <p className="text-2xl font-bold text-amber-950 font-mono">{resumenPrioridades.media}</p>
              <p className="text-[11px] text-amber-700">Flujo operativo balanceado</p>
            </div>
            <PriorityBadge priority="Media" size="md" />
          </div>

          {/* Card Prioridad Baja */}
          <div className="p-4 rounded-xl bg-emerald-50/70 border border-emerald-200 flex items-center justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider">Baja Prioridad</span>
              </div>
              <p className="text-2xl font-bold text-emerald-950 font-mono">{resumenPrioridades.baja}</p>
              <p className="text-[11px] text-emerald-700">Mantenimiento programado</p>
            </div>
            <PriorityBadge priority="Baja" size="md" />
          </div>
        </div>
      </div>

      {/* Tabla de Órdenes e Incidencias Recientes con Indicador de Prioridad */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-gray-900 text-sm">Órdenes de Trabajo e Incidencias Recientes</h3>
            <p className="text-xs text-gray-500 mt-0.5">
              Evaluación directa del atributo prioridad en la interfaz
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
                <th className="px-6 py-3 font-semibold">Prioridad</th>
                <th className="px-6 py-3 font-semibold">Estado</th>
                <th className="px-6 py-3 font-semibold">Fecha / Asignación</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {incidencias.slice(0, 5).map((inc) => {
                const prioridadEvaluada = evaluarPrioridadOrden(inc);

                return (
                  <tr key={inc.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="font-mono text-xs font-semibold text-gray-500">{inc.id}</span>
                        <span className="font-medium text-gray-900">{inc.titulo}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center gap-1 font-mono text-xs px-2 py-0.5 bg-gray-100 text-gray-800 rounded border border-gray-200">
                        <FiBox className="w-3 h-3 text-gray-400" />
                        {inc.id_activo || 'N/A'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <PriorityBadge priority={prioridadEvaluada} size="sm" />
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge status={inc.estado || 'Pendiente'} />
                    </td>
                    <td className="px-6 py-4 text-xs text-gray-500">
                      <div>{inc.fecha || 'Reciente'}</div>
                      <div className="text-[11px] text-gray-400 font-medium">{inc.asignado || 'Sin asignar'}</div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
