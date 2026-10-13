import api from './api';

export const fetchUsuarios = async (params = {}) => {
  try {
    const response = await api.get('/usuarios', { params });
    return response.data.datos || response.data.data || response.data || [];
  } catch (error) {
    console.error('Error al obtener usuarios:', error);
    throw error;
  }
};
