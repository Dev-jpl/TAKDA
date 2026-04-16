import { Platform } from 'react-native';

// Production
// export const API_URL = 'https://takda-backend.onrender.com';

// Local dev — physical device needs your Mac's LAN IP, not localhost
const LOCAL_IP = '10.250.144.40';
const DEV_URL = Platform.OS === 'android' ? 'http://10.0.2.2:8000' : `http://${LOCAL_IP}:8000`;
export const API_URL = DEV_URL;

console.log(`[Takda] API: Connected to ${API_URL}`);
