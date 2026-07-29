import axios from 'axios'

const TOKEN_KEY = "token";
const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ??
  import.meta.env.VITE_API_URL?.replace(/\/api\/v1\/?$/, '') ??
  'http://localhost:8000';

let accessToken = localStorage.getItem(TOKEN_KEY);

export function setAccessToken(token) {
  accessToken = token;

  if (token) {
    localStorage.setItem(TOKEN_KEY, token);
  } else {
    localStorage.removeItem(TOKEN_KEY);
  }
}


const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
})

api.interceptors.request.use((config) => {
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`
  }
  return config
})

api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    const detail = error.response?.data?.detail
    const message = detail ?? 'Request failed'
    const err = new Error(typeof message === 'string' ? message : JSON.stringify(message))
    err.status = error.response?.status
    return Promise.reject(err)
  },
)

export default api