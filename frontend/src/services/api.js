import axios from 'axios';

// Vercel will invisibly forward this to your Cloudflare Tunnel
const API_BASE_URL = '/proxy'; 

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

export default api;