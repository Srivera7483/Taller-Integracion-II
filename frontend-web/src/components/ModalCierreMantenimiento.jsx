import React, { useState, useEffect } from 'react';
import {
  FiX,
  FiCheckCircle,
  FiClock,
  FiLayers,
  FiPlus,
  FiTrash2,
  FiShield,
  FiAlertTriangle,
  FiTool,
  FiCheck,
  FiBox,
  FiFileText,
  FiUser
} from 'react-icons/fi';
import { useToast } from '../context/ToastContext';
import { completarMantenimientoTecnico } from '../services/incidenciasStorage';
import api from '../services/api';

// Lista de materiales e insumos comunes para selección rápida táctil en tablets
const MATERIALES_FRECUENTES = [
  'Cable UTP Cat 6 (mts)',
  'Conectores RJ45 (pack)',
  'Pasta Térmica',
  'Patch Cord 2m',
  'Disco SSD 500GB',
  'Memoria RAM 8GB',
  'Fusible 10A',
  'Cinta Aislante 3M',
  'Tornillería estándar',
  'Limpiador de Contactos'
];

/**
 * Modal de Confirmación de Mantenimiento Técnico.
 * Permite al técnico asignado rendir cuentas de su trabajo especificando:
 * - Resolución
 * - Horas invertidas
 * - Materiales usados
 * Cambiando el estado de la incidencia a "Completada".
 */
