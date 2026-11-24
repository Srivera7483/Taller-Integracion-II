import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import {
  TOAST_AUTO_DISMISS_MS,
  TOAST_ACTION_LABEL,
  isToastSoundEnabled,
  setToastSoundEnabled,
  reproducirSonidoDiscreto,
} from '../utils/realtimeToastAlerts';

const ToastContext = createContext();

export const ToastProvider = ({ children }) => {
  const [message, setMessage] = useState('');
  const [type, setType] = useState('info'); // 'success', 'error', 'info', 'warning', 'critical'
  const [title, setTitle] = useState('');
  const [actionLabel, setActionLabel] = useState('');
  const [actionUrl, setActionUrl] = useState('');
  const [meta, setMeta] = useState(null);
  const [isVisible, setIsVisible] = useState(false);
  const [duration, setDuration] = useState(TOAST_AUTO_DISMISS_MS);
  const [soundEnabled, setSoundEnabled] = useState(() => isToastSoundEnabled());

  const timerRef = useRef(null);
  const soundEnabledRef = useRef(soundEnabled);

  useEffect(() => {
    soundEnabledRef.current = soundEnabled;
  }, [soundEnabled]);

  const limpiarTemporizador = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const hideToast = useCallback(() => {
    limpiarTemporizador();
    setIsVisible(false);
  }, [limpiarTemporizador]);

  const toggleSound = useCallback((explicitValue) => {
    setSoundEnabled((prev) => {
      const next = typeof explicitValue === 'boolean' ? explicitValue : !prev;
      setToastSoundEnabled(next);
      soundEnabledRef.current = next;
      return next;
    });
  }, []);

  const showToast = useCallback(
    (newMessageOrConfig, newType = 'info', options = {}) => {
      limpiarTemporizador();

      const esObjetoConfig =
        newMessageOrConfig !== null &&
        typeof newMessageOrConfig === 'object' &&
        !React.isValidElement(newMessageOrConfig);

      const config = esObjetoConfig
        ? newMessageOrConfig
        : {
            message: newMessageOrConfig,
            type: newType,
            ...options,
          };

      const finalMessage = config.message || config.mensaje || '';
      const finalType = config.type || config.tipo || 'info';
      const finalTitle = config.title || config.titulo || '';
      const finalActionUrl = config.actionUrl || config.rutaDestino || '';
      const finalActionLabel =
        config.actionLabel || (finalActionUrl ? TOAST_ACTION_LABEL : '');
      const finalDuration =
        typeof config.duration === 'number' && config.duration > 0
          ? config.duration
          : TOAST_AUTO_DISMISS_MS;

      setMessage(finalMessage);
      setType(finalType);
      setTitle(finalTitle);
      setActionLabel(finalActionLabel);
      setActionUrl(finalActionUrl);
      setDuration(finalDuration);
      setMeta({
        idOrden: config.idOrden || config.id_orden || null,
        idIncidencia: config.idIncidencia || config.id_incidencia || null,
        prioridad: config.prioridad || null,
        motivo: config.motivo || null,
      });
      setIsVisible(true);

      const debeSonar =
        config.playSound === true ||
        config.sound === true ||
        finalType === 'critical';

      if (debeSonar && soundEnabledRef.current) {
        reproducirSonidoDiscreto({ enabled: true });
      }

      timerRef.current = setTimeout(() => {
        setIsVisible(false);
        timerRef.current = null;
      }, finalDuration);
    },
    [limpiarTemporizador],
  );

  useEffect(() => {
    return () => {
      limpiarTemporizador();
    };
  }, [limpiarTemporizador]);

  return (
    <ToastContext.Provider
      value={{
        message,
        type,
        title,
        actionLabel,
        actionUrl,
        meta,
        duration,
        isVisible,
        soundEnabled,
        showToast,
        hideToast,
        closeToast: hideToast,
        toggleSound,
      }}
    >
      {children}
    </ToastContext.Provider>
  );
};

// oxlint-disable-next-line react/only-export-components
export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast debe ser usado dentro de un ToastProvider');
  }
  return context;
};
