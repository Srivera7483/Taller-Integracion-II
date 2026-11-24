import React, { useEffect, useCallback } from 'react';
import {
  FiX,
  FiRefreshCw,
  FiClock,
  FiBox,
  FiFileText,
  FiCheckCircle,
  FiAlertTriangle,
  FiWifiOff,
  FiLayers,
} from 'react-icons/fi';
import { useColaSincronizacion } from '../hooks/useColaSincronizacion';
import { useNetworkStatus } from '../context/NetworkStatusContext';

/**
 * Retorna las clases de estilo Tailwind apropiadas según el estado de sincronización del ítem.
 */
const obtenerClasesBadgeEstado = (estadoSincronizacion) => {
  switch (estadoSincronizacion) {
    case 'sincronizando':
      return 'bg-blue-100 text-blue-800 border-blue-200';
    case 'error':
      return 'bg-rose-100 text-rose-800 border-rose-200';
    case 'sincronizado':
      return 'bg-emerald-100 text-emerald-800 border-emerald-200';
    case 'pendiente':
    default:
      return 'bg-amber-100 text-amber-800 border-amber-200';
  }
};

/**
 * TAL-198: Modal de Cola de Cambios Pendientes de Sincronización.
 *
 * Accesible desde el perfil del técnico y desde los badges en el header o barra lateral.
 * Permite visualizar el estado detallado de mutaciones almacenadas localmente en IndexedDB
 * (hora de registro local, activo y orden asociada) y forzar la sincronización manual mediante
 * el botón "Reintentar ahora" provisto de un indicador de carga visual.
 */