const ModalCierreMantenimiento = ({
  isOpen,
  onClose,
  orden,
  tecnicoActual,
  onCierreExitoso
}) => {
  const { showToast } = useToast();

  // Estados del formulario
  const [resolucion, setResolucion] = useState('');
  const [horasInvertidas, setHorasInvertidas] = useState(1.5);
  const [materialesUsados, setMaterialesUsados] = useState([]);
  const [nuevoMaterialTexto, setNuevoMaterialTexto] = useState('');
  const [cantidadMaterial, setCantidadMaterial] = useState(1);
  const [sinMateriales, setSinMateriales] = useState(false);

  // Estado para prevenir Double Submit
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorValidacion, setErrorValidacion] = useState(null);

  // Reiniciar estado cuando se abre para una nueva orden
  useEffect(() => {
    if (isOpen && orden) {
      setResolucion(orden.resolucion || orden.diagnostico_tecnico || '');
      setHorasInvertidas(orden.horasInvertidas || 1.5);
      setMaterialesUsados(orden.materialesUsados || []);
      setNuevoMaterialTexto('');
      setCantidadMaterial(1);
      setSinMateriales(false);
      setIsSubmitting(false);
      setErrorValidacion(null);
    }
  }, [isOpen, orden]);

  if (!isOpen || !orden) return null;

  // Validación de Ownership / Asignación:
  // Solo el técnico asignado a esta tarea específica puede acceder al formulario finalizativo.
  const nombreAsignado = (orden.tecnico_nombre || orden.asignado || '').trim().toLowerCase();
  const nombreActual = (tecnicoActual?.nombre || '').trim().toLowerCase();
  
  const esTecnicoAsignado =
    Boolean(nombreAsignado) &&
    (nombreAsignado === nombreActual ||
      nombreAsignado.includes(nombreActual) ||
      nombreActual.includes(nombreAsignado) ||
      orden.tecnico_id === tecnicoActual?.id);

  // Validación del formulario
  const resolucionValida = resolucion.trim().length >= 10;
  const horasValidas = Number(horasInvertidas) > 0;
  const isFormValid = resolucionValida && horasValidas;

  // Manejadores para Horas (Touch Stepper)
  const incrementarHoras = (cantidad = 0.5) => {
    setHorasInvertidas((prev) => Math.min(24, Math.round((Number(prev) + cantidad) * 10) / 10));
  };

  const decrementarHoras = (cantidad = 0.5) => {
    setHorasInvertidas((prev) => Math.max(0.5, Math.round((Number(prev) - cantidad) * 10) / 10));
  };

  const setHorasPreset = (h) => {
    setHorasInvertidas(h);
  };

  // Manejadores para Materiales
  const agregarMaterialPreset = (nombre) => {
    if (sinMateriales) setSinMateriales(false);
    const yaExiste = materialesUsados.find((m) => m.nombre === nombre);
    if (yaExiste) {
      setMaterialesUsados((prev) =>
        prev.map((m) =>
          m.nombre === nombre ? { ...m, cantidad: m.cantidad + 1 } : m
        )
      );
    } else {
      setMaterialesUsados((prev) => [...prev, { nombre, cantidad: 1 }]);
    }
  };

  const agregarMaterialCustom = (e) => {
    if (e) e.preventDefault();
    if (!nuevoMaterialTexto.trim()) return;
    if (sinMateriales) setSinMateriales(false);

    setMaterialesUsados((prev) => [
      ...prev,
      { nombre: nuevoMaterialTexto.trim(), cantidad: Math.max(1, Number(cantidadMaterial) || 1) }
    ]);
    setNuevoMaterialTexto('');
    setCantidadMaterial(1);
  };

  const eliminarMaterial = (index) => {
    setMaterialesUsados((prev) => prev.filter((_, i) => i !== index));
  };

  const toggleSinMateriales = () => {
    setSinMateriales((prev) => {
      const nuevo = !prev;
      if (nuevo) setMaterialesUsados([]);
      return nuevo;
    });
  };

  // Envío final con prevención estricta de Double Submit
  const handleGuardarCierre = async () => {
    if (!esTecnicoAsignado) {
      setErrorValidacion('Operación denegada: No eres el técnico asignado a esta tarea.');
      return;
    }

    if (!isFormValid || isSubmitting) {
      if (!resolucionValida) {
        setErrorValidacion('La resolución debe contener al menos 10 caracteres detallando el trabajo.');
      } else if (!horasValidas) {
        setErrorValidacion('Debes indicar una cantidad válida de horas invertidas.');
      }
      return;
    }

    setErrorValidacion(null);
    setIsSubmitting(true);

    const payloadCierre = {
      incidenciaId: orden.incidencia_id || orden.id,
      ordenId: orden.id_orden || orden.id,
      resolucion: resolucion.trim(),
      horasInvertidas: Number(horasInvertidas),
      materialesUsados: sinMateriales ? [] : materialesUsados,
      tecnicoNombre: tecnicoActual?.nombre || orden.tecnico_nombre || 'Técnico Responsable',
      tecnicoId: tecnicoActual?.id || orden.tecnico_id || 'tec-01',
    };

    try {
      // 1. Guardar de forma reactiva y persistente en el frontend (cookies / localStorage)
      const resultadoLocal = completarMantenimientoTecnico(payloadCierre);

      // 2. Intentar actualizar en el backend real mediante el API Gateway si está disponible
      try {
        const idIncidenciaBackend = orden.incidencia_id || orden.id;
        // Enviar actualización de estado al backend (id_estado: 6 = Completada, o 3 = Resuelta)
        await api.patch(`/incidencias/${idIncidenciaBackend}/estado`, {
          id_estado: 6, // Estado Completada
        });

        // Si la orden existe en el backend, actualizar también su diagnóstico con la resolución
        if (orden.id_orden) {
          await api.patch(`/ordenes-trabajo/${orden.id_orden}/diagnostico`, {
            diagnostico_tecnico: resolucion.trim(),
          });
        }
      } catch (backendError) {
        // Si el microservicio responde con error o está en modo desarrollo, no bloquea el flujo local
        console.warn('[ModalCierre] Notificación backend omitida o en fallback:', backendError.message);
      }

      showToast('¡Mantenimiento técnico confirmado! La tarea pasó a estado Completada.', 'success');

      if (onCierreExitoso) {
        onCierreExitoso(resultadoLocal);
      }

      onClose();
    } catch (err) {
      console.error('Error al confirmar cierre de mantenimiento:', err);
      showToast('Error al registrar la confirmación del mantenimiento', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      id="modal-cierre-mantenimiento-overlay"
      className="fixed inset-0 z-50 overflow-y-auto bg-gray-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 md:p-6 animate-fadeIn"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isSubmitting) onClose();
      }}
    >
      <div
        id="modal-cierre-contenedor"
        className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-gray-200 overflow-hidden flex flex-col max-h-[92vh] sm:max-h-[88vh] transform transition-all"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-cierre-titulo"
      >
        {/* Cabecera del Modal */}
        <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-blue-800 text-white px-5 sm:px-6 py-4 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center text-white flex-shrink-0 border border-white/20">
              <FiTool className="w-5 h-5" />
            </div>
            <div>
              <h3 id="modal-cierre-titulo" className="text-lg sm:text-xl font-bold tracking-tight">
                Confirmación de Mantenimiento Técnico
              </h3>
              <p className="text-xs text-blue-100 mt-0.5 flex items-center gap-2">
                <span>Orden: <strong>{orden.id_orden || orden.id}</strong></span>
                <span>•</span>
                <span>Activo: <strong>{orden.id_activo || 'N/A'}</strong></span>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            aria-label="Cerrar modal"
            className="w-9 h-9 rounded-lg bg-white/10 hover:bg-white/25 text-white flex items-center justify-center transition-colors disabled:opacity-50 cursor-pointer"
          >
            <FiX className="w-5 h-5" />
          </button>
        </div>

        {/* CONTENIDO DEL MODAL */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
          {/* CASO: ACCESO DENEGADO SI NO ES EL TÉCNICO ASIGNADO */}
          {!esTecnicoAsignado ? (
            <div
              id="alerta-acceso-restringido-tecnico"
              className="bg-amber-50 border-2 border-amber-300 rounded-xl p-5 text-amber-900 space-y-4 animate-fadeIn"
            >
              <div className="flex items-start gap-3.5">
                <div className="p-2.5 bg-amber-200 text-amber-800 rounded-xl flex-shrink-0 mt-0.5">
                  <FiShield className="w-6 h-6" />
                </div>
                <div className="space-y-1.5 flex-1">
                  <h4 className="font-bold text-base text-amber-950">
                    Acceso Restringido al Formulario Finalizativo
                  </h4>
                  <p className="text-sm text-amber-800 leading-relaxed">
                    Esta orden de mantenimiento está asignada a:{' '}
                    <strong className="text-amber-950 underline font-semibold">
                      {orden.tecnico_nombre || orden.asignado || 'Otro técnico'}
                    </strong>.
                  </p>
                  <p className="text-xs text-amber-700 bg-amber-100/60 p-3 rounded-lg border border-amber-200">
                    <strong>Regla de negocio:</strong> Los técnicos no pueden elegir tareas de otros compañeros. Solo el supervisor asigna las órdenes, y únicamente el técnico designado puede ingresar la resolución, horas y materiales para cerrar la tarea y rendir cuentas de su trabajo.
                  </p>
                  <div className="text-xs text-gray-600 pt-1">
                    Tu perfil activo actualmente es: <strong className="text-gray-900">{tecnicoActual?.nombre || 'Técnico no identificado'}</strong>.
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-2 border-t border-amber-200">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-5 py-2.5 bg-amber-700 hover:bg-amber-800 text-white rounded-lg text-sm font-medium transition-colors shadow-xs cursor-pointer"
                >
                  Entendido, volver
                </button>
              </div>
            </div>
          ) : (
            /* CASO: TÉCNICO AUTORIZADO - FORMULARIO COMPLETO PARA TABLETS */
            <>
              {/* Tarjeta de Contexto Rápido de la Tarea */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 sm:p-4 text-xs text-slate-700 grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="flex items-center gap-2">
                  <FiBox className="w-4 h-4 text-blue-600 flex-shrink-0" />
                  <div>
                    <span className="text-gray-400 block text-[10px] uppercase font-semibold">Título</span>
                    <strong className="text-gray-900 truncate block">{orden.incidencia_titulo || orden.titulo || 'Mantenimiento Correctivo'}</strong>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <FiUser className="w-4 h-4 text-indigo-600 flex-shrink-0" />
                  <div>
                    <span className="text-gray-400 block text-[10px] uppercase font-semibold">Técnico Responsable</span>
                    <strong className="text-indigo-900">{tecnicoActual?.nombre || orden.tecnico_nombre}</strong>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <FiCheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                  <div>
                    <span className="text-gray-400 block text-[10px] uppercase font-semibold">Nuevo Estado</span>
                    <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                      Completada
                    </span>
                  </div>
                </div>
              </div>

              {/* Banner de error de validación */}
              {errorValidacion && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs flex items-center gap-2 animate-fadeIn">
                  <FiAlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0" />
                  <span>{errorValidacion}</span>
                </div>
              )}

              {/* SECCIÓN 1: RESOLUCIÓN (OBLIGATORIO) */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label htmlFor="input-resolucion" className="text-sm font-bold text-gray-900 flex items-center gap-1.5">
                    <FiFileText className="w-4 h-4 text-blue-600" />
                    <span>Resolución Técnica del Trabajo</span>
                    <span className="text-red-500">*</span>
                  </label>
                  <span className={`text-[11px] font-mono ${resolucion.trim().length >= 10 ? 'text-emerald-600' : 'text-gray-400'}`}>
                    {resolucion.trim().length} caracteres (mín. 10)
                  </span>
                </div>
                <p className="text-xs text-gray-500">
                  Explica detalladamente la intervención, hallazgos, reparaciones o ajustes efectuados para solucionar la falla.
                </p>
                <textarea
                  id="input-resolucion"
                  rows={4}
                  value={resolucion}
                  onChange={(e) => {
                    setResolucion(e.target.value);
                    if (errorValidacion) setErrorValidacion(null);
                  }}
                  disabled={isSubmitting}
                  placeholder="Ej: Se realizó el desmontaje y limpieza de los disipadores. Se reemplazó el cable de señal dañado y se realizaron pruebas de funcionamiento durante 45 minutos sin presentar fallas..."
                  className="w-full p-3.5 bg-gray-50 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:bg-white outline-none text-sm text-gray-900 transition-all resize-y min-h-[110px]"
                />
              </div>

              {/* SECCIÓN 2: HORAS INVERTIDAS (OBLIGATORIO - ERGONOMÍA TABLET) */}
              <div className="space-y-2 pt-1 border-t border-gray-100">
                <div className="flex items-center justify-between">
                  <label htmlFor="input-horas-invertidas" className="text-sm font-bold text-gray-900 flex items-center gap-1.5">
                    <FiClock className="w-4 h-4 text-indigo-600" />
                    <span>Horas Invertidas</span>
                    <span className="text-red-500">*</span>
                  </label>
                  <span className="text-xs text-indigo-700 font-medium bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-200">
                    Tiempo de mano de obra
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
                  {/* Stepper táctil amplio para tablets */}
                  <div className="flex items-center gap-2 bg-gray-50 p-1.5 border border-gray-300 rounded-xl">
                    <button
                      type="button"
                      id="btn-decrementar-horas"
                      onClick={() => decrementarHoras(0.5)}
                      disabled={isSubmitting || horasInvertidas <= 0.5}
                      className="w-12 h-12 bg-white hover:bg-gray-100 active:bg-gray-200 text-gray-800 rounded-lg flex items-center justify-center font-bold text-lg border border-gray-200 shadow-2xs transition-colors disabled:opacity-40 cursor-pointer"
                      title="Restar 0.5 horas"
                    >
                      -
                    </button>
                    <div className="flex-1 text-center">
                      <input
                        type="number"
                        id="input-horas-invertidas"
                        step="0.5"
                        min="0.5"
                        max="24"
                        inputMode="decimal"
                        value={horasInvertidas}
                        onChange={(e) => setHorasInvertidas(Math.max(0, Number(e.target.value) || 0))}
                        disabled={isSubmitting}
                        className="w-full text-center font-bold text-xl text-gray-900 bg-transparent outline-none py-1"
                      />
                      <span className="text-[11px] text-gray-500 block -mt-1 font-medium">horas</span>
                    </div>
                    <button
                      type="button"
                      id="btn-incrementar-horas"
                      onClick={() => incrementarHoras(0.5)}
                      disabled={isSubmitting || horasInvertidas >= 24}
                      className="w-12 h-12 bg-white hover:bg-gray-100 active:bg-gray-200 text-gray-800 rounded-lg flex items-center justify-center font-bold text-lg border border-gray-200 shadow-2xs transition-colors disabled:opacity-40 cursor-pointer"
                      title="Sumar 0.5 horas"
                    >
                      +
                    </button>
                  </div>

                  {/* Botones de presets rápidos táctiles para tablet */}
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-[11px] text-gray-400 w-full font-medium">Acceso rápido:</span>
                    {[0.5, 1, 2, 3, 4, 8].map((h) => (
                      <button
                        key={h}
                        type="button"
                        onClick={() => setHorasPreset(h)}
                        disabled={isSubmitting}
                        className={`px-3 py-2 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                          Number(horasInvertidas) === h
                            ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                            : 'bg-white hover:bg-indigo-50 text-gray-700 border-gray-300'
                        }`}
                      >
                        {h}h
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* SECCIÓN 3: MATERIALES USADOS */}
              <div className="space-y-3 pt-2 border-t border-gray-100">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                  <label className="text-sm font-bold text-gray-900 flex items-center gap-1.5">
                    <FiLayers className="w-4 h-4 text-emerald-600" />
                    <span>Materiales e Insumos Usados</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer text-xs text-gray-600 select-none">
                    <input
                      type="checkbox"
                      id="check-sin-materiales"
                      checked={sinMateriales}
                      onChange={toggleSinMateriales}
                      disabled={isSubmitting}
                      className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-gray-300 cursor-pointer"
                    />
                    <span>Solo mano de obra (sin materiales adicionales)</span>
                  </label>
                </div>

                {!sinMateriales && (
                  <div className="space-y-3 bg-gray-50/80 p-3.5 rounded-xl border border-gray-200">
                    {/* Chips táctiles rápidos para tablets */}
                    <div>
                      <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider block mb-2">
                        Insumos recurrentes (toca para añadir):
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {MATERIALES_FRECUENTES.map((mat) => (
                          <button
                            key={mat}
                            type="button"
                            onClick={() => agregarMaterialPreset(mat)}
                            disabled={isSubmitting}
                            className="px-2.5 py-1.5 rounded-lg text-xs bg-white border border-gray-300 text-gray-700 hover:border-emerald-500 hover:text-emerald-700 hover:bg-emerald-50 active:scale-95 transition-all shadow-2xs flex items-center gap-1 cursor-pointer"
                          >
                            <FiPlus className="w-3 h-3 text-emerald-600" />
                            <span>{mat}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Agregar material personalizado */}
                    <form onSubmit={agregarMaterialCustom} className="flex gap-2 pt-2 border-t border-gray-200">
                      <input
                        type="text"
                        id="input-material-personalizado"
                        value={nuevoMaterialTexto}
                        onChange={(e) => setNuevoMaterialTexto(e.target.value)}
                        placeholder="Otro material (ej. Adaptador HDMI, Canaleta 2m)..."
                        disabled={isSubmitting}
                        className="flex-1 px-3 py-2 bg-white border border-gray-300 rounded-lg text-xs text-gray-900 outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                      <input
                        type="number"
                        min="1"
                        max="999"
                        value={cantidadMaterial}
                        onChange={(e) => setCantidadMaterial(Math.max(1, Number(e.target.value) || 1))}
                        disabled={isSubmitting}
                        className="w-16 px-2 py-2 bg-white border border-gray-300 rounded-lg text-xs text-center text-gray-900 outline-none"
                        title="Cantidad"
                      />
                      <button
                        type="submit"
                        disabled={isSubmitting || !nuevoMaterialTexto.trim()}
                        className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                      >
                        <FiPlus className="w-3.5 h-3.5" />
                        <span>Añadir</span>
                      </button>
                    </form>

                    {/* Lista de materiales añadidos */}
                    {materialesUsados.length > 0 ? (
                      <div className="space-y-1.5 pt-1">
                        <span className="text-[11px] font-semibold text-gray-600 block">
                          Materiales registrados para esta orden ({materialesUsados.length}):
                        </span>
                        <div className="max-h-36 overflow-y-auto space-y-1 pr-1">
                          {materialesUsados.map((m, idx) => (
                            <div
                              key={idx}
                              className="flex items-center justify-between bg-white px-3 py-2 rounded-lg border border-gray-200 text-xs text-gray-800 shadow-2xs"
                            >
                              <div className="flex items-center gap-2">
                                <span className="font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                                  {m.cantidad}x
                                </span>
                                <span>{m.nombre}</span>
                              </div>
                              <button
                                type="button"
                                onClick={() => eliminarMaterial(idx)}
                                disabled={isSubmitting}
                                className="text-gray-400 hover:text-red-600 p-1 rounded transition-colors cursor-pointer"
                                title="Eliminar material"
                              >
                                <FiTrash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <p className="text-[11px] text-gray-400 italic text-center py-1">
                        Ningún material añadido todavía. Usa los insumos rápidos o escribe uno personalizado.
                      </p>
                    )}
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* PIE DEL MODAL CON ACCIONES Y PREVENCIÓN DE DOUBLE SUBMIT */}
        {esTecnicoAsignado && (
          <div className="bg-gray-50 border-t border-gray-200 px-5 sm:px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-3 flex-shrink-0">
            <div className="text-xs text-gray-500 flex items-center gap-1.5 order-2 sm:order-1">
              <FiCheck className="w-4 h-4 text-emerald-600" />
              <span>Al confirmar, la tarea pasará a <strong>Completada</strong></span>
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto order-1 sm:order-2">
              <button
                type="button"
                id="btn-cancelar-cierre"
                onClick={onClose}
                disabled={isSubmitting}
                className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl border border-gray-300 text-gray-700 bg-white hover:bg-gray-100 font-medium text-sm transition-colors disabled:opacity-50 cursor-pointer min-h-[44px]"
              >
                Cancelar
              </button>

              {/* BOTÓN CON DOBLE SUBMIT PREVENIDO */}
              <button
                type="button"
                id="btn-confirmar-cierre-mantenimiento"
                onClick={handleGuardarCierre}
                disabled={isSubmitting || !isFormValid}
                className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl font-bold text-sm text-white shadow-sm transition-all min-h-[48px] cursor-pointer ${
                  isSubmitting || !isFormValid
                    ? 'bg-gray-400 cursor-not-allowed opacity-60'
                    : 'bg-emerald-600 hover:bg-emerald-700 active:scale-98 shadow-emerald-600/20'
                }`}
              >
                {isSubmitting ? (
                  <>
                    <svg
                      className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8v8H4z"
                      />
                    </svg>
                    <span>Guardando Cierre...</span>
                  </>
                ) : (
                  <>
                    <FiCheckCircle className="w-4 h-4" />
                    <span>Guardar y Finalizar</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ModalCierreMantenimiento;
