import axios from 'axios';

// Use API gateway if available, otherwise use relative path (for Vite proxy)
const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

const api = axios.create({
  baseURL: API_BASE_URL,
});

// Add token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 responses globally
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Clear auth state on any unauthorized response and redirect to login
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.dispatchEvent(new Event('authStateChanged'));
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  verifyFirebase: (data) => api.post('/auth/verify-firebase', data),
  getProfile: () => api.get('/auth/profile'),
  updateProfile: (data) => api.put('/auth/profile', data),
  setPassword: (data) => api.put('/auth/profile/password', data),
  getRoles: () => api.get('/auth/roles'),
  getMyRoleRequests: () => api.get('/auth/role-requests/me'),
  createRoleRequest: (requestedRole) => api.post('/auth/role-requests', { requestedRole }),
  cancelRoleRequest: (requestId) => api.delete(`/auth/role-requests/${requestId}`),
  getRoleRequests: (status) => api.get(`/auth/role-requests${status ? `?status=${encodeURIComponent(status)}` : ''}`),
  reviewRoleRequest: (requestId, action) => api.patch(`/auth/role-requests/${requestId}/review`, { action }),
  getUsers: () => api.get('/auth/users'),
  updateUserRole: (userId, role) => api.patch(`/auth/users/${encodeURIComponent(userId)}/role`, { role }),
};

export const equipmentAPI = {
  getAll: () => api.get('/equipment'),
  request: (data) => api.post('/equipment/request', data),
  requestEquipment: (data) => api.post('/equipment/request', data),
  cancel: (id) => api.delete(`/equipment/request/${id}`),
  cancelRequest: (id) => api.delete(`/equipment/request/${id}`),
  getHistory: (id) => api.get(`/equipment/history/${id}`),
  updateQuantity: (id, data) => api.put(`/equipment/${id}/quantity`, data),
};

export const manageAPI = {
  getAll: (search) => api.get(`/manage?search=${search || ''}`),
  getById: (id) => api.get(`/manage/${id}`),
  add: (data) => api.post('/manage', data),
  update: (id, data) => api.put(`/manage/${id}`, data),
  delete: (id) => api.delete(`/manage/${id}`),
  addStock: (id, quantity) => api.patch(`/manage/${id}/add-stock`, { quantity }),
  removeStock: (id, quantity) => api.patch(`/manage/${id}/remove-stock`, { quantity }),
  getSports: () => api.get('/manage/sports/list'),
  addSport: (name) => api.post('/manage/sports/add', { name }),
};

export const adminAPI = {
  getRequests: (regNumber) => api.get(`/admin/requests/${regNumber}`),
  getAllRequests: () => api.get('/admin/requests'),
  getAllEquipment: () => api.get('/admin/list'),
  acceptRequest: (id, data = {}) => api.post(`/admin/accept/${id}`, data),
  declineRequest: (id) => api.post(`/admin/decline/${id}`),
  returnEquipment: (id, data = {}) => api.post(`/admin/return/${id}`, data),
  getPendingReturns: (regNumber) => api.get(`/admin/pending-return/${regNumber}`),
  getHistory: (regNumber) => api.get(`/admin/history/${regNumber}`),
};

export const partnerFinderAPI = {
  getMeta: () => api.get('/partner-finder/meta'),
  createRequest: (data) => api.post('/partner-finder/requests', data),
  getAvailableRequests: (filters = {}) => api.get('/partner-finder/requests/available', { params: filters }),
  searchRequests: (query) => api.get('/partner-finder/requests/search', { params: { q: query } }),
  joinRequest: (requestId) => api.post(`/partner-finder/requests/${requestId}/join`),
  acceptJoinRequest: (requestId, joinRequestId) => api.post(`/partner-finder/requests/${requestId}/join-requests/${joinRequestId}/accept`),
  rejectJoinRequest: (requestId, joinRequestId) => api.post(`/partner-finder/requests/${requestId}/join-requests/${joinRequestId}/reject`),
  confirmMatch: (requestId, joinRequestId) => api.post(`/partner-finder/requests/${requestId}/join-requests/${joinRequestId}/confirm`),
  cancelMatch: (requestId, joinRequestId) => api.post(`/partner-finder/requests/${requestId}/join-requests/${joinRequestId}/cancel`),
  updateRequest: (requestId, data) => api.put(`/partner-finder/requests/${requestId}`, data),
  closeRequest: (requestId) => api.post(`/partner-finder/requests/${requestId}/close`),
  deleteRequest: (requestId) => api.delete(`/partner-finder/requests/${requestId}`),
  getNotifications: () => api.get('/partner-finder/notifications'),
  markNotificationRead: (notificationId) => api.patch(`/partner-finder/notifications/${notificationId}/read`),
  deleteNotification: (notificationId) => api.delete(`/partner-finder/notifications/${notificationId}`),
  getMyRequests: () => api.get('/partner-finder/requests/me'),
  getChatMessages: (requestId) => api.get(`/partner-finder/requests/${requestId}/chat`),
  sendChatMessage: (requestId, data) => api.post(`/partner-finder/requests/${requestId}/chat`, data),
};


export const courtAPI = {
  getAll: () => api.get('/courts'),
  updateStatus: (id, data) => api.put(`/courts/${id}/status`, data),
  block: (id, data) => api.put(`/courts/${id}/block`, data),
  getCrowdLevel: () => api.get('/courts/crowd'),   // ⚠️ '/api/crowd' නෙවෙයි
  updateCrowdLevel: (crowdLevel) => api.put('/courts/crowd', { crowdLevel }),
};

export default api;