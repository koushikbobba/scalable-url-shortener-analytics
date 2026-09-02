import api from './client';

export const analyticsApi = {
  getOverview: async (range = '7d') => {
    const res = await api.get('/analytics/overview/', { params: { range } });
    return res.data;
  },
  getLinkAnalytics: async (linkId, range = '7d', startDate, endDate) => {
    const params = { range };
    if (startDate && endDate) {
      params.start_date = startDate;
      params.end_date = endDate;
    }
    const res = await api.get(`/analytics/${linkId}/`, { params });
    return res.data;
  },
};
