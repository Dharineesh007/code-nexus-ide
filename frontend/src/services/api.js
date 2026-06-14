import axios from 'axios';

// Cloudflare Tunnel URL
const API_BASE_URL = 'https://anthropology-lawsuit-fool-anonymous.trycloudflare.com'; 

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

export default api;