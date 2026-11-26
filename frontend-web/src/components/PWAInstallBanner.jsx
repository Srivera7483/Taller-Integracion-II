import React from 'react';
import { FiDownload, FiX, FiShare } from 'react-icons/fi';

/**
 * TAL-197: Componente visual presentacional para invitar y guiar la instalación de la PWA.
 * Desacoplado de la lógica del ciclo de vida para garantizar reusabilidad y adherencia
 * al patrón Container/Presentational.
 */
const PWAInstallBanner = ({ onInstall, onDismiss, isIOS }) => {
  return (
    <aside
      role="banner"
      aria-label="Sugerencia de instalación de la aplicación PWA"
      className="fixed bottom-4 left-4 right-4 md:left-auto md:right-6 md:w-96 z-50 bg-white border border-primary/20 rounded-2xl shadow-xl p-4 transition-all duration-300 ease-in-out animate-in fade-in slide-in-from-bottom-5"
    >
      <div className="flex items-start gap-3">
        {/* Ícono de la App */}
        <div className="w-12 h-12 rounded-xl bg-primary text-white flex-shrink-0 flex items-center justify-center font-bold text-sm shadow-md ring-2 ring-primary/20 overflow-hidden">
          <img
            src="/pwa-192x192.png"
            alt="InfraManager"
            width={48}
            height={48}
            decoding="async"
            className="w-full h-full object-cover"
            onError={(errorEvent) => {
              errorEvent.currentTarget.style.display = 'none';
            }}
          />
        </div>

        {/* Textos informativos y beneficios */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-gray-900 leading-tight">
              Instalar InfraManager
            </h2>
            <button
              type="button"
              onClick={onDismiss}
              className="text-gray-400 hover:text-gray-600 p-1 rounded-lg focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
              aria-label="Cerrar sugerencia de instalación"
            >
              <FiX className="w-4 h-4" />
            </button>
          </div>
          <p className="text-xs text-gray-600 mt-0.5">
            Acceso más rápido y sin conexión a internet. Descarga nuestra App ahora.
          </p>

          {/* Guía específica para iOS Safari donde la instalación requiere flujo manual */}
          {isIOS ? (
            <div className="mt-3 bg-primary-50 text-primary-900 rounded-xl p-2.5 text-xs flex items-center gap-2 border border-primary-100">
              <FiShare className="w-4 h-4 flex-shrink-0 text-primary" />
              <span>
                Pulsa <strong className="font-semibold">Compartir</strong> y luego{' '}
                <strong className="font-semibold">"Agregar a la pantalla de inicio"</strong>.
              </span>
            </div>
          ) : (
            /* Botones de acción directa para navegadores compatibles con Web App Manifest */
            <div className="mt-3 flex items-center gap-2">
              <button
                type="button"
                id="btn-pwa-install"
                onClick={onInstall}
                className="flex-1 bg-primary hover:bg-primary-hover active:bg-primary-active text-white text-xs font-semibold py-2 px-3 rounded-xl flex items-center justify-center gap-1.5 shadow-sm transition-colors focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 focus-visible:outline-none"
              >
                <FiDownload className="w-3.5 h-3.5" />
                Instalar Ahora
              </button>
              <button
                type="button"
                id="btn-pwa-dismiss"
                onClick={onDismiss}
                className="text-xs text-gray-500 hover:text-gray-700 py-2 px-2.5 rounded-xl hover:bg-gray-100 transition-colors"
              >
                Más tarde
              </button>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
};

export default PWAInstallBanner;
