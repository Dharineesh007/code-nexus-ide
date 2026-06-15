import axios from 'axios';

// Direct local network connection via mobile hotspot
const API_BASE_URL = 'https://confidential-magazine-gentleman-webmaster.trycloudflare.com';
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

export default api;