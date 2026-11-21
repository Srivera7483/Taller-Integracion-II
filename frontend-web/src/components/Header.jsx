import React from 'react';
import { FiMenu } from 'react-icons/fi';
import NotificacionesDropdown from './NotificacionesDropdown';
import NetworkStatusIndicator from './NetworkStatusIndicator';

/**
 * TAL-190: Componente Header principal del sistema con campana de notificaciones interactiva,
 * contador en tiempo real vía WebSocket y badge con animación de rebote.
 *
 * @param {Object} props
 * @param {() => void} [props.onOpenMobileMenu] - Callback para desplegar menú móvil lateral
 * @param {string|React.ReactNode} [props.title] - Título dinámico de la vista actual
 * @param {Array} [props.notificacionesIniciales] - Alertas iniciales para pruebas o sobrescritura
 * @param {React.ReactNode} [props.children] - Elementos adicionales a inyectar en la barra superior
 */
export const Header = ({
  onOpenMobileMenu,
  title,
  notificacionesIniciales,
  children,
}) => {
  return (
    <header
      className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 sm:px-6 z-30"
      data-testid="main-header"
    >
      <div className="flex items-center gap-3">
        {onOpenMobileMenu && (
          <button
            type="button"
            className="lg:hidden text-gray-600 hover:text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-lg p-1"
            onClick={onOpenMobileMenu}
            aria-label="Abrir menú de navegación"
            title="Abrir menú de navegación"
          >
            <FiMenu className="w-6 h-6" />
          </button>
        )}
        {title && (
          <h1 className="text-lg font-bold text-gray-900 tracking-tight truncate">
            {title}
          </h1>
        )}
      </div>

      <div className="flex items-center gap-3">
        {children}
        <NetworkStatusIndicator />
        <NotificacionesDropdown initialNotifications={notificacionesIniciales} />
      </div>
    </header>
  );
};

export { NotificacionesDropdown };
export default Header;
