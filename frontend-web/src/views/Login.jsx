import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const Login = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = (e) => {
    e.preventDefault();
    // Aquí iría la lógica de autenticación real en el futuro
    navigate('/dashboard');
  };

  const isFormValid = email.trim() !== '' && password.trim() !== '';

  return (
    <div style={{ display: 'flex', height: '100vh', justifyContent: 'center', alignItems: 'center', backgroundColor: '#f3f4f6' }}>
      <div style={{ background: 'white', padding: '2rem', borderRadius: '8px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)', width: '100%', maxWidth: '400px' }}>
        <h2 style={{ marginBottom: '0.5rem', textAlign: 'center' }}>Iniciar Sesión</h2>
        <p style={{ marginBottom: '1.5rem', textAlign: 'center', color: '#6b7280' }}>Por favor, ingrese sus credenciales.</p>
        
        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: '500' }}>Correo Electrónico</label>
            <input 
              type="email" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="ejemplo@correo.com"
              style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '4px', boxSizing: 'border-box' }}
            />
          </div>
          
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: '500' }}>Contraseña</label>
            <input 
              type="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="********"
              style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '4px', boxSizing: 'border-box' }}
            />
          </div>

          <button 
            type="submit"
            disabled={!isFormValid}
            style={{ 
              marginTop: '1rem', 
              padding: '0.75rem', 
              background: isFormValid ? '#3b82f6' : '#9ca3af', 
              color: 'white', 
              border: 'none', 
              borderRadius: '4px', 
              cursor: isFormValid ? 'pointer' : 'not-allowed',
              fontWeight: 'bold',
              transition: 'background-color 0.2s'
            }}
          >
            Entrar
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;

