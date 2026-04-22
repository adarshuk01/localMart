import { NavLink, useNavigate } from 'react-router-dom'
import { HiOutlineShoppingBag, HiOutlineLogout, HiX } from 'react-icons/hi'
import { useAuth } from '@context/AuthContext'
import { Avatar } from '@components/common'
import clsx from 'clsx'
import toast from 'react-hot-toast'

export default function Sidebar({ links, open, onClose }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = async () => {
    await logout()
    toast.success('Logged out.')
    navigate('/login')
  }

  const content = (
    <aside className="flex flex-col h-full bg-navy-900 overflow-hidden">
      {/* Logo */}
      <div className="flex items-center justify-between px-5 h-[60px] border-b border-white/10 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-primary-500 rounded-lg flex items-center justify-center">
            <HiOutlineShoppingBag className="text-white text-base" />
          </div>
          <span className="text-white font-display font-bold">LocalMart</span>
        </div>
        {onClose && (
          <button onClick={onClose} className="lg:hidden text-slate-400 hover:text-white p-1">
            <HiX className="text-lg" />
          </button>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
        {links.map((link, i) => {
          if (link.divider) return <div key={i} className="my-2 border-t border-white/10" />
          if (link.label && !link.to) return (
            <p key={i} className="text-[10px] font-semibold uppercase tracking-widest text-slate-600 px-4 pt-3 pb-1">{link.label}</p>
          )
          const Icon = link.icon
          return (
            <NavLink key={link.to} to={link.to} end={link.end} onClick={onClose}
              className={({ isActive }) => clsx('sidebar-link', isActive && 'active')}>
              {Icon && <Icon className="text-lg flex-shrink-0" />}
              <span className="flex-1">{link.label}</span>
              {link.badge > 0 && (
                <span className="bg-primary-500 text-white text-[10px] font-bold rounded-full px-1.5 py-0.5 leading-tight">
                  {link.badge}
                </span>
              )}
            </NavLink>
          )
        })}
      </nav>

      {/* User */}
      <div className="flex-shrink-0 p-3 border-t border-white/10">
        <div className="flex items-center gap-3 p-2 rounded-xl hover:bg-white/5 transition-colors">
          <Avatar name={user?.name} size="sm" src={user?.avatar} />
          <div className="flex-1 min-w-0">
            <p className="text-white text-sm font-medium truncate">{user?.name}</p>
            <p className="text-slate-500 text-xs truncate capitalize">{user?.role}</p>
          </div>
          <button onClick={handleLogout} className="text-slate-500 hover:text-rose-400 transition-colors p-1" title="Logout">
            <HiOutlineLogout className="text-base" />
          </button>
        </div>
      </div>
    </aside>
  )

  return (
    <>
      {/* Desktop */}
      <div className="hidden lg:block fixed inset-y-0 left-0 w-[260px] z-30">{content}</div>

      {/* Mobile drawer */}
      {open && (
        <div className="lg:hidden fixed inset-0 z-40 flex">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />
          <div className="relative w-[260px] h-full animate-slide-in-right">{content}</div>
        </div>
      )}
    </>
  )
}
