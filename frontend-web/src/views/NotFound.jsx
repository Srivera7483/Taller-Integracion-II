import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import {
  FiHome,
  FiArrowLeft,
  FiCompass,
  FiBox,
  FiTool,
  FiHelpCircle
} from 'react-icons/fi';

/**
 * TAL-169: Vista corporativa de Error 404 (Página No Encontrada)
 * Captura rutas inexistentes en React Router y provee navegación de rescate
 * hacia el Panel de Control y módulos principales del sistema.
 */
const NotFound = () => {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <div className="min-h-screen bg-linear-to-b from-slate-50 via-gray-50 to-slate-100 flex flex-col justify-between p-4 sm:p-6 lg:p-8">
      {/* Cabecera mínima con identidad institucional */}
      <header className="max-w-5xl mx-auto w-full flex items-center justify-between py-4">
        <Link to="/dashboard" className="flex items-center gap-3 group">
          <div className="w-10 h-10 rounded-xl bg-primary text-white flex items-center justify-center font-bold text-lg shadow-md group-hover:bg-primary-hover transition">
            SG
          </div>
          <div>
            <h1 className="text-sm font-bold text-gray-900 tracking-tight leading-none">
              Gestión de Mantenimiento
            </h1>
            <p className="text-[11px] text-gray-500 font-medium">UCT — Infraestructura TI</p>
          </div>
        </Link>
        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
          Código HTTP 404
        </span>
      </header>

      {/* Contenido Central */}
      <main className="max-w-3xl mx-auto w-full my-auto text-center py-8">
        {/* Insignia visual 404 */}
        <div className="relative inline-flex items-center justify-center mb-6">
          <span className="text-8xl sm:text-9xl font-black text-slate-200 tracking-tighter select-none">
            404
          </span>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl bg-secondary text-white flex items-center justify-center shadow-xl shadow-secondary/20 rotate-3 transition-transform hover:rotate-0">
              <FiCompass className="w-8 h-8 sm:w-10 sm:h-10 animate-pulse" />
            </div>
          </div>
        </div>

        <h2 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">
          Página no encontrada
        </h2>
        <p className="text-sm sm:text-base text-gray-600 mt-2 max-w-lg mx-auto">
          La ruta a la que intentas acceder no existe, ha sido reubicada o el enlace ingresado es incorrecto.
        </p>

        {/* Ruta solicitada */}
        <div className="mt-4 inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-white border border-gray-200 shadow-2xs text-xs text-gray-500 max-w-md truncate">
          <span className="font-semibold text-gray-700">Ruta consultada:</span>
          <code className="text-primary font-mono bg-primary-50 px-1.5 py-0.5 rounded-lg text-[11px]">
            {location.pathname}
          </code>
        </div>

        {/* Acciones principales */}
        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            to="/dashboard"
            id="btn-404-inicio"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3 rounded-lg bg-primary hover:bg-primary-hover text-white font-bold text-sm transition shadow-md hover:shadow-lg hover:-translate-y-0.5 cursor-pointer min-h-[44px]"
          >
            <FiHome className="w-4 h-4" />
            <span>Volver al Inicio</span>
          </Link>

          <button
            type="button"
            onClick={() => navigate(-1)}
            id="btn-404-volver"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3 rounded-lg bg-white border border-gray-300 text-gray-700 font-semibold text-sm hover:bg-gray-50 hover:text-gray-900 transition shadow-2xs cursor-pointer min-h-[44px]"
          >
            <FiArrowLeft className="w-4 h-4" />
            <span>Regresar a la página anterior</span>
          </button>
        </div>

        {/* Tarjetas de rescate / Navegación rápida */}
        <div className="mt-12 pt-8 border-t border-gray-200">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">
            Accesos directos recomendados
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-left">
            <Link
              to="/incidencias"
              className="p-3.5 rounded-xl bg-white border border-gray-200 hover:border-primary-400 hover:shadow-sm transition group"
            >
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-primary-50 text-primary group-hover:bg-primary group-hover:text-white transition">
                  <FiTool className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-gray-900">Incidencias</h3>
                  <p className="text-[11px] text-gray-500">Catálogo de órdenes</p>
                </div>
              </div>
            </Link>

            <Link
              to="/inventario"
              className="p-3.5 rounded-xl bg-white border border-gray-200 hover:border-primary-400 hover:shadow-sm transition group"
            >
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-primary-50 text-primary group-hover:bg-primary group-hover:text-white transition">
                  <FiBox className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-gray-900">Inventario</h3>
                  <p className="text-[11px] text-gray-500">Activos y equipos TI</p>
                </div>
              </div>
            </Link>

            <Link
              to="/mantenimientos"
              className="p-3.5 rounded-xl bg-white border border-gray-200 hover:border-emerald-400 hover:shadow-sm transition group"
            >
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white transition">
                  <FiHelpCircle className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-gray-900">Mantenimientos</h3>
                  <p className="text-[11px] text-gray-500">Agenda preventiva</p>
                </div>
              </div>
            </Link>
          </div>
        </div>
      </main>

      {/* Pie institucional */}
      <footer className="max-w-5xl mx-auto w-full text-center py-4 text-xs text-gray-400">
        Sistema de Gestión de Mantenimiento e Incidencias TI &copy; {new Date().getFullYear()} Universidad Católica de Temuco.
      </footer>
    </div>
  );
};

export default NotFound;
