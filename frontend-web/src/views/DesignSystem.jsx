import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  FiHome,
  FiAlertCircle,
  FiBox,
  FiCalendar,
  FiActivity,
  FiUsers,
  FiMenu,
  FiX,
  FiChevronRight,
  FiArrowRight,
  FiArrowLeft,
  FiPlus,
  FiEdit,
  FiTrash2,
  FiSave,
  FiSend,
  FiSearch,
  FiFilter,
  FiDownload,
  FiRefreshCw,
  FiExternalLink,
  FiCheckCircle,
  FiCheck,
  FiMaximize2,
  FiEye,
  FiEyeOff,
  FiClock,
  FiAlertTriangle,
  FiInfo,
  FiShield,
  FiLock,
  FiUnlock,
  FiUserCheck,
  FiServer,
  FiCpu,
  FiHardDrive,
  FiWifi,
  FiLayers,
  FiTag,
  FiDatabase,
  FiCopy,
  FiSliders,
  FiCode
} from 'react-icons/fi';
import StatusBadge from '../components/StatusBadge';
import { useToast } from '../context/ToastContext';

/**
 * TAL-171: Guía de Estilo y Galería del Sistema de Diseño (Design System)
 *
 * Objetivo: Unificar criterios de diseño para el equipo de Frontend.
 * Ruta secreta / temporal: /design-system
 * Criterio de Aceptación a:
 *   Existe una galería visible con los 5 componentes principales usados en el proyecto
 *   y sus estados (default, hover, active/focus, disabled, loading/error).
 */

