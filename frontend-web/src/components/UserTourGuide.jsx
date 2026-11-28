import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
  FiChevronLeft,
  FiChevronRight,
  FiX,
  FiCheck,
  FiInfo,
  FiAlertCircle,
  FiTool,
  FiCalendar,
  FiActivity,
  FiBox,
  FiUsers,
  FiBarChart2,
  FiRefreshCw,
  FiCompass,
} from 'react-icons/fi';
import { getUsuarioActual, hasPermission } from '../services/authService';
import { registrarFinalizacionRecorrido } from '../utils/userTourStorage';

/**
 * Componente de Guía Visual Interactiva de Usuario (Onboarding Tour).
 *
 * Diseñado conforme a la especificación PBAC, el Diagrama de Casos de Uso institucional
 * y los lineamientos de la directriz TAL-206 / TAL-222.
 *
 * @param {Object} props
 * @param {boolean} props.estaAbierto - Indica si el modal del tour está desplegado
 * @param {() => void} props.alCerrar - Función invocada al cerrar o saltar el tour
 * @param {(abrir: boolean) => void} [props.alCambiarEstadoMenuMovil] - Callback para abrir o cerrar el menú móvil lateral según el paso activo
 */
export const UserTourGuide = ({
  estaAbierto,
  alCerrar,
  alCambiarEstadoMenuMovil,
}) => {
  const [indicePasoActual, setIndicePasoActual] = useState(0);
  const [rectanguloObjetivo, setRectanguloObjetivo] = useState(null);

  const usuario = getUsuarioActual();
  const nombreRol = String(
    usuario?.rol?.nombre_rol || usuario?.rol || 'USUARIO'
  )
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase();

  const nombreUsuario =
    `${usuario?.nombre || ''} ${usuario?.apellido || ''}`.trim() ||
    usuario?.correo ||
    'Usuario';

  // Catálogo integral de pasos del tour adaptado a casos de uso y permisos PBAC
  const definicionPasos = useMemo(() => {
    return [
      {
        identificador: 'bienvenida',
        titulo: `¡Bienvenido a InfraManager, ${nombreUsuario}!`,
        descripcion: `Esta guía interactiva te presentará de forma rápida y clara las funcionalidades principales disponibles para tu rol de ${nombreRol}. Puedes navegar paso a paso con el teclado o el cursor.`,
        icono: FiCompass,
        selectorObjetivo: null,
        requiereMenuLateral: false,
        debeIncluirse: () => true,
      },
      // PASOS PARA REPORTANTE (Conforme a TAL-206: Omitiendo trazabilidad QR y saltando directo a reporte)
      {
        identificador: 'reportante-reportar-incidencia',
        titulo: 'Reportar Falla o Incidencia Técnica',
        descripcion:
          'Desde aquí puedes registrar cualquier falla en equipos institucionales, detallar el problema, adjuntar evidencias fotográficas e incluso sugerir un activo si no figura en el inventario.',
        icono: FiAlertCircle,
        selectorObjetivo: '[data-tour="nav-incidencias"]',
        requiereMenuLateral: true,
        debeIncluirse: () =>
          nombreRol === 'REPORTANTE' && hasPermission('incidencias:crear'),
      },
      {
        identificador: 'reportante-bandeja-incidencias',
        titulo: 'Seguimiento de Mis Incidencias',
        descripcion:
          'Consulta en todo momento el avance de tus solicitudes en la bandeja central de incidencias para conocer en tiempo real cuando un técnico sea asignado y resuelva la falla.',
        icono: FiInfo,
        selectorObjetivo: '[data-tour="nav-incidencias"]',
        requiereMenuLateral: true,
        debeIncluirse: () =>
          nombreRol === 'REPORTANTE' && hasPermission('incidencias:ver'),
      },

      // PASOS PARA TÉCNICO (Diagnóstico, resolución, trazabilidad y reporte en terreno)
      {
        identificador: 'tecnico-incidencias-globales',
        titulo: 'Bandeja de Incidencias y Órdenes de Trabajo',
        descripcion:
          'Visualiza las incidencias registradas en los laboratorios y salas. Aquí podrás identificar oportunamente solicitudes pendientes y filtrarlas por prioridad.',
        icono: FiAlertCircle,
        selectorObjetivo: '[data-tour="nav-incidencias"]',
        requiereMenuLateral: true,
        debeIncluirse: () =>
          nombreRol === 'TECNICO' && hasPermission('incidencias:ver'),
      },
      {
        identificador: 'tecnico-mis-asignadas',
        titulo: 'Gestión de "Mis Asignadas" y Diagnóstico',
        descripcion:
          'Accede a las órdenes de trabajo asignadas a tu persona. Registra el diagnóstico técnico formal, especifica materiales utilizados y marca las tareas como resueltas en terreno.',
        icono: FiTool,
        selectorObjetivo: '[data-tour="nav-incidencias"]',
        requiereMenuLateral: true,
        debeIncluirse: () =>
          nombreRol === 'TECNICO' &&
          (hasPermission('ordenes:diagnosticar') || hasPermission('incidencias:resolver')),
      },
      {
        identificador: 'tecnico-trazabilidad-activo',
        titulo: 'Historial y Trazabilidad del Activo',
        descripcion:
          'Antes de realizar una intervención, consulta el historial de mantenimientos anteriores y componentes del equipo tecnológico para un diagnóstico certero.',
        icono: FiActivity,
        selectorObjetivo: '[data-tour="nav-trazabilidad"]',
        requiereMenuLateral: true,
        debeIncluirse: () =>
          nombreRol === 'TECNICO' && hasPermission('incidencias:ver'),
      },
      {
        identificador: 'tecnico-reporte-terreno',
        titulo: 'Reporte de Falla Durante Mantenimiento',
        descripcion:
          'Si durante una ronda de inspección o mantenimiento encuentras una anomalía no registrada, puedes crear una nueva incidencia técnica inmediatamente.',
        icono: FiAlertCircle,
        selectorObjetivo: '[data-tour="nav-incidencias"]',
        requiereMenuLateral: true,
        debeIncluirse: () =>
          nombreRol === 'TECNICO' && hasPermission('incidencias:crear'),
      },

      // PASOS PARA SUPERVISOR (Triaje, prioridad dinámica, asignación y agenda preventiva)
      {
        identificador: 'supervisor-triaje-prioridad',
        titulo: 'Clasificación y Priorización Dinámica',
        descripcion:
          'Como supervisor, evalúa la gravedad y clasifica la prioridad de cada incidencia (baja, media, alta, crítica) para garantizar la continuidad operativa institucional.',
        icono: FiAlertCircle,
        selectorObjetivo: '[data-tour="nav-incidencias"]',
        requiereMenuLateral: true,
        debeIncluirse: () =>
          nombreRol === 'SUPERVISOR' &&
          hasPermission('incidencias:clasificar_prioridad'),
      },
      {
        identificador: 'supervisor-asignacion-tecnicos',
        titulo: 'Asignación Eficiente a Técnicos',
        descripcion:
          'Verifica la disponibilidad de técnicos en tiempo real y asigna responsabilidades operativas para resolver las fallas con trazabilidad completa.',
        icono: FiUsers,
        selectorObjetivo: '[data-tour="nav-incidencias"]',
        requiereMenuLateral: true,
        debeIncluirse: () =>
          nombreRol === 'SUPERVISOR' && hasPermission('ordenes:asignar'),
      },
      {
        identificador: 'supervisor-agenda-mantenimiento',
        titulo: 'Planificación y Agenda de Mantenimientos',
        descripcion:
          'Programa intervenciones preventivas periódicas sobre proyectores, computadores y redes para prevenir fallas antes de que impacten las actividades institucionales.',
        icono: FiCalendar,
        selectorObjetivo: '[data-tour="nav-mantenimientos"]',
        requiereMenuLateral: true,
        debeIncluirse: () =>
          nombreRol === 'SUPERVISOR' && hasPermission('mantenimientos:crear'),
      },
      {
        identificador: 'supervisor-auditoria-trazabilidad',
        titulo: 'Auditoría y Ciclo de Vida de Activos',
        descripcion:
          'Supervisa la frecuencia de fallas de la infraestructura y examina el ciclo de vida de los equipos tecnológicos para tomar decisiones de reemplazo o mantención.',
        icono: FiActivity,
        selectorObjetivo: '[data-tour="nav-trazabilidad"]',
        requiereMenuLateral: true,
        debeIncluirse: () =>
          nombreRol === 'SUPERVISOR' && hasPermission('incidencias:ver'),
      },

      // PASOS PARA ADMINISTRADOR (Inventario, analítica Dashboard, exportar y usuarios)
      {
        identificador: 'administrador-inventario-activos',
        titulo: 'Gestión Integral del Inventario TI',
        descripcion:
          'Controla el parque tecnológico institucional: da de alta nuevos activos, actualiza su ubicación y modelo, y gestiona bajas preservando la trazabilidad.',
        icono: FiBox,
        selectorObjetivo: '[data-tour="nav-inventario"]',
        requiereMenuLateral: true,
        debeIncluirse: () =>
          nombreRol === 'ADMINISTRADOR' && hasPermission('activos:gestionar'),
      },
      {
        identificador: 'administrador-dashboard-kpis',
        titulo: 'Panel de Métricas y KPIs Analíticos',
        descripcion:
          'Monitorea en tiempo real los indicadores de rendimiento (SLA), volumen global de incidencias y tiempos de respuesta de la plataforma.',
        icono: FiBarChart2,
        selectorObjetivo: '[data-tour="nav-dashboard"]',
        requiereMenuLateral: true,
        debeIncluirse: () =>
          nombreRol === 'ADMINISTRADOR' && hasPermission('estadisticas:ver'),
      },
      {
        identificador: 'administrador-reportes-excel',
        titulo: 'Exportación de Reportes para Auditoría',
        descripcion:
          'Descarga reportes consolidados en formato Excel con todas las métricas de gestión e incidencias para fines de auditoría institucional.',
        icono: FiBarChart2,
        selectorObjetivo: '[data-tour="nav-dashboard"]',
        requiereMenuLateral: true,
        debeIncluirse: () =>
          nombreRol === 'ADMINISTRADOR' && hasPermission('reportes:exportar'),
      },
      {
        identificador: 'administrador-gestion-usuarios',
        titulo: 'Administración de Usuarios y Roles',
        descripcion:
          'Gestiona los accesos del personal institucional, modifica roles (Reportante, Técnico, Supervisor, Administrador) y administra las credenciales del sistema.',
        icono: FiUsers,
        selectorObjetivo: '[data-tour="nav-usuarios"]',
        requiereMenuLateral: true,
        debeIncluirse: () =>
          nombreRol === 'ADMINISTRADOR' && hasPermission('usuarios:gestionar'),
      },
      {
        identificador: 'administrador-trazabilidad-global',
        titulo: 'Trazabilidad de la Infraestructura Institucional',
        descripcion:
          'Accede a la trazabilidad completa y línea de tiempo de cualquier equipo institucional registrado en el campus.',
        icono: FiActivity,
        selectorObjetivo: '[data-tour="nav-trazabilidad"]',
        requiereMenuLateral: true,
        debeIncluirse: () =>
          nombreRol === 'ADMINISTRADOR' && hasPermission('incidencias:ver'),
      },

      // PASOS TRANSVERSALES FINALES (Cola offline, perfil y botón de ayuda)
      {
        identificador: 'transversal-cola-offline',
        titulo: 'Soporte Offline y Sincronización',
        descripcion:
          'Si pierdes conexión a internet, la plataforma guarda tus acciones localmente y las sincroniza automáticamente cuando vuelvas a estar en línea.',
        icono: FiRefreshCw,
        selectorObjetivo: '[data-tour="cola-sincronizacion"]',
        requiereMenuLateral: true,
        debeIncluirse: () => true,
      },
      {
        identificador: 'transversal-perfil-sesion',
        titulo: 'Tu Perfil Institucional y Ayuda Continua',
        descripcion:
          'Aquí puedes verificar tu rol activo y estado de sesión. Recuerda que puedes volver a abrir esta guía interactiva en cualquier momento desde el botón de ayuda con el ícono de interrogación (?) en la barra superior.',
        icono: FiCheck,
        selectorObjetivo: '[data-tour="tarjeta-usuario"]',
        requiereMenuLateral: true,
        debeIncluirse: () => true,
      },
    ];
  }, [nombreRol, nombreUsuario]);

  // Filtrado de pasos según permisos efectivos del usuario
  const pasosFiltrados = useMemo(() => {
    return definicionPasos.filter((paso) => paso.debeIncluirse());
  }, [definicionPasos]);

  const pasoActual = pasosFiltrados[indicePasoActual] || pasosFiltrados[0];

  // Cálculo de coordenadas del elemento objetivo para el efecto Spotlight
  const actualizarCoordenadasObjetivo = useCallback(() => {
    if (!pasoActual?.selectorObjetivo) {
      setRectanguloObjetivo(null);
      return;
    }

    const elemento = document.querySelector(pasoActual.selectorObjetivo);
    if (!elemento) {
      setRectanguloObjetivo(null);
      return;
    }

    const rectangulo = elemento.getBoundingClientRect();
    setRectanguloObjetivo({
      top: rectangulo.top,
      left: rectangulo.left,
      width: rectangulo.width,
      height: rectangulo.height,
      bottom: rectangulo.bottom,
      right: rectangulo.right,
    });

    elemento.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [pasoActual]);

  // Control reactivo de apertura/cierre del panel lateral en dispositivos móviles según el paso activo
  useEffect(() => {
    if (!estaAbierto) return;

    const esPantallaMovil = typeof window !== 'undefined' && window.innerWidth < 1024;
    const debeAbrirMenu = Boolean(esPantallaMovil && pasoActual?.requiereMenuLateral);

    if (typeof alCambiarEstadoMenuMovil === 'function') {
      alCambiarEstadoMenuMovil(debeAbrirMenu);
    }

    // El Sidebar posee transición animada (duration-300); recalculamos coordenadas periódicamente durante el deslizamiento
    const retrasos = [50, 160, 320, 480];
    const temporizadores = retrasos.map((ms) =>
      setTimeout(() => {
        actualizarCoordenadasObjetivo();
      }, ms)
    );

    window.addEventListener('resize', actualizarCoordenadasObjetivo);
    window.addEventListener('scroll', actualizarCoordenadasObjetivo, true);

    return () => {
      temporizadores.forEach((temporizadorId) => clearTimeout(temporizadorId));
      window.removeEventListener('resize', actualizarCoordenadasObjetivo);
      window.removeEventListener('scroll', actualizarCoordenadasObjetivo, true);
    };
  }, [estaAbierto, pasoActual, alCambiarEstadoMenuMovil, actualizarCoordenadasObjetivo]);

  const handleSiguiente = () => {
    if (indicePasoActual < pasosFiltrados.length - 1) {
      setIndicePasoActual((previo) => previo + 1);
    } else {
      if (typeof alCambiarEstadoMenuMovil === 'function') {
        alCambiarEstadoMenuMovil(false);
      }
      registrarFinalizacionRecorrido(usuario);
      alCerrar();
    }
  };

  const handleAnterior = () => {
    if (indicePasoActual > 0) {
      setIndicePasoActual((previo) => previo - 1);
    }
  };

  const handleSaltar = () => {
    if (typeof alCambiarEstadoMenuMovil === 'function') {
      alCambiarEstadoMenuMovil(false);
    }
    registrarFinalizacionRecorrido(usuario);
    alCerrar();
  };

  // Manejo de eventos de teclado (Accesibilidad WCAG 2.1)
  useEffect(() => {
    if (!estaAbierto) return;

    const manejarTeclado = (evento) => {
      if (evento.key === 'Escape') {
        evento.preventDefault();
        handleSaltar();
      } else if (evento.key === 'ArrowRight' || evento.key === 'Enter') {
        if (evento.target.tagName !== 'BUTTON' || evento.target.closest('#contenedor-tour-guiado')) {
          evento.preventDefault();
          handleSiguiente();
        }
      } else if (evento.key === 'ArrowLeft') {
        evento.preventDefault();
        handleAnterior();
      }
    };

    window.addEventListener('keydown', manejarTeclado);
    return () => window.removeEventListener('keydown', manejarTeclado);
  });

  // Renderizado del popover: centrado en modal o anclado cerca del elemento objetivo
  // Se define antes del return condicional para cumplir con la regla de React Hooks
  const estiloPopover = useMemo(() => {
    if (!rectanguloObjetivo || typeof window === 'undefined') {
      return {
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        position: 'fixed',
      };
    }

    const anchoVentana = window.innerWidth;
    const altoVentana = window.innerHeight;
    const esDispositivoMovil = anchoVentana < 768;

    // Adaptación ergonómica para celulares: fijar la tarjeta en la parte inferior o superior sin tapar el elemento enfocado
    if (esDispositivoMovil) {
      const objetivoEnMitadSuperior = rectanguloObjetivo.bottom < altoVentana * 0.55;
      if (objetivoEnMitadSuperior) {
        return {
          bottom: 16,
          left: 12,
          right: 12,
          position: 'fixed',
          maxWidth: 'calc(100% - 24px)',
        };
      }
      return {
        top: 16,
        left: 12,
        right: 12,
        position: 'fixed',
        maxWidth: 'calc(100% - 24px)',
      };
    }

    const anchoEstimadoPopover = Math.min(420, anchoVentana - 32);

    if (rectanguloObjetivo.right + anchoEstimadoPopover + 24 <= anchoVentana) {
      return {
        top: Math.max(16, Math.min(rectanguloObjetivo.top, altoVentana - 300)),
        left: rectanguloObjetivo.right + 16,
        position: 'fixed',
      };
    }

    if (rectanguloObjetivo.bottom + 260 <= altoVentana) {
      return {
        top: rectanguloObjetivo.bottom + 12,
        left: Math.max(16, Math.min(rectanguloObjetivo.left, anchoVentana - anchoEstimadoPopover - 16)),
        position: 'fixed',
      };
    }

    return {
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      position: 'fixed',
    };
  }, [rectanguloObjetivo]);

  if (!estaAbierto || pasosFiltrados.length === 0) {
    return null;
  }

  const esUltimoPaso = indicePasoActual === pasosFiltrados.length - 1;
  const IconoPaso = pasoActual?.icono || FiInfo;

  return createPortal(
    <div
      id="contenedor-tour-guiado"
      role="dialog"
      aria-modal="true"
      aria-labelledby="titulo-tour-guia"
      aria-describedby="descripcion-tour-guia"
      className="fixed inset-0 z-[100] select-none"
    >
      {/* Fondo oscuro: cuando hay objetivo se usa box-shadow masivo en el spotlight para dejar el elemento 100% nítido y sin difuminar */}
      {rectanguloObjetivo ? (
        <>
          <div
            className="fixed inset-0 cursor-pointer z-[100]"
            onClick={handleSaltar}
            aria-hidden="true"
          />
          <div
            data-testid="spotlight-tour"
            className="fixed pointer-events-none rounded-xl ring-4 ring-primary ring-offset-2 ring-offset-black/10 transition-all duration-300 ease-out z-[101]"
            style={{
              top: rectanguloObjetivo.top - 4,
              left: rectanguloObjetivo.left - 4,
              width: rectanguloObjetivo.width + 8,
              height: rectanguloObjetivo.height + 8,
              boxShadow: '0 0 0 9999px rgba(3, 7, 18, 0.70)',
            }}
          />
        </>
      ) : (
        <div
          className="fixed inset-0 bg-gray-950/70 transition-opacity duration-300 z-[100]"
          onClick={handleSaltar}
        />
      )}

      {/* Tarjeta flotante interactiva con controles accesibles */}
      <div
        style={estiloPopover}
        className="w-full max-w-sm sm:max-w-md bg-white rounded-2xl shadow-2xl border border-gray-100 p-5 sm:p-6 z-[102] transition-all duration-300 animate-in fade-in zoom-in-95 pointer-events-auto"
      >
        {/* Cabecera del paso */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-primary-50 text-primary flex items-center justify-center font-bold flex-shrink-0 shadow-xs ring-1 ring-primary/20">
              <IconoPaso className="w-5 h-5" aria-hidden="true" />
            </div>
            <div>
              <span className="text-[11px] font-black uppercase tracking-wider text-primary">
                Paso {indicePasoActual + 1} de {pasosFiltrados.length}
              </span>
              <h2
                id="titulo-tour-guia"
                className="text-base sm:text-lg font-bold text-gray-900 leading-snug"
              >
                {pasoActual?.titulo}
              </h2>
            </div>
          </div>

          <button
            type="button"
            onClick={handleSaltar}
            className="text-gray-400 hover:text-gray-700 p-1.5 rounded-lg hover:bg-gray-100 transition-colors focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer"
            title="Saltar recorrido"
            aria-label="Cerrar y omitir recorrido interactivo"
          >
            <FiX className="w-5 h-5" />
          </button>
        </div>

        {/* Descripción del caso de uso */}
        <p
          id="descripcion-tour-guia"
          className="text-xs sm:text-sm text-gray-600 leading-relaxed mb-5"
        >
          {pasoActual?.descripcion}
        </p>

        {/* Indicador de barra de progreso */}
        <div className="w-full bg-gray-100 h-1.5 rounded-full mb-4 overflow-hidden">
          <div
            className="bg-primary h-full transition-all duration-300 ease-out"
            style={{
              width: `${((indicePasoActual + 1) / pasosFiltrados.length) * 100}%`,
            }}
          />
        </div>

        {/* Barra de controles de navegación */}
        <div className="flex items-center justify-between gap-2 pt-2 border-t border-gray-100">
          <button
            type="button"
            onClick={handleSaltar}
            className="text-xs font-semibold text-gray-500 hover:text-gray-800 px-2 py-1.5 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
          >
            Saltar recorrido
          </button>

          <div className="flex items-center gap-2">
            {indicePasoActual > 0 && (
              <button
                type="button"
                onClick={handleAnterior}
                className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 active:bg-gray-300 rounded-xl transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-gray-400"
                aria-label="Paso anterior"
              >
                <FiChevronLeft className="w-4 h-4" />
                <span>Anterior</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleSiguiente}
              className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-bold text-white bg-primary hover:bg-primary-hover active:bg-primary-active rounded-xl shadow-sm shadow-primary/25 transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1"
              aria-label={esUltimoPaso ? 'Finalizar recorrido' : 'Siguiente paso'}
            >
              <span>{esUltimoPaso ? 'Finalizar' : 'Siguiente'}</span>
              {esUltimoPaso ? (
                <FiCheck className="w-4 h-4" />
              ) : (
                <FiChevronRight className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default UserTourGuide;
