import axios from 'axios'
import toast from 'react-hot-toast'

const BASE = import.meta.env.VITE_API_URL || 'https://local-mart-crlc.vercel.app/api/v1'

const api = axios.create({
  baseURL:        BASE,
  withCredentials:true,
  headers:        { 'Content-Type': 'application/json' },
  timeout:        15000,
})

// ── Request: attach JWT ───────────────────────────────────
api.interceptors.request.use(cfg => {
  const token = localStorage.getItem('lm_token')
  if (token) cfg.headers.Authorization = `Bearer ${token}`
   // Bust browser cache on all GET requests
  if (!cfg.method || cfg.method.toLowerCase() === 'get') {
    cfg.params = { ...cfg.params, _t: Date.now() }
  }
  return cfg
})

// ── Response: handle errors globally ─────────────────────
api.interceptors.response.use(
  res => res.data,
  err => {
    const msg = err.response?.data?.message || 'Something went wrong.'
    if (err.response?.status === 401) {
      localStorage.removeItem('lm_token')
      localStorage.removeItem('lm_user')
      window.location.href = '/login'
    } else if (err.response?.status !== 404) {
      toast.error(msg)
    }
    return Promise.reject(err)
  }
)

// ── Auth ──────────────────────────────────────────────────
export const authAPI = {
  register:       d  => api.post('/auth/register', d),
  login:          d  => api.post('/auth/login', d),
  logout:         () => api.post('/auth/logout'),
  me:             () => api.get('/auth/me'),
  updateProfile:  d  => api.put('/auth/update-profile', d, { headers: { 'Content-Type': 'multipart/form-data' } }),
  changePassword: d  => api.put('/auth/change-password', d),
}

// ── Admin ─────────────────────────────────────────────────
export const adminAPI = {
  dashboard:      ()        => api.get('/admin/dashboard'),
  analytics:      (p)       => api.get('/admin/analytics', { params: p }),
  shops:          (p)       => api.get('/admin/shops', { params: p }),
  shopById:       (id)      => api.get(`/admin/shops/${id}`),
  approveShop:    (id)      => api.post(`/admin/shops/${id}/approve`),
  rejectShop:     (id, d)   => api.post(`/admin/shops/${id}/reject`, d),
  suspendShop:    (id)      => api.post(`/admin/shops/${id}/suspend`),
  deleteShop:     (id)      => api.delete(`/admin/shops/${id}`),
  users:          (p)       => api.get('/admin/users', { params: p }),
  userById:       (id)      => api.get(`/admin/users/${id}`),
  updateUser:     (id, d)   => api.put(`/admin/users/${id}`, d),
  suspendUser:    (id)      => api.post(`/admin/users/${id}/suspend`),
  deleteUser:     (id)      => api.delete(`/admin/users/${id}`),
}

// ── Shopkeeper ────────────────────────────────────────────
export const shopkeeperAPI = {
  myShop:         ()        => api.get('/shopkeeper/shop'),
  createShop:     d         => api.post('/shopkeeper/shop', d, { headers: { 'Content-Type': 'multipart/form-data' } }),
  updateShop:     d         => api.put('/shopkeeper/shop', d, { headers: { 'Content-Type': 'multipart/form-data' } }),
  dashboard:      ()        => api.get('/shopkeeper/shop/dashboard'),
  analytics:      ()        => api.get('/shopkeeper/shop/analytics'),
  products:       (p)       => api.get('/shopkeeper/products', { params: p }),
  lowStock:       ()        => api.get('/shopkeeper/products/low-stock'),
  createProduct:  d         => api.post('/shopkeeper/products', d, { headers: { 'Content-Type': 'multipart/form-data' } }),
  updateProduct:  (id, d)   => api.put(`/shopkeeper/products/${id}`, d, { headers: { 'Content-Type': 'multipart/form-data' } }),
  deleteProduct:  (id)      => api.delete(`/shopkeeper/products/${id}`),
  toggleProduct:  (id)      => api.post(`/shopkeeper/products/${id}/toggle`),
  orders:         (p)       => api.get('/shopkeeper/orders', { params: p }),
  updateOrder:    (id, d)   => api.put(`/shopkeeper/orders/${id}/status`, d),
  assignDelivery: (id, d)   => api.put(`/shopkeeper/orders/${id}/assign`, d),
  autoAssign:     (id)      => api.post(`/shopkeeper/orders/${id}/auto-assign`),
  deliveryRiders: ()        => api.get('/shopkeeper/delivery-riders'),
  team:           ()        => api.get('/shopkeeper/team'),
  addMember:      d         => api.post('/shopkeeper/team', d),
  updateMember:   (id, d)   => api.put(`/shopkeeper/team/${id}`, d),
  removeMember:   (id)      => api.delete(`/shopkeeper/team/${id}`),
}

// ── Delivery ──────────────────────────────────────────────
export const deliveryAPI = {
  dashboard:      ()        => api.get('/delivery/dashboard'),
  activeOrders:   ()        => api.get('/delivery/orders'),
  shopOrders:     (p)       => api.get('/delivery/shop-orders', { params: p }),
  history:        (p)       => api.get('/delivery/history', { params: p }),
  earnings:       ()        => api.get('/delivery/earnings'),
  markDelivered:  (id, d)   => api.post(`/delivery/orders/${id}/delivered`, d),
}

// ── User ──────────────────────────────────────────────────
export const userAPI = {
  nearbyShops:    (p)       => api.get('/user/shops/nearby', { params: p }),
  searchShops:    (p)       => api.get('/user/shops/search', { params: p }),
  shopsByCategory:(cat, p)  => api.get(`/user/shops/category/${cat}`, { params: p }),
  shopById:       (id)      => api.get(`/user/shops/${id}`),
  shopReviews:    (id, p)   => api.get(`/user/shops/${id}/reviews`, { params: p }),
  cart:           ()        => api.get('/user/cart'),
  addToCart:      d         => api.post('/user/cart', d),
  updateCart:     d         => api.put('/user/cart', d),
  clearCart:      ()        => api.delete('/user/cart'),
  placeOrder:     d         => api.post('/user/orders', d),
  myOrders:       (p)       => api.get('/user/orders', { params: p }),
  orderById:      (id)      => api.get(`/user/orders/${id}`),
  cancelOrder:    (id, d)   => api.post(`/user/orders/${id}/cancel`, d),
  createReview:   d         => api.post('/user/reviews', d),
  notifications:  ()        => api.get('/user/notifications'),
  markRead:       ()        => api.post('/user/notifications/read'),
}

export default api
