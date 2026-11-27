import React from 'react';

/**
 * Componente SkeletonCard: Marcador de posición visual con silueta predecible
 * y animación de brillo pulsante en Tailwind CSS para tarjetas de métricas
 * y tarjetas de vistas móviles.
 *
 * @param {Object} propiedades
 * @param {number} [propiedades.cantidad=1] - Cantidad de tarjetas esqueleto a renderizar.
 * @param {'metrica'|'item-movil'} [propiedades.tipo='metrica'] - Tipo visual de tarjeta.
 * @param {string} [propiedades.claseAdicional=''] - Clases Tailwind opcionales para el contenedor.
 */
const SkeletonCard = ({
  cantidad = 1,
  tipo = 'metrica',
  claseAdicional = '',
}) => {
  const elementos = Array.from({ length: cantidad }, (_, indice) => indice);

  if (tipo === 'item-movil') {
    return (
      <>
        {elementos.map((indice) => (
          <div
            key={indice}
            role="status"
            aria-label="Cargando tarjeta informativa..."
            className={`bg-white rounded-xl p-4 border border-gray-200 shadow-2xs space-y-3 ${claseAdicional}`}
          >
            {/* Cabecera superior: Título e indicador de estado */}
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1.5 flex-1">
                <div className="h-4 w-3/5 rounded bg-gray-200 skeleton-shimmer animate-pulse" />
                <div className="h-3 w-1/3 rounded bg-gray-200/80 skeleton-shimmer animate-pulse" />
              </div>
              <div className="h-6 w-20 rounded-full bg-gray-200 skeleton-shimmer animate-pulse flex-shrink-0" />
            </div>

            {/* Cuadrícula de detalles intermedios */}
            <div className="grid grid-cols-2 gap-2 bg-gray-50/80 p-2.5 rounded-lg border border-gray-100">
              <div className="space-y-1">
                <div className="h-2.5 w-12 rounded bg-gray-200 skeleton-shimmer animate-pulse" />
                <div className="h-3.5 w-24 rounded bg-gray-200 skeleton-shimmer animate-pulse" />
              </div>
              <div className="space-y-1">
                <div className="h-2.5 w-12 rounded bg-gray-200 skeleton-shimmer animate-pulse" />
                <div className="h-3.5 w-24 rounded bg-gray-200 skeleton-shimmer animate-pulse" />
              </div>
            </div>

            {/* Barra inferior de acciones */}
            <div className="pt-1 flex gap-2">
              <div className="h-8 flex-1 rounded-lg bg-gray-200 skeleton-shimmer animate-pulse" />
              <div className="h-8 flex-1 rounded-lg bg-gray-200 skeleton-shimmer animate-pulse" />
            </div>
          </div>
        ))}
      </>
    );
  }

  // Tipo predeterminado: 'metrica' (Indicadores del Dashboard y Mantenimientos)
  return (
    <>
      {elementos.map((indice) => (
        <div
          key={indice}
          role="status"
          aria-label="Cargando métrica..."
          className={`bg-white rounded-xl shadow-sm border border-gray-200 p-6 flex items-center justify-between ${claseAdicional}`}
        >
          {/* Bloque de texto descriptivo y valor numérico */}
          <div className="space-y-2 flex-1">
            <div className="h-3.5 w-32 rounded bg-gray-200 skeleton-shimmer animate-pulse" />
            <div className="h-8 w-20 rounded bg-gray-200 skeleton-shimmer animate-pulse" />
          </div>

          {/* Bloque contenedor del ícono temático */}
          <div className="w-12 h-12 rounded-lg bg-gray-100 skeleton-shimmer animate-pulse flex-shrink-0 ml-4" />
        </div>
      ))}
    </>
  );
};

export default SkeletonCard;
