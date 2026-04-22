import { useState } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import { Line, Doughnut, Bar } from 'react-chartjs-2'
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Tooltip, Legend, Filler } from 'chart.js'
import { TbBuildingStore, TbUsers, TbShoppingCart, TbCurrencyRupee, TbCheck, TbX, TbEye, TbMapPin, TbPhone, TbMail, TbArrowLeft, TbClock, TbStar, TbShield, TbTruck, TbUser, TbTrash, TbEdit, TbBell, TbSettings, TbFilter } from 'react-icons/tb'
import { StatCard, PageHeader, SearchInput, Modal, DataTable, Spinner, EmptyState, ConfirmDialog, ErrorAlert, Pagination } from '@components/common'
import { Avatar } from '@components/common'
import { useAsync, useDebounce, useToggle } from '@hooks'
import { adminAPI } from '@services/api'
import { format } from 'date-fns'
import toast from 'react-hot-toast'
import clsx from 'clsx'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Tooltip, Legend, Filler)

const chartFont = { family: 'DM Sans', size: 11 }
const baseOpts  = { responsive: true, plugins: { legend: { display: false } }, scales: { x: { grid: { display: false }, ticks: { font: chartFont } }, y: { grid: { color: '#f1f5f9' }, ticks: { font: chartFont } } } }

const STATUS_CFG = {
  approved:  { cls: 'badge-success', label: 'Approved'  },
  pending:   { cls: 'badge-warning', label: 'Pending'   },
  rejected:  { cls: 'badge-danger',  label: 'Rejected'  },
  suspended: { cls: 'badge-neutral', label: 'Suspended' },
}

const ROLE_CFG = {
  admin:      { cls: 'bg-violet-100 text-violet-700', label: 'Admin'      },
  shopkeeper: { cls: 'bg-teal-100 text-teal-700',     label: 'Shopkeeper' },
  delivery:   { cls: 'bg-orange-100 text-orange-700', label: 'Delivery'   },
  user:       { cls: 'bg-blue-100 text-blue-700',     label: 'User'       },
  stock:      { cls: 'bg-slate-100 text-slate-700',   label: 'Stock'      },
  cashier:    { cls: 'bg-slate-100 text-slate-700',   label: 'Cashier'    },
}

const CAT_MAP = {
  grocery:'🛒', salon:'✂️', pharmacy:'💊', bakery:'🍞',
  restaurant:'🍽️', electronics:'📱', clothing:'👕', hardware:'🔧',
}

