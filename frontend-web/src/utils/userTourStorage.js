/**
 * Módulo de persistencia y estado del recorrido interactivo de usuario (Onboarding Tour).
 * Maneja el almacenamiento local seguro por identidad de usuario para evitar aperturas intrusivas.
 */

/**
 * Obtiene la clave única en localStorage asociada a la sesión del usuario actual
 * para persistir la finalización o salto del recorrido interactivo.
 *
 * @param {Object|null} usuario - Objeto con datos de sesión del usuario
 * @returns {string} Clave de almacenamiento local
 */
export const obtenerClaveStorageTour = (usuario) => {
  const identificador =
    usuario?.id ||
    usuario?.id_usuario ||
    usuario?.rut_o_id ||
    usuario?.correo ||
    usuario?.email ||
    'usuario_general';
  return `inframe_tour_completed_${identificador}`;
};

/**
 * Verifica si el usuario autenticado ya ha completado u omitido el recorrido interactivo.
 *
 * @param {Object|null} usuario - Objeto con datos de sesión del usuario
 * @returns {boolean} Verdadero si ya fue completado previamente
 */
export const haCompletadoRecorrido = (usuario) => {
  if (typeof window === 'undefined' || !window.localStorage) {
    return false;
  }
  const clave = obtenerClaveStorageTour(usuario);
  return window.localStorage.getItem(clave) === 'true';
};

/**
 * Marca en localStorage que el usuario ha finalizado u omitido el recorrido.
 *
 * @param {Object|null} usuario - Objeto con datos de sesión del usuario
 */
export const registrarFinalizacionRecorrido = (usuario) => {
  if (typeof window === 'undefined' || !window.localStorage) {
    return;
  }
  const clave = obtenerClaveStorageTour(usuario);
  window.localStorage.setItem(clave, 'true');
};
