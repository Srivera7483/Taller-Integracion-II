import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ToastProvider } from './context/ToastContext';
import { NetworkStatusProvider } from './context/NetworkStatusContext';
import NetworkStatusBanner from './components/NetworkStatusBanner';
import Toast from './components/Toast';
import PublicRoute from './components/PublicRoute';
import ProtectedRoute from './components/ProtectedRoute'
import AxiosInterceptor from './components/AxiosInterceptor';

// Componentes Estructurales y Vistas
import Layout from './components/Layout';
import Dashboard from './views/Dashboard';
import Incidencias from './views/Incidencias';
import ReporteIncidencia from './views/ReporteIncidencia';
import Inventario from './views/Inventario';
import Login from './views/Login';
import AsignarTecnico from './views/AsignarTecnico';
import DetalleOrden from './views/DetalleOrden';
import DetalleIncidencia from './views/DetalleIncidencia';
import Usuarios from './views/Usuarios';
import Trazabilidad from './views/Trazabilidad';
import PlanificarMantenimiento from './views/PlanificarMantenimiento';
import Mantenimientos from './views/Mantenimientos';
import NotFound from './views/NotFound';
import ServerError from './views/ServerError';


function App() {
  return (
    <Router>
      <NetworkStatusProvider>
        <ToastProvider>
          <NetworkStatusBanner />
        <AxiosInterceptor>
          <Routes>
            {/* Rutas globales de error */}
            <Route path="/500" element={<ServerError />} />
            <Route path="/error" element={<ServerError />} />

            {/* Ruta pública sin Layout */}
            <Route element={<PublicRoute />}>
              <Route path="/login" element={<Login />} />
            </Route>

            {/* Rutas protegidas con Layout */}
            <Route element={<ProtectedRoute />}>
              <Route path="/" element={<Layout />}>
                {/* Redirección por defecto */}
                <Route index element={<Navigate to="/dashboard" replace />} />
                
                {/* Rutas hijas que se renderizan en el <Outlet /> del Layout */}
                <Route path="dashboard" element={<Dashboard />} />
                <Route path="incidencias" element={<Incidencias />} />
                <Route element={<ProtectedRoute requiredPermission="incidencias:crear" />}>
                  <Route path="incidencias/nueva" element={<ReporteIncidencia />} />
                  <Route path="incidencias/reportar" element={<ReporteIncidencia />} />
                </Route>
                <Route path="incidencias/:idIncidencia" element={<DetalleIncidencia />} />
                <Route path="ordenes/:idOrden" element={<DetalleOrden />} />
                <Route path="trazabilidad" element={<Trazabilidad />} />
                <Route path="trazabilidad/:idActivo" element={<Trazabilidad />} />
                <Route path="activos/:idActivo/trazabilidad" element={<Trazabilidad />} />

                {/* RUTA PROTEGIDAS POR ROLES */}
                <Route element={<ProtectedRoute requiredPermission="activos:gestionar" />}>
                  <Route path="inventario" element={<Inventario />} />
                </Route>
                <Route element={<ProtectedRoute requiredPermission="usuarios:gestionar" />}>
                  <Route path="usuarios" element={<Usuarios />} />
                </Route>
                <Route element={<ProtectedRoute requiredPermission="mantenimientos:crear" />}>
                  <Route path="mantenimientos" element={<Mantenimientos />} />
                </Route>
                <Route element={<ProtectedRoute requiredPermission="mantenimientos:crear" />}>
                  <Route path="mantenimientos/planificar" element={<PlanificarMantenimiento />} />
                  <Route path="mantenimientos/nuevo" element={<PlanificarMantenimiento />} />
                </Route>
                <Route element={<ProtectedRoute requiredPermission="ordenes:asignar" />}>
                  <Route path="incidencias/asignar" element={<AsignarTecnico />} />
                </Route>
              </Route>
            </Route>

            {/* TAL-169: Captura de rutas no definidas y página 404 */}
            <Route path="/404" element={<NotFound />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
          
          {/* Componente global para notificaciones */}
          <Toast />
        </AxiosInterceptor>
      </ToastProvider>
      </NetworkStatusProvider>
    </Router>
  );
}

export default App;
