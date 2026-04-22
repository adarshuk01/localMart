import { useState, useCallback } from 'react'
import {
  TbTruck, TbCheck, TbCurrencyRupee, TbMapPin, TbPhone,
  TbHistory, TbChartBar, TbLoader2, TbBuildingStore,
  TbPackage, TbClipboardList, TbUser, TbAlertCircle,
} from 'react-icons/tb'
import {
  StatCard, PageHeader, EmptyState, Spinner, Pagination,
} from '@components/common'
import { useAsync } from '@hooks'
import { deliveryAPI } from '@services/api'
import { useAuth } from '@context/AuthContext'
import { Bar } from 'react-chartjs-2'
import {
  Chart as ChartJS, CategoryScale, LinearScale, BarElement, Tooltip,
} from 'chart.js'
import toast from 'react-hot-toast'
import clsx from 'clsx'

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip)

// ── Helpers ────────────────────────────────────────────────
const STATUS_META = {
  pending:          { label: 'Pending',         cls: 'badge-warning' },
  confirmed:        { label: 'Confirmed',        cls: 'badge-info'    },
  preparing:        { label: 'Preparing',        cls: 'badge-info'    },
  out_for_delivery: { label: 'Out for Delivery', cls: 'badge-primary' },
  delivered:        { label: 'Delivered',        cls: 'badge-success' },
  cancelled:        { label: 'Cancelled',        cls: 'badge-error'   },
  refunded:         { label: 'Refunded',         cls: 'badge-neutral' },
}

function StatusBadge({ status }) {
  const meta = STATUS_META[status] || { label: status, cls: 'badge-neutral' }
  return <span className={meta.cls}>{meta.label}</span>
}

function fmtDate(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
  })
}

