import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  FiCalendar,
  FiBox,
  FiFileText,
  FiAlertCircle,
  FiArrowLeft,
  FiSave,
  FiRefreshCw,
  FiInfo,
  FiChevronDown,
  FiSliders,
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

const TIPOS_MANTENIMIENTO = [
  { id: 'Preventivo', label: 'Mantenimiento Preventivo Periódico', desc: 'Revisión integral según manual del fabricante' },
  { id: 'Calibración', label: 'Calibración y Ajuste de Precisión', desc: 'Ajuste de parámetros y verificación de tolerancia' },
  { id: 'Inspección', label: 'Inspección Técnica de Rutina', desc: 'Chequeo visual y funcional preventivo' },
  { id: 'Limpieza', label: 'Limpieza y Acondicionamiento de Hardware', desc: 'Desempolvado, pasta térmica y ventilación' },
  { id: 'Actualización', label: 'Actualización de Firmware / Componentes', desc: 'Parches críticos y renovación de firmware' },
  { id: 'Revisión Eléctrica', label: 'Revisión de Suministro y Baterías (UPS)', desc: 'Testeo de voltajes, baterías y fuentes de poder' },
  { id: 'Otro', label: 'Otro Servicio Técnico Programado', desc: 'Intervención técnica especializada' },
];

