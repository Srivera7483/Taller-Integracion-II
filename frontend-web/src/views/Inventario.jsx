import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import StatusBadge from '../components/StatusBadge';
import SkeletonTable from '../components/SkeletonTable';
import PanelEstadisticasAnalitica from '../components/PanelEstadisticasAnalitica';
import {
  FiSearch,
  FiPlus,
  FiAlertCircle,
  FiActivity,
  FiRefreshCw,
  FiCalendar,
  FiEdit2,
  FiTrash2,
  FiX,
  FiBox,
  FiAlertTriangle,
} from 'react-icons/fi';
import api from '../services/api';
import { useToast } from '../context/ToastContext';
import { hasPermission } from '../services/authService';
import { guardarActivosOffline, obtenerActivosOffline } from '../services/storage/offlineDb';
import { useFocusTrap } from '../hooks/useFocusTrap';

const CATEGORIAS_ACTIVO = [
  'AUDIOVISUAL',
  'COMPUTO',
  'REDES',
  'ELECTRICO',
  'MOBILIARIO',
  'OTRO',
];

const ESTADOS_ACTIVO = [
  { value: 'OPERATIVO', label: 'Operativo' },
  { value: 'EN_MANTENIMIENTO', label: 'En Mantenimiento' },
  { value: 'EN_REVISION', label: 'En Revisión' },
  { value: 'DADO_DE_BAJA', label: 'Dado de Baja' },
];

