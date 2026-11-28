import React, { useState, useMemo, useCallback } from 'react';
import {
  FiSearch,
  FiPlus,
  FiTrash2,
  FiX,
  FiShield,
  FiAlertTriangle,
} from 'react-icons/fi';
import StatusBadge from '../components/StatusBadge';
import SkeletonTable from '../components/SkeletonTable';
import { useToast } from '../context/ToastContext';
import {
  fetchUsuarios,
  cambiarRolUsuario,
  eliminarUsuario,
  crearUsuarioAdmin,
} from '../services/usuariosService';
import { getUsuarioActual, hasPermission } from '../services/authService';
import { useInfiniteScroll } from '../hooks/useInfiniteScroll';
import { useFocusTrap } from '../hooks/useFocusTrap';

const ROLES_SISTEMA = ['ADMINISTRADOR', 'SUPERVISOR', 'TECNICO', 'REPORTANTE'];

const Usuarios = () => {
  const { showToast } = useToast();
  const usuarioSesion = getUsuarioActual();
  const idSesion =
    usuarioSesion?.id_usuario || usuarioSesion?.id || usuarioSesion?.userId || null;
  const puedeGestionar = hasPermission('usuarios:gestionar');

  const [terminoBusqueda, setTerminoBusqueda] = useState('');
  const [filtroRol, setFiltroRol] = useState('Todos');
  const [actualizandoRolId, setActualizandoRolId] = useState(null);
  const [usuarioAEliminar, setUsuarioAEliminar] = useState(null);
  const [eliminando, setEliminando] = useState(false);

  const [modalCrearAbierto, setModalCrearAbierto] = useState(false);
  const [creando, setCreando] = useState(false);
  const [nuevoUsuario, setNuevoUsuario] = useState({
    rut_o_id: '',
    nombre: '',
    apellido: '',
    email: '',
    password: '',
    rol: 'REPORTANTE',
  });

  const modalCrearRef = useFocusTrap(modalCrearAbierto, {
    onClose: () => {
      if (!creando) setModalCrearAbierto(false);
    },
  });

  const modalEliminarRef = useFocusTrap(Boolean(usuarioAEliminar), {
    onClose: () => {
      if (!eliminando) setUsuarioAEliminar(null);
    },
  });

  const fetchUsuariosCallback = useCallback(async (page, limit) => {
    try {
      const data = await fetchUsuarios({ page, limit });
      return data;
    } catch (error) {
      showToast('Error al conectar con el servicio de usuarios', 'error');
      throw error;
    }
  }, [showToast]);

  const {
    items: usuarios,
    setItems: setUsuarios,
    loading,
    loadingMore,
    hasMore,
    containerRef,
    sentinelRef,
    sentinelIndex,
    handleContainerScroll,
  } = useInfiniteScroll({
    fetchFunction: fetchUsuariosCallback,
    limit: 15,
  });

  const getRoleBadgeClass = (rol) => {
    const rolNormalizado = (rol || '').toLowerCase();
    if (rolNormalizado.includes('admin')) {
      return 'bg-red-50 text-red-800 border-red-200';
    }
    if (rolNormalizado.includes('super')) {
      return 'bg-blue-50 text-blue-800 border-blue-200';
    }
    if (rolNormalizado.includes('téc') || rolNormalizado.includes('tec')) {
      return 'bg-emerald-50 text-emerald-800 border-emerald-200';
    }
    return 'bg-purple-50 text-purple-800 border-purple-200';
  };

  const usuariosFiltrados = useMemo(() => {
    const txt = terminoBusqueda.trim().toLowerCase();
    return usuarios.filter((usr) => {
      const rolUsr = String(usr.rol?.nombre_rol || usr.rol || 'REPORTANTE').toUpperCase();
      if (filtroRol !== 'Todos' && rolUsr !== filtroRol) {
        return false;
      }
      if (!txt) return true;
      const nombreCompleto = `${usr.nombre || ''} ${usr.apellido || ''}`.toLowerCase();
      const correo = (usr.correo || usr.email || '').toLowerCase();
      const rut = (usr.rut_o_id || '').toLowerCase();
      return (
        nombreCompleto.includes(txt) ||
        correo.includes(txt) ||
        rut.includes(txt) ||
        rolUsr.toLowerCase().includes(txt)
      );
    });
  }, [usuarios, terminoBusqueda, filtroRol]);

  const handleCambioRol = async (usr, nuevoRol) => {
    const idTarget = usr.id_usuario || usr.id;
    const rolAnterior = String(usr.rol?.nombre_rol || usr.rol || 'REPORTANTE').toUpperCase();
    if (!idTarget || nuevoRol === rolAnterior) return;

    setActualizandoRolId(idTarget);
    try {
      await cambiarRolUsuario(idTarget, nuevoRol);
      setUsuarios((prev) =>
        prev.map((item) =>
          (item.id_usuario || item.id) === idTarget
            ? { ...item, rol: nuevoRol, rol_info: { ...(item.rol_info || {}), nombre_rol: nuevoRol } }
            : item
        )
      );
      showToast(`Rol de ${usr.nombre || usr.correo} actualizado a ${nuevoRol}`, 'success');
    } catch (err) {
      showToast(
        err.response?.data?.message || err.response?.data?.mensaje || 'No fue posible actualizar el rol del usuario',
        'error'
      );
    } finally {
      setActualizandoRolId(null);
    }
  };

  const confirmarEliminacionUsuario = async () => {
    if (!usuarioAEliminar) return;
    const idTarget = usuarioAEliminar.id_usuario || usuarioAEliminar.id;
    setEliminando(true);
    try {
      await eliminarUsuario(idTarget);
      setUsuarios((prev) => prev.filter((item) => (item.id_usuario || item.id) !== idTarget));
      showToast(
        `Usuario ${usuarioAEliminar.nombre || usuarioAEliminar.correo} dado de baja exitosamente`,
        'success'
      );
      setUsuarioAEliminar(null);
    } catch (err) {
      showToast(
        err.response?.data?.message || err.response?.data?.mensaje || 'Error al eliminar el usuario',
        'error'
      );
    } finally {
      setEliminando(false);
    }
  };

  const handleCrearUsuario = async (e) => {
    e.preventDefault();
    if (creando) return;

    if (
      !nuevoUsuario.rut_o_id.trim() ||
      !nuevoUsuario.nombre.trim() ||
      !nuevoUsuario.apellido.trim() ||
      !nuevoUsuario.email.trim() ||
      nuevoUsuario.password.length < 6
    ) {
      showToast('Completa todos los campos (contraseña mínimo 6 caracteres).', 'error');
      return;
    }

    setCreando(true);
    try {
      const creado = await crearUsuarioAdmin(nuevoUsuario);
      setUsuarios((prev) => [creado, ...prev]);
      showToast(`Usuario ${creado.nombre} (${creado.rol}) registrado exitosamente`, 'success');
      setModalCrearAbierto(false);
      setNuevoUsuario({
        rut_o_id: '',
        nombre: '',
        apellido: '',
        email: '',
        password: '',
        rol: 'REPORTANTE',
      });
    } catch (err) {
      const msg = Array.isArray(err.response?.data?.message)
        ? err.response.data.message.join(', ')
        : err.response?.data?.message || err.response?.data?.mensaje || 'Error al registrar el usuario';
      showToast(msg, 'error');
    } finally {
      setCreando(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-primary tracking-tight">
            Gestión de Usuarios
          </h2>
          <p className="mt-1 text-sm text-gray-600">
            Administración de cuentas institucionales, asignación de roles y control de acceso.
          </p>
        </div>
        <div className="flex items-center gap-2.5 flex-wrap">
          <span className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-semibold bg-primary-50 text-primary border border-primary-200">
            {usuariosFiltrados.length} de {usuarios.length} usuarios
          </span>
          {puedeGestionar && (
            <button
              type="button"
              onClick={() => setModalCrearAbierto(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary-hover text-white rounded-lg text-xs font-bold shadow-sm transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            >
              <FiPlus className="w-4 h-4" aria-hidden="true" />
              <span>Nuevo Usuario</span>
            </button>
          )}
        </div>
      </div>

      {/* Barra de búsqueda y filtro por rol */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-2xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" aria-hidden="true" />
          <input
            type="text"
            value={terminoBusqueda}
            onChange={(e) => setTerminoBusqueda(e.target.value)}
            placeholder="Buscar por nombre, correo o RUT..."
            aria-label="Buscar usuarios por nombre, correo o RUT"
            className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary outline-none"
          />
        </div>
        <div className="flex items-center gap-2">
          <label htmlFor="filtro-rol-usuarios" className="text-xs font-semibold text-gray-700">
            Filtrar por Rol:
          </label>
          <select
            id="filtro-rol-usuarios"
            value={filtroRol}
            onChange={(e) => setFiltroRol(e.target.value)}
            className="px-3 py-2 text-xs font-semibold bg-gray-50 border border-gray-300 rounded-lg text-gray-800 focus:ring-2 focus:ring-primary/20 focus:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary outline-none cursor-pointer"
          >
            <option value="Todos">Todos los roles</option>
            {ROLES_SISTEMA.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="w-full bg-white/95 shadow-sm rounded-xl border border-gray-200 overflow-hidden">
        <div
          ref={containerRef}
          onScroll={handleContainerScroll}
          className="overflow-x-auto overflow-y-auto max-h-[580px]"
        >
          {/* Vista Móvil / Tablet Estrecha (< md): Tarjetas Apiladas */}
          <div className="md:hidden divide-y divide-gray-100 p-3 sm:p-4 space-y-3">
            {loading && usuarios.length === 0 ? (
              <SkeletonTable modo="tarjetas" filas={4} />
            ) : usuariosFiltrados.length === 0 ? (
              <div className="py-12 text-center text-sm text-gray-500">
                No se encontraron usuarios que coincidan con el filtro actual.
              </div>
            ) : (
              usuariosFiltrados.map((usr, index) => {
                const idUsr = usr.id_usuario || usr.id;
                const esMiCuenta = Boolean(idSesion && idUsr && idSesion === idUsr);
                const rolActual = String(usr.rol?.nombre_rol || usr.rol || 'REPORTANTE').toUpperCase();
                const nombreCompleto = `${usr.nombre || ''} ${usr.apellido || ''}`.trim() || 'Usuario';
                const inicial = (usr.nombre || 'U').charAt(0).toUpperCase();
                const fechaTexto = usr.fecha_creacion
                  ? new Date(usr.fecha_creacion).toLocaleDateString()
                  : 'N/A';

                return (
                  <div
                    key={idUsr || usr.rut_o_id || `user-card-${index}`}
                    className="bg-white rounded-xl p-4 border border-gray-200 shadow-2xs space-y-3"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="h-10 w-10 rounded-full bg-primary flex items-center justify-center text-white font-bold text-sm shadow-xs flex-shrink-0">
                          {inicial}
                        </div>
                        <div className="min-w-0">
                          <h3 className="font-semibold text-sm text-gray-900 truncate">
                            {nombreCompleto} {esMiCuenta && <span className="text-[10px] text-primary font-bold">(Tú)</span>}
                          </h3>
                          <span className="text-xs text-gray-600 break-all">{usr.correo || usr.email}</span>
                        </div>
                      </div>
                      <StatusBadge status={usr.estado === 'inactivo' ? 'inactivo' : 'activo'} />
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs bg-gray-50/80 p-2.5 rounded-lg border border-gray-100">
                      <div>
                        <span className="text-gray-600 block text-[10px] uppercase font-bold">RUT / ID</span>
                        <span className="font-mono text-xs font-semibold text-gray-800">{usr.rut_o_id || 'N/A'}</span>
                      </div>
                      <div>
                        <span className="text-gray-600 block text-[10px] uppercase font-bold">Fecha Registro</span>
                        <span className="font-medium text-xs text-gray-800">{fechaTexto}</span>
                      </div>
                    </div>

                    {puedeGestionar && (
                      <div className="flex items-center justify-between gap-2 pt-1">
                        <select
                          aria-label={`Cambiar rol de ${nombreCompleto}`}
                          disabled={esMiCuenta || actualizandoRolId === idUsr}
                          value={rolActual}
                          onChange={(e) => void handleCambioRol(usr, e.target.value)}
                          className="flex-1 px-2.5 py-1.5 text-xs font-semibold border border-gray-300 rounded-lg bg-white text-gray-800 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                        >
                          {ROLES_SISTEMA.map((r) => (
                            <option key={r} value={r}>
                              {r}
                            </option>
                          ))}
                        </select>
                        <button
                          type="button"
                          disabled={esMiCuenta}
                          onClick={() => setUsuarioAEliminar(usr)}
                          aria-label={`Eliminar usuario ${nombreCompleto}`}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 disabled:opacity-40 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                          title={esMiCuenta ? 'No puedes eliminar tu propia cuenta activa' : 'Eliminar usuario'}
                        >
                          <FiTrash2 className="w-3.5 h-3.5" aria-hidden="true" />
                          <span>Eliminar</span>
                        </button>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Vista Escritorio (>= md) */}
          <div className="hidden md:block">
            <table className="min-w-full divide-y divide-gray-200 text-left text-sm text-gray-600">
              <thead className="bg-gray-50/95 sticky top-0 z-10 shadow-xs">
                <tr>
                  <th scope="col" className="px-6 py-3.5 text-xs font-bold text-gray-600 uppercase tracking-wider">
                    Usuario
                  </th>
                  <th scope="col" className="px-6 py-3.5 text-xs font-bold text-gray-600 uppercase tracking-wider">
                    RUT / ID
                  </th>
                  <th scope="col" className="px-6 py-3.5 text-xs font-bold text-gray-600 uppercase tracking-wider">
                    Rol Asignado
                  </th>
                  <th scope="col" className="px-6 py-3.5 text-xs font-bold text-gray-600 uppercase tracking-wider">
                    Estado
                  </th>
                  <th scope="col" className="px-6 py-3.5 text-xs font-bold text-gray-600 uppercase tracking-wider">
                    Fecha Registro
                  </th>
                  {puedeGestionar && (
                    <th scope="col" className="px-6 py-3.5 text-xs font-bold text-gray-600 uppercase tracking-wider text-right">
                      Acciones
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {loading && usuarios.length === 0 ? (
                  <SkeletonTable soloFilas columnas={puedeGestionar ? 6 : 5} filas={6} />
                ) : usuariosFiltrados.length === 0 ? (
                  <tr>
                    <td colSpan={puedeGestionar ? 6 : 5} className="px-6 py-12 text-center text-sm text-gray-500">
                      No se encontraron usuarios que coincidan con la búsqueda.
                    </td>
                  </tr>
                ) : (
                  usuariosFiltrados.map((usr, index) => {
                    const idUsr = usr.id_usuario || usr.id;
                    const esMiCuenta = Boolean(idSesion && idUsr && idSesion === idUsr);
                    const rolActual = String(usr.rol?.nombre_rol || usr.rol || 'REPORTANTE').toUpperCase();
                    const isSentinel = index === sentinelIndex;
                    const nombreCompleto = `${usr.nombre || ''} ${usr.apellido || ''}`.trim() || 'Usuario';
                    const inicial = (usr.nombre || 'U').charAt(0).toUpperCase();
                    const fechaTexto = usr.fecha_creacion
                      ? new Date(usr.fecha_creacion).toLocaleDateString()
                      : 'N/A';

                    return (
                      <tr
                        key={idUsr || usr.rut_o_id || `user-${index}`}
                        ref={isSentinel ? sentinelRef : null}
                        className="hover:bg-primary-50/30 transition-colors"
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="h-9 w-9 rounded-full bg-primary flex items-center justify-center text-white font-bold text-xs shadow-xs flex-shrink-0">
                              {inicial}
                            </div>
                            <div className="ml-3.5">
                              <div className="text-sm font-semibold text-gray-900">
                                {nombreCompleto}{' '}
                                {esMiCuenta && (
                                  <span className="ml-1 text-[10px] px-1.5 py-0.5 rounded bg-primary-50 text-primary font-bold">
                                    Sesión actual
                                  </span>
                                )}
                              </div>
                              <div className="text-xs text-gray-500">{usr.correo || usr.email}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="font-mono text-xs px-2 py-0.5 bg-gray-100 text-gray-700 rounded-lg border border-gray-200">
                            {usr.rut_o_id || 'N/A'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {puedeGestionar ? (
                            <div className="inline-flex items-center gap-2">
                              <select
                                aria-label={`Cambiar rol de ${nombreCompleto}`}
                                disabled={esMiCuenta || actualizandoRolId === idUsr}
                                value={rolActual}
                                onChange={(e) => void handleCambioRol(usr, e.target.value)}
                                title={
                                  esMiCuenta
                                    ? 'No puedes modificar el rol de tu propia sesión activa'
                                    : 'Seleccionar nuevo rol institucional'
                                }
                                className={`px-2.5 py-1 text-xs font-bold rounded-lg border outline-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed ${getRoleBadgeClass(
                                  rolActual
                                )}`}
                              >
                                {ROLES_SISTEMA.map((r) => (
                                  <option key={r} value={r} className="bg-white text-gray-900 font-medium">
                                    {r}
                                  </option>
                                ))}
                              </select>
                            </div>
                          ) : (
                            <span className={`px-2.5 py-0.5 inline-flex text-xs font-semibold rounded-full border ${getRoleBadgeClass(rolActual)}`}>
                              {rolActual}
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <StatusBadge status={usr.estado === 'inactivo' ? 'inactivo' : 'activo'} />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-xs text-gray-600">
                          {fechaTexto}
                        </td>
                        {puedeGestionar && (
                          <td className="px-6 py-4 whitespace-nowrap text-right">
                            <button
                              type="button"
                              disabled={esMiCuenta}
                              onClick={() => setUsuarioAEliminar(usr)}
                              title={
                                esMiCuenta
                                  ? 'No puedes eliminar tu propia cuenta activa'
                                  : `Dar de baja a ${nombreCompleto}`
                              }
                              aria-label={`Eliminar usuario ${nombreCompleto}`}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                            >
                              <FiTrash2 className="w-3.5 h-3.5" aria-hidden="true" />
                              <span>Eliminar</span>
                            </button>
                          </td>
                        )}
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {loadingMore && (
            <div role="status" aria-live="polite" className="flex justify-center items-center py-4 bg-gray-50/70 border-t border-gray-100">
              <div className="animate-spin rounded-full h-5 w-5 border-2 border-primary border-t-transparent" aria-hidden="true"></div>
              <span className="ml-2.5 text-xs font-medium text-gray-700">Cargando siguientes usuarios...</span>
            </div>
          )}

          {!hasMore && usuarios.length > 0 && (
            <div role="status" aria-live="polite" className="text-center py-3 text-xs text-gray-600 font-medium bg-gray-50/40 border-t border-gray-100">
              Directorio sincronizado ({usuarios.length} usuarios activos en total)
            </div>
          )}
        </div>
      </div>

      {/* Modal Crear Nuevo Usuario */}
      {modalCrearAbierto && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="titulo-modal-nuevo-usuario"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-xs"
          onClick={(e) => {
            if (e.target === e.currentTarget && !creando) setModalCrearAbierto(false);
          }}
        >
          <div
            ref={modalCrearRef}
            tabIndex={-1}
            className="bg-white rounded-2xl shadow-xl border border-gray-200 w-full max-w-md overflow-hidden focus:outline-none"
          >
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/70">
              <div className="flex items-center gap-2">
                <FiShield className="w-5 h-5 text-primary" aria-hidden="true" />
                <h2 id="titulo-modal-nuevo-usuario" className="text-base font-bold text-gray-900">
                  Registrar Nuevo Usuario
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setModalCrearAbierto(false)}
                disabled={creando}
                aria-label="Cerrar modal de nuevo usuario"
                className="p-1.5 rounded-lg text-gray-500 hover:text-gray-800 hover:bg-gray-100 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                <FiX className="w-4 h-4" aria-hidden="true" />
              </button>
            </div>

            <form onSubmit={handleCrearUsuario} className="p-5 space-y-3.5 text-sm">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label htmlFor="nuevo-usr-nombre" className="block text-xs font-bold text-gray-700 mb-1">
                    Nombre *
                  </label>
                  <input
                    id="nuevo-usr-nombre"
                    type="text"
                    required
                    value={nuevoUsuario.nombre}
                    onChange={(e) => setNuevoUsuario((p) => ({ ...p, nombre: e.target.value }))}
                    placeholder="Ej. Camila"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:border-primary focus-visible:ring-2 focus-visible:ring-primary"
                  />
                </div>
                <div>
                  <label htmlFor="nuevo-usr-apellido" className="block text-xs font-bold text-gray-700 mb-1">
                    Apellido *
                  </label>
                  <input
                    id="nuevo-usr-apellido"
                    type="text"
                    required
                    value={nuevoUsuario.apellido}
                    onChange={(e) => setNuevoUsuario((p) => ({ ...p, apellido: e.target.value }))}
                    placeholder="Ej. Muñoz"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:border-primary focus-visible:ring-2 focus-visible:ring-primary"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label htmlFor="nuevo-usr-rut" className="block text-xs font-bold text-gray-700 mb-1">
                    RUT / Identificador *
                  </label>
                  <input
                    id="nuevo-usr-rut"
                    type="text"
                    required
                    value={nuevoUsuario.rut_o_id}
                    onChange={(e) => setNuevoUsuario((p) => ({ ...p, rut_o_id: e.target.value }))}
                    placeholder="Ej. 19876543-2"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono outline-none focus:border-primary focus-visible:ring-2 focus-visible:ring-primary"
                  />
                </div>
                <div>
                  <label htmlFor="nuevo-usr-rol" className="block text-xs font-bold text-gray-700 mb-1">
                    Rol Institucional *
                  </label>
                  <select
                    id="nuevo-usr-rol"
                    value={nuevoUsuario.rol}
                    onChange={(e) => setNuevoUsuario((p) => ({ ...p, rol: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white font-semibold outline-none focus:border-primary focus-visible:ring-2 focus-visible:ring-primary"
                  >
                    {ROLES_SISTEMA.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label htmlFor="nuevo-usr-email" className="block text-xs font-bold text-gray-700 mb-1">
                  Correo Institucional *
                </label>
                <input
                  id="nuevo-usr-email"
                  type="email"
                  required
                  value={nuevoUsuario.email}
                  onChange={(e) => setNuevoUsuario((p) => ({ ...p, email: e.target.value }))}
                  placeholder="usuario@uct.cl"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:border-primary focus-visible:ring-2 focus-visible:ring-primary"
                />
              </div>

              <div>
                <label htmlFor="nuevo-usr-pass" className="block text-xs font-bold text-gray-700 mb-1">
                  Contraseña Inicial (mín. 6 caracteres) *
                </label>
                <input
                  id="nuevo-usr-pass"
                  type="password"
                  required
                  minLength={6}
                  autoComplete="new-password"
                  value={nuevoUsuario.password}
                  onChange={(e) => setNuevoUsuario((p) => ({ ...p, password: e.target.value }))}
                  placeholder="••••••••"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:border-primary focus-visible:ring-2 focus-visible:ring-primary"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  disabled={creando}
                  onClick={() => setModalCrearAbierto(false)}
                  className="px-4 py-2 rounded-lg border border-gray-300 text-xs font-semibold text-gray-700 hover:bg-gray-50 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={creando}
                  className="px-4 py-2 rounded-lg bg-primary hover:bg-primary-hover text-white text-xs font-bold shadow-sm disabled:opacity-60 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1"
                >
                  {creando ? 'Registrando...' : 'Crear Usuario'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Confirmar Baja Lógica de Usuario */}
      {usuarioAEliminar && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="titulo-modal-eliminar-usuario"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-xs"
          onClick={(e) => {
            if (e.target === e.currentTarget && !eliminando) setUsuarioAEliminar(null);
          }}
        >
          <div
            ref={modalEliminarRef}
            tabIndex={-1}
            className="bg-white rounded-2xl shadow-xl border border-red-200 w-full max-w-md p-6 space-y-4 focus:outline-none"
          >
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-red-100 text-red-700 flex items-center justify-center flex-shrink-0">
                <FiAlertTriangle className="w-5 h-5" aria-hidden="true" />
              </div>
              <div className="space-y-1">
                <h2 id="titulo-modal-eliminar-usuario" className="text-base font-bold text-gray-900">
                  ¿Dar de baja a este usuario?
                </h2>
                <p className="text-xs text-gray-600 leading-relaxed">
                  Se desactivará la cuenta de{' '}
                  <strong>
                    {`${usuarioAEliminar.nombre || ''} ${usuarioAEliminar.apellido || ''}`.trim() ||
                      usuarioAEliminar.correo}
                  </strong>
                  , revocando su acceso al sistema pero conservando el historial de sus registros.
                </p>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                disabled={eliminando}
                onClick={() => setUsuarioAEliminar(null)}
                className="px-4 py-2 rounded-lg border border-gray-300 text-xs font-semibold text-gray-700 hover:bg-gray-50 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={eliminando}
                onClick={() => void confirmarEliminacionUsuario()}
                className="px-4 py-2 rounded-lg bg-red-700 hover:bg-red-800 text-white text-xs font-bold shadow-sm disabled:opacity-60 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-600 focus-visible:ring-offset-1"
              >
                {eliminando ? 'Eliminando...' : 'Confirmar Baja'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Usuarios;
