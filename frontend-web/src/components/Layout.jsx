import React, { useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { FiHome, FiAlertCircle, FiBox, FiMenu, FiLogOut, FiUsers, FiX, FiActivity, FiCalendar } from 'react-icons/fi';
import SelectorTecnicoSesion from './SelectorTecnicoSesion';
import NotificacionesDropdown from './NotificacionesDropdown';
import CriticalAlertBanner from './CriticalAlertBanner';
import FabNuevaIncidencia from './FabNuevaIncidencia';

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
            className="lg:hidden text-gray-500 hover:text-gray-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring rounded-lg p-1"
            onClick={() => setIsMobileMenuOpen(false)}
            aria-label="Cerrar menú de navegación"
            title="Cerrar menú de navegación"
          >
            <FiX className="w-6 h-6" aria-hidden="true" />
          </button>
        </div>
        <nav aria-label="Navegación principal" className="flex-1 overflow-y-auto py-4">
          <ul className="space-y