import { createContext, useContext, useEffect, useState } from 'react'
import * as authApi from '../api/auth.js'
import { setAccessToken } from '../api/client.js'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function init() {
      try {
        setUser(await authApi.getMe())
      } catch {
        setUser(null)
      } finally {
        setLoading(false)
      }
    }

    init()
  }, [])

  async function login(credentials) {
    const data = await authApi.login(credentials)
    if (data?.tokens?.access_token) {
      setAccessToken(data.tokens.access_token)
    }
    setUser(data.user)
    return data.user
  }

  async function register(payload) {
    const data = await authApi.register(payload)
    if (data?.tokens?.access_token) {
      setAccessToken(data.tokens.access_token)
    }
    setUser(data.user)
    return data.user
  }

  async function logout() {
    try {
      await authApi.logout()
    } catch {
      // Local logout should still complete if the backend token is expired or already revoked.
    } finally {
      setAccessToken(null)
      setUser(null)
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isAuthenticated: Boolean(user),
        login,
        register,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}
