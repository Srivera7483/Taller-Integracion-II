import React, { useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import MetricCard from '../components/MetricCard';
import StatusBadge from '../components/StatusBadge';
import BotonExportarExcel from '../components/BotonExportarExcel';
import {
  FiAlertTriangle,
  FiCheckCircle,
  FiClock,
  FiArrowRight,
  FiBox,
  FiActivity
} from 'react-icons/fi';
import { useToast } from '../context/ToastContext';
import { fetchIncidencias } from '../services/incidenciasService';
import { useInfiniteScroll } from '../hooks/useInfiniteScroll';

const Dashboard = () => {
  const { showToast } = useToast();

  const fetchIncidenciasCallback = useCallback(async (page, limit) => {
    try {
      const data = await fetchIncidencias({ page, limit });
      return data;
    } catch (error) {
      showToast('Error de conexión con el servidor API Gateway', 'error');
      throw error;
    }
  }, [showToast]);

  const {
    items: incidencias,
    loading,
    loadingMore,
    hasMore,
    containerRef,
    sentinelRef,
    sentinelIndex,
    handleContainerScroll,
  } = useInfiniteScroll({
    fetchFunction: fetchIncidenciasCallback,
    limit: 15,
  });

  const resumenMetricas = useMemo(() => {
    let resueltas = 0;
    let pendientes = 0;
    let criticas = 0;

    incidencias.forEach((item) => {
      const estadoNombre = (
        typeof item.estado === 'object' && item.estado !== null
          ? item.estado.nombre_estado
          : item.estado || ''
      ).toLowerCase();

      if (estadoNombre === 'resuelta' || estadoNombre === 'completada' || estadoNombre === 'completado') resueltas++;
      if (estadoNombre === 'pendiente' || estadoNombre === 'reportada') pendientes++;
      if (estadoNombre === 'crítica' || estadoNombre === 'alta') criticas++;
    });

    return { resueltas, pendientes, criticas };
  }, [incidencias]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900 tracking-tight">Panel de Control Operativo</h2>
          <p className="text-xs text-gray-600 mt-0.5">
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

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3">
              <h3 className="font-semibold text-gray-900 text-sm">Órdenes de Trabajo e Incidencias Recientes</h3>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                {incidencias.length} registros cargados
              </span>
            </div>
            <p className="text-xs text-gray-600 mt-0.5">
              Listado con desplazamiento infinito de reportes activos en la plataforma
            </p>
          </div>
          <div className="flex items-center gap-2">
            <BotonExportarExcel variant="compact" />
            <Link
              to="/incidencias"
              className="text-xs text-blue-600 hover:text-blue-800 font-semibold flex items-center gap-1"
            >
              <span>Ver todas</span>
              <FiArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        <div
          ref={containerRef}
          onScroll={handleContainerScroll}
          className="overflow-x-auto overflow-y-auto max-h-[520px]"
        >
          <table className="w-full text-left text-sm text-gray-600">
            <thead className="bg-gray-50 text-gray-600 uppercase text-xs sticky top-0 z-10 shadow-xs">
              <tr>
                <th className="px-6 py-3 font-semibold">ID / Asunto</th>
                <th className="px-6 py-3 font-semibold">Activo</th>
                <th className="px-6 py-3 font-semibold">Estado</th>
                <th className="px-6 py-3 font-semibold">Fecha / Asignación</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {loading && incidencias.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-sm text-gray-500">
                    <div className="flex justify-center items-center gap-2">
                      <div className="animate-spin rounded-full h-5 w-5 border-2 border-blue-600 border-t-transparent"></div>
                      <span>Cargando incidencias iniciales...</span>
                    </div>
                  </td>
                </tr>
              ) : incidencias.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-sm text-gray-500">
                    No hay incidencias registradas en el sistema.
                  </td>
                </tr>
              ) : (
                incidencias.map((inc, index) => {
                  const isSentinel = index === sentinelIndex;
                  const estadoTexto = typeof inc.estado === 'object' && inc.estado !== null
                    ? inc.estado.nombre_estado
                    : inc.estado || 'Reportada';
                  const idTexto = inc.id_incidencia || inc.id;
                  const fechaTexto = inc.fecha_creacion
                    ? new Date(inc.fecha_creacion).toLocaleDateString()
                    : inc.fecha || 'Reciente';

                  return (
                    <tr
                      key={idTexto || index}
                      ref={isSentinel ? sentinelRef : null}
                      className="hover:bg-gray-50 transition-colors"
                    >
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="font-mono text-xs font-semibold text-gray-600">
                            {idTexto ? idTexto.substring(0, 13) : 'INC-#'}
                          </span>
                          <span className="font-medium text-gray-900">{inc.titulo}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {inc.id_activo ? (
                          <Link
                            to={`/trazabilidad/${encodeURIComponent(inc.id_activo)}`}
                            className="inline-flex items-center gap-1 font-mono text-xs px-2 py-0.5 bg-gray-100 hover:bg-blue-50 text-gray-800 hover:text-blue-700 rounded border border-gray-200 hover:border-blue-300 transition-colors shadow-2xs"
                            title={`Ver trazabilidad de ${inc.id_activo}`}
                          >
                            <FiBox className="w-3 h-3 text-gray-400" />
                            {inc.id_activo.substring(0, 8)}...
                          </Link>
                        ) : (
                          <span className="font-mono text-xs text-gray-600">N/A</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <StatusBadge status={estadoTexto} />
                      </td>
                      <td className="px-6 py-4 text-xs text-gray-600">
                        <div>{fechaTexto}</div>
                        <div className="text-[11px] text-gray-500 font-medium">
                          {inc.asignado || (inc.id_reportante ? `Reportante: ${inc.id_reportante.substring(0, 8)}` : 'Sin asignar')}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>

          {loadingMore && (
            <div className="flex justify-center items-center py-4 bg-gray-50/60 border-t border-gray-100">
              <div className="animate-spin rounded-full h-5 w-5 border-2 border-blue-600 border-t-transparent"></div>
              <span className="ml-2.5 text-xs font-medium text-gray-600">Cargando siguientes incidencias...</span>
            </div>
          )}

          {!hasMore && incidencias.length > 0 && (
            <div className="text-center py-3 text-xs text-gray-600 font-medium bg-gray-50/40 border-t border-gray-100">
              Se han cargado todas las incidencias disponibles ({incidencias.length})
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;