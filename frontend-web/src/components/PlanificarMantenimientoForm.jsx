import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  FiCalendar,
  FiBox,
  FiAlertCircle,
  FiArrowLeft,
  FiSave,
  FiRefreshCw,
  FiChevronDown,
  FiCpu,
  FiMapPin,
  FiHash,
  FiX,
  FiLayers,
  FiActivity,
  FiCheckCircle,
  FiClock
} from 'react-icons/fi';
import { useToast } from '../context/ToastContext';
import { planificarMantenimiento, fetchActivosParaMantenimiento } from '../services/mantenimientosService';

const calcularFechaMinima = () => {
  const ahora = new Date(Date.now() + 5 * 60 * 1000);
  const anio = ahora.getFullYear();
  const mes = String(ahora.getMonth() + 1).padStart(2, '0');
  const dia = String(ahora.getDate()).padStart(2, '0');
  const horas = String(ahora.getHours()).padStart(2, '0');
  const minutos = String(ahora.getMinutes()).padStart(2, '0');
  return `${anio}-${mes}-${dia}T${horas}:${minutos}`;
};

const PlanificarMantenimientoForm = ({ onCancel, initialAssetId }) => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { showToast } = useToast();

  const assetFromParam =
    initialAssetId ||
    searchParams.get('id_activo') ||
    searchParams.get('activo') ||
    searchParams.get('assetId') ||
    '';

  // Catálogo dinámico de activos
  const [activos, setActivos] = useState([]);
  const [cargandoActivos, setCargandoActivos] = useState(true);

  // Estados del formulario alineados con la tabla MANTENIMIENTOS_PREVENTIVOS del MER
  const [idActivo, setIdActivo] = useState(assetFromParam);
  const [fechaProgramada, setFechaProgramada] = useState('');

  // Control y validación
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});

  // Fecha mínima calculada
  const [fechaMinima] = useState(calcularFechaMinima);

  // Cargar activos desde el backend
  const cargarCatalogoActivos = useCallback(async () => {
    setCargandoActivos(true);
    try {
      const data = await fetchActivosParaMantenimiento();
      setActivos(data);

      if (assetFromParam && Array.isArray(data)) {
        const coincidencia = data.find(
          (a) =>
            a.id === assetFromParam ||
            (a.codigoQr && a.codigoQr.toUpperCase() === assetFromParam.toUpperCase())
        );
        if (coincidencia) {
          setIdActivo(coincidencia.id);
        }
      }
    } catch {
      showToast('Error al cargar la lista de activos disponibles.', 'error');
    } finally {
      setCargandoActivos(false);
    }
  }, [assetFromParam, showToast]);

  useEffect(() => {
    let cancel = false;
    const cargar = async () => {
      setCargandoActivos(true);
      try {
        const data = await fetchActivosParaMantenimiento();
        if (!cancel) {
          setActivos(data);
          if (assetFromParam && Array.isArray(data)) {
            const coincidencia = data.find(
              (a) =>
                a.id === assetFromParam ||
                (a.codigoQr && a.codigoQr.toUpperCase() === assetFromParam.toUpperCase())
            );
            if (coincidencia) {
              setIdActivo(coincidencia.id);
            }
          }
        }
      } catch {
        if (!cancel) {
          showToast('Error al cargar la lista de activos disponibles.', 'error');
        }
      } finally {
        if (!cancel) {
          setCargandoActivos(false);
        }
      }
    };

    void cargar();

    return () => {
      cancel = true;
    };
  }, [assetFromParam, showToast]);

  // Activo seleccionado actualmente
  const activoSeleccionado = useMemo(() => {
    return activos.find((a) => a.id === idActivo) || null;
  }, [activos, idActivo]);

  // Formato legible de fecha para el preview en vivo
  const fechaPreview = useMemo(() => {
    if (!fechaProgramada) return null;
    const d = new Date(fechaProgramada);
    if (isNaN(d.getTime())) return null;
    return new Intl.DateTimeFormat('es-CL', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(d);
  }, [fechaProgramada]);

  // Tiempo restante para el badge interactivo
  const tiempoRestanteBadge = useMemo(() => {
    if (!fechaProgramada) return null;
    const d = new Date(fechaProgramada);
    if (isNaN(d.getTime())) return null;
    const baseDate = new Date(fechaMinima);
    const diffMs = d.getTime() - baseDate.getTime();
    if (diffMs < 0) {
      return {
        texto: 'Fecha en el pasado',
        clase: 'bg-rose-50 text-rose-700 border-rose-200',
      };
    }
    const diffHoras = Math.floor(diffMs / (1000 * 60 * 60));
    if (diffHoras < 24) {
      return {
        texto: `En ${Math.max(1, diffHoras)} horas`,
        clase: 'bg-amber-50 text-amber-700 border-amber-200',
      };
    }
    const diffDias = Math.floor(diffHoras / 24);
    return {
      texto: `En ${diffDias} ${diffDias === 1 ? 'día' : 'días'}`,
      clase: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    };
  }, [fechaProgramada, fechaMinima]);

  // Validación individual de campos según esquema NuevoMantenimiento (OpenAPI v1.3.0)
  const validateField = (field, value) => {
    const val = typeof value === 'string' ? value.trim() : value;
    switch (field) {
      case 'idActivo':
        if (!val) return 'Debes seleccionar un equipo del inventario.';
        return '';
      case 'fechaProgramada': {
        if (!val) return 'La fecha y hora de intervención son obligatorias.';
        const fechaIngresada = new Date(val);
        const ahora = new Date();
        if (isNaN(fechaIngresada.getTime())) return 'Formato de fecha u hora no válido.';
        if (fechaIngresada <= ahora) {
          return 'No se puede agendar un mantenimiento con fecha en el pasado.';
        }
        return '';
      }
      default:
        return '';
    }
  };

  const validateForm = () => {
    const values = { idActivo, fechaProgramada };
    const newErrors = {};
    Object.keys(values).forEach((field) => {
      const errorMsg = validateField(field, values[field]);
      if (errorMsg) newErrors[field] = errorMsg;
    });
    return newErrors;
  };

  const handleBlur = (field) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    const errorMsg = validateField(field, { idActivo, fechaProgramada }[field]);
    setErrors((prev) => ({ ...prev, [field]: errorMsg }));
  };

  const handleReset = () => {
    if (!assetFromParam) {
      setIdActivo('');
    }
    setFechaProgramada('');
    setErrors({});
    setTouched({});
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;

    const formErrors = validateForm();
    setErrors(formErrors);
    setTouched({
      idActivo: true,
      fechaProgramada: true,
    });

    if (Object.keys(formErrors).length > 0) {
      showToast('Por favor corrige los campos indicados antes de continuar.', 'error');
      return;
    }

    setIsSubmitting(true);

    try {
      const fechaIso = new Date(fechaProgramada).toISOString();

      // Payload estrictamente alineado con NuevoMantenimiento (MANTENIMIENTOS_PREVENTIVOS)
      const payload = {
        id_activo: idActivo,
        fecha_programada: fechaIso,
      };

      const respuesta = await planificarMantenimiento(payload);

      showToast(
        respuesta?.mensaje || '¡Mantenimiento preventivo planificado con éxito!',
        'success'
      );

      handleReset();

      if (onCancel) {
        onCancel();
      } else {
        navigate('/mantenimientos');
      }
    } catch (err) {
      const mensajeError =
        err.response?.data?.message ||
        err.response?.data?.error ||
        'Error al conectar con el servicio de mantenimientos.';
      showToast(mensajeError, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-6">
      {/* TARJETA 1: SELECCIÓN DEL ACTIVO */}
      <div className="bg-white rounded-xl shadow-lg border border-slate-200/90 p-5 sm:p-7 space-y-5 transition-shadow hover:shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary text-white flex items-center justify-center shadow-md shadow-primary/20 shrink-0">
              <FiBox className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base tracking-tight">
                1. Equipo e Identificación
              </h3>
              <p className="text-xs text-slate-500">
                Selecciona el activo tecnológico a intervenir desde el inventario centralizado
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={cargarCatalogoActivos}
            disabled={cargandoActivos}
            aria-label="Actualizar catálogo de activos"
            className="self-start sm:self-center text-xs font-semibold text-primary hover:text-primary-hover bg-primary-50/70 hover:bg-primary-100/70 border border-primary-200/60 rounded-lg px-3 py-1.5 transition-all inline-flex items-center gap-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring disabled:opacity-50 cursor-pointer"
            title="Recargar catálogo de activos"
          >
            <FiRefreshCw className={`w-3.5 h-3.5 ${cargandoActivos ? 'animate-spin text-primary' : ''}`} />
            <span>Actualizar catálogo</span>
          </button>
        </div>

        <div>
          <label htmlFor="idActivo" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
            Activo a Intervenir <span className="text-rose-500">*</span>
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <FiBox className="w-5 h-5" />
            </div>
            <select
              id="idActivo"
              value={idActivo}
              onChange={(e) => {
                setIdActivo(e.target.value);
                if (touched.idActivo) {
                  setErrors((prev) => ({ ...prev, idActivo: validateField('idActivo', e.target.value) }));
                }
              }}
              onBlur={() => handleBlur('idActivo')}
              disabled={cargandoActivos || isSubmitting}
              className={`w-full pl-11 pr-10 py-3 bg-slate-50/70 border rounded-lg text-sm font-medium transition-all duration-200 outline-none appearance-none cursor-pointer hover:bg-slate-50/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring ${
                errors.idActivo && touched.idActivo
                  ? 'border-rose-300 focus:ring-2 focus:ring-rose-400 focus:border-rose-500 bg-rose-50/30 text-rose-900'
                  : 'border-slate-300 focus:ring-2 focus:ring-primary/20 focus:border-primary focus:bg-white text-slate-900'
              }`}
            >
              <option value="">-- Selecciona un equipo del inventario --</option>
              {activos.map((act) => (
                <option key={act.id} value={act.id}>
                  {act.nombre} ({act.codigoQr || act.id}) — {act.ubicacion || 'Sin ubicación'}
                </option>
              ))}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3.5 text-slate-400">
              <FiChevronDown className="w-4 h-4" />
            </div>
          </div>
          {errors.idActivo && touched.idActivo && (
            <p className="mt-2 text-xs text-rose-600 flex items-center gap-1.5 font-medium animate-fadeIn">
              <FiAlertCircle className="w-4 h-4 shrink-0" />
              <span>{errors.idActivo}</span>
            </p>
          )}
        </div>

        {/* Ficha Técnica interactiva del activo seleccionado */}
        {activoSeleccionado && (
          <div className="bg-primary-50/60 border border-primary-200/80 rounded-xl p-4 sm:p-5 shadow-sm transition-all duration-200">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-primary-200/60 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-primary text-white flex items-center justify-center shadow-xs shrink-0">
                  <FiCpu className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900 leading-tight">
                    {activoSeleccionado.nombre}
                  </h4>
                  <p className="text-[11px] text-primary font-mono font-medium">
                    Código QR / ID: {activoSeleccionado.codigoQr || activoSeleccionado.id}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 self-start sm:self-center">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                  <FiCheckCircle className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>Disponible para intervención</span>
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setIdActivo('');
                    if (touched.idActivo) {
                      setErrors((prev) => ({ ...prev, idActivo: validateField('idActivo', '') }));
                    }
                  }}
                  disabled={isSubmitting}
                  className="text-xs text-slate-500 hover:text-slate-800 font-medium px-2 py-1 rounded-lg hover:bg-slate-200/60 transition-colors inline-flex items-center gap-1 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring"
                  title="Cambiar activo seleccionado"
                >
                  <FiX className="w-3.5 h-3.5" />
                  <span>Cambiar</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 text-xs">
              <div className="flex items-start gap-2.5 bg-white/80 rounded-lg p-2.5 border border-primary-100/80 shadow-2xs">
                <FiLayers className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Categoría</span>
                  <span className="font-semibold text-slate-800">{activoSeleccionado.categoria || 'Sin categoría'}</span>
                </div>
              </div>
              <div className="flex items-start gap-2.5 bg-white/80 rounded-lg p-2.5 border border-primary-100/80 shadow-2xs">
                <FiMapPin className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Ubicación</span>
                  <span className="font-semibold text-slate-800">{activoSeleccionado.ubicacion || 'No especificada'}</span>
                </div>
              </div>
              <div className="flex items-start gap-2.5 bg-white/80 rounded-lg p-2.5 border border-primary-100/80 shadow-2xs">
                <FiHash className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">N° Serie</span>
                  <span className="font-mono font-semibold text-slate-800">{activoSeleccionado.numeroSerie || activoSeleccionado.numero_serie || 'S/N'}</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* TARJETA 2: PLANIFICACIÓN TEMPORAL (FECHA PROGRAMADA) */}
      <div className="bg-white rounded-xl shadow-lg border border-slate-200/90 p-5 sm:p-7 space-y-5 transition-shadow hover:shadow-xl">
        <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
          <div className="w-9 h-9 rounded-xl bg-secondary text-white flex items-center justify-center shadow-md shadow-secondary/20 shrink-0">
            <FiCalendar className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-slate-900 text-base tracking-tight">
              2. Fecha Programada de Intervención
            </h3>
            <p className="text-xs text-slate-500">
              Establece el momento exacto en el que el sistema activará el mantenimiento preventivo del activo
            </p>
          </div>
        </div>

        <div>
          <label htmlFor="fechaProgramada" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
            Fecha y Hora Programada <span className="text-rose-500">*</span>
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <FiCalendar className="w-5 h-5" />
            </div>
            <input
              type="datetime-local"
              id="fechaProgramada"
              min={fechaMinima}
              value={fechaProgramada}
              onChange={(e) => {
                setFechaProgramada(e.target.value);
                if (touched.fechaProgramada) {
                  setErrors((prev) => ({
                    ...prev,
                    fechaProgramada: validateField('fechaProgramada', e.target.value),
                  }));
                }
              }}
              onBlur={() => handleBlur('fechaProgramada')}
              disabled={isSubmitting}
              className={`w-full pl-11 pr-4 py-3 bg-slate-50/70 border rounded-xl text-sm font-medium transition-all duration-200 outline-none hover:bg-slate-50/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring ${
                errors.fechaProgramada && touched.fechaProgramada
                  ? 'border-rose-300 focus:ring-2 focus:ring-rose-400 focus:border-rose-500 bg-rose-50/30 text-rose-900'
                  : 'border-slate-300 focus:ring-2 focus:ring-primary/20 focus:border-primary focus:bg-white text-slate-900'
              }`}
            />
          </div>

          {/* Microcopy e indicador contextual */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-[11px] text-slate-500 mt-2">
            <span className="flex items-center gap-1">
              <FiClock className="w-3.5 h-3.5 text-slate-400" />
              Momento futuro posterior a la fecha y hora actual.
            </span>
            {tiempoRestanteBadge && (
              <span className={`inline-flex items-center px-2 py-0.5 rounded-lg font-semibold border ${tiempoRestanteBadge.clase}`}>
                {tiempoRestanteBadge.texto}
              </span>
            )}
          </div>

          {errors.fechaProgramada && touched.fechaProgramada && (
            <p className="mt-2 text-xs text-rose-600 flex items-center gap-1.5 font-medium animate-fadeIn">
              <FiAlertCircle className="w-4 h-4 shrink-0" />
              <span>{errors.fechaProgramada}</span>
            </p>
          )}
        </div>
      </div>

      {/* TARJETA 3: RESUMEN CORPORATIVO EN TIEMPO REAL */}
      {(idActivo || fechaProgramada) && (
        <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-950 text-white rounded-xl shadow-lg border border-slate-700/80 p-5 sm:p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-700/80 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 rounded-lg bg-primary/30 text-sky-300 border border-primary/40">
                <FiActivity className="w-4 h-4" />
              </div>
              <div>
                <h4 className="font-bold text-sm text-slate-100 tracking-wide">
                  Resumen de la Planificación Preventiva
                </h4>
                <p className="text-[11px] text-slate-400">
                  Previsualización del registro en el cronograma corporativo
                </p>
              </div>
            </div>
            <span className="self-start sm:self-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-primary/30 text-sky-300 border border-primary/40">
              Registro en Cronograma
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 text-xs">
            <div className="bg-slate-800/70 rounded-lg p-3 border border-slate-700/60">
              <span className="text-slate-400 block font-semibold mb-1 text-[10px] uppercase tracking-wider">
                Activo Seleccionado (id_activo)
              </span>
              <p className="font-bold text-slate-100 truncate text-sm">
                {activoSeleccionado ? activoSeleccionado.nombre : 'Por seleccionar...'}
              </p>
              <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                {activoSeleccionado?.codigoQr || (idActivo ? `ID: ${idActivo.slice(0, 8)}...` : 'Sin ID')}
              </p>
            </div>

            <div className="bg-slate-800/70 rounded-lg p-3 border border-slate-700/60">
              <span className="text-slate-400 block font-semibold mb-1 text-[10px] uppercase tracking-wider">
                Fecha Programada (fecha_programada)
              </span>
              <p className="font-bold text-slate-100 text-sm capitalize">
                {fechaPreview || 'Por programar...'}
              </p>
              {tiempoRestanteBadge && (
                <span className={`inline-block mt-1 px-2 py-0.5 rounded-lg text-[10px] font-bold border ${tiempoRestanteBadge.clase}`}>
                  {tiempoRestanteBadge.texto}
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* BARRA INFERIOR DE ACCIONES CON RESPONSIVIDAD Y TRANSICIÓN SUAVE */}
      <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-4 pt-4 border-t border-slate-200/90">
        <button
          type="button"
          onClick={() => {
            if (onCancel) onCancel();
            else navigate('/mantenimientos');
          }}
          disabled={isSubmitting}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3 border border-slate-300 rounded-lg text-sm font-semibold text-slate-700 bg-white hover:bg-slate-50 transition-all shadow-sm active:scale-95 disabled:opacity-50 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring"
        >
          <FiArrowLeft className="w-4 h-4" />
          <span>Volver a Mantenimientos</span>
        </button>

        <div className="w-full sm:w-auto flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <button
            type="button"
            onClick={handleReset}
            disabled={isSubmitting}
            className="w-full sm:w-auto px-4 py-3 text-sm font-medium text-slate-500 hover:text-slate-800 rounded-lg transition-colors disabled:opacity-50 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring"
          >
            Limpiar Formulario
          </button>

          {/* Botón de Guardar (CTA Principal) */}
          <button
            type="submit"
            id="btn-guardar-planificacion" aria-label="Guardar planificación de mantenimiento"
            disabled={isSubmitting}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-7 py-3 bg-primary hover:bg-primary-hover text-white font-bold text-sm rounded-lg shadow-md hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 disabled:opacity-50 disabled:pointer-events-none cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring"
          >
            {isSubmitting ? (
              <>
                <FiRefreshCw className="w-4 h-4 animate-spin" />
                <span>Guardando Planificación...</span>
              </>
            ) : (
              <>
                <FiSave className="w-4 h-4" />
                <span>Guardar Planificación</span>
              </>
            )}
          </button>
        </div>
      </div>
    </form>
  );
};

export default PlanificarMantenimientoForm;
