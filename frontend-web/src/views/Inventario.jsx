import React from 'react';
import { Link } from 'react-router-dom';
import StatusBadge from '../components/StatusBadge';
import { FiSearch, FiPlus, FiAlertCircle } from 'react-icons/fi';

const Inventario = () => {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input 
            type="text" 
            placeholder="Buscar equipos..." 
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
          />
        </div>
        <button className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium shadow-sm">
          <FiPlus /> Añadir Equipo
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-600">
            <thead className="bg-gray-50 text-gray-500 uppercase">
              <tr>
                <th className="px-6 py-3 font-medium">Equipo</th>
                <th className="px-6 py-3 font-medium">Categoría</th>
                <th className="px-6 py-3 font-medium">Número de Serie</th>
                <th className="px-6 py-3 font-medium">Estado</th>
                <th className="px-6 py-3 font-medium text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              <tr className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-4 font-medium text-gray-900">MacBook Pro M2</td>
                <td className="px-6 py-4">Portátiles</td>
                <td className="px-6 py-4 font-mono text-xs text-blue-600 font-semibold">SN-MPM2-2023-001</td>
                <td className="px-6 py-4"><StatusBadge status="Activo" /></td>
                <td className="px-6 py-4 text-right">
                  <Link
                    to="/incidencias/nueva?id_activo=SN-MPM2-2023-001"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-md transition-colors"
                    title="Reportar incidencia para este equipo"
                  >
                    <FiAlertCircle className="w-3.5 h-3.5" />
                    Reportar Falla
                  </Link>
                </td>
              </tr>
              <tr className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-4 font-medium text-gray-900">Router Cisco C1111</td>
                <td className="px-6 py-4">Redes</td>
                <td className="px-6 py-4 font-mono text-xs text-blue-600 font-semibold">SN-RC-1111-042</td>
                <td className="px-6 py-4"><StatusBadge status="Mantenimiento" /></td>
                <td className="px-6 py-4 text-right">
                  <Link
                    to="/incidencias/nueva?id_activo=SN-RC-1111-042"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-md transition-colors"
                    title="Reportar incidencia para este equipo"
                  >
                    <FiAlertCircle className="w-3.5 h-3.5" />
                    Reportar Falla
                  </Link>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Inventario;
