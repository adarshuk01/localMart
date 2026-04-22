import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { authAPI } from '@services/api'
import toast from 'react-hot-toast'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null)
  const [loading, setLoading] = useState(true)

  // ── Restore session ───────────────────────────────────
  useEffect(() => {
    const token = localStorage.getItem('lm_token')
    if (!token) { setLoading(false); return }
    authAPI.me()
      .then(res => setUser(res.data.user))
      .catch(() => { localStorage.removeItem('lm_token'); localStorage.removeItem('lm_user') })
      .finally(() => setLoading(false))
  }, [])

  // ── Login ─────────────────────────────────────────────
  const login = useCallback(async (email, password) => {
    const res = await authAPI.login({ email, password })
    localStorage.setItem('lm_token', res.token)
    localStorage.setItem('lm_user',  JSON.stringify(res.data.user))
    setUser(res.data.user)
    return res.data.user
  }, [])

  // ── Register ──────────────────────────────────────────
  const register = useCallback(async (data) => {
    const res = await authAPI.register(data)
    localStorage.setItem('lm_token', res.token)
    localStorage.setItem('lm_user',  JSON.stringify(res.data.user))
    setUser(res.data.user)
    return res.data.user
  }, [])

  // ── Logout ────────────────────────────────────────────
  const logout = useCallback(async () => {
    try { await authAPI.logout() } catch {}
    localStorage.removeItem('lm_token')
    localStorage.removeItem('lm_user')
    setUser(null)
  }, [])

  // ── Update user in state ──────────────────────────────
  const updateUser = useCallback(u => setUser(prev => ({ ...prev, ...u })), [])

  const isAdmin      = user?.role === 'admin'
  const isShopkeeper = user?.role === 'shopkeeper'
  const isDelivery   = user?.role === 'delivery'
  const isUser       = user?.role === 'user'

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, updateUser, isAdmin, isShopkeeper, isDelivery, isUser }}>
      {!loading && children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
