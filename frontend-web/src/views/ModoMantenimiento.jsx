import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { FiTool, FiRefreshCw, FiClock, FiSave, FiAlertTriangle } from 'react-icons/fi';
import {
  KILL_SWITCH_POLL_SECONDS,
  MOTIVO_POR_DEFECTO,
  consultarEstadoKillSwitch,
  extraerMotivo,
  guardarInfoKillSwitch,
  leerInfoKillSwitch,
  limpiarInfoKillSwitch,
} from '../services/killSwitchService';

/**
 * TAL-188: Pantalla global de bloqueo por mantenimiento (Kill Switch activo).
 * - Muestra el motivo exacto enviado por el backend.
 * - Comprueba automáticamente cada 15 s si el servicio se reanudó.
 * - No toca los borradores locales de formularios (localStorage "draft:*").
 */
const ModoMantenimiento = () => {
  const location = useLocation();
  const navigate = useNavigate();

  // El estado de navegación puede perderse al recargar: se respalda en sessionStorage
  const [info, setInfo] = useState(() => {
    const desdeEstado = location.state?.killSwitch ? location.state : null;
    const base = desdeEstado || leerInfoKillSwitch() || {};
    return {
      motivo: base.motivo || MOTIVO_POR_DEFECTO,
      from: base.from || '/dashboard',
      servicios: base.servicios_afectados || [],
    };
  });
  const [segundos, setSegundos] = useState(KILL_SWITCH_POLL_SECONDS);
  const [verificando, setVerificando] = useState(false);
  const [errorConsulta, setErrorConsulta] = useState(false);
  const verificandoRef = useRef(false);

  const reanudar = useCallback(() => {
    limpiarInfoKillSwitch();
    navigate(info.from, { replace: true });
  }, [navigate, info.from]);

  const verificarServicio = useCallback(async () => {
    if (verificandoRef.current) return;
    verificandoRef.current = true;
    setVerificando(true);
    try {
      const estado = await consultarEstadoKillSwitch();
      setErrorConsulta(false);
      if (estado?.activo) {
        // Sigue suspendido: actualizar motivo por si el administrador lo modificó
        const motivo = extraerMotivo(estado);
        setInfo((prev) => ({ ...prev, motivo, servicios: estado.servicios_afectados || prev.servicios }));
        guardarInfoKillSwitch({
          killSwitch: true,
          motivo,
          from: info.from,
          servicios_afectados: estado.servicios_afectados,
        });
      } else {
        reanudar();
        return;
      }
    } catch {
      setErrorConsulta(true);
    } finally {
      verificandoRef.current = false;
      setVerificando(false);
      setSegundos(KILL_SWITCH_POLL_SECONDS);
    }
  }, [info.from, reanudar]);

  // Contador regresivo y verificación automática cada 15 segundos
  useEffect(() => {
    const timer = setInterval(() => {
      setSegundos((s) => (s <= 1 ? 0 : s - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (segundos === 0 && !verificandoRef.current) {
      // eslint-disable-next-line react-hooks/exhaustive-deps
      verificarServicio();
    }
  }, [segundos, verificarServicio]);

  // Primera verificación inmediata (por si se entra por URL directa con el servicio ya reanudado)
  useEffect(() => {
    verificarServicio();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="min-h-screen bg-linear-to-b from-slate-50 via-amber-50/30 to-slate-100 flex flex-col justify-between p-4 sm:p-6 lg:p-8">
      <header className="max-w-5xl mx-auto w-full flex items-center justify-between py-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary text-white flex items-center justify-center font-bold text-lg shadow-md">
            SG
          </div>
          <div>
            <h1 className="text-sm font-bold text-gray-900 tracking-tight leading-none">
              Gestión de Mantenimiento
            </h1>
            <p className="text-[11px] text-gray-500 font-medium">UCT — Infraestructura TI</p>
          </div>
        </div>
        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200">
          Código HTTP 503
        </span>
      </header>

      <main className="max-w-3xl mx-auto w-full my-auto text-center py-8" role="main">
        <div className="inline-flex w-20 h-20 rounded-xl bg-amber-500 text-white items-center justify-center shadow-xl shadow-amber-500/30 -rotate-3 mb-6">
          <FiTool className="w-10 h-10" aria-hidden="true" />
        </div>

        <h2 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">
          Sistema en mantenimiento
        </h2>
        <p className="text-sm sm:text-base text-gray-600 mt-2 max-w-xl mx-auto">
          Suspendimos temporalmente las operaciones de escritura. Te llevaremos de vuelta apenas se reanude el servicio.
        </p>

        {/* Motivo exacto enviado por el backend */}
        <section
          aria-labelledby="motivo-titulo"
          className="mt-6 max-w-lg mx-auto bg-white border border-amber-200 rounded-xl p-4 shadow-2xs text-left"
        >
          <div className="flex items-start gap-2.5">
            <FiAlertTriangle className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" aria-hidden="true" />
            <div className="flex-1">
              <p id="motivo-titulo" className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                Motivo oficial
              </p>
              <p id="motivo-mantenimiento" className="text-base font-semibold text-gray-900 mt-1">
                {info.motivo}
              </p>
              {info.servicios.length > 0 && (
                <p className="text-xs text-gray-500 mt-2">
                  Servicios afectados: <span className="font-mono">{info.servicios.join(', ')}</span>
                </p>
              )}
            </div>
          </div>
        </section>

        {/* Contador de reintento */}
        <div
          className="mt-5 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white border border-gray-200 text-sm text-gray-700 shadow-2xs"
          role="status"
          aria-live="polite"
        >
          <FiClock className="w-4 h-4 text-primary" aria-hidden="true" />
          <span id="contador-reintento">
            {verificando
              ? 'Comprobando estado del servicio...'
              : `Próxima comprobación en ${segundos} s`}
          </span>
        </div>
        {errorConsulta && (
          <p className="mt-2 text-xs text-rose-600">
            No se pudo consultar el estado del servicio. Reintentaremos automáticamente.
          </p>
        )}

        <div className="mt-6">
          <button
            type="button"
            id="btn-verificar-ahora"
            onClick={verificarServicio}
            disabled={verificando}
            className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-lg bg-primary hover:bg-primary-hover text-white font-bold text-sm transition shadow-md cursor-pointer min-h-[44px] disabled:opacity-60 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <FiRefreshCw className={`w-4 h-4 ${verificando ? 'animate-spin' : ''}`} aria-hidden="true" />
            <span>{verificando ? 'Comprobando...' : 'Comprobar ahora'}</span>
          </button>
        </div>

        <div className="mt-8 max-w-lg mx-auto flex items-start gap-2.5 bg-emerald-50 border border-emerald-200 rounded-xl p-3.5 text-left">
          <FiSave className="w-4 h-4 text-emerald-700 mt-0.5 shrink-0" aria-hidden="true" />
          <p className="text-xs text-emerald-900">
            <strong>Tus borradores están a salvo.</strong> Lo que escribiste en formularios se conserva en este
            dispositivo y lo encontrarás al volver.
          </p>
        </div>
      </main>

      <footer className="max-w-5xl mx-auto w-full text-center py-4 text-xs text-gray-400">
        Sistema de Gestión de Mantenimiento e Incidencias TI &copy; {new Date().getFullYear()} Universidad Católica de Temuco.
      </footer>
    </div>
  );
};

export default ModoMantenimiento;
