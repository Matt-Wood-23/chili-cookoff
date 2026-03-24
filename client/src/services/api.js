import axios from 'axios';

const API_BASE_URL = 'http://localhost:3001/api';

// Create axios instance with default config
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth if needed
api.interceptors.request.use(
  (config) => {
    // Add any auth headers here if needed
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('API Error:', error.response?.data || error.message);
    return Promise.reject(error);
  }
);

// Chili Management API
export const chiliAPI = {
  // Get all chili entries
  getAll: () => api.get('/chilis'),
  
  // Get specific chili entry
  getById: (id) => api.get(`/chilis/${id}`),
  
  // Create new chili entry
  create: (formData) => api.post('/chilis', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  
  // Update chili entry
  update: (id, formData) => api.put(`/chilis/${id}`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  
  // Delete chili entry
  delete: (id) => api.delete(`/chilis/${id}`)
};

// Voting API
export const voteAPI = {
  // Get all votes
  getAll: () => api.get('/votes'),
  
  // Get votes for specific chili
  getByChiliId: (chiliId) => api.get(`/votes/chili/${chiliId}`),
  
  // Submit a new vote
  submit: (voteData) => api.post('/votes', voteData),
  
  // Clear all votes (admin only)
  clearAll: () => api.delete('/votes'),
  
  // Delete specific vote
  delete: (id) => api.delete(`/votes/${id}`),
  
  // Get voting statistics
  getStats: () => api.get('/votes/stats')
};

// OCR API
export const ocrAPI = {
  // Process scoresheet image
  processImage: (file, chiliName = '') => {
    const formData = new FormData();
    formData.append('image', file);
    if (chiliName) formData.append('chili_name', chiliName);
    
    return api.post('/ocr/process', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },
  
  // Process base64 image data
  processBase64: (imageData, chiliName = '') => {
    return api.post('/ocr/process-base64', { imageData, chili_name: chiliName });
  },
  
  // Test OCR service connection
  testConnection: () => api.get('/ocr/test'),
  
  // Get available models
  getModels: () => api.get('/ocr/models')
};

// Results API
export const resultsAPI = {
  // Get overall leaderboard
  getLeaderboard: () => api.get('/results/leaderboard'),
  
  // Get category-specific rankings
  getCategoryRankings: (category) => api.get(`/results/category/${category}`),
  
  // Get aggregate statistics
  getStats: () => api.get('/results/stats'),
  
  // Get detailed results for specific chili
  getChiliResults: (id) => api.get(`/results/chili/${id}`),
  
  // Export results as CSV
  exportCSV: () => api.get('/results/export/csv', { responseType: 'blob' })
};

// Configuration API
export const configAPI = {
  // Get all configuration
  getAll: () => api.get('/config'),
  
  // Get specific configuration value
  get: (key) => api.get(`/config/${key}`),
  
  // Update configuration
  update: (configs) => api.put('/config', configs),
  
  // Update specific configuration key
  updateKey: (key, value) => api.put(`/config/${key}`, { value }),
  
  // Delete configuration key
  delete: (key) => api.delete(`/config/${key}`),
  
  // Reset to defaults
  reset: () => api.post('/config/reset'),
  
  // Get event status
  getEventStatus: () => api.get('/config/event/status')
};

// Health check
export const healthAPI = {
  check: () => api.get('/health')
};

// Utility functions
export const utils = {
  // Convert file to base64
  fileToBase64: (file) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = error => reject(error);
  }),
  
  // Download file from blob response
  downloadBlob: (blob, filename) => {
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  }
};

export default api;
