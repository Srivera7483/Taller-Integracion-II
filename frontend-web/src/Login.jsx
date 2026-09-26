import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  IoServer,
  IoMailOutline,
  IoLockClosedOutline,
  IoEyeOutline,
  IoEyeOffOutline,
  IoArrowForwardOutline
} from 'react-icons/io5';
import { useToast } from './context/ToastContext';

const Login = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [mode, setMode] = useState('login'); // 'login' | 'register'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Validación de seguridad de contraseña de login.html:
  // al menos: 8 caracteres totales, mínimo 1 número y mínimo 1 símbolo especial
  const isStrongPassword = (pwd) => {
    const hasMinLength = pwd.length >= 8;
    const hasNumber = /\d/.test(pwd);
    const hasSpecialChar = /[^a-zA-Z0-9]/.test(pwd);
    return hasMinLength && hasNumber && hasSpecialChar;
  };

  const isPasswordValid = isStrongPassword(password);

  const isFormValid =
    mode === 'login'
      ? email.trim() !== '' && password.trim() !== ''
      : email.trim() !== '' && isPasswordValid;

  const handleToggleMode = () => {
    setMode((prevMode) => (prevMode === 'login' ? 'register' : 'login'));
    setEmail('');
    setPassword('');
    setShowPassword(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isFormValid || isSubmitting) return;

    const payload = {
      email,
      password,
    };

    setIsSubmitting(true);

    try {
      const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
      const endpoint = mode === 'login' ? `${baseUrl}/auth/login` : `${baseUrl}/auth/register`;
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (mode === 'login') {
        if (response.status === 200) {
          const data = await response.json();
          const token = data.token || data.accessToken || data.access_token;
          if (token) {
            localStorage.setItem('token', token);
          }
          showToast('Inicio de sesión exitoso', 'success');
          navigate('/dashboard');
        } else if (response.status === 401) {
          showToast('Credenciales inválidas', 'error');
        } else {
          showToast('Error al iniciar sesión', 'error');
        }
      } else {
        if (response.ok) {
          showToast('Registro exitoso', 'success');
          setMode('login');
          setPassword('');
          setShowPassword(false);
        } else {
          showToast('Error al registrarse', 'error');
        }
      }
    } catch (error) {
      console.error('Error de red:', error);
      showToast('Error de conexión con el servidor', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Color del texto de requisitos de contraseña según estado de validación
  const getPasswordReqColor = () => {
    if (password.length === 0) return 'text-gray-500';
    return isPasswordValid ? 'text-emerald-600' : 'text-red-500';
  };

  return (
    <div className="bg-gray-50 text-gray-800 font-sans h-screen flex overflow-hidden">
      <main className="flex-1 flex items-center justify-center p-4 relative w-full h-full">
        {/* Fondo decorativo inclinado */}
        <div className="absolute top-0 left-0 w-full h-64 bg-primary/5 -skew-y-3 transform origin-top-left -z-10" />

        {/* Tarjeta de autenticación */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100/80 p-8 w-full max-w-sm fade-in-up transition-all relative z-10">

          {/* Encabezado con ícono de servidor */}
          <div className="flex flex-col items-center justify-center gap-2 mb-8">
            <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center text-2xl mb-2">
              <IoServer />
            </div>
            <h1 className="text-xl font-bold text-gray-900 tracking-tight">InfraManager</h1>
            <p id="view-title" className="text-sm font-medium text-gray-500 mt-1">
              {mode === 'login' ? 'Iniciar sesión en tu cuenta' : 'Crear una cuenta nueva'}
            </p>
          </div>

          {/* Formulario */}
          <form id="auth-form" onSubmit={handleSubmit} className="space-y-5">
            {/* Input Correo Electrónico */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1.5">
                Correo Electrónico
              </label>
              <div className="relative">
                <IoMailOutline className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-lg pointer-events-none" />
                <input
                  type="email"
                  id="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="usuario@empresa.com"
                  required
                  className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                />
              </div>
            </div>

            {/* Input Contraseña con Botón de Ojo y Texto de Requisitos */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1.5">
                Contraseña
              </label>
              <div className="relative">
                <IoLockClosedOutline className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-lg pointer-events-none" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full pl-10 pr-10 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                />

                {/* Botón interactivo para visualizar/ocultar contraseña */}
                <button
                  type="button"
                  id="toggle-password-btn"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors focus:outline-none flex items-center justify-center p-1 cursor-pointer"
                  title={showPassword ? 'Ocultar contraseña' : 'Ver contraseña'}
                  aria-label={showPassword ? 'Ocultar contraseña' : 'Ver contraseña'}
                >
                  {showPassword ? (
                    <IoEyeOffOutline id="toggle-password-icon" className="text-xl" />
                  ) : (
                    <IoEyeOutline id="toggle-password-icon" className="text-xl" />
                  )}
                </button>
              </div>

              {/* Texto de Requisitos de Contraseña (visible solo en registro) */}
              {mode === 'register' && (
                <p
                  id="password-req-text"
                  className={`text-xs mt-2 transition-colors ${getPasswordReqColor()}`}
                >
                  La contraseña debe poseer al menos: 8 caracteres totales, minimo 1 caracter numerico y minimo 1 símbolo especial.
                </p>
              )}
            </div>

            {/* Botón de Envío */}
            <button
              type="submit"
              id="submit-btn"
              disabled={!isFormValid || isSubmitting}
              className={`w-full mt-2 bg-primary hover:bg-primary-hover text-white px-5 py-2.5 rounded-lg text-sm font-medium transition-all shadow-sm flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer ${isFormValid && !isSubmitting ? 'hover:shadow-md hover:-translate-y-0.5' : ''
                }`}
            >
              <span id="btn-text">
                {isSubmitting
                  ? 'Procesando...'
                  : mode === 'login'
                    ? 'Ingresar'
                    : 'Registrarse'}
              </span>
              <IoArrowForwardOutline />
            </button>
          </form>

          {/* Separador */}
          <div className="my-6 flex items-center gap-3">
            <div className="h-px flex-1 bg-gray-100" />
            <span className="text-xs text-gray-400 font-medium uppercase tracking-wider">O</span>
            <div className="h-px flex-1 bg-gray-100" />
          </div>

          {/* Alternar entre Iniciar Sesión y Registro */}
          <div className="text-center text-sm text-gray-600">
            <span id="toggle-desc">
              {mode === 'login' ? '¿No tienes cuenta?' : '¿Ya tienes cuenta?'}
            </span>
            <button
              type="button"
              id="toggle-view-btn"
              onClick={handleToggleMode}
              className="text-primary hover:text-primary-hover font-medium transition-colors ml-1 outline-none cursor-pointer"
            >
              {mode === 'login' ? 'Crear cuenta' : 'Iniciar sesión'}
            </button>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Login;
