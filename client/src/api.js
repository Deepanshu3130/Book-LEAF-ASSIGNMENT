import axios from 'axios';
import { disconnectSocket } from './socket.js';

// Base Axios client configured for BookLeaf API
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
});

// Automatically inject JWT token into the Authorization header
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle expired or invalid tokens by clearing state and redirecting to login
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && !error.config?.url?.includes('/auth/login')) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      disconnectSocket();
      window.location.assign('/login');
    }
    return Promise.reject(error);
  }
);

export default api;
