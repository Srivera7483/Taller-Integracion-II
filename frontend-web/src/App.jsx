import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ToastProvider } from './context/ToastContext';
import Toast from './components/Toast';

// Componentes Estructurales y Vistas
import Layout from './components/Layout';
import Dashboard from './views/Dashboard';
import Incidencias from './views/Incidencias';
import ReporteIncidencia from './views/ReporteIncidencia';
import Inventario from './views/Inventario';
import Login from './views/Login';

function App() {
  return (
    <Router>
      <ToastProvider>
        <Routes>
          {/* Ruta pública sin Layout */}
          <Route path="/login" element={<Login />} />

          {/* Rutas protegidas con Layout */}
          <Route path="/" element={<Layout />}>
            {/* Redirección por defecto */}
            <Route index element={<Navigate to="/dashboard" replace />} />
            
            {/* Rutas hijas que se renderizan en el <Outlet /> del Layout */}
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="incidencias" element={<Incidencias />} />
            <Route path="incidencias/nueva" element={<ReporteIncidencia />} />
            <Route path="incidencias/reportar" element={<ReporteIncidencia />} />
            <Route path="inventario" element={<Inventario />} />
          </Route>
        </Routes>
        
        {/* Componente global para notificaciones */}
        <Toast />
      </ToastProvider>
    </Router>
  );
}

export default App;
