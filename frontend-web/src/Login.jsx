import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  IoServer,
  IoMailOutline,
  IoLockClosedOutline,
  IoEyeOutline,
  IoEyeOffOutline,
  IoArrowForwardOutline,
  IoPersonOutline,
  IoCardOutline,
  IoAlertCircleOutline,
} from 'react-icons/io5';
import { useToast } from './context/ToastContext';
import api from './services/api';

const Login = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();

  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const sesionExpirada = searchParams.get('expirado') === 'true';

  const [mode, setMode] = useState('login'); // 'login' | 'register'
  const [rutOId, setRutOId] = useState('');
  const [nombre, setNombre] = useState('');
  const [apellido, setApellido] = useState('');
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
  const isUctEmail = (em) => /@uct\.cl$/i.test(em.trim());

  const isFormValid =
    mode === 'login'
      ? email.trim() !== '' && password.trim() !== ''
      : rutOId.trim() !== '' &&
        nombre.trim() !== '' &&
        apellido.trim() !== '' &&
        isUctEmail(email) &&
        isPasswordValid;

  const handleToggleMode = () => {
    setMode((prevMode) => (prevMode === 'login' ? 'register' : 'login'));
    setRutOId('');
    setNombre('');
    setApellido('');
    setEmail('');
    setPassword('');
    setShowPassword(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isFormValid || isSubmitting) return;

    const payload =
      mode === 'login'
        ? { email: email.trim().toLowerCase(), password }
        : {
            rut_o_id: rutOId.trim(),
            nombre: nombre.trim(),
            apellido: apellido.trim(),
            email: email.trim().toLowerCase(),
            password,
          };

    setIsSubmitting(true);

    try {
      // Rutas en español según contrato OpenAPI (/autenticacion/inicio-sesion y /autenticacion/registro)
      const openApiEndpoint = mode === 'login' ? '/autenticacion/inicio-sesion' : '/autenticacion/registro';
      let response;
      try {
        response = await api.post(openApiEndpoint, payload);
      } catch (err) {
        if (err.response?.status === 404) {
          const fallbackEndpoint = mode === 'login' ? '/auth/login' : '/auth/register';
          response = await api.post(fallbackEndpoint, payload);
        } else {
          throw err;
        }
      }

      if (mode === 'login') {
        if (response.status === 200 || response.status === 201) {
          const data = response.data;
          const token = data.token || data.accessToken || data.access_token;
          if (token) {
            localStorage.setItem('token', token);
          }
          if (data.refreshToken || data.refresh_token) {
            localStorage.setItem('refreshToken', data.refreshToken || data.refresh_token);
          }
          if (data.usuario) {
            localStorage.setItem('usuario', JSON.stringify(data.usuario));
            window.dispatchEvent(new Event('tecnico-cambiado'));
          }
          showToast('Inicio de sesión exitoso', 'success');
          navigate('/dashboard');
        }
      } else {
        if (response.status === 200 || response.status === 201) {
          showToast('Registro exitoso', 'success');
          setMode('login');
          setPassword('');
          setShowPassword(false);
        }
      }
    } catch {
      // El Toast ya es disparado automáticamente por el AxiosInterceptor en caso de 4xx/5xx
      // Solo mostramos toast genérico en caso de que no haya respuesta (ya manejado por interceptor también)
    } finally {
      setIsSubmitting(false);
    }
  };

  // Color del texto de requisitos de contraseña según estado de validación
  const getPasswordReqColor = () => {
    if (password.length === 0) return 'text-gray-600';
    return isPasswordValid ? 'text-emerald-700' : 'text-red-600';
  };

  return (
    <div className="bg-gray-50 text-gray-800 font-sans h-screen flex overflow-hidden">
      <main className="flex-1 flex items-center justify-center p-4 relative w-full h-full">
        {/* Fondo decorativo inclinado */}
        <div className="absolute top-0 left-0 w-full h-64 bg-primary/5 -skew-y-3 transform origin-top-left -z-10" />

        {/* Tarjeta de autenticación */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-200/90 p-8 w-full max-w-sm fade-in-up transition-all relative z-10">

          {/* Encabezado con ícono y marca institucional */}
          <div className="flex flex-col items-center justify-center gap-1.5 mb-6 text-center">
            <div className="w-12 h-12 rounded-xl bg-primary text-white flex items-center justify-center text-2xl mb-1 shadow-md shadow-primary/20">
              <IoServer />
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-xl font-extrabold text-gray-900 tracking-tight">Infra<span className="text-primary font-black">Manager</span></span>
              <span className="text-[10px] font-bold uppercase tracking-wider bg-primary-50 text-primary px-1.5 py-0.5 rounded-lg border border-primary-200">UCT</span>
            </div>
            <p className="text-xs text-gray-500 font-medium">Universidad Católica de Temuco</p>
            <p id="view-title" className="text-sm font-semibold text-gray-700 mt-2">
              {mode === 'login' ? 'Iniciar sesión en tu cuenta' : 'Crear una cuenta nueva'}
            </p>
          </div>

          {/* Notificación de sesión expirada por inactividad (TAL-131) */}
          {sesionExpirada && mode === 'login' && (
            <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-xs flex items-center gap-2 animate-fadeIn">
              <IoAlertCircleOutline className="w-5 h-5 text-amber-600 flex-shrink-0" />
              <span>Tu sesión ha expirado por inactividad. Por favor, ingresa tus credenciales nuevamente.</span>
            </div>
          )}

          {/* Formulario */}
          <form id="auth-form" onSubmit={handleSubmit} className="space-y-4">
            {/* Campos exclusivos de registro */}
            {mode === 'register' && (
              <>
                <div>
                  <label htmlFor="rut_o_id" className="block text-sm font-medium text-gray-700 mb-1">
                    RUT / Identificación <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <IoCardOutline className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-lg pointer-events-none" />
                    <input
                      type="text"
                      id="rut_o_id"
                      value={rutOId}
                      onChange={(e) => setRutOId(e.target.value)}
                      placeholder="12.345.678-9"
                      required
                      className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="nombre" className="block text-sm font-medium text-gray-700 mb-1">
                      Nombre <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <IoPersonOutline className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-lg pointer-events-none" />
                      <input
                        type="text"
                        id="nombre"
                        value={nombre}
                        onChange={(e) => setNombre(e.target.value)}
                        placeholder="Juan"
                        required
                        className="w-full pl-10 pr-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                      />
                    </div>
                  </div>
                  <div>
                    <label htmlFor="apellido" className="block text-sm font-medium text-gray-700 mb-1">
                      Apellido <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      id="apellido"
                      value={apellido}
                      onChange={(e) => setApellido(e.target.value)}
                      placeholder="Pérez"
                      required
                      className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                    />
                  </div>
                </div>
              </>
            )}

            {/* Input Correo Electrónico */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                Correo Electrónico {mode === 'register' && <span className="text-red-500">*</span>}
              </label>
              <div className="relative">
                <IoMailOutline className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-lg pointer-events-none" />
                <input
                  type="email"
                  id="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={mode === 'register' ? 'usuario@uct.cl' : 'usuario@empresa.com'}
                  required
                  className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                />
              </div>
              {mode === 'register' && email.length > 0 && !isUctEmail(email) && (
                <p className="text-xs text-red-500 mt-1">
                  Solo se permiten correos institucionales terminados en @uct.cl
                </p>
              )}
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

            {/* Botón de Envío (CTA Principal) */}
            <button
              type="submit"
              id="submit-btn"
              disabled={!isFormValid || isSubmitting}
              className={`w-full mt-3 bg-primary hover:bg-primary-hover text-white px-5 py-3 rounded-lg text-sm font-semibold transition-all shadow-md flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer ${isFormValid && !isSubmitting ? 'hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0' : ''
                }`}
            >
              <span id="btn-text">
                {isSubmitting
                  ? 'Procesando...'
                  : mode === 'login'
                    ? 'Ingresar al Sistema'
                    : 'Registrarse'}
              </span>
              <IoArrowForwardOutline className="text-base" />
            </button>
          </form>

          {/* Separador */}
          <div className="my-6 flex items-center gap-3">
            <div className="h-px flex-1 bg-gray-100" />
            <span className="text-xs text-gray-500 font-medium uppercase tracking-wider">O</span>
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
