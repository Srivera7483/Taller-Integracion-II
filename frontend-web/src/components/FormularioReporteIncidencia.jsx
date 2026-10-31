import React, { useState, useEffect } from 'react';
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
  FiArrowLeft
} from 'react-icons/fi';
import { useToast } from '../context/ToastContext';
import { saveIncidencia } from '../services/incidenciasStorage';
import { createIncidencia } from '../services/incidenciasService';
import ModalPrevisualizadorImagen from './ModalPrevisualizadorImagen';
import ImageUploader from './ImageUploader';
import api from '../services/api';

const MAX_FILE_SIZE_BYTES = 5242880;
const MENSAJE_ERROR_LIMITE_5MB = 'El archivo supera el límite de 5MB';

const CATEGORIAS_FALLA = [
  { id: 'hardware', nombre: 'Hardware', desc: 'Falla física en servidores, equipos o periféricos' },
  { id: 'software', nombre: 'Software', desc: 'Errores en sistemas operativos, servicios o aplicaciones' },
  { id: 'redes', nombre: 'Redes y Conectividad', desc: 'Caída de enlaces, routers, switches o lentitud' },
  { id: 'seguridad', nombre: 'Seguridad y Accesos', desc: 'Bloqueo de cuentas, certificados SSL o vulnerabilidades' },
  { id: 'mantenimiento', nombre: 'Mantenimiento e Infraestructura', desc: 'Suministro eléctrico, UPS o refrigeración' },
  { id: 'otro', nombre: 'Otro', desc: 'Cualquier otra anomalía no categorizada' },
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
  const [descripcion, setDescripcion] = useState('');
  const [ubicacion, setUbicacion] = useState('');


  
  // Archivo adjunto y estados para previsualizador de imágenes (TAL-133 y TAL-136)
  const [adjuntoNombre, setAdjuntoNombre] = useState('');
  const [archivoImagen, setArchivoImagen] = useState(null);
  const [imagenPreviewUrl, setImagenPreviewUrl] = useState(null);
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);

  // Limpieza preventiva de URLs en memoria al desmontar o actualizar
  useEffect(() => {
    return () => {
      if (imagenPreviewUrl && imagenPreviewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(imagenPreviewUrl);
      }
    };
  }, [imagenPreviewUrl]);

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

  // Reglas de validación centralizadas para campos obligatorios
  const validateField = (field, value) => {
    const val = typeof value === 'string' ? value.trim() : value;
    switch (field) {
      case 'titulo':
        if (!val) return 'El título de la incidencia es obligatorio';
        if (val.length < 5) return 'El título debe tener al menos 5 caracteres';
        return '';
      case 'idActivo':
        if (!val) return 'Debes especificar el ID o número de serie del activo';
        return '';
      case 'categoria':
        if (!val) return 'Selecciona una categoría de falla';
        return '';
      case 'descripcion':
        if (!val) return 'La descripción del problema es obligatoria';
        if (val.length < 15) return 'Por favor proporciona una descripción más detallada (mínimo 15 caracteres)';
        return '';
      default:
        return '';
    }
  };

  // Validador general de formulario
  const validateForm = (values = { titulo, idActivo, categoria, descripcion }) => {
    const newErrors = {};
    const requiredFields = ['titulo', 'idActivo', 'categoria', 'descripcion'];
    
    requiredFields.forEach((field) => {
      const errorMsg = validateField(field, values[field]);
      if (errorMsg) {
        newErrors[field] = errorMsg;
      }
    });

    return newErrors;
  };

  // Manejador centralizado de cambio de valor con revalidación reactiva si ya fue tocado
  const handleFieldChange = (field, value) => {
    if (field === 'titulo') setTitulo(value);
    else if (field === 'idActivo') {
      setIdActivo(value);
      setIsUrlPreloaded(false);
    } else if (field === 'categoria') setCategoria(value);
    else if (field === 'descripcion') setDescripcion(value);

    // Si el usuario ya intentó enviar o tocó el campo, revalidar inmediatamente
    if (touched[field]) {
      setErrors((prev) => ({
        ...prev,
        [field]: validateField(field, value),
      }));
    }
  };

  const handleBlur = (field) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    const currentValue =
      field === 'titulo' ? titulo :
      field === 'idActivo' ? idActivo :
      field === 'categoria' ? categoria :
      field === 'descripcion' ? descripcion : '';
    setErrors((prev) => ({
      ...prev,
      [field]: validateField(field, currentValue),
    }));
  };

  const handleClearPreloadedAsset = () => {
    setIdActivo('');
    setIsUrlPreloaded(false);
    if (touched.idActivo) {
      setErrors((prev) => ({
        ...prev,
        idActivo: validateField('idActivo', ''),
      }));
    }
  };

  /**
   * TAL-134: Validador de tamaño de archivo (Max 5MB = 5,242,880 bytes) en cliente.
   * Procesa el archivo una vez validado por <ImageUploader /> (o invocado directamente).
   */
  const handleFileAccepted = (file) => {
    if (!file) return;

    // Doble barrera de seguridad en el formulario: bloquear si supera 5,242,880 bytes (5MB)
    if (file.size > MAX_FILE_SIZE_BYTES) {
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      showToast(MENSAJE_ERROR_LIMITE_5MB, 'error');
      return;
    }

    const esImagen = file.type.startsWith('image/') || /\.(png|jpe?g|webp|gif|bmp)$/i.test(file.name);

    if (esImagen) {
      if (imagenPreviewUrl && imagenPreviewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(imagenPreviewUrl);
      }
      const preview = URL.createObjectURL(file);
      setArchivoImagen(file);
      setImagenPreviewUrl(preview);
      setAdjuntoNombre(file.name);
      showToast(`Imagen "${file.name}" cargada para previsualización`, 'info');
    } else {
      if (imagenPreviewUrl && imagenPreviewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(imagenPreviewUrl);
      }
      setArchivoImagen(file);
      setImagenPreviewUrl(null);
      setAdjuntoNombre(file.name);
      showToast(`Archivo "${file.name}" adjuntado al reporte`, 'info');
    }
  };

  /**
   * TAL-133 - Criterio de Aceptación b:
   * Posibilidad de limpiar la selección antes de enviar el POST final.
   */
  const handleLimpiarImagen = (options = {}) => {
    if (imagenPreviewUrl && imagenPreviewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(imagenPreviewUrl);
    }
    setArchivoImagen(null);
    setImagenPreviewUrl(null);
    setAdjuntoNombre('');
    setIsImageModalOpen(false);
    if (!options?.silent) {
      showToast('Selección de imagen eliminada', 'info');
    }
  };

  const handleCambiarImagen = () => {
    handleLimpiarImagen();
  };

  const handleResetForm = () => {
    setTitulo('');
    if (!assetFromUrl) {
      setIdActivo('');
      setIsUrlPreloaded(false);
    }
    setCategoria('');
    setDescripcion('');
    setUbicacion('');
    if (imagenPreviewUrl && imagenPreviewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(imagenPreviewUrl);
    }
    setArchivoImagen(null);
    setImagenPreviewUrl(null);
    setAdjuntoNombre('');
    setIsImageModalOpen(false);
    setErrors({});
    setTouched({});
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (isSubmitting) return;

    const currentValues = { titulo, idActivo, categoria, descripcion };
    const formErrors = validateForm(currentValues);
    setErrors(formErrors);

    // Marcar todos los campos obligatorios como tocados para desplegar advertencias en rojo
    setTouched({
      titulo: true,
      idActivo: true,
      categoria: true,
      descripcion: true,
    });

    // Criterio 1: Prevenir envío y notificar si faltan campos obligatorios
    if (Object.keys(formErrors).length > 0) {
      showToast('Por favor completa todos los campos requeridos correctamente', 'error');
      return;
    }

    // TAL-134 - Criterio de Aceptación a:
    // El POST a Cloudinary/Backend nunca se ejecuta si el archivo es mayor a 5MB (5,242,880 bytes)
    if (archivoImagen && archivoImagen.size > MAX_FILE_SIZE_BYTES) {
      handleLimpiarImagen({ silent: true });
      showToast(MENSAJE_ERROR_LIMITE_5MB, 'error');
      return;
    }

    // Criterio 2: Activar estado de envío / loading y deshabilitar botón
    setIsSubmitting(true);

    // Se concatenan metadatos contextuales en la descripción
    const descripcionCompleta = `[Categoría: ${categoria}] [Ubicación: ${ubicacion}]\n${descripcion.trim()}`;

    // Resolver ID de activo si es código QR o identificador amigable
    let resolvedActivoId = idActivo.trim();
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(resolvedActivoId);

    if (!isUuid) {
      try {
        const qrResp = await api.get(`/activos/validar-qr?codigoQr=${encodeURIComponent(resolvedActivoId)}`);
        if (qrResp.data?.valido && qrResp.data?.activo?.id) {
          resolvedActivoId = qrResp.data.activo.id;
        }
      } catch {
        const mapaConocido = {
          'ACT-2026-0001': 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
          'ACT-2026-0002': '550e8400-e29b-41d4-a716-446655440000',
          'ACT-2026-0003': '3fa85f64-5717-4562-b3fc-2c963f66afa6',
        };
        if (mapaConocido[resolvedActivoId.toUpperCase()]) {
          resolvedActivoId = mapaConocido[resolvedActivoId.toUpperCase()];
        }
      }
    }

    const payloadApi = {
      titulo: titulo.trim(),
      id_activo: resolvedActivoId,
      descripcion: descripcionCompleta,
    };

    let idGenerado = null;

    try {
      const resp = await createIncidencia(payloadApi);
      idGenerado = resp?.id_incidencia || resp?.id;
    } catch (apiErr) {
      console.warn('[Incidencias] Backend no disponible o modo local, procediendo con almacenamiento local:', apiErr);
    }

    let urlEvidencia = null;

    // Si el usuario adjuntó una imagen válida (<= 5MB) y no la limpió, subirla como evidencia asociada a la incidencia (TAL-14/TAL-133/TAL-134)
    if (idGenerado && archivoImagen && archivoImagen.size <= MAX_FILE_SIZE_BYTES) {
      try {
        const formData = new FormData();
        formData.append('file', archivoImagen);
        formData.append('id_tipo_evidencia', '1');
        const uploadResp = await api.post(`/incidencias/${idGenerado}/evidencias/upload`, formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });
        urlEvidencia = uploadResp.data?.url_evidencia || uploadResp.data?.url_cloudinary;
      } catch (uploadErr) {
        console.warn('[Incidencias] No se pudo subir imagen al backend (S3/Uploads):', uploadErr);
      }
    }

    const nuevaIncidenciaLocal = {
      id: idGenerado || `INC-${Date.now().toString().slice(-4)}`,
      titulo: titulo.trim(),
      id_activo: resolvedActivoId,
      descripcion: descripcionCompleta,
      categoria,
      ubicacion,
      estado: 'Pendiente',
      fecha: new Date().toISOString(),
      evidencias: urlEvidencia ? [urlEvidencia] : (imagenPreviewUrl ? [imagenPreviewUrl] : []),
      imagenAdjuntaNombre: archivoImagen?.name || null,
    };

    // Sincronizar almacenamiento local para compatibilidad
    saveIncidencia(nuevaIncidenciaLocal);

    setIsSubmitting(false);
    showToast(`¡Incidencia ${nuevaIncidenciaLocal.id} registrada con éxito!`, 'success');

    // Navegación tras registrar
    if (onCancel) {
      onCancel();
    } else {
      navigate('/incidencias');
    }
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
                onChange={(e) => handleFieldChange('titulo', e.target.value)}
                onBlur={() => handleBlur('titulo')}
                disabled={isSubmitting}
                placeholder="Ej. Interrupción de servicio en base de datos PostgreSQL principal"
                className={`w-full pl-11 pr-4 py-2.5 rounded-lg border text-sm transition-all outline-none ${
                  touched.titulo && errors.titulo
                    ? 'border-red-400 focus:ring-2 focus:ring-red-300 focus:border-red-500 bg-red-50/20'
                    : 'border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white'
                } disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed`}
                required
              />
            </div>
            {touched.titulo && errors.titulo ? (
              <p className="mt-1 text-xs text-red-600 flex items-center gap-1 font-medium">
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
                onChange={(e) => handleFieldChange('idActivo', e.target.value)}
                onBlur={() => handleBlur('idActivo')}
                disabled={isSubmitting}
                placeholder="Ej. SN-MPM2-2023-001 o ACT-SRV-04"
                className={`w-full pl-11 ${
                  isUrlPreloaded ? 'pr-10 bg-blue-50/30' : 'pr-4 bg-white'
                } py-2.5 rounded-lg border text-sm transition-all outline-none font-mono ${
                  touched.idActivo && errors.idActivo
                    ? 'border-red-400 focus:ring-2 focus:ring-red-300 focus:border-red-500 bg-red-50/20'
                    : 'border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500'
                } disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed`}
                required
              />
              {isUrlPreloaded && (
                <button
                  type="button"
                  onClick={handleClearPreloadedAsset}
                  disabled={isSubmitting}
                  title="Limpiar ID pre-cargado" aria-label="Limpiar ID de activo pre-cargado"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 transition-colors disabled:cursor-not-allowed"
                >
                  <FiX className="w-4 h-4" />
                </button>
              )}
            </div>

            {touched.idActivo && errors.idActivo ? (
              <p className="mt-1 text-xs text-red-600 flex items-center gap-1 font-medium">
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

      {/* SECCIÓN 2: CLASIFICACIÓN DE LA FALLA */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-6">
        <div className="border-b border-gray-100 pb-4">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <FiLayers className="text-blue-600" />
            Clasificación de la Falla
          </h3>
          <p className="text-sm text-gray-500 mt-1">
            Indica el origen del fallo para determinar la atención técnica requerida.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6">
          {/* Campo: Categoría de Falla */}
          <div>
            <label htmlFor="incidencia-categoria" className="block text-sm font-medium text-gray-700 mb-1">
              Categoría de Falla <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <select
                id="incidencia-categoria"
                value={categoria}
                onChange={(e) => handleFieldChange('categoria', e.target.value)}
                onBlur={() => handleBlur('categoria')}
                disabled={isSubmitting}
                className={`w-full px-4 py-2.5 rounded-lg border text-sm transition-all outline-none appearance-none bg-white ${
                  touched.categoria && errors.categoria
                    ? 'border-red-400 focus:ring-2 focus:ring-red-300 focus:border-red-500 bg-red-50/20'
                    : 'border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500'
                } disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed`}
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
              <p className="mt-1 text-xs text-red-600 flex items-center gap-1 font-medium">
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
            onChange={(e) => handleFieldChange('descripcion', e.target.value)}
            onBlur={() => handleBlur('descripcion')}
            disabled={isSubmitting}
            placeholder="Describe qué ocurrió, cuáles fueron los síntomas observados, mensajes de error en pantalla o códigos emitidos, y si el incidente causó la detención de operaciones..."
            className={`w-full p-4 rounded-lg border text-sm transition-all outline-none resize-y ${
              touched.descripcion && errors.descripcion
                ? 'border-red-400 focus:ring-2 focus:ring-red-300 focus:border-red-500 bg-red-50/20'
                : 'border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white'
            } disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed`}
            required
          />

          {touched.descripcion && errors.descripcion ? (
            <p className="mt-1 text-xs text-red-600 flex items-center gap-1 font-medium">
              <FiAlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
              {errors.descripcion}
            </p>
          ) : (
            <p className="mt-1 text-xs text-gray-500">
              Sé lo más específico posible para agilizar el diagnóstico del equipo de soporte.
            </p>
          )}
        </div>

        {/* Campo: Adjuntar Evidencias Fotográficas con Validador de Tamaño Max 5MB (TAL-134) y Previsualizador (TAL-133) */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Evidencia Fotográfica o Archivo de Registro <span className="text-xs text-gray-400 font-normal">(Opcional — Máx. 5MB)</span>
          </label>

          <ImageUploader
            archivoImagen={archivoImagen}
            imagenPreviewUrl={imagenPreviewUrl}
            adjuntoNombre={adjuntoNombre}
            onFileAccepted={handleFileAccepted}
            onClearFile={handleLimpiarImagen}
            onOpenModal={() => setIsImageModalOpen(true)}
            disabled={isSubmitting}
            fileInputRef={fileInputRef}
          />
        </div>
      </div>

      {/* BOTONES DE ACCIÓN */}
      <div className="flex flex-col-reverse sm:flex-row items-center justify-between gap-4 pt-2">
        <button
          type="button"
          disabled={isSubmitting}
          onClick={() => {
            if (onCancel) {
              onCancel();
            } else {
              navigate('/incidencias');
            }
          }}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg border border-gray-300 text-gray-700 font-medium bg-white hover:bg-gray-50 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <FiArrowLeft className="w-4 h-4" />
          Volver a Incidencias
        </button>

        <div className="flex w-full sm:w-auto items-center gap-3">
          <button
            type="button"
            disabled={isSubmitting}
            onClick={handleResetForm}
            className="w-full sm:w-auto px-4 py-2.5 text-sm font-medium text-gray-500 hover:text-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            Limpiar Campos
          </button>

          <button
            type="submit"
            id="btn-enviar-incidencia"
            disabled={isSubmitting}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 focus:ring-4 focus:ring-blue-200 transition-all shadow-sm disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
          >
            {isSubmitting ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
                </svg>
                <span>Enviando incidencia...</span>
              </>
            ) : (
              <>
                <FiSend className="w-4 h-4" />
                <span>Enviar Incidencia</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Modal Previsualizador de Imágenes Subidas a S3 (TAL-133) */}
      <ModalPrevisualizadorImagen
        isOpen={isImageModalOpen}
        onClose={() => setIsImageModalOpen(false)}
        imageUrl={imagenPreviewUrl}
        imageName={adjuntoNombre}
        imageSize={archivoImagen?.size}
        onLimpiarImagen={handleLimpiarImagen}
        onCambiarImagen={handleCambiarImagen}
      />
    </form>
  );
};

export default FormularioReporteIncidencia;
