import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FiX,
  FiPlus,
  FiSend,
  FiBox,
  FiCpu,
  FiWifi,
  FiShield,
  FiTool,
  FiHelpCircle,
  FiCamera,
  FiTrash2,
  FiExternalLink,
  FiAlertCircle,
  FiCheck,
  FiFileText
} from 'react-icons/fi';
import { useToast } from '../context/ToastContext';
import { createIncidencia } from '../services/incidenciasService';
import { saveIncidencia } from '../services/incidenciasStorage';
import api from '../services/api';

const MAX_FILE_SIZE_BYTES = 5242880; // 5MB

// Categorías optimizadas para selección táctil rápida en móviles
const CATEGORIAS_RAPIDAS = [
  { id: 'hardware', nombre: 'Hardware', icon: FiBox, desc: 'Equipos o piezas' },
  { id: 'software', nombre: 'Software', icon: FiCpu, desc: 'Sistemas o apps' },
  { id: 'redes', nombre: 'Redes', icon: FiWifi, desc: 'Internet o switches' },
  { id: 'seguridad', nombre: 'Seguridad', icon: FiShield, desc: 'Accesos o claves' },
  { id: 'mantenimiento', nombre: 'Infraestructura', icon: FiTool, desc: 'Energía o rack' },
  { id: 'otro', nombre: 'Otro', icon: FiHelpCircle, desc: 'Otra anomalía' },
];

// Activos sugeridos comunes para selección con 1 tap
const ACTIVOS_FRECUENTES = [
  { id: 'ACT-2026-0001', etiqueta: 'Proyector Epson' },
  { id: 'SRV-BLADE-07', etiqueta: 'Servidor Blade' },
  { id: 'SW-CORE-01', etiqueta: 'Switch Cisco' },
  { id: 'ACT-2026-0002', etiqueta: 'All-in-One Dell' },
  { id: 'SN-MPM2-2023-001', etiqueta: 'MacBook Pro' },
];

/**
 * Modal con Formulario Simplificado de "Nueva Incidencia" adaptado para Celulares.
 * - Flujo ergonómico con controles táctiles grandes (chips).
 * - Selección rápida de activos y categorías sin teclear en exceso.
 * - Captura o carga de foto con previsualización inmediata y validación de 5MB.
 * - Enlace directo para abrir la vista completa de creación si se requiere.
 */
