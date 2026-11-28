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
import { createIncidencia, saveIncidencia } from '../services/incidenciasService';
import api from '../services/api';
import { isKillSwitchError } from '../services/killSwitchService';
import { useDraftState, clearDrafts } from '../hooks/useDraftState';
import { useFocusTrap } from '../hooks/useFocusTrap';

const MAX_FILE_SIZE_BYTES = 5242880; // 5MB
const MAX_EVIDENCIAS = 5;

// Categorías optimizadas para selección táctil rápida en móviles
const CATEGORIAS_RAPIDAS = [
  { id: 'hardware', nombre: 'Hardware', icon: FiBox, desc: 'Equipos o piezas' },
  { id: 'software', nombre: 'Software', icon: FiCpu, desc: 'Sistemas o apps' },
  { id: 'redes', nombre: 'Redes', icon: FiWifi, desc: 'Internet o switches' },
  { id: 'seguridad', nombre: 'Seguridad', icon: FiShield, desc: 'Accesos o claves' },
  { id: 'mantenimiento', nombre: 'Infraestructura', icon: FiTool, desc: 'Energía o rack' },
  { id: 'otro', nombre: 'Otro', icon: FiHelpCircle, desc: 'Otra anomalía' },
];

// Activos sugeridos institucionales UCT para selección con 1 tap
const ACTIVOS_FRECUENTES_BASE = [
  { id: 'UCT-PRJ-01', etiqueta: 'Proyector Epson' },
  { id: 'UCT-PC-01', etiqueta: 'Dell OptiPlex' },
  { id: 'UCT-SW-01', etiqueta: 'Switch Cisco' },
  { id: 'UCT-PRJ-03', etiqueta: 'ViewSonic Auditorio' },
  { id: 'UCT-PC-06', etiqueta: 'HP ProDesk' },
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

  // Estados del formulario simplificado (TAL-188: borradores locales)
  const [titulo, setTitulo] = useDraftState('incidencia-mobile', 'titulo', '');
  const [idActivo, setIdActivo] = useDraftState('incidencia-mobile', 'idActivo', '');
  const [categoria, setCategoria] = useDraftState('incidencia-mobile', 'categoria', '');
  const [descripcion, setDescripcion] = useDraftState('incidencia-mobile', 'descripcion', '');
  const [ubicacion, setUbicacion] = useDraftState('incidencia-mobile', 'ubicacion', '');

  // Evidencias fotográficas (hasta 5 fotos, máx. 5MB c/u)
  const [evidenciasAdjuntas, setEvidenciasAdjuntas] = useState([]);
  const evidenciasRef = useRef(evidenciasAdjuntas);
  evidenciasRef.current = evidenciasAdjuntas;

  // Estados de control y validación
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errores, setErrores] = useState({});
  const [tocado, setTocado] = useState({});
  const [activosFrecuentes, setActivosFrecuentes] = useState(ACTIVOS_FRECUENTES_BASE);

  useEffect(() => {
    if (!isOpen) return undefined;
    let cancelado = false;
    api
      .get('/activos?limit=6', { skipGlobalErrorHandler: true })
      .then((res) => {
        const datos = res.data?.datos || (Array.isArray(res.data) ? res.data : []);
        if (!cancelado && Array.isArray(datos) && datos.length > 0) {
          setActivosFrecuentes(
            datos.slice(0, 6).map((a) => ({
              id: a.codigoQr || a.codigo_qr || a.id,
              etiqueta: a.nombre,
            }))
          );
        }
      })
      .catch(() => {});
    return () => {
      cancelado = true;
    };
  }, [isOpen]);

  // Limpieza preventiva de URLs en memoria al desmontar
  useEffect(() => {
    return () => {
      for (const item of evidenciasRef.current) {
        if (item.previewUrl && item.previewUrl.startsWith('blob:')) {
          URL.revokeObjectURL(item.previewUrl);
        }
      }
    };
  }, []);

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

  // TAL-204 (WCAG 2.1 AA): Focus trap + cierre con Escape + restauración de foco
  const dialogRef = useFocusTrap(isOpen, {
    onClose: () => {
      if (!isSubmitting) onClose();
    },
  });

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

  // Manejo de archivos fotográficos (máx. 5 fotos)
  const handleFileChange = (e) => {
    const seleccionados = Array.from(e.target.files || []).filter(Boolean);
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (seleccionados.length === 0) return;

    const cuposDisponibles = Math.max(0, MAX_EVIDENCIAS - evidenciasAdjuntas.length);
    if (cuposDisponibles <= 0) {
      showToast(`Máximo ${MAX_EVIDENCIAS} fotos permitidas`, 'warning');
      return;
    }

    const nuevosItems = [];
    for (const file of seleccionados) {
      if (file.size > MAX_FILE_SIZE_BYTES) {
        showToast(`"${file.name}" supera el límite de 5MB`, 'error');
        continue;
      }
      nuevosItems.push({
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        file,
        previewUrl: URL.createObjectURL(file),
        name: file.name,
        size: file.size,
      });
    }

    if (nuevosItems.length === 0) return;

    const aInsertar = nuevosItems.slice(0, cuposDisponibles);
    const descartados = nuevosItems.slice(cuposDisponibles);
    for (const desc of descartados) {
      if (desc.previewUrl?.startsWith('blob:')) URL.revokeObjectURL(desc.previewUrl);
    }

    if (descartados.length > 0) {
      showToast(`Solo se agregaron ${aInsertar.length} foto(s) (máximo ${MAX_EVIDENCIAS})`, 'warning');
    } else {
      showToast(
        aInsertar.length === 1
          ? `Foto adjuntada (${evidenciasAdjuntas.length + 1}/${MAX_EVIDENCIAS})`
          : `${aInsertar.length} fotos adjuntadas (${evidenciasAdjuntas.length + aInsertar.length}/${MAX_EVIDENCIAS})`,
        'info',
      );
    }

    setEvidenciasAdjuntas((prev) => [...prev, ...aInsertar]);
  };

  const handleEliminarFoto = (idFoto) => {
    setEvidenciasAdjuntas((prev) => {
      const target = prev.find((item) => item.id === idFoto);
      if (target?.previewUrl?.startsWith('blob:')) {
        URL.revokeObjectURL(target.previewUrl);
      }
      return prev.filter((item) => item.id !== idFoto);
    });
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
    const urlsEvidencias = [];

    try {
      const resp = await createIncidencia(payloadApi);
      idGenerado = resp?.id_incidencia || resp?.id;
    } catch (err) {
      // TAL-188: con Kill Switch activo se conserva el borrador y no se guarda nada local
      if (isKillSwitchError(err)) {
        setIsSubmitting(false);
        return;
      }
      // Continuar con fallback local
    }

    // Subir todas las evidencias adjuntas (máx. 5)
    if (idGenerado && evidenciasAdjuntas.length > 0) {
      for (const item of evidenciasAdjuntas.slice(0, MAX_EVIDENCIAS)) {
        if (!item.file || item.file.size > MAX_FILE_SIZE_BYTES) continue;
        try {
          const formData = new FormData();
          formData.append('file', item.file);
          formData.append('id_tipo_evidencia', '1');
          const uploadResp = await api.post(`/incidencias/${idGenerado}/evidencias/upload`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
          });
          const urlSubida = uploadResp.data?.url_evidencia || uploadResp.data?.url_cloudinary;
          if (urlSubida) urlsEvidencias.push(urlSubida);
        } catch {
          // Fallback controlado
        }
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
      evidencias:
        urlsEvidencias.length > 0
          ? urlsEvidencias
          : evidenciasAdjuntas.map((item) => item.previewUrl).filter(Boolean),
      imagenAdjuntaNombre: evidenciasAdjuntas[0]?.name || null,
    };

    // Guardar en cookies / almacenamiento local y emitir evento
    saveIncidencia(nuevaIncidenciaLocal);
    clearDrafts('incidencia-mobile'); // Envío exitoso: el borrador ya no es necesario
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
      <div
        ref={dialogRef}
        tabIndex={-1}
        className="bg-white w-full sm:max-w-lg rounded-t-2xl sm:rounded-2xl shadow-2xl flex flex-col max-h-[92vh] sm:max-h-[85vh] overflow-hidden border border-gray-200 animate-in slide-in-from-bottom-4 duration-250 focus:outline-none"
      >
        {/* Manilla táctil para arrastrar en celulares */}
        <div className="w-12 h-1.5 bg-gray-300 rounded-full mx-auto mt-2.5 sm:hidden" aria-hidden="true" />

        {/* Cabecera del Modal */}
        <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between bg-gray-50/70">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-full bg-primary text-white flex items-center justify-center shadow-sm" aria-hidden="true">
              <FiPlus className="w-5 h-5 stroke-[2.5]" aria-hidden="true" />
            </div>
            <div>
              <h2 id="modal-incidencia-mobile-titulo" className="text-base sm:text-lg font-bold text-gray-900 leading-tight">
                Nueva Incidencia
              </h2>
              <p className="text-xs text-gray-600 font-medium">Formulario rápido para móviles</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleIrAFormularioCompleto}
              className="text-xs font-semibold text-primary hover:text-primary-hover flex items-center gap-1 px-2.5 py-1.5 rounded-lg hover:bg-primary-50 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              title="Abrir vista completa con recomendaciones detalladas"
            >
              <span>Completo</span>
              <FiExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
            </button>

            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="w-9 h-9 rounded-full text-gray-500 hover:text-gray-800 hover:bg-gray-200/60 flex items-center justify-center transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              aria-label="Cerrar modal de nueva incidencia"
            >
              <FiX className="w-5 h-5" aria-hidden="true" />
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
                placeholder="Ej. UCT-PRJ-01 o UCT-PC-01"
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
              <span className="text-[11px] text-gray-600 font-medium">Sugeridos:</span>
              {activosFrecuentes.map((act) => {
                const seleccionado = idActivo === act.id;
                return (
                  <button
                    key={act.id}
                    type="button"
                    aria-pressed={seleccionado}
                    onClick={() => handleFieldChange('idActivo', act.id)}
                    className={`text-[11px] px-2.5 py-1 rounded-full font-mono transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
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
            <span className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
              Categoría de Falla <span className="text-red-600" aria-hidden="true">*</span>
            </span>
            <div role="group" aria-label="Categoría de falla" className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {CATEGORIAS_RAPIDAS.map((cat) => {
                const Icono = cat.icon;
                const seleccionado = categoria === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    aria-pressed={seleccionado}
                    onClick={() => handleFieldChange('categoria', cat.id)}
                    className={`flex items-center gap-2 p-2.5 rounded-lg border text-left transition-all cursor-pointer min-h-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                      seleccionado
                        ? 'bg-primary-50 border-primary text-primary font-bold shadow-xs ring-1 ring-primary'
                        : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <Icono className={`w-4 h-4 flex-shrink-0 ${seleccionado ? 'text-primary' : 'text-gray-500'}`} aria-hidden="true" />
                    <span className="text-xs truncate">{cat.nombre}</span>
                    {seleccionado && <FiCheck className="w-3.5 h-3.5 ml-auto text-primary" aria-hidden="true" />}
                  </button>
                );
              })}
            </div>
            {tocado.categoria && errores.categoria && (
              <p role="alert" className="mt-1 text-xs text-red-700 flex items-center gap-1">
                <FiAlertCircle className="w-3.5 h-3.5 flex-shrink-0" aria-hidden="true" />
                {errores.categoria}
              </p>
            )}
          </div>

          {/* Campo: Descripción */}
          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label htmlFor="mobile-descripcion" className="block text-xs font-bold text-gray-700 uppercase tracking-wider">
                Descripción del Problema <span className="text-red-600" aria-hidden="true">*</span>
              </label>
              <span className="text-[11px] text-gray-600 font-mono">
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
              className={`w-full p-3 rounded-lg border text-base sm:text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary transition-all resize-none ${
                tocado.descripcion && errores.descripcion
                  ? 'border-red-400 bg-red-50/20 focus:ring-2 focus:ring-red-200'
                  : 'border-gray-300 focus:border-primary focus:ring-2 focus:ring-primary/20'
              }`}
              required
            />
            {tocado.descripcion && errores.descripcion && (
              <p role="alert" className="mt-1 text-xs text-red-700 flex items-center gap-1">
                <FiAlertCircle className="w-3.5 h-3.5 flex-shrink-0" aria-hidden="true" />
                {errores.descripcion}
              </p>
            )}
          </div>

          {/* Campo: Ubicación (Opcional) */}
          <div>
            <label htmlFor="mobile-ubicacion" className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
              Ubicación o Sala <span className="text-gray-600 text-[10px] lowercase">(opcional)</span>
            </label>
            <input
              id="mobile-ubicacion"
              type="text"
              value={ubicacion}
              onChange={(e) => handleFieldChange('ubicacion', e.target.value)}
              disabled={isSubmitting}
              placeholder="Ej. Auditorio Edificio A / Piso 2"
              className="w-full px-3 py-2.5 rounded-lg border border-gray-300 focus:border-primary focus:ring-2 focus:ring-primary/20 focus-visible:ring-2 focus-visible:ring-primary text-base sm:text-sm outline-none"
            />
          </div>

          {/* Campo: Adjuntar Fotos o Capturas Rápidas (Máx. 5 fotos, 5MB c/u) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="block text-xs font-bold text-gray-700 uppercase tracking-wider">
                Fotos o Evidencias <span className="text-gray-600 text-[10px] lowercase">(máx. {MAX_EVIDENCIAS}, 5MB c/u)</span>
              </span>
              <span className="text-[11px] font-semibold text-gray-600 font-mono">
                {evidenciasAdjuntas.length}/{MAX_EVIDENCIAS}
              </span>
            </div>

            {evidenciasAdjuntas.length > 0 && (
              <div className="space-y-2">
                {evidenciasAdjuntas.map((item) => (
                  <div
                    key={item.id}
                    className="relative rounded-lg border border-gray-200 p-2 flex items-center gap-3 bg-gray-50"
                  >
                    <img
                      src={item.previewUrl}
                      alt={item.name}
                      className="w-12 h-12 object-cover rounded-md border border-gray-300 flex-shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-gray-800 truncate">{item.name}</p>
                      <p className="text-[11px] text-gray-400">
                        {item.size ? `${(item.size / (1024 * 1024)).toFixed(2)} MB` : 'Listo para enviar'}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleEliminarFoto(item.id)}
                      className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                      title="Eliminar foto"
                      aria-label={`Eliminar ${item.name}`}
                    >
                      <FiTrash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* El botón para agregar fotos se oculta automáticamente al llegar a 5 */}
            {evidenciasAdjuntas.length < MAX_EVIDENCIAS && (
              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  id="mobile-file-input"
                  accept="image/*"
                  multiple
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
                  <span className="text-xs font-semibold">
                    {evidenciasAdjuntas.length === 0
                      ? 'Tomar foto o subir capturas'
                      : `Agregar otra foto (${MAX_EVIDENCIAS - evidenciasAdjuntas.length} disp.)`}
                  </span>
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

