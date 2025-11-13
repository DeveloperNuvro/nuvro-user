import axios from 'axios';

// Unipile API configuration
const UNIPILE_DSN = import.meta.env.VITE_UNIPILE_DSN || 'api21.unipile.com:15139';
const UNIPILE_API_KEY = import.meta.env.VITE_UNIPILE_API_KEY || 'o2eKmjSQ.6TIChkBbEdWMLe89ngFv5b7QAS0MIdB8VwFDMdBaOzE='; // EXPIRED - 401 error

console.log('🔧 Unipile API Configuration:');
console.log('🔧 DSN:', UNIPILE_DSN);
console.log('🔧 API Key:', UNIPILE_API_KEY ? `${UNIPILE_API_KEY.substring(0, 20)}...` : 'NOT SET');
console.log('🔧 Base URL:', `https://${UNIPILE_DSN}/api/v1`);

export const unipileApi = axios.create({
  baseURL: `https://${UNIPILE_DSN}/api/v1`,
  headers: {
    'X-API-KEY': UNIPILE_API_KEY,
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  }
});

// Request interceptor for Unipile API
unipileApi.interceptors.request.use(
  config => {
    console.log('🔗 Unipile API Request:', {
      method: config.method?.toUpperCase(),
      url: config.url,
      baseURL: config.baseURL,
      fullURL: `${config.baseURL}${config.url}`,
      headers: config.headers
    });
    console.log('🔗 X-API-KEY header:', config.headers?.['X-API-KEY']);
    return config;
  },
  error => {
    console.error('❌ Unipile API Request Error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor for Unipile API
unipileApi.interceptors.response.use(
  response => {
    console.log('✅ Unipile API Response:', {
      status: response.status,
      url: response.config.url,
      data: response.data
    });
    return response;
  },
  error => {
    console.error('❌ Unipile API Response Error:', {
      status: error.response?.status,
      url: error.config?.url,
      data: error.response?.data,
      message: error.message
    });
    return Promise.reject(error);
  }
);

export default unipileApi;