const DesignSystem = () => {
  const { showToast } = useToast();

  // Estados interactivos para el playground de componentes
  const [activeTab, setActiveTab] = useState('todos');
  const [simularDisabled, setSimularDisabled] = useState(false);
  const [simularLoading, setSimularLoading] = useState(false);
  const [textoBotonDemo, setTextoBotonDemo] = useState('Guardar Cambios');
  
  // Estado para inputs interactivos
  const [inputDemoVal, setInputDemoVal] = useState('Servidor HP ProLiant DL380');
  const [selectDemoVal, setSelectDemoVal] = useState('hardware');
  const [searchDemoVal, setSearchDemoVal] = useState('');
  const [textareaDemoVal, setTextareaDemoVal] = useState('Falla intermitente en fuente de poder redundante detectada durante monitoreo preventivo.');
  const [busquedaIconos, setBusquedaIconos] = useState('');

  // Función utilitaria para copiar snippets al portapapeles
  const copiarCodigo = (codigo, etiqueta) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(codigo);
      showToast(`Snippet de "${etiqueta}" copiado al portapapeles`, 'success');
    } else {
      showToast('No se pudo acceder al portapapeles', 'error');
    }
  };

  // Catálogo representativo de íconos del sistema organizados por dominio
  const catalogoIconos = [
    { nombre: 'FiHome', icon: FiHome, categoria: 'Navegación', uso: 'Panel principal / Dashboard' },
    { nombre: 'FiAlertCircle', icon: FiAlertCircle, categoria: 'Navegación / Incidencias', uso: 'Tickets y fallas reportadas' },
    { nombre: 'FiBox', icon: FiBox, categoria: 'Navegación / Activos', uso: 'Equipos, inventario y hardware' },
    { nombre: 'FiCalendar', icon: FiCalendar, categoria: 'Navegación / Agenda', uso: 'Mantenimientos preventivos' },
    { nombre: 'FiActivity', icon: FiActivity, categoria: 'Navegación / Auditoría', uso: 'Trazabilidad y ciclo de vida' },
    { nombre: 'FiUsers', icon: FiUsers, categoria: 'Navegación / Usuarios', uso: 'Directorio de técnicos y cuentas' },
    { nombre: 'FiPlus', icon: FiPlus, categoria: 'Acciones', uso: 'Crear incidencia, nuevo activo' },
    { nombre: 'FiEdit', icon: FiEdit, categoria: 'Acciones', uso: 'Modificar registros' },
    { nombre: 'FiTrash2', icon: FiTrash2, categoria: 'Acciones', uso: 'Limpiar selección o borrar item' },
    { nombre: 'FiSave', icon: FiSave, categoria: 'Acciones', uso: 'Guardar formularios' },
    { nombre: 'FiSend', icon: FiSend, categoria: 'Acciones', uso: 'Enviar ticket / reporte' },
    { nombre: 'FiSearch', icon: FiSearch, categoria: 'Acciones', uso: 'Barra de búsqueda reactiva' },
    { nombre: 'FiFilter', icon: FiFilter, categoria: 'Acciones', uso: 'Filtros de estado o fechas' },
    { nombre: 'FiDownload', icon: FiDownload, categoria: 'Acciones', uso: 'Exportación Excel / Reportes' },
    { nombre: 'FiRefreshCw', icon: FiRefreshCw, categoria: 'Acciones', uso: 'Refrescar datos / Cambiar foto' },
    { nombre: 'FiExternalLink', icon: FiExternalLink, categoria: 'Acciones', uso: 'Abrir detalle en nueva vista' },
    { nombre: 'FiMaximize2', icon: FiMaximize2, categoria: 'Acciones', uso: 'Zoom visor de evidencia' },
    { nombre: 'FiCheckCircle', icon: FiCheckCircle, categoria: 'Feedback / Éxito', uso: 'Orden completada, validación' },
    { nombre: 'FiAlertTriangle', icon: FiAlertTriangle, categoria: 'Feedback / Alerta', uso: 'Avisos críticos, rechazo' },
    { nombre: 'FiClock', icon: FiClock, categoria: 'Feedback / Tiempo', uso: 'Tiempo transcurrido, pendiente' },
    { nombre: 'FiInfo', icon: FiInfo, categoria: 'Feedback / Información', uso: 'Banners contextuales' },
    { nombre: 'FiShield', icon: FiShield, categoria: 'Seguridad', uso: 'Políticas, roles, mesa de ayuda' },
    { nombre: 'FiLock', icon: FiLock, categoria: 'Seguridad', uso: 'Contraseña, tarea bloqueada' },
    { nombre: 'FiServer', icon: FiServer, categoria: 'Hardware TI', uso: 'Servidores e infraestructura' },
    { nombre: 'FiCpu', icon: FiCpu, categoria: 'Hardware TI', uso: 'Procesamiento y cómputo' },
    { nombre: 'FiHardDrive', icon: FiHardDrive, categoria: 'Hardware TI', uso: 'Almacenamiento y discos' },
    { nombre: 'FiWifi', icon: FiWifi, categoria: 'Hardware TI', uso: 'Conectividad y redes' },
    { nombre: 'FiMenu', icon: FiMenu, categoria: 'Navegación', uso: 'Abrir menú lateral responsive' },
    { nombre: 'FiX', icon: FiX, categoria: 'Navegación / Modales', uso: 'Cerrar drawer o diálogo modal' },
    { nombre: 'FiChevronRight', icon: FiChevronRight, categoria: 'Navegación', uso: 'Breadcrumbs y migas de pan' },
    { nombre: 'FiArrowRight', icon: FiArrowRight, categoria: 'Navegación', uso: 'Avanzar / Ver detalles' },
    { nombre: 'FiCheck', icon: FiCheck, categoria: 'Feedback / Éxito', uso: 'Confirmación simple' },
    { nombre: 'FiEye', icon: FiEye, categoria: 'Formularios', uso: 'Mostrar contraseña' },
    { nombre: 'FiEyeOff', icon: FiEyeOff, categoria: 'Formularios', uso: 'Ocultar contraseña' },
    { nombre: 'FiUnlock', icon: FiUnlock, categoria: 'Seguridad', uso: 'Acceso desbloqueado' },
    { nombre: 'FiLayers', icon: FiLayers, categoria: 'Clasificación', uso: 'Categorías de incidencia' },
    { nombre: 'FiTag', icon: FiTag, categoria: 'Inventario', uso: 'Etiqueta de equipo' },
    { nombre: 'FiDatabase', icon: FiDatabase, categoria: 'Hardware TI', uso: 'Bases de datos y almacenamiento' },
    { nombre: 'FiCode', icon: FiCode, categoria: 'Desarrollo', uso: 'Código JSX y reutilización' },
  ];

  const iconosFiltrados = catalogoIconos.filter((item) =>
    item.nombre.toLowerCase().includes(busquedaIconos.toLowerCase()) ||
    item.categoria.toLowerCase().includes(busquedaIconos.toLowerCase()) ||
    item.uso.toLowerCase().includes(busquedaIconos.toLowerCase())
  );

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-16">
      {/* =========================================================================
          CABECERA HERO: IDENTIFICACIÓN DEL DESIGN SYSTEM
          ========================================================================= */}
      <header className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 sm:p-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl -z-0 pointer-events-none" />
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-primary-50 text-primary border border-primary-200">
                <FiSliders className="w-3.5 h-3.5" /> TAL-171: Guía de Estilo Oficial
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                <FiCheckCircle className="w-3.5 h-3.5" /> WCAG 2.1 AA Compliant
              </span>
              <span className="text-xs font-mono text-gray-600 bg-gray-100 px-2 py-0.5 rounded-md border border-gray-200">
                Ruta: /design-system
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">
              Sistema de Diseño & Catálogo de Componentes
            </h1>
            <p className="text-sm text-gray-600 max-w-3xl leading-relaxed">
              Galería centralizada de componentes reutilizables de <strong>InfraManager (UCT)</strong>.
              Documenta los 5 componentes principales del proyecto, sus estados interactivos
              (<strong>Default, Hover, Active/Focus, Disabled y Loading/Error</strong>), tokens de color
              institucional y lineamientos de reciclaje de código para el equipo Frontend.
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap flex-shrink-0">
            <Link
              to="/dashboard"
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition shadow-2xs"
            >
              <FiHome className="w-3.5 h-3.5" />
              <span>Volver a Dashboard</span>
            </Link>
            <Link
              to="/login"
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-primary bg-primary-50 border border-primary-200 rounded-lg hover:bg-primary-100 transition shadow-2xs"
            >
              <FiLock className="w-3.5 h-3.5" />
              <span>Ver en Login</span>
            </Link>
          </div>
        </div>

        {/* Barra de navegación por pestañas para filtrar componentes */}
        <div className="mt-8 pt-4 border-t border-gray-100 flex items-center gap-2 overflow-x-auto pb-1">
          {[
            { id: 'todos', label: 'Todos los Componentes' },
            { id: 'botones-primarios', label: '1. Botones Primarios' },
            { id: 'botones-secundarios', label: '2. Botones Secundarios' },
            { id: 'badges-estado', label: '3. Badges de Estado' },
            { id: 'inputs-formulario', label: '4. Inputs y Formularios' },
            { id: 'iconos-sistema', label: '5. Íconos del Sistema' },
            { id: 'tokens-color', label: 'Tokens & Paleta UCT' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap cursor-pointer ${
                activeTab === tab.id
                  ? 'bg-primary text-white shadow-sm'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </header>

      {/* =========================================================================
          PANEL DE CONTROL INTERACTIVO (PLAYGROUND GLOBAL)
          ========================================================================= */}
      <section className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <FiSliders className="text-primary w-4 h-4" />
            <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider">
              Controlador de Estados Interactivos (Playground)
            </h2>
          </div>
          <span className="text-xs text-gray-500">
            Alterna los interruptores para observar cómo reaccionan los componentes a nivel de accesibilidad y UI.
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-4 pt-2 border-t border-gray-100 text-xs">
          <label className="inline-flex items-center gap-2 cursor-pointer font-medium text-gray-700 select-none">
            <input
              type="checkbox"
              checked={simularDisabled}
              onChange={(e) => setSimularDisabled(e.target.checked)}
              className="w-4 h-4 text-primary rounded border-gray-300 focus:ring-primary/20"
            />
            <span>Forzar estado <strong>Disabled (deshabilitado)</strong></span>
          </label>

          <label className="inline-flex items-center gap-2 cursor-pointer font-medium text-gray-700 select-none">
            <input
              type="checkbox"
              checked={simularLoading}
              onChange={(e) => setSimularLoading(e.target.checked)}
              className="w-4 h-4 text-primary rounded border-gray-300 focus:ring-primary/20"
            />
            <span>Forzar estado <strong>Loading / Procesando</strong></span>
          </label>

          <div className="flex items-center gap-2 ml-auto">
            <span className="text-gray-500">Texto demo botón:</span>
            <input
              type="text"
              value={textoBotonDemo}
              onChange={(e) => setTextoBotonDemo(e.target.value)}
              className="px-2.5 py-1 border border-gray-300 rounded-md text-xs font-medium focus:ring-1 focus:ring-primary outline-none"
            />
          </div>
        </div>
      </section>

      {/* =========================================================================
          COMPONENTE 1: BOTONES PRIMARIOS (PRIMARY BUTTONS)
          ========================================================================= */}
      {(activeTab === 'todos' || activeTab === 'botones-primarios') && (
        <section id="botones-primarios" className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 sm:p-8 space-y-6">
          <div className="border-b border-gray-100 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <span className="text-xs font-mono font-bold text-primary uppercase tracking-wider">Componente 1 de 5</span>
              <h2 className="text-xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
                Botones Primarios (Primary Buttons)
              </h2>
              <p className="text-xs text-gray-600 mt-1">
                Utilizados para la acción principal y decisiva de cada vista (ej. "Ingresar", "Enviar Incidencia", "Guardar", "Finalizar").
                Basados en el color institucional UCT <code>--color-primary (#003366)</code> y radios uniformes <code>rounded-lg</code>.
              </p>
            </div>
            <button
              type="button"
              onClick={() => copiarCodigo(
                '<button type="button" className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-primary hover:bg-primary-hover active:bg-primary-active text-white rounded-lg font-semibold text-sm shadow-sm hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none cursor-pointer">\n  <FiPlus className="w-4 h-4" />\n  <span>Crear Registro</span>\n</button>',
                'Botón Primario Estándar'
              )}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-700 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg transition-colors cursor-pointer self-start"
            >
              <FiCopy className="w-3.5 h-3.5" />
              <span>Copiar Snippet JSX</span>
            </button>
          </div>

          {/* Matriz de Estados de Botón Primario */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Estado 1: Default / Normal */}
            <div className="p-4 rounded-xl border border-gray-200 bg-gray-50/60 space-y-3 flex flex-col justify-between">
              <div>
                <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Estado 1: Normal (Default)</span>
                <p className="text-xs text-gray-600 mt-0.5">Reposo estándar con sombra suave y contraste WCAG &ge; 4.5:1.</p>
              </div>
              <div className="py-3 flex justify-center">
                <button
                  type="button"
                  onClick={() => showToast('Clic en Botón Primario Normal', 'info')}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-primary text-white rounded-lg font-semibold text-sm shadow-sm cursor-pointer"
                >
                  <FiPlus className="w-4 h-4" />
                  <span>{textoBotonDemo}</span>
                </button>
              </div>
              <span className="font-mono text-[11px] text-gray-500 bg-white p-1.5 rounded border border-gray-200 block truncate">
                bg-primary text-white rounded-lg
              </span>
            </div>

            {/* Estado 2: Hover (Interactivo y Demostrado) */}
            <div className="p-4 rounded-xl border border-gray-200 bg-gray-50/60 space-y-3 flex flex-col justify-between">
              <div>
                <span className="text-[11px] font-bold text-primary uppercase tracking-wider">Estado 2: Hover (Interactivo)</span>
                <p className="text-xs text-gray-600 mt-0.5">Oscurecimiento a #00254d, elevación sutil -translate-y-0.5 y sombra profunda.</p>
              </div>
              <div className="py-3 flex justify-center">
                <button
                  type="button"
                  onClick={() => showToast('Clic en Botón Primario con Hover Activo', 'info')}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-primary hover:bg-primary-hover text-white rounded-lg font-semibold text-sm shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all cursor-pointer"
                >
                  <FiSend className="w-4 h-4" />
                  <span>Pasar Cursor (Hover)</span>
                </button>
              </div>
              <span className="font-mono text-[11px] text-gray-500 bg-white p-1.5 rounded border border-gray-200 block truncate">
                hover:bg-primary-hover hover:-translate-y-0.5
              </span>
            </div>

            {/* Estado 3: Active & Focus Accessible */}
            <div className="p-4 rounded-xl border border-gray-200 bg-gray-50/60 space-y-3 flex flex-col justify-between">
              <div>
                <span className="text-[11px] font-bold text-primary-900 uppercase tracking-wider">Estado 3: Active / Focus Ring</span>
                <p className="text-xs text-gray-600 mt-0.5">Anillo de foco accesible <code>focus-visible:ring-2</code> conforme a TAL-173.</p>
              </div>
              <div className="py-3 flex justify-center">
                <button
                  type="button"
                  onClick={() => showToast('Botón presionado (Active)', 'info')}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-primary-900 text-white rounded-lg font-semibold text-sm shadow-inner ring-2 ring-primary ring-offset-2 transition-all cursor-pointer"
                >
                  <FiSave className="w-4 h-4" />
                  <span>Foco / Presionado</span>
                </button>
              </div>
              <span className="font-mono text-[11px] text-gray-500 bg-white p-1.5 rounded border border-gray-200 block truncate">
                focus-visible:ring-2 ring-primary
              </span>
            </div>

            {/* Estado 4: Disabled (Deshabilitado) */}
            <div className="p-4 rounded-xl border border-gray-200 bg-gray-50/60 space-y-3 flex flex-col justify-between">
              <div>
                <span className="text-[11px] font-bold text-red-600 uppercase tracking-wider">Estado 4: Disabled (Bloqueado)</span>
                <p className="text-xs text-gray-600 mt-0.5">Opacidad al 50%, cursor not-allowed y eventos de puntero desactivados.</p>
              </div>
              <div className="py-3 flex justify-center">
                <button
                  type="button"
                  disabled={true}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-primary text-white rounded-lg font-semibold text-sm opacity-50 cursor-not-allowed pointer-events-none"
                >
                  <FiLock className="w-4 h-4" />
                  <span>Deshabilitado</span>
                </button>
              </div>
              <span className="font-mono text-[11px] text-gray-500 bg-white p-1.5 rounded border border-gray-200 block truncate">
                disabled:opacity-50 disabled:cursor-not-allowed
              </span>
            </div>
          </div>

          {/* Variantes adicionales: Loading y Escala de Tamaños */}
          <div className="pt-4 border-t border-gray-100 flex flex-wrap items-center justify-between gap-4">
            <div className="space-y-1">
              <span className="text-xs font-semibold text-gray-700">Estado de Carga Asíncrono (Loading Spinner):</span>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  disabled={true}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-primary text-white rounded-lg font-semibold text-sm opacity-80 cursor-wait"
                >
                  <svg className="animate-spin -ml-1 mr-1 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
                  </svg>
                  <span>Procesando solicitud...</span>
                </button>
              </div>
            </div>

            <div className="space-y-1">
              <span className="text-xs font-semibold text-gray-700">Escala de Tamaños (SM, MD, LG):</span>
              <div className="flex items-center gap-2">
                <button type="button" className="px-2.5 py-1.5 text-xs font-semibold bg-primary text-white rounded-lg shadow-2xs">
                  Pequeño (sm)
                </button>
                <button type="button" className="px-4 py-2.5 text-sm font-semibold bg-primary text-white rounded-lg shadow-sm">
                  Normal (md)
                </button>
                <button type="button" className="px-6 py-3 text-base font-bold bg-primary text-white rounded-lg shadow-md">
                  Grande (lg)
                </button>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* =========================================================================
          COMPONENTE 2: BOTONES SECUNDARIOS Y DE ACCIÓN (SECONDARY BUTTONS)
          ========================================================================= */}
      {(activeTab === 'todos' || activeTab === 'botones-secundarios') && (
        <section id="botones-secundarios" className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 sm:p-8 space-y-6">
          <div className="border-b border-gray-100 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <span className="text-xs font-mono font-bold text-secondary uppercase tracking-wider">Componente 2 de 5</span>
              <h2 className="text-xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
                Botones Secundarios, Outlined y Acciones Especiales
              </h2>
              <p className="text-xs text-gray-600 mt-1">
                Utilizados para acciones secundarias, cancelaciones, filtros, exportaciones o tareas con consecuencias destructivas/positivas.
              </p>
            </div>
            <button
              type="button"
              onClick={() => copiarCodigo(
                '<button type="button" className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-primary-50 text-primary border border-primary-200 rounded-lg hover:bg-primary-100 font-semibold text-sm transition-all focus-visible:ring-2 focus-visible:ring-primary shadow-2xs disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer">\n  <span>Asignar Técnico</span>\n</button>',
                'Botón Secundario Tonal UCT'
              )}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-700 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg transition-colors cursor-pointer self-start"
            >
              <FiCopy className="w-3.5 h-3.5" />
              <span>Copiar Snippet JSX</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Variante 1: Secundario Tonal / Suave */}
            <div className="p-4 rounded-xl border border-gray-200 bg-gray-50/60 space-y-3 flex flex-col justify-between">
              <div>
                <span className="text-[11px] font-bold text-primary uppercase tracking-wider">Secundario Tonal (UCT Soft)</span>
                <p className="text-xs text-gray-600 mt-0.5">Ideal para acciones de soporte como "Asignar Técnico" o "Trazabilidad".</p>
              </div>
              <div className="py-3 flex flex-col gap-2 items-center">
                <button
                  type="button"
                  disabled={simularDisabled}
                  className="w-full inline-flex items-center justify-center gap-2 px-3.5 py-2.5 bg-primary-50 text-primary border border-primary-200 rounded-lg hover:bg-primary-100 font-semibold text-sm transition-all shadow-2xs disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  <FiUserCheck className="w-4 h-4" />
                  <span>Acción Tonal</span>
                </button>
                <button
                  type="button"
                  disabled={true}
                  className="w-full inline-flex items-center justify-center gap-2 px-3 py-1.5 bg-primary-50 text-primary border border-primary-200 rounded-lg font-medium text-xs opacity-50 cursor-not-allowed"
                >
                  <span>Tonal Disabled</span>
                </button>
              </div>
              <span className="font-mono text-[11px] text-gray-500 bg-white p-1.5 rounded border border-gray-200 block truncate">
                bg-primary-50 text-primary border-primary-200
              </span>
            </div>

            {/* Variante 2: Secundario Outline / Neutro */}
            <div className="p-4 rounded-xl border border-gray-200 bg-gray-50/60 space-y-3 flex flex-col justify-between">
              <div>
                <span className="text-[11px] font-bold text-gray-700 uppercase tracking-wider">Secundario Outline (Neutro)</span>
                <p className="text-xs text-gray-600 mt-0.5">Acciones como "Volver", "Cancelar" o "Limpiar Filtros".</p>
              </div>
              <div className="py-3 flex flex-col gap-2 items-center">
                <button
                  type="button"
                  disabled={simularDisabled}
                  className="w-full inline-flex items-center justify-center gap-2 px-3.5 py-2.5 bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 hover:text-gray-900 rounded-lg font-semibold text-sm transition-all shadow-2xs disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  <FiArrowLeft className="w-4 h-4" />
                  <span>Volver / Cancelar</span>
                </button>
                <button
                  type="button"
                  disabled={true}
                  className="w-full inline-flex items-center justify-center gap-2 px-3 py-1.5 bg-white border border-gray-300 text-gray-400 rounded-lg font-medium text-xs opacity-50 cursor-not-allowed"
                >
                  <span>Outline Disabled</span>
                </button>
              </div>
              <span className="font-mono text-[11px] text-gray-500 bg-white p-1.5 rounded border border-gray-200 block truncate">
                bg-white border-gray-300 text-gray-700
              </span>
            </div>

            {/* Variante 3: Acción Positiva / Éxito (Success) */}
            <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/30 space-y-3 flex flex-col justify-between">
              <div>
                <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider">Acción Éxito (Completar / Excel)</span>
                <p className="text-xs text-gray-600 mt-0.5">Para "Finalizar Tarea", "Aprobar Orden" o "Exportar Excel".</p>
              </div>
              <div className="py-3 flex flex-col gap-2 items-center">
                <button
                  type="button"
                  disabled={simularDisabled}
                  className="w-full inline-flex items-center justify-center gap-2 px-3.5 py-2.5 bg-emerald-700 hover:bg-emerald-800 active:scale-95 text-white rounded-lg font-bold text-sm shadow-xs transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  <FiCheckCircle className="w-4 h-4" />
                  <span>Finalizar Tarea</span>
                </button>
                <button
                  type="button"
                  disabled={simularDisabled}
                  className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100 rounded-lg text-xs font-semibold transition-all disabled:opacity-50 cursor-pointer"
                >
                  <FiDownload className="w-3.5 h-3.5" />
                  <span>Exportar Excel</span>
                </button>
              </div>
              <span className="font-mono text-[11px] text-gray-500 bg-white p-1.5 rounded border border-gray-200 block truncate">
                bg-emerald-700 hover:bg-emerald-800 text-white
              </span>
            </div>

            {/* Variante 4: Acción Crítica / Destructiva (Danger) */}
            <div className="p-4 rounded-xl border border-red-200 bg-red-50/30 space-y-3 flex flex-col justify-between">
              <div>
                <span className="text-[11px] font-bold text-red-700 uppercase tracking-wider">Acción Crítica (Rechazo / Eliminar)</span>
                <p className="text-xs text-gray-600 mt-0.5">Para "Rechazar Incidencia", "Descartar Evidencia" o "Eliminar".</p>
              </div>
              <div className="py-3 flex flex-col gap-2 items-center">
                <button
                  type="button"
                  disabled={simularDisabled}
                  className="w-full inline-flex items-center justify-center gap-2 px-3.5 py-2.5 bg-red-700 hover:bg-red-800 text-white rounded-lg font-bold text-sm shadow-xs transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  <FiAlertTriangle className="w-4 h-4" />
                  <span>Rechazar Ticket</span>
                </button>
                <button
                  type="button"
                  disabled={simularDisabled}
                  className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-1.5 bg-red-50 text-red-700 border border-red-200 hover:bg-red-100 rounded-lg text-xs font-semibold transition-all disabled:opacity-50 cursor-pointer"
                >
                  <FiTrash2 className="w-3.5 h-3.5" />
                  <span>Limpiar Evidencia</span>
                </button>
              </div>
              <span className="font-mono text-[11px] text-gray-500 bg-white p-1.5 rounded border border-gray-200 block truncate">
                bg-red-700 hover:bg-red-800 text-white
              </span>
            </div>
          </div>
        </section>
      )}

      {/* =========================================================================
          COMPONENTE 3: BADGES DE ESTADO Y PRIORIDAD (STATUS BADGES)
          ========================================================================= */}
      {(activeTab === 'todos' || activeTab === 'badges-estado') && (
        <section id="badges-estado" className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 sm:p-8 space-y-6">
          <div className="border-b border-gray-100 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <span className="text-xs font-mono font-bold text-primary uppercase tracking-wider">Componente 3 de 5</span>
              <h2 className="text-xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
                Badges de Estado y Prioridad (StatusBadge)
              </h2>
              <p className="text-xs text-gray-600 mt-1">
                Etiquetas visuales de estado para incidencias, órdenes de trabajo, equipos y mantenimientos.
                Utiliza el componente compartido <code>&lt;StatusBadge status="..." /&gt;</code>.
              </p>
            </div>
            <button
              type="button"
              onClick={() => copiarCodigo(
                "import StatusBadge from '../components/StatusBadge';\n\n<StatusBadge status=\"Pendiente\" />\n<StatusBadge status=\"En Progreso\" />\n<StatusBadge status=\"Completada\" />\n<StatusBadge status=\"Rechazado\" />",
                'StatusBadge Import'
              )}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-700 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg transition-colors cursor-pointer self-start"
            >
              <FiCopy className="w-3.5 h-3.5" />
              <span>Copiar Snippet JSX</span>
            </button>
          </div>

          {/* Grilla de Estados Operativos Reales */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold text-gray-800 uppercase tracking-wider">
              1. Estados del Ciclo de Vida de Incidencias y Órdenes
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
              {[
                { label: 'Pendiente', desc: 'Reporte ingresado' },
                { label: 'Asignada', desc: 'Con técnico asignado' },
                { label: 'En Progreso', desc: 'En resolución activa' },
                { label: 'Completada', desc: 'Cierre de mantenimiento' },
                { label: 'Rechazado', desc: 'Rechazado con motivo' },
                { label: 'Cerrada', desc: 'Archivo final' },
              ].map((item) => (
                <div key={item.label} className="p-3 bg-gray-50 rounded-xl border border-gray-200 text-center space-y-2 hover:border-gray-300 transition-colors">
                  <div className="flex justify-center">
                    <StatusBadge status={item.label} />
                  </div>
                  <p className="text-[11px] text-gray-500 font-medium leading-tight">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Badges de Niveles de Prioridad y Severidad */}
          <div className="space-y-4 pt-4 border-t border-gray-100">
            <h3 className="text-xs font-bold text-gray-800 uppercase tracking-wider">
              2. Niveles de Severidad y Prioridad Operativa
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 bg-red-50/50 rounded-xl border border-red-200 text-center space-y-1.5">
                <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-bold text-red-800 bg-red-50 border border-red-200">
                  CRÍTICA
                </span>
                <p className="text-[11px] text-red-900 font-medium">Interrupción total de servicio</p>
              </div>

              <div className="p-3 bg-orange-50/50 rounded-xl border border-orange-200 text-center space-y-1.5">
                <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-bold text-orange-800 bg-orange-50 border border-orange-200">
                  ALTA
                </span>
                <p className="text-[11px] text-orange-900 font-medium">Degradación de hardware clave</p>
              </div>

              <div className="p-3 bg-yellow-50/50 rounded-xl border border-yellow-200 text-center space-y-1.5">
                <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-bold text-yellow-800 bg-yellow-50 border border-yellow-200">
                  MEDIA
                </span>
                <p className="text-[11px] text-yellow-900 font-medium">Afectación parcial de terminales</p>
              </div>

              <div className="p-3 bg-emerald-50/50 rounded-xl border border-emerald-200 text-center space-y-1.5">
                <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-bold text-emerald-800 bg-emerald-50 border border-emerald-200">
                  BAJA / OPERATIVO
                </span>
                <p className="text-[11px] text-emerald-900 font-medium">Anomalía menor o preventiva</p>
              </div>
            </div>
          </div>

          {/* Badges como Filtros Interactivos (Hover, Active con Contador) */}
          <div className="space-y-4 pt-4 border-t border-gray-100">
            <h3 className="text-xs font-bold text-gray-800 uppercase tracking-wider">
              3. Badges de Filtrado Interactivo (con conteo reactivo)
            </h3>
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-3 py-1.5 rounded-lg text-xs font-bold bg-primary text-white shadow-2xs cursor-pointer flex items-center gap-1.5">
                <span>Todas</span>
                <span className="bg-white/20 text-white px-1.5 py-0.2 rounded-full text-[10px]">42</span>
              </span>
              <span className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors cursor-pointer flex items-center gap-1.5">
                <span>Mis Asignadas</span>
                <span className="bg-gray-200 text-gray-800 px-1.5 py-0.2 rounded-full text-[10px]">8</span>
              </span>
              <span className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors cursor-pointer flex items-center gap-1.5">
                <span>Pendientes</span>
                <span className="bg-yellow-200 text-yellow-800 px-1.5 py-0.2 rounded-full text-[10px]">14</span>
              </span>
              <span className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors cursor-pointer flex items-center gap-1.5">
                <span>Rechazados</span>
                <span className="bg-red-200 text-red-800 px-1.5 py-0.2 rounded-full text-[10px]">3</span>
              </span>
            </div>
          </div>
        </section>
      )}

      {/* =========================================================================
          COMPONENTE 4: INPUTS Y CONTROLES DE FORMULARIO (FORM CONTROLS)
          ========================================================================= */}
      {(activeTab === 'todos' || activeTab === 'inputs-formulario') && (
        <section id="inputs-formulario" className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 sm:p-8 space-y-6">
          <div className="border-b border-gray-100 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <span className="text-xs font-mono font-bold text-primary uppercase tracking-wider">Componente 4 de 5</span>
              <h2 className="text-xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
                Inputs y Controles de Formulario (Form Controls)
              </h2>
              <p className="text-xs text-gray-600 mt-1">
                Campos de captura con soporte para estados <strong>Default, Hover, Focus, Disabled y Error de Validación</strong>.
                Todos implementan <code>rounded-lg</code>, anillos de foco <code>focus:ring-2 focus:ring-primary/20 focus:border-primary</code>.
              </p>
            </div>
            <button
              type="button"
              onClick={() => copiarCodigo(
                '<div className="space-y-1.5">\n  <label htmlFor="campo-demo" className="block text-sm font-medium text-gray-700">\n    Nombre del Activo <span className="text-red-500">*</span>\n  </label>\n  <input\n    type="text"\n    id="campo-demo"\n    placeholder="Ej. UCT-SRV-01"\n    className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none text-sm transition-all bg-white hover:border-gray-400 disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed"\n  />\n</div>',
                'Input de Texto Estándar'
              )}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-700 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg transition-colors cursor-pointer self-start"
            >
              <FiCopy className="w-3.5 h-3.5" />
              <span>Copiar Snippet JSX</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Input 1: Normal con Valor y Hover */}
            <div className="space-y-2 p-4 bg-gray-50/60 rounded-xl border border-gray-200">
              <div className="flex justify-between items-center">
                <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                  1. Input de Texto con Icono (Default / Filled)
                </label>
                <span className="text-[10px] text-primary font-bold bg-primary-50 px-2 py-0.5 rounded border border-primary-200">
                  Normal & Focus
                </span>
              </div>
              <div className="relative">
                <FiBox className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  value={inputDemoVal}
                  onChange={(e) => setInputDemoVal(e.target.value)}
                  disabled={simularDisabled}
                  placeholder="Ingrese identificador del equipo..."
                  className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-300 hover:border-gray-400 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed"
                />
              </div>
              <p className="text-[11px] text-gray-500">Muestra icono decorativo y respuesta al foco con anillo institucional.</p>
            </div>

            {/* Input 2: Estado Error con Mensaje de Validación */}
            <div className="space-y-2 p-4 bg-red-50/30 rounded-xl border border-red-200">
              <div className="flex justify-between items-center">
                <label className="text-xs font-bold text-red-800 uppercase tracking-wider">
                  2. Input en Estado de Error (Validación)
                </label>
                <span className="text-[10px] text-red-700 font-bold bg-red-100 px-2 py-0.5 rounded border border-red-200">
                  Error
                </span>
              </div>
              <div className="relative">
                <FiAlertCircle className="absolute left-3.5 top-1/2 -translate-y-1/2 text-red-500 w-4 h-4" />
                <input
                  type="text"
                  defaultValue="ACT-INV"
                  disabled={simularDisabled}
                  className="w-full pl-10 pr-4 py-2.5 bg-red-50/20 border border-red-400 rounded-lg text-sm text-red-900 focus:outline-none focus:ring-2 focus:ring-red-300 focus:border-red-500 transition-all disabled:opacity-50"
                />
              </div>
              <p className="text-[11px] text-red-600 font-medium flex items-center gap-1">
                <FiAlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                El identificador del activo no existe en el catálogo institucional.
              </p>
            </div>

            {/* Input 3: Barra de Búsqueda Reactiva */}
            <div className="space-y-2 p-4 bg-gray-50/60 rounded-xl border border-gray-200">
              <div className="flex justify-between items-center">
                <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                  3. Barra de Búsqueda Rápida
                </label>
                <span className="text-[10px] text-gray-600 font-semibold bg-white px-2 py-0.5 rounded border border-gray-200">
                  Search
                </span>
              </div>
              <div className="relative">
                <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  value={searchDemoVal}
                  onChange={(e) => setSearchDemoVal(e.target.value)}
                  disabled={simularDisabled}
                  placeholder="Buscar por serie, modelo o ubicación..."
                  className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all shadow-2xs disabled:bg-gray-100 disabled:cursor-not-allowed"
                />
              </div>
              <p className="text-[11px] text-gray-500">Usado en <code>Incidencias.jsx</code>, <code>Inventario.jsx</code> y <code>Usuarios.jsx</code>.</p>
            </div>

            {/* Input 4: Select / Menú Desplegable */}
            <div className="space-y-2 p-4 bg-gray-50/60 rounded-xl border border-gray-200">
              <div className="flex justify-between items-center">
                <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                  4. Selector Desplegable (Select)
                </label>
                <span className="text-[10px] text-gray-600 font-semibold bg-white px-2 py-0.5 rounded border border-gray-200">
                  Select
                </span>
              </div>
              <select
                value={selectDemoVal}
                onChange={(e) => setSelectDemoVal(e.target.value)}
                disabled={simularDisabled}
                className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed"
              >
                <option value="hardware">Hardware / Equipos Físicos</option>
                <option value="software">Software y Sistemas Operativos</option>
                <option value="redes">Redes y Conectividad</option>
                <option value="seguridad">Seguridad y Certificados</option>
              </select>
              <p className="text-[11px] text-gray-500">Categorización estandarizada para formularios de registro.</p>
            </div>
          </div>

          {/* Textarea Multilínea */}
          <div className="space-y-2 p-4 bg-gray-50/60 rounded-xl border border-gray-200">
            <div className="flex justify-between items-center">
              <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                5. Área de Texto Multilínea (Textarea con Contador)
              </label>
              <span className="text-[10px] font-mono text-gray-500 bg-white px-2 py-0.5 rounded border border-gray-200">
                {textareaDemoVal.length} / 500 caracteres
              </span>
            </div>
            <textarea
              rows={3}
              value={textareaDemoVal}
              onChange={(e) => setTextareaDemoVal(e.target.value)}
              disabled={simularDisabled}
              placeholder="Describa los síntomas observados..."
              className="w-full p-3 bg-white border border-gray-300 hover:border-gray-400 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all resize-y disabled:bg-gray-100 disabled:cursor-not-allowed"
            />
          </div>
        </section>
      )}

      {/* =========================================================================
          COMPONENTE 5: CATÁLOGO DE ÍCONOS DEL SISTEMA (ICONOGRAPHY)
          ========================================================================= */}
      {(activeTab === 'todos' || activeTab === 'iconos-sistema') && (
        <section id="iconos-sistema" className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 sm:p-8 space-y-6">
          <div className="border-b border-gray-100 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <span className="text-xs font-mono font-bold text-primary uppercase tracking-wider">Componente 5 de 5</span>
              <h2 className="text-xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
                Íconos del Sistema (Iconography Catalog)
              </h2>
              <p className="text-xs text-gray-600 mt-1">
                Catálogo representativo de íconos de la suite <code>react-icons/fi</code> y <code>react-icons/io5</code> utilizados
                en barras de navegación, botones, alertas y tablas. Haz clic sobre cualquier ícono para copiar su código de importación.
              </p>
            </div>

            <div className="relative w-full sm:w-72">
              <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={busquedaIconos}
                onChange={(e) => setBusquedaIconos(e.target.value)}
                placeholder="Filtrar por nombre o uso..."
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {iconosFiltrados.map((item) => {
              const IconComponent = item.icon;
              return (
                <button
                  key={item.nombre}
                  type="button"
                  onClick={() => copiarCodigo(`import { ${item.nombre} } from 'react-icons/fi';`, item.nombre)}
                  className="group p-3 bg-gray-50/80 hover:bg-primary-50/80 rounded-xl border border-gray-200 hover:border-primary-300 text-center space-y-2 transition-all cursor-pointer flex flex-col items-center justify-between"
                  title={`Clic para copiar import de ${item.nombre}`}
                >
                  <div className="w-10 h-10 rounded-lg bg-white group-hover:bg-primary text-gray-700 group-hover:text-white flex items-center justify-center text-lg shadow-2xs border border-gray-100 transition-all group-hover:scale-110">
                    <IconComponent />
                  </div>
                  <div className="w-full">
                    <span className="font-mono text-xs font-bold text-gray-800 group-hover:text-primary block truncate">
                      {item.nombre}
                    </span>
                    <span className="text-[10px] text-gray-600 block truncate mt-0.5">
                      {item.uso}
                    </span>
                  </div>
                  <span className="text-[9px] uppercase tracking-wider font-semibold text-primary/70 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                    <FiCopy className="w-2.5 h-2.5" /> Copiar
                  </span>
                </button>
              );
            })}
          </div>

          {iconosFiltrados.length === 0 && (
            <div className="text-center py-8 text-gray-500 text-xs">
              No se encontraron íconos coincidentes con "{busquedaIconos}".
            </div>
          )}
        </section>
      )}

      {/* =========================================================================
          SECCIÓN EXTRA: TOKENS DE IDENTIDAD VISUAL CORPORATIVA (UCT PALETTE)
          ========================================================================= */}
      {(activeTab === 'todos' || activeTab === 'tokens-color') && (
        <section id="tokens-color" className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 sm:p-8 space-y-6">
          <div className="border-b border-gray-100 pb-4">
            <span className="text-xs font-mono font-bold text-primary uppercase tracking-wider">Identidad Corporativa</span>
            <h2 className="text-xl font-bold text-gray-900 tracking-tight">
              Tokens de Color, Tipografía y Radios (UCT)
            </h2>
            <p className="text-xs text-gray-600 mt-1">
              Valores configurados en <code>frontend-web/src/index.css</code> (@theme) conforme a los estándares de TAL-148.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Color 1: Primario UCT */}
            <div className="rounded-xl border border-gray-200 overflow-hidden shadow-2xs">
              <div className="h-20 bg-primary flex items-end p-3 text-white">
                <span className="font-mono text-xs font-bold">#003366</span>
              </div>
              <div className="p-3 bg-white space-y-1">
                <h4 className="text-xs font-bold text-gray-900">Azul Primario UCT</h4>
                <p className="text-[11px] text-gray-500"><code>--color-primary</code>: Botones principales, enlaces y encabezados.</p>
              </div>
            </div>

            {/* Color 2: Secundario UCT */}
            <div className="rounded-xl border border-gray-200 overflow-hidden shadow-2xs">
              <div className="h-20 bg-secondary flex items-end p-3 text-white">
                <span className="font-mono text-xs font-bold">#d97706</span>
              </div>
              <div className="p-3 bg-white space-y-1">
                <h4 className="text-xs font-bold text-gray-900">Ámbar Secundario</h4>
                <p className="text-[11px] text-gray-500"><code>--color-secondary</code>: Acentos, mantenimientos y llamados.</p>
              </div>
            </div>

            {/* Color 3: Éxito / Esmeralda */}
            <div className="rounded-xl border border-gray-200 overflow-hidden shadow-2xs">
              <div className="h-20 bg-emerald-700 flex items-end p-3 text-white">
                <span className="font-mono text-xs font-bold">#047857</span>
              </div>
              <div className="p-3 bg-white space-y-1">
                <h4 className="text-xs font-bold text-gray-900">Verde Esmeralda</h4>
                <p className="text-[11px] text-gray-500">Tareas resueltas, aprobación y exportación Excel.</p>
              </div>
            </div>

            {/* Color 4: Alerta / Peligro */}
            <div className="rounded-xl border border-gray-200 overflow-hidden shadow-2xs">
              <div className="h-20 bg-red-700 flex items-end p-3 text-white">
                <span className="font-mono text-xs font-bold">#b91c1c</span>
              </div>
              <div className="p-3 bg-white space-y-1">
                <h4 className="text-xs font-bold text-gray-900">Rojo Alerta Crítica</h4>
                <p className="text-[11px] text-gray-500">Rechazo con motivo, fallas críticas e inputs erróneos.</p>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* =========================================================================
          PIE DE PÁGINA INFORMATIVO
          ========================================================================= */}
      <footer className="text-center text-xs text-gray-600 py-4 border-t border-gray-200">
        <p>InfraManager TI &bull; Universidad Católica de Temuco &bull; Guía de Estilo Oficial TAL-171</p>
      </footer>
    </div>
  );
};

export default DesignSystem;
