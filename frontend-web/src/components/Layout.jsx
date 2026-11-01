import React, { useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { FiHome, FiAlertCircle, FiBox, FiMenu, FiLogOut, FiUsers, FiX, FiActivity, FiCalendar } from 'react-icons/fi';
import SelectorTecnicoSesion from './SelectorTecnicoSesion';
import NotificacionesDropdown from './NotificacionesDropdown';
import CriticalAlertBanner from './CriticalAlertBanner';

const Layout = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

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

  const navItems = [
    { path: '/dashboard', label: 'Dashboard', icon: FiHome },
    { path: '/incidencias', label: 'Incidencias', icon: FiAlertCircle },
    { path: '/inventario', label: 'Inventario', icon: FiBox },
    { path: '/mantenimientos', label: 'Mantenimientos', icon: FiCalendar },
    { path: '/trazabilidad', label: 'Trazabilidad', icon: FiActivity },
    { path: '/usuarios', label: 'Usuarios', icon: FiUsers },
  ];

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
            className="lg:hidden text-gray-500 hover:text-gray-700"
            onClick={() => setIsMobileMenuOpen(false)}
            aria-label="Cerrar menú de navegación"
            title="Cerrar menú de navegación"
          >
            <FiX className="w-6 h-6" aria-hidden="true" />
          </button>
        </div>
        <nav className="flex-1 overflow-y-auto py-4">
          <ul className="space-y-1 px-3">
            {navItems.map((item) => {
              const isItemActive =
                location.pathname === item.path ||
                (item.path !== '/dashboard' && location.pathname.startsWith(item.path));

              return (
                <li key={item.path}>
                  <NavLink
                    to={item.path}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={`flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm transition-all ${isItemActive
                        ? 'bg-primary-50 text-primary font-semibold shadow-2xs border-l-4 border-primary'
                        : 'text-gray-600 hover:bg-gray-100/70 hover:text-gray-900 font-medium'
                      }`}
                  >
                    <item.icon className="w-5 h-5" />
                    {item.label}
                  </NavLink>
                </li>
              );
            })}
          </ul>
        </nav>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden w-full">
        {/* Topbar */}
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 sm:px-6 flex-shrink-0">
          <div className="flex items-center gap-3 sm:gap-4">
            <button 
              type="button"
              className="lg:hidden text-gray-500 hover:text-gray-700 p-1"
              onClick={() => setIsMobileMenuOpen(true)}
              aria-label="Abrir menú de navegación"
              title="Abrir menú de navegación"
            >
              <FiMenu className="w-6 h-6" aria-hidden="true" />
            </button>
            <h2 className="text-lg sm:text-xl font-semibold text-gray-800 truncate">{getPageTitle()}</h2>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <NotificacionesDropdown />
            <SelectorTecnicoSesion />
            <button
              type="button"
              onClick={handleLogout}
              className="flex items-center gap-1.5 text-gray-600 hover:text-red-600 transition-colors p-1.5 rounded-lg hover:bg-gray-50 cursor-pointer"
              title="Cerrar sesión"
              aria-label="Salir - Cerrar sesión"
            >
              <FiLogOut className="w-5 h-5" aria-hidden="true" />
              <span className="hidden md:inline text-xs font-medium">Salir</span>
            </button>
          </div>
        </header>

        {/* TAL-122: Alertas Visuales (Mantenimientos Próximos) */}
        <CriticalAlertBanner />

        {/* Dynamic Outlet */}
        <main className="flex-1 overflow-x-hidden overflow-y-auto p-4 sm:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default Layout;
