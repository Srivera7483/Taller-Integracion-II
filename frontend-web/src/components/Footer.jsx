import React from 'react';

const Footer = () => {
  return (
    <footer className="bg-white border-t border-gray-200 px-4 sm:px-6 py-3.5 flex-shrink-0 z-10">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-gray-500">
        <div className="flex items-center gap-2 text-center sm:text-left">
          <span>&copy; 2026 <strong>InfraManager</strong>. Todos los derechos reservados.</span>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="text-gray-600 font-medium">Sistema Activo</span>
          </div>
          <span className="text-gray-300">|</span>
          <span className="text-gray-400 font-mono">v1.0.0</span>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
