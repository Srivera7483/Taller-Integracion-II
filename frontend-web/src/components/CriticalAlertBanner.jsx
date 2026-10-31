import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiAlertTriangle, FiArrowRight, FiX } from 'react-icons/fi';
import { fetchMantenimientos } from '../services/mantenimientosService';

/**
 * TAL-122: Alertas Visuales (Mantenimientos Próximos)
 * Componente independiente de banner de alerta crítica.
 * Se renderiza únicamente si existen mantenimientos vencidos o programados para hoy.
 * Manejo de errores silencioso para garantizar la estabilidad de la UI.
 */
const CriticalAlertBanner = () => {
  const [isVisible, setIsVisible] = useState(true);
  const [cantidadCriticos, setCantidadCriticos] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    let isMounted = true;

    const verificarMantenimientosCriticos = async () => {
      try {
        // Consumir el listado/resumen de mantenimientos
        const data = await fetchMantenimientos();

        if (!Array.isArray(data) || data.length === 0) {
          if (isMounted) setCantidadCriticos(0);
          return;
        }

        // Definir los límites del día actual
        const ahora = new Date();
        const inicioHoy = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate(), 0, 0, 0, 0);
        const finHoy = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate(), 23, 59, 59, 999);

        // Filtrar mantenimientos que estén vencidos o requeridos para hoy
        const criticos = data.filter((item) => {
          if (!item) return false;

          const estadoLimpio = String(item.estado || '').toLowerCase().trim();

          // Ignorar los ya completados, resueltos o cancelados
          const isTerminado =
            estadoLimpio.includes('complet') ||
            estadoLimpio.includes('finaliz') ||
            estadoLimpio.includes('cancel');
          if (isTerminado) return false;

          // Estado explícito "VENCIDO" / "VENCIDOS"
          if (estadoLimpio.includes('vencid')) {
            return true;
          }

          // Chequeo por fecha programada
          if (item.fecha_programada) {
            const fechaProg = new Date(item.fecha_programada);
            if (!isNaN(fechaProg.getTime())) {
              // Vencido (anterior al inicio de hoy)
              if (fechaProg < inicioHoy) return true;
              // Programado para hoy (dentro del rango de hoy)
              if (fechaProg >= inicioHoy && fechaProg <= finHoy) return true;
            }
          }

          // Estado explícito "HOY"
          if (estadoLimpio.includes('hoy')) {
            return true;
          }

          return false;
        });

        if (isMounted) {
          setCantidadCriticos(criticos.length);
        }
      } catch {
        // Manejo silencioso: en caso de error en el endpoint, no rompe la UI
        if (isMounted) {
          setCantidadCriticos(0);
        }
      }
    };

    verificarMantenimientosCriticos();

    return () => {
      isMounted = false;
    };
  }, []);

  // Si el usuario lo cerró o no hay mantenimientos críticos, retornar null inmediatamente
  if (!isVisible || cantidadCriticos === 0) {
    return null;
  }

  const handleVerListado = () => {
    navigate('/mantenimientos');
  };

  const handleCerrar = () => {
    setIsVisible(false);
  };

  return (
    <div
      role="alert"
      aria-live="assertive"
      className="w-full bg-gradient-to-r from-red-600 via-rose-600 to-amber-600 text-white px-4 py-2.5 sm:px-6 shadow-md border-b border-red-700/30 flex-shrink-0 transition-all duration-300 ease-in-out"
    >
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-3 flex-wrap sm:flex-nowrap">
        {/* Contenido principal y mensaje */}
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="p-1 rounded-full bg-white/20 flex-shrink-0">
            <FiAlertTriangle className="w-4 h-4 text-amber-200 animate-pulse" />
          </span>
          <p className="text-xs sm:text-sm font-medium tracking-tight truncate">
            ¡Atención! Tienes <span className="font-bold underline decoration-amber-300 decoration-2">{cantidadCriticos}</span> mantenimientos vencidos o requeridos hoy
          </p>
        </div>

        {/* Acciones: Botón Ver listado y Cerrar */}
        <div className="flex items-center gap-2 flex-shrink-0 ml-auto sm:ml-0">
          <button
            type="button"
            onClick={handleVerListado}
            className="inline-flex items-center gap-1.5 px-3 py-1 bg-white text-red-700 hover:bg-red-50 text-xs font-semibold rounded-md shadow-xs transition-colors cursor-pointer"
          >
            <span>Ver listado</span>
            <FiArrowRight className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={handleCerrar}
            className="p-1 text-white/80 hover:text-white hover:bg-white/10 rounded-md transition-colors cursor-pointer"
            title="Cerrar alerta"
            aria-label="Cerrar alerta"
          >
            <FiX className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default CriticalAlertBanner;
