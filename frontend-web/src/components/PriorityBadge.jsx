import React from 'react';
import {
  FiAlertTriangle,
  FiArrowUp,
  FiClock,
  FiArrowDown,
  FiMinus,
  FiHelpCircle
} from 'react-icons/fi';

/**
 * Componente visual para reflejar el grado de prioridad de una Orden de Trabajo.
 * Diseñado conforme al enum 'Prioridad' de Prisma (Alta, Media, Baja).
 *
 * @param {Object} props
 * @param {string} [props.priority] - Nivel de prioridad ('Alta' | 'Media' | 'Baja' | 'Crítica' | 'No Asignada')
 * @param {string} [props.prioridad] - Alias en español para interoperabilidad con backend/entidades
 * @param {'xs'|'sm'|'md'|'lg'} [props.size='sm'] - Tamaño del badge
 * @param {boolean} [props.showIcon=true] - Muestra u oculta el icono representativo
 * @param {boolean} [props.showDot=true] - Muestra un indicador circular (con pulsación en Alta)
 * @param {'badge'|'pill'|'subtle'|'outline'} [props.variant='badge'] - Variante visual del badge
 * @param {string} [props.className=''] - Clases Tailwind adicionales
 */
const PriorityBadge = ({
  priority,
  prioridad,
  size = 'sm',
  showIcon = true,
  showDot = true,
  variant = 'badge',
  className = '',
}) => {
  // Normalizar valor recibido desde props (prioridad en backend o frontend)
  const rawPriority = (prioridad || priority || '').toString().trim();
  const lower = rawPriority.toLowerCase();

  // Configuración visual por nivel de prioridad según el esquema de ORDENES_TRABAJO
  let config = {
    label: 'No asignada',
    normalized: 'No Asignada',
    bgColor: 'bg-gray-100',
    textColor: 'text-gray-700',
    borderColor: 'border-gray-200',
    dotColor: 'bg-gray-400',
    pulse: false,
    Icon: FiMinus,
    title: 'Prioridad no asignada',
  };

  if (lower === 'alta' || lower === 'critica' || lower === 'crítica' || lower === 'urgente') {
    config = {
      label: 'Alta',
      normalized: 'Alta',
      bgColor: 'bg-rose-50',
      textColor: 'text-rose-700',
      borderColor: 'border-rose-200',
      dotColor: 'bg-rose-500',
      pulse: true,
      Icon: FiAlertTriangle,
      title: 'Prioridad Alta: Atención urgente y prioritaria',
    };
  } else if (lower === 'media' || lower === 'estandar' || lower === 'normal') {
    config = {
      label: 'Media',
      normalized: 'Media',
      bgColor: 'bg-amber-50',
      textColor: 'text-amber-800',
      borderColor: 'border-amber-200',
      dotColor: 'bg-amber-500',
      pulse: false,
      Icon: FiClock,
      title: 'Prioridad Media: Flujo estándar y balanceado',
    };
  } else if (lower === 'baja' || lower === 'menor') {
    config = {
      label: 'Baja',
      normalized: 'Baja',
      bgColor: 'bg-emerald-50',
      textColor: 'text-emerald-700',
      borderColor: 'border-emerald-200',
      dotColor: 'bg-emerald-500',
      pulse: false,
      Icon: FiArrowDown,
      title: 'Prioridad Baja: Mantenimiento regular o menor impacto',
    };
  }

  // Dimensiones según tamaño seleccionado
  const sizeStyles = {
    xs: {
      container: 'text-[10px] px-1.5 py-0.5 gap-1',
      icon: 'w-2.5 h-2.5',
      dot: 'w-1.5 h-1.5',
    },
    sm: {
      container: 'text-xs px-2.5 py-0.5 gap-1.5',
      icon: 'w-3 h-3',
      dot: 'w-1.5 h-1.5',
    },
    md: {
      container: 'text-xs px-3 py-1 gap-2 font-medium',
      icon: 'w-3.5 h-3.5',
      dot: 'w-2 h-2',
    },
    lg: {
      container: 'text-sm px-3.5 py-1.5 gap-2 font-semibold',
      icon: 'w-4 h-4',
      dot: 'w-2.5 h-2.5',
    },
  }[size] || {
    container: 'text-xs px-2.5 py-0.5 gap-1.5',
    icon: 'w-3 h-3',
    dot: 'w-1.5 h-1.5',
  };

  // Variantes de forma y bordes
  const variantStyles = {
    badge: `rounded-md border ${config.bgColor} ${config.textColor} ${config.borderColor}`,
    pill: `rounded-full border ${config.bgColor} ${config.textColor} ${config.borderColor}`,
    subtle: `rounded-md ${config.bgColor} ${config.textColor} border-transparent`,
    outline: `rounded-md border-2 bg-transparent ${config.textColor} ${config.borderColor}`,
  }[variant] || `rounded-md border ${config.bgColor} ${config.textColor} ${config.borderColor}`;

  const { Icon } = config;

  return (
    <span
      className={`inline-flex items-center font-medium select-none shadow-2xs transition-all ${sizeStyles.container} ${variantStyles} ${className}`}
      title={config.title}
      data-prioridad={config.normalized}
    >
      {/* Indicador de punto con animación de pulso si es Alta */}
      {showDot && (
        <span className="relative flex items-center justify-center flex-shrink-0">
          {config.pulse && (
            <span
              className={`absolute inline-flex h-full w-full rounded-full opacity-75 animate-ping ${config.dotColor}`}
            />
          )}
          <span className={`relative inline-block rounded-full ${sizeStyles.dot} ${config.dotColor}`} />
        </span>
      )}

      {/* Icono temático de prioridad */}
      {showIcon && <Icon className={`${sizeStyles.icon} flex-shrink-0`} aria-hidden="true" />}

      {/* Texto de prioridad */}
      <span className="tracking-tight">{config.label}</span>
    </span>
  );
};

export default PriorityBadge;
