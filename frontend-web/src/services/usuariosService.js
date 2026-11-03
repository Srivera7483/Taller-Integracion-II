import api from './api';

export const fetchUsuarios = async (params = {}) => {
  const response = await api.get('/usuarios', { params });
  return response.data.datos || response.data.data || response.data || [];
};
