import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const getAuthHeader = () => {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export const api = {
  // Dashboard
  getDashboardStats: () => axios.get(`${API}/dashboard/stats`, { headers: getAuthHeader() }),

  // Users
  getUsers: () => axios.get(`${API}/users`, { headers: getAuthHeader() }),
  createUser: (data) => axios.post(`${API}/users`, data, { headers: getAuthHeader() }),
  updateUser: (id, data) => axios.put(`${API}/users/${id}`, data, { headers: getAuthHeader() }),
  deleteUser: (id) => axios.delete(`${API}/users/${id}`, { headers: getAuthHeader() }),

  // Categories
  getCategories: () => axios.get(`${API}/categories`, { headers: getAuthHeader() }),
  createCategory: (data) => axios.post(`${API}/categories`, data, { headers: getAuthHeader() }),

  // Goods
  getGoods: () => axios.get(`${API}/goods`, { headers: getAuthHeader() }),
  createGood: (data) => axios.post(`${API}/goods`, data, { headers: getAuthHeader() }),
  updateGood: (id, data) => axios.put(`${API}/goods/${id}`, data, { headers: getAuthHeader() }),
  deleteGood: (id) => axios.delete(`${API}/goods/${id}`, { headers: getAuthHeader() }),

  // Assignments
  getAssignments: () => axios.get(`${API}/assignments`, { headers: getAuthHeader() }),
  createAssignment: (data) => axios.post(`${API}/assignments`, data, { headers: getAuthHeader() }),

  // Actas
  getActas: () => axios.get(`${API}/actas`, { headers: getAuthHeader() }),
  downloadActa: (id) => `${API}/actas/${id}/download`,

  // Reports
  getReports: (params) => axios.get(`${API}/reports`, { params, headers: getAuthHeader() }),

  // Audit
  getAuditLogs: () => axios.get(`${API}/audit`, { headers: getAuthHeader() }),
};

export default api;