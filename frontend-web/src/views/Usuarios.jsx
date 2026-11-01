import React, { useCallback } from 'react';
import StatusBadge from '../components/StatusBadge';
import { useToast } from '../context/ToastContext';
import { fetchUsuarios } from '../services/usuariosService';
import { useInfiniteScroll } from '../hooks/useInfiniteScroll';

const Usuarios = () => {
  const { showToast } = useToast();

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
      return 'bg-secondary-50 text-secondary-800 border-secondary-200';
    }
    if (rolNormalizado.includes('téc') || rolNormalizado.includes('tec')) {
      return 'bg-primary-50 text-primary border-primary-200';
    }
    return 'bg-gray-100 text-gray-800 border-gray-200';
  };

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-primary tracking-tight">
            Gestión de Usuarios
          </h1>
          <p className="mt-1 text-sm text-gray-600">
            Catálogo del personal y credenciales sincronizadas con la base de datos de autenticación.
          </p>
        </div>
        <div className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-primary-50 text-primary border border-primary-200">
          {usuarios.length} usuarios cargados
        </div>
      </div>

      <div className="w-full bg-white/90 backdrop-blur-md shadow-lg shadow-primary/5 rounded-xl border border-gray-100 overflow-hidden">
        <div className="p-6 border-b border-gray-100 bg-white/60 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h2 className="text-xl font-bold text-gray-800 tracking-tight">Directorio de Usuarios</h2>
            <p className="text-sm text-gray-500 mt-0.5">
              Listado con desplazamiento infinito de usuarios activos y roles del sistema.
            </p>
          </div>
        </div>

        <div
          ref={containerRef}
          onScroll={handleContainerScroll}
          className="overflow-x-auto overflow-y-auto max-h-[580px]"
        >
          <table className="min-w-full divide-y divide-gray-200 text-left text-sm text-gray-600">
            <thead className="bg-gray-50/90 backdrop-blur-sm sticky top-0 z-10 shadow-xs">
              <tr>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">
                  Usuario
                </th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">
                  RUT / ID
                </th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">
                  Rol
                </th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">
                  Estado
                </th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">
                  Fecha Registro
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {loading && usuarios.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-sm text-gray-500">
                    <div className="flex justify-center items-center gap-2">
                      <div className="animate-spin rounded-full h-5 w-5 border-2 border-primary border-t-transparent"></div>
                      <span>Cargando primeros 15 usuarios...</span>
                    </div>
                  </td>
                </tr>
              ) : usuarios.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-sm text-gray-500">
                    No se encontraron usuarios registrados en la base de datos.
                  </td>
                </tr>
              ) : (
                usuarios.map((usr, index) => {
                  const isSentinel = index === sentinelIndex;
                  const nombreCompleto = `${usr.nombre || ''} ${usr.apellido || ''}`.trim() || 'Usuario';
                  const inicial = (usr.nombre || 'U').charAt(0).toUpperCase();
                  const fechaTexto = usr.fecha_creacion
                    ? new Date(usr.fecha_creacion).toLocaleDateString()
                    : 'N/A';

                  return (
                    <tr
                      key={usr.id_usuario || usr.rut_o_id || index}
                      ref={isSentinel ? sentinelRef : null}
                      className="hover:bg-primary-50/40 transition-colors duration-150"
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="h-9 w-9 flex-shrink-0">
                            <div className="h-9 w-9 rounded-full bg-primary flex items-center justify-center text-white font-bold text-xs shadow-xs">
                              {inicial}
                            </div>
                          </div>
                          <div className="ml-3.5">
                            <div className="text-sm font-semibold text-gray-900">{nombreCompleto}</div>
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
                        <span className={`px-2.5 py-0.5 inline-flex text-xs font-semibold rounded-full border ${getRoleBadgeClass(usr.rol)}`}>
                          {usr.rol || 'Usuario'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <StatusBadge status={usr.estado === 'inactivo' ? 'inactivo' : 'activo'} />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-xs text-gray-500">
                        {fechaTexto}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>

          {loadingMore && (
            <div className="flex justify-center items-center py-4 bg-gray-50/70 border-t border-gray-100">
              <div className="animate-spin rounded-full h-5 w-5 border-2 border-primary border-t-transparent"></div>
              <span className="ml-2.5 text-xs font-medium text-gray-600">Cargando siguientes usuarios...</span>
            </div>
          )}

          {!hasMore && usuarios.length > 0 && (
            <div className="text-center py-3 text-xs text-gray-400 font-medium bg-gray-50/40 border-t border-gray-100">
              Se han cargado todos los usuarios registrados ({usuarios.length})
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Usuarios;