const EQUIPOS_BASE = [
  {
    id: 'ACT-2026-0001',
    codigoQr: 'UCT-PRJ-01',
    nombre: 'Proyector Epson PowerLite',
    categoria: 'AUDIOVISUAL',
    modelo: 'L210W',
    numeroSerie: 'SN-UCT-PRJ-01',
    ubicacion: 'Edificio C - Sala C101',
    estado: 'OPERATIVO',
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

const FORM_INICIAL = {
  codigoQr: '',
  nombre: '',
  categoria: 'COMPUTO',
  modelo: '',
  numeroSerie: '',
  ubicacion: '',
  estado: 'OPERATIVO',
};

const Inventario = () => {
  const { showToast } = useToast();
  const puedeGestionarActivos = hasPermission('activos:gestionar');
  const puedePlanificarMantenimiento = hasPermission('mantenimientos:crear');
  const puedeReportarFalla = hasPermission('incidencias:crear');

  const [equipos, setEquipos] = useState(EQUIPOS_BASE);
  const [terminoBusqueda, setTerminoBusqueda] = useState('');
  const [filtroCategoria, setFiltroCategoria] = useState('Todas');
  const [filtroEstado, setFiltroEstado] = useState('Todos');
  const [cargando, setCargando] = useState(true);
  const [esDinamico, setEsDinamico] = useState(false);
  const [estadisticasRefreshTick, setEstadisticasRefreshTick] = useState(0);

  const [modalEquipoAbierto, setModalEquipoAbierto] = useState(false);
  const [equipoEditando, setEquipoEditando] = useState(null);
  const [formEquipo, setFormEquipo] = useState(FORM_INICIAL);
  const [guardandoEquipo, setGuardandoEquipo] = useState(false);

  const [equipoBaja, setEquipoBaja] = useState(null);
  const [procesandoBaja, setProcesandoBaja] = useState(false);

  const modalEquipoRef = useFocusTrap(modalEquipoAbierto, {
    onClose: () => {
      if (!guardandoEquipo) setModalEquipoAbierto(false);
    },
  });

  const modalBajaRef = useFocusTrap(Boolean(equipoBaja), {
    onClose: () => {
      if (!procesandoBaja) setEquipoBaja(null);
    },
  });

  const cargarEquipos = async () => {
    setCargando(true);
    try {
      const resp = await api.get('/activos?limit=50');
      const data = resp.data?.datos || (Array.isArray(resp.data) ? resp.data : []);
      if (Array.isArray(data) && data.length > 0) {
        setEquipos(data);
        setEsDinamico(!resp.fromOfflineCache);
        if (!resp.fromOfflineCache) {
          void guardarActivosOffline(data).catch(() => {});
        }
      } else {
        const offlineActivos = await obtenerActivosOffline().catch(() => []);
        if (offlineActivos.length > 0) {
          setEquipos(offlineActivos);
          setEsDinamico(false);
        }
      }
    } catch {
      const offlineActivos = await obtenerActivosOffline().catch(() => []);
      if (offlineActivos.length > 0) {
        setEquipos(offlineActivos);
        setEsDinamico(false);
      } else {
        setEquipos(EQUIPOS_BASE);
      }
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    void cargarEquipos();
  }, []);

  const handleActualizarInventario = () => {
    setEstadisticasRefreshTick((prev) => prev + 1);
    void cargarEquipos();
  };

  const abrirModalNuevo = () => {
    setEquipoEditando(null);
    setFormEquipo(FORM_INICIAL);
    setModalEquipoAbierto(true);
  };

  const abrirModalEditar = (item) => {
    setEquipoEditando(item);
    setFormEquipo({
      codigoQr: item.codigoQr || item.codigo_qr || '',
      nombre: item.nombre || '',
      categoria: String(item.categoria || 'COMPUTO').toUpperCase(),
      modelo: item.modelo || '',
      numeroSerie: item.numeroSerie || item.numero_serie || '',
      ubicacion: item.ubicacion || '',
      estado: String(item.estado || 'OPERATIVO').toUpperCase(),
    });
    setModalEquipoAbierto(true);
  };

  const handleGuardarEquipo = async (e) => {
    e.preventDefault();
    if (guardandoEquipo) return;

    if (!formEquipo.codigoQr.trim() || !formEquipo.nombre.trim() || !formEquipo.ubicacion.trim()) {
      showToast('Completa Código QR, Nombre del equipo y Ubicación.', 'error');
      return;
    }

    setGuardandoEquipo(true);
    try {
      if (equipoEditando) {
        const resp = await api.patch(`/activos/${encodeURIComponent(equipoEditando.id)}`, formEquipo);
        const actualizado = resp.data?.datos || resp.data;
        setEquipos((prev) =>
          prev.map((eq) => (eq.id === equipoEditando.id ? { ...eq, ...actualizado } : eq))
        );
        showToast(`Equipo "${formEquipo.nombre}" actualizado correctamente.`, 'success');
      } else {
        const resp = await api.post('/activos', formEquipo);
        const creado = resp.data?.datos || resp.data;
        setEquipos((prev) => [creado, ...prev]);
        showToast(`Equipo "${creado.nombre}" (${creado.codigoQr}) registrado en el inventario.`, 'success');
      }
      setEstadisticasRefreshTick((prev) => prev + 1);
      setModalEquipoAbierto(false);
    } catch (err) {
      showToast(
        err.response?.data?.message || err.response?.data?.mensaje || 'Error al guardar el activo',
        'error'
      );
    } finally {
      setGuardandoEquipo(false);
    }
  };

  const handleConfirmarBaja = async () => {
    if (!equipoBaja || procesandoBaja) return;
    setProcesandoBaja(true);
    try {
      const resp = await api.delete(`/activos/${encodeURIComponent(equipoBaja.id)}`);
      const actualizado = resp.data?.datos || { ...equipoBaja, estado: 'DADO_DE_BAJA' };
      setEquipos((prev) =>
        prev.map((eq) => (eq.id === equipoBaja.id ? { ...eq, ...actualizado } : eq))
      );
      setEstadisticasRefreshTick((prev) => prev + 1);
      showToast(`Equipo "${equipoBaja.nombre}" dado de baja exitosamente.`, 'success');
      setEquipoBaja(null);
    } catch (err) {
      showToast(
        err.response?.data?.message || err.response?.data?.mensaje || 'Error al dar de baja el equipo',
        'error'
      );
    } finally {
      setProcesandoBaja(false);
    }
  };

  const equiposFiltrados = useMemo(() => {
    const txt = terminoBusqueda.trim().toLowerCase();
    return equipos.filter((eq) => {
      const catUpper = String(eq.categoria || '').toUpperCase();
      const estUpper = String(eq.estado || '').toUpperCase();

      if (filtroCategoria !== 'Todas' && catUpper !== filtroCategoria) return false;
      if (filtroEstado !== 'Todos' && estUpper !== filtroEstado) return false;
      if (!txt) return true;

      const idVal = (eq.codigoQr || eq.id || '').toLowerCase();
      const nombreVal = (eq.nombre || '').toLowerCase();
      const serieVal = (eq.numeroSerie || eq.numero_serie || '').toLowerCase();
      const ubiVal = (eq.ubicacion || '').toLowerCase();

      return (
        nombreVal.includes(txt) ||
        catUpper.toLowerCase().includes(txt) ||
        serieVal.includes(txt) ||
        idVal.includes(txt) ||
        ubiVal.includes(txt)
      );
    });
  }, [equipos, terminoBusqueda, filtroCategoria, filtroEstado]);

  return (
    <div className="space-y-6">
      <h2 className="sr-only">Catálogo y gestión del inventario de activos</h2>
      {/* Barra superior de búsqueda, filtros y acciones */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-2xs space-y-3">
        <div className="flex flex-col lg:flex-row justify-between gap-3 items-stretch lg:items-center">
          <div className="flex flex-col sm:flex-row gap-2.5 flex-1">
            <div className="relative flex-1 max-w-md">
              <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" aria-hidden="true" />
              <input
                type="text"
                value={terminoBusqueda}
                onChange={(e) => setTerminoBusqueda(e.target.value)}
                placeholder="Buscar por equipo, serie, QR o ubicación..."
                aria-label="Buscar en inventario"
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary outline-none transition-all text-sm bg-white"
              />
            </div>

            <select
              aria-label="Filtrar por categoría"
              value={filtroCategoria}
              onChange={(e) => setFiltroCategoria(e.target.value)}
              className="px-3 py-2 text-xs font-semibold bg-gray-50 border border-gray-300 rounded-lg text-gray-700 outline-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary cursor-pointer"
            >
              <option value="Todas">Todas las categorías</option>
              {CATEGORIAS_ACTIVO.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>

            <select
              aria-label="Filtrar por estado operativo"
              value={filtroEstado}
              onChange={(e) => setFiltroEstado(e.target.value)}
              className="px-3 py-2 text-xs font-semibold bg-gray-50 border border-gray-300 rounded-lg text-gray-700 outline-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary cursor-pointer"
            >
              <option value="Todos">Todos los estados</option>
              {ESTADOS_ACTIVO.map((est) => (
                <option key={est.value} value={est.value}>
                  {est.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center flex-wrap gap-2">
            <button
              type="button"
              onClick={handleActualizarInventario}
              disabled={cargando}
              aria-label="Actualizar inventario"
              className="inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors font-medium text-xs disabled:opacity-50 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              title="Recargar inventario desde el microservicio"
            >
              <FiRefreshCw className={`w-3.5 h-3.5 ${cargando ? 'animate-spin text-primary' : ''}`} aria-hidden="true" />
              <span>{cargando ? 'Cargando...' : 'Actualizar'}</span>
            </button>

            {puedePlanificarMantenimiento && (
              <Link
                to="/mantenimientos/planificar"
                className="inline-flex items-center justify-center gap-2 px-3.5 py-2 bg-emerald-700 text-white rounded-lg hover:bg-emerald-800 transition-colors font-semibold text-xs shadow-2xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1"
                title="Agendar nuevo mantenimiento preventivo"
              >
                <FiCalendar className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Planificar Mantenimiento</span>
              </Link>
            )}

            <Link
              to="/trazabilidad"
              className="inline-flex items-center justify-center gap-2 px-3.5 py-2 bg-primary-50 border border-primary-200 text-primary rounded-lg hover:bg-primary-100 transition-colors font-semibold text-xs shadow-2xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <FiActivity className="w-3.5 h-3.5 text-primary" aria-hidden="true" />
              <span>Módulo de Trazabilidad</span>
            </Link>

            {puedeGestionarActivos && (
              <button
                type="button"
                onClick={abrirModalNuevo}
                className="inline-flex items-center justify-center gap-2 px-3.5 py-2 bg-primary hover:bg-primary-hover text-white rounded-lg transition-all font-semibold text-xs shadow-md cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
              >
                <FiPlus className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Añadir Equipo</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Indicador de origen de datos */}
      {esDinamico && (
        <div role="status" aria-live="polite" className="text-xs text-emerald-800 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-lg inline-flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse" aria-hidden="true"></span>
          <span>Inventario conectado en tiempo real al microservicio de activos (Prisma DB).</span>
        </div>
      )}

      {/* Resumen analítico de activos */}
      <PanelEstadisticasAnalitica soloActivos refreshTrigger={estadisticasRefreshTick} />

      {/* Tabla de Equipos e Inventario */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {/* Vista Móvil (< md) */}
        <div className="md:hidden p-3 sm:p-4 space-y-3">
          {cargando && equipos.length === 0 ? (
            <SkeletonTable modo="tarjetas" filas={4} />
          ) : equiposFiltrados.length === 0 ? (
            <div className="py-10 text-center text-gray-500 text-sm">
              No se encontraron equipos que coincidan con los filtros seleccionados.
            </div>
          ) : (
            equiposFiltrados.map((item) => {
              const idPrincipal = item.codigoQr || item.id;
              const numeroSerie = item.numeroSerie || item.numero_serie || 'S/N';
              const estadoLegible = normalizarEstado(item.estado);
              const yaDadoDeBaja = String(item.estado).toUpperCase() === 'DADO_DE_BAJA';

              return (
                <div
                  key={item.id || item.codigoQr}
                  className="bg-white rounded-xl p-4 border border-gray-200 shadow-2xs space-y-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="font-bold text-gray-900 text-sm leading-snug">{item.nombre}</h3>
                      <span className="font-mono text-xs font-semibold text-primary">{idPrincipal}</span>
                    </div>
                    <StatusBadge status={estadoLegible} />
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs bg-gray-50/80 p-2.5 rounded-lg border border-gray-100">
                    <div>
                      <span className="text-gray-600 block text-[10px] uppercase font-bold">Categoría</span>
                      <span className="font-medium text-gray-800">{item.categoria}</span>
                    </div>
                    <div>
                      <span className="text-gray-600 block text-[10px] uppercase font-bold">Ubicación</span>
                      <span className="font-medium text-gray-800">{item.ubicacion}</span>
                    </div>
                    <div className="col-span-2 pt-1 border-t border-gray-200/60 flex items-center justify-between">
                      <span className="text-gray-600 text-[10px] uppercase font-bold">N° Serie</span>
                      <span className="font-mono font-medium text-gray-700">{numeroSerie}</span>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 pt-1">
                    <Link
                      to={`/trazabilidad/${encodeURIComponent(idPrincipal)}`}
                      className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-bold text-primary bg-primary-50 hover:bg-primary-100 border border-primary-200 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    >
                      <FiActivity className="w-3.5 h-3.5" aria-hidden="true" />
                      <span>Trazabilidad</span>
                    </Link>

                    {puedeGestionarActivos && (
                      <>
                        <button
                          type="button"
                          onClick={() => abrirModalEditar(item)}
                          aria-label={`Editar activo ${item.nombre}`}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                        >
                          <FiEdit2 className="w-3.5 h-3.5" aria-hidden="true" />
                          <span>Editar</span>
                        </button>
                        <button
                          type="button"
                          disabled={yaDadoDeBaja}
                          onClick={() => setEquipoBaja(item)}
                          aria-label={`Dar de baja activo ${item.nombre}`}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg disabled:opacity-40 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                        >
                          <FiTrash2 className="w-3.5 h-3.5" aria-hidden="true" />
                          <span>Dar de Baja</span>
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Vista Escritorio (>= md) */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-600">
            <thead className="bg-gray-50 text-gray-600 uppercase text-xs">
              <tr>
                <th scope="col" className="px-6 py-3.5 font-semibold">Equipo / Identificador</th>
                <th scope="col" className="px-6 py-3.5 font-semibold">Categoría / Ubicación</th>
                <th scope="col" className="px-6 py-3.5 font-semibold">Modelo / Serie</th>
                <th scope="col" className="px-6 py-3.5 font-semibold">Estado</th>
                <th scope="col" className="px-6 py-3.5 font-semibold text-right">Acciones de Ciclo de Vida</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {cargando && equipos.length === 0 ? (
                <SkeletonTable soloFilas columnas={5} filas={6} />
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
                  const yaDadoDeBaja = String(item.estado).toUpperCase() === 'DADO_DE_BAJA';

                  return (
                    <tr key={item.id || item.codigoQr} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="font-bold text-gray-900">{item.nombre}</span>
                          <span className="font-mono text-xs font-semibold text-primary">{idPrincipal}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="font-medium text-gray-800">{item.categoria}</span>
                          <span className="text-xs text-gray-500">{item.ubicacion}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-xs text-gray-600">
                        <div className="font-medium text-gray-800">{item.modelo || 'Estándar'}</div>
                        <div className="font-mono text-[11px] text-gray-500">{numeroSerie}</div>
                      </td>
                      <td className="px-6 py-4">
                        <StatusBadge status={estadoLegible} />
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="inline-flex items-center gap-2 justify-end flex-wrap">
                          <Link
                            to={`/trazabilidad/${encodeURIComponent(idPrincipal)}`}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-primary bg-primary-50 hover:bg-primary-100 border border-primary-200 rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                            title="Ver línea de tiempo y trazabilidad completa del activo"
                          >
                            <FiActivity className="w-3.5 h-3.5 text-primary" aria-hidden="true" />
                            <span>Trazabilidad</span>
                          </Link>

                          {puedePlanificarMantenimiento && (
                            <Link
                              to={`/mantenimientos/planificar?id_activo=${encodeURIComponent(item.id || idPrincipal)}`}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                              title="Planificar mantenimiento preventivo para este equipo"
                            >
                              <FiCalendar className="w-3.5 h-3.5 text-emerald-700" aria-hidden="true" />
                              <span>Mantenimiento</span>
                            </Link>
                          )}

                          {puedeReportarFalla && (
                            <Link
                              to={`/incidencias/nueva?id_activo=${encodeURIComponent(item.id || idPrincipal)}`}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                              title="Reportar incidencia para este equipo"
                            >
                              <FiAlertCircle className="w-3.5 h-3.5 text-rose-600" aria-hidden="true" />
                              <span>Reportar Falla</span>
                            </Link>
                          )}

                          {puedeGestionarActivos && (
                            <>
                              <button
                                type="button"
                                onClick={() => abrirModalEditar(item)}
                                aria-label={`Editar activo ${item.nombre}`}
                                title="Modificar datos o estado del activo"
                                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 border border-gray-200 rounded-lg transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                              >
                                <FiEdit2 className="w-3.5 h-3.5" aria-hidden="true" />
                                <span>Editar</span>
                              </button>
                              <button
                                type="button"
                                disabled={yaDadoDeBaja}
                                onClick={() => setEquipoBaja(item)}
                                aria-label={`Dar de baja activo ${item.nombre}`}
                                title={yaDadoDeBaja ? 'El activo ya se encuentra dado de baja' : 'Dar de baja este activo'}
                                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                              >
                                <FiTrash2 className="w-3.5 h-3.5" aria-hidden="true" />
                                <span>Baja</span>
                              </button>
                            </>
                          )}
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

      {/* Modal Registrar / Modificar Activo */}
      {modalEquipoAbierto && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="titulo-modal-activo"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-xs"
          onClick={(e) => {
            if (e.target === e.currentTarget && !guardandoEquipo) setModalEquipoAbierto(false);
          }}
        >
          <div
            ref={modalEquipoRef}
            tabIndex={-1}
            className="bg-white rounded-2xl shadow-xl border border-gray-200 w-full max-w-lg overflow-hidden focus:outline-none"
          >
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/70">
              <div className="flex items-center gap-2">
                <FiBox className="w-5 h-5 text-primary" aria-hidden="true" />
                <h2 id="titulo-modal-activo" className="text-base font-bold text-gray-900">
                  {equipoEditando ? 'Modificar Activo de Inventario' : 'Registrar Nuevo Activo'}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setModalEquipoAbierto(false)}
                disabled={guardandoEquipo}
                aria-label="Cerrar modal de activo"
                className="p-1.5 rounded-lg text-gray-500 hover:text-gray-800 hover:bg-gray-100 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                <FiX className="w-4 h-4" aria-hidden="true" />
              </button>
            </div>

            <form onSubmit={handleGuardarEquipo} className="p-5 space-y-4 text-sm">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label htmlFor="activo-qr" className="block text-xs font-bold text-gray-700 mb-1">
                    Código QR Institucional *
                  </label>
                  <input
                    id="activo-qr"
                    type="text"
                    required
                    value={formEquipo.codigoQr}
                    onChange={(e) => setFormEquipo((p) => ({ ...p, codigoQr: e.target.value.toUpperCase() }))}
                    placeholder="Ej. UCT-PRJ-05"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono outline-none focus:border-primary focus-visible:ring-2 focus-visible:ring-primary"
                  />
                </div>
                <div>
                  <label htmlFor="activo-categoria" className="block text-xs font-bold text-gray-700 mb-1">
                    Categoría *
                  </label>
                  <select
                    id="activo-categoria"
                    value={formEquipo.categoria}
                    onChange={(e) => setFormEquipo((p) => ({ ...p, categoria: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white font-semibold outline-none focus:border-primary focus-visible:ring-2 focus-visible:ring-primary"
                  >
                    {CATEGORIAS_ACTIVO.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label htmlFor="activo-nombre" className="block text-xs font-bold text-gray-700 mb-1">
                  Nombre del Equipo *
                </label>
                <input
                  id="activo-nombre"
                  type="text"
                  required
                  value={formEquipo.nombre}
                  onChange={(e) => setFormEquipo((p) => ({ ...p, nombre: e.target.value }))}
                  placeholder="Ej. Proyector Epson PowerLite Sala C204"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:border-primary focus-visible:ring-2 focus-visible:ring-primary"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label htmlFor="activo-modelo" className="block text-xs font-bold text-gray-700 mb-1">
                    Modelo
                  </label>
                  <input
                    id="activo-modelo"
                    type="text"
                    value={formEquipo.modelo}
                    onChange={(e) => setFormEquipo((p) => ({ ...p, modelo: e.target.value }))}
                    placeholder="Ej. L210W / OptiPlex 7000"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:border-primary focus-visible:ring-2 focus-visible:ring-primary"
                  />
                </div>
                <div>
                  <label htmlFor="activo-serie" className="block text-xs font-bold text-gray-700 mb-1">
                    Número de Serie
                  </label>
                  <input
                    id="activo-serie"
                    type="text"
                    value={formEquipo.numeroSerie}
                    onChange={(e) => setFormEquipo((p) => ({ ...p, numeroSerie: e.target.value }))}
                    placeholder="Ej. SN-UCT-0091"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono outline-none focus:border-primary focus-visible:ring-2 focus-visible:ring-primary"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label htmlFor="activo-ubicacion" className="block text-xs font-bold text-gray-700 mb-1">
                    Ubicación Física *
                  </label>
                  <input
                    id="activo-ubicacion"
                    type="text"
                    required
                    value={formEquipo.ubicacion}
                    onChange={(e) => setFormEquipo((p) => ({ ...p, ubicacion: e.target.value }))}
                    placeholder="Ej. Edificio C - Sala C204"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:border-primary focus-visible:ring-2 focus-visible:ring-primary"
                  />
                </div>
                <div>
                  <label htmlFor="activo-estado" className="block text-xs font-bold text-gray-700 mb-1">
                    Estado Operativo *
                  </label>
                  <select
                    id="activo-estado"
                    value={formEquipo.estado}
                    onChange={(e) => setFormEquipo((p) => ({ ...p, estado: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white font-semibold outline-none focus:border-primary focus-visible:ring-2 focus-visible:ring-primary"
                  >
                    {ESTADOS_ACTIVO.map((est) => (
                      <option key={est.value} value={est.value}>
                        {est.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  disabled={guardandoEquipo}
                  onClick={() => setModalEquipoAbierto(false)}
                  className="px-4 py-2 rounded-lg border border-gray-300 text-xs font-semibold text-gray-700 hover:bg-gray-50 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={guardandoEquipo}
                  className="px-4 py-2 rounded-lg bg-primary hover:bg-primary-hover text-white text-xs font-bold shadow-sm disabled:opacity-60 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1"
                >
                  {guardandoEquipo
                    ? 'Guardando...'
                    : equipoEditando
                      ? 'Guardar Cambios'
                      : 'Registrar Activo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Confirmar Baja de Activo */}
      {equipoBaja && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="titulo-modal-baja-activo"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-xs"
          onClick={(e) => {
            if (e.target === e.currentTarget && !procesandoBaja) setEquipoBaja(null);
          }}
        >
          <div
            ref={modalBajaRef}
            tabIndex={-1}
            className="bg-white rounded-2xl shadow-xl border border-red-200 w-full max-w-md p-6 space-y-4 focus:outline-none"
          >
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-red-100 text-red-700 flex items-center justify-center flex-shrink-0">
                <FiAlertTriangle className="w-5 h-5" aria-hidden="true" />
              </div>
              <div className="space-y-1">
                <h2 id="titulo-modal-baja-activo" className="text-base font-bold text-gray-900">
                  ¿Dar de baja este equipo del inventario?
                </h2>
                <p className="text-xs text-gray-600 leading-relaxed">
                  El equipo <strong>{equipoBaja.nombre}</strong> (<code className="font-mono">{equipoBaja.codigoQr}</code>) pasará a estado{' '}
                  <strong>Dado de Baja</strong>, bloqueando nuevos reportes sobre su código QR mientras conserva todo su historial de trazabilidad.
                </p>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                disabled={procesandoBaja}
                onClick={() => setEquipoBaja(null)}
                className="px-4 py-2 rounded-lg border border-gray-300 text-xs font-semibold text-gray-700 hover:bg-gray-50 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={procesandoBaja}
                onClick={() => void handleConfirmarBaja()}
                className="px-4 py-2 rounded-lg bg-red-700 hover:bg-red-800 text-white text-xs font-bold shadow-sm disabled:opacity-60 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-600 focus-visible:ring-offset-1"
              >
                {procesandoBaja ? 'Procesando...' : 'Confirmar Baja'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Inventario;
