import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  FiActivity,
  FiAlertCircle,
  FiCheckCircle,
  FiChevronLeft,
  FiChevronRight,
  FiClock,
  FiFilter,
  FiInfo,
  FiRefreshCw,
  FiSearch,
  FiServer,
  FiShield,
  FiUser,
  FiXCircle,
} from 'react-icons/fi';
import SkeletonCard from '../components/SkeletonCard';
import SkeletonTable from '../components/SkeletonTable';
import { useToast } from '../context/ToastContext';
import {
  CATALOGO_MICROSERVICIOS,
  LIMITE_POR_DEFECTO_AUDITORIA,
  METODOS_HTTP_MUTANTES,
  OPCIONES_CODIGO_HTTP,
  OPCIONES_LIMITE_PAGINA,
  OPCIONES_SERVICIO_DESTINO,
  extraerMensajeErrorAuditoria,
  formatearDuracionUptime,
  formatearFechaHoraAuditoria,
  formatearLatenciaMilisegundos,
  obtenerBitacoraAuditoria,
  obtenerEstiloCodigoHttp,
  obtenerEstiloEstadoServicio,
  obtenerEstiloMetodoHttp,
  obtenerEstiloRolUsuario,
  obtenerSaludGateway,
} from '../services/auditoriaService';

const FILTROS_INICIALES = {
  busqueda: '',
  usuario: '',
  servicio: '',
  metodo: '',
  codigoHttp: '',
};

const PAGINACION_INICIAL = {
  total: 0,
  pagina: 1,
  limite: LIMITE_POR_DEFECTO_AUDITORIA,
  totalPaginas: 1,
  capacidadBuffer: 0,
  registrosEnBuffer: 0,
  almacenamientoEfimero: true,
};

const renderizarIconoSalud = (estadoServicio) => {
  if (estadoServicio === 'UP') {
    return <FiCheckCircle className="w-4 h-4" aria-hidden="true" />;
  }
  if (estadoServicio === 'DEGRADED') {
    return <FiAlertCircle className="w-4 h-4" aria-hidden="true" />;
  }
  return <FiXCircle className="w-4 h-4" aria-hidden="true" />;
};

