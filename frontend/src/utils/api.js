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

  // Instructors Management
  getInstructorsManagement: () => axios.get(`${API}/instructors-management`, { headers: getAuthHeader() }),
  createInstructor: (data) => axios.post(`${API}/instructors-management`, data, { headers: getAuthHeader() }),
  updateInstructor: (id, data) => axios.put(`${API}/instructors-management/${id}`, data, { headers: getAuthHeader() }),
  deleteInstructor: (id) => axios.delete(`${API}/instructors-management/${id}`, { headers: getAuthHeader() }),

  // Sports Management
  getSportsManagement: () => axios.get(`${API}/sports-management`, { headers: getAuthHeader() }),
  createSport: (data) => axios.post(`${API}/sports-management`, data, { headers: getAuthHeader() }),
  updateSport: (id, data) => axios.put(`${API}/sports-management/${id}`, data, { headers: getAuthHeader() }),
  deleteSport: (id) => axios.delete(`${API}/sports-management/${id}`, { headers: getAuthHeader() }),

  // Warehouses
  getWarehouses: () => axios.get(`${API}/warehouses`, { headers: getAuthHeader() }),
  createWarehouse: (data) => axios.post(`${API}/warehouses`, data, { headers: getAuthHeader() }),
  updateWarehouse: (id, data) => axios.put(`${API}/warehouses/${id}`, data, { headers: getAuthHeader() }),
  deleteWarehouse: (id) => axios.delete(`${API}/warehouses/${id}`, { headers: getAuthHeader() }),

  // Categories
  getCategories: () => axios.get(`${API}/categories`, { headers: getAuthHeader() }),
  createCategory: (data) => axios.post(`${API}/categories`, data, { headers: getAuthHeader() }),
  deleteCategory: (id) => axios.delete(`${API}/categories/${id}`, { headers: getAuthHeader() }),

  // Goods
  getGoods: () => axios.get(`${API}/goods`, { headers: getAuthHeader() }),
  createGood: (data) => axios.post(`${API}/goods`, data, { headers: getAuthHeader() }),
  updateGood: (id, data) => axios.put(`${API}/goods/${id}`, data, { headers: getAuthHeader() }),
  deleteGood: (id) => axios.delete(`${API}/goods/${id}`, { headers: getAuthHeader() }),

  // Instructors and Disciplines
  getInstructors: () => axios.get(`${API}/instructors`, { headers: getAuthHeader() }),
  getDisciplines: () => axios.get(`${API}/disciplines`, { headers: getAuthHeader() }),

  // Assignments
  getAssignments: () => axios.get(`${API}/assignments`, { headers: getAuthHeader() }),
  createAssignment: (data) => axios.post(`${API}/assignments`, data, { headers: getAuthHeader() }),

  // Actas
  getActas: () => axios.get(`${API}/actas`, { headers: getAuthHeader() }),
  downloadActa: (id) => axios.get(`${API}/actas/${id}/download`, { 
    headers: getAuthHeader(),
    responseType: 'blob'
  }),

  // Reports
  getReports: (params) => axios.get(`${API}/reports`, { params, headers: getAuthHeader() }),

  // Audit
  getAuditLogs: () => axios.get(`${API}/audit`, { headers: getAuthHeader() }),

  // Instructor Portal
  getInstructorAssignments: () => axios.get(`${API}/instructor/my-assignments`, { headers: getAuthHeader() }),
  getInstructorHistory: () => axios.get(`${API}/instructor/my-history`, { headers: getAuthHeader() }),
  getInstructorActas: () => axios.get(`${API}/instructor/my-actas`, { headers: getAuthHeader() }),
  confirmReception: (assignmentId) => axios.post(`${API}/instructor/confirm-reception/${assignmentId}`, {}, { headers: getAuthHeader() }),
};

export default api;