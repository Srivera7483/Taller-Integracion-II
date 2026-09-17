import React from 'react';
import StatusBadge from '../components/StatusBadge';
import { FiSearch, FiFilter } from 'react-icons/fi';

const Incidencias = () => {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input 
            type="text" 
            placeholder="Buscar incidencias..." 
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
          />
        </div>
        <div className="flex gap-2">
          <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors bg-white">
            <FiFilter /> Filtros
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-600">
            <thead className="bg-gray-50 text-gray-500 uppercase">
              <tr>
                <th className="px-6 py-3 font-medium">Asunto</th>
                <th className="px-6 py-3 font-medium">Prioridad</th>
                <th className="px-6 py-3 font-medium">Estado</th>
                <th className="px-6 py-3 font-medium">Asignado a</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              <tr className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-4 font-medium text-gray-900">Fallo en sistema de correos</td>
                <td className="px-6 py-4"><span className="text-red-600 font-medium">Alta</span></td>
                <td className="px-6 py-4"><StatusBadge status="En Progreso" /></td>
                <td className="px-6 py-4">Carlos Ruiz</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Incidencias;
