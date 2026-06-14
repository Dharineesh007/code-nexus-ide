import axios from 'axios';

// Use your current Cloudflare URL
const API_BASE_URL = 'https://inf-placing-ethernet-mono.trycloudflare.com'; 

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*' // This tells the phone to stop blocking
  }
});

export default api;