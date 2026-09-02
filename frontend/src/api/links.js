import api from './client';

export const linksApi = {
  getLinks: async (params = {}) => {
    const res = await api.get('/links/', { params });
    return res.data;
  },
  getLink: async (id) => {
    const res = await api.get(`/links/${id}/`);
    return res.data;
  },
  createLink: async (data) => {
    const res = await api.post('/links/', data);
    return res.data;
  },
  updateLink: async (id, data) => {
    const res = await api.patch(`/links/${id}/`, data);
    return res.data;
  },
  deleteLink: async (id) => {
    const res = await api.delete(`/links/${id}/`);
    return res.data;
  },
};
