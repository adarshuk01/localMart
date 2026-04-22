import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth }   from '@context/AuthContext'
import { CartProvider }            from '@context/CartContext'
import { LoadingScreen }           from '@components/common'

// ── Layouts ───────────────────────────────────────────────
import { AdminLayout, ShopkeeperLayout, DeliveryLayout, UserLayout } from '@layouts'

// ── Auth ──────────────────────────────────────────────────
import { LoginPage, RegisterPage } from '@pages/auth'

// ── Admin ─────────────────────────────────────────────────
import { AdminDashboard, AdminShops, AdminShopDetail, AdminUsers, AdminAnalytics, AdminSettings } from '@pages/admin'

// ── Shopkeeper ────────────────────────────────────────────
import { ShopDashboard, ShopApply, ShopProducts, ShopOrders, ShopTeam, ShopAnalytics, ShopReviews } from '@pages/shopkeeper'

// ── Delivery ──────────────────────────────────────────────
import { DeliveryDashboard, DeliveryOrders, DeliveryShopOrders, DeliveryHistory, DeliveryEarnings } from '@pages/delivery'

// ── User ──────────────────────────────────────────────────
import { UserHome, UserShopDetail, UserCart, UserOrders, UserMap, UserProfile } from '@pages/user'

// ── Route guard ───────────────────────────────────────────
function RoleRoute({ roles, children }) {
  const { user, loading } = useAuth()
  if (loading) return <LoadingScreen />
  if (!user)   return <Navigate to="/login" replace />
  if (!roles.includes(user.role)) return <Navigate to="/login" replace />
  return children
}

function PublicRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <LoadingScreen />
  if (user) {
    const MAP = { admin:'/admin', shopkeeper:'/shop', delivery:'/delivery', user:'/app', stock:'/delivery', cashier:'/delivery', manager:'/shop' }
    return <Navigate to={MAP[user.role] || '/app'} replace />
  }
  return children
}

// ── Main app ──────────────────────────────────────────────
function AppRoutes() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/login"    element={<PublicRoute><LoginPage /></PublicRoute>} />
      <Route path="/register" element={<PublicRoute><RegisterPage /></PublicRoute>} />
      <Route path="/"         element={<Navigate to="/login" replace />} />

      {/* Admin */}
      <Route path="/admin" element={<RoleRoute roles={['admin']}><AdminLayout /></RoleRoute>}>
        <Route index              element={<AdminDashboard />} />
        <Route path="shops"       element={<AdminShops />} />
        <Route path="shops/:id"   element={<AdminShopDetail />} />
        <Route path="apply"       element={<AdminShops />} />
        <Route path="users"       element={<AdminUsers />} />
        <Route path="analytics"   element={<AdminAnalytics />} />
        <Route path="settings"    element={<AdminSettings />} />
      </Route>

      {/* Shopkeeper */}
      <Route path="/shop" element={<RoleRoute roles={['shopkeeper','admin']}><ShopkeeperLayout /></RoleRoute>}>
        <Route index              element={<ShopDashboard />} />
        <Route path="apply"       element={<ShopApply />} />
        <Route path="products"    element={<ShopProducts />} />
        <Route path="orders"      element={<ShopOrders />} />
        <Route path="team"        element={<ShopTeam />} />
        <Route path="analytics"   element={<ShopAnalytics />} />
        <Route path="reviews"     element={<ShopReviews />} />
      </Route>

      {/* Delivery */}
      <Route path="/delivery" element={<RoleRoute roles={['delivery','admin']}><DeliveryLayout /></RoleRoute>}>
        <Route index              element={<DeliveryDashboard />} />
        <Route path="orders"      element={<DeliveryOrders />} />
        <Route path="shop-orders" element={<DeliveryShopOrders />} />
        <Route path="history"     element={<DeliveryHistory />} />
        <Route path="earnings"    element={<DeliveryEarnings />} />
      </Route>

      {/* User */}
      <Route path="/app" element={<RoleRoute roles={['user','admin']}><UserLayout /></RoleRoute>}>
        <Route index              element={<UserHome />} />
        <Route path="shop/:id"    element={<UserShopDetail />} />
        <Route path="cart"        element={<UserCart />} />
        <Route path="orders"      element={<UserOrders />} />
        <Route path="map"         element={<UserMap />} />
        <Route path="profile"     element={<UserProfile />} />
      </Route>

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <CartProvider>
        <AppRoutes />
      </CartProvider>
    </AuthProvider>
  )
}
