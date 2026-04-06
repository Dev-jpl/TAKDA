import { Platform } from 'react-native';

// const DEFAULT_URL = 'https://takda-backend.onrender.com';
const DEFAULT_URL = 'http://localhost:8000';
export const API_URL = process.env.EXPO_PUBLIC_API_URL || DEFAULT_URL;
// export const API_URL = "https://takda-backend.onrender.com";

console.log(`[Takda] API: Connected to ${API_URL}`);
