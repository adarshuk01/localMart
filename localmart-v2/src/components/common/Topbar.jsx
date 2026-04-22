import { useState } from 'react'
import { HiOutlineBell, HiMenuAlt2 } from 'react-icons/hi'
import { TbBellRinging } from 'react-icons/tb'
import { useAsync } from '@hooks'
import { userAPI } from '@services/api'
import { useAuth } from '@context/AuthContext'
import { Avatar } from '@components/common'
import clsx from 'clsx'

export default function Topbar({ title, onMenuToggle }) {
  const { user } = useAuth()
  const [showNotif, setShowNotif] = useState(false)

  const { data, refetch } = useAsync(
    () => user?.role === 'user' ? userAPI.notifications() : Promise.resolve({ data: { notifications: [], unreadCount: 0 } }),
    [user?.role]
  )

  const notifications = data?.notifications || []
  const unread        = data?.unreadCount    || 0

  const markRead = async () => {
    if (unread > 0 && user?.role === 'user') {
      await userAPI.markRead().catch(() => {})
      refetch()
    }
  }

  const typeIcon = { order_update:'📦', shop_approved:'🎉', shop_rejected:'❌', low_stock:'⚠️', new_review:'⭐', promo:'🎁', system:'🔔' }

  return (
    <header className="fixed top-0 right-0 left-0 lg:left-[260px] h-[60px] bg-white border-b border-slate-100 flex items-center px-4 md:px-6 gap-3 z-20">
      <button onClick={onMenuToggle} className="lg:hidden btn-ghost p-2 -ml-1">
        <HiMenuAlt2 className="text-xl text-slate-600" />
      </button>

      <h2 className="font-display font-semibold text-slate-700 text-sm md:text-base hidden sm:block">{title}</h2>
      <div className="flex-1" />

      {/* Notifications bell */}
      <div className="relative">
        <button onClick={() => { setShowNotif(p => !p); if (!showNotif) markRead() }}
          className="relative w-9 h-9 flex items-center justify-center rounded-xl hover:bg-slate-100 transition-colors">
          {unread > 0
            ? <TbBellRinging className="text-xl text-primary-600 animate-pulse" />
            : <HiOutlineBell className="text-xl text-slate-600" />}
          {unread > 0 && (
            <span className="absolute top-1 right-1 w-4 h-4 bg-rose-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">{Math.min(unread, 9)}</span>
          )}
        </button>

        {showNotif && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setShowNotif(false)} />
            <div className="absolute right-0 top-11 w-80 bg-white rounded-2xl shadow-xl border border-slate-100 z-20 animate-slide-up overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
                <span className="font-display font-semibold text-slate-700 text-sm">Notifications</span>
                {unread > 0 && <span className="badge-danger">{unread} new</span>}
              </div>
              <div className="max-h-72 overflow-y-auto divide-y divide-slate-50">
                {notifications.length === 0
                  ? <p className="text-center py-8 text-slate-400 text-sm">No notifications</p>
                  : notifications.map(n => (
                    <div key={n._id} className={clsx('px-4 py-3', !n.isRead && 'bg-primary-50/50')}>
                      <div className="flex items-start gap-3">
                        <span className="text-lg flex-shrink-0">{typeIcon[n.type] || '🔔'}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-700">{n.title}</p>
                          <p className="text-xs text-slate-500 mt-0.5">{n.body}</p>
                        </div>
                        {!n.isRead && <div className="w-2 h-2 bg-primary-500 rounded-full flex-shrink-0 mt-1.5" />}
                      </div>
                    </div>
                  ))
                }
              </div>
            </div>
          </>
        )}
      </div>

      {/* Avatar */}
      <Avatar name={user?.name} size="sm" src={user?.avatar} className="flex-shrink-0" />
    </header>
  )
}
