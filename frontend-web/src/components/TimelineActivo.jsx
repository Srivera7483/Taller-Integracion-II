import React, { useState } from 'react';
import {
  FiAlertTriangle,
  FiTool,
  FiCheckCircle,
  FiPackage,
  FiClock,
  FiChevronDown,
  FiChevronUp,
  FiArrowRight,
  FiCpu
} from 'react-icons/fi';
import StatusBadge from './StatusBadge';

/**
 * Configuración visual por tipo de evento en el ciclo de vida
 * - Fallos: Rojo
 * - Mantenimientos: Azul
 * - Resoluciones: Verde
 * - Adquisición: Púrpura / Índigo
 */
const TIPO_CONFIG = {
  fallo: {
    label: 'Avería / Falla',
    icon: FiAlertTriangle,
    nodeBg: 'bg-rose-600',
    nodeRing: 'ring-rose-100',
    nodeShadow: 'shadow-rose-500/30',
    cardBorder: 'border-rose-200 hover:border-rose-300',
    cardBg: 'bg-gradient-to-br from-white via-rose-50/20 to-white',
    badgeBg: 'bg-rose-100 text-rose-800 border-rose-200',
    accentText: 'text-rose-600',
    pulse: true,
  },
  mantenimiento: {
    label: 'Mantenimiento / Reparación',
    icon: FiTool,
    nodeBg: 'bg-blue-600',
    nodeRing: 'ring-blue-100',
    nodeShadow: 'shadow-blue-500/30',
    cardBorder: 'border-blue-200 hover:border-blue-300',
    cardBg: 'bg-gradient-to-br from-white via-blue-50/20 to-white',
    badgeBg: 'bg-blue-100 text-blue-800 border-blue-200',
    accentText: 'text-blue-600',
    pulse: false,
  },
  resolucion: {
    label: 'Resolución / Cierre',
    icon: FiCheckCircle,
    nodeBg: 'bg-emerald-600',
    nodeRing: 'ring-emerald-100',
    nodeShadow: 'shadow-emerald-500/30',
    cardBorder: 'border-emerald-200 hover:border-emerald-300',
    cardBg: 'bg-gradient-to-br from-white via-emerald-50/20 to-white',
    badgeBg: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    accentText: 'text-emerald-600',
    pulse: false,
  },
  adquisicion: {
    label: 'Alta e Inventario',
    icon: FiPackage,
    nodeBg: 'bg-indigo-600',
    nodeRing: 'ring-indigo-100',
    nodeShadow: 'shadow-indigo-500/30',
    cardBorder: 'border-indigo-200 hover:border-indigo-300',
    cardBg: 'bg-gradient-to-br from-white via-indigo-50/20 to-white',
    badgeBg: 'bg-indigo-100 text-indigo-800 border-indigo-200',
    accentText: 'text-indigo-600',
    pulse: false,
  },
};

/**
 * Formatea una fecha ISO a un formato amigable en español
 */
