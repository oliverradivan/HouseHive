import api from './client.js'

export function register({ username, email, password, first_name, last_name }) {
  return api.post('/api/v1/auth/register', {
    username,
    email,
    password,
    first_name,
    last_name,
  })
}

export function login({ identifier, password }) {
  const formData = new URLSearchParams()
  formData.append('username', identifier)
  formData.append('password', password) 

  return api.post('/api/v1/auth/login', formData, {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  })
}

export function logout() {
  return api.post('/api/v1/auth/logout')
}

export function getMe() {
  return api.get('/api/v1/auth/me')
}
