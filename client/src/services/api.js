import axios from 'axios';

// Judges load this on their phones from the organizer's LAN address, where
// "localhost" points at the phone itself. Derive the API host from wherever the
// page was served and let VITE_API_URL override it for other setups.
const SERVER_PORT = import.meta.env.VITE_API_PORT || '3001';

export const SERVER_ORIGIN = (
  import.meta.env.VITE_API_URL ||
  `${window.location.protocol}//${window.location.hostname}:${SERVER_PORT}`
).replace(/\/$/, '');

const API_BASE_URL = `${SERVER_ORIGIN}/api`;

// Build an absolute URL for a server-hosted upload (image_path is server-relative).
export const mediaUrl = (imagePath) =>
  imagePath ? `${SERVER_ORIGIN}${imagePath}` : null;

// A stable per-browser id. Not identity and not a security control — it lets the
// server tell "this judge is fixing their own score" apart from "a second person
// with the same name", and lets the organizer spot one device rating under many
// names. Shared phones are normal at these events, so it never blocks a vote.
const DEVICE_ID_KEY = 'chiliDeviceId';

export const getDeviceId = () => {
  try {
    let id = localStorage.getItem(DEVICE_ID_KEY);
    if (!id) {
      id = (crypto.randomUUID && crypto.randomUUID()) ||
        `dev-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      localStorage.setItem(DEVICE_ID_KEY, id);
    }
    return id;
  } catch {
    // Private browsing with storage disabled: proceed without a device id.
    return null;
  }
};

// The judge's code for this event, kept so they enter it once per phone.
const JUDGE_CODE_KEY = 'chiliJudgeCode';

export const getJudgeCode = () => {
  try {
    return localStorage.getItem(JUDGE_CODE_KEY) || '';
  } catch {
    return '';
  }
};

export const setJudgeCode = (code) => {
  try {
    if (code) localStorage.setItem(JUDGE_CODE_KEY, code);
    else localStorage.removeItem(JUDGE_CODE_KEY);
  } catch {
    // Storage unavailable; the judge will re-enter it after a reload.
  }
};

const ADMIN_TOKEN_KEY = 'chiliAdminToken';

export const getAdminToken = () => {
  try {
    return localStorage.getItem(ADMIN_TOKEN_KEY) || '';
  } catch {
    return '';
  }
};

export const setAdminToken = (token) => {
  try {
    if (token) localStorage.setItem(ADMIN_TOKEN_KEY, token);
    else localStorage.removeItem(ADMIN_TOKEN_KEY);
  } catch {
    // Nothing to do if storage is unavailable.
  }
};

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
    const deviceId = getDeviceId();
    if (deviceId) {
      config.headers['X-Device-Id'] = deviceId;
    }

    const judgeCode = getJudgeCode();
    if (judgeCode) {
      config.headers['X-Judge-Code'] = judgeCode;
    }

    const adminToken = getAdminToken();
    if (adminToken) {
      config.headers['Authorization'] = `Bearer ${adminToken}`;
    }

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

// Judge Codes API
export const judgeCodeAPI = {
  // List all codes with usage (admin)
  getAll: () => api.get('/judge-codes'),

  // Generate a batch of codes (admin)
  generate: (count, label) => api.post('/judge-codes', { count, label }),

  // Revoke a code (admin)
  revoke: (code) => api.delete(`/judge-codes/${code}`),

  // Check a code before letting someone rate
  validate: (code) => api.post('/judge-codes/validate', { code })
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
  updateKey: (key, value) => api.put(`/config/${key}`, { value })
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
