// frontend/src/config/api.js
// For Vite, we use import.meta.env and VITE_ prefix
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

console.log('API Base URL:', API_BASE_URL);
console.log('Environment:', import.meta.env.MODE);
console.log('All env vars:', import.meta.env);

export { API_BASE_URL };