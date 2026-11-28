import { useEffect, useRef } from 'react';

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'area[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(', ');

/**
 * TAL-204 (WCAG 2.1 AA): Hook reutilizable para modales accesibles (W3C APG Dialog Pattern).
 * - Atrapa el foco con Tab / Shift+Tab dentro del contenedor del modal.
 * - Cierra con la tecla Escape (si está habilitado).
 * - Mueve el foco inicial al abrir y lo restaura al elemento disparador al cerrar.
 */
export function useFocusTrap(isActive, { onClose, closeOnEscape = true } = {}) {
  const containerRef = useRef(null);
  const previousFocusRef = useRef(null);

  useEffect(() => {
    if (!isActive || typeof document === 'undefined') return undefined;

    previousFocusRef.current = document.activeElement;
    const container = containerRef.current;

    const getFocusableElements = () => {
      if (!container) return [];
      return Array.from(container.querySelectorAll(FOCUSABLE_SELECTOR)).filter(
        (el) => !el.hasAttribute('disabled') && el.offsetParent !== null
      );
    };

    // Enfocar el primer control interactivo del diálogo
    const rafId = window.requestAnimationFrame(() => {
      const focusables = getFocusableElements();
      if (focusables.length > 0) {
        focusables[0].focus();
      } else if (container) {
        container.focus();
      }
    });

    const handleKeyDown = (event) => {
      if (event.key === 'Escape' && closeOnEscape && typeof onClose === 'function') {
        event.preventDefault();
        onClose();
        return;
      }

      if (event.key !== 'Tab' || !container) return;

      const focusables = getFocusableElements();
      if (focusables.length === 0) {
        event.preventDefault();
        return;
      }

      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const active = document.activeElement;

      if (event.shiftKey) {
        if (active === first || !container.contains(active)) {
          event.preventDefault();
          last.focus();
        }
      } else if (active === last || !container.contains(active)) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      window.cancelAnimationFrame(rafId);
      document.removeEventListener('keydown', handleKeyDown);
      const prev = previousFocusRef.current;
      if (prev && typeof prev.focus === 'function' && document.contains(prev)) {
        prev.focus();
      }
    };
  }, [isActive, onClose, closeOnEscape]);

  return containerRef;
}

export default useFocusTrap;
