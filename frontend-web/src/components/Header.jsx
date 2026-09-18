import React from 'react';
import { useLocation } from 'react-router-dom';
import { FiBell, FiUser } from 'react-icons/fi';

const Header = ({ title }) => {
  const location = useLocation();

  const getPageTitle = () => {
    if (title) return title;
    switch (location.pathname) {
      case '/dashboard':
        return 'Dashboard';
      case '/incidencias':
        return 'Incidencias';
      case '/inventario':
        return 'Inventario';
      default:
        return 'Sistema de Gestión';
    }
  };

  return (
    <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 sm:px-6 flex-shrink-0 z-10">
      {/* Titulo de la vista / seccion */}
      <div className="flex items-center gap-3 min-w-0">
        <h1 className="text-lg sm:text-xl font-bold text-gray-800 truncate">
          {getPageTitle()}
        </h1>
      </div>

      {/* Zona de usuario y acciones estáticas */}
      <div className="flex items-center gap-3 sm:gap-4 flex-shrink-0">
        {/* Notificaciones, la campanita arriba header */}
        <button type="button" aria-label="Notificaciones" className="relative p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
          <FiBell className="w-5 h-5" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-blue-600 rounded-full ring-2 ring-white"></span>
        </button>

        {/* Separador vertical */}
        <div className="h-6 w-px bg-gray-200 hidden sm:block"></div>

        {/* Perfil de usuario */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-sm shadow-sm ring-2 ring-blue-100">
            <FiUser className="w-4 h-4" />
          </div>
          <div className="hidden md:flex flex-col text-left">
            <span className="text-sm font-semibold text-gray-800 leading-tight">Admin 01</span>
            <span className="text-xs text-gray-500 leading-tight">Administrador</span>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