const Auditoria = () => {
  const { showToast } = useToast();

  const [filtrosTexto, setFiltrosTexto] = useState({
    busqueda: FILTROS_INICIALES.busqueda,
    usuario: FILTROS_INICIALES.usuario,
  });
  const [filtrosAplicados, setFiltrosAplicados] = useState(FILTROS_INICIALES);
  const [paginaActual, setPaginaActual] = useState(1);
  const [limitePorPagina, setLimitePorPagina] = useState(LIMITE_POR_DEFECTO_AUDITORIA);

  const [registrosAuditoria, setRegistrosAuditoria] = useState([]);
  const [paginacion, setPaginacion] = useState(PAGINACION_INICIAL);
  const [estadoServicios, setEstadoServicios] = useState(null);
  const [saludGateway, setSaludGateway] = useState(null);
  const [ultimaActualizacion, setUltimaActualizacion] = useState(null);

  const [cargandoBitacora, setCargandoBitacora] = useState(true);
  const [cargandoSalud, setCargandoSalud] = useState(true);
  const [refrescandoManual, setRefrescandoManual] = useState(false);
  const [errorBitacora, setErrorBitacora] = useState(null);

  const secuenciaConsultaRef = useRef(0);
  const saludInicialCargadaRef = useRef(false);

  // Debounce en campos de texto libre para evitar consultas innecesarias por cada tecla pulsada.
  useEffect(() => {
    const temporizador = setTimeout(() => {
      let huboCambioTexto = false;
      setFiltrosAplicados((estadoAnterior) => {
        if (
          estadoAnterior.busqueda === filtrosTexto.busqueda &&
          estadoAnterior.usuario === filtrosTexto.usuario
        ) {
          return estadoAnterior;
        }
        huboCambioTexto = true;
        return {
          ...estadoAnterior,
          busqueda: filtrosTexto.busqueda,
          usuario: filtrosTexto.usuario,
        };
      });
      if (huboCambioTexto) {
        setPaginaActual(1);
      }
    }, 300);

    return () => clearTimeout(temporizador);
  }, [filtrosTexto.busqueda, filtrosTexto.usuario]);

  const consultarAuditoriaYSalud = useCallback(
    async ({ incluirSalud = true, esRefrescoManual = false } = {}) => {
      const secuenciaActual = secuenciaConsultaRef.current + 1;
      secuenciaConsultaRef.current = secuenciaActual;

      setCargandoBitacora(true);
      setErrorBitacora(null);
      if (incluirSalud) {
        setCargandoSalud(true);
      }
      if (esRefrescoManual) {
        setRefrescandoManual(true);
      }

      const promesaBitacora = obtenerBitacoraAuditoria({
        pagina: paginaActual,
        limite: limitePorPagina,
        usuario: filtrosAplicados.usuario,
        servicio: filtrosAplicados.servicio,
        metodo: filtrosAplicados.metodo,
        codigoHttp: filtrosAplicados.codigoHttp,
        busqueda: filtrosAplicados.busqueda,
        incluirSalud,
      });

      const promesaGateway = incluirSalud ? obtenerSaludGateway() : Promise.resolve(null);

      const [resultadoBitacora, resultadoGateway] = await Promise.allSettled([
        promesaBitacora,
        promesaGateway,
      ]);

      // Descartar respuestas antiguas si el administrador modificó filtros o solicitó otro refresco.
      if (secuenciaConsultaRef.current !== secuenciaActual) {
        return;
      }

      if (incluirSalud && resultadoGateway.status === 'fulfilled' && resultadoGateway.value) {
        setSaludGateway(resultadoGateway.value);
      }

      if (resultadoBitacora.status === 'fulfilled') {
        const datosNormalizados = resultadoBitacora.value;
        setRegistrosAuditoria(datosNormalizados.registros);
        setPaginacion(datosNormalizados.paginacion);
        if (incluirSalud && datosNormalizados.servicios) {
          setEstadoServicios(datosNormalizados.servicios);
          saludInicialCargadaRef.current = true;
        }
        setUltimaActualizacion(new Date().toISOString());
        if (esRefrescoManual) {
          showToast('Bitácora de auditoría y salud de servicios actualizadas.', 'success');
        }
      } else {
        const mensajeError = extraerMensajeErrorAuditoria(resultadoBitacora.reason);
        setErrorBitacora(mensajeError);
        if (esRefrescoManual) {
          showToast(mensajeError, 'error');
        }
      }

      setCargandoBitacora(false);
      if (incluirSalud) {
        setCargandoSalud(false);
      }
      if (esRefrescoManual) {
        setRefrescandoManual(false);
      }
    },
    [
      paginaActual,
      limitePorPagina,
      filtrosAplicados.usuario,
      filtrosAplicados.servicio,
      filtrosAplicados.metodo,
      filtrosAplicados.codigoHttp,
      filtrosAplicados.busqueda,
      showToast,
    ],
  );

  // Al cambiar solo filtros o paginación se omite la sonda HTTP a los 4 microservicios una vez
  // confirmada la telemetría inicial (evitando condiciones de carrera bajo React StrictMode).
  useEffect(() => {
    const debeIncluirSalud = !saludInicialCargadaRef.current;
    void consultarAuditoriaYSalud({ incluirSalud: debeIncluirSalud, esRefrescoManual: false });
  }, [consultarAuditoriaYSalud]);

  const manejarRefrescoManual = () => {
    void consultarAuditoriaYSalud({ incluirSalud: true, esRefrescoManual: true });
  };

  const manejarCambioFiltroSelect = (campo, valor) => {
    setFiltrosAplicados((estadoAnterior) => ({
      ...estadoAnterior,
      [campo]: valor,
    }));
    setPaginaActual(1);
  };

  const manejarSeleccionTarjetaServicio = (identificadorServicio) => {
    setFiltrosAplicados((estadoAnterior) => ({
      ...estadoAnterior,
      servicio: estadoAnterior.servicio === identificadorServicio ? '' : identificadorServicio,
    }));
    setPaginaActual(1);
  };

  const manejarLimpiarFiltros = () => {
    setFiltrosTexto({
      busqueda: FILTROS_INICIALES.busqueda,
      usuario: FILTROS_INICIALES.usuario,
    });
    setFiltrosAplicados(FILTROS_INICIALES);
    setPaginaActual(1);
  };

  const tieneFiltrosActivos = useMemo(
    () =>
      Boolean(
        filtrosTexto.busqueda.trim() ||
          filtrosTexto.usuario.trim() ||
          filtrosAplicados.servicio ||
          filtrosAplicados.metodo ||
          filtrosAplicados.codigoHttp,
      ),
    [
      filtrosTexto.busqueda,
      filtrosTexto.usuario,
      filtrosAplicados.servicio,
      filtrosAplicados.metodo,
      filtrosAplicados.codigoHttp,
    ],
  );

  const tarjetasMicroservicios = useMemo(() => {
    if (estadoServicios?.microservicios?.length > 0) {
      return estadoServicios.microservicios;
    }
    return CATALOGO_MICROSERVICIOS.map((definicion) => ({
      nombre: definicion.identificador,
      titulo: definicion.titulo,
      descripcion: definicion.descripcion,
      estado: 'DOWN',
      operativo: false,
      codigoHttp: null,
      latenciaMilisegundos: null,
      detalle:
        saludGateway && !saludGateway.operativo
          ? 'API Gateway temporalmente inaccesible'
          : 'Telemetría de salud aún no disponible',
    }));
  }, [estadoServicios, saludGateway]);

  const estiloSaludGateway = obtenerEstiloEstadoServicio(
    saludGateway?.estado || estadoServicios?.gateway?.estado || 'DOWN',
  );

  const uptimeGatewayEfectivo =
    saludGateway?.uptimeSegundos ?? estadoServicios?.gateway?.uptimeSegundos ?? null;

  const horaUltimaActualizacion = ultimaActualizacion
    ? formatearFechaHoraAuditoria(ultimaActualizacion).hora
    : null;

  const primerRegistroVisible =
    paginacion.total === 0 ? 0 : (paginacion.pagina - 1) * paginacion.limite + 1;
  const ultimoRegistroVisible = Math.min(paginacion.total, paginacion.pagina * paginacion.limite);

  return (
    <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8 space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-primary tracking-tight">
            Bitácora de Auditoría y Estado de Servicios
          </h1>
          <p className="text-sm text-gray-600">
            Registro de todo lo que se crea, modifica o elimina en la plataforma y supervisa en tiempo real que cada servicio esté funcionando correctamente.
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {horaUltimaActualizacion && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-gray-200 text-xs font-medium text-gray-600 shadow-2xs">
              <FiClock className="w-3.5 h-3.5 text-gray-400" aria-hidden="true" />
              <span>Actualizado: {horaUltimaActualizacion}</span>
            </span>
          )}
          <button
            type="button"
            onClick={manejarRefrescoManual}
            disabled={cargandoBitacora || cargandoSalud || refrescandoManual}
            data-testid="boton-refrescar-auditoria"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary hover:bg-primary-hover text-white text-xs font-bold shadow-sm transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed btn-hover-primary"
          >
            <FiRefreshCw
              className={`w-4 h-4 ${refrescandoManual || cargandoSalud ? 'animate-spin' : ''}`}
              aria-hidden="true"
            />
            <span>{refrescandoManual ? 'Actualizando...' : 'Actualizar ahora'}</span>
          </button>
        </div>
      </div>

      <section aria-labelledby="titulo-monitor-salud" className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <FiServer className="w-5 h-5 text-primary" aria-hidden="true" />
            <h2 id="titulo-monitor-salud" className="text-lg font-bold text-gray-900">
              Monitor de Salud de Microservicios
            </h2>
          </div>

          <div
            data-testid="resumen-salud-gateway"
            className="inline-flex items-center gap-2.5 flex-wrap px-3.5 py-2 rounded-xl bg-white border border-gray-200 shadow-2xs text-xs"
          >
            <span className="font-bold text-gray-700">API Gateway</span>
            <span
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border font-bold ${estiloSaludGateway.claseInsignia}`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${estiloSaludGateway.clasePunto}`} />
              <span>{estiloSaludGateway.etiqueta}</span>
            </span>
            <span className="text-gray-500">
              Latencia:{' '}
              <strong className="font-mono text-gray-800">
                {formatearLatenciaMilisegundos(saludGateway?.latenciaMilisegundos)}
              </strong>
            </span>
            <span className="text-gray-300" aria-hidden="true">
              |
            </span>
            <span className="text-gray-500">
              Uptime:{' '}
              <strong className="font-mono text-gray-800">
                {formatearDuracionUptime(uptimeGatewayEfectivo)}
              </strong>
            </span>
          </div>
        </div>

        {saludGateway && !saludGateway.operativo && (
          <div
            role="alert"
            className="flex items-start gap-3 p-4 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs sm:text-sm"
          >
            <FiAlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" aria-hidden="true" />
            <div className="space-y-0.5">
              <p className="font-bold">API Gateway temporalmente no disponible</p>
              <p className="text-red-700">
                {saludGateway.errorDetalle ||
                  'No fue posible obtener respuesta desde el chequeo de salud del Gateway.'}
              </p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {cargandoSalud && !estadoServicios ? (
            <SkeletonCard cantidad={4} tipo="metrica" />
          ) : (
            tarjetasMicroservicios.map((microservicio) => {
              const estiloEstado = obtenerEstiloEstadoServicio(microservicio.estado);
              const estaSeleccionado = filtrosAplicados.servicio === microservicio.nombre;

              return (
                <button
                  key={microservicio.nombre}
                  type="button"
                  onClick={() => manejarSeleccionTarjetaServicio(microservicio.nombre)}
                  aria-pressed={estaSeleccionado}
                  data-testid={`tarjeta-salud-${microservicio.nombre}`}
                  className={`text-left bg-white rounded-xl p-4 border shadow-2xs transition-all cursor-pointer hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                    estaSeleccionado
                      ? 'border-primary ring-2 ring-primary/20 bg-primary-50/30'
                      : `${estiloEstado.claseBordeTarjeta} hover:border-gray-300`
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${estiloEstado.claseFondoIcono}`}
                      >
                        {renderizarIconoSalud(microservicio.estado)}
                      </div>
                      <div className="min-w-0">
                        <p className="font-mono text-sm font-bold text-gray-900 truncate">
                          {microservicio.nombre}
                        </p>
                        <p className="text-xs text-gray-500 truncate">{microservicio.titulo}</p>
                      </div>
                    </div>
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[11px] font-bold flex-shrink-0 ${estiloEstado.claseInsignia}`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${estiloEstado.clasePunto}`} />
                      <span>{estiloEstado.etiqueta}</span>
                    </span>
                  </div>

                  <p className="mt-2.5 text-xs text-gray-500 line-clamp-2 min-h-[2rem]">
                    {microservicio.detalle || microservicio.descripcion}
                  </p>

                  <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5 text-gray-600">
                      <FiActivity className="w-3.5 h-3.5 text-gray-400" aria-hidden="true" />
                      <span>Latencia:</span>
                      <strong className="font-mono text-gray-900">
                        {formatearLatenciaMilisegundos(microservicio.latenciaMilisegundos)}
                      </strong>
                    </div>

                    {microservicio.codigoHttp !== null ? (
                      <span className="font-mono text-[11px] px-2 py-0.5 rounded bg-gray-100 text-gray-700 border border-gray-200">
                        HTTP {microservicio.codigoHttp}
                      </span>
                    ) : (
                      <span className="text-[11px] font-semibold text-red-600">Sin respuesta</span>
                    )}
                  </div>
                </button>
              );
            })
          )}
        </div>
      </section>

      <section aria-labelledby="titulo-bitacora-transacciones" className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <FiShield className="w-5 h-5 text-primary" aria-hidden="true" />
            <h2 id="titulo-bitacora-transacciones" className="text-lg font-bold text-gray-900">
              Bitácora de Transacciones
            </h2>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-primary-50 text-primary border border-primary-200">
              {paginacion.total} {paginacion.total === 1 ? 'registro coincidente' : 'registros coincidentes'}
            </span>
            {paginacion.almacenamientoEfimero && paginacion.capacidadBuffer > 0 && (
              <span
                title="Los registros residen en el buffer circular acotado del API Gateway y se publican de forma asíncrona hacia la cola de auditoría."
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700 border border-gray-200"
              >
                <FiInfo className="w-3.5 h-3.5 text-gray-500" aria-hidden="true" />
                <span>
                  Buffer en memoria: {paginacion.registrosEnBuffer} / {paginacion.capacidadBuffer}
                </span>
              </span>
            )}
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-2xs space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-gray-500">
              <FiFilter className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Filtros Reactivos</span>
            </div>
            {tieneFiltrosActivos && (
              <button
                type="button"
                onClick={manejarLimpiarFiltros}
                className="text-xs font-semibold text-primary hover:text-primary-hover underline cursor-pointer"
              >
                Limpiar filtros
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            <div className="relative">
              <label htmlFor="auditoria-busqueda-libre" className="sr-only">
                Buscar por ruta, entidad o acción
              </label>
              <FiSearch
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4"
                aria-hidden="true"
              />
              <input
                id="auditoria-busqueda-libre"
                type="text"
                value={filtrosTexto.busqueda}
                onChange={(evento) =>
                  setFiltrosTexto((estadoAnterior) => ({
                    ...estadoAnterior,
                    busqueda: evento.target.value,
                  }))
                }
                placeholder="Buscar ruta /api/v1/*, entidad..."
                className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-xs sm:text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
              />
            </div>

            <div className="relative">
              <label htmlFor="auditoria-filtro-usuario" className="sr-only">
                Filtrar por usuario responsable
              </label>
              <FiUser
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4"
                aria-hidden="true"
              />
              <input
                id="auditoria-filtro-usuario"
                type="text"
                value={filtrosTexto.usuario}
                onChange={(evento) =>
                  setFiltrosTexto((estadoAnterior) => ({
                    ...estadoAnterior,
                    usuario: evento.target.value,
                  }))
                }
                placeholder="Usuario, correo o rol..."
                className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-xs sm:text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
              />
            </div>

            <div>
              <label htmlFor="auditoria-filtro-servicio" className="sr-only">
                Filtrar por microservicio destino
              </label>
              <select
                id="auditoria-filtro-servicio"
                value={filtrosAplicados.servicio}
                onChange={(evento) => manejarCambioFiltroSelect('servicio', evento.target.value)}
                className="w-full px-3 py-2 text-xs sm:text-sm font-medium bg-gray-50 border border-gray-300 rounded-lg text-gray-800 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none cursor-pointer"
              >
                {OPCIONES_SERVICIO_DESTINO.map((opcion) => (
                  <option key={opcion.valor || 'todos'} value={opcion.valor}>
                    {opcion.etiqueta}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="auditoria-filtro-metodo" className="sr-only">
                Filtrar por método HTTP
              </label>
              <select
                id="auditoria-filtro-metodo"
                value={filtrosAplicados.metodo}
                onChange={(evento) => manejarCambioFiltroSelect('metodo', evento.target.value)}
                className="w-full px-3 py-2 text-xs sm:text-sm font-medium bg-gray-50 border border-gray-300 rounded-lg text-gray-800 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none cursor-pointer"
              >
                <option value="">Todos los métodos</option>
                {METODOS_HTTP_MUTANTES.map((metodoHttp) => (
                  <option key={metodoHttp} value={metodoHttp}>
                    {metodoHttp}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="auditoria-filtro-codigo" className="sr-only">
                Filtrar por código de respuesta HTTP
              </label>
              <select
                id="auditoria-filtro-codigo"
                value={filtrosAplicados.codigoHttp}
                onChange={(evento) => manejarCambioFiltroSelect('codigoHttp', evento.target.value)}
                className="w-full px-3 py-2 text-xs sm:text-sm font-medium bg-gray-50 border border-gray-300 rounded-lg text-gray-800 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none cursor-pointer"
              >
                {OPCIONES_CODIGO_HTTP.map((opcion) => (
                  <option key={opcion.valor || 'todos-codigos'} value={opcion.valor}>
                    {opcion.etiqueta}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {errorBitacora && (
          <div
            role="alert"
            data-testid="alerta-error-auditoria"
            className="bg-red-50 border border-red-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
          >
            <div className="flex items-start gap-3">
              <FiAlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" aria-hidden="true" />
              <div className="space-y-0.5 text-xs sm:text-sm">
                <p className="font-bold text-red-900">Error al consultar la bitácora de auditoría</p>
                <p className="text-red-700">{errorBitacora}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={manejarRefrescoManual}
              className="self-start sm:self-center px-3.5 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition-colors cursor-pointer"
            >
              Reintentar
            </button>
          </div>
        )}

        <div className="w-full bg-white shadow-sm rounded-xl border border-gray-200 overflow-hidden">
          <div className="md:hidden p-3 sm:p-4 space-y-3" data-testid="lista-auditoria-movil">
            {cargandoBitacora ? (
              <SkeletonTable modo="tarjetas" filas={4} />
            ) : registrosAuditoria.length === 0 ? (
              <div className="py-12 px-4 text-center space-y-2">
                <p className="text-sm font-semibold text-gray-700">
                  {tieneFiltrosActivos
                    ? 'No se encontraron transacciones con los filtros aplicados.'
                    : 'Aún no se han registrado operaciones mutantes en la bitácora.'}
                </p>
                {tieneFiltrosActivos && (
                  <button
                    type="button"
                    onClick={manejarLimpiarFiltros}
                    className="inline-flex items-center px-3 py-1.5 rounded-lg bg-primary-50 text-primary text-xs font-bold border border-primary-200 cursor-pointer"
                  >
                    Restablecer filtros
                  </button>
                )}
              </div>
            ) : (
              registrosAuditoria.map((registro) => {
                const fechaHora = formatearFechaHoraAuditoria(registro.timestamp);
                const estiloMetodo = obtenerEstiloMetodoHttp(registro.metodo);
                const estiloCodigo = obtenerEstiloCodigoHttp(registro.codigoHttp);
                const claseRol = obtenerEstiloRolUsuario(registro.usuario.rol);
                const etiquetaUsuario = registro.usuario.correo || registro.usuario.id;

                return (
                  <article
                    key={registro.idAuditoria}
                    className="bg-white rounded-xl p-4 border border-gray-200 shadow-2xs space-y-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-md border font-mono text-[11px] font-bold ${estiloMetodo.claseInsignia}`}
                        >
                          {estiloMetodo.metodo}
                        </span>
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full border font-mono text-[11px] font-bold ${estiloCodigo.claseInsignia}`}
                        >
                          HTTP {estiloCodigo.codigo}
                        </span>
                      </div>
                      <span className="font-mono text-[11px] text-gray-500 flex-shrink-0">
                        {fechaHora.fecha} {fechaHora.hora}
                      </span>
                    </div>

                    <div className="bg-gray-50 border border-gray-100 rounded-lg px-3 py-2">
                      <p className="font-mono text-xs font-semibold text-gray-900 break-all">
                        {registro.ruta}
                      </p>
                      <p className="mt-1 text-[11px] text-gray-500">
                        Acción: <strong className="text-gray-700">{registro.accion}</strong>
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="min-w-0">
                        <span className="block text-[10px] uppercase font-bold text-gray-400">
                          Usuario responsable
                        </span>
                        <span className="block font-semibold text-gray-900 truncate">
                          {etiquetaUsuario}
                        </span>
                        <span
                          className={`mt-1 inline-flex px-2 py-0.5 rounded-md border text-[10px] font-bold uppercase ${claseRol}`}
                        >
                          {registro.usuario.rol}
                        </span>
                      </div>

                      <div className="space-y-1.5">
                        <div>
                          <span className="block text-[10px] uppercase font-bold text-gray-400">
                            Microservicio
                          </span>
                          <span className="inline-flex font-mono text-xs font-semibold px-2 py-0.5 rounded bg-primary-50 text-primary border border-primary-100">
                            {registro.servicioDestino}
                          </span>
                        </div>
                        <div>
                          <span className="block text-[10px] uppercase font-bold text-gray-400">
                            Latencia
                          </span>
                          <span className="font-mono text-xs font-bold text-gray-800">
                            {formatearLatenciaMilisegundos(registro.latenciaMilisegundos)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </article>
                );
              })
            )}
          </div>

          <div className="hidden md:block overflow-x-auto" data-testid="tabla-auditoria-escritorio">
            <table className="min-w-full divide-y divide-gray-200 text-left text-sm text-gray-600">
              <thead className="bg-gray-50/95 sticky top-0 z-10">
                <tr>
                  <th className="px-5 py-3.5 text-xs font-bold text-gray-500 uppercase tracking-wider">
                    Fecha / Hora
                  </th>
                  <th className="px-5 py-3.5 text-xs font-bold text-gray-500 uppercase tracking-wider">
                    Usuario / Rol
                  </th>
                  <th className="px-5 py-3.5 text-xs font-bold text-gray-500 uppercase tracking-wider">
                    Método y Ruta
                  </th>
                  <th className="px-5 py-3.5 text-xs font-bold text-gray-500 uppercase tracking-wider">
                    Microservicio
                  </th>
                  <th className="px-5 py-3.5 text-xs font-bold text-gray-500 uppercase tracking-wider">
                    Código HTTP
                  </th>
                  <th className="px-5 py-3.5 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">
                    Latencia
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {cargandoBitacora ? (
                  <SkeletonTable soloFilas columnas={6} filas={6} />
                ) : registrosAuditoria.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center">
                      <div className="space-y-2">
                        <p className="text-sm font-semibold text-gray-700">
                          {tieneFiltrosActivos
                            ? 'No se encontraron transacciones que coincidan con los filtros seleccionados.'
                            : 'Aún no se han registrado operaciones mutantes en la bitácora del Gateway.'}
                        </p>
                        {tieneFiltrosActivos && (
                          <button
                            type="button"
                            onClick={manejarLimpiarFiltros}
                            className="inline-flex items-center px-3.5 py-1.5 rounded-lg bg-primary-50 text-primary text-xs font-bold border border-primary-200 hover:bg-primary-100 cursor-pointer"
                          >
                            Restablecer filtros
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ) : (
                  registrosAuditoria.map((registro) => {
                    const fechaHora = formatearFechaHoraAuditoria(registro.timestamp);
                    const estiloMetodo = obtenerEstiloMetodoHttp(registro.metodo);
                    const estiloCodigo = obtenerEstiloCodigoHttp(registro.codigoHttp);
                    const claseRol = obtenerEstiloRolUsuario(registro.usuario.rol);
                    const etiquetaUsuario = registro.usuario.correo || registro.usuario.id;

                    return (
                      <tr
                        key={registro.idAuditoria}
                        className="hover:bg-primary-50/30 transition-colors"
                      >
                        <td className="px-5 py-3.5 whitespace-nowrap">
                          <div className="font-mono text-xs font-semibold text-gray-900">
                            {fechaHora.fecha}
                          </div>
                          <div className="font-mono text-[11px] text-gray-500">
                            {fechaHora.hora}
                          </div>
                        </td>

                        <td className="px-5 py-3.5 whitespace-nowrap">
                          <div className="text-xs font-semibold text-gray-900 max-w-[220px] truncate">
                            {etiquetaUsuario}
                          </div>
                          <span
                            className={`mt-1 inline-flex px-2 py-0.5 rounded-md border text-[10px] font-bold uppercase tracking-wide ${claseRol}`}
                          >
                            {registro.usuario.rol}
                          </span>
                        </td>

                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-2">
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded-md border font-mono text-[11px] font-bold flex-shrink-0 ${estiloMetodo.claseInsignia}`}
                            >
                              {estiloMetodo.metodo}
                            </span>
                            <span className="font-mono text-xs font-semibold text-gray-900 break-all">
                              {registro.ruta}
                            </span>
                          </div>
                          <div className="mt-1 text-[11px] text-gray-500">
                            {registro.accion}
                            {registro.idEntidad && registro.idEntidad !== 'N/A'
                              ? ` · ID ${registro.idEntidad}`
                              : ''}
                          </div>
                        </td>

                        <td className="px-5 py-3.5 whitespace-nowrap">
                          <span className="inline-flex items-center px-2.5 py-1 rounded-lg font-mono text-xs font-semibold bg-primary-50 text-primary border border-primary-100">
                            {registro.servicioDestino}
                          </span>
                        </td>

                        <td className="px-5 py-3.5 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full border font-mono text-xs font-bold ${estiloCodigo.claseInsignia}`}
                          >
                            {estiloCodigo.codigo}
                          </span>
                        </td>

                        <td className="px-5 py-3.5 whitespace-nowrap text-right">
                          <span className="font-mono text-xs font-bold text-gray-800">
                            {formatearLatenciaMilisegundos(registro.latenciaMilisegundos)}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <div className="px-4 sm:px-5 py-3.5 bg-gray-50/70 border-t border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-gray-600">
            <div className="flex items-center gap-3 flex-wrap">
              <span>
                Mostrando{' '}
                <strong className="text-gray-900">
                  {primerRegistroVisible}–{ultimoRegistroVisible}
                </strong>{' '}
                de <strong className="text-gray-900">{paginacion.total}</strong> registros
              </span>

              <div className="flex items-center gap-1.5">
                <label htmlFor="auditoria-limite-pagina" className="text-gray-500 font-medium">
                  Por página:
                </label>
                <select
                  id="auditoria-limite-pagina"
                  value={limitePorPagina}
                  onChange={(evento) => {
                    setLimitePorPagina(Number(evento.target.value));
                    setPaginaActual(1);
                  }}
                  className="px-2 py-1 bg-white border border-gray-300 rounded-md font-semibold text-gray-800 outline-none focus:border-primary cursor-pointer"
                >
                  {OPCIONES_LIMITE_PAGINA.map((opcionLimite) => (
                    <option key={opcionLimite} value={opcionLimite}>
                      {opcionLimite}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-auto">
              <button
                type="button"
                disabled={paginacion.pagina <= 1 || cargandoBitacora}
                onClick={() => setPaginaActual((anterior) => Math.max(1, anterior - 1))}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white border border-gray-300 text-gray-700 font-semibold hover:bg-gray-50 disabled:opacity-45 disabled:cursor-not-allowed cursor-pointer"
              >
                <FiChevronLeft className="w-4 h-4" aria-hidden="true" />
                <span>Anterior</span>
              </button>

              <span className="px-2.5 py-1 font-semibold text-gray-700">
                Página {paginacion.pagina} de {paginacion.totalPaginas}
              </span>

              <button
                type="button"
                disabled={paginacion.pagina >= paginacion.totalPaginas || cargandoBitacora}
                onClick={() =>
                  setPaginaActual((anterior) => Math.min(paginacion.totalPaginas, anterior + 1))
                }
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white border border-gray-300 text-gray-700 font-semibold hover:bg-gray-50 disabled:opacity-45 disabled:cursor-not-allowed cursor-pointer"
              >
                <span>Siguiente</span>
                <FiChevronRight className="w-4 h-4" aria-hidden="true" />
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Auditoria;
