// src/layouts/index.jsx — all layouts exported
import { useState } from 'react'
import { Outlet, useLocation, NavLink } from 'react-router-dom'
import Sidebar from '@components/common/Sidebar'
import Topbar  from '@components/common/Topbar'
import { useCart } from '@context/CartContext'
import {
  TbLayoutDashboard, TbBuildingStore, TbUsers, TbChartBar, TbSettings,
  TbPackage, TbClipboardList, TbTruck, TbHistory, TbHome, TbMap,
  TbShoppingCart, TbUser, TbUserPlus, TbStar, TbBell, TbCheck,
} from 'react-icons/tb'
import clsx from 'clsx'

// ── Shared DashboardLayout ────────────────────────────────
function DashboardLayout({ links, title }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { pathname } = useLocation()

  const currentTitle = (() => {
    for (const l of links) {
      if (l.to && pathname === l.to) return l.label
    }
    return title
  })()

  return (
    <div className="min-h-screen bg-slate-50">
      <Sidebar links={links} open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <Topbar title={currentTitle} onMenuToggle={() => setSidebarOpen(true)} />
      <main className="lg:pl-[260px] pt-[60px] min-h-screen">
        <div className="p-4 md:p-6 max-w-7xl mx-auto animate-fade-in">
          <Outlet />
        </div>
      </main>
    </div>
  )
}

// ── ADMIN LAYOUT ──────────────────────────────────────────
export function AdminLayout() {
  const LINKS = [
    { to:'/admin',           label:'Dashboard',    icon:TbLayoutDashboard, end:true },
    { divider:true },
    { label:'Shops' },
    { to:'/admin/shops',     label:'All Shops',    icon:TbBuildingStore },
    { to:'/admin/apply',     label:'Pending',       icon:TbClipboardList },
    { divider:true },
    { label:'Users' },
    { to:'/admin/users',     label:'All Users',    icon:TbUsers },
    { divider:true },
    { label:'Reports' },
    { to:'/admin/analytics', label:'Analytics',    icon:TbChartBar },
    { divider:true },
    { to:'/admin/settings',  label:'Settings',     icon:TbSettings },
  ]
  return <DashboardLayout links={LINKS} title="Admin" />
}

// ── SHOPKEEPER LAYOUT ─────────────────────────────────────
export function ShopkeeperLayout() {
  const LINKS = [
    { to:'/shop',            label:'Dashboard',   icon:TbLayoutDashboard, end:true },
    { divider:true },
    { label:'Store' },
    { to:'/shop/apply',      label:'My Shop',     icon:TbBuildingStore },
    { to:'/shop/products',   label:'Products',    icon:TbPackage },
    { to:'/shop/orders',     label:'Orders',      icon:TbClipboardList },
    { divider:true },
    { label:'Team' },
    { to:'/shop/team',       label:'My Team',     icon:TbUserPlus },
    { divider:true },
    { to:'/shop/analytics',  label:'Analytics',   icon:TbChartBar },
    { to:'/shop/reviews',    label:'Reviews',     icon:TbStar },
  ]
  return <DashboardLayout links={LINKS} title="Shop Panel" />
}

// ── DELIVERY LAYOUT ───────────────────────────────────────
export function DeliveryLayout() {
  const LINKS = [
    { to:'/delivery',              label:'Dashboard',    icon:TbLayoutDashboard, end:true },
    { divider:true },
    { to:'/delivery/orders',       label:'My Orders',    icon:TbTruck },
    { to:'/delivery/shop-orders',  label:'Shop Orders',  icon:TbClipboardList },
    { to:'/delivery/history',      label:'History',      icon:TbHistory },
    { to:'/delivery/earnings',     label:'Earnings',     icon:TbChartBar },
  ]
  return <DashboardLayout links={LINKS} title="Delivery" />
}

// ── USER LAYOUT (mobile-first) ────────────────────────────
const USER_NAV = [
  { to:'/app',         label:'Home',    icon:TbHome,          end:true  },
  { to:'/app/map',     label:'Map',     icon:TbMap                      },
  { to:'/app/cart',    label:'Cart',    icon:TbShoppingCart,  cart:true },
  { to:'/app/orders',  label:'Orders',  icon:TbClipboardList            },
  { to:'/app/profile', label:'Profile', icon:TbUser                     },
]

export function UserLayout() {
  const { itemCount } = useCart()
  return (
    <div className="min-h-[100dvh] bg-slate-50 flex flex-col">
      {/* Top header */}
      <header className="fixed top-0 inset-x-0 h-14 bg-white border-b border-slate-100 flex items-center px-4 gap-3 z-20 safe-top">
        <div className="w-7 h-7 bg-primary-500 rounded-lg flex items-center justify-center"><span className="text-white text-sm font-bold font-display">L</span></div>
        <span className="font-display font-bold text-slate-800 text-sm">LocalMart</span>
        <div className="flex-1" />
        <NavLink to="/app/cart" className="relative p-2">
          <TbShoppingCart className="text-xl text-slate-600" />
          {itemCount > 0 && <span className="absolute top-0 right-0 w-4 h-4 bg-primary-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">{itemCount}</span>}
        </NavLink>
      </header>

      {/* Page */}
      <main className="flex-1 pt-14 pb-16 overflow-y-auto">
        <Outlet />
      </main>

      {/* Bottom nav */}
      <nav className="fixed bottom-0 inset-x-0 bg-white border-t border-slate-100 z-20 pb-safe">
        <div className="flex h-16 items-center">
          {USER_NAV.map(item => {
            const Icon = item.icon
            return (
              <NavLink key={item.to} to={item.to} end={item.end}
                className={({ isActive }) => clsx('flex-1 flex flex-col items-center justify-center gap-0.5 py-2 transition-colors', isActive ? 'text-primary-600' : 'text-slate-400 hover:text-slate-600')}>
                <div className="relative">
                  <Icon className="text-[22px]" />
                  {item.cart && itemCount > 0 && <span className="absolute -top-1 -right-1.5 w-3.5 h-3.5 bg-primary-500 text-white text-[8px] font-bold rounded-full flex items-center justify-center">{itemCount}</span>}
                </div>
                <span className="text-[10px] font-medium">{item.label}</span>
              </NavLink>
            )
          })}
        </div>
      </nav>
    </div>
  )
}
