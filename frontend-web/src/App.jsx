import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ToastProvider } from './context/ToastContext';
import { NetworkStatusProvider } from './context/NetworkStatusContext';
import ConnectivityBadge from './components/ConnectivityBadge';
import PWAInstallPrompt from './components/PWAInstallPrompt';
import Toast from './components/Toast';
import PublicRoute from './components/PublicRoute';
import ProtectedRoute from './components/ProtectedRoute';
import AxiosInterceptor from './components/AxiosInterceptor';

// Componentes Estructurales y Vistas (Code Splitting con React.lazy)
import Layout from './components/Layout';
const Dashboard = lazy(() => import('./views/Dashboard'));
const Incidencias = lazy(() => import('./views/Incidencias'));
const ReporteIncidencia = lazy(() => import('./views/ReporteIncidencia'));
const Inventario = lazy(() => import('./views/Inventario'));
const Login = lazy(() => import('./views/Login'));
const AsignarTecnico = lazy(() => import('./views/AsignarTecnico'));
const DetalleOrden = lazy(() => import('./views/DetalleOrden'));
const DetalleIncidencia = lazy(() => import('./views/DetalleIncidencia'));
const Usuarios = lazy(() => import('./views/Usuarios'));
const Trazabilidad = lazy(() => import('./views/Trazabilidad'));
const PlanificarMantenimiento = lazy(() => import('./views/PlanificarMantenimiento'));
const Mantenimientos = lazy(() => import('./views/Mantenimientos'));
const NotFound = lazy(() => import('./views/NotFound'));
const ServerError = lazy(() => import('./views/ServerError'));

const RouteFallback = () => (
  <div className="flex items-center justify-center min-h-[40vh] text-sm text-gray-500">
    Cargando vista...
  </div>
);

function App() {
  return (
    <Router>
      <NetworkStatusProvider>
        <ToastProvider>
          <ConnectivityBadge />
          <AxiosInterceptor>
            <Suspense fallback={<RouteFallback />}>
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

                    {/* RUTAS PROTEGIDAS POR PERMISOS */}
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

                {/* Captura de rutas no definidas y página 404 */}
                <Route path="/404" element={<NotFound />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>

            {/* Componente global para notificaciones y PWA */}
            <Toast />
            <PWAInstallPrompt />
          </AxiosInterceptor>
        </ToastProvider>
      </NetworkStatusProvider>
    </Router>
  );
}

export default App;
