import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { 
  FiFileText, 
  FiBox, 
  FiLayers, 
  FiAlignLeft, 
  FiAlertCircle, 
  FiCheckCircle, 
  FiLink, 
  FiX, 
  FiSend, 
  FiArrowLeft,
  FiUploadCloud
} from 'react-icons/fi';
import { useToast } from '../context/ToastContext';
import { saveIncidencia } from '../services/incidenciasStorage';

const CATEGORIAS_FALLA = [
  { id: 'hardware', nombre: 'Hardware', desc: 'Falla física en servidores, equipos o periféricos' },
  { id: 'software', nombre: 'Software', desc: 'Errores en sistemas operativos, servicios o aplicaciones' },
  { id: 'redes', nombre: 'Redes y Conectividad', desc: 'Caída de enlaces, routers, switches o lentitud' },
  { id: 'seguridad', nombre: 'Seguridad y Accesos', desc: 'Bloqueo de cuentas, certificados SSL o vulnerabilidades' },
  { id: 'mantenimiento', nombre: 'Mantenimiento e Infraestructura', desc: 'Suministro eléctrico, UPS o refrigeración' },
  { id: 'otro', nombre: 'Otro', desc: 'Cualquier otra anomalía no categorizada' },
];

const PRIORIDADES = [
  { id: 'baja', label: 'Baja', color: 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100' },
  { id: 'media', label: 'Media', color: 'border-yellow-200 bg-yellow-50 text-yellow-700 hover:bg-yellow-100' },
  { id: 'alta', label: 'Alta', color: 'border-orange-200 bg-orange-50 text-orange-700 hover:bg-orange-100' },
  { id: 'critica', label: 'Crítica', color: 'border-red-200 bg-red-50 text-red-700 hover:bg-red-100' },
];

const FormularioReporteIncidencia = ({ onCancel }) => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { showToast } = useToast();

  // Extraer ID del activo desde varios posibles parámetros de URL
  const assetFromUrl = 
    searchParams.get('id_activo') || 
    searchParams.get('activo') || 
    searchParams.get('assetId') || 
    searchParams.get('id') || 
    '';

  // Estado del formulario
  const [titulo, setTitulo] = useState('');
  const [idActivo, setIdActivo] = useState(assetFromUrl);
  const [isUrlPreloaded, setIsUrlPreloaded] = useState(Boolean(assetFromUrl));
  const [categoria, setCategoria] = useState('');
  const [prioridad, setPrioridad] = useState('media');
  const [descripcion, setDescripcion] = useState('');
  const [ubicacion, setUbicacion] = useState('');
  
  // Archivo adjunto simulado
  const [adjuntoNombre, setAdjuntoNombre] = useState('');

  // Estados de control y validación
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});

  // Sincronizar si cambia el parámetro de búsqueda en URL
  const [prevAssetFromUrl, setPrevAssetFromUrl] = useState(assetFromUrl);
  if (assetFromUrl !== prevAssetFromUrl) {
    setPrevAssetFromUrl(assetFromUrl);
    setIdActivo(assetFromUrl);
    setIsUrlPreloaded(Boolean(assetFromUrl));
  }

  // Validaciones en tiempo real
  const validateForm = () => {
    const newErrors = {};

    if (!titulo.trim()) {
      newErrors.titulo = 'El título de la incidencia es obligatorio';
    } else if (titulo.trim().length < 5) {
      newErrors.titulo = 'El título debe tener al menos 5 caracteres';
    }

    if (!idActivo.trim()) {
      newErrors.idActivo = 'Debes especificar el ID o número de serie del activo';
    }

    if (!categoria) {
      newErrors.categoria = 'Selecciona una categoría de falla';
    }

    if (!descripcion.trim()) {
      newErrors.descripcion = 'La descripción del problema es obligatoria';
    } else if (descripcion.trim().length < 15) {
      newErrors.descripcion = 'Por favor proporciona una descripción más detallada (mínimo 15 caracteres)';
    }

    return newErrors;
  };

  const handleBlur = (field) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    const formErrors = validateForm();
    setErrors(formErrors);
  };

  const handleClearPreloadedAsset = () => {
    setIdActivo('');
    setIsUrlPreloaded(false);
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setAdjuntoNombre(file.name);
      showToast(`Archivo "${file.name}" adjuntado al reporte`, 'info');
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const formErrors = validateForm();
    setErrors(formErrors);

    // Marcar todos como tocados para mostrar validaciones
    setTouched({
      titulo: true,
      idActivo: true,
      categoria: true,
      descripcion: true,
    });

    if (Object.keys(formErrors).length > 0) {
      showToast('Por favor completa todos los campos requeridos correctamente', 'error');
      return;
    }

    setIsSubmitting(true);

    const nuevaIncidencia = {
      id: `INC-${Math.floor(1000 + Math.random() * 9000)}`,
      titulo: titulo.trim(),
      id_activo: idActivo.trim(),
      categoria,
      prioridad,
      descripcion: descripcion.trim(),
      ubicacion: ubicacion.trim() || 'No especificada',
      adjunto: adjuntoNombre || null,
      fecha_creacion: new Date().toISOString(),
      estado: 'Pendiente',
    };

    console.log('[Incidencias] Payload generado para la API:', nuevaIncidencia);

    // Persistir temporalmente en Cookie para pruebas del frontend
    saveIncidencia(nuevaIncidencia);

    // Simulación de respuesta de backend
    setTimeout(() => {
      setIsSubmitting(false);
      showToast(`¡Incidencia ${nuevaIncidencia.id} registrada con éxito!`, 'success');
      
      // Navegación tras registrar
      if (onCancel) {
        onCancel();
      } else {
        navigate('/incidencias');
      }
    }, 1000);
  };

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-8">
      {/* SECCIÓN 1: IDENTIFICACIÓN DEL PROBLEMA Y DEL ACTIVO */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-6">
        <div className="border-b border-gray-100 pb-4">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <FiAlertCircle className="text-blue-600" />
            Datos Principales del Reporte
          </h3>
          <p className="text-sm text-gray-500 mt-1">
            Ingresa la información básica y el recurso de infraestructura que presenta la falla.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Campo: Título de la Incidencia */}
          <div className="md:col-span-2">
            <label htmlFor="incidencia-titulo" className="block text-sm font-medium text-gray-700 mb-1">
              Título de la Incidencia <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                <FiFileText className="w-5 h-5" />
              </div>
              <input
                id="incidencia-titulo"
                type="text"
                value={titulo}
                onChange={(e) => {
                  setTitulo(e.target.value);
                  if (touched.titulo) {
                    setErrors((prev) => ({ ...prev, titulo: e.target.value.trim() ? '' : 'El título es obligatorio' }));
                  }
                }}
                onBlur={() => handleBlur('titulo')}
                placeholder="Ej. Interrupción de servicio en base de datos PostgreSQL principal"
                className={`w-full pl-11 pr-4 py-2.5 rounded-lg border text-sm transition-all outline-none ${
                  touched.titulo && errors.titulo
                    ? 'border-red-400 focus:ring-2 focus:ring-red-300 focus:border-red-500 bg-red-50/20'
                    : 'border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white'
                }`}
                required
              />
            </div>
            {touched.titulo && errors.titulo ? (
              <p className="mt-1 text-xs text-red-600 flex items-center gap-1">
                <FiAlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                {errors.titulo}
              </p>
            ) : (
              <p className="mt-1 text-xs text-gray-500">
                Un resumen conciso y claro de la anomalía identificada.
              </p>
            )}
          </div>

          {/* Campo: ID del Activo (con soporte para Pre-carga de URL) */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label htmlFor="incidencia-id-activo" className="block text-sm font-medium text-gray-700">
                ID del Activo <span className="text-red-500">*</span>
              </label>

              {isUrlPreloaded && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
                  <FiLink className="w-3 h-3" /> Pre-cargado desde URL
                </span>
              )}
            </div>

            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                <FiBox className="w-5 h-5" />
              </div>
              <input
                id="incidencia-id-activo"
                type="text"
                value={idActivo}
                onChange={(e) => {
                  setIdActivo(e.target.value);
                  setIsUrlPreloaded(false);
                  if (touched.idActivo) {
                    setErrors((prev) => ({ ...prev, idActivo: e.target.value.trim() ? '' : 'El ID de activo es obligatorio' }));
                  }
                }}
                onBlur={() => handleBlur('idActivo')}
                placeholder="Ej. SN-MPM2-2023-001 o ACT-SRV-04"
                className={`w-full pl-11 ${
                  isUrlPreloaded ? 'pr-10 bg-blue-50/30' : 'pr-4 bg-white'
                } py-2.5 rounded-lg border text-sm transition-all outline-none font-mono ${
                  touched.idActivo && errors.idActivo
                    ? 'border-red-400 focus:ring-2 focus:ring-red-300 focus:border-red-500 bg-red-50/20'
                    : 'border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500'
                }`}
                required
              />
              {isUrlPreloaded && (
                <button
                  type="button"
                  onClick={handleClearPreloadedAsset}
                  title="Limpiar ID pre-cargado"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <FiX className="w-4 h-4" />
                </button>
              )}
            </div>

            {touched.idActivo && errors.idActivo ? (
              <p className="mt-1 text-xs text-red-600 flex items-center gap-1">
                <FiAlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                {errors.idActivo}
              </p>
            ) : isUrlPreloaded ? (
              <p className="mt-1 text-xs text-blue-600 flex items-center gap-1">
                <FiCheckCircle className="w-3.5 h-3.5" />
                Identificador de equipo cargado automáticamente desde el enlace.
              </p>
            ) : (
              <p className="mt-1 text-xs text-gray-500">
                Código de inventario o número de serie del componente afectado.
              </p>
            )}
          </div>

          {/* Campo: Ubicación Física / Sala (Opcional pero muy útil para soporte) */}
          <div className="space-y-1.5">
            <label htmlFor="incidencia-ubicacion" className="block text-sm font-medium text-gray-700">
              Ubicación o Entorno <span className="text-xs text-gray-400 font-normal">(Opcional)</span>
            </label>
            <div className="relative">
              <input
                id="incidencia-ubicacion"
                type="text"
                value={ubicacion}
                onChange={(e) => setUbicacion(e.target.value)}
                placeholder="Ej. Rack A3 - DataCenter Norte / Piso 2"
                className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm transition-all"
              />
            </div>
            <p className="mt-1 text-xs text-gray-500">
              Lugar físico o entorno donde se encuentra el dispositivo.
            </p>
          </div>
        </div>
      </div>

      {/* SECCIÓN 2: CLASIFICACIÓN DE LA FALLA Y PRIORIDAD */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-6">
        <div className="border-b border-gray-100 pb-4">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <FiLayers className="text-blue-600" />
            Clasificación y Severidad
          </h3>
          <p className="text-sm text-gray-500 mt-1">
            Indica el origen del fallo y su impacto para determinar la atención requerida.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Campo: Categoría de Falla */}
          <div>
            <label htmlFor="incidencia-categoria" className="block text-sm font-medium text-gray-700 mb-1">
              Categoría de Falla <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <select
                id="incidencia-categoria"
                value={categoria}
                onChange={(e) => {
                  setCategoria(e.target.value);
                  if (touched.categoria) {
                    setErrors((prev) => ({ ...prev, categoria: e.target.value ? '' : 'Selecciona una categoría' }));
                  }
                }}
                onBlur={() => handleBlur('categoria')}
                className={`w-full px-4 py-2.5 rounded-lg border text-sm transition-all outline-none appearance-none bg-white ${
                  touched.categoria && errors.categoria
                    ? 'border-red-400 focus:ring-2 focus:ring-red-300 focus:border-red-500 bg-red-50/20'
                    : 'border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500'
                }`}
                required
              >
                <option value="" disabled>-- Selecciona el tipo de falla --</option>
                {CATEGORIAS_FALLA.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.nombre}
                  </option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3.5 text-gray-400">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>

            {touched.categoria && errors.categoria ? (
              <p className="mt-1 text-xs text-red-600 flex items-center gap-1">
                <FiAlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                {errors.categoria}
              </p>
            ) : (
              <p className="mt-1 text-xs text-gray-500">
                {categoria 
                  ? CATEGORIAS_FALLA.find(c => c.id === categoria)?.desc 
                  : 'Ayuda a canalizar el ticket al equipo técnico idóneo.'}
              </p>
            )}
          </div>

          {/* Campo: Nivel de Prioridad */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Prioridad / Severidad Estimada
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-0.5">
              {PRIORIDADES.map((p) => {
                const isSelected = prioridad === p.id;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setPrioridad(p.id)}
                    className={`px-3 py-2 rounded-lg text-xs font-semibold border transition-all text-center ${
                      isSelected
                        ? `${p.color} ring-2 ring-blue-500 shadow-sm font-bold scale-[1.02]`
                        : 'border-gray-200 bg-gray-50 text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    {p.label}
                  </button>
                );
              })}
            </div>
            <p className="mt-1 text-xs text-gray-500">
              Nivel de urgencia para la resolución de la incidencia.
            </p>
          </div>
        </div>
      </div>

      {/* SECCIÓN 3: DESCRIPCIÓN DETALLADA Y EVIDENCIA */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-6">
        <div className="border-b border-gray-100 pb-4 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <FiAlignLeft className="text-blue-600" />
              Detalle y Diagnóstico
            </h3>
            <p className="text-sm text-gray-500 mt-1">
              Proporciona suficiente detalle para reproducir y diagnosticar el problema.
            </p>
          </div>
          <span className="text-xs font-mono text-gray-400">
            {descripcion.length} / 1000 caracteres
          </span>
        </div>

        {/* Campo: Descripción */}
        <div>
          <label htmlFor="incidencia-descripcion" className="block text-sm font-medium text-gray-700 mb-1">
            Descripción de la Falla <span className="text-red-500">*</span>
          </label>
          <textarea
            id="incidencia-descripcion"
            rows={5}
            maxLength={1000}
            value={descripcion}
            onChange={(e) => {
              setDescripcion(e.target.value);
              if (touched.descripcion) {
                setErrors((prev) => ({
                  ...prev,
                  descripcion: e.target.value.trim().length >= 15 ? '' : 'La descripción debe tener al menos 15 caracteres',
                }));
              }
            }}
            onBlur={() => handleBlur('descripcion')}
            placeholder="Describe qué ocurrió, cuáles fueron los síntomas observados, mensajes de error en pantalla o códigos emitidos, y si el incidente causó la detención de operaciones..."
            className={`w-full p-4 rounded-lg border text-sm transition-all outline-none resize-y ${
              touched.descripcion && errors.descripcion
                ? 'border-red-400 focus:ring-2 focus:ring-red-300 focus:border-red-500 bg-red-50/20'
                : 'border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white'
            }`}
            required
          />

          {touched.descripcion && errors.descripcion ? (
            <p className="mt-1 text-xs text-red-600 flex items-center gap-1">
              <FiAlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
              {errors.descripcion}
            </p>
          ) : (
            <p className="mt-1 text-xs text-gray-500">
              Sé lo más específico posible para agilizar el diagnóstico del equipo de soporte.
            </p>
          )}
        </div>

        {/* Campo Opcional: Adjuntar Evidencias (Logs, Captura de Pantalla) */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Evidencia o Archivo de Registro <span className="text-xs text-gray-400 font-normal">(Opcional)</span>
          </label>
          
          <div className="relative border-2 border-dashed border-gray-300 hover:border-blue-400 rounded-xl p-5 text-center bg-gray-50/50 hover:bg-blue-50/20 transition-all cursor-pointer">
            <input 
              type="file" 
              onChange={handleFileChange}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              accept=".png,.jpg,.jpeg,.log,.txt,.pdf"
            />
            <div className="flex flex-col items-center justify-center space-y-2">
              <FiUploadCloud className="w-8 h-8 text-blue-500" />
              <div className="text-sm text-gray-600">
                {adjuntoNombre ? (
                  <span className="font-semibold text-blue-600">Archivo seleccionado: {adjuntoNombre}</span>
                ) : (
                  <>
                    <span className="font-semibold text-blue-600 hover:underline">Sube un archivo</span> o arrastra y suelta aquí
                  </>
                )}
              </div>
              <p className="text-xs text-gray-400">
                PNG, JPG, LOG o TXT (máximo 10MB)
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* BOTONES DE ACCIÓN */}
      <div className="flex flex-col-reverse sm:flex-row items-center justify-between gap-4 pt-2">
        <button
          type="button"
          onClick={() => {
            if (onCancel) {
              onCancel();
            } else {
              navigate('/incidencias');
            }
          }}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg border border-gray-300 text-gray-700 font-medium bg-white hover:bg-gray-50 transition-colors shadow-sm"
        >
          <FiArrowLeft className="w-4 h-4" />
          Volver a Incidencias
        </button>

        <div className="flex w-full sm:w-auto items-center gap-3">
          <button
            type="button"
            onClick={() => {
              setTitulo('');
              if (!assetFromUrl) setIdActivo('');
              setCategoria('');
              setDescripcion('');
              setUbicacion('');
              setAdjuntoNombre('');
              setErrors({});
              setTouched({});
            }}
            className="w-full sm:w-auto px-4 py-2.5 text-sm font-medium text-gray-500 hover:text-gray-800 transition-colors"
          >
            Limpiar Campos
          </button>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 focus:ring-4 focus:ring-blue-200 transition-all shadow-sm disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
                </svg>
                Registrando...
              </>
            ) : (
              <>
                <FiSend className="w-4 h-4" />
                Registrar Incidencia
              </>
            )}
          </button>
        </div>
      </div>
    </form>
  );
};

export default FormularioReporteIncidencia;
