import React, { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { FiPlus } from 'react-icons/fi';
import ModalNuevaIncidenciaMobile from './ModalNuevaIncidenciaMobile';
import { hasPermission } from '../services/authService';

/**
 * TAL-172: Floating Action Button (FAB) estilo Material Design para dispositivos móviles.
 * 
 * Criterios de Aceptación:
 * 1. El FAB no interfiere con el scroll natural del usuario:
 *    - Posicionamiento fijo flotante en la esquina inferior derecha (bottom-6 right-6).
 *    - Sin contenedores transparentes expansivos (solo el círculo captura eventos táctiles).
 *    - La vista principal tiene espaciado inferior (pb-24 en móviles) para no tapar contenido final.
 * 2. Dispone de un ícono claro:
 *    - Ícono de "Más" (+) de trazo visible y contrastado según lineamientos de Material Design.
 * 3. Al pulsarlo:
 *    - Despliega rápidamente el modal simplificado de "Nueva Incidencia" adaptado a celulares.
 */
const FabNuevaIncidencia = () => {
  const location = useLocation();
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Si el usuario ya está en la vista completa de creación de incidencias, ocultar el FAB
  const isEnVistaCreacion =
    location.pathname.startsWith('/incidencias/nueva') ||
    location.pathname.startsWith('/incidencias/reportar');

  if (isEnVistaCreacion) {
    return null;
  }

  if (!hasPermission('incidencias:crear')) {
    return null;
  }

  return (
    <>
      {/* Contenedor del botón flotante para móviles (lg:hidden) */}
      <div
        className="fixed bottom-6 right-6 z-40 lg:hidden pointer-events-none select-none"
        aria-live="polite"
      >
        <button
          type="button"
          id="btn-fab-nueva-incidencia"
          onClick={() => setIsModalOpen(true)}
          className="pointer-events-auto w-14 h-14 rounded-full bg-primary hover:bg-primary-hover active:bg-primary-active text-white shadow-lg shadow-primary/35 hover:shadow-xl active:shadow-md flex items-center justify-center transition-all duration-200 transform active:scale-95 focus:outline-none focus:ring-4 focus:ring-primary/30 cursor-pointer"
          title="Crear nueva incidencia"
          aria-label="Crear nueva incidencia"
        >
          <FiPlus className="w-7 h-7 stroke-[2.5] text-white" aria-hidden="true" />
        </button>
      </div>

      {/* Modal con formulario simplificado adaptado a celulares */}
      <ModalNuevaIncidenciaMobile
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </>
  );
};

export default FabNuevaIncidencia;
