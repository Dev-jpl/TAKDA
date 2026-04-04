// Check if we are in local environment
const isLocal = typeof window !== 'undefined' 
  ? (['localhost', '127.0.0.1', '0.0.0.0'].includes(window.location.hostname) || process.env.NEXT_PUBLIC_ENVIRONMENT === 'local')
  : (process.env.ENVIRONMENT === 'local' || process.env.NODE_ENV === 'development');

export const API_URL = isLocal 
  ? "http://localhost:8000" 
  : "https://takda-backend.onrender.com";

console.log(`[Takda Web] Mission Registry: Connected to ${API_URL} (${isLocal ? 'LOCAL' : 'PRODUCTION'})`);
