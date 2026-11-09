import React, { useState, useEffect } from 'react';
import { FiDownload, FiX, FiShare } from 'react-icons/fi';

/**
 * TAL-170: Componente para sugerir y gestionar la instalación de la PWA
 * en navegadores móviles (Android Chrome, iOS Safari) y de escritorio.
 */
const PWAInstallPrompt = () => {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isIOS] = useState(() => {
    if (typeof window === 'undefined') return false;
    const userAgent = window.navigator?.userAgent || '';
    return /iPhone|iPad|iPod/i.test(userAgent) && !window.MSStream;
  });
  const [isInstalled, setIsInstalled] = useState(() => {
    if (typeof window === 'undefined') return false;
    return Boolean(
      window.matchMedia('(display-mode: standalone)').matches ||
      window.navigator.standalone === true ||
      document.referrer.includes('android-app://')
    );
  });

  useEffect(() => {
    if (isInstalled) {
      return;
    }

    // Comprobar si el usuario ya descartó el banner en esta sesión
    const wasDismissed = sessionStorage.getItem('pwa_prompt_dismissed') === 'true';

    // Si es iOS y no ha sido descartado en la sesión, sugerir tras 3 segundos
    if (isIOS && !wasDismissed) {
      const timer = setTimeout(() => {
        setShowPrompt(true);
      }, 3000);
      return () => clearTimeout(timer);
    }

    // 4. Capturar evento nativo `beforeinstallprompt` (Android Chrome, Edge, Chromium)
    const handleBeforeInstallPrompt = (event) => {
      // Prevenir el infobar automático por defecto para controlar la presentación
      event.preventDefault();
      setDeferredPrompt(event);

      if (!wasDismissed) {
        setShowPrompt(true);
      }
    };

    // 5. Escuchar evento de instalación completada
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setShowPrompt(false);
      setDeferredPrompt(null);
      sessionStorage.setItem('pwa_prompt_dismissed', 'true');
    };

    // Escuchar trigger manual desde otras partes de la UI
    const handleManualTrigger = () => {
      setShowPrompt(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);
    window.addEventListener('pwa-install-trigger', handleManualTrigger);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
      window.removeEventListener('pwa-install-trigger', handleManualTrigger);
    };
  }, [isIOS, isInstalled]);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    // Mostrar el prompt nativo del navegador
    deferredPrompt.prompt();

    // Esperar la respuesta del usuario (aceptada o cancelada)
    const choiceResult = await deferredPrompt.userChoice;

    if (choiceResult.outcome === 'accepted') {
      setIsInstalled(true);
      setShowPrompt(false);
    }

    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    sessionStorage.setItem('pwa_prompt_dismissed', 'true');
  };

  if (!showPrompt || isInstalled) {
    return null;
  }

  return (
    <aside
      role="banner"
      aria-label="Sugerencia de instalación de la aplicación móvil"
      className="fixed bottom-4 left-4 right-4 md:left-auto md:right-6 md:w-96 z-50 bg-white border border-primary/20 rounded-2xl shadow-xl p-4 transition-all duration-300 ease-in-out animate-in fade-in slide-in-from-bottom-5"
    >
      <div className="flex items-start gap-3">
        {/* Ícono de la App */}
        <div className="w-12 h-12 rounded-xl bg-primary text-white flex-shrink-0 flex items-center justify-center font-bold text-sm shadow-md ring-2 ring-primary/20 overflow-hidden">
          <img
            src="/pwa-192x192.png"
            alt="InfraManager"
            className="w-full h-full object-cover"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
            }}
          />
        </div>

        {/* Textos informativos */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-gray-900 leading-tight">
              Instalar InfraManager
            </h2>
            <button
              type="button"
              onClick={handleDismiss}
              className="text-gray-400 hover:text-gray-600 p-1 rounded-lg focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
              aria-label="Cerrar sugerencia de instalación"
            >
              <FiX className="w-4 h-4" />
            </button>
          </div>
          <p className="text-xs text-gray-600 mt-0.5">
            Agrega la app a tu pantalla de inicio para una experiencia nativa sin barra de navegación.
          </p>

          {/* Guía para iOS Safari */}
          {isIOS ? (
            <div className="mt-3 bg-primary-50 text-primary-900 rounded-xl p-2.5 text-xs flex items-center gap-2 border border-primary-100">
              <FiShare className="w-4 h-4 flex-shrink-0 text-primary" />
              <span>
                Pulsa <strong className="font-semibold">Compartir</strong> y luego{' '}
                <strong className="font-semibold">"Agregar a la pantalla de inicio"</strong>.
              </span>
            </div>
          ) : (
            /* Botones de acción para Android/Chromium */
            <div className="mt-3 flex items-center gap-2">
              <button
                type="button"
                id="btn-pwa-install"
                onClick={handleInstallClick}
                className="flex-1 bg-primary hover:bg-primary-hover active:bg-primary-active text-white text-xs font-semibold py-2 px-3 rounded-xl flex items-center justify-center gap-1.5 shadow-sm transition-colors focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 focus-visible:outline-none"
              >
                <FiDownload className="w-3.5 h-3.5" />
                Instalar App
              </button>
              <button
                type="button"
                onClick={handleDismiss}
                className="text-xs text-gray-500 hover:text-gray-700 py-2 px-2.5 rounded-xl hover:bg-gray-100 transition-colors"
              >
                Ahora no
              </button>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
};

export default PWAInstallPrompt;
