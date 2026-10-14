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
  FiInfo
} from 'react-icons/fi';
import { useToast } from '../context/ToastContext';
import { planificarMantenimiento, fetchActivosParaMantenimiento } from '../services/mantenimientosService';

const TIPOS_MANTENIMIENTO = [
  { id: 'Preventivo', label: 'Mantenimiento Preventivo Periódico' },
  { id: 'Calibración', label: 'Calibración y Ajuste de Precisión' },
  { id: 'Inspección', label: 'Inspección Técnica de Rutina' },
  { id: 'Limpieza', label: 'Limpieza y Acondicionamiento de Hardware' },
  { id: 'Actualización', label: 'Actualización de Firmware / Componentes' },
  { id: 'Revisión Eléctrica', label: 'Revisión de Suministro y Baterías (UPS)' },
  { id: 'Otro', label: 'Otro Servicio Técnico Programado' },
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

      // Si venía un parámetro de búsqueda pero era un código QR, resolver al ID correspondiente
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
    cargarCatalogoActivos();
  }, [cargarCatalogoActivos]);

  // Activo seleccionado actualmente
  const activoSeleccionado = useMemo(() => {
    return activos.find((a) => a.id === idActivo) || null;
  }, [activos, idActivo]);

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
      // Convertir a formato ISO 8601 estricto exigido por el backend
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
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-gray-100 pb-3">
          <div className="flex items-center gap-2">
            <FiBox className="w-5 h-5 text-blue-600" />
            <h3 className="font-bold text-gray-900 text-base">Equipo e Identificación</h3>
          </div>
          <button
            type="button"
            onClick={cargarCatalogoActivos}
            disabled={cargandoActivos}
            className="text-xs text-blue-600 hover:text-blue-800 font-medium inline-flex items-center gap-1 disabled:opacity-50"
            title="Recargar catálogo de activos"
          >
            <FiRefreshCw className={`w-3.5 h-3.5 ${cargandoActivos ? 'animate-spin' : ''}`} />
            <span>Actualizar catálogo</span>
          </button>
        </div>

        <div>
          <label htmlFor="idActivo" className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
            Activo a Intervenir <span className="text-rose-500">*</span>
          </label>
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
            className={`w-full px-3.5 py-2.5 bg-gray-50/50 border rounded-xl text-sm transition-all focus:bg-white outline-none ${
              errors.idActivo && touched.idActivo
                ? 'border-rose-300 focus:ring-2 focus:ring-rose-400 bg-rose-50/30 text-rose-900'
                : 'border-gray-300 focus:ring-2 focus:ring-blue-500 text-gray-900'
            }`}
          >
            <option value="">-- Selecciona un equipo del inventario --</option>
            {activos.map((act) => (
              <option key={act.id} value={act.id}>
                {act.nombre} ({act.codigoQr || act.id}) — {act.ubicacion}
              </option>
            ))}
          </select>
          {errors.idActivo && touched.idActivo && (
            <p className="mt-1.5 text-xs text-rose-600 flex items-center gap-1 font-medium">
              <FiAlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span>{errors.idActivo}</span>
            </p>
          )}
        </div>

        {/* Resumen del equipo seleccionado */}
        {activoSeleccionado && (
          <div className="bg-blue-50/60 border border-blue-200/80 rounded-xl p-3.5 text-xs text-blue-900 space-y-1">
            <div className="flex items-center gap-1.5 font-bold text-blue-800">
              <FiInfo className="w-4 h-4 text-blue-600" />
              <span>Ficha Técnica del Activo Seleccionado</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 text-gray-700">
              <div>
                <span className="font-semibold text-gray-900">Categoría:</span> {activoSeleccionado.categoria || 'N/A'}
              </div>
              <div>
                <span className="font-semibold text-gray-900">Ubicación:</span> {activoSeleccionado.ubicacion || 'N/A'}
              </div>
              <div>
                <span className="font-semibold text-gray-900">N° Serie:</span> {activoSeleccionado.numeroSerie || activoSeleccionado.numero_serie || 'S/N'}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* TARJETA 2: CALENDARIO Y TIPO DE INTERVENCIÓN */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 space-y-4">
        <div className="flex items-center gap-2 border-b border-gray-100 pb-3">
          <FiCalendar className="w-5 h-5 text-indigo-600" />
          <h3 className="font-bold text-gray-900 text-base">Planificación Temporal y Clasificación</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Selector de Fecha y Hora Futura */}
          <div>
            <label htmlFor="fechaProgramada" className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
              Fecha y Hora de Intervención <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
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
                className={`w-full px-3.5 py-2.5 bg-gray-50/50 border rounded-xl text-sm transition-all focus:bg-white outline-none ${
                  errors.fechaProgramada && touched.fechaProgramada
                    ? 'border-rose-300 focus:ring-2 focus:ring-rose-400 bg-rose-50/30 text-rose-900'
                    : 'border-gray-300 focus:ring-2 focus:ring-blue-500 text-gray-900'
                }`}
              />
            </div>
            <p className="text-[11px] text-gray-400 mt-1">
              Debe corresponder a un momento futuro posterior a la fecha y hora actual.
            </p>
            {errors.fechaProgramada && touched.fechaProgramada && (
              <p className="mt-1 text-xs text-rose-600 flex items-center gap-1 font-medium">
                <FiAlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>{errors.fechaProgramada}</span>
              </p>
            )}
          </div>

          {/* Tipo de Mantenimiento */}
          <div>
            <label htmlFor="tipoMantenimiento" className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
              Tipo de Servicio <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
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
                className={`w-full px-3.5 py-2.5 bg-gray-50/50 border rounded-xl text-sm transition-all focus:bg-white outline-none ${
                  errors.tipo && touched.tipo
                    ? 'border-rose-300 focus:ring-2 focus:ring-rose-400 bg-rose-50/30 text-rose-900'
                    : 'border-gray-300 focus:ring-2 focus:ring-blue-500 text-gray-900'
                }`}
              >
                {TIPOS_MANTENIMIENTO.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
            {errors.tipo && touched.tipo && (
              <p className="mt-1 text-xs text-rose-600 flex items-center gap-1 font-medium">
                <FiAlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>{errors.tipo}</span>
              </p>
            )}
          </div>
        </div>
      </div>

      {/* TARJETA 3: DESCRIPCIÓN Y NOTAS TÉCNICAS */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 space-y-4">
        <div className="flex items-center gap-2 border-b border-gray-100 pb-3">
          <FiFileText className="w-5 h-5 text-emerald-600" />
          <h3 className="font-bold text-gray-900 text-base">Alcance y Tareas a Desarrollar</h3>
        </div>

        <div>
          <label htmlFor="descripcion" className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
            Descripción Detallada del Mantenimiento <span className="text-rose-500">*</span>
          </label>
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
            placeholder="Especifica las tareas requeridas (ej: Reemplazo de pasta térmica, limpieza de disipador y verificación de voltajes en fuente de poder)..."
            className={`w-full px-3.5 py-2.5 bg-gray-50/50 border rounded-xl text-sm transition-all focus:bg-white outline-none resize-none ${
              errors.descripcion && touched.descripcion
                ? 'border-rose-300 focus:ring-2 focus:ring-rose-400 bg-rose-50/30 text-rose-900'
                : 'border-gray-300 focus:ring-2 focus:ring-blue-500 text-gray-900'
            }`}
          />
          <div className="flex items-center justify-between text-[11px] text-gray-400 mt-1">
            <span>Mínimo 10 caracteres explicativos</span>
            <span>{descripcion.trim().length} caracteres ingresados</span>
          </div>
          {errors.descripcion && touched.descripcion && (
            <p className="mt-1 text-xs text-rose-600 flex items-center gap-1 font-medium">
              <FiAlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span>{errors.descripcion}</span>
            </p>
          )}
        </div>
      </div>

      {/* BARRA INFERIOR DE ACCIONES */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
        <button
          type="button"
          onClick={() => {
            if (onCancel) onCancel();
            else navigate('/inventario');
          }}
          disabled={isSubmitting}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 border border-gray-300 rounded-xl text-sm font-semibold text-gray-700 bg-white hover:bg-gray-50 transition-colors shadow-2xs disabled:opacity-50"
        >
          <FiArrowLeft className="w-4 h-4" />
          <span>Volver al Inventario</span>
        </button>

        <div className="w-full sm:w-auto flex items-center gap-2">
          <button
            type="button"
            onClick={handleReset}
            disabled={isSubmitting}
            className="w-full sm:w-auto px-4 py-2.5 text-sm font-medium text-gray-600 hover:text-gray-900 rounded-xl transition-colors disabled:opacity-50"
          >
            Limpiar Formulario
          </button>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm rounded-xl transition-all shadow-sm hover:shadow-md active:scale-98 disabled:opacity-50 disabled:pointer-events-none"
          >
            {isSubmitting ? (
              <>
                <FiRefreshCw className="w-4 h-4 animate-spin" />
                <span>Agendando Mantenimiento...</span>
              </>
            ) : (
              <>
                <FiSave className="w-4 h-4" />
                <span>Agendar Mantenimiento</span>
              </>
            )}
          </button>
        </div>
      </div>
    </form>
  );
};

export default PlanificarMantenimientoForm;
