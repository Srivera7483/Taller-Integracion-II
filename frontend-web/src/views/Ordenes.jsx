import React from 'react';
import Incidencias from './Incidencias';
import { useWebSocket } from '../hooks/useWebSocket';

/**
 * TAL-187: Vista de Órdenes de Trabajo conectada en tiempo real mediante useWebSocket.
 * Sincroniza los eventos `incidencia_actualizada` y `nueva_incidencia` con la bandeja operativa.
 */
const Ordenes = (props) => {
  const { ultimoEvento } = useWebSocket(
    {
      onIncidenciaActualizada: props?.onIncidenciaActualizada,
      onNuevaIncidencia: props?.onNuevaIncidencia,
    },
    { autoConnect: Boolean(props?.standaloneWs), salas: ['incidencias', 'coordinadores'] },
  );

  return <Incidencias {...props} ultimoEventoWs={ultimoEvento} />;
};

export default Ordenes;
