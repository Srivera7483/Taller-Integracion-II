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

// Pila global de trampas activas para soportar modales anidados sin doble cierre por Escape
const activeTraps = [];

/**
 * TAL-204 (WCAG 2.1 AA): Hook reutilizable para modales accesibles (W3C APG Dialog Pattern).
 * - Atrapa el foco con Tab / Shift+Tab dentro del contenedor del modal activo superior.
 * - Cierra con la tecla Escape (si está habilitado) sin propagar a modales padres.
 * - Mueve el foco inicial solo al abrir (`[isActive]`) para no robar el foco al escribir en inputs,
 *   y restaura el foco al elemento disparador al cerrar.
 */
export function useFocusTrap(isActive, { onClose, closeOnEscape = true } = {}) {
  const containerRef = useRef(null);
  const previousFocusRef = useRef(null);
  const onCloseRef = useRef(onClose);
  const closeOnEscapeRef = useRef(closeOnEscape);

  useEffect(() => {
    onCloseRef.current = onClose;
    closeOnEscapeRef.current = closeOnEscape;
  }, [onClose, closeOnEscape]);

  useEffect(() => {
    if (!isActive || typeof document === 'undefined') return undefined;

    const trapToken = Symbol('focus-trap');
    activeTraps.push(trapToken);
    previousFocusRef.current = document.activeElement;

    const getFocusableElements = () => {
      const container = containerRef.current;
      if (!container) return [];
      return Array.from(container.querySelectorAll(FOCUSABLE_SELECTOR)).filter(
        (el) =>
          !el.hasAttribute('disabled') &&
          (el.offsetParent !== null ||
            (typeof el.getClientRects === 'function' && el.getClientRects().length > 0))
      );
    };

    // Enfocar el primer control interactivo únicamente cuando el diálogo pasa a estar abierto
    const rafId = window.requestAnimationFrame(() => {
      const container = containerRef.current;
      const focusables = getFocusableElements();
      if (focusables.length > 0) {
        focusables[0].focus();
      } else if (container) {
        container.focus();
      }
    });

    const handleKeyDown = (event) => {
      // Si hay un submodal apilado encima, delegar el manejo de teclado al modal superior
      if (activeTraps[activeTraps.length - 1] !== trapToken) return;

      if (
        event.key === 'Escape' &&
        closeOnEscapeRef.current &&
        typeof onCloseRef.current === 'function'
      ) {
        event.preventDefault();
        event.stopPropagation();
        onCloseRef.current();
        return;
      }

      const container = containerRef.current;
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
      const idx = activeTraps.lastIndexOf(trapToken);
      if (idx !== -1) activeTraps.splice(idx, 1);

      const prev = previousFocusRef.current;
      if (prev && typeof prev.focus === 'function' && document.contains(prev)) {
        prev.focus();
      }
    };
  }, [isActive]);

  return containerRef;
}

export default useFocusTrap;
