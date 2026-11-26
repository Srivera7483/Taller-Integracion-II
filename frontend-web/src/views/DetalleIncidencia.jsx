import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  FiChevronRight,
  FiBox,
  FiClock,
  FiUser,
  FiCheckCircle,
  FiShield,
  FiFileText,
  FiImage,
  FiUploadCloud,
  FiMaximize2,
  FiAlertCircle,
  FiPlusCircle,
  FiRepeat,
  FiUserCheck
} from 'react-icons/fi';
import StatusBadge from '../components/StatusBadge';
import api from '../services/api';
import ModalCierreMantenimiento from '../components/ModalCierreMantenimiento';
import ModalPrevisualizadorImagen from '../components/ModalPrevisualizadorImagen';
import EvidenciaUploader from '../components/EvidenciaUploader';
import { useToast } from '../context/ToastContext';
import { getUsuarioActual, hasPermission } from '../services/authService';

const esUuid = (valor) =>
  typeof valor === 'string' &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(valor);

const getPriorityBadgeClass = (prioridad) => {
  const p = (
    typeof prioridad === 'string'
      ? prioridad
      : prioridad?.nombre_prioridad || prioridad?.nombre || ''
  ).toLowerCase();
  if (p === 'critica' || p === 'crítica') return 'bg-purple-100 text-purple-800 border-purple-300';
  if (p === 'alta') return 'bg-red-100 text-red-800 border-red-300';
  if (p === 'media') return 'bg-amber-100 text-amber-800 border-amber-300';
  return 'bg-emerald-100 text-emerald-800 border-emerald-300';
};

const TarjetaEvidenciaCloudinary = ({ url, nombre, onAmpliar }) => {
  const [cargando, setCargando] = useState(true);
  const [errorCarga, setErrorCarga] = useState(false);

  return (
    <div className="relative rounded-xl border border-gray-200 bg-slate-900/5 p-4 sm:p-5 flex flex-col md:flex-row items-center gap-5 transition-all">
      <div className="relative w-full sm:w-64 h-52 sm:h-44 rounded-xl overflow-hidden bg-slate-950 flex items-center justify-center border-2 border-primary/40 shadow-inner flex-shrink-0">
        {cargando && !errorCarga && (
          <div
            id="loading-evidencia-cloudinary"
            role="status"
            aria-live="polite"
            className="absolute inset-0 z-10 bg-slate-900/90 backdrop-blur-xs flex flex-col items-center justify-center p-4 text-center space-y-3"
          >
            <div className="relative flex items-center justify-center">
              <div className="absolute w-12 h-12 rounded-full bg-primary/20 animate-ping" />
              <svg
                className="animate-spin w-9 h-9 text-primary relative z-10"
                viewBox="0 0 24 24"
                fill="none"
              >
                <circle
                  className="opacity-20"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="3.5"
                />
                <path
                  className="opacity-90"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
            </div>
            <div className="space-y-0.5">
              <span className="text-xs font-bold text-white tracking-wide animate-pulse">
                Procesando...
              </span>
              <p className="text-[11px] text-slate-300">
                Cargando imagen desde Cloudinary
              </p>
            </div>
            <div className="w-3/4 bg-slate-800 rounded-full h-1.5 overflow-hidden">
              <div className="bg-gradient-to-r from-primary-500 via-primary-400 to-primary-600 h-full rounded-full animate-indeterminate" />
            </div>
          </div>
        )}

        {!errorCarga ? (
          <img
            src={url}
            alt={nombre || 'Evidencia fotográfica de la incidencia'}
            onLoad={() => setCargando(false)}
            onError={() => {
              setCargando(false);
              setErrorCarga(true);
            }}
            onClick={() => onAmpliar(url, nombre)}
            className={`w-full h-full object-cover cursor-pointer transition-all duration-500 hover:scale-105 ${
              cargando ? 'opacity-0 scale-95' : 'opacity-100 scale-100'
            }`}
          />
        ) : (
          <div className="p-4 text-center text-xs text-red-400 flex flex-col items-center gap-1.5">
            <FiAlertCircle className="w-5 h-5 text-red-400" />
            <span>No se pudo cargar la imagen de Cloudinary</span>
          </div>
        )}

        {!cargando && !errorCarga && (
          <button
            type="button"
            onClick={() => onAmpliar(url, nombre)}
            title="Ampliar en tamaño completo"
            aria-label="Ampliar imagen"
            className="absolute bottom-2 right-2 p-1.5 rounded-lg bg-slate-900/80 hover:bg-slate-900 text-white shadow-md transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <FiMaximize2 className="w-4 h-4" aria-hidden="true" />
          </button>
        )}
      </div>

      <div className="flex-1 space-y-2 text-center md:text-left min-w-0">
        <div className="flex items-center justify-center md:justify-start gap-2 flex-wrap">
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-primary-50 text-primary border border-primary-200">
            <FiImage className="w-3.5 h-3.5" />
            <span>Evidencia Fotográfica</span>
          </span>
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] font-mono font-bold bg-secondary-50 text-secondary-900 border border-secondary-200">
            <FiUploadCloud className="w-3 h-3" /> Cloudinary CDN
          </span>
          <span className="text-[11px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-200">
            Activo Verificado
          </span>
        </div>

        <p className="text-sm font-bold text-gray-900 truncate" title={nombre || 'evidencia_reportante.webp'}>
          {nombre || 'evidencia_reportante.webp'}
        </p>

        <p className="text-xs text-gray-600 leading-relaxed">
          Esta prueba fotográfica fue provista por el usuario reportante al momento de registrar la falla en el sistema. Puedes visualizarla en alta resolución para inspección técnica.
        </p>

        <div className="pt-1 flex items-center justify-center md:justify-start gap-3">
          <button
            type="button"
            onClick={() => onAmpliar(url, nombre)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold text-white bg-primary hover:bg-primary-hover active:scale-95 transition-all shadow-md hover:shadow-lg cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <FiMaximize2 className="w-3.5 h-3.5" />
            <span>Ver en Alta Resolución</span>
          </button>
        </div>
      </div>
    </div>
  );
};

