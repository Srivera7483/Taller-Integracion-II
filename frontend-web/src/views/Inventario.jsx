import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import StatusBadge from '../components/StatusBadge';
import { FiSearch, FiPlus, FiAlertCircle, FiActivity, FiRefreshCw, FiCalendar } from 'react-icons/fi';
import api from '../services/api';

const EQUIPOS_BASE = [
  {
    id: 'ACT-2026-0001',
    codigoQr: 'ACT-2026-0001',
    nombre: 'Proyector Láser Epson PowerLite L520U',
    categoria: 'Audiovisual',
    numeroSerie: 'SN-EPS-9921',
    ubicacion: 'Edificio A - Auditorio Principal',
    estado: 'Operativo',
  },
  {
    id: 'SRV-BLADE-07',
    codigoQr: 'SRV-BLADE-07',
    nombre: 'Servidor Blade Dell PowerEdge MX750c',
    categoria: 'Servidores',
    numeroSerie: 'SN-DELL-BLADE-778',
    ubicacion: 'Data Center Central - Rack B04',
    estado: 'Operativo',
  },
  {
    id: 'SW-CORE-01',
    codigoQr: 'SW-CORE-01',
    nombre: 'Switch Cisco Catalyst 9300 48P PoE+',
    categoria: 'Redes',
    numeroSerie: 'SN-CSCO-9300-998',
    ubicacion: 'Edificio Central - Sala Comunicaciones 1',
    estado: 'Operativo',
  },
  {
    id: 'ACT-2026-0002',
    codigoQr: 'ACT-2026-0002',
    nombre: 'Computador All-in-One Dell OptiPlex 7490',
    categoria: 'Cómputo',
    numeroSerie: 'SN-DELL-4412',
    ubicacion: 'Edificio B - Laboratorio 302',
    estado: 'En Mantenimiento',
  },
  {
    id: 'SN-MPM2-2023-001',
    codigoQr: 'SN-MPM2-2023-001',
    nombre: 'MacBook Pro M2 Max 16"',
    categoria: 'Portátiles',
    numeroSerie: 'SN-MPM2-2023-001',
    ubicacion: 'Edificio Docente - Depto Informática',
    estado: 'Operativo',
  },
  {
    id: 'SN-RC-1111-042',
    codigoQr: 'SN-RC-1111-042',
    nombre: 'Router Cisco C1111-8P ISR',
    categoria: 'Redes',
    numeroSerie: 'SN-RC-1111-042',
    ubicacion: 'Piso 2 - Gabinete de Distribución',
    estado: 'En Mantenimiento',
  },
];

const normalizarEstado = (estado) => {
  if (!estado) return 'Operativo';
  const mapping = {
    OPERATIVO: 'Operativo',
    EN_MANTENIMIENTO: 'En Mantenimiento',
    EN_REVISION: 'En Revisión',
    DADO_DE_BAJA: 'Dado de Baja',
  };
  return mapping[estado] || estado;
};

