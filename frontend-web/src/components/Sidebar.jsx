import React from 'react';
import { NavLink } from 'react-router-dom';
import { FiHome, FiAlertCircle, FiBox, FiLayers } from 'react-icons/fi';

const Sidebar = () => {
  const navItems = [
    { path: '/dashboard', label: 'Dashboard', icon: FiHome },
    { path: '/incidencias', label: 'Incidencias', icon: FiAlertCircle },
    { path: '/inventario', label: 'Inventario', icon: FiBox },
  ];

  return (
    <aside className="w-16 md:w-64 bg-white border-r border-gray-200 flex flex-col flex-shrink-0 transition-[width] duration-200">
      {/* Brand Header */}
      <div className="h-16 flex items-center justify-center md:justify-start px-3 md:px-6 border-b border-gray-200">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-sm flex-shrink-0">
            <FiLayers className="w-5 h-5" />
          </div>
          <div className="hidden md:flex flex-col">
            <span className="text-base font-bold text-gray-900 leading-tight">InfraManager</span>
            <span className="text-[11px] font-medium text-blue-600 uppercase tracking-wider">Gestión TI</span>
          </div>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 overflow-y-auto py-4 px-2 md:px-3">
        <div className="hidden md:block px-3 pb-2 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
          Menú Principal
        </div>
        <ul className="space-y-1">
          {navItems.map((item) => (
            <li key={item.path}>
              <NavLink
                to={item.path}
                title={item.label}
                className={({ isActive }) =>
                  `flex items-center justify-center md:justify-start gap-3 px-3 py-2.5 rounded-lg font-medium transition-all ${
                    isActive
                      ? 'bg-blue-50 text-blue-700 shadow-xs'
                      : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                  }`
                }
              >
                <item.icon className="w-5 h-5 flex-shrink-0" />
                <span className="hidden md:inline text-sm">{item.label}</span>
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      {/* Sidebar Footer Info (Estático) */}
      <div className="p-3 border-t border-gray-200 hidden md:block">
        <div className="p-3 bg-gray-50 rounded-lg border border-gray-100 text-xs text-gray-500">
          <p className="font-semibold text-gray-700">Taller Integración II</p>
          <p className="text-[11px] text-gray-400 mt-0.5">UCT - 2026</p>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
