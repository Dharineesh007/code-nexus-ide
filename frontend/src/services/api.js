import axios from 'axios';

// Paste your Ngrok forwarding URL here
const API_BASE_URL = 'https://applicant-feel-widow.ngrok-free.dev'; 

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    // This header bypasses the free-tier Ngrok warning screen automatically
    'ngrok-skip-browser-warning': 'true',
    'Content-Type': 'application/json'
  }
});

export default api;
// forcing vercel update for ngrok