const SUGERENCIAS_TAREAS = [
  'Limpieza interna profunda y reemplazo de pasta térmica',
  'Calibración de sensores y prueba de precisión',
  'Actualización preventiva de firmware y BIOS del sistema',
  'Inspección de voltajes, cableado y estado de batería/UPS',
  'Diagnóstico integral de ventilación y temperaturas',
];

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

  // Estados del formulario
  const [idActivo, setIdActivo] = useState(assetFromParam);
  const [fechaProgramada, setFechaProgramada] = useState('');
  const [tipo, setTipo] = useState('Preventivo');
  const [descripcion, setDescripcion] = useState('');

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

    cargar();

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

  // Validación individual de campos
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
      case 'tipo':
        if (!val) return 'Selecciona el tipo de mantenimiento a programar.';
        return '';
      case 'descripcion':
        if (!val) return 'El detalle del trabajo a realizar es obligatorio.';
        if (val.length < 10) return 'Describe el trabajo con mayor detalle (mínimo 10 caracteres).';
        return '';
      default:
        return '';
    }
  };

  const validateForm = () => {
    const values = { idActivo, fechaProgramada, tipo, descripcion };
    const newErrors = {};
    Object.keys(values).forEach((field) => {
      const errorMsg = validateField(field, values[field]);
      if (errorMsg) newErrors[field] = errorMsg;
    });
    return newErrors;
  };

  const handleBlur = (field) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    const errorMsg = validateField(field, { idActivo, fechaProgramada, tipo, descripcion }[field]);
    setErrors((prev) => ({ ...prev, [field]: errorMsg }));
  };

  const handleReset = () => {
    if (!assetFromParam) {
      setIdActivo('');
    }
    setFechaProgramada('');
    setTipo('Preventivo');
    setDescripcion('');
    setErrors({});
    setTouched({});
  };

  const handleAgregarSugerencia = (sugerencia) => {
    setDescripcion((prev) => {
      const limpia = prev.trim();
      if (!limpia) return sugerencia;
      if (limpia.includes(sugerencia)) return prev;
      return `${limpia}\n• ${sugerencia}`;
    });
    if (touched.descripcion) {
      setErrors((prev) => ({ ...prev, descripcion: '' }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;

    const formErrors = validateForm();
    setErrors(formErrors);
    setTouched({
      idActivo: true,
      fechaProgramada: true,
      tipo: true,
      descripcion: true,
    });

    if (Object.keys(formErrors).length > 0) {
      showToast('Por favor corrige los campos indicados antes de continuar.', 'error');
      return;
    }

    setIsSubmitting(true);

    try {
      const fechaIso = new Date(fechaProgramada).toISOString();

      const payload = {
        id_activo: idActivo,
        fecha_programada: fechaIso,
        tipo,
        descripcion: descripcion.trim(),
        estado: 'Pendiente',
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
        navigate('/inventario');
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
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20 shrink-0">
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
            className="self-start sm:self-center text-xs font-semibold text-blue-600 hover:text-blue-800 bg-blue-50/70 hover:bg-blue-100/70 border border-blue-200/60 rounded-lg px-3 py-1.5 transition-all inline-flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
            title="Recargar catálogo de activos"
          >
            <FiRefreshCw className={`w-3.5 h-3.5 ${cargandoActivos ? 'animate-spin text-blue-600' : ''}`} />
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
              className={`w-full pl-11 pr-10 py-3 bg-slate-50/70 border rounded-xl text-sm font-medium transition-all duration-200 outline-none appearance-none cursor-pointer hover:bg-slate-50/90 ${
                errors.idActivo && touched.idActivo
                  ? 'border-rose-300 focus:ring-2 focus:ring-rose-400 focus:border-rose-500 bg-rose-50/30 text-rose-900'
                  : 'border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:bg-white text-slate-900'
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
          <div className="bg-gradient-to-br from-blue-50/80 via-indigo-50/40 to-slate-50 border border-blue-200/90 rounded-xl p-4 sm:p-5 shadow-sm transition-all duration-200">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-blue-200/60 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center shadow-xs shrink-0">
                  <FiCpu className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900 leading-tight">
                    {activoSeleccionado.nombre}
                  </h4>
                  <p className="text-[11px] text-blue-700 font-mono font-medium">
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
                  className="text-xs text-slate-500 hover:text-slate-800 font-medium px-2 py-1 rounded-lg hover:bg-slate-200/60 transition-colors inline-flex items-center gap-1 cursor-pointer"
                  title="Cambiar activo seleccionado"
                >
                  <FiX className="w-3.5 h-3.5" />
                  <span>Cambiar</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 text-xs">
              <div className="flex items-start gap-2.5 bg-white/80 rounded-lg p-2.5 border border-blue-100/80 shadow-2xs">
                <FiLayers className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Categoría</span>
                  <span className="font-semibold text-slate-800">{activoSeleccionado.categoria || 'Sin categoría'}</span>
                </div>
              </div>
              <div className="flex items-start gap-2.5 bg-white/80 rounded-lg p-2.5 border border-blue-100/80 shadow-2xs">
                <FiMapPin className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Ubicación</span>
                  <span className="font-semibold text-slate-800">{activoSeleccionado.ubicacion || 'No especificada'}</span>
                </div>
              </div>
              <div className="flex items-start gap-2.5 bg-white/80 rounded-lg p-2.5 border border-blue-100/80 shadow-2xs">
                <FiHash className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">N° Serie</span>
                  <span className="font-mono font-semibold text-slate-800">{activoSeleccionado.numeroSerie || activoSeleccionado.numero_serie || 'S/N'}</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* TARJETA 2: CALENDARIO Y TIPO DE INTERVENCIÓN */}
      <div className="bg-white rounded-xl shadow-lg border border-slate-200/90 p-5 sm:p-7 space-y-5 transition-shadow hover:shadow-xl">
        <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center shadow-md shadow-indigo-500/20 shrink-0">
            <FiCalendar className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-slate-900 text-base tracking-tight">
              2. Planificación Temporal y Clasificación
            </h3>
            <p className="text-xs text-slate-500">
              Establece el momento exacto y la naturaleza del servicio técnico
            </p>
          </div>
        </div>

        {/* Columnas adaptables: apiladas en móvil (grid-cols-1) y 2 columnas en escritorio (md:grid-cols-2) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Selector de Fecha y Hora Futura */}
          <div>
            <label htmlFor="fechaProgramada" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Fecha y Hora de Intervención <span className="text-rose-500">*</span>
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
                className={`w-full pl-11 pr-4 py-3 bg-slate-50/70 border rounded-xl text-sm font-medium transition-all duration-200 outline-none hover:bg-slate-50/90 ${
                  errors.fechaProgramada && touched.fechaProgramada
                    ? 'border-rose-300 focus:ring-2 focus:ring-rose-400 focus:border-rose-500 bg-rose-50/30 text-rose-900'
                    : 'border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:bg-white text-slate-900'
                }`}
              />
            </div>

            {/* Microcopy e indicador contextual */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-[11px] text-slate-500 mt-2">
              <span className="flex items-center gap-1">
                <FiClock className="w-3.5 h-3.5 text-slate-400" />
                Momento futuro posterior a la fecha actual.
              </span>
              {tiempoRestanteBadge && (
                <span className={`inline-flex items-center px-2 py-0.5 rounded-md font-semibold border ${tiempoRestanteBadge.clase}`}>
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

          {/* Tipo de Mantenimiento con alineación perfecta */}
          <div>
            <label htmlFor="tipoMantenimiento" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Tipo de Servicio <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <FiSliders className="w-5 h-5" />
              </div>
              <select
                id="tipoMantenimiento"
                value={tipo}
                onChange={(e) => {
                  setTipo(e.target.value);
                  if (touched.tipo) {
                    setErrors((prev) => ({ ...prev, tipo: validateField('tipo', e.target.value) }));
                  }
                }}
                onBlur={() => handleBlur('tipo')}
                disabled={isSubmitting}
                className={`w-full pl-11 pr-10 py-3 bg-slate-50/70 border rounded-xl text-sm font-medium transition-all duration-200 outline-none appearance-none cursor-pointer hover:bg-slate-50/90 ${
                  errors.tipo && touched.tipo
                    ? 'border-rose-300 focus:ring-2 focus:ring-rose-400 focus:border-rose-500 bg-rose-50/30 text-rose-900'
                    : 'border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:bg-white text-slate-900'
                }`}
              >
                {TIPOS_MANTENIMIENTO.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.label}
                  </option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3.5 text-slate-400">
                <FiChevronDown className="w-4 h-4" />
              </div>
            </div>

            <p className="text-[11px] text-slate-500 mt-2">
              Clasificación estándar para reportes e indicadores de fiabilidad técnica.
            </p>

            {errors.tipo && touched.tipo && (
              <p className="mt-2 text-xs text-rose-600 flex items-center gap-1.5 font-medium animate-fadeIn">
                <FiAlertCircle className="w-4 h-4 shrink-0" />
                <span>{errors.tipo}</span>
              </p>
            )}
          </div>
        </div>
      </div>

      {/* TARJETA 3: DESCRIPCIÓN Y NOTAS TÉCNICAS */}
      <div className="bg-white rounded-xl shadow-lg border border-slate-200/90 p-5 sm:p-7 space-y-5 transition-shadow hover:shadow-xl">
        <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white flex items-center justify-center shadow-md shadow-emerald-500/20 shrink-0">
            <FiFileText className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-slate-900 text-base tracking-tight">
              3. Alcance y Tareas a Desarrollar
            </h3>
            <p className="text-xs text-slate-500">
              Instrucciones técnicas y procedimientos que ejecutará el personal de soporte
            </p>
          </div>
        </div>

        <div>
          <label htmlFor="descripcion" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
            Descripción Detallada del Mantenimiento <span className="text-rose-500">*</span>
          </label>
          <div className="relative">
            <div className="absolute top-3.5 left-3.5 pointer-events-none text-slate-400">
              <FiFileText className="w-5 h-5" />
            </div>
            <textarea
              id="descripcion"
              rows={4}
              value={descripcion}
              onChange={(e) => {
                setDescripcion(e.target.value);
                if (touched.descripcion) {
                  setErrors((prev) => ({
                    ...prev,
                    descripcion: validateField('descripcion', e.target.value),
                  }));
                }
              }}
              onBlur={() => handleBlur('descripcion')}
              disabled={isSubmitting}
              placeholder="Especifica detalladamente las tareas requeridas (ej: Reemplazo de pasta térmica, limpieza de disipador y verificación de voltajes en fuente de poder)..."
              className={`w-full pl-11 pr-4 py-3 bg-slate-50/70 border rounded-xl text-sm font-medium transition-all duration-200 outline-none resize-y min-h-[110px] hover:bg-slate-50/90 ${
                errors.descripcion && touched.descripcion
                  ? 'border-rose-300 focus:ring-2 focus:ring-rose-400 focus:border-rose-500 bg-rose-50/30 text-rose-900'
                  : 'border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:bg-white text-slate-900'
              }`}
            />
          </div>

          {/* Chips de sugerencias rápidas corporativas */}
          <div className="mt-3">
            <span className="text-[11px] font-bold text-slate-600 block mb-1.5 uppercase tracking-wider">
              Plantillas de Tareas Frecuentes:
            </span>
            <div className="flex flex-wrap gap-1.5">
              {SUGERENCIAS_TAREAS.map((sug, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleAgregarSugerencia(sug)}
                  disabled={isSubmitting}
                  className="text-xs bg-slate-100 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-300 text-slate-700 border border-slate-200 rounded-lg px-2.5 py-1 transition-all cursor-pointer font-medium"
                >
                  + {sug}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between text-[11px] text-slate-500 mt-2">
            <span className="flex items-center gap-1">
              <FiInfo className="w-3.5 h-3.5 text-slate-400" />
              Mínimo 10 caracteres explicativos.
            </span>
            <span className={`font-mono font-medium ${descripcion.trim().length >= 10 ? 'text-emerald-600' : 'text-slate-400'}`}>
              {descripcion.trim().length} caracteres ingresados
            </span>
          </div>

          {errors.descripcion && touched.descripcion && (
            <p className="mt-2 text-xs text-rose-600 flex items-center gap-1.5 font-medium animate-fadeIn">
              <FiAlertCircle className="w-4 h-4 shrink-0" />
              <span>{errors.descripcion}</span>
            </p>
          )}
        </div>
      </div>

      {/* TARJETA 4: RESUMEN CORPORATIVO EN TIEMPO REAL */}
      {(idActivo || fechaProgramada || descripcion.trim()) && (
        <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 text-white rounded-xl shadow-lg border border-slate-700/80 p-5 sm:p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-700/80 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 rounded-lg bg-blue-500/20 text-blue-400 border border-blue-400/30">
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
            <span className="self-start sm:self-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-blue-500/20 text-blue-300 border border-blue-400/30">
              Estado Inicial: Pendiente
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 text-xs">
            <div className="bg-slate-800/70 rounded-lg p-3 border border-slate-700/60">
              <span className="text-slate-400 block font-semibold mb-1 text-[10px] uppercase tracking-wider">
                Activo Asignado
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
                Fecha Prevista
              </span>
              <p className="font-bold text-slate-100 text-sm capitalize">
                {fechaPreview || 'Por programar...'}
              </p>
              {tiempoRestanteBadge && (
                <span className={`inline-block mt-1 px-2 py-0.5 rounded-md text-[10px] font-bold border ${tiempoRestanteBadge.clase}`}>
                  {tiempoRestanteBadge.texto}
                </span>
              )}
            </div>

            <div className="bg-slate-800/70 rounded-lg p-3 border border-slate-700/60">
              <span className="text-slate-400 block font-semibold mb-1 text-[10px] uppercase tracking-wider">
                Tipo de Servicio
              </span>
              <p className="font-bold text-blue-300 text-sm">
                {tipo}
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5 truncate">
                {descripcion.trim() ? `${descripcion.trim().length} caracteres de alcance` : 'Sin descripción aún'}
              </p>
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
            else navigate('/inventario');
          }}
          disabled={isSubmitting}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3 border border-slate-300 rounded-xl text-sm font-semibold text-slate-700 bg-white hover:bg-slate-50 transition-all shadow-sm active:scale-95 disabled:opacity-50 cursor-pointer"
        >
          <FiArrowLeft className="w-4 h-4" />
          <span>Volver al Inventario</span>
        </button>

        <div className="w-full sm:w-auto flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <button
            type="button"
            onClick={handleReset}
            disabled={isSubmitting}
            className="w-full sm:w-auto px-4 py-3 text-sm font-medium text-slate-500 hover:text-slate-800 rounded-xl transition-colors disabled:opacity-50 cursor-pointer"
          >
            Limpiar Formulario
          </button>

          {/* Botón de Guardar con transition-all y hover:scale-105 según especificación */}
          <button
            type="submit"
            id="btn-guardar-planificacion"
            disabled={isSubmitting}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-7 py-3 bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-600 hover:from-blue-700 hover:via-blue-800 hover:to-indigo-700 text-white font-semibold text-sm rounded-xl shadow-lg shadow-blue-600/30 hover:scale-105 transition-all duration-200 active:scale-95 disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
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