const Inventario = () => {
  const [equipos, setEquipos] = useState(EQUIPOS_BASE);
  const [terminoBusqueda, setTerminoBusqueda] = useState('');
  const [cargando, setCargando] = useState(true);
  const [esDinamico, setEsDinamico] = useState(false);

  const cargarEquipos = async () => {
    setCargando(true);
    try {
      const resp = await api.get('/activos');
      const data = resp.data?.datos || (Array.isArray(resp.data) ? resp.data : []);
      if (Array.isArray(data) && data.length > 0) {
        setEquipos(data);
        setEsDinamico(true);
      } else {
        setEquipos(EQUIPOS_BASE);
        setEsDinamico(false);
      }
    } catch {
      // Fallback resiliente a los datos locales
      setEquipos(EQUIPOS_BASE);
      setEsDinamico(false);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarEquipos();
  }, []);

  const equiposFiltrados = useMemo(() => {
    if (!terminoBusqueda.trim()) return equipos;
    const txt = terminoBusqueda.toLowerCase();
    return equipos.filter((eq) => {
      const idVal = (eq.codigoQr || eq.id || '').toLowerCase();
      const nombreVal = (eq.nombre || '').toLowerCase();
      const catVal = (eq.categoria || '').toLowerCase();
      const serieVal = (eq.numeroSerie || eq.numero_serie || '').toLowerCase();
      const ubiVal = (eq.ubicacion || '').toLowerCase();

      return (
        nombreVal.includes(txt) ||
        catVal.includes(txt) ||
        serieVal.includes(txt) ||
        idVal.includes(txt) ||
        ubiVal.includes(txt)
      );
    });
  }, [equipos, terminoBusqueda]);

  return (
    <div className="space-y-6">
      {/* Barra superior de búsqueda y acciones */}
      <div className="flex flex-col sm:flex-row justify-between gap-4 items-stretch sm:items-center">
        <div className="relative flex-1 max-w-md">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={terminoBusqueda}
            onChange={(e) => setTerminoBusqueda(e.target.value)}
            placeholder="Buscar por equipo, serie, QR o ubicación..."
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-sm bg-white shadow-2xs"
          />
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={cargarEquipos}
            disabled={cargando}
            className="inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl transition-colors font-medium text-xs shadow-2xs disabled:opacity-50"
            title="Recargar inventario desde el microservicio"
          >
            <FiRefreshCw className={`w-3.5 h-3.5 ${cargando ? 'animate-spin text-blue-600' : ''}`} />
            <span>{cargando ? 'Cargando...' : 'Actualizar'}</span>
          </button>
          <Link
            to="/mantenimientos/planificar"
            className="inline-flex items-center justify-center gap-2 px-3.5 py-2 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-colors font-semibold text-xs shadow-2xs"
            title="Agendar nuevo mantenimiento preventivo"
          >
            <FiCalendar className="w-3.5 h-3.5" />
            <span>Planificar Mantenimiento</span>
          </Link>
          <Link
            to="/trazabilidad"
            className="inline-flex items-center justify-center gap-2 px-3.5 py-2 bg-indigo-50 border border-indigo-200 text-indigo-700 rounded-xl hover:bg-indigo-100 transition-colors font-semibold text-xs shadow-2xs"
          >
            <FiActivity className="w-3.5 h-3.5 text-indigo-600" />
            <span>Módulo de Trazabilidad</span>
          </Link>
          <button className="flex items-center justify-center gap-2 px-3.5 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors font-semibold text-xs shadow-2xs">
            <FiPlus className="w-3.5 h-3.5" /> Añadir Equipo
          </button>
        </div>
      </div>

      {/* Indicador de origen de datos */}
      {esDinamico && (
        <div className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-lg inline-flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span>Inventario conectado en tiempo real al microservicio de activos (Prisma DB).</span>
        </div>
      )}

      {/* Tabla de Equipos e Inventario */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-600">
            <thead className="bg-gray-50 text-gray-500 uppercase text-xs">
              <tr>
                <th className="px-6 py-3.5 font-semibold">Equipo / Identificador</th>
                <th className="px-6 py-3.5 font-semibold">Categoría / Ubicación</th>
                <th className="px-6 py-3.5 font-semibold">Número de Serie</th>
                <th className="px-6 py-3.5 font-semibold">Estado</th>
                <th className="px-6 py-3.5 font-semibold text-right">Acciones de Ciclo de Vida</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {cargando && equipos.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-6 py-8 text-center text-gray-500 text-sm">
                    Cargando equipos del inventario...
                  </td>
                </tr>
              ) : equiposFiltrados.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-6 py-8 text-center text-gray-500 text-sm">
                    No se encontraron equipos que coincidan con la búsqueda.
                  </td>
                </tr>
              ) : (
                equiposFiltrados.map((item) => {
                  const idPrincipal = item.codigoQr || item.id;
                  const numeroSerie = item.numeroSerie || item.numero_serie || 'S/N';
                  const estadoLegible = normalizarEstado(item.estado);

                  return (
                    <tr key={item.id || item.codigoQr} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="font-bold text-gray-900">{item.nombre}</span>
                          <span className="font-mono text-xs font-semibold text-blue-700">{idPrincipal}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="font-medium text-gray-800">{item.categoria}</span>
                          <span className="text-xs text-gray-400">{item.ubicacion}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 font-mono text-xs text-gray-600 font-medium">
                        {numeroSerie}
                      </td>
                      <td className="px-6 py-4">
                        <StatusBadge status={estadoLegible} />
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="inline-flex items-center gap-2 justify-end">
                          {/* Botón a Trazabilidad */}
                          <Link
                            to={`/trazabilidad/${encodeURIComponent(idPrincipal)}`}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-lg transition-colors shadow-2xs"
                            title="Ver línea de tiempo y trazabilidad completa del activo"
                          >
                            <FiActivity className="w-3.5 h-3.5 text-indigo-600" />
                            <span>Trazabilidad</span>
                          </Link>

                          {/* Botón para Planificar Mantenimiento */}
                          <Link
                            to={`/mantenimientos/planificar?id_activo=${encodeURIComponent(item.id || idPrincipal)}`}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-colors shadow-2xs"
                            title="Planificar mantenimiento preventivo para este equipo"
                          >
                            <FiCalendar className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Mantenimiento</span>
                          </Link>

                          {/* Botón para Reportar Falla */}
                          <Link
                            to={`/incidencias/nueva?id_activo=${encodeURIComponent(idPrincipal)}`}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition-colors"
                            title="Reportar incidencia para este equipo"
                          >
                            <FiAlertCircle className="w-3.5 h-3.5 text-rose-600" />
                            <span>Reportar Falla</span>
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Inventario;