// ══════════════════════════════════════════════════════════
//  ADMIN DASHBOARD
// ══════════════════════════════════════════════════════════
export function AdminDashboard() {
  const { data, loading, error, refetch } = useAsync(() => adminAPI.dashboard())

  const d = data?.stats || {}
  const monthly = data?.monthlyRevenue || []

  const revenueChart = {
    labels: monthly.map(m => `${m._id.month}/${m._id.year}`),
    datasets: [{ label:'Revenue', data: monthly.map(m => m.revenue), fill:true, borderColor:'#14b8a6', backgroundColor:'rgba(20,184,166,0.08)', tension:0.4, pointRadius:4, pointBackgroundColor:'#14b8a6' }],
  }
  const statusChart = {
    labels: ['Approved','Pending','Rejected'],
    datasets: [{ data: [d.approvedShops||0, d.pendingShops||0, (d.totalShops||0)-(d.approvedShops||0)-(d.pendingShops||0)], backgroundColor:['#14b8a6','#f59e0b','#f43f5e'], borderWidth:0 }],
  }

  return (
    <div className="space-y-5">
      <PageHeader title="Dashboard" subtitle={format(new Date(),'EEEE, d MMMM yyyy')} />
      <ErrorAlert message={error} onRetry={refetch} />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 animate-stagger">
        <StatCard icon={TbBuildingStore}  label="Active Shops"    value={d.approvedShops ?? '—'}  iconBg="bg-teal-100"   iconColor="text-teal-600"   loading={loading} />
        <StatCard icon={TbClock}          label="Pending Shops"   value={d.pendingShops  ?? '—'}  iconBg="bg-amber-100"  iconColor="text-amber-600"  loading={loading} />
        <StatCard icon={TbShoppingCart}   label="Total Orders"    value={d.totalOrders   ?? '—'}  iconBg="bg-blue-100"   iconColor="text-blue-600"   loading={loading} />
        <StatCard icon={TbCurrencyRupee}  label="Revenue"         value={d.totalRevenue ? `₹${(d.totalRevenue/1000).toFixed(0)}k` : '—'} iconBg="bg-violet-100" iconColor="text-violet-600" loading={loading} />
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        <div className="card lg:col-span-2">
          <h3 className="font-display font-semibold text-slate-700 mb-4">Revenue Trend</h3>
          {loading ? <div className="shimmer h-40 rounded-xl" /> : <Line data={revenueChart} options={{ ...baseOpts, scales: { ...baseOpts.scales, y: { ...baseOpts.scales.y, ticks: { ...baseOpts.scales.y.ticks, callback: v => `₹${(v/1000).toFixed(0)}k` } } } }} height={100} />}
        </div>
        <div className="card">
          <h3 className="font-display font-semibold text-slate-700 mb-4">Shop Status</h3>
          {loading ? <div className="shimmer h-40 rounded-xl" /> : <Doughnut data={statusChart} options={{ responsive:true, cutout:'68%', plugins:{ legend:{ position:'bottom', labels:{ font: chartFont, boxWidth:12 } } } }} />}
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <div className="card">
          <h3 className="font-display font-semibold text-slate-700 mb-4">Recent Shops</h3>
          {loading ? [1,2,3].map(i => <div key={i} className="shimmer h-14 rounded-xl mb-2" />) : (data?.recentShops || []).map(s => (
            <Link key={s._id} to={`/admin/shops/${s._id}`} className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 transition-colors">
              <div className="w-10 h-10 bg-primary-100 rounded-xl flex items-center justify-center text-xl flex-shrink-0">{CAT_MAP[s.category] || '🏪'}</div>
              <div className="flex-1 min-w-0"><p className="text-sm font-medium text-slate-700 truncate">{s.name}</p><p className="text-xs text-slate-400">{s.address?.full}</p></div>
              <span className={STATUS_CFG[s.status]?.cls}>{STATUS_CFG[s.status]?.label}</span>
            </Link>
          ))}
        </div>
        <div className="card">
          <h3 className="font-display font-semibold text-slate-700 mb-4">Recent Orders</h3>
          {loading ? [1,2,3].map(i => <div key={i} className="shimmer h-14 rounded-xl mb-2" />) : (data?.recentOrders || []).map(o => (
            <div key={o._id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl mb-2">
              <div className="flex-1 min-w-0"><p className="text-sm font-medium text-slate-700">{o.orderNumber}</p><p className="text-xs text-slate-400">{o.userId?.name} → {o.shopId?.name}</p></div>
              <span className="text-primary-600 font-bold text-sm">₹{o.total}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════
//  ADMIN SHOPS LIST
// ══════════════════════════════════════════════════════════
export function AdminShops() {
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all')
  const [page, setPage]     = useState(1)
  const dSearch             = useDebounce(search)
  const [rejectModal, setRejectModal] = useState(null)
  const [rejectReason, setRejectReason] = useState('')
  const [loadingId, setLoadingId] = useState(null)

  const { data, loading, refetch } = useAsync(
    () => adminAPI.shops({ search: dSearch, ...(filter !== 'all' && { status: filter }), page, limit: 12 }),
    [dSearch, filter, page]
  )

  const shops = data?.shops || []

  const approve = async (id) => {
    setLoadingId(id)
    try { await adminAPI.approveShop(id); toast.success('Shop approved!'); refetch() } catch {} finally { setLoadingId(null) }
  }
  const reject  = async () => {
    if (!rejectReason.trim()) { toast.error('Provide a reason.'); return }
    setLoadingId(rejectModal._id)
    try { await adminAPI.rejectShop(rejectModal._id, { reason: rejectReason }); toast.success('Shop rejected.'); refetch(); setRejectModal(null); setRejectReason('') } catch {} finally { setLoadingId(null) }
  }

  return (
    <div className="space-y-5">
      <PageHeader title="Shop Management" subtitle={`${data?.total || 0} shops on the platform`} />

      <div className="card flex flex-col sm:flex-row gap-3 items-start sm:items-center flex-wrap">
        <SearchInput value={search} onChange={setSearch} placeholder="Search shops…" className="w-full sm:w-64" />
        <div className="flex gap-2 flex-wrap">
          {['all','approved','pending','rejected','suspended'].map(f => (
            <button key={f} onClick={() => { setFilter(f); setPage(1) }}
              className={clsx('btn btn-sm capitalize', filter === f ? 'btn-primary' : 'btn-secondary')}>{f}</button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">{[1,2,3,4,5,6].map(i => <div key={i} className="shimmer h-56 rounded-2xl" />)}</div>
      ) : shops.length === 0 ? <EmptyState emoji="🏪" title="No shops found" description="Try adjusting your search or filter." /> : (
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4 animate-stagger">
          {shops.map(s => {
            const st = STATUS_CFG[s.status]
            return (
              <div key={s._id} className="card-hover">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-primary-100 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0">{CAT_MAP[s.category] || '🏪'}</div>
                    <div><h3 className="font-display font-semibold text-slate-800 text-sm leading-tight">{s.name}</h3><p className="text-xs text-slate-500 capitalize">{s.category}</p></div>
                  </div>
                  <span className={st?.cls}>{st?.label}</span>
                </div>
                <p className="text-xs text-slate-500 flex items-center gap-1 mb-1"><TbMapPin className="flex-shrink-0" /><span className="truncate">{s.address?.full}</span></p>
                <p className="text-xs text-slate-500 flex items-center gap-1 mb-3"><TbPhone className="flex-shrink-0" />{s.phone}</p>
                {s.rejectionReason && <div className="bg-rose-50 border border-rose-100 rounded-xl p-2 mb-3"><p className="text-xs text-rose-700"><b>Rejected:</b> {s.rejectionReason}</p></div>}
                <div className="flex gap-2 pt-3 border-t border-slate-100">
                  <Link to={`/admin/shops/${s._id}`} className="btn-ghost btn-sm flex-1 justify-center"><TbEye /> View</Link>
                  {s.status !== 'approved'  && <button onClick={() => approve(s._id)} disabled={loadingId === s._id} className="btn-primary btn-sm flex-1 justify-center"><TbCheck /> Approve</button>}
                  {s.status !== 'rejected'  && <button onClick={() => setRejectModal(s)} className="btn-danger btn-sm flex-1 justify-center"><TbX /> Reject</button>}
                </div>
              </div>
            )
          })}
        </div>
      )}
      <Pagination page={page} total={Math.ceil((data?.total||0)/12)} onChange={setPage} />

      <Modal open={!!rejectModal} onClose={() => setRejectModal(null)} title="Reject Shop"
        footer={<><button onClick={() => setRejectModal(null)} className="btn-secondary">Cancel</button><button onClick={reject} disabled={!!loadingId} className="btn-danger">{loadingId ? <Spinner size="sm" /> : 'Reject'}</button></>}>
        <p className="text-sm text-slate-600 mb-3">Rejecting <b>{rejectModal?.name}</b>. Please provide a reason:</p>
        <textarea className="form-input resize-none h-24" placeholder="e.g. Documents incomplete…" value={rejectReason} onChange={e => setRejectReason(e.target.value)} />
      </Modal>
    </div>
  )
}

// ══════════════════════════════════════════════════════════
//  ADMIN SHOP DETAIL
// ══════════════════════════════════════════════════════════
export function AdminShopDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [loadingAction, setLoadingAction] = useState(null)
  const [rejectModal, showReject] = useToggle()
  const [rejectReason, setRejectReason] = useState('')

  const { data, loading, refetch } = useAsync(() => adminAPI.shopById(id), [id])
  const shop = data?.shop

  const approve = async () => {
    setLoadingAction('approve')
    try { await adminAPI.approveShop(id); toast.success('Shop approved!'); refetch() } catch {} finally { setLoadingAction(null) }
  }
  const reject = async () => {
    if (!rejectReason.trim()) { toast.error('Provide a reason.'); return }
    setLoadingAction('reject')
    try { await adminAPI.rejectShop(id, { reason: rejectReason }); toast.success('Shop rejected.'); refetch(); showReject.setOff(); setRejectReason('') } catch {} finally { setLoadingAction(null) }
  }

  if (loading) return <div className="space-y-4">{[1,2,3].map(i => <div key={i} className="shimmer h-32 rounded-2xl" />)}</div>
  if (!shop) return <EmptyState emoji="🔍" title="Shop not found" action={<button onClick={() => navigate('/admin/shops')} className="btn-primary">Back to shops</button>} />

  const lat = shop.location?.coordinates?.[1]
  const lng = shop.location?.coordinates?.[0]

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        <button onClick={() => navigate('/admin/shops')} className="btn-ghost btn-sm"><TbArrowLeft /> Back</button>
      </div>

      <div className="card">
        <div className="flex flex-col sm:flex-row sm:items-start gap-4">
          <div className="w-16 h-16 bg-primary-100 rounded-2xl flex items-center justify-center text-3xl flex-shrink-0">{CAT_MAP[shop.category] || '🏪'}</div>
          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <h1 className="page-title">{shop.name}</h1>
              <span className={STATUS_CFG[shop.status]?.cls}>{STATUS_CFG[shop.status]?.label}</span>
            </div>
            <p className="text-slate-500 text-sm mb-3">{shop.description}</p>
            <div className="flex flex-wrap gap-4 text-sm text-slate-500">
              {shop.address?.full && <span className="flex items-center gap-1"><TbMapPin className="text-primary-500 flex-shrink-0" />{shop.address.full}</span>}
              {shop.phone && <span className="flex items-center gap-1"><TbPhone className="text-primary-500" />{shop.phone}</span>}
              {shop.email && <span className="flex items-center gap-1"><TbMail className="text-primary-500" />{shop.email}</span>}
              {shop.ratingsAverage > 0 && <span className="flex items-center gap-1"><TbStar className="text-amber-400" />{shop.ratingsAverage} ({shop.ratingsCount})</span>}
            </div>
          </div>
          <div className="flex gap-2 flex-shrink-0 flex-wrap">
            {shop.status !== 'approved' && <button onClick={approve} disabled={!!loadingAction} className="btn-primary btn-sm"><TbCheck /> Approve</button>}
            {shop.status !== 'rejected' && <button onClick={showReject.setOn} className="btn-danger btn-sm"><TbX /> Reject</button>}
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        <div className="card lg:col-span-2">
          <h3 className="font-display font-semibold text-slate-700 mb-3">Location</h3>
          {lat && lng ? (
            <iframe title="map" className="w-full rounded-xl border-0" style={{height:260}} loading="lazy"
              src={`https://www.openstreetmap.org/export/embed.html?bbox=${lng-.01}%2C${lat-.01}%2C${lng+.01}%2C${lat+.01}&layer=mapnik&marker=${lat}%2C${lng}`} />
          ) : <div className="bg-slate-100 rounded-xl h-40 flex items-center justify-center text-slate-400 text-sm">No location data</div>}
        </div>
        <div className="card">
          <h3 className="font-display font-semibold text-slate-700 mb-3">Details</h3>
          {[
            ['Products', data?.products?.length || 0],
            ['Reviews',  data?.reviews?.length  || 0],
            ['Rating',   shop.ratingsAverage > 0 ? `${shop.ratingsAverage}/5` : 'None'],
            ['Delivery', shop.deliveryEnabled ? `${shop.deliveryRadius}km radius` : 'Disabled'],
            ['Min Order',`₹${shop.minOrderAmount}`],
            ['Owner',    shop.ownerId?.name || '—'],
          ].map(([l,v]) => (
            <div key={l} className="flex justify-between text-sm py-1.5 border-b border-slate-100 last:border-0">
              <span className="text-slate-500">{l}</span><span className="font-medium text-slate-700">{v}</span>
            </div>
          ))}
        </div>
      </div>

      {data?.products?.length > 0 && (
        <div className="card">
          <h3 className="font-display font-semibold text-slate-700 mb-4">Products ({data.products.length})</h3>
          <div className="table-wrapper">
            <table className="data-table">
              <thead><tr><th>Name</th><th>Category</th><th>Price</th><th>Stock</th><th>Status</th></tr></thead>
              <tbody>{data.products.map(p => (
                <tr key={p._id}><td className="font-medium">{p.name}</td><td className="text-slate-500">{p.category}</td><td>₹{p.price}</td><td>{p.stock}</td><td>{p.isActive ? <span className="badge-success">Active</span> : <span className="badge-neutral">Inactive</span>}</td></tr>
              ))}</tbody>
            </table>
          </div>
        </div>
      )}

      <Modal open={rejectModal} onClose={showReject.setOff} title="Reject Shop"
        footer={<><button onClick={showReject.setOff} className="btn-secondary">Cancel</button><button onClick={reject} disabled={!!loadingAction} className="btn-danger">{loadingAction ? <Spinner size="sm" /> : 'Confirm Reject'}</button></>}>
        <textarea className="form-input resize-none h-24" placeholder="Rejection reason…" value={rejectReason} onChange={e => setRejectReason(e.target.value)} />
      </Modal>
    </div>
  )
}

// ══════════════════════════════════════════════════════════
//  ADMIN USERS
// ══════════════════════════════════════════════════════════
export function AdminUsers() {
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all')
  const [page, setPage]     = useState(1)
  const dSearch             = useDebounce(search)
  const [suspendTarget, setSuspend] = useState(null)
  const [loadingId, setLoadingId]   = useState(null)

  const { data, loading, refetch } = useAsync(
    () => adminAPI.users({ search: dSearch, ...(filter !== 'all' && { role: filter }), page, limit: 15 }),
    [dSearch, filter, page]
  )

  const users = data?.users || []

  const suspend = async () => {
    setLoadingId(suspendTarget._id)
    try { await adminAPI.suspendUser(suspendTarget._id); toast.success('User suspended.'); refetch(); setSuspend(null) } catch {} finally { setLoadingId(null) }
  }

  const COLS = [
    { key:'name',  label:'User', render:(_, u) => <div className="flex items-center gap-3"><Avatar name={u.name} size="sm" src={u.avatar} /><div><p className="font-medium">{u.name}</p><p className="text-xs text-slate-400">{u.email}</p></div></div> },
    { key:'role',  label:'Role', render:(v) => <span className={clsx('badge', ROLE_CFG[v]?.cls)}>{ROLE_CFG[v]?.label || v}</span> },
    { key:'phone', label:'Phone', render:(v) => <span className="text-slate-500 text-xs">{v || '—'}</span> },
    { key:'isActive', label:'Active', render:(v) => v ? <span className="badge-success">Active</span> : <span className="badge-neutral">Inactive</span> },
    { key:'_id',   label:'Actions', render:(_, u) => <div className="flex gap-2">{u.role !== 'admin' && <button onClick={() => setSuspend(u)} className="text-rose-500 hover:text-rose-700 text-xs font-medium">Suspend</button>}</div> },
  ]

  return (
    <div className="space-y-5">
      <PageHeader title="Users" subtitle={`${data?.total || 0} registered`} />
      <div className="card flex flex-col sm:flex-row gap-3 items-start sm:items-center flex-wrap">
        <SearchInput value={search} onChange={setSearch} placeholder="Search users…" className="w-full sm:w-64" />
        <div className="flex gap-2 flex-wrap">
          {['all','admin','shopkeeper','delivery','user'].map(r => (
            <button key={r} onClick={() => { setFilter(r); setPage(1) }} className={clsx('btn btn-sm capitalize', filter === r ? 'btn-primary' : 'btn-secondary')}>{r}</button>
          ))}
        </div>
      </div>
      <div className="card p-0 overflow-hidden"><DataTable columns={COLS} data={users} loading={loading} emptyMsg="No users found." /></div>
      <Pagination page={page} total={Math.ceil((data?.total||0)/15)} onChange={setPage} />
      <ConfirmDialog open={!!suspendTarget} onClose={() => setSuspend(null)} onConfirm={suspend} title="Suspend User" message={`Are you sure you want to suspend ${suspendTarget?.name}?`} confirmLabel="Suspend" danger loading={!!loadingId} />
    </div>
  )
}

// ══════════════════════════════════════════════════════════
//  ADMIN ANALYTICS
// ══════════════════════════════════════════════════════════
export function AdminAnalytics() {
  const { data, loading } = useAsync(() => adminAPI.analytics())
  const monthly  = data?.revenueByMonth    || []
  const byCat    = data?.revenueByCategory || []
  const topShops = data?.topShops          || []

  const revenueChart = {
    labels: monthly.map(m => `${m._id.month}/${m._id.year}`),
    datasets: [{ label:'Revenue', data: monthly.map(m => m.revenue), fill:true, borderColor:'#14b8a6', backgroundColor:'rgba(20,184,166,0.08)', tension:0.4, pointRadius:4 }],
  }
  const ordersChart = {
    labels: monthly.map(m => `${m._id.month}/${m._id.year}`),
    datasets: [{ label:'Orders', data: monthly.map(m => m.orders), backgroundColor:'#6366f140', borderColor:'#6366f1', borderWidth:2, borderRadius:8 }],
  }
  const catChart = {
    labels: byCat.map(c => c._id),
    datasets: [{ data: byCat.map(c => c.revenue), backgroundColor:['#14b8a6','#6366f1','#f59e0b','#f43f5e','#3b82f6','#8b5cf6','#ec4899'], borderWidth:0 }],
  }

  return (
    <div className="space-y-5">
      <PageHeader title="Analytics" subtitle="Platform revenue & growth overview" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        {loading ? [1,2,3,4].map(i => <div key={i} className="shimmer h-24 rounded-2xl" />) : [
          { label:'Total Revenue',  value: data ? `₹${(monthly.reduce((s,m) => s+m.revenue,0)/1000).toFixed(0)}k` : '—', color:'text-teal-600'   },
          { label:'Total Orders',   value: data ? monthly.reduce((s,m) => s+m.orders,0).toLocaleString() : '—',             color:'text-violet-600' },
          { label:'Top Category',   value: byCat[0]?._id || '—',                                                             color:'text-blue-600'   },
          { label:'Active Shops',   value: topShops.length || '—',                                                            color:'text-amber-600'  },
        ].map(k => <div key={k.label} className="card text-center"><p className={`text-2xl font-display font-bold ${k.color}`}>{k.value}</p><p className="text-xs text-slate-500 mt-1">{k.label}</p></div>)}
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <div className="card">{loading ? <div className="shimmer h-40 rounded-xl" /> : <><h3 className="font-display font-semibold text-slate-700 mb-4">Revenue Trend</h3><Line data={revenueChart} options={{ ...baseOpts, scales: { ...baseOpts.scales, y: { ...baseOpts.scales.y, ticks: { ...baseOpts.scales.y.ticks, callback: v => `₹${(v/1000).toFixed(0)}k` } } } }} height={120} /></>}</div>
        <div className="card">{loading ? <div className="shimmer h-40 rounded-xl" /> : <><h3 className="font-display font-semibold text-slate-700 mb-4">Monthly Orders</h3><Bar data={ordersChart} options={baseOpts} height={120} /></>}</div>
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        <div className="card lg:col-span-2">
          <h3 className="font-display font-semibold text-slate-700 mb-4">Top Shops by Revenue</h3>
          {loading ? <div className="shimmer h-32 rounded-xl" /> : topShops.map((s,i) => (
            <div key={s._id} className="flex items-center gap-3 py-2.5 border-b border-slate-100 last:border-0">
              <span className="w-6 h-6 rounded-full bg-primary-100 text-primary-700 text-xs font-bold flex items-center justify-center flex-shrink-0">{i+1}</span>
              <div className="flex-1 min-w-0"><p className="text-sm font-medium text-slate-700 truncate">{s.shopName}</p><p className="text-xs text-slate-400">{s.orders} orders</p></div>
              <p className="font-bold text-primary-600 text-sm">₹{s.revenue.toLocaleString()}</p>
            </div>
          ))}
        </div>
        <div className="card">
          <h3 className="font-display font-semibold text-slate-700 mb-4">Revenue by Category</h3>
          {loading ? <div className="shimmer h-40 rounded-xl" /> : <Doughnut data={catChart} options={{ responsive:true, cutout:'60%', plugins:{ legend:{ position:'bottom', labels:{ font:chartFont, boxWidth:10 } } } }} />}
        </div>
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════
//  ADMIN SETTINGS
// ══════════════════════════════════════════════════════════
export function AdminSettings() {
  const [form, setForm] = useState({ platformName:'LocalMart', supportEmail:'support@localmart.in', currency:'INR', timezone:'Asia/Kolkata', autoApproveShops:false, notifyOnOrder:true, notifyOnShopRequest:true, maintenanceMode:false })
  const Toggle = ({ k, label, sub }) => {
    const { Toggle: T } = require('@components/common')
    return (
      <div className="flex items-start justify-between py-3 border-b border-slate-100 last:border-0">
        <div><p className="text-sm font-medium text-slate-700">{label}</p>{sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}</div>
        <T checked={form[k]} onChange={v => setForm(p => ({...p, [k]:v}))} />
      </div>
    )
  }
  return (
    <div className="space-y-5 max-w-2xl">
      <PageHeader title="Settings" subtitle="Configure your platform" />
      <div className="card space-y-4">
        <h3 className="font-display font-semibold text-slate-700">General</h3>
        {[{key:'platformName',label:'Platform Name'},{key:'supportEmail',label:'Support Email',type:'email'}].map(f => (
          <div key={f.key}><label className="form-label">{f.label}</label><input type={f.type||'text'} className="form-input" value={form[f.key]} onChange={e => setForm(p => ({...p,[f.key]:e.target.value}))} /></div>
        ))}
        <div className="grid grid-cols-2 gap-4">
          <div><label className="form-label">Currency</label><select className="form-input" value={form.currency} onChange={e => setForm(p => ({...p,currency:e.target.value}))}><option>INR</option><option>USD</option></select></div>
          <div><label className="form-label">Timezone</label><select className="form-input" value={form.timezone} onChange={e => setForm(p => ({...p,timezone:e.target.value}))}><option>Asia/Kolkata</option><option>UTC</option></select></div>
        </div>
      </div>
      <div className="card">
        <h3 className="font-display font-semibold text-slate-700 mb-2">Notifications</h3>
        <div className="flex items-start justify-between py-3 border-b border-slate-100"><div><p className="text-sm font-medium text-slate-700">Order placed</p></div><button onClick={() => setForm(p => ({...p,notifyOnOrder:!p.notifyOnOrder}))} className={`relative inline-flex w-11 h-6 rounded-full transition-colors ${form.notifyOnOrder ? 'bg-primary-500' : 'bg-slate-200'}`}><span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${form.notifyOnOrder ? 'translate-x-5' : ''}`} /></button></div>
        <div className="flex items-start justify-between py-3"><div><p className="text-sm font-medium text-slate-700">Shop applications</p></div><button onClick={() => setForm(p => ({...p,notifyOnShopRequest:!p.notifyOnShopRequest}))} className={`relative inline-flex w-11 h-6 rounded-full transition-colors ${form.notifyOnShopRequest ? 'bg-primary-500' : 'bg-slate-200'}`}><span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${form.notifyOnShopRequest ? 'translate-x-5' : ''}`} /></button></div>
      </div>
      <button onClick={() => toast.success('Settings saved!')} className="btn-primary px-8">Save Settings</button>
    </div>
  )
}
