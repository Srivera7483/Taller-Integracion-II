import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ToastProvider } from './context/ToastContext';
import Toast from './components/Toast';
import PublicRoute from './components/PublicRoute';
import AxiosInterceptor from './components/AxiosInterceptor';

// Componentes Estructurales y Vistas
import Layout from './components/Layout';
import PublicRoute from './components/PublicRoute';
import Dashboard from './views/Dashboard';
import Incidencias from './views/Incidencias';
import ReporteIncidencia from './views/ReporteIncidencia';
import Inventario from './views/Inventario';
import Login from './views/Login';
import AsignarTecnico from './views/AsignarTecnico';
import DetalleOrden from './views/DetalleOrden';
import DetalleIncidencia from './views/DetalleIncidencia';
import Usuarios from './views/Usuarios';


function App() {
  return (
    <Router>
      <ToastProvider>
        <AxiosInterceptor>
          <Routes>
          {/* Ruta pública sin Layout */}
          <Route element={<PublicRoute />}>
            <Route path="/login" element={<Login />} />
          </Route>

          {/* Rutas protegidas con Layout */}
          <Route path="/" element={<Layout />}>
            {/* Redirección por defecto */}
            <Route index element={<Navigate to="/dashboard" replace />} />
            
            {/* Rutas hijas que se renderizan en el <Outlet /> del Layout */}
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="incidencias" element={<Incidencias />} />
            <Route path="incidencias/nueva" element={<ReporteIncidencia />} />
            <Route path="incidencias/reportar" element={<ReporteIncidencia />} />
            <Route path="incidencias/asignar" element={<AsignarTecnico />} />
            <Route path="incidencias/:idIncidencia" element={<DetalleIncidencia />} />
            <Route path="ordenes/:idOrden" element={<DetalleOrden />} />
            <Route path="inventario" element={<Inventario />} />
            <Route path="usuarios" element={<Usuarios />} />
          </Route>
          </Routes>
          
          {/* Componente global para notificaciones */}
          <Toast />
        </AxiosInterceptor>
      </ToastProvider>
    </Router>
  );
}

export default App;