// ══════════════════════════════════════════════════════════
//  DELIVERY DASHBOARD
// ══════════════════════════════════════════════════════════
export function DeliveryDashboard() {
  const { user } = useAuth()
  const [marking, setMarking] = useState(null)
  const { data, loading, refetch } = useAsync(() => deliveryAPI.dashboard())

  const active = data?.activeOrders || []
  const stats  = data?.stats        || {}

  const markDelivered = useCallback(async (id) => {
    setMarking(id)
    try {
      await deliveryAPI.markDelivered(id, {})
      toast.success('Order marked as delivered! 🎉')
      refetch()
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to mark delivered.')
    } finally {
      setMarking(null)
    }
  }, [refetch])

  return (
    <div className="space-y-5">
      <PageHeader
        title={`Hi, ${user?.name?.split(' ')[0]} 👋`}
        subtitle="Ready to deliver?"
      />

      {/* Stats — 2-col on mobile, 4-col on sm+ */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard icon={TbTruck}         label="Active"    value={stats.activeOrders   ?? '—'} iconBg="bg-blue-100"   iconColor="text-blue-600"   loading={loading} />
        <StatCard icon={TbCheck}         label="Today"     value={stats.todayDelivered ?? '—'} iconBg="bg-teal-100"   iconColor="text-teal-600"   loading={loading} />
        <StatCard icon={TbClipboardList} label="All Time"  value={stats.totalDelivered ?? '—'} iconBg="bg-amber-100"  iconColor="text-amber-600"  loading={loading} />
        <StatCard icon={TbCurrencyRupee} label="Earnings"  value={stats.totalEarnings ? `₹${stats.totalEarnings}` : '—'} iconBg="bg-violet-100" iconColor="text-violet-600" loading={loading} />
      </div>

      {/* Active Deliveries */}
      <div className="space-y-4">
        <h3 className="font-display font-semibold text-slate-700 text-base">
          Active Deliveries
        </h3>
        {loading
          ? [1, 2].map(i => <div key={i} className="shimmer h-48 rounded-2xl" />)
          : active.length === 0
            ? <EmptyState emoji="✅" title="No active deliveries" description="Orders assigned to you will appear here." />
            : active.map(o => (
              <OrderCard key={o._id} order={o} marking={marking} onDeliver={markDelivered} />
            ))
        }
      </div>
    </div>
  )
}

// ── Reusable active-order card ─────────────────────────────
function OrderCard({ order: o, marking, onDeliver }) {
  const mapUrl = `https://www.google.com/maps/dir/?api=1&destination=${
    o.deliveryAddress?.location?.coordinates?.[1]},${
    o.deliveryAddress?.location?.coordinates?.[0]}`

  return (
    <div className="card animate-slide-up space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-display font-bold text-slate-800">{o.orderNumber}</span>
          <StatusBadge status={o.status} />
        </div>
        <span className="font-bold text-primary-600 text-lg">₹{o.total}</span>
      </div>

      {/* Shop info */}
      {o.shopId && (
        <div className="flex items-center gap-2 text-sm text-slate-600 bg-slate-50 rounded-xl px-3 py-2">
          <TbBuildingStore className="text-slate-400 flex-shrink-0" />
          <span className="font-medium">{o.shopId.name}</span>
          {o.shopId.phone && (
            <a href={`tel:${o.shopId.phone}`} className="ml-auto flex items-center gap-1 text-primary-600">
              <TbPhone className="text-sm" />{o.shopId.phone}
            </a>
          )}
        </div>
      )}

      {/* Delivery address */}
      <div className="bg-blue-50 border border-blue-100 rounded-xl p-3">
        <div className="flex items-start gap-2">
          <TbMapPin className="text-blue-500 text-lg flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-slate-700">
              {o.deliveryAddress?.fullAddress}
            </p>
            <a href={mapUrl} target="_blank" rel="noreferrer"
              className="text-xs text-blue-600 hover:underline mt-0.5 inline-block">
              Open in Maps ↗
            </a>
          </div>
        </div>
      </div>

      {/* Customer */}
      <div className="flex items-center gap-3 text-sm text-slate-600">
        <TbUser className="flex-shrink-0 text-slate-400" />
        <span>{o.userId?.name || 'Customer'}</span>
        {o.userId?.phone && (
          <a href={`tel:${o.userId.phone}`} className="flex items-center gap-1 text-primary-600 ml-auto">
            <TbPhone className="text-sm" />{o.userId.phone}
          </a>
        )}
      </div>

      {/* Items + payment */}
      <div className="flex items-center justify-between text-sm">
        <span className="text-slate-500">
          {o.items?.length} item{o.items?.length !== 1 ? 's' : ''}
        </span>
        <span className="badge-neutral capitalize">
          {o.paymentMethod} · {o.paymentStatus}
        </span>
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <a href={mapUrl} target="_blank" rel="noreferrer"
          className="btn-outline btn-sm flex-1 justify-center">
          <TbMapPin /> Navigate
        </a>
        <button
          onClick={() => onDeliver(o._id)}
          disabled={marking === o._id}
          className="btn-primary btn-sm flex-1 justify-center">
          {marking === o._id ? <Spinner size="sm" /> : <><TbCheck /> Delivered</>}
        </button>
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════
//  DELIVERY ORDERS (active — my assignments)
// ══════════════════════════════════════════════════════════
export function DeliveryOrders() {
  const [marking, setMarking] = useState(null)
  const { data, loading, refetch } = useAsync(() => deliveryAPI.activeOrders())
  const orders = data?.orders || []
  console.log('orders',orders);
  

  const markDelivered = useCallback(async (id) => {
    setMarking(id)
    try {
      await deliveryAPI.markDelivered(id, {})
      toast.success('Delivered! 🎉')
      refetch()
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to mark delivered.')
    } finally {
      setMarking(null)
    }
  }, [refetch])

  return (
    <div className="space-y-5">
      <PageHeader
        title="My Active Orders"
        subtitle={`${orders.length} order${orders.length !== 1 ? 's' : ''} assigned to you`}
      />
      {loading
        ? [1, 2].map(i => <div key={i} className="shimmer h-48 rounded-2xl" />)
        : orders.length === 0
          ? <EmptyState emoji="🎉" title="All clear!" description="No active deliveries assigned to you." />
          : orders.map(o => (
            <OrderCard key={o._id} order={o} marking={marking} onDeliver={markDelivered} />
          ))
      }
    </div>
  )
}

// ══════════════════════════════════════════════════════════
//  SHOP ORDERS — all orders for this delivery person's shop
// ══════════════════════════════════════════════════════════
const SHOP_ORDER_STATUSES = [
  { key: '',                label: 'All'       },
  { key: 'pending',         label: 'Pending'   },
  { key: 'confirmed',       label: 'Confirmed' },
  { key: 'preparing',       label: 'Preparing' },
  { key: 'out_for_delivery',label: 'Out'       },
  { key: 'delivered',       label: 'Delivered' },
  { key: 'cancelled',       label: 'Cancelled' },
]

export function DeliveryShopOrders() {
  const [activeStatus, setActiveStatus] = useState('')
  const [page, setPage]                 = useState(1)

  const { data, loading, error } = useAsync(
    () => deliveryAPI.shopOrders({ status: activeStatus || undefined, page, limit: 15 }),
    [activeStatus, page]
  )

  const orders = data?.orders || []
  const total  = data?.total  || 0

  const handleTabChange = (key) => {
    setActiveStatus(key)
    setPage(1)
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Shop Orders"
        subtitle="All orders placed at your shop"
      />

      {/* Status filter tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
        {SHOP_ORDER_STATUSES.map(s => (
          <button
            key={s.key}
            onClick={() => handleTabChange(s.key)}
            className={clsx(
              'flex-shrink-0 px-3.5 py-1.5 rounded-full text-sm font-medium transition-colors',
              activeStatus === s.key
                ? 'bg-primary-500 text-white shadow-sm'
                : 'bg-white border border-slate-200 text-slate-600 hover:border-primary-300'
            )}>
            {s.label}
          </button>
        ))}
      </div>

      {/* Error (e.g. not assigned to a shop) */}
      {error && (
        <div className="card flex items-center gap-3 text-rose-600 bg-rose-50 border border-rose-100">
          <TbAlertCircle className="text-xl flex-shrink-0" />
          <p className="text-sm">
            {error?.response?.data?.message || 'Could not load shop orders. Make sure you are assigned to a shop.'}
          </p>
        </div>
      )}

      {!error && (
        <>
          <div className="card p-0 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Order #</th>
                    <th>Customer</th>
                    <th>Items</th>
                    <th>Amount</th>
                    <th>Status</th>
                    <th>Assigned To</th>
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {loading
                    ? [1, 2, 3, 4].map(i => (
                      <tr key={i}>
                        {[1, 2, 3, 4, 5, 6, 7].map(j => (
                          <td key={j}><div className="shimmer h-4 rounded" /></td>
                        ))}
                      </tr>
                    ))
                    : orders.length === 0
                      ? (
                        <tr>
                          <td colSpan={7} className="py-10">
                            <EmptyState
                              emoji="📦"
                              title="No orders found"
                              description={activeStatus
                                ? `No ${activeStatus.replace(/_/g, ' ')} orders right now.`
                                : 'No orders placed at your shop yet.'}
                            />
                          </td>
                        </tr>
                      )
                      : orders.map(o => (
                        <tr key={o._id}>
                          <td className="font-mono text-xs font-semibold text-slate-700">
                            {o.orderNumber}
                          </td>
                          <td>
                            <p className="font-medium text-slate-800 text-sm">{o.userId?.name || '—'}</p>
                            {o.userId?.phone && (
                              <a href={`tel:${o.userId.phone}`} className="text-xs text-primary-600 flex items-center gap-0.5">
                                <TbPhone className="text-[11px]" />{o.userId.phone}
                              </a>
                            )}
                          </td>
                          <td className="text-slate-500 text-sm">
                            {o.items?.length ?? 0}
                          </td>
                          <td className="font-semibold text-slate-800">₹{o.total}</td>
                          <td><StatusBadge status={o.status} /></td>
                          <td className="text-sm text-slate-600">
                            {o.deliveryPersonId?.name || (
                              <span className="text-slate-400 italic text-xs">Unassigned</span>
                            )}
                          </td>
                          <td className="text-slate-400 text-xs whitespace-nowrap">
                            {fmtDate(o.createdAt)}
                          </td>
                        </tr>
                      ))
                  }
                </tbody>
              </table>
            </div>
          </div>

          {total > 15 && (
            <Pagination
              page={page}
              total={Math.ceil(total / 15)}
              onChange={setPage}
            />
          )}

          {!loading && orders.length > 0 && (
            <p className="text-xs text-slate-400 text-center">
              Showing {orders.length} of {total} orders
            </p>
          )}
        </>
      )}
    </div>
  )
}

// ══════════════════════════════════════════════════════════
//  DELIVERY HISTORY
// ══════════════════════════════════════════════════════════
export function DeliveryHistory() {
  const [page, setPage] = useState(1)
  const { data, loading } = useAsync(
    () => deliveryAPI.history({ page, limit: 15 }),
    [page]
  )
  const orders = data?.orders || []

  return (
    <div className="space-y-5">
      <PageHeader
        title="Delivery History"
        subtitle={`${data?.total || 0} completed deliveries`}
      />

      <div className="card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Order</th>
                <th>Address</th>
                <th>Shop</th>
                <th>Amount</th>
                <th>Earning</th>
                <th>Delivered</th>
              </tr>
            </thead>
            <tbody>
              {loading
                ? [1, 2, 3].map(i => (
                  <tr key={i}>
                    {[1, 2, 3, 4, 5, 6].map(j => (
                      <td key={j}><div className="shimmer h-4 rounded" /></td>
                    ))}
                  </tr>
                ))
                : orders.length === 0
                  ? (
                    <tr>
                      <td colSpan={6} className="text-center py-10 text-slate-400">
                        No deliveries yet.
                      </td>
                    </tr>
                  )
                  : orders.map(o => (
                    <tr key={o._id}>
                      <td className="font-mono text-xs font-semibold">{o.orderNumber}</td>
                      <td className="text-slate-500 text-xs max-w-[130px] truncate">
                        {o.deliveryAddress?.fullAddress || '—'}
                      </td>
                      <td className="text-slate-600 text-sm">{o.shopId?.name || '—'}</td>
                      <td className="font-medium">₹{o.total}</td>
                      <td className="text-teal-600 font-semibold">
                        {o.deliveryFee != null ? `₹${o.deliveryFee}` : '—'}
                      </td>
                      <td className="text-slate-400 text-xs whitespace-nowrap">
                        {fmtDate(o.deliveredAt)}
                      </td>
                    </tr>
                  ))
              }
            </tbody>
          </table>
        </div>
      </div>

      <Pagination
        page={page}
        total={Math.ceil((data?.total || 0) / 15)}
        onChange={setPage}
      />
    </div>
  )
}

// ══════════════════════════════════════════════════════════
//  DELIVERY EARNINGS
// ══════════════════════════════════════════════════════════
export function DeliveryEarnings() {
  const { data, loading } = useAsync(() => deliveryAPI.earnings())
  const byMonth = data?.byMonth || []

  const MONTH = ['','Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

  const chart = {
    labels: byMonth.map(m => `${MONTH[m._id.month]} ${m._id.year}`),
    datasets: [{
      label:           'Earnings',
      data:            byMonth.map(m => m.earnings),
      backgroundColor: '#14b8a640',
      borderColor:     '#14b8a6',
      borderWidth:     2,
      borderRadius:    8,
    }],
  }

  const chartOptions = {
    responsive: true,
    plugins: { legend: { display: false } },
    scales: {
      x: { grid: { display: false }, ticks: { font: { family: 'DM Sans', size: 11 } } },
      y: { grid: { color: '#f1f5f9' }, ticks: { font: { family: 'DM Sans', size: 11 }, callback: v => `₹${v}` } },
    },
  }

  return (
    <div className="space-y-5">
      <PageHeader title="My Earnings" subtitle="Monthly earnings breakdown" />

      <div className="grid grid-cols-2 gap-4">
        <div className="card text-center">
          <p className="text-3xl font-display font-bold text-teal-600">₹{data?.totalEarnings || 0}</p>
          <p className="text-xs text-slate-500 mt-1">Total Earned</p>
        </div>
        <div className="card text-center">
          <p className="text-3xl font-display font-bold text-violet-600">{data?.totalDeliveries || 0}</p>
          <p className="text-xs text-slate-500 mt-1">Total Deliveries</p>
        </div>
      </div>

      <div className="card">
        <h3 className="font-display font-semibold text-slate-700 mb-4">Monthly Earnings</h3>
        {loading
          ? <div className="shimmer h-40 rounded-xl" />
          : byMonth.length
            ? <Bar data={chart} options={chartOptions} height={130} />
            : <p className="text-slate-400 text-sm text-center py-8">No earnings data yet.</p>
        }
      </div>
    </div>
  )
}