function formatearFecha(isoString) {
  try {
    const fecha = new Date(isoString);
    if (isNaN(fecha.getTime())) return isoString;

    return new Intl.DateTimeFormat('es-CL', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(fecha);
  } catch {
    return isoString;
  }
}

/**
 * Calcula el tiempo relativo aproximado
 */
function tiempoRelativo(isoString) {
  try {
    const diff = (Date.now() - new Date(isoString).getTime()) / 1000;
    if (diff < 3600) return 'Hace instantes';
    if (diff < 86400) return `Hace ${Math.floor(diff / 3600)} horas`;
    const dias = Math.floor(diff / 86400);
    if (dias === 1) return 'Ayer';
    if (dias < 30) return `Hace ${dias} días`;
    const meses = Math.floor(dias / 30);
    return `Hace ${meses} ${meses === 1 ? 'mes' : 'meses'}`;
  } catch {
    return '';
  }
}

/**
 * Componente de tarjeta de cada hito del Timeline
 */
const HitoTimelineCard = ({ evento, _index, isLast }) => {
  const [expandido, setExpandido] = useState(false);
  const cfg = TIPO_CONFIG[evento.tipo] || TIPO_CONFIG.mantenimiento;
  const IconComponent = cfg.icon;

  const tieneDetallesExtras =
    evento.detalles &&
    (evento.detalles.id_incidencia ||
      evento.detalles.id_orden ||
      evento.detalles.prioridad ||
      evento.detalles.estado_orden ||
      evento.detalles.instrucciones ||
      evento.detalles.diagnostico_tecnico ||
      evento.detalles.url_evidencia);

  return (
    <div className="relative flex items-start gap-4 sm:gap-6 group">
      {/* Columna Izquierda: Nodo circular e icono con línea conectora */}
      <div className="flex flex-col items-center flex-shrink-0 relative">
        {/* Nodo con icono representativo */}
        <div
          className={`w-10 h-10 sm:w-11 sm:h-11 rounded-full ${cfg.nodeBg} text-white flex items-center justify-center shadow-md ${cfg.nodeShadow} ring-4 ${cfg.nodeRing} z-10 transition-transform duration-300 group-hover:scale-110`}
          title={cfg.label}
        >
          <IconComponent className="w-5 h-5 sm:w-5 sm:h-5" />
        </div>

        {/* Efecto de pulso en averías críticas */}
        {cfg.pulse && (
          <span className="absolute -top-1 -left-1 w-12 h-12 rounded-full bg-rose-500 opacity-30 animate-ping pointer-events-none" />
        )}

        {/* Línea conectora vertical entre nodos */}
        {!isLast && (
          <div className="w-0.5 bg-gradient-to-b from-gray-300 via-gray-200 to-gray-200 flex-1 min-h-[48px] my-1" />
        )}
      </div>

      {/* Columna Derecha: Tarjeta de Contenido */}
      <div
        className={`flex-1 min-w-0 max-w-full mb-8 bg-white border ${cfg.cardBorder} ${cfg.cardBg} rounded-2xl p-4 sm:p-5 shadow-xs transition-all duration-300 hover:shadow-md`}
      >
        {/* Cabecera del Hito: Badges, Fecha y Título */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-100 pb-3 mb-3">
          <div className="flex items-center flex-wrap gap-2">
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ${cfg.badgeBg}`}
            >
              <IconComponent className="w-3.5 h-3.5" />
              <span>{evento.tipoLabel || cfg.label}</span>
            </span>

            {/* Código de Trazabilidad */}
            <span className="font-mono text-[11px] text-gray-500 font-semibold bg-gray-100 px-2 py-0.5 rounded border border-gray-200">
              {evento.id}
            </span>

            {/* Transición de Estado si aplica */}
            {evento.estadoNuevo && (
              <span className="inline-flex items-center gap-1 text-[11px] text-gray-600 font-medium">
                {evento.estadoAnterior && (
                  <>
                    <span className="line-through text-gray-400">{evento.estadoAnterior}</span>
                    <FiArrowRight className="w-3 h-3 text-gray-400" />
                  </>
                )}
                <StatusBadge status={evento.estadoNuevo} />
              </span>
            )}
          </div>

          {/* Fecha y tiempo relativo */}
          <div className="flex items-center gap-1.5 text-xs text-gray-500 whitespace-nowrap">
            <FiClock className="w-3.5 h-3.5 text-gray-400" />
            <time dateTime={evento.fecha} title={evento.fecha}>
              {formatearFecha(evento.fecha)}
            </time>
            <span className="text-gray-300">•</span>
            <span className="text-[11px] text-gray-400 font-medium">{tiempoRelativo(evento.fecha)}</span>
          </div>
        </div>

        {/* Título Principal */}
        <h4 className="text-base sm:text-lg font-bold text-gray-900 tracking-tight mb-2 break-words">
          {evento.titulo}
        </h4>

        {/* Descripción del Hito */}
        <p className="text-sm text-gray-700 leading-relaxed break-words mb-4">
          {evento.descripcion}
        </p>

        {/* Responsable / Actor */}
        {evento.responsable && (
          <div className="flex items-center justify-between flex-wrap gap-3 pt-2 border-t border-gray-100">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-full bg-gray-800 text-white flex items-center justify-center text-xs font-bold font-mono">
                {evento.responsable.avatar || 'OP'}
              </div>
              <div>
                <p className="text-xs font-bold text-gray-900 leading-tight">
                  {evento.responsable.nombre}
                </p>
                <p className="text-[11px] text-gray-500">
                  {evento.responsable.rol}
                </p>
              </div>
            </div>

            {/* Botón para desplegar detalles técnicos */}
            {tieneDetallesExtras && (
              <button
                type="button"
                onClick={() => setExpandido(!expandido)}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-600 hover:text-blue-600 py-1 px-2.5 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <span>{expandido ? 'Ocultar campos del registro' : 'Ver campos del registro (BD)'}</span>
                {expandido ? <FiChevronUp className="w-3.5 h-3.5" /> : <FiChevronDown className="w-3.5 h-3.5" />}
              </button>
            )}
          </div>
        )}

        {/* Panel Acordeón de Detalles Técnicos Consolidados (JOIN Prisma) */}
        {expandido && tieneDetallesExtras && (
          <div className="mt-3 pt-3 border-t border-dashed border-gray-200 bg-gray-50/70 -mx-4 -mb-4 sm:-mx-5 sm:-mb-5 p-4 sm:p-5 rounded-b-2xl space-y-2.5 text-xs text-gray-700">
            <div className="flex items-center gap-2 font-bold text-gray-800 uppercase tracking-wider text-[11px]">
              <FiCpu className="text-blue-600 w-3.5 h-3.5" />
              <span>Campos Relacionales Prisma (INCIDENCIAS / ORDENES_TRABAJO)</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              {evento.detalles.id_incidencia && (
                <div className="flex items-center gap-1.5">
                  <span className="text-gray-500 font-medium">id_incidencia:</span>
                  <span className="font-mono font-bold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200">
                    {evento.detalles.id_incidencia}
                  </span>
                </div>
              )}

              {evento.detalles.id_orden && (
                <div className="flex items-center gap-1.5">
                  <span className="text-gray-500 font-medium">id_orden:</span>
                  <span className="font-mono font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                    {evento.detalles.id_orden}
                  </span>
                </div>
              )}

              {evento.detalles.prioridad && (
                <div className="flex items-center gap-1.5">
                  <span className="text-gray-500 font-medium">prioridad:</span>
                  <span className="font-bold text-gray-800">{evento.detalles.prioridad}</span>
                </div>
              )}

              {evento.detalles.estado_orden && (
                <div className="flex items-center gap-1.5">
                  <span className="text-gray-500 font-medium">estado (orden):</span>
                  <span className="font-semibold text-gray-800">{evento.detalles.estado_orden}</span>
                </div>
              )}

              {evento.detalles.fecha_asignacion && (
                <div className="flex items-center gap-1.5">
                  <span className="text-gray-500 font-medium">fecha_asignacion:</span>
                  <span className="font-mono text-gray-700">{formatearFecha(evento.detalles.fecha_asignacion)}</span>
                </div>
              )}

              {evento.detalles.fecha_termino && (
                <div className="flex items-center gap-1.5">
                  <span className="text-gray-500 font-medium">fecha_termino:</span>
                  <span className="font-mono text-gray-700">{formatearFecha(evento.detalles.fecha_termino)}</span>
                </div>
              )}
            </div>

            {/* Instrucciones de la orden de trabajo */}
            {evento.detalles.instrucciones && (
              <div className="mt-2 p-2.5 rounded bg-amber-50/70 border border-amber-200 text-amber-900 text-xs">
                <span className="font-bold">instrucciones: </span>
                {evento.detalles.instrucciones}
              </div>
            )}

            {/* Diagnóstico técnico */}
            {evento.detalles.diagnostico_tecnico && (
              <div className="mt-2 p-2.5 rounded bg-emerald-50/80 border border-emerald-200 text-emerald-900 text-xs">
                <span className="font-bold">diagnostico_tecnico: </span>
                {evento.detalles.diagnostico_tecnico}
              </div>
            )}

            {/* Evidencia fotográfica */}
            {evento.detalles.url_evidencia && (
              <div className="mt-2 flex items-center gap-1.5 text-xs text-blue-700">
                <span className="font-bold text-gray-600">url_cloudinary: </span>
                <span className="font-mono text-[11px] truncate max-w-xs">{evento.detalles.url_evidencia}</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

/**
 * Componente Principal del Timeline Vertical de Trazabilidad
 */
const TimelineActivo = ({
  eventos = [],
  paginacion = { pagina: 1, totalPaginas: 1, total: 0 },
  onCambiarPagina,
  cargando = false,
}) => {
  if (cargando) {
    return (
      <div className="w-full py-16 flex flex-col items-center justify-center gap-3 bg-white rounded-2xl border border-gray-200 shadow-xs">
        <div className="w-9 h-9 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm font-semibold text-gray-600">
          Consultando y consolidando ciclo de vida del activo...
        </p>
      </div>
    );
  }

  if (!eventos || eventos.length === 0) {
    return (
      <div className="w-full py-16 text-center bg-white rounded-2xl border border-gray-200 shadow-xs p-6">
        <FiPackage className="w-12 h-12 text-gray-300 mx-auto mb-3" />
        <h4 className="text-base font-bold text-gray-800">Sin eventos en este criterio</h4>
        <p className="text-xs text-gray-500 mt-1 max-w-md mx-auto">
          No se encontraron hitos históricos asociados al filtro seleccionado. Prueba seleccionando otra categoría o limpiando los filtros.
        </p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-full overflow-hidden">
      {/* Contenedor del Timeline Vertical con padding seguro para no desbordar en móviles */}
      <div className="relative pt-2">
        {eventos.map((evento, index) => (
          <HitoTimelineCard
            key={evento.id || index}
            evento={evento}
            index={index}
            isLast={index === eventos.length - 1}
          />
        ))}
      </div>

      {/* Barra de Paginación */}
      {paginacion && paginacion.totalPaginas > 1 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-gray-200 mt-2">
          <p className="text-xs text-gray-600">
            Mostrando página <span className="font-bold text-gray-900">{paginacion.pagina}</span> de{' '}
            <span className="font-bold text-gray-900">{paginacion.totalPaginas}</span> ({paginacion.total} hitos totales)
          </p>

          <div className="inline-flex items-center gap-2">
            <button
              type="button"
              disabled={paginacion.pagina <= 1}
              onClick={() => onCambiarPagina && onCambiarPagina(paginacion.pagina - 1)}
              className="px-3.5 py-1.5 text-xs font-semibold rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Anterior
            </button>
            <span className="text-xs font-mono font-medium text-gray-500 px-2">
              {paginacion.pagina} / {paginacion.totalPaginas}
            </span>
            <button
              type="button"
              disabled={paginacion.pagina >= paginacion.totalPaginas}
              onClick={() => onCambiarPagina && onCambiarPagina(paginacion.pagina + 1)}
              className="px-3.5 py-1.5 text-xs font-semibold rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Siguiente
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default TimelineActivo;