const ModalNuevaIncidenciaMobile = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const fileInputRef = useRef(null);

  // Estados del formulario simplificado
  const [titulo, setTitulo] = useState('');
  const [idActivo, setIdActivo] = useState('');
  const [categoria, setCategoria] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [ubicacion, setUbicacion] = useState('');

  // Evidencia fotográfica
  const [archivoImagen, setArchivoImagen] = useState(null);
  const [imagenPreviewUrl, setImagenPreviewUrl] = useState(null);

  // Estados de control y validación
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errores, setErrores] = useState({});
  const [tocado, setTocado] = useState({});

  // Limpieza preventiva de URLs en memoria
  useEffect(() => {
    return () => {
      if (imagenPreviewUrl && imagenPreviewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(imagenPreviewUrl);
      }
    };
  }, [imagenPreviewUrl]);

  // Bloquear scroll de la página trasera mientras el modal esté abierto
  useEffect(() => {
    if (isOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isOpen]);

  // Cerrar con la tecla Escape
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen && !isSubmitting) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isSubmitting, onClose]);

  if (!isOpen) return null;

  // Validación de campos individuales
  const validarCampo = (campo, valor) => {
    const val = typeof valor === 'string' ? valor.trim() : valor;
    switch (campo) {
      case 'titulo':
        if (!val) return 'El título es obligatorio';
        if (val.length < 5) return 'Mínimo 5 caracteres';
        return '';
      case 'idActivo':
        if (!val) return 'Indica el ID o serie del activo';
        return '';
      case 'categoria':
        if (!val) return 'Selecciona una categoría';
        return '';
      case 'descripcion':
        if (!val) return 'La descripción es obligatoria';
        if (val.length < 10) return 'Mínimo 10 caracteres';
        return '';
      default:
        return '';
    }
  };

  const handleFieldChange = (campo, valor) => {
    if (campo === 'titulo') setTitulo(valor);
    if (campo === 'idActivo') setIdActivo(valor);
    if (campo === 'categoria') setCategoria(valor);
    if (campo === 'descripcion') setDescripcion(valor);
    if (campo === 'ubicacion') setUbicacion(valor);

    if (tocado[campo]) {
      setErrores((prev) => ({ ...prev, [campo]: validarCampo(campo, valor) }));
    }
  };

  const handleBlur = (campo) => {
    setTocado((prev) => ({ ...prev, [campo]: true }));
    const val =
      campo === 'titulo' ? titulo :
      campo === 'idActivo' ? idActivo :
      campo === 'categoria' ? categoria :
      campo === 'descripcion' ? descripcion : '';
    setErrores((prev) => ({ ...prev, [campo]: validarCampo(campo, val) }));
  };

  // Manejo de archivo fotográfico
  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_FILE_SIZE_BYTES) {
      showToast('El archivo supera el límite de 5MB', 'error');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    if (imagenPreviewUrl && imagenPreviewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(imagenPreviewUrl);
    }

    const preview = URL.createObjectURL(file);
    setArchivoImagen(file);
    setImagenPreviewUrl(preview);
    showToast('Foto adjuntada correctamente', 'info');
  };

  const handleEliminarFoto = () => {
    if (imagenPreviewUrl && imagenPreviewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(imagenPreviewUrl);
    }
    setArchivoImagen(null);
    setImagenPreviewUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleIrAFormularioCompleto = () => {
    onClose();
    navigate('/incidencias/nueva');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;

    const nuevosErrores = {
      titulo: validarCampo('titulo', titulo),
      idActivo: validarCampo('idActivo', idActivo),
      categoria: validarCampo('categoria', categoria),
      descripcion: validarCampo('descripcion', descripcion),
    };

    setErrores(nuevosErrores);
    setTocado({
      titulo: true,
      idActivo: true,
      categoria: true,
      descripcion: true,
    });

    const hayErrores = Object.values(nuevosErrores).some((err) => Boolean(err));
    if (hayErrores) {
      showToast('Por favor completa los campos requeridos', 'error');
      return;
    }

    setIsSubmitting(true);

    const descripcionCompleta = `[Categoría: ${categoria}] [Origen: Móvil FAB]${
      ubicacion.trim() ? ` [Ubicación: ${ubicacion.trim()}]` : ''
    }\n${descripcion.trim()}`;

    // Resolver ID si es un código conocido
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
    let urlEvidencia = null;

    try {
      const resp = await createIncidencia(payloadApi);
      idGenerado = resp?.id_incidencia || resp?.id;
    } catch {
      // Continuar con fallback local
    }

    // Subir evidencia si fue adjuntada
    if (idGenerado && archivoImagen && archivoImagen.size <= MAX_FILE_SIZE_BYTES) {
      try {
        const formData = new FormData();
        formData.append('file', archivoImagen);
        formData.append('id_tipo_evidencia', '1');
        const uploadResp = await api.post(`/incidencias/${idGenerado}/evidencias/upload`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        urlEvidencia = uploadResp.data?.url_evidencia || uploadResp.data?.url_cloudinary;
      } catch {
        // Fallback controlado
      }
    }

    const nuevaIncidenciaLocal = {
      id: idGenerado || `INC-${Date.now().toString().slice(-4)}`,
      titulo: titulo.trim(),
      id_activo: resolvedActivoId,
      descripcion: descripcionCompleta,
      categoria,
      ubicacion: ubicacion.trim(),
      estado: 'Pendiente',
      fecha: new Date().toISOString(),
      evidencias: urlEvidencia ? [urlEvidencia] : (imagenPreviewUrl ? [imagenPreviewUrl] : []),
      imagenAdjuntaNombre: archivoImagen?.name || null,
    };

    // Guardar en cookies / almacenamiento local y emitir evento
    saveIncidencia(nuevaIncidenciaLocal);
    window.dispatchEvent(new Event('incidencia-creada'));

    setIsSubmitting(false);
    showToast(`¡Incidencia ${nuevaIncidenciaLocal.id} registrada con éxito!`, 'success');
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-gray-900/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isSubmitting) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-incidencia-mobile-titulo"
    >
      <div className="bg-white w-full sm:max-w-lg rounded-t-2xl sm:rounded-2xl shadow-2xl flex flex-col max-h-[92vh] sm:max-h-[85vh] overflow-hidden border border-gray-200 animate-in slide-in-from-bottom-4 duration-250">
        {/* Manilla táctil para arrastrar en celulares */}
        <div className="w-12 h-1.5 bg-gray-300 rounded-full mx-auto mt-2.5 sm:hidden" />

        {/* Cabecera del Modal */}
        <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between bg-gray-50/70">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-full bg-primary text-white flex items-center justify-center shadow-sm">
              <FiPlus className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <h2 id="modal-incidencia-mobile-titulo" className="text-base sm:text-lg font-bold text-gray-900 leading-tight">
                Nueva Incidencia
              </h2>
              <p className="text-xs text-gray-500 font-medium">Formulario rápido para móviles</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleIrAFormularioCompleto}
              className="text-xs font-semibold text-primary hover:text-primary-hover flex items-center gap-1 px-2.5 py-1.5 rounded-lg hover:bg-primary-50 transition-colors"
              title="Abrir vista completa con recomendaciones detalladas"
            >
              <span>Completo</span>
              <FiExternalLink className="w-3.5 h-3.5" />
            </button>

            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="w-9 h-9 rounded-full text-gray-400 hover:text-gray-700 hover:bg-gray-200/60 flex items-center justify-center transition-colors cursor-pointer"
              aria-label="Cerrar modal"
            >
              <FiX className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Formulario con scroll independiente */}
        <form onSubmit={handleSubmit} noValidate className="flex-1 overflow-y-auto p-5 space-y-4 text-sm">
          {/* Campo: Título */}
          <div>
            <label htmlFor="mobile-titulo" className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
              Título de la Falla <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                <FiFileText className="w-4 h-4" />
              </div>
              <input
                id="mobile-titulo"
                type="text"
                value={titulo}
                onChange={(e) => handleFieldChange('titulo', e.target.value)}
                onBlur={() => handleBlur('titulo')}
                disabled={isSubmitting}
                placeholder="Ej. Sin señal de video en proyector"
                className={`w-full pl-9 pr-3 py-2.5 rounded-lg border text-base sm:text-sm outline-none transition-all ${
                  tocado.titulo && errores.titulo
                    ? 'border-red-400 bg-red-50/20 focus:ring-2 focus:ring-red-200'
                    : 'border-gray-300 focus:border-primary focus:ring-2 focus:ring-primary/20'
                }`}
                required
              />
            </div>
            {tocado.titulo && errores.titulo && (
              <p className="mt-1 text-xs text-red-600 flex items-center gap-1">
                <FiAlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                {errores.titulo}
              </p>
            )}
          </div>

          {/* Campo: ID del Activo con selección rápida por chips */}
          <div>
            <label htmlFor="mobile-id-activo" className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
              Activo Afectado <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                <FiBox className="w-4 h-4" />
              </div>
              <input
                id="mobile-id-activo"
                type="text"
                value={idActivo}
                onChange={(e) => handleFieldChange('idActivo', e.target.value)}
                onBlur={() => handleBlur('idActivo')}
                disabled={isSubmitting}
                placeholder="Ej. ACT-2026-0001 o SN-EPS-9921"
                className={`w-full pl-9 pr-3 py-2.5 rounded-lg border text-base sm:text-sm font-mono outline-none transition-all ${
                  tocado.idActivo && errores.idActivo
                    ? 'border-red-400 bg-red-50/20 focus:ring-2 focus:ring-red-200'
                    : 'border-gray-300 focus:border-primary focus:ring-2 focus:ring-primary/20'
                }`}
                required
              />
            </div>

            {/* Chips rápidos de activos comunes para evitar escribir en celular */}
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              <span className="text-[11px] text-gray-400 font-medium">Sugeridos:</span>
              {ACTIVOS_FRECUENTES.map((act) => {
                const seleccionado = idActivo === act.id;
                return (
                  <button
                    key={act.id}
                    type="button"
                    onClick={() => handleFieldChange('idActivo', act.id)}
                    className={`text-[11px] px-2.5 py-1 rounded-full font-mono transition-all cursor-pointer ${
                      seleccionado
                        ? 'bg-primary text-white font-bold shadow-xs'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {act.id}
                  </button>
                );
              })}
            </div>

            {tocado.idActivo && errores.idActivo && (
              <p className="mt-1 text-xs text-red-600 flex items-center gap-1">
                <FiAlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                {errores.idActivo}
              </p>
            )}
          </div>

          {/* Campo: Categoría con Chips Táctiles Grandes */}
          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
              Categoría de Falla <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {CATEGORIAS_RAPIDAS.map((cat) => {
                const Icono = cat.icon;
                const seleccionado = categoria === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => handleFieldChange('categoria', cat.id)}
                    className={`flex items-center gap-2 p-2.5 rounded-lg border text-left transition-all cursor-pointer min-h-[44px] ${
                      seleccionado
                        ? 'bg-primary-50 border-primary text-primary font-bold shadow-xs ring-1 ring-primary'
                        : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <Icono className={`w-4 h-4 flex-shrink-0 ${seleccionado ? 'text-primary' : 'text-gray-400'}`} />
                    <span className="text-xs truncate">{cat.nombre}</span>
                    {seleccionado && <FiCheck className="w-3.5 h-3.5 ml-auto text-primary" />}
                  </button>
                );
              })}
            </div>
            {tocado.categoria && errores.categoria && (
              <p className="mt-1 text-xs text-red-600 flex items-center gap-1">
                <FiAlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                {errores.categoria}
              </p>
            )}
          </div>

          {/* Campo: Descripción */}
          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label htmlFor="mobile-descripcion" className="block text-xs font-bold text-gray-700 uppercase tracking-wider">
                Descripción del Problema <span className="text-red-500">*</span>
              </label>
              <span className="text-[11px] text-gray-400 font-mono">
                {descripcion.length}/1000
              </span>
            </div>
            <textarea
              id="mobile-descripcion"
              rows={3}
              maxLength={1000}
              value={descripcion}
              onChange={(e) => handleFieldChange('descripcion', e.target.value)}
              onBlur={() => handleBlur('descripcion')}
              disabled={isSubmitting}
              placeholder="Indica qué anomalía ocurre, luces o códigos de error..."
              className={`w-full p-3 rounded-lg border text-base sm:text-sm outline-none transition-all resize-none ${
                tocado.descripcion && errores.descripcion
                  ? 'border-red-400 bg-red-50/20 focus:ring-2 focus:ring-red-200'
                  : 'border-gray-300 focus:border-primary focus:ring-2 focus:ring-primary/20'
              }`}
              required
            />
            {tocado.descripcion && errores.descripcion && (
              <p className="mt-1 text-xs text-red-600 flex items-center gap-1">
                <FiAlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                {errores.descripcion}
              </p>
            )}
          </div>

          {/* Campo: Ubicación (Opcional) */}
          <div>
            <label htmlFor="mobile-ubicacion" className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
              Ubicación o Sala <span className="text-gray-400 text-[10px] lowercase">(opcional)</span>
            </label>
            <input
              id="mobile-ubicacion"
              type="text"
              value={ubicacion}
              onChange={(e) => handleFieldChange('ubicacion', e.target.value)}
              disabled={isSubmitting}
              placeholder="Ej. Auditorio Edificio A / Piso 2"
              className="w-full px-3 py-2.5 rounded-lg border border-gray-300 focus:border-primary focus:ring-2 focus:ring-primary/20 text-base sm:text-sm outline-none"
            />
          </div>

          {/* Campo: Adjuntar Foto o Captura Rápida (Máx. 5MB) */}
          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
              Foto o Evidencia <span className="text-gray-400 text-[10px] lowercase">(máx. 5MB)</span>
            </label>

            {imagenPreviewUrl ? (
              <div className="relative rounded-lg border border-gray-200 p-2 flex items-center gap-3 bg-gray-50">
                <img
                  src={imagenPreviewUrl}
                  alt="Previsualización de evidencia"
                  className="w-14 h-14 object-cover rounded-md border border-gray-300 flex-shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-gray-800 truncate">
                    {archivoImagen?.name || 'Foto adjuntada'}
                  </p>
                  <p className="text-[11px] text-gray-400">
                    {archivoImagen?.size ? `${(archivoImagen.size / (1024 * 1024)).toFixed(2)} MB` : 'Listo para enviar'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleEliminarFoto}
                  className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                  title="Eliminar foto"
                >
                  <FiTrash2 className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  id="mobile-file-input"
                  accept="image/*"
                  capture="environment"
                  onChange={handleFileChange}
                  disabled={isSubmitting}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isSubmitting}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-dashed border-gray-300 hover:border-primary bg-gray-50/50 hover:bg-primary-50/40 text-gray-600 hover:text-primary transition-all cursor-pointer min-h-[44px]"
                >
                  <FiCamera className="w-4 h-4" />
                  <span className="text-xs font-semibold">Tomar foto o subir captura</span>
                </button>
              </div>
            )}
          </div>

          {/* Botones de Acción */}
          <div className="pt-3 pb-1 flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="flex-1 py-3 px-4 rounded-lg border border-gray-300 text-gray-700 font-semibold hover:bg-gray-50 transition-colors cursor-pointer text-center min-h-[46px]"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 py-3 px-4 rounded-lg bg-primary hover:bg-primary-hover active:bg-primary-active text-white font-bold transition-all shadow-md active:scale-98 disabled:opacity-60 cursor-pointer flex items-center justify-center gap-2 min-h-[46px]"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Enviando...</span>
                </>
              ) : (
                <>
                  <FiSend className="w-4 h-4" />
                  <span>Reportar</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ModalNuevaIncidenciaMobile;

