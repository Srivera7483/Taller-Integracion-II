import api from './api';

export const fetchUsuarios = async (params = {}) => {
  const response = await api.get('/usuarios', { params });
  return response.data.datos || response.data.data || response.data || [];
};

export const cambiarRolUsuario = async (idUsuario, nuevoRol) => {
  const response = await api.patch(`/usuarios/${encodeURIComponent(idUsuario)}/rol`, {
    rol: nuevoRol,
  });
  return response.data;
};

export const eliminarUsuario = async (idUsuario) => {
  const response = await api.delete(`/usuarios/${encodeURIComponent(idUsuario)}`);
  return response.data;
};

export const crearUsuarioAdmin = async ({
  rut_o_id,
  nombre,
  apellido,
  email,
  password,
  rol = 'REPORTANTE',
}) => {
  const regResp = await api.post('/auth/register', {
    rut_o_id: rut_o_id.trim(),
    nombre: nombre.trim(),
    apellido: apellido.trim(),
    email: email.trim().toLowerCase(),
    password,
  });
  const creado = regResp.data?.usuario || regResp.data;
  const idCreado = creado?.id_usuario || creado?.id;

  if (idCreado && rol && rol !== 'REPORTANTE') {
    await cambiarRolUsuario(idCreado, rol);
  }

  return {
    ...creado,
    id_usuario: idCreado,
    correo: creado?.correo || email.trim().toLowerCase(),
    rol: rol || 'REPORTANTE',
    estado: 'activo',
    fecha_creacion: new Date().toISOString(),
  };
};
