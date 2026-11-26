/* oxlint-disable react/only-export-components */
import React, { useEffect, useRef } from 'react';
import { FiWifiOff, FiClock, FiCheck, FiX, FiInfo } from 'react-icons/fi';

/**
 * Constantes y Enums del componente (Reglas SonarQube: Evitar Magic Strings y Números Mágicos)
 */
export const KEY_ESCAPE = 'Escape';
export const FOCUS_DELAY_MS = 50;

export const ACTION_TYPES = {
  ORDEN: 'orden',
  REPORTE: 'reporte',
  GENERIC: 'generic',
};

export const DEFAULT_OFFLINE_MESSAGE =
  'Estás trabajando sin conexión. Tu orden/reporte se guardará localmente y se enviará de forma automática al recuperar la señal.';

export const ACTION_CONFIG = {
  [ACTION_TYPES.ORDEN]: {
    badge: 'Orden de Trabajo',
    title: 'Guardar Orden Sin Conexión',
    entityLabel: 'Tu orden',
    message: 'Estás trabajando sin conexión. Tu orden se guardará localmente y se enviará de forma automática al recuperar la señal.',
    detail: 'El diagnóstico técnico, horas y materiales quedarán almacenados en la cola local de este equipo.',
    confirmText: 'Guardar y Encolar Orden',
    iconDescription: 'Alerta sin conexión para técnicos',
  },
  [ACTION_TYPES.REPORTE]: {
    badge: 'Reporte de Incidencia',
    title: 'Guardar Reporte Sin Conexión',
    entityLabel: 'Tu reporte',
    message: 'Estás trabajando sin conexión. Tu reporte se guardará localmente y se enviará de forma automática al recuperar la señal.',
    detail: 'La información del activo, descripción y evidencias fotográficas quedarán protegidas localmente.',
    confirmText: 'Guardar y Encolar Reporte',
    iconDescription: 'Alerta sin conexión para reportantes',
  },
  [ACTION_TYPES.GENERIC]: {
    badge: 'Sincronización Diferida',
    title: 'Trabajar Sin Conexión',
    entityLabel: 'Tu orden/reporte',
    message: DEFAULT_OFFLINE_MESSAGE,
    detail: 'Los cambios se mantendrán a salvo en el almacenamiento local y se sincronizarán al restablecer la red.',
    confirmText: 'Confirmar y Encolar',
    iconDescription: 'Alerta sin conexión general',
  },
};

/**
 * Micro-componente reutilizable para el encabezado e ícono del modal
 */
const ModalHeader = ({ config, onClose, isSubmitting }) => (
  <div className="p-5 pb-4 flex items-start gap-4 border-b border-gray-100 dark:border-slate-800">
    <div
      className="w-11 h-11 rounded-xl bg-amber-500/15 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center flex-shrink-0 border border-amber-500/30"
      aria-label={config.iconDescription}
    >
      <FiWifiOff className="w-5 h-5 animate-pulse" aria-hidden="true" />
    </div>

    <div className="flex-1 min-w-0">
      <div className="flex items-center gap-2">
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold tracking-wide bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-300/60 dark:border-amber-700/50">
          <FiClock className="w-3 h-3" aria-hidden="true" /> {config.badge}
        </span>
      </div>
      <h2
        id="offline-action-modal-title"
        className="text-lg font-bold text-gray-900 dark:text-white mt-1.5 leading-snug"
      >
        {config.title}
      </h2>
    </div>

    <button
      type="button"
      onClick={onClose}
      disabled={isSubmitting}
      data-testid="offline-modal-close-icon-btn"
      aria-label="Cerrar modal de advertencia"
      className="text-gray-400 hover:text-gray-600 dark:hover:text-slate-200 p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors disabled:opacity-50 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
    >
      <FiX className="w-5 h-5" aria-hidden="true" />
    </button>
  </div>
);

/**
 * Micro-componente reutilizable para las acciones inferiores
 */
const ModalFooter = ({
  onCancel,
  onConfirm,
  confirmButtonRef,
  isSubmitting,
  confirmText,
  cancelText,
}) => (
  <div className="p-4 sm:p-5 bg-gray-50/90 dark:bg-slate-800/50 border-t border-gray-100 dark:border-slate-800 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2.5 sm:gap-3">
    <button
      type="button"
      onClick={onCancel}
      disabled={isSubmitting}
      data-testid="offline-modal-cancel-btn"
      className="w-full sm:w-auto px-4 py-2.5 rounded-lg border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-700 dark:text-slate-200 hover:bg-gray-50 dark:hover:bg-slate-750 text-sm font-semibold transition-colors disabled:opacity-50 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary min-h-[44px]"
    >
      {cancelText}
    </button>

    <button
      ref={confirmButtonRef}
      type="button"
      onClick={onConfirm}
      disabled={isSubmitting}
      data-testid="offline-modal-confirm-btn"
      className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-primary hover:bg-primary-hover dark:bg-primary-600 dark:hover:bg-primary-500 text-white text-sm font-bold shadow-md hover:shadow-lg transition-all disabled:opacity-50 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary min-h-[44px]"
    >
      {isSubmitting ? (
        <>
          <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" aria-hidden="true" />
          <span>Encolando...</span>
        </>
      ) : (
        <>
          <FiCheck className="w-4 h-4" aria-hidden="true" />
          <span>{confirmText}</span>
        </>
      )}
    </button>
  </div>
);

