import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  FiServer,
  FiRefreshCw,
  FiHome,
  FiTerminal
} from 'react-icons/fi';

/**
 * TAL-169: Vista corporativa de Error 500 (Fallo Interno del Servidor / Bad Gateway)
 * Captura excepciones no controladas de la API, errores 500/502/503 y caídas de microservicios,
 * proveyendo diagnóstico accesible, reintento sin pérdida de sesión y retorno seguro.
 */
const ServerError = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [reintentando, setReintentando] = useState(false);

  // Extraer estado o mensaje personalizado transmitido por el interceptor Axios
  const errorInfo = location.state || {};
  const statusCodigo = errorInfo.status || 500;
  const mensajeError =
    errorInfo.message ||
    'El servidor o el microservicio de destino experimentó un fallo imprevisto al procesar la solicitud.';

  const handleReintentar = () => {
    setReintentando(true);
    setTimeout(() => {
      // Si hay una ruta previa guardada, intentar regresar a ella; caso contrario recargar
      if (errorInfo.from) {
        navigate(errorInfo.from, { replace: true });
      } else {
        window.location.reload();
      }
    }, 500);
  };

  return (
    <div className="min-h-screen bg-linear-to-b from-slate-50 via-rose-50/20 to-slate-100 flex flex-col justify-between p-4 sm:p-6 lg:p-8">
      {/* Cabecera institucional */}
      <header className="max-w-5xl mx-auto w-full flex items-center justify-between py-4">
        <Link to="/dashboard" className="flex items-center gap-3 group">
          <div className="w-10 h-10 rounded-xl bg-blue-900 text-white flex items-center justify-center font-bold text-lg shadow-md group-hover:bg-blue-800 transition">
            SG
          </div>
          <div>
            <h1 className="text-sm font-bold text-gray-900 tracking-tight leading-none">
              Gestión de Mantenimiento
            </h1>
            <p className="text-[11px] text-gray-500 font-medium">UCT — Infraestructura TI</p>
          </div>
        </Link>
        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
          Código HTTP {statusCodigo}
        </span>
      </header>

      {/* Contenido Central */}
      <main className="max-w-3xl mx-auto w-full my-auto text-center py-8">
        {/* Insignia visual 500 */}
        <div className="relative inline-flex items-center justify-center mb-6">
          <span className="text-8xl sm:text-9xl font-black text-rose-100 tracking-tighter select-none">
            {statusCodigo}
          </span>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-rose-600 text-white flex items-center justify-center shadow-xl shadow-rose-600/30 -rotate-3 transition-transform hover:rotate-0">
              <FiServer className="w-8 h-8 sm:w-10 sm:h-10 animate-bounce" />
            </div>
          </div>
        </div>

        <h2 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">
          Error en los servicios del sistema
        </h2>
        <p className="text-sm sm:text-base text-gray-600 mt-2 max-w-xl mx-auto">
          {mensajeError}
        </p>

        {/* Detalle técnico colapsable o legible */}
        <div className="mt-5 max-w-lg mx-auto bg-white border border-gray-200 rounded-xl p-3.5 shadow-2xs text-left">
          <div className="flex items-start gap-2.5">
            <FiTerminal className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
            <div className="flex-1 text-xs">
              <p className="font-semibold text-gray-700">Diagnóstico sugerido:</p>
              <p className="text-gray-500 mt-0.5 font-mono text-[11px]">
                {statusCodigo === 502
                  ? 'El API Gateway no pudo conectar con el microservicio de destino (Host no alcanzable).'
                  : statusCodigo === 503
                    ? 'El servicio se encuentra saturado o en mantenimiento programado.'
                    : 'Excepción de ejecución interna o inconsistencia de conexión a base de datos.'}
              </p>
            </div>
          </div>
        </div>

        {/* Botones de acción */}
        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            type="button"
            id="btn-500-reintentar"
            onClick={handleReintentar}
            disabled={reintentando}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-blue-600 text-white font-semibold text-sm hover:bg-blue-700 transition shadow-sm hover:shadow cursor-pointer min-h-[44px] disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <FiRefreshCw className={`w-4 h-4 ${reintentando ? 'animate-spin' : ''}`} />
            <span>{reintentando ? 'Reconectando...' : 'Reintentar Conexión'}</span>
          </button>

          <Link
            to="/dashboard"
            id="btn-500-inicio"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-white border border-gray-300 text-gray-700 font-semibold text-sm hover:bg-gray-50 hover:text-gray-900 transition shadow-2xs cursor-pointer min-h-[44px]"
          >
            <FiHome className="w-4 h-4" />
            <span>Volver al Inicio</span>
          </Link>
        </div>

        {/* Lista de comprobación rápida */}
        <div className="mt-12 pt-8 border-t border-gray-200 text-left max-w-xl mx-auto">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 text-center sm:text-left">
            Pasos para la resolución del problema
          </p>
          <ul className="space-y-2 text-xs text-gray-600">
            <li className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-600 shrink-0" />
              <span>Verifica que los microservicios Docker o el API Gateway (puerto 8080) se encuentren en ejecución.</span>
            </li>
            <li className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-600 shrink-0" />
              <span>Confirma que tu sesión de usuario sea válida y cuentes con acceso de red institucional.</span>
            </li>
            <li className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-600 shrink-0" />
              <span>Si el fallo persiste tras recargar, comunica el incidente al administrador del sistema.</span>
            </li>
          </ul>
        </div>
      </main>

      {/* Pie institucional */}
      <footer className="max-w-5xl mx-auto w-full text-center py-4 text-xs text-gray-400">
        Sistema de Gestión de Mantenimiento e Incidencias TI &copy; {new Date().getFullYear()} Universidad Católica de Temuco.
      </footer>
    </div>
  );
};

export default ServerError;
