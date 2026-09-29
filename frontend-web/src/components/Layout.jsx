import React, { useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { FiHome, FiAlertCircle, FiBox, FiMenu, FiLogOut, FiUsers, FiX, FiActivity } from 'react-icons/fi';

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
    if (location.pathname.includes('/trazabilidad')) {
      return 'Trazabilidad y Ciclo de Vida del Activo';
    }
    switch (location.pathname) {
      case '/dashboard': return 'Dashboard';
      case '/incidencias': return 'Incidencias';
      case '/inventario': return 'Inventario';
      case '/trazabilidad': return 'Trazabilidad de Activos';
      case '/usuarios': return 'Usuarios';
      default: return 'Sistema de Gestión';
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token'); 
    navigate('/login');
  };

  const navItems = [
    { path: '/dashboard', label: 'Dashboard', icon: FiHome },
    { path: '/incidencias', label: 'Incidencias', icon: FiAlertCircle },
    { path: '/inventario', label: 'Inventario', icon: FiBox },
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
        <div className="h-16 flex items-center justify-between px-6 border-b border-gray-200">
          <h1 className="text-lg font-bold text-blue-600">InfraManager</h1>
          <button 
            className="lg:hidden text-gray-500 hover:text-gray-700"
            onClick={() => setIsMobileMenuOpen(false)}
          >
            <FiX className="w-6 h-6" />
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
                    className={`flex items-center gap-3 px-3 py-2 rounded-md transition-colors ${isItemActive
                        ? 'bg-blue-50 text-blue-700 font-medium'
                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
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
              className="lg:hidden text-gray-500 hover:text-gray-700 p-1"
              onClick={() => setIsMobileMenuOpen(true)}
            >
              <FiMenu className="w-6 h-6" />
            </button>
            <h2 className="text-lg sm:text-xl font-semibold text-gray-800 truncate">{getPageTitle()}</h2>
          </div>
          <div className="flex items-center gap-3 sm:gap-4">
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 text-gray-500 hover:text-red-600 transition-colors"
              title="Cerrar sesión"
            >
              <FiLogOut className="w-5 h-5" />
              <span className="hidden sm:inline text-sm font-medium">Salir</span>
            </button>
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold border border-blue-200 text-sm sm:text-base">
              U
            </div>
          </div>
        </header>

        {/* Dynamic Outlet */}
        <main className="flex-1 overflow-x-hidden overflow-y-auto p-4 sm:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default Layout;
