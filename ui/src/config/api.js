// Centralized API configuration
// For local dev, set VITE_API_URL=http://localhost:3002 in .env.local
const API_URL = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}/api`
  : 'https://api.irlwork.ai/api';

export default API_URL;
