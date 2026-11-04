import React, { useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { FiHome, FiAlertCircle, FiBox, FiMenu, FiLogOut, FiUsers, FiX, FiActivity, FiCalendar, FiUser } from 'react-icons/fi';
import NotificacionesDropdown from './NotificacionesDropdown';
import CriticalAlertBanner from './CriticalAlertBanner';
import FabNuevaIncidencia from './FabNuevaIncidencia';

const Layout = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Obtener la información del usuario autenticado desde localStorage
  const obtenerUsuarioActual = () => {
    try {
      const usuarioStr = localStorage.getItem('usuario');
      if (!usuarioStr) return null;
      return JSON.parse(usuarioStr);
    } catch {
      return null;
    }
  };

  const usuario = obtenerUsuarioActual();
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

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('usuario');
    navigate('/login');
  };

  // Definición completa de las opciones del menú
  const allNavItems = [
    { path: '/dashboard', label: 'Dashboard', icon: FiHome },
    { path: '/incidencias', label: 'Incidencias', icon: FiAlertCircle },
    { path: '/inventario', label: 'Inventario', icon: FiBox, allowedRoles: ['ADMINISTRADOR']},
    { path: '/mantenimientos', label: 'Mantenimientos', icon: FiCalendar, allowedRoles: ['ADMINISTRADOR','SUPERVISOR','TECNICO','TÉCNICO'] },
    { path: '/trazabilidad', label: 'Trazabilidad', icon: FiActivity },
    { path: '/usuarios', label: 'Usuarios', icon: FiUsers, allowedRoles: ['ADMINISTRADOR'] },
  ];

  // Filtrar los elementos según el rol actual del usuario
  const navItems = allNavItems.filter((item) => {
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
        {/* Top bar */}
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 sm:px-6 z-30">
          <div className="flex items-center gap-3">
            <button
              type="button"
              className="lg:hidden text-gray-600 hover:text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-lg p-1"
              onClick={() => setIsMobileMenuOpen(true)}
              aria-label="Abrir menú de navegación"
            >
              <FiMenu className="w-6 h-6" />
            </button>
            <h1 className="text-lg font-bold text-gray-900 tracking-tight truncate">
              {getPageTitle()}
            </h1>
          </div>

          <div className="flex items-center gap-3">
            <NotificacionesDropdown />
          </div>
        </header>

        {/* Critical Alert Banner if needed */}
        <CriticalAlertBanner />

        {/* Main View Area */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 bg-gray-50">
          <Outlet />
        </main>
      </div>

      {/* Floating Action Button for New Incidents */}
      <FabNuevaIncidencia />
    </div>
  );
};

export default Layout;
