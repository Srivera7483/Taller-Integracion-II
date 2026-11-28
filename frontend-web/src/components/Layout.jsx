import React, { Suspense, lazy, useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { FiHome, FiAlertCircle, FiBox, FiLogOut, FiUsers, FiX, FiActivity, FiCalendar, FiUser, FiDownload, FiRefreshCw, FiHelpCircle, FiShield } from 'react-icons/fi';
import Header from './Header';
import CriticalAlertBanner from './CriticalAlertBanner';
import FabNuevaIncidencia from './FabNuevaIncidencia';
import UserTourGuide from './UserTourGuide';
import { haCompletadoRecorrido } from '../utils/userTourStorage';
import { useColaSincronizacion } from '../hooks/useColaSincronizacion';
import { cerrarSesion, getUsuarioActual, hasPermission } from '../services/authService';
import { PERMISOS_AUDITORIA } from '../services/auditoriaService';

const ColaPendientesModal = lazy(() => import('./ColaPendientesModal'));

const Layout = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [estaAbiertoModalCola, setEstaAbiertoModalCola] = useState(false);
  const [estaAbiertoTour, setEstaAbiertoTour] = useState(false);
  const [claveReinicioTour, setClaveReinicioTour] = useState(0);
  const controladorCola = useColaSincronizacion();
  const { cantidadPendientes, estaSincronizando } = controladorCola;

  const usuario = getUsuarioActual();
  const idUsuarioTour = usuario?.id || usuario?.id_usuario || usuario?.sub || usuario?.correo || usuario?.email || null;
  const rolUsuario = usuario?.rol?.nombre_rol || usuario?.rol || null;
  const nombreUsuario = usuario ? `${usuario.nombre || ''} ${usuario.apellido || ''}`.trim() || usuario.correo : 'Usuario';

  // Activación automática de la Guía Interactiva en el primer inicio de sesión del usuario
  useEffect(() => {
    const sesionActual = getUsuarioActual();
    if (sesionActual && !haCompletadoRecorrido(sesionActual)) {
      setEstaAbiertoTour(true);
    }
  }, [idUsuarioTour]);


  // Identificación visual del rol del usuario autenticado
  const coloresPorRol = {
    ADMINISTRADOR: {
      avatar: 'bg-red-100 text-red-700',
      etiqueta: 'bg-red-50 text-red-700 border-red-200',
    },
    SUPERVISOR: {
      avatar: 'bg-blue-100 text-blue-700',
      etiqueta: 'bg-blue-50 text-blue-700 border-blue-200',
    },
    TECNICO: {
      avatar: 'bg-emerald-100 text-emerald-700',
      etiqueta: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    },
    REPORTANTE: {
      avatar: 'bg-purple-100 text-purple-700',
      etiqueta: 'bg-purple-50 text-purple-700 border-purple-200',
    },
  };

  const rolNormalizado = String(rolUsuario || '')
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase();

  const coloresRol = coloresPorRol[rolNormalizado] || {
    avatar: 'bg-gray-100 text-gray-600',
    etiqueta: 'bg-gray-50 text-gray-600 border-gray-200',
  };


  const getPageTitle = () => {
    if (location.pathname.startsWith('/incidencias/nueva') || location.pathname.startsWith('/incidencias/reportar')) {
      return 'Reportar Incidencia';
    }
    if (location.pathname.startsWith('/incidencias/asignar')) {
      return 'Asignar Técnico';
    }
    if (location.pathname.startsWith('/incidencias/')) {
      return 'Detalle de Incidencia';
    }
    if (location.pathname.startsWith('/ordenes/')) {
      return 'Orden de Trabajo';
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
      case '/auditoria': return 'Bitácora de Auditoría';
      default: return 'Sistema de Gestión';
    }
  };

  const handleLogout = async () => {
    await cerrarSesion();
    navigate('/login', { replace: true });
  };

  // TAL-204: Cerrar menú móvil con tecla Escape
  useEffect(() => {
    if (!isMobileMenuOpen) return undefined;
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setIsMobileMenuOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isMobileMenuOpen]);

  // Definición completa de las opciones del menú (autorización basada en permisos PBAC)
  const allNavItems = [
    { path: '/dashboard', label: 'Dashboard', icon: FiHome, tourId: 'nav-dashboard' },
    { path: '/incidencias', label: 'Incidencias', icon: FiAlertCircle, tourId: 'nav-incidencias' },
    { path: '/inventario', label: 'Inventario', icon: FiBox, requiredPermission: 'activos:gestionar', tourId: 'nav-inventario' },
    { path: '/mantenimientos', label: 'Mantenimientos', icon: FiCalendar, requiredPermission: 'mantenimientos:crear', tourId: 'nav-mantenimientos' },
    { path: '/trazabilidad', label: 'Trazabilidad', icon: FiActivity, tourId: 'nav-trazabilidad' },
    { path: '/usuarios', label: 'Usuarios', icon: FiUsers, requiredPermission: 'usuarios:gestionar', tourId: 'nav-usuarios' },
    { path: '/auditoria', label: 'Auditoría', icon: FiShield, requiredPermission: PERMISOS_AUDITORIA, tourId: 'nav-auditoria' },
  ];

  // Filtrar los elementos según los permisos del usuario autenticado
  const navItems = allNavItems.filter((item) => {
    if (item.requiredPermission) {
      return hasPermission(item.requiredPermission);
    }
    return true;
  });

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden text-gray-900">
      {/* TAL-204 (WCAG 2.4.1): Enlace de salto directo al contenido principal */}
      <a
        href="#contenido-principal"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[100] focus:px-4 focus:py-2 focus:bg-primary focus:text-white focus:rounded-lg focus:text-sm focus:font-semibold focus:shadow-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-primary"
      >
        Saltar al contenido principal
      </a>

      {/* Mobile Overlay */}
      {isMobileMenuOpen && (
        <div
          aria-hidden="true"
          className="fixed inset-0 z-40 bg-gray-900/50 lg:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        id="sidebar-navegacion"
        aria-label="Menú lateral de navegación"
        className={`
          fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-gray-200 flex flex-col flex-shrink-0 transform transition-transform duration-300 ease-in-out lg:static lg:translate-x-0
          ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        <div className="h-16 flex items-center justify-between px-5 border-b border-gray-200">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-primary text-white flex items-center justify-center font-black text-xs shadow-sm ring-1 ring-primary/20">
              UCT
            </div>
            <div className="flex flex-col">
              <span className="text-base font-bold text-gray-900 tracking-tight leading-none">
                Infra<span className="text-primary font-black">Manager</span>
              </span>
              <span className="text-[10px] text-gray-600 font-medium">Infraestructura TI</span>
            </div>
          </div>
          <button 
            type="button"
            className="lg:hidden text-gray-600 hover:text-gray-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-lg p-1 cursor-pointer"
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
                    data-tour={item.tourId}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={({ isActive }) => `
                      flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1
                      ${isActive 
                        ? 'bg-primary text-white shadow-md shadow-primary/25' 
                        : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                      }
                    `}
                  >
                    <Icon className="w-5 h-5 flex-shrink-0" aria-hidden="true" />
                    <span>{item.label}</span>
                  </NavLink>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* User Session Footer / Datos de usuario real */}
        <div className="p-4 border-t border-gray-200 bg-gray-50/50 space-y-3">

          {/* Tarjeta del usuario */}
          <div
            data-tour="tarjeta-usuario"
            className="flex items-center gap-3 p-2 bg-white rounded-xl border border-gray-200 shadow-2xs"
          >
            <div
              className={`w-9 h-9 rounded-lg flex items-center justify-center ${coloresRol.avatar}`}
              aria-hidden="true"
            >
              <FiUser className="w-5 h-5" aria-hidden="true" />
            </div>

            <div className="flex flex-col min-w-0 flex-1 gap-1">
              <span className="text-xs font-bold text-gray-900 truncate">
                {nombreUsuario}
              </span>

              <span
                className={`inline-flex self-start max-w-full px-2 py-0.5 rounded-md border text-[10px] font-bold uppercase tracking-wider truncate ${coloresRol.etiqueta}`}
              >
                {rolUsuario || 'USUARIO'}
              </span>
            </div>
          </div>

          {/* Cola de sincronización offline (TAL-198) */}
          <button
            type="button"
            onClick={() => {
              setIsMobileMenuOpen(false);
              setEstaAbiertoModalCola(true);
            }}
            data-tour="cola-sincronizacion"
            data-testid="boton-cola-sincronizacion-sidebar"
            className="w-full flex items-center justify-between p-2.5 bg-white rounded-xl border border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition-all text-left cursor-pointer group shadow-2xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            title="Ver cola de sincronización offline"
            aria-label={
              cantidadPendientes === 0
                ? 'Todo Sincronizado — Ver cola de sincronización offline'
                : `${cantidadPendientes} pendiente${cantidadPendientes === 1 ? '' : 's'} — Ver cola de sincronización offline`
            }
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div
                className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs flex-shrink-0 transition-colors ${
                  estaSincronizando || cantidadPendientes > 0
                    ? 'bg-amber-50 text-amber-800 group-hover:bg-amber-100'
                    : 'bg-emerald-50 text-emerald-700 group-hover:bg-emerald-100'
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
                className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 text-[11px] font-black rounded-full bg-amber-700 text-white shadow-2xs"
              >
                {cantidadPendientes > 99 ? '99+' : cantidadPendientes}
              </span>
            ) : (
              <span className="w-2 h-2 rounded-full bg-emerald-600 mr-1" aria-hidden="true" />
            )}
          </button>

          {/* Instalar PWA */}
          <button
            type="button"
            onClick={() => window.dispatchEvent(new CustomEvent('pwa-install-trigger'))}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 text-xs font-semibold text-primary bg-primary-50 hover:bg-primary-100 rounded-xl transition-colors cursor-pointer border border-primary-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            title="Instalar InfraManager en pantalla de inicio"
          >
            <FiDownload className="w-4 h-4" aria-hidden="true" />
            <span>Instalar App</span>
          </button>

          {/* Guía Interactiva de Usuario (TAL-206) */}
          <button
            type="button"
            onClick={() => {
              setIsMobileMenuOpen(false);
              setClaveReinicioTour((previo) => previo + 1);
              setEstaAbiertoTour(true);
            }}
            data-testid="boton-ayuda-tour-sidebar"
            className="w-full flex items-center justify-center gap-2 px-4 py-2 text-xs font-semibold text-gray-700 bg-white hover:bg-gray-100 rounded-xl transition-colors cursor-pointer border border-gray-200 shadow-2xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            title="Abrir guía interactiva del sistema"
            aria-label="Abrir guía interactiva de usuario"
          >
            <FiHelpCircle className="w-4 h-4 text-primary" aria-hidden="true" />
            <span>Guía de Usuario</span>
          </button>

          {/* Cerrar sesión */}
          <button
            type="button"
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 text-xs font-bold text-red-700 bg-red-50 hover:bg-red-100 rounded-xl transition-colors cursor-pointer border border-red-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <FiLogOut className="w-4 h-4" aria-hidden="true" />
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
          isMobileMenuOpen={isMobileMenuOpen}
        >
          {/* Botón accesible para Guía Interactiva de Usuario (TAL-206) */}
          <button
            type="button"
            onClick={() => {
              setClaveReinicioTour((previo) => previo + 1);
              setEstaAbiertoTour(true);
            }}
            data-tour="boton-ayuda-tour"
            data-testid="boton-ayuda-tour-header"
            className="p-2 rounded-xl text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            title="Abrir guía interactiva de usuario"
            aria-label="Abrir guía interactiva de usuario"
          >
            <FiHelpCircle className="w-5 h-5 text-gray-600 hover:text-primary transition-colors" aria-hidden="true" />
          </button>

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
                className="absolute -top-1 -right-1 flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-black text-white bg-amber-700 rounded-full ring-2 ring-white shadow-xs"
              >
                {cantidadPendientes > 99 ? '99+' : cantidadPendientes}
              </span>
            )}
          </button>
        </Header>

        {/* Critical Alert Banner if needed */}
        <CriticalAlertBanner />

        {/* Main View Area */}
        <main
          id="contenido-principal"
          tabIndex={-1}
          className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 bg-gray-50 focus:outline-none"
        >
          <Outlet />
        </main>
      </div>

      {/* Floating Action Button for New Incidents */}
      <FabNuevaIncidencia />

      {/* Modal de Cola de Cambios Pendientes (TAL-198 — carga diferida TAL-203) */}
      {estaAbiertoModalCola && (
        <Suspense fallback={null}>
          <ColaPendientesModal
            estaAbierto={estaAbiertoModalCola}
            alCerrar={() => setEstaAbiertoModalCola(false)}
            controladorColaExterno={controladorCola}
          />
        </Suspense>
      )}

      {/* Guía Visual Interactiva de Usuario (TAL-206) */}
      <UserTourGuide
        key={claveReinicioTour}
        estaAbierto={estaAbiertoTour}
        alCerrar={() => {
          setIsMobileMenuOpen(false);
          setEstaAbiertoTour(false);
        }}
        alCambiarEstadoMenuMovil={(abrir) => setIsMobileMenuOpen(abrir)}
      />
    </div>
  );
};

export default Layout;