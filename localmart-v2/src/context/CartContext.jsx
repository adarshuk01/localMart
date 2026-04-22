import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { userAPI } from '@services/api'
import { useAuth } from './AuthContext'
import toast from 'react-hot-toast'

const CartContext = createContext(null)

// helper to normalize cart — always extract shopId as a plain string
const normalizeCart = (cart) => ({
  ...cart,
  shopId: cart?.shopId?._id || cart?.shopId || null,
})

export function CartProvider({ children }) {
  const { user } = useAuth()
  const [cart, setCart]     = useState({ items: [], shopId: null })
  const [loading, setLoading] = useState(false)

  // ── Fetch cart when user changes ──────────────────────
  useEffect(() => {
    if (user?.role === 'user') {
      userAPI.cart()
        .then(res => setCart(normalizeCart(res.data.cart || { items: [], shopId: null })))
        .catch(() => {})
    } else {
      setCart({ items: [], shopId: null })
    }
  }, [user])

  const addItem = useCallback(async (productId, shopId) => {
    if (!user) { toast.error('Please log in to add items.'); return false }
    const normalizedShopId = shopId?._id || shopId  // ← normalize incoming shopId too
    if (cart.shopId && cart.shopId !== normalizedShopId && cart.items?.length > 0) {
      toast.error('Clear your cart before ordering from a different shop.')
      return false
    }
    setLoading(true)
    try {
      const res = await userAPI.addToCart({ productId, qty: 1 })
      setCart(normalizeCart(res.data.cart))  // ← normalize
      return true
    } catch { return false }
    finally { setLoading(false) }
  }, [user, cart.shopId, cart.items])

  const updateQty = useCallback(async (productId, qty) => {
    setLoading(true)
    try {
      const res = await userAPI.updateCart({ productId, qty })
      setCart(normalizeCart(res.data.cart))  // ← normalize
    } catch {}
    finally { setLoading(false) }
  }, [])

  const removeItem = useCallback(async (productId) => {
    await updateQty(productId, 0)
  }, [updateQty])

  const clearCart = useCallback(async () => {
    try { await userAPI.clearCart() } catch {}
    setCart({ items: [], shopId: null })
  }, [])

  const total     = cart.items?.reduce((s, i) => s + (i.price ?? i.productId?.price ?? 0) * i.qty, 0) || 0
  const itemCount = cart.items?.reduce((s, i) => s + i.qty, 0) || 0

  return (
    <CartContext.Provider value={{
      cart, items: cart.items || [], shopId: cart.shopId,
      addItem, removeItem, updateQty, clearCart,
      total, itemCount, loading
    }}>
      {children}
    </CartContext.Provider>
  )
}

export const useCart = () => {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error('useCart must be used within CartProvider')
  return ctx
}
