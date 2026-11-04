import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';

const ProtectedRoute = ({ children, allowedRoles }) => {
  const token = localStorage.getItem('token');
  
  // 1. Validar si está autenticado
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  
  // 2. Validar roles si se especificaron
  if (allowedRoles && allowedRoles.length > 0) {
    try {
      const usuarioStr = localStorage.getItem('usuario');
      const usuario = usuarioStr ? JSON.parse(usuarioStr) : {};
      const rolUsuario = usuario.rol?.nombre_rol || usuario.rol;

      if (!allowedRoles.includes(rolUsuario)) {
        // Si no tiene el rol permitido, lo redirigimos a una vista segura
        return <Navigate to="/incidencias" replace />;
      }
    } catch {
      return <Navigate to="/login" replace />;
    }
  }
  
  return children ? children : <Outlet />;
};

export default ProtectedRoute;