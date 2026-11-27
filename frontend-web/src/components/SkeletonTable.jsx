import React from 'react';
import SkeletonCard from './SkeletonCard';

/**
 * Componente SkeletonTable: Representación estructural de tablas con brillo pulsante
 * en Tailwind CSS. Permite conservar la cuadrícula, espaciado de celdas y alineación
 * visual exacta de los datos definitivos, evitando el Cumulative Layout Shift (CLS).
 *
 * @param {Object} propiedades
 * @param {number} [propiedades.filas=5] - Cantidad de filas esqueleto a renderizar.
 * @param {number|string[]} [propiedades.columnas=5] - Cantidad de columnas o arreglo de anchos.
 * @param {boolean} [propiedades.soloFilas=false] - Si es true, retorna únicamente elementos <tr> para incrustar dentro de un <tbody> preexistente.
 * @param {'tabla'|'tarjetas'} [propiedades.modo='tabla'] - Modalidad de despliegue (tabla o tarjetas móviles).
 * @param {boolean} [propiedades.mostrarCabecera=true] - Determina si se renderiza el encabezado <thead> en modo contenedor completo.
 * @param {string[]} [propiedades.cabeceras=[]] - Etiquetas o títulos de columnas opcionales para el encabezado.
 * @param {string} [propiedades.claseContenedor=''] - Clases Tailwind adicionales aplicadas al contenedor.
 */
const SkeletonTable = ({
  filas = 5,
  columnas = 5,
  soloFilas = false,
  modo = 'tabla',
  mostrarCabecera = true,
  cabeceras = [],
  claseContenedor = '',
}) => {
  const listaFilas = Array.from({ length: filas }, (_, indiceFila) => indiceFila);
  const cantidadColumnas = Array.isArray(columnas) ? columnas.length : columnas;
  const listaColumnas = Array.from({ length: cantidadColumnas }, (_, indiceColumna) => indiceColumna);

  // Renderizado para vista responsiva móvil en formato de tarjetas apiladas
  if (modo === 'tarjetas') {
    return (
      <div className={`space-y-3 ${claseContenedor}`}>
        <SkeletonCard cantidad={filas} tipo="item-movil" />
      </div>
    );
  }

  // Generador de contenido representativo por celda para imitar la variedad visual de datos reales
  const renderizarCeldaEsqueleto = (indiceColumna) => {
    if (indiceColumna === 0) {
      return (
        <div className="space-y-1.5 py-1">
          <div className="h-4 w-40 rounded bg-gray-200 skeleton-shimmer animate-pulse" />
          <div className="h-3 w-24 rounded bg-gray-200/70 skeleton-shimmer animate-pulse" />
        </div>
      );
    }

    if (indiceColumna === 1) {
      return (
        <div className="space-y-1.5 py-1">
          <div className="h-3.5 w-28 rounded bg-gray-200 skeleton-shimmer animate-pulse" />
          <div className="h-3 w-20 rounded bg-gray-200/70 skeleton-shimmer animate-pulse" />
        </div>
      );
    }

    if (indiceColumna === cantidadColumnas - 2) {
      return (
        <div className="h-6 w-24 rounded-full bg-gray-200 skeleton-shimmer animate-pulse" />
      );
    }

    if (indiceColumna === cantidadColumnas - 1) {
      return (
        <div className="flex justify-end gap-2">
          <div className="h-8 w-24 rounded-lg bg-gray-200 skeleton-shimmer animate-pulse" />
        </div>
      );
    }

    return (
      <div className="h-3.5 w-28 rounded bg-gray-200 skeleton-shimmer animate-pulse" />
    );
  };

  const elementosFilas = (
    <>
      {listaFilas.map((indiceFila) => (
        <tr
          key={indiceFila}
          className="border-b border-gray-100 last:border-b-0 hover:bg-gray-50/40 transition-colors"
        >
          {listaColumnas.map((indiceColumna) => (
            <td
              key={indiceColumna}
              className="px-6 py-4 whitespace-nowrap text-sm text-gray-700"
            >
              {renderizarCeldaEsqueleto(indiceColumna)}
            </td>
          ))}
        </tr>
      ))}
    </>
  );

  if (soloFilas) {
    return elementosFilas;
  }

  return (
    <div
      role="status"
      aria-label="Cargando tabla de datos..."
      className={`w-full bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden ${claseContenedor}`}
    >
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm text-gray-600">
          {mostrarCabecera && (
            <thead className="bg-gray-50/80 text-gray-500 uppercase text-xs border-b border-gray-200">
              <tr>
                {listaColumnas.map((indiceColumna) => {
                  const textoCabecera = cabeceras[indiceColumna];
                  return (
                    <th
                      key={indiceColumna}
                      className={`px-6 py-3.5 font-semibold ${
                        indiceColumna === cantidadColumnas - 1 ? 'text-right' : ''
                      }`}
                    >
                      {textoCabecera ? (
                        <span>{textoCabecera}</span>
                      ) : (
                        <div className="h-3.5 w-20 rounded bg-gray-200/80 skeleton-shimmer animate-pulse" />
                      )}
                    </th>
                  );
                })}
              </tr>
            </thead>
          )}
          <tbody className="divide-y divide-gray-200 bg-white">
            {elementosFilas}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default SkeletonTable;
