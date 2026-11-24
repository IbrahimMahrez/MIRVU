import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json'
  },
  timeout: 60000
});

api.interceptors.response.use(
  response => response,
  error => {
    if (error.code === 'ECONNABORTED') {
      return Promise.reject(new Error('Request timed out. Please try again.'));
    }
    if (!error.response) {
      return Promise.reject(new Error('Network error. Please check your connection.'));
    }
    // Include backend validation errors in the error message
    if (error.response.data?.errors) {
      return Promise.reject(new Error(error.response.data.errors.join(', ')));
    }
    if (error.response.data?.error) {
      return Promise.reject(new Error(error.response.data.error));
    }
    return Promise.reject(error);
  }
);

export const interviewApi = {
  start: (config) => api.post('/interview/start', config),
  answer: (sessionId, answer) => api.post('/interview/answer', { sessionId, answer }),
  followUpAnswer: (sessionId, answer) => api.post('/interview/follow-up-answer', { sessionId, answer }),
  finish: (sessionId, options = {}) => api.post('/interview/finish', { sessionId, ...options }, { timeout: 240000 }),
  cancel: (sessionId) => api.delete(`/interview/${sessionId}`),
  getSession: (sessionId) => api.get(`/interview/${sessionId}`),
  resumeSession: (sessionId) => api.get(`/interview/${sessionId}/resume`),
  health: () => api.get('/health'),
  synthesizeSpeech: (text, locale) => api.post('/interview/speech', { text, locale }, {
    responseType: 'blob',
    timeout: 25000
  }),
  uploadVideo: (sessionId, formData) => api.post(`/interview/${sessionId}/video`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 600000
  }),
  uploadRecording: (sessionId, formData, onUploadProgress) => api.post(`/interview/${sessionId}/recording`, formData, {
    // Axios otherwise inherits the instance's application/json default and
    // serializes FormData into JSON. In browsers, Axios clears this header
    // before sending so the browser can add the multipart boundary.
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 600000,
    onUploadProgress
  })
};

export default api;