/**
 * TAL-183: Modal Informativo y Alerta de Sincronización Diferida
 *
 * Cumplimiento de Criterios de Aceptación:
 * 1. Diseño coherente con el sistema de diseño oscuro/claro institucional (UCT - azul y ámbar).
 * 2. Cierre accesible mediante teclado (Escape) y click exterior en el backdrop.
 * 3. Mensajes claros contextualizados para técnicos y reportantes.
 */
const OfflineActionModal = ({
  isOpen,
  onConfirm,
  onCancel,
  actionType = ACTION_TYPES.GENERIC,
  customMessage,
  cancelText = 'Seguir editando',
  confirmText,
  isSubmitting = false,
}) => {
  const confirmButtonRef = useRef(null);

  // Criterio 2: Cierre accesible mediante teclado (Escape)
  useEffect(() => {
    if (!isOpen) return undefined;

    const handleKeyDown = (event) => {
      if (event.key === KEY_ESCAPE && !isSubmitting) {
        onCancel();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isSubmitting, onCancel]);

  // Criterio 2: Bloqueo de scroll y gestión accesible de foco
  useEffect(() => {
    if (!isOpen) return undefined;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const timerId = setTimeout(() => {
      confirmButtonRef.current?.focus();
    }, FOCUS_DELAY_MS);

    return () => {
      document.body.style.overflow = previousOverflow;
      clearTimeout(timerId);
    };
  }, [isOpen]);

  if (!isOpen) return null;

  // Criterio 3: Resolución de textos y configuraciones claras
  const normalizedType = ACTION_CONFIG[actionType] ? actionType : ACTION_TYPES.GENERIC;
  const config = ACTION_CONFIG[normalizedType];
  const mensajePrincipal = customMessage || config.message;
  const textoBotonConfirmar = confirmText || config.confirmText;

  // Criterio 2: Cierre accesible mediante click exterior (Backdrop)
  const handleBackdropClick = (event) => {
    if (event.target === event.currentTarget && !isSubmitting) {
      onCancel();
    }
  };

  return (
    <div
      data-testid="offline-action-modal-backdrop"
      className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 animate-in fade-in duration-200"
      onClick={handleBackdropClick}
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="offline-action-modal-title"
      aria-describedby="offline-action-modal-description"
    >
      <div
        data-testid="offline-action-modal-container"
        className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl shadow-2xl max-w-md w-full overflow-hidden transform transition-all animate-in zoom-in-95 duration-200 text-gray-900 dark:text-slate-100 flex flex-col"
      >
        {/* Cabecera institucional */}
        <ModalHeader
          config={config}
          onClose={onCancel}
          isSubmitting={isSubmitting}
        />

        {/* Cuerpo informativo orientado a técnicos y reportantes */}
        <div className="p-5 space-y-3.5 text-sm">
          <p
            id="offline-action-modal-description"
            className="text-gray-700 dark:text-slate-200 leading-relaxed font-normal"
          >
            {mensajePrincipal}
          </p>

          <div className="p-3.5 rounded-lg bg-gray-50 dark:bg-slate-800/60 border border-gray-200/80 dark:border-slate-700/60 flex items-start gap-2.5 text-xs text-gray-600 dark:text-slate-400">
            <FiInfo className="w-4 h-4 text-primary-600 dark:text-primary-400 flex-shrink-0 mt-0.5" aria-hidden="true" />
            <span className="leading-relaxed">{config.detail}</span>
          </div>

          {/* Criterio 3 / Consistencia: Mensaje institucional literal de sincronización */}
          <div className="text-[11px] text-gray-400 dark:text-slate-500 italic">
            {DEFAULT_OFFLINE_MESSAGE}
          </div>
        </div>

        {/* Pie de acciones del modal */}
        <ModalFooter
          onCancel={onCancel}
          onConfirm={onConfirm}
          confirmButtonRef={confirmButtonRef}
          isSubmitting={isSubmitting}
          confirmText={textoBotonConfirmar}
          cancelText={cancelText}
        />
      </div>
    </div>
  );
};

export default OfflineActionModal;
