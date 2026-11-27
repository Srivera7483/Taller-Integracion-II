import React, { Suspense, lazy, useState, useEffect } from 'react';
import { useToast } from '../context/ToastContext';

const PWAInstallBanner = lazy(() => import('./PWAInstallBanner'));

/**
 * TAL-197: Componente contenedor que orquesta la lógica y el ciclo de vida de instalación PWA.
 * Gestiona la captura del evento beforeinstallprompt, la persistencia de descarte de 7 días
 * en localStorage y delega la presentación visual a PWAInstallBanner.
 */
const CLAVE_EXPIRACION_BANNER = 'pwa_banner_dismissed_until';
const DURACION_DESCARTE_MILISEGUNDOS = 7 * 24 * 60 * 60 * 1000;

const verificarDescarteVigente = () => {
  if (typeof window === 'undefined' || !window.localStorage) {
    return false;
  }
  const timestampGuardado = window.localStorage.getItem(CLAVE_EXPIRACION_BANNER);
  if (!timestampGuardado) {
    return false;
  }
  const tiempoExpiracion = parseInt(timestampGuardado, 10);
  if (Number.isNaN(tiempoExpiracion)) {
    return false;
  }
  // Si la fecha actual aún no alcanza la expiración, el descarte continúa vigente
  if (Date.now() < tiempoExpiracion) {
    return true;
  }
  // Si expiraron los 7 días, se remueve la clave para permitir nueva sugerencia
  window.localStorage.removeItem(CLAVE_EXPIRACION_BANNER);
  return false;
};

const PWAInstallPrompt = () => {
  const { showToast } = useToast();
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

    const descarteVigente = verificarDescarteVigente();

    // En iOS Safari la sugerencia se muestra tras breve espera si no está pospuesta
    if (isIOS && !descarteVigente) {
      const temporizadorIOS = setTimeout(() => {
        setShowPrompt(true);
      }, 3000);
      return () => clearTimeout(temporizadorIOS);
    }

    // Capturar el evento nativo del navegador antes de que muestre el mini-infobar automático
    const handleBeforeInstallPrompt = (evento) => {
      evento.preventDefault();
      setDeferredPrompt(evento);

      if (!verificarDescarteVigente()) {
        setShowPrompt(true);
      }
    };

    // Actualizar estado cuando el usuario culmina exitosamente la instalación
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setShowPrompt(false);
      setDeferredPrompt(null);
      window.localStorage.removeItem(CLAVE_EXPIRACION_BANNER);
    };

    // Permitir apertura bajo demanda desde la barra de navegación lateral
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
    if (!deferredPrompt) {
      showToast(
        'Para instalar InfraManager en este dispositivo, usa el ícono de instalación en la barra de direcciones del navegador.',
        'info',
      );
      setShowPrompt(false);
      return;
    }

    deferredPrompt.prompt();

    const resultadoEleccion = await deferredPrompt.userChoice;

    if (resultadoEleccion.outcome === 'accepted') {
      setIsInstalled(true);
      setShowPrompt(false);
      window.localStorage.removeItem(CLAVE_EXPIRACION_BANNER);
    }

    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    const tiempoExpiracion = Date.now() + DURACION_DESCARTE_MILISEGUNDOS;
    window.localStorage.setItem(CLAVE_EXPIRACION_BANNER, tiempoExpiracion.toString());
  };

  if (!showPrompt || isInstalled) {
    return null;
  }

  return (
    <Suspense fallback={null}>
      <PWAInstallBanner
        onInstall={handleInstallClick}
        onDismiss={handleDismiss}
        isIOS={isIOS}
      />
    </Suspense>
  );
};

export default PWAInstallPrompt;
