import axios from 'axios';

// Live Render Cloud Backend
const API_BASE_URL = 'https://code-nexus-ide.onrender.com'; 

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

export default api;