const ColaPendientesModal = ({
  estaAbierto = false,
  alCerrar = () => {},
  controladorColaExterno = null,
}) => {
  const controladorColaInterno = useColaSincronizacion();
  const controladorCola = controladorColaExterno || controladorColaInterno;
  const { isOnline } = useNetworkStatus();

  const {
    accionesPendientes,
    cantidadPendientes,
    estaSincronizando,
    ultimoResultado,
    forzarSincronizacionManual,
    cargarColaPendiente,
  } = controladorCola;

  // Cierra el modal con la tecla Escape para cumplir con accesibilidad W3C Dialog
  const manejarTeclaEscape = useCallback(
    (eventoTeclado) => {
      if (eventoTeclado.key === 'Escape' && estaAbierto) {
        alCerrar();
      }
    },
    [estaAbierto, alCerrar],
  );

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.addEventListener('keydown', manejarTeclaEscape);
    }
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('keydown', manejarTeclaEscape);
      }
    };
  }, [manejarTeclaEscape]);

  // Si el modal se abre, refrescamos el contenido para garantizar exactitud inmediata
  useEffect(() => {
    if (estaAbierto) {
      void cargarColaPendiente();
    }
  }, [estaAbierto, cargarColaPendiente]);

  if (!estaAbierto) return null;

  const ejecutarSincronizacion = async () => {
    await forzarSincronizacionManual();
  };

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-gray-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-fadeIn"
      role="dialog"
      aria-modal="true"
      aria-labelledby="titulo-cola-pendientes"
    >
      <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-gray-200 flex flex-col max-h-[90vh] overflow-hidden">
        {/* Cabecera del modal */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 bg-gray-50/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shadow-xs">
              <FiLayers className="w-5 h-5 text-primary" aria-hidden="true" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2
                  id="titulo-cola-pendientes"
                  className="text-base sm:text-lg font-bold text-gray-900 tracking-tight"
                >
                  Cola de Sincronización Offline
                </h2>
                <span
                  data-testid="modal-badge-cantidad"
                  className="inline-flex items-center justify-center px-2 py-0.5 text-xs font-bold rounded-full bg-primary-100 text-primary-800 border border-primary-200"
                >
                  {cantidadPendientes} {cantidadPendientes === 1 ? 'pendiente' : 'pendientes'}
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-0.5">
                Reportes y modificaciones guardadas localmente a la espera de confirmarse en el servidor.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={alCerrar}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors cursor-pointer"
            aria-label="Cerrar modal de cola de pendientes"
            title="Cerrar ventana"
          >
            <FiX className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        {/* Barra superior de acciones y estado de conectividad */}
        <div className="px-5 py-3 bg-gray-50/40 border-b border-gray-200 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs">
            {isOnline ? (
              <span className="inline-flex items-center gap-1.5 text-emerald-700 font-medium">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                Conexión disponible
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 text-rose-700 font-medium">
                <FiWifiOff className="w-3.5 h-3.5" />
                Sin conexión a internet
              </span>
            )}
            <span className="text-gray-300">•</span>
            <span className="text-gray-500">
              {cantidadPendientes === 0
                ? 'Todos los datos están al día'
                : 'Sincronización en segundo plano activa'}
            </span>
          </div>

          {/* Botón Reintentar ahora con spinner visual de carga (Criterio 3) */}
          <button
            type="button"
            onClick={ejecutarSincronizacion}
            disabled={estaSincronizando || cantidadPendientes === 0}
            data-testid="boton-reintentar-ahora"
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold text-white bg-primary hover:bg-primary/90 active:bg-primary-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-xs cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1"
          >
            <FiRefreshCw
              data-testid="icono-spinner-sincronizacion"
              className={`w-3.5 h-3.5 ${estaSincronizando ? 'animate-spin' : ''}`}
              aria-hidden="true"
            />
            <span>{estaSincronizando ? 'Sincronizando...' : 'Reintentar ahora'}</span>
          </button>
        </div>

        {/* Alerta de resultado reciente si hubo sincronización */}
        {ultimoResultado && (
          <div
            className={`mx-5 mt-3 px-3.5 py-2 rounded-xl text-xs flex items-center justify-between border ${
              ultimoResultado.errores > 0 || ultimoResultado.motivo === 'sin_conexion'
                ? 'bg-amber-50 text-amber-900 border-amber-200'
                : 'bg-emerald-50 text-emerald-900 border-emerald-200'
            }`}
          >
            <div className="flex items-center gap-2">
              {ultimoResultado.errores > 0 ? (
                <FiAlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
              ) : (
                <FiCheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              )}
              <span>
                {ultimoResultado.motivo === 'sin_conexion'
                  ? 'No se pudo sincronizar: el dispositivo continúa sin conexión a internet.'
                  : ultimoResultado.errores > 0
                    ? `Sincronizados: ${ultimoResultado.sincronizadas || 0}. Pendientes con error: ${ultimoResultado.errores}.`
                    : `Sincronización exitosa: ${ultimoResultado.sincronizadas || 0} acciones confirmadas por el servidor.`}
              </span>
            </div>
          </div>
        )}

        {/* Cuerpo del modal: Listado de ítems o estado vacío (Criterio 2) */}
        <div className="flex-1 overflow-y-auto p-5 space-y-3.5">
          {cantidadPendientes === 0 ? (
            <div
              data-testid="estado-vacio-cola"
              className="py-12 flex flex-col items-center justify-center text-center text-gray-500"
            >
              <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-3">
                <FiCheckCircle className="w-8 h-8" />
              </div>
              <h3 className="text-sm font-bold text-gray-800">Bandeja de sincronización al día</h3>
              <p className="text-xs text-gray-500 max-w-sm mt-1">
                No tienes reportes ni modificaciones pendientes. Todas tus acciones en terreno han
                sido confirmadas y almacenadas en el servidor institucional.
              </p>
            </div>
          ) : (
            <div className="space-y-3" data-testid="lista-acciones-pendientes">
              {accionesPendientes.map((itemAccion) => (
                <div
                  key={itemAccion.id}
                  data-testid="tarjeta-accion-pendiente"
                  className="bg-white rounded-xl border border-gray-200 p-4 shadow-2xs hover:border-gray-300 transition-colors space-y-2.5"
                >
                  {/* Encabezado del ítem */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-bold text-gray-900 bg-gray-100 px-2 py-0.5 rounded-md">
                        {itemAccion.etiquetaTipo || itemAccion.tipo}
                      </span>
                      <span
                        data-testid="badge-estado-item"
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold border ${obtenerClasesBadgeEstado(
                          itemAccion.estado_sincronizacion,
                        )}`}
                      >
                        {itemAccion.estado_sincronizacion === 'sincronizando' && (
                          <FiRefreshCw className="w-2.5 h-2.5 animate-spin" />
                        )}
                        <span>{itemAccion.etiquetaEstado || itemAccion.estado_sincronizacion}</span>
                      </span>
                    </div>

                    {/* Hora de registro local legible */}
                    <div
                      className="flex items-center gap-1 text-[11px] text-gray-500 flex-shrink-0"
                      title="Hora de registro local"
                    >
                      <FiClock className="w-3.5 h-3.5 text-gray-400" />
                      <span>{itemAccion.fechaFormateada}</span>
                    </div>
                  </div>

                  {/* Detalle legible del Activo y de la Orden asociada (Criterio 2) */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1 text-xs">
                    {/* Activo asociado */}
                    <div className="bg-gray-50 rounded-lg p-2.5 border border-gray-100 flex items-start gap-2">
                      <FiBox className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                      <div className="min-w-0 flex-1">
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                          Activo Asociado
                        </span>
                        <span
                          data-testid="nombre-activo-detalle"
                          className="font-semibold text-gray-800 block truncate"
                          title={itemAccion.activoDetalle?.nombre}
                        >
                          {itemAccion.activoDetalle?.nombre || 'Activo institucional'}
                        </span>
                        <span className="text-[11px] text-gray-500 block truncate">
                          Código: {itemAccion.activoDetalle?.codigo || 'N/A'}
                          {itemAccion.activoDetalle?.ubicacion
                            ? ` • ${itemAccion.activoDetalle.ubicacion}`
                            : ''}
                        </span>
                      </div>
                    </div>

                    {/* Orden / Incidencia asociada */}
                    <div className="bg-gray-50 rounded-lg p-2.5 border border-gray-100 flex items-start gap-2">
                      <FiFileText className="w-4 h-4 text-indigo-600 mt-0.5 flex-shrink-0" />
                      <div className="min-w-0 flex-1">
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                          Orden / Incidencia
                        </span>
                        <span
                          data-testid="titulo-orden-detalle"
                          className="font-semibold text-gray-800 block truncate"
                          title={itemAccion.ordenDetalle?.titulo}
                        >
                          {itemAccion.ordenDetalle?.titulo || 'Operación general'}
                        </span>
                        <span className="text-[11px] text-gray-500 block truncate">
                          Referencia: {itemAccion.ordenDetalle?.codigo || 'Pendiente'}
                          {itemAccion.ordenDetalle?.prioridad
                            ? ` • Prioridad ${itemAccion.ordenDetalle.prioridad}`
                            : ''}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Diagnóstico técnico o resolución si está presente */}
                  {itemAccion.ordenDetalle?.diagnostico && (
                    <div className="text-[11px] bg-indigo-50/50 text-indigo-950 p-2 rounded-md border border-indigo-100">
                      <span className="font-semibold">Diagnóstico/Detalle: </span>
                      <span className="italic">{itemAccion.ordenDetalle.diagnostico}</span>
                    </div>
                  )}

                  {/* Visualización de error si el ítem falló previamente */}
                  {itemAccion.ultimo_error && (
                    <div className="text-[11px] bg-rose-50 text-rose-800 p-2 rounded-md border border-rose-200 flex items-start gap-1.5">
                      <FiAlertTriangle className="w-3.5 h-3.5 text-rose-600 mt-0.5 flex-shrink-0" />
                      <div>
                        <span className="font-semibold">Último fallo: </span>
                        <span>{itemAccion.ultimo_error}</span>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Pie del modal */}
        <div className="px-5 py-3.5 border-t border-gray-200 bg-gray-50/70 flex items-center justify-between text-xs">
          <span className="text-gray-500 text-[11px]">
            Sincronización automática activa en segundo plano mediante Service Worker.
          </span>
          <button
            type="button"
            onClick={alCerrar}
            className="px-4 py-2 rounded-xl border border-gray-300 text-gray-700 font-semibold hover:bg-gray-100 transition-colors cursor-pointer"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};

export default ColaPendientesModal;
