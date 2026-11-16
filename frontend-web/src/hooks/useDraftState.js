import { useEffect, useState } from 'react';

/**
 * TAL-188: Borradores locales de formularios.
 * Persisten los campos en localStorage para que no se pierdan cuando el interceptor
 * redirige temporalmente a la pantalla de mantenimiento (Kill Switch activo).
 */
const DRAFT_PREFIX = 'draft:';

const keyOf = (formId, field) => `${DRAFT_PREFIX}${formId}:${field}`;

const leer = (key) => {
  try {
    const raw = localStorage.getItem(key);
    return raw === null ? undefined : JSON.parse(raw);
  } catch {
    return undefined;
  }
};

/**
 * Elimina todos los borradores de un formulario (usar tras un envío exitoso).
 */
export const clearDrafts = (formId) => {
  try {
    const prefix = `${DRAFT_PREFIX}${formId}:`;
    Object.keys(localStorage)
      .filter((k) => k.startsWith(prefix))
      .forEach((k) => localStorage.removeItem(k));
  } catch {
    // almacenamiento no disponible
  }
};

/**
 * Igual que useState, pero restaura y guarda el valor en localStorage.
 * Si preferInitial es true y initial tiene valor (p. ej. viene de la URL), prevalece initial.
 */
export const useDraftState = (formId, field, initial, { preferInitial = false } = {}) => {
  const key = keyOf(formId, field);

  const [value, setValue] = useState(() => {
    if (preferInitial && initial) return initial;
    const stored = leer(key);
    return stored === undefined ? initial : stored;
  });

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // almacenamiento no disponible
    }
  }, [key, value]);

  return [value, setValue];
};
