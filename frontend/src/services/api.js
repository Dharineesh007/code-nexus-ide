import axios from 'axios';

// Direct local network connection via mobile hotspot
const API_BASE_URL = 'https://sellers-supplies-hostels-col.trycloudflare.com';
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

export default api;