const DetalleIncidencia = () => {
  const { idIncidencia } = useParams();
  const { showToast } = useToast();
  const [incidencia, setIncidencia] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actualizandoPrioridad, setActualizandoPrioridad] = useState(false);
  const [resolviendo, setResolviendo] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [mostrarSubidorNuevo, setMostrarSubidorNuevo] = useState(false);
  const [imagenModal, setImagenModal] = useState({ url: null, nombre: null });

  const usuarioSesion = getUsuarioActual();
  const nombreSesionCompleto =
    `${usuarioSesion?.nombre || ''} ${usuarioSesion?.apellido || ''}`.trim() ||
    usuarioSesion?.nombre ||
    null;
  const puedeClasificar = hasPermission('incidencias:clasificar_prioridad');
  const puedeResolver = hasPermission('incidencias:resolver');
  const puedeSubirEvidencia = hasPermission('evidencias:subir');

  const cargarIncidencia = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/incidencias/${idIncidencia}`);
      if (response.data) {
        const apiData = response.data;
        const activoEmbebido = apiData.activo || null;

        let nombreActivo =
          apiData.nombre_activo ||
          activoEmbebido?.nombre_activo ||
          activoEmbebido?.nombre ||
          null;
        let codigoQrActivo =
          apiData.codigo_qr_activo ||
          activoEmbebido?.codigo_qr ||
          activoEmbebido?.codigoQr ||
          null;
        let numeroSerieActivo =
          apiData.numero_serie ||
          apiData.numero_serie_activo ||
          apiData.sn ||
          activoEmbebido?.numero_serie ||
          activoEmbebido?.numeroSerie ||
          activoEmbebido?.sn ||
          null;

        // Resolver datos completos del activo antes de renderizar para evitar parpadeo y asegurar S/N
        if (apiData.id_activo && (!nombreActivo || !numeroSerieActivo)) {
          try {
            const activoResp = await api.get(`/activos/${apiData.id_activo}`);
            const activoData = activoResp.data?.datos || activoResp.data;
            if (activoData) {
              nombreActivo =
                nombreActivo ||
                activoData.nombre_activo ||
                activoData.nombre ||
                null;
              codigoQrActivo =
                codigoQrActivo ||
                activoData.codigo_qr ||
                activoData.codigoQr ||
                null;
              numeroSerieActivo =
                numeroSerieActivo ||
                activoData.numero_serie ||
                activoData.numeroSerie ||
                activoData.sn ||
                null;
            }
          } catch {
            // Si el activo no existe o no responde, se mantienen los campos recibidos desde la incidencia
          }
        }

        const ordenAsociada = apiData.orden_trabajo || apiData.ordenes_trabajo?.[0] || null;
        const idTecnicoApi =
          apiData.id_tecnico_asignado ||
          apiData.id_tecnico ||
          ordenAsociada?.id_tecnico ||
          null;

        const idUsuarioSesion =
          usuarioSesion?.id_usuario || usuarioSesion?.id || usuarioSesion?.userId || null;
        const nombreSesionCompleto =
          `${usuarioSesion?.nombre || ''} ${usuarioSesion?.apellido || ''}`.trim() ||
          usuarioSesion?.nombre ||
          null;
        const esMiAsignacion = Boolean(
          idUsuarioSesion &&
          idTecnicoApi &&
          String(idTecnicoApi).toLowerCase() === String(idUsuarioSesion).toLowerCase()
        );

        let nombreTecnicoApi =
          apiData.nombre_tecnico ||
          ordenAsociada?.nombre_tecnico ||
          apiData.tecnico_asignado ||
          null;

        // Principio de Ownership: si la incidencia pertenece al técnico en sesión, proyectar su nombre real
        if ((!nombreTecnicoApi || esUuid(nombreTecnicoApi)) && esMiAsignacion && nombreSesionCompleto) {
          nombreTecnicoApi = nombreSesionCompleto;
        } else if (esUuid(nombreTecnicoApi)) {
          nombreTecnicoApi = `ID ${nombreTecnicoApi.substring(0, 8)}`;
        }

        // Si el activo no vino enriquecido o es un UUID, resolverlo puntualmente por su ID/QR
        if ((!nombreActivo || esUuid(nombreActivo)) && apiData.id_activo) {
          try {
            const activoResp = await api.get(
              `/activos/validar-qr?codigoQr=${encodeURIComponent(apiData.id_activo)}`
            );
            if (activoResp.data?.valido && activoResp.data?.activo) {
              nombreActivo = activoResp.data.activo.nombre || nombreActivo;
              codigoQrActivo =
                activoResp.data.activo.codigoQr ||
                activoResp.data.activo.codigo_qr ||
                codigoQrActivo;
            }
          } catch {
            // Silencioso ante fallo de resolución secundaria
          }
        }

        const diagnosticoApi =
          apiData.diagnostico_tecnico ||
          ordenAsociada?.diagnostico_tecnico ||
          null;

        const historialAsignacionesProcesado = (
          Array.isArray(apiData.historial_asignaciones)
            ? apiData.historial_asignaciones
            : []
        ).map((item) => {
          const esMiItem =
            idUsuarioSesion &&
            item.id_tecnico &&
            String(item.id_tecnico).toLowerCase() === String(idUsuarioSesion).toLowerCase();
          const nombreItem =
            item.nombre_tecnico && !esUuid(item.nombre_tecnico)
              ? item.nombre_tecnico
              : esMiItem && nombreSesionCompleto
              ? nombreSesionCompleto
              : item.nombre_tecnico || null;
          return {
            ...item,
            nombre_tecnico: nombreItem,
          };
        });

        setIncidencia({
          id: apiData.id_incidencia || idIncidencia,
          id_orden:
            apiData.id_orden ||
            ordenAsociada?.id_orden ||
            null,
          id_tecnico: idTecnicoApi,
          id_tecnico_asignado: idTecnicoApi,
          orden_trabajo: ordenAsociada,
          ordenes_trabajo: Array.isArray(apiData.ordenes_trabajo) ? apiData.ordenes_trabajo : [],
          historial_asignaciones: historialAsignacionesProcesado,
          titulo: apiData.titulo,
          descripcion: apiData.descripcion,
          id_activo: apiData.id_activo,
          nombre_activo: nombreActivo,
          codigo_qr_activo: codigoQrActivo,
          numero_serie_activo: numeroSerieActivo,
          nombre_reportante: apiData.nombre_reportante || null,
          prioridad: apiData.prioridad || apiData.prioridad_relativa || 'Media',
          prioridad_relativa: apiData.prioridad_relativa,
          estado:
            apiData.estado?.nombre_estado ||
            (typeof apiData.estado === 'string' ? apiData.estado : null) ||
            'Reportada',
          fecha_creacion: apiData.fecha_creacion || new Date().toISOString(),
          fecha_asignacion:
            apiData.fecha_asignacion ||
            ordenAsociada?.fecha_creacion ||
            null,
          asignado: nombreTecnicoApi,
          resolucion: diagnosticoApi || apiData.resolucion || null,
          horasInvertidas: apiData.horas_invertidas ?? ordenAsociada?.horas_invertidas ?? null,
          materialesUsados: Array.isArray(apiData.materiales_usados) ? apiData.materiales_usados : [],
          fechaCierre: ordenAsociada?.fecha_cierre || null,
          evidencias: Array.isArray(apiData.evidencias) ? apiData.evidencias : [],
        });
      }
    } catch (err) {
      setError(err);
      showToast('Error al conectar con la base de datos de incidencias', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void cargarIncidencia();
  }, [idIncidencia]);

  const handleCambiarPrioridad = async (nuevaPrioridad) => {
    try {
      setActualizandoPrioridad(true);
      await api.patch(`/incidencias/${idIncidencia}/prioridad`, {
        prioridad: nuevaPrioridad,
      });
      setIncidencia((prev) => ({
        ...prev,
        prioridad: nuevaPrioridad,
      }));
      showToast(`Prioridad actualizada a ${nuevaPrioridad} en PostgreSQL`, 'success');
    } catch (err) {
      showToast(
        err.response?.data?.mensaje || err.response?.data?.message || 'Error al clasificar prioridad',
        'error'
      );
    } finally {
      setActualizandoPrioridad(false);
    }
  };

  const handleResolverDirecto = async () => {
    try {
      setResolviendo(true);
      await api.patch(`/incidencias/${idIncidencia}/resolver`);
      setIncidencia((prev) => ({
        ...prev,
        estado: 'Resuelta',
      }));
      showToast('Incidencia marcada como Resuelta exitosamente en PostgreSQL', 'success');
      void cargarIncidencia();
    } catch (err) {
      showToast(
        err.response?.data?.mensaje || err.response?.data?.message || 'Error al marcar la incidencia como resuelta',
        'error'
      );
    } finally {
      setResolviendo(false);
    }
  };

  const handleCierreExitoso = (datosActualizados) => {
    setIncidencia((prev) => ({
      ...prev,
      estado: datosActualizados?.estado || 'Resuelta',
      resolucion: datosActualizados?.resolucion || prev?.resolucion,
      horasInvertidas: datosActualizados?.horasInvertidas ?? prev?.horasInvertidas,
      materialesUsados: datosActualizados?.materialesUsados ?? prev?.materialesUsados,
      fechaCierre: datosActualizados?.fechaCierre || new Date().toISOString(),
    }));
    void cargarIncidencia();
  };

  const handleEvidenciaSubidaDesdeDetalle = async (evidenciaPayload) => {
    try {
      let urlSubida = null;
      const file = evidenciaPayload?.file;

      if (file) {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('id_tipo_evidencia', '1');

        const uploadResp = await api.post(`/incidencias/${idIncidencia}/evidencias`, formData);
        urlSubida = uploadResp.data?.url_cloudinary || uploadResp.data?.url_evidencia;
      } else {
        const urlParam =
          typeof evidenciaPayload === 'string'
            ? evidenciaPayload
            : (evidenciaPayload?.previewUrl || evidenciaPayload?.cloudinaryResult?.url);

        if (urlParam) {
          const uploadResp = await api.post(`/incidencias/${idIncidencia}/evidencias`, {
            id_tipo_evidencia: 1,
            url_evidencia: urlParam,
          });
          urlSubida = uploadResp.data?.url_cloudinary || uploadResp.data?.url_evidencia || urlParam;
        }
      }

      const urlFinal =
        urlSubida ||
        (typeof evidenciaPayload === 'string' ? evidenciaPayload : evidenciaPayload?.previewUrl);

      if (urlFinal) {
        setIncidencia((prev) => ({
          ...prev,
          evidencias: [...(prev.evidencias || []), urlFinal],
        }));
        showToast('Evidencia fotográfica guardada en Cloudinary exitosamente', 'success');
      }
    } catch (err) {
      const msg =
        err.response?.data?.mensaje ||
        err.response?.data?.message ||
        'Error al guardar la evidencia fotográfica.';
      showToast(msg, 'error');
    } finally {
      setMostrarSubidorNuevo(false);
    }
  };

  const handleAbrirPrevisualizador = (url, nombre) => {
    setImagenModal({ url, nombre });
  };

  if (loading) {
    return <div className="p-8 text-center text-gray-500 font-medium">Cargando detalles de la incidencia...</div>;
  }

  if (error || !incidencia) {
    return <div className="p-8 text-center text-red-500 font-medium">Error al cargar la incidencia.</div>;
  }

  const estadoLower = (incidencia.estado || '').toLowerCase();
  const estaResuelta = estadoLower === 'resuelta';
  const estaCompletada = estadoLower === 'completada';
  const estaRechazada = estadoLower === 'rechazada' || estadoLower === 'rechazado';
  const estaCerrada = estaCompletada || estaResuelta || estaRechazada || estadoLower === 'cerrada';

  const idUsuarioSesion =
    usuarioSesion?.id_usuario || usuarioSesion?.id || usuarioSesion?.userId || null;
  const nombreUsuarioSesion = `${usuarioSesion?.nombre || ''} ${usuarioSesion?.apellido || ''}`
    .trim()
    .toLowerCase();

  const nombreAsignado = (incidencia.asignado || '').trim().toLowerCase();
  const idTecnicoVigente =
    incidencia.id_tecnico_asignado ||
    incidencia.id_tecnico ||
    incidencia.orden_trabajo?.id_tecnico ||
    incidencia.ordenes_trabajo?.[0]?.id_tecnico ||
    null;

  const coincidePorIdTecnico = Boolean(
    idUsuarioSesion &&
      idTecnicoVigente &&
      String(idTecnicoVigente).toLowerCase() === String(idUsuarioSesion).toLowerCase()
  );
  const coincidePorNombreSesion =
    Boolean(nombreAsignado) &&
    Boolean(nombreUsuarioSesion) &&
    (nombreAsignado === nombreUsuarioSesion ||
      nombreAsignado.includes(nombreUsuarioSesion) ||
      nombreUsuarioSesion.includes(nombreAsignado));

  const esTecnicoAsignado = coincidePorIdTecnico || coincidePorNombreSesion;
  const puedeOperarResolucion = puedeResolver && esTecnicoAsignado;

  const evidencias = Array.isArray(incidencia.evidencias) ? incidencia.evidencias : [];
  const historialAsignaciones = Array.isArray(incidencia.historial_asignaciones)
    ? incidencia.historial_asignaciones
    : [];

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Navegación */}
      <nav aria-label="Ruta de navegación" className="flex items-center gap-2 text-sm text-gray-600">
        <Link to="/dashboard" className="hover:text-blue-600 transition-colors">Inicio</Link>
        <FiChevronRight className="w-3.5 h-3.5" aria-hidden="true" />
        <Link to="/incidencias" className="hover:text-blue-600 transition-colors">Incidencias</Link>
        <FiChevronRight className="w-3.5 h-3.5" aria-hidden="true" />
        <span className="font-semibold text-gray-900">Incidencia {incidencia.id}</span>
      </nav>

      {/* Información principal de la incidencia */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5 sm:p-6 space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-4 border-b border-gray-100">
          <div>
            <h1 className="text-xl font-bold text-gray-900">{incidencia.titulo}</h1>
            <p className="text-xs text-gray-500 font-mono mt-0.5">ID: {incidencia.id}</p>
          </div>
          <div className="flex flex-col items-start md:items-end gap-1.5">
            <StatusBadge status={incidencia.estado} />
            <span className="text-xs text-gray-600 flex items-center gap-1 mt-1 font-mono">
              <FiClock className="w-3.5 h-3.5" aria-hidden="true" /> Creada: {new Date(incidencia.fecha_creacion).toLocaleString()}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <h4 className="text-xs uppercase tracking-wider text-gray-600 font-semibold mb-1">Activo Afectado</h4>
            <div className="flex items-start gap-2 text-gray-800 font-medium">
              <FiBox className="w-4 h-4 text-orange-600 flex-shrink-0 mt-0.5" aria-hidden="true" />
              <div className="space-y-0.5 min-w-0">
                <span className="block">
                  {incidencia.nombre_activo
                    ? `${incidencia.nombre_activo}${incidencia.codigo_qr_activo ? ` (${incidencia.codigo_qr_activo})` : ''}`
                    : incidencia.codigo_qr_activo || (incidencia.id_activo ? (esUuid(incidencia.id_activo) ? `ID ${incidencia.id_activo.substring(0, 8)}` : incidencia.id_activo) : 'Sin activo asociado')}
                </span>
                {incidencia.numero_serie_activo && (
                  <span className="inline-block text-xs font-mono text-gray-600 bg-gray-100 px-2 py-0.5 rounded border border-gray-200">
                    S/N: {incidencia.numero_serie_activo}
                  </span>
                )}
              </div>
            </div>
          </div>
          <div>
            <h4 className="text-xs uppercase tracking-wider text-gray-600 font-semibold mb-1">Técnico Asignado</h4>
            <div className="flex items-center justify-between gap-2 text-gray-800 font-medium">
              <div className="flex items-center gap-2">
                <FiUser className="w-4 h-4 text-blue-600" aria-hidden="true" />
                <span>
                  {esTecnicoAsignado && nombreSesionCompleto
                    ? nombreSesionCompleto
                    : (esUuid(incidencia.asignado)
                        ? `ID ${incidencia.asignado.substring(0, 8)}`
                        : incidencia.asignado || 'Sin asignar')}
                </span>
              </div>
              {esSupervisor && !estaCerrada && (
                <Link
                  to={`/incidencias/asignar?incidenciaId=${incidencia.id}`}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-primary-50 text-primary border border-primary-200 hover:bg-primary-100 transition-colors"
                >
                  {incidencia.asignado ? (
                    <>
                      <FiRepeat className="w-3.5 h-3.5" /> Reasignar
                    </>
                  ) : (
                    <>
                      <FiUserCheck className="w-3.5 h-3.5" /> Asignar
                    </>
                  )}
                </Link>
              )}
            </div>
          </div>
          <div>
            <h4 className="text-xs uppercase tracking-wider text-gray-600 font-semibold mb-1">Prioridad (Clasificación)</h4>
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border uppercase ${getPriorityBadgeClass(incidencia.prioridad)}`}>
                {incidencia.prioridad || 'Media'}
              </span>
              {puedeClasificar && (
                <select
                  disabled={actualizandoPrioridad}
                  value={(incidencia.prioridad || 'Media').toLowerCase()}
                  onChange={(e) => void handleCambiarPrioridad(e.target.value)}
                  className="text-xs border border-gray-300 rounded-lg px-2 py-1 bg-white text-gray-700 font-medium focus:ring-2 focus:ring-primary focus:outline-none cursor-pointer"
                  title="Clasificar Prioridad (Solo Supervisor / Administrador)"
                >
                  <option value="baja">Baja</option>
                  <option value="media">Media</option>
                  <option value="alta">Alta</option>
                  <option value="critica">Crítica</option>
                </select>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <h4 className="text-xs uppercase tracking-wider text-gray-600 font-semibold">Descripción del problema</h4>
          <p className="text-sm text-gray-700 bg-gray-50 p-4 rounded-xl border border-gray-100 whitespace-pre-wrap leading-relaxed">
            {incidencia.descripcion}
          </p>
        </div>

        {/* Historial de Asignaciones / Órdenes de Trabajo */}
        {historialAsignaciones.length > 0 && (
          <div className="pt-3 border-t border-gray-100 space-y-2">
            <h4 className="text-xs uppercase tracking-wider text-gray-600 font-semibold">
              Trazabilidad de Asignaciones ({historialAsignaciones.length})
            </h4>
            <div className="space-y-2">
              {historialAsignaciones.map((item) => (
                <div
                  key={item.id_orden}
                  className={`p-3 rounded-xl border text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2 ${
                    item.vigente
                      ? 'bg-emerald-50/60 border-emerald-200 text-emerald-950'
                      : 'bg-gray-50 border-gray-200 text-gray-600'
                  }`}
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold">
                        {item.nombre_tecnico || (item.id_tecnico ? `ID ${item.id_tecnico.substring(0, 8)}` : 'Técnico')}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                          item.vigente
                            ? 'bg-emerald-200 text-emerald-900'
                            : 'bg-gray-200 text-gray-700'
                        }`}
                      >
                        {item.vigente ? 'Vigente' : 'Histórica'}
                      </span>
                    </div>
                    {item.diagnostico_tecnico && (
                      <p className="text-[11px] opacity-90">{item.diagnostico_tecnico}</p>
                    )}
                  </div>
                  <span className="font-mono text-[11px] opacity-80">
                    {item.fecha_creacion ? new Date(item.fecha_creacion).toLocaleString() : ''}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Sección de Evidencia Fotográfica y Cloudinary */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5 sm:p-6 space-y-4">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 border-b border-gray-100 pb-4">
          <div>
            <h2 className="font-bold text-lg text-gray-900">Evidencia Fotográfica (Cloudinary)</h2>
            <p className="text-xs text-gray-600">
              Imágenes adjuntadas por el reportante para respaldo del fallo.
            </p>
          </div>
          {puedeSubirEvidencia && !mostrarSubidorNuevo && (
            <button
              type="button"
              onClick={() => setMostrarSubidorNuevo(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-primary bg-primary-50 hover:bg-primary-100 border border-primary-200 transition-colors cursor-pointer"
            >
              <FiPlusCircle className="w-3.5 h-3.5" />
              <span>Agregar Foto</span>
            </button>
          )}
        </div>

        {puedeSubirEvidencia && mostrarSubidorNuevo && (
          <div className="bg-slate-50 border border-primary-200 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-primary">Subir nueva evidencia para esta incidencia:</span>
              <button
                type="button"
                onClick={() => setMostrarSubidorNuevo(false)}
                className="text-xs text-gray-500 hover:text-gray-800"
              >
                Cancelar
              </button>
            </div>
            <EvidenciaUploader
              onFileLoaded={handleEvidenciaSubidaDesdeDetalle}
              label=""
            />
          </div>
        )}

        {evidencias.length > 0 ? (
          <div className="space-y-4">
            {evidencias.map((evItem, idx) => {
              const urlResuelta =
                typeof evItem === 'string'
                  ? evItem
                  : evItem?.url_cloudinary || evItem?.url_evidencia || evItem?.url || '';
              const nombreResuelto =
                incidencia.imagenAdjuntaNombre ||
                (typeof evItem === 'object' && evItem?.tipo?.nombre_tipo
                  ? `evidencia_${evItem.tipo.nombre_tipo.toLowerCase()}_${idx + 1}.webp`
                  : `Incidencia: ${incidencia.id}${evidencias.length > 1 ? ` (Foto ${idx + 1})` : ''}`);
              return (
                <TarjetaEvidenciaCloudinary
                  key={evItem?.id_evidencia || idx}
                  url={urlResuelta}
                  nombre={nombreResuelto}
                  onAmpliar={handleAbrirPrevisualizador}
                />
              );
            })}
          </div>
        ) : !mostrarSubidorNuevo ? (
          <div className="p-8 text-center bg-gray-50/60 rounded-xl border-2 border-dashed border-gray-200 space-y-2">
            <FiImage className="w-10 h-10 text-gray-300 mx-auto" />
            <p className="text-sm font-medium text-gray-700">Sin evidencias fotográficas adjuntas</p>
            <p className="text-xs text-gray-500 max-w-sm mx-auto">
              Esta incidencia no incluyó fotos al momento de ser creada. Puedes adjuntar una prueba ahora.
            </p>
            {puedeSubirEvidencia && (
              <button
                type="button"
                onClick={() => setMostrarSubidorNuevo(true)}
                className="inline-flex items-center gap-1.5 px-4 py-2 mt-2 bg-primary hover:bg-primary-hover text-white rounded-lg text-xs font-bold transition-all shadow-sm cursor-pointer"
              >
                <FiUploadCloud className="w-4 h-4" />
                <span>Subir Evidencia a Cloudinary</span>
              </button>
            )}
          </div>
        ) : null}
      </div>

      {/* Reporte de Mantenimiento si ya está completada */}
      {estaCompletada && (
        <div className="bg-white rounded-2xl shadow-sm border border-emerald-200 p-5 sm:p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-emerald-100 pb-3">
            <div className="flex items-center gap-2.5">
              <FiCheckCircle className="w-6 h-6 text-emerald-600" aria-hidden="true" />
              <h2 className="font-bold text-lg text-emerald-950">Mantenimiento Completado</h2>
            </div>
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
              Completada
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-emerald-50/50 p-3.5 rounded-xl border border-emerald-100">
              <span className="text-[11px] uppercase font-bold text-emerald-800 block mb-1">
                Horas Invertidas
              </span>
              {incidencia.horasInvertidas != null ? (
                <>
                  <span className="text-2xl font-black text-gray-900">{incidencia.horasInvertidas}</span>
                  <span className="text-xs text-gray-600 ml-1">horas</span>
                </>
              ) : (
                <span className="text-xs text-gray-600 italic">No registradas</span>
              )}
            </div>
            <div className="bg-emerald-50/50 p-3.5 rounded-xl border border-emerald-100">
              <span className="text-[11px] uppercase font-bold text-emerald-800 block mb-1">
                Materiales e Insumos
              </span>
              {incidencia.materialesUsados && incidencia.materialesUsados.length > 0 ? (
                <div className="flex flex-wrap gap-1 mt-1">
                  {incidencia.materialesUsados.map((m, idx) => (
                    <span key={idx} className="px-2 py-0.5 rounded text-xs bg-white border border-emerald-200 text-emerald-900 font-medium">
                      {m.cantidad}x {m.nombre}
                    </span>
                  ))}
                </div>
              ) : (
                <span className="text-xs text-gray-600 italic">Sin materiales adicionales.</span>
              )}
            </div>
          </div>

          <div className="space-y-1">
            <span className="text-xs uppercase font-bold text-gray-600 block flex items-center gap-1">
              <FiFileText className="w-3.5 h-3.5 text-blue-600" aria-hidden="true" /> Resolución Técnica
            </span>
            <div className="bg-gray-50 p-3.5 rounded-xl border border-gray-200 text-sm text-gray-800 whitespace-pre-wrap">
              {incidencia.resolucion || 'Sin diagnóstico registrado.'}
            </div>
          </div>
        </div>
      )}

      {/* Acciones de mantenimiento si aún no está completada ni resuelta (PBAC: incidencias:resolver) */}
      {puedeResolver && !estaCompletada && !estaResuelta && !estaRechazada && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5 sm:p-6 space-y-3">
          <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
            <FiCheckCircle className="w-5 h-5 text-blue-600" aria-hidden="true" />
            Acciones de Mantenimiento y Cierre
          </h3>

          {puedeOperarResolucion ? (
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-emerald-50 border border-emerald-200 p-4 rounded-xl">
              <div>
                <p className="text-xs font-bold text-emerald-950">
                  Usuario autorizado para registrar el cierre.
                </p>
                <p className="text-xs text-emerald-800 mt-0.5">
                  Puedes registrar el diagnóstico técnico y marcar la incidencia como resuelta en PostgreSQL.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                <button
                  type="button"
                  disabled={resolviendo}
                  onClick={() => void handleResolverDirecto()}
                  className="w-full sm:w-auto px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs shadow-xs flex items-center justify-center gap-2 transition-all cursor-pointer min-h-[44px]"
                >
                  <FiCheckCircle className="w-4 h-4" />
                  <span>{resolviendo ? 'Resolviendo...' : 'Marcar como Resuelta'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(true)}
                  className="w-full sm:w-auto px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs shadow-xs flex items-center justify-center gap-2 transition-all cursor-pointer min-h-[44px]"
                >
                  <FiFileText className="w-4 h-4" />
                  <span>Diagnóstico y Cierre</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl flex items-start gap-3 text-amber-900">
              <FiShield className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div className="text-xs space-y-1">
                <p className="font-bold text-amber-950">Acceso restringido a la resolución</p>
                <p>
                  Esta incidencia está asignada a <strong>{esTecnicoAsignado && nombreSesionCompleto ? nombreSesionCompleto : (incidencia.asignado || 'otro técnico')}</strong>. Solo el técnico asignado con permiso de resolución puede resolverla.
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Modal de Cierre */}
      <ModalCierreMantenimiento
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        orden={{
          id_orden: incidencia.orden_trabajo?.id_orden || incidencia.id_orden || `ORD-${incidencia.id}`,
          incidencia_id: incidencia.id,
          id_incidencia: incidencia.id,
          id: incidencia.id,
          id_tecnico: incidencia.orden_trabajo?.id_tecnico || incidencia.id_tecnico_asignado,
          id_tecnico_asignado: incidencia.orden_trabajo?.id_tecnico || incidencia.id_tecnico_asignado,
          nombre_tecnico: incidencia.orden_trabajo?.nombre_tecnico || incidencia.asignado,
          orden_trabajo: incidencia.orden_trabajo,
          ordenes_trabajo: incidencia.ordenes_trabajo,
          titulo: incidencia.titulo,
          id_activo: incidencia.id_activo,
          resolucion: incidencia.resolucion,
          horasInvertidas: incidencia.horasInvertidas,
          materialesUsados: incidencia.materialesUsados,
        }}
        tecnicoActual={usuarioSesion}
        onCierreExitoso={handleCierreExitoso}
      />

      {/* Modal Previsualizador de Imagen Cloudinary en Alta Resolución */}
      <ModalPrevisualizadorImagen
        isOpen={Boolean(imagenModal.url)}
        onClose={() => setImagenModal({ url: null, nombre: null })}
        imageUrl={imagenModal.url}
        imageName={imagenModal.nombre}
      />
    </div>
  );
};

export default DetalleIncidencia;