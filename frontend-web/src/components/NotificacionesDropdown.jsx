import React, { useState, useEffect, useRef } from 'react';
import { FiBell, FiCheck, FiAlertCircle, FiClock, FiTool } from 'react-icons/fi';

// Datos de prueba para simular alertas recientes
const NOTIFICACIONES_INICIALES = [
  {
    id: 1,
    titulo: 'Asignacion de tarea',
    mensaje: 'Te han asignado la Incidencia #45',
    detalle: 'Falla en router de red principal',
    tiempo: 'Hace 5 min',
    leida: false,
    tipo: 'incidencia',
  },
  {
    id: 2,
    titulo: 'Mantenimiento agendado',
    mensaje: 'Mantenimiento preventivo para Activo #18',
    detalle: 'Servidor Rack - Revision programada',
    tiempo: 'Hace 45 min',
    leida: false,
    tipo: 'activo',
  },
  {
    id: 3,
    titulo: 'Estado actualizado',
    mensaje: 'Incidencia #12 cambio a estado Resuelta',
    detalle: 'Orden de trabajo cerrada por tecnico',
    tiempo: 'Hace 2 horas',
    leida: false,
    tipo: 'estado',
  },
];

const NotificacionesDropdown = () => {
  const [abierto, setAbierto] = useState(false);
  const [notificaciones, setNotificaciones] = useState(NOTIFICACIONES_INICIALES);
  const dropdownRef = useRef(null);

  // Cuenta notificaciones no leidas
  const noLeidas = notificaciones.filter((n) => !n.leida).length;

  // Cierra el menu al hacer clic afuera
  useEffect(() => {
    const handleClickAfuera = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setAbierto(false);
      }
    };

    if (abierto) {
      document.addEventListener('mousedown', handleClickAfuera);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickAfuera);
    };
  }, [abierto]);

  // Cambia el estado de una notificacion a leida
  const marcarComoLeida = (id) => {
    setNotificaciones((prev) =>
      prev.map((item) => (item.id === id ? { ...item, leida: true } : item))
    );
  };

  // Marca todas como leidas
  const marcarTodasLeidas = () => {
    setNotificaciones((prev) => prev.map((item) => ({ ...item, leida: true })));
  };

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      {/* Boton de campana con indicador */}
      <button
        type="button"
        onClick={() => setAbierto(!abierto)}
        className="relative p-2 rounded-xl text-gray-500 hover:text-blue-600 hover:bg-blue-50/70 transition-all duration-200 cursor-pointer focus:outline-none"
        title="Notificaciones"
        aria-label="Abrir notificaciones"
        aria-expanded={abierto}
      >
        <FiBell className="w-5 h-5" />

        {/* Puntito rojo cuando hay no leidas */}
        {noLeidas > 0 && (
          <span className="absolute top-1.5 right-1.5 flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500 ring-2 ring-white"></span>
          </span>
        )}
      </button>

      {/* Popover con efecto glassmorphism */}
      {abierto && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl bg-white/90 backdrop-blur-md border border-white/60 shadow-2xl ring-1 ring-black/5 z-50 overflow-hidden animate-fadeIn">
          {/* Cabecera del popover */}
          <div className="flex items-center justify-between px-4 py-3 bg-white/70 border-b border-gray-100 backdrop-blur-sm">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-gray-800">Notificaciones</span>
              {noLeidas > 0 && (
                <span className="px-2 py-0.5 text-[11px] font-semibold bg-red-50 text-red-600 rounded-full border border-red-100">
                  {noLeidas} nuevas
                </span>
              )}
            </div>

            {noLeidas > 0 && (
              <button
                type="button"
                onClick={marcarTodasLeidas}
                className="text-[11px] text-blue-600 hover:text-blue-800 font-medium cursor-pointer transition-colors"
              >
                Marcar leidas
              </button>
            )}
          </div>

          {/* Lista de alertas */}
          <div className="max-h-80 overflow-y-auto divide-y divide-gray-100/80 p-1.5">
            {notificaciones.length === 0 ? (
              <div className="p-6 text-center text-xs text-gray-400">
                No hay notificaciones recientes
              </div>
            ) : (
              notificaciones.map((item) => (
                <div
                  key={item.id}
                  onClick={() => marcarComoLeida(item.id)}
                  className={`group relative flex items-start gap-3 p-3 rounded-xl transition-all duration-150 cursor-pointer ${
                    item.leida
                      ? 'bg-transparent hover:bg-gray-50/80 opacity-75'
                      : 'bg-blue-50/40 hover:bg-blue-50/80'
                  }`}
                >
                  {/* Icono del tipo de alerta */}
                  <div
                    className={`mt-0.5 flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
                      item.tipo === 'incidencia'
                        ? 'bg-amber-100/80 text-amber-600 group-hover:bg-amber-200/80'
                        : item.tipo === 'activo'
                        ? 'bg-indigo-100/80 text-indigo-600 group-hover:bg-indigo-200/80'
                        : 'bg-emerald-100/80 text-emerald-600 group-hover:bg-emerald-200/80'
                    }`}
                  >
                    {item.tipo === 'incidencia' ? (
                      <FiAlertCircle className="w-4 h-4" />
                    ) : item.tipo === 'activo' ? (
                      <FiTool className="w-4 h-4" />
                    ) : (
                      <FiCheck className="w-4 h-4" />
                    )}
                  </div>

                  {/* Contenido de la notificacion */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <p className="text-xs font-semibold text-gray-800 truncate">
                        {item.titulo}
                      </p>
                      <span className="text-[10px] text-gray-600 flex items-center gap-0.5 flex-shrink-0">
                        <FiClock className="w-2.5 h-2.5" />
                        {item.tiempo}
                      </span>
                    </div>

                    <p className="text-xs text-gray-700 mt-0.5 font-medium leading-snug">
                      {item.mensaje}
                    </p>

                    <p className="text-[11px] text-gray-600 mt-0.5 truncate">
                      {item.detalle}
                    </p>
                  </div>

                  {/* Indicador de no leida */}
                  {!item.leida && (
                    <span
                      className="w-2 h-2 rounded-full bg-blue-600 mt-2 flex-shrink-0"
                      title="No leida"
                    />
                  )}
                </div>
              ))
            )}
          </div>

          {/* Pie del popover */}
          <div className="px-4 py-2 bg-gray-50/80 border-t border-gray-100/80 text-center">
            <span className="text-[11px] text-gray-500 font-medium">
              Alertas del sistema en tiempo real
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificacionesDropdown;
