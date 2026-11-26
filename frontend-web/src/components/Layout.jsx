import React, { useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { FiHome, FiAlertCircle, FiBox, FiLogOut, FiUsers, FiX, FiActivity, FiCalendar, FiUser, FiDownload, FiRefreshCw } from 'react-icons/fi';
import Header from './Header';
import CriticalAlertBanner from './CriticalAlertBanner';
import FabNuevaIncidencia from './FabNuevaIncidencia';
import ColaPendientesModal from './ColaPendientesModal';
import { useColaSincronizacion } from '../hooks/useColaSincronizacion';
import { cerrarSesion, getUsuarioActual, hasPermission } from '../services/authService';

const Layout = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [estaAbiertoModalCola, setEstaAbiertoModalCola] = useState(false);
  const controladorCola = useColaSincronizacion();
  const { cantidadPendientes, estaSincronizando } = controladorCola;

  const usuario = getUsuarioActual();
  const rolUsuario = usuario?.rol?.nombre_rol || usuario?.rol || null;
  const nombreUsuario = usuario ? `${usuario.nombre || ''} ${usuario.apellido || ''}`.trim() || usuario.correo : 'Usuario';

  const getPageTitle = () => {
    if (location.pathname.startsWith('/incidencias/nueva') || location.pathname.startsWith('/incidencias/reportar')) {
      return 'Reportar Incidencia';
    }
    if (location.pathname.startsWith('/incidencias/asignar')) {
      return 'Asignar Técnico';
    }
    if (location.pathname === '/mantenimientos') {
      return 'Agenda de Mantenimientos';
    }
    if (location.pathname.startsWith('/mantenimientos')) {
      return 'Planificación de Mantenimiento Preventivo';
    }
    if (location.pathname.includes('/trazabilidad')) {
      return 'Trazabilidad y Ciclo de Vida del Activo';
    }
    switch (location.pathname) {
      case '/dashboard': return 'Dashboard';
      case '/incidencias': return 'Incidencias';
      case '/inventario': return 'Inventario';
      case '/mantenimientos': return 'Agenda de Mantenimientos';
      case '/trazabilidad': return 'Trazabilidad de Activos';
      case '/usuarios': return 'Usuarios';
      default: return 'Sistema de Gestión';
    }
  };

  const handleLogout = async () => {
  await cerrarSesion();
  navigate('/login', { replace: true });
  };

  // Definición completa de las opciones del menú
  const allNavItems = [
    { path: '/dashboard', label: 'Dashboard', icon: FiHome },
    { path: '/incidencias', label: 'Incidencias', icon: FiAlertCircle },
    { path: '/inventario', label: 'Inventario', icon: FiBox, allowedRoles: ['ADMINISTRADOR']},
    { path: '/mantenimientos', label: 'Mantenimientos', icon: FiCalendar, requiredPermission: 'mantenimientos:crear' },
    { path: '/trazabilidad', label: 'Trazabilidad', icon: FiActivity },
    { path: '/usuarios', label: 'Usuarios', icon: FiUsers, allowedRoles: ['ADMINISTRADOR'] },
  ];

  // Filtrar los elementos según el rol actual del usuario
  const navItems = allNavItems.filter((item) => {
    if (item.requiredPermission) {
      return hasPermission(item.requiredPermission);
    }
    if (item.allowedRoles) {
      return item.allowedRoles.includes(rolUsuario);
    }
    return true;
  });

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden text-gray-900">
      {/* Mobile Overlay */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-gray-900/50 lg:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-gray-200 flex flex-col flex-shrink-0 transform transition-transform duration-300 ease-in-out lg:static lg:translate-x-0
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="h-16 flex items-center justify-between px-5 border-b border-gray-200">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-primary text-white flex items-center justify-center font-black text-xs shadow-sm ring-1 ring-primary/20">
              UCT
            </div>
            <div className="flex flex-col">
              <span className="text-base font-bold text-gray-900 tracking-tight leading-none">
                Infra<span className="text-primary font-black">Manager</span>
              </span>
              <span className="text-[10px] text-gray-500 font-medium">Infraestructura TI</span>
            </div>
          </div>
          <button 
            type="button"
            className="lg:hidden text-gray-500 hover:text-gray-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring rounded-lg p-1"
            onClick={() => setIsMobileMenuOpen(false)}
            aria-label="Cerrar menú de navegación"
            title="Cerrar menú de navegación"
          >
            <FiX className="w-6 h-6" aria-hidden="true" />
          </button>
        </div>

        <nav aria-label="Navegación principal" className="flex-1 overflow-y-auto py-4 px-3">
          <ul className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <li key={item.path}>
                  <NavLink
                    to={item.path}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={({ isActive }) => `
                      flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all
                      ${isActive 
                        ? 'bg-primary text-white shadow-md shadow-primary/25' 
                        : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                      }
                    `}
                  >
                    <Icon className="w-5 h-5 flex-shrink-0" />
                    <span>{item.label}</span>
                  </NavLink>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* User Session Footer / Datos de usuario real */}
        <div className="p-4 border-t border-gray-200 bg-gray-50/50 space-y-3">
          <div className="flex items-center gap-3 p-2 bg-white rounded-xl border border-gray-200 shadow-2xs">
            <div className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold text-sm">
              <FiUser className="w-5 h-5 text-primary" />
            </div>
            <div className="flex flex-col min-w-0 flex-1">
              <span className="text-xs font-bold text-gray-900 truncate">
                {nombreUsuario}
              </span>
              <span className="text-[10px] font-semibold text-primary uppercase tracking-wider truncate">
                {rolUsuario || 'USUARIO'}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              setIsMobileMenuOpen(false);
              setEstaAbiertoModalCola(true);
            }}
            data-testid="boton-cola-sincronizacion-sidebar"
            className="w-full flex items-center justify-between p-2.5 bg-white rounded-xl border border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition-all text-left cursor-pointer group shadow-2xs"
            title="Ver cola de sincronización offline"
            aria-label={`Ver cola de sincronización offline. ${cantidadPendientes} pendientes.`}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div
                className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs flex-shrink-0 transition-colors ${
                  estaSincronizando || cantidadPendientes > 0
                    ? 'bg-amber-50 text-amber-700 group-hover:bg-amber-100'
                    : 'bg-emerald-50 text-emerald-600 group-hover:bg-emerald-100'
                }`}
              >
                <FiRefreshCw
                  className={`w-4 h-4 ${estaSincronizando ? 'animate-spin' : ''}`}
                  aria-hidden="true"
                />
              </div>
              <div className="min-w-0 flex-1">
                <span className="text-xs font-semibold text-gray-800 truncate block">
                  {cantidadPendientes === 0
                    ? 'Todo Sincronizado'
                    : `${cantidadPendientes} pendiente${cantidadPendientes === 1 ? '' : 's'}`}
                </span>
              </div>
            </div>

            {cantidadPendientes > 0 ? (
              <span
                data-testid="badge-cola-sidebar"
                className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 text-[11px] font-black rounded-full bg-amber-500 text-white shadow-2xs"
              >
                {cantidadPendientes > 99 ? '99+' : cantidadPendientes}
              </span>
            ) : (
              <span className="w-2 h-2 rounded-full bg-emerald-500 mr-1" title="Sincronizado" />
            )}
          </button>

          <button
            type="button"
            onClick={() => window.dispatchEvent(new CustomEvent('pwa-install-trigger'))}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 text-xs font-semibold text-primary bg-primary-50 hover:bg-primary-100 rounded-xl transition-colors cursor-pointer border border-primary-200"
            title="Instalar InfraManager en pantalla de inicio"
          >
            <FiDownload className="w-4 h-4" />
            <span>Instalar App</span>
          </button>

          <button
            type="button"
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 text-xs font-bold text-red-600 bg-red-50 hover:bg-red-100 rounded-xl transition-colors cursor-pointer border border-red-200"
          >
            <FiLogOut className="w-4 h-4" />
            <span>Cerrar Sesión</span>
          </button>
        </div>
      </aside>

      {/* Main Content Wrapper */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top bar (TAL-190 + TAL-198) */}
        <Header
          title={getPageTitle()}
          onOpenMobileMenu={() => setIsMobileMenuOpen(true)}
        >
          {/* Acceso a la Cola de Sincronización con Badge Numérico en Header (TAL-198 Criterio 1) */}
          <button
            type="button"
            onClick={() => setEstaAbiertoModalCola(true)}
            data-testid="boton-cola-sincronizacion-header"
            className="relative p-2 rounded-xl text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            title={`Cola de sincronización: ${cantidadPendientes} ${cantidadPendientes === 1 ? 'pendiente' : 'pendientes'}`}
            aria-label={`Abrir cola de sincronización offline. ${cantidadPendientes} ítems pendientes.`}
          >
            <FiRefreshCw
              className={`w-5 h-5 ${estaSincronizando ? 'animate-spin text-primary' : ''}`}
              aria-hidden="true"
            />
            {cantidadPendientes > 0 && (
              <span
                data-testid="badge-cola-header"
                className="absolute -top-1 -right-1 flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-black text-white bg-amber-500 rounded-full ring-2 ring-white shadow-xs"
              >
                {cantidadPendientes > 99 ? '99+' : cantidadPendientes}
              </span>
            )}
          </button>
        </Header>

        {/* Critical Alert Banner if needed */}
        <CriticalAlertBanner />

        {/* Main View Area */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 bg-gray-50">
          <Outlet />
        </main>
      </div>

      {/* Floating Action Button for New Incidents */}
      <FabNuevaIncidencia />

      {/* Modal de Cola de Cambios Pendientes (TAL-198) */}
      <ColaPendientesModal
        estaAbierto={estaAbiertoModalCola}
        alCerrar={() => setEstaAbiertoModalCola(false)}
        controladorColaExterno={controladorCola}
      />
    </div>
  );
};

export default Layout;