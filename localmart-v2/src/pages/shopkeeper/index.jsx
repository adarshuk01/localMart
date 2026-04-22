import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Line, Bar } from 'react-chartjs-2'
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, BarElement, Tooltip, Filler } from 'chart.js'
import { TbPackage, TbPlus, TbEdit, TbTrash, TbToggleRight, TbToggleLeft, TbShoppingCart, TbTruck, TbCheck, TbX, TbUsers, TbAlertCircle, TbStar, TbMapPin, TbCamera, TbCurrencyRupee, TbChartBar, TbClipboardList, TbRefresh } from 'react-icons/tb'
import { StatCard, PageHeader, SearchInput, Modal, DataTable, Spinner, EmptyState, ConfirmDialog, Avatar, FormField, ErrorAlert, Pagination } from '@components/common'
import { useAsync, useDebounce, useToggle } from '@hooks'
import { shopkeeperAPI } from '@services/api'
import { useAuth } from '@context/AuthContext'
import toast from 'react-hot-toast'
import clsx from 'clsx'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Tooltip, Filler)
const chartFont = { family: 'DM Sans', size: 11 }
const baseOpts  = { responsive:true, plugins:{ legend:{ display:false } }, scales:{ x:{ grid:{ display:false }, ticks:{ font:chartFont } }, y:{ grid:{ color:'#f1f5f9' }, ticks:{ font:chartFont } } } }

const STATUS_CFG = {
  pending:          { cls:'badge-warning', label:'Pending',          next:'confirmed',        nextLabel:'Confirm Order'   },
  confirmed:        { cls:'badge-info',    label:'Confirmed',        next:'preparing',        nextLabel:'Start Preparing' },
  preparing:        { cls:'badge-info',    label:'Preparing',        next:'out_for_delivery', nextLabel:'Ready for Delivery' },
  out_for_delivery: { cls:'badge-info',    label:'Out for Delivery', next:'delivered',        nextLabel:'Mark Delivered'  },
  delivered:        { cls:'badge-success', label:'Delivered'        },
  cancelled:        { cls:'badge-danger',  label:'Cancelled'        },
}

// ══════════════════════════════════════════════════════════
//  SHOP DASHBOARD
// ══════════════════════════════════════════════════════════
export function ShopDashboard() {
  const { user } = useAuth()
  const { data, loading, error, refetch } = useAsync(() => shopkeeperAPI.dashboard())
  const navigate = useNavigate()

  const shop  = data?.shop
  const stats = data?.stats || {}
  const monthly = data?.monthlyRevenue || []

  const revenueChart = {
    labels: monthly.map(m => `${m._id.month}/${m._id.year}`),
    datasets: [{ data: monthly.map(m => m.revenue), fill:true, borderColor:'#14b8a6', backgroundColor:'rgba(20,184,166,0.08)', tension:0.4, pointRadius:3 }],
  }

  if (!loading && !shop) return (
    <div className="space-y-5">
      <PageHeader title={`Welcome, ${user?.name?.split(' ')[0]} 👋`} subtitle="Let's get your shop registered!" />
      <div className="card text-center py-12">
        <div className="text-6xl mb-4">🏪</div>
        <h3 className="font-display font-bold text-slate-800 text-xl mb-2">No shop registered yet</h3>
        <p className="text-slate-500 text-sm mb-6">Register your shop to start selling on LocalMart.</p>
        <button onClick={() => navigate('/shop/apply')} className="btn-primary btn-lg">Register Your Shop</button>
      </div>
    </div>
  )

  return (
    <div className="space-y-5">
      <PageHeader title={`Welcome, ${user?.name?.split(' ')[0]} 👋`} subtitle={shop ? `${shop.name} · ${shop.status === 'approved' ? '✅ Active' : shop.status === 'pending' ? '⏳ Pending Approval' : '❌ ' + shop.status}` : ''} />
      <ErrorAlert message={error} onRetry={refetch} />

      {shop?.status === 'pending' && <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3"><TbAlertCircle className="text-amber-500 text-xl flex-shrink-0 mt-0.5" /><div><p className="font-semibold text-amber-800 text-sm">Shop Pending Approval</p><p className="text-amber-600 text-xs mt-0.5">Your shop is awaiting admin verification. You can manage products in the meantime.</p></div></div>}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 animate-stagger">
        <StatCard icon={TbPackage}      label="Products"    value={stats.totalProducts  ?? '—'} iconBg="bg-teal-100"   iconColor="text-teal-600"   loading={loading} />
        <StatCard icon={TbClipboardList}label="Orders"      value={stats.totalOrders    ?? '—'} iconBg="bg-blue-100"   iconColor="text-blue-600"   loading={loading} />
        <StatCard icon={TbCurrencyRupee}label="Revenue"     value={stats.totalRevenue ? `₹${(stats.totalRevenue/1000).toFixed(0)}k` : '—'} iconBg="bg-violet-100" iconColor="text-violet-600" loading={loading} />
        <StatCard icon={TbStar}         label="Rating"      value={shop?.ratingsAverage || '—'} iconBg="bg-amber-100"  iconColor="text-amber-600"  loading={loading} />
      </div>

      <div className="card">
        <h3 className="font-display font-semibold text-slate-700 mb-4">Revenue (6 months)</h3>
        {loading ? <div className="shimmer h-36 rounded-xl" /> : monthly.length ? <Line data={revenueChart} options={{ ...baseOpts, scales:{ ...baseOpts.scales, y:{ ...baseOpts.scales.y, ticks:{ ...baseOpts.scales.y.ticks, callback: v => `₹${(v/1000).toFixed(0)}k` } } } }} height={90} /> : <p className="text-slate-400 text-sm text-center py-8">No revenue data yet.</p>}
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <div className="card">
          <h3 className="font-display font-semibold text-slate-700 mb-4">Pending Orders {stats.pendingOrders > 0 && <span className="badge-warning ml-1">{stats.pendingOrders}</span>}</h3>
          {(data?.reviews || []).length === 0 ? <p className="text-slate-400 text-sm py-6 text-center">No pending orders</p> : null}
        </div>
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display font-semibold text-slate-700">Low Stock {stats.lowStockProducts > 0 && <span className="badge-danger ml-1">{stats.lowStockProducts}</span>}</h3>
          </div>
          {stats.lowStockProducts === 0 ? <p className="text-slate-400 text-sm text-center py-6">All products well-stocked ✅</p> : <button onClick={() => navigate('/shop/products?filter=low')} className="btn-outline btn-sm w-full justify-center">View Low Stock Products</button>}
        </div>
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════
//  SHOP APPLY / PROFILE (combined)
// ══════════════════════════════════════════════════════════
const CATEGORIES = ['grocery','salon','pharmacy','bakery','restaurant','electronics','clothing','hardware','stationery','other']
const CAT_ICONS  = { grocery:'🛒', salon:'✂️', pharmacy:'💊', bakery:'🍞', restaurant:'🍽️', electronics:'📱', clothing:'👕', hardware:'🔧', stationery:'📚', other:'🏪' }

export function ShopApply() {
  const navigate = useNavigate()
  const fileRef  = useRef()
  const [loading, setLoading] = useState(false)
  const { data: existingData, loading: checkLoading } = useAsync(() => shopkeeperAPI.myShop().catch(() => null))
  const existing = existingData?.shop

  const [form, setForm] = useState({ name:'', description:'', category:'grocery', phone:'', email:'', address:'', lat:'', lng:'', openTime:'09:00', closeTime:'21:00', deliveryRadius:5, deliveryFee:30, minOrderAmount:100, freeDeliveryAbove:500 })
  const [imgPreview, setImgPreview] = useState(null)
  const [imgFile, setImgFile]       = useState(null)
  const [locating, setLocating]     = useState(false)
  const [locAccuracy, setLocAccuracy] = useState(null)   // ← track accuracy

  const set = (k, v) => setForm(p => ({...p, [k]:v}))

  const detectLocation = async () => {
    if (!navigator.geolocation) { toast.error('Geolocation is not supported by your browser.'); return }
    setLocating(true)
    setLocAccuracy(null)

    const tryGPS = (highAccuracy) =>
      new Promise((resolve, reject) =>
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: highAccuracy,
          timeout:            highAccuracy ? 15000 : 8000,
          maximumAge:         0,            // never use cached/WiFi position
        })
      )

    try {
      let pos
      try {
        pos = await tryGPS(true)           // attempt real GPS first
      } catch (err) {
        if (err.code === 1) throw err      // permission denied — no point retrying
        pos = await tryGPS(false)          // fall back to network location
      }

      const { latitude: lat, longitude: lng, accuracy } = pos.coords
      set('lat', lat.toFixed(6))
      set('lng', lng.toFixed(6))
      setLocAccuracy(Math.round(accuracy))

      // Reverse-geocode to auto-fill address if empty
      try {
        const res  = await fetch(
          `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`,
          { headers: { 'Accept-Language': 'en' } }
        )
        const data = await res.json()
        if (data?.display_name && !form.address) set('address', data.display_name)
      } catch { /* keep existing address */ }

      if (accuracy > 100) {
        toast.warning(`Location detected but accuracy is low (~${Math.round(accuracy)} m). Move outdoors or enter coordinates manually for a precise pin.`)
      } else {
        toast.success(`Location detected! (±${Math.round(accuracy)} m)`)
      }
    } catch (err) {
      toast.error(
        err.code === 1
          ? 'Location permission denied. Please allow access or enter coordinates manually.'
          : 'Could not detect location. Please enter coordinates manually.'
      )
    } finally {
      setLocating(false)
    }
  }

  const handleImg = (e) => {
    const f = e.target.files[0]
    if (!f) return
    setImgFile(f)
    setImgPreview(URL.createObjectURL(f))
  }

  const submit = async (e) => {
    e.preventDefault()
    if (!form.lat || !form.lng) { toast.error('Please provide shop coordinates.'); return }
    setLoading(true)
    const fd = new FormData()
    Object.entries(form).forEach(([k,v]) => fd.append(k, v))
    if (imgFile) fd.append('coverImage', imgFile)
    try {
      if (existing) { await shopkeeperAPI.updateShop(fd); toast.success('Shop updated!') }
      else          { await shopkeeperAPI.createShop(fd); toast.success('Shop application submitted! Awaiting approval.') }
      navigate('/shop')
    } catch {} finally { setLoading(false) }
  }

  if (checkLoading) return <div className="space-y-4">{[1,2,3].map(i => <div key={i} className="shimmer h-20 rounded-2xl" />)}</div>

  // Live lat/lng — prefer what user has typed, fall back to saved shop coords
  const liveLat = form.lat || existing?.location?.coordinates?.[1] || ''
  const liveLng = form.lng || existing?.location?.coordinates?.[0] || ''

  return (
    <div className="space-y-5 max-w-2xl">
      <PageHeader
        title={existing ? 'Shop Profile' : 'Register Your Shop'}
        subtitle={existing ? 'Update your shop information' : 'Fill in the details to apply'}
      />

      <form onSubmit={submit} className="space-y-5">

        {/* Cover image */}
        <div className="card">
          <h3 className="font-display font-semibold text-slate-700 mb-3">Cover Image</h3>
          <div onClick={() => fileRef.current.click()}
            className="relative w-full h-40 bg-slate-100 rounded-xl cursor-pointer overflow-hidden flex items-center justify-center group hover:bg-slate-200 transition-colors">
            {imgPreview || existing?.coverImage
              ? <img src={imgPreview || existing.coverImage} className="w-full h-full object-cover" alt="cover" />
              : <div className="flex flex-col items-center gap-2 text-slate-400"><TbCamera className="text-3xl" /><span className="text-sm">Click to upload</span></div>}
            <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <TbCamera className="text-white text-2xl" />
            </div>
          </div>
          <input type="file" ref={fileRef} accept="image/*" className="hidden" onChange={handleImg} />
        </div>

        {/* Basic info */}
        <div className="card space-y-4">
          <h3 className="font-display font-semibold text-slate-700">Basic Info</h3>
          <FormField label="Shop Name" required>
            <input type="text" className="form-input" value={form.name || existing?.name || ''}
              onChange={e => set('name', e.target.value)} placeholder="Green Leaf Grocery" required />
          </FormField>
          <FormField label="Description">
            <textarea className="form-input resize-none h-20" value={form.description || existing?.description || ''}
              onChange={e => set('description', e.target.value)} placeholder="Tell customers about your shop…" />
          </FormField>
          <div>
            <label className="form-label">Category <span className="text-rose-500">*</span></label>
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
              {CATEGORIES.map(c => (
                <button type="button" key={c} onClick={() => set('category', c)}
                  className={clsx('flex flex-col items-center gap-1 p-2 rounded-xl border-2 text-xs font-medium transition-all',
                    (form.category || existing?.category) === c
                      ? 'border-primary-500 bg-primary-50 text-primary-700'
                      : 'border-slate-200 text-slate-600 hover:border-slate-300')}>
                  <span className="text-xl">{CAT_ICONS[c]}</span>{c}
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Phone">
              <input type="tel" className="form-input" value={form.phone || existing?.phone || ''}
                onChange={e => set('phone', e.target.value)} />
            </FormField>
            <FormField label="Email">
              <input type="email" className="form-input" value={form.email || existing?.email || ''}
                onChange={e => set('email', e.target.value)} />
            </FormField>
          </div>
          <FormField label="Full Address" required>
            <input type="text" className="form-input" value={form.address || existing?.address?.full || ''}
              onChange={e => set('address', e.target.value)} placeholder="12, MG Road, Palakkad" required />
          </FormField>
        </div>

        {/* Location */}
        <div className="card space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-display font-semibold text-slate-700">GPS Coordinates</h3>
            <button type="button" onClick={detectLocation} disabled={locating} className="btn-outline btn-sm">
              {locating ? <Spinner size="xs" /> : <TbMapPin />}
              {locating ? 'Detecting…' : 'Use My Location'}
            </button>
          </div>

          {/* Accuracy badge */}
          {locAccuracy !== null && (
            <div className={clsx(
              'flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-medium border',
              locAccuracy <= 100
                ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                : 'bg-amber-50 border-amber-200 text-amber-700'
            )}>
              {locAccuracy <= 100 ? <TbCheck className="flex-shrink-0" /> : <TbAlertCircle className="flex-shrink-0" />}
              {locAccuracy <= 100
                ? `GPS accurate to ±${locAccuracy} m — good precision.`
                : `Low accuracy (~${locAccuracy} m) — likely WiFi/cell tower. Move outdoors for a better GPS fix.`}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <FormField label="Latitude" required>
              <input type="number" step="any" className="form-input" value={liveLat}
                onChange={e => set('lat', e.target.value)} placeholder="10.7867" required />
            </FormField>
            <FormField label="Longitude" required>
              <input type="number" step="any" className="form-input" value={liveLng}
                onChange={e => set('lng', e.target.value)} placeholder="76.6548" required />
            </FormField>
          </div>

          {/* Live map preview — updates as user types or detects */}
          {liveLat && liveLng && (
            <iframe
              key={`${parseFloat(liveLat).toFixed(4)}-${parseFloat(liveLng).toFixed(4)}`}
              title="map"
              className="w-full rounded-xl border-0"
              style={{ height: 200 }}
              loading="lazy"
              src={`https://www.openstreetmap.org/export/embed.html?bbox=${parseFloat(liveLng)-.01}%2C${parseFloat(liveLat)-.01}%2C${parseFloat(liveLng)+.01}%2C${parseFloat(liveLat)+.01}&layer=mapnik&marker=${liveLat}%2C${liveLng}`}
            />
          )}
        </div>

        {/* Delivery settings */}
        <div className="card space-y-4">
          <h3 className="font-display font-semibold text-slate-700">Delivery Settings</h3>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Delivery Radius (km)">
              <input type="number" className="form-input" value={form.deliveryRadius || existing?.deliveryRadius || 5}
                onChange={e => set('deliveryRadius', e.target.value)} />
            </FormField>
            <FormField label="Delivery Fee (₹)">
              <input type="number" className="form-input" value={form.deliveryFee || existing?.deliveryFee || 30}
                onChange={e => set('deliveryFee', e.target.value)} />
            </FormField>
            <FormField label="Min Order (₹)">
              <input type="number" className="form-input" value={form.minOrderAmount || existing?.minOrderAmount || 100}
                onChange={e => set('minOrderAmount', e.target.value)} />
            </FormField>
            <FormField label="Free Delivery Above (₹)">
              <input type="number" className="form-input" value={form.freeDeliveryAbove || existing?.freeDeliveryAbove || 500}
                onChange={e => set('freeDeliveryAbove', e.target.value)} />
            </FormField>
            <FormField label="Open Time">
              <input type="time" className="form-input" value={form.openTime || '09:00'}
                onChange={e => set('openTime', e.target.value)} />
            </FormField>
            <FormField label="Close Time">
              <input type="time" className="form-input" value={form.closeTime || '21:00'}
                onChange={e => set('closeTime', e.target.value)} />
            </FormField>
          </div>
        </div>

        <button type="submit" disabled={loading} className="btn-primary w-full justify-center py-3 btn-lg">
          {loading ? <Spinner size="sm" /> : existing ? 'Save Changes' : 'Submit Application'}
        </button>
      </form>
    </div>
  )
}

// ══════════════════════════════════════════════════════════
//  PRODUCTS
// ══════════════════════════════════════════════════════════
const PROD_CATEGORIES = ['Vegetables','Fruits','Grains','Dairy','Pulses','Oils','Bakery','Beverages','Snacks','Hair','Skin','Electronics','Clothing','Other']
const EMPTY_PROD = { name:'', category:'', price:'', mrp:'', unit:'', stock:'', lowStockThreshold:10, isActive:true }

export function ShopProducts() {
  const [search, setSearch] = useState('')
  const [modal, setModal]   = useState(false)
  const [editP, setEditP]   = useState(null)
  const [form, setForm]     = useState(EMPTY_PROD)
  const [saving, setSaving] = useState(false)
  const [delTarget, setDel] = useState(null)
  const dSearch             = useDebounce(search)

  const { data, loading, refetch } = useAsync(() => shopkeeperAPI.products({ search: dSearch }), [dSearch])
  const products = data?.products || []

  const openAdd  = () => { setEditP(null); setForm(EMPTY_PROD); setModal(true) }
  const openEdit = (p) => { setEditP(p); setForm({ name:p.name, category:p.category, price:p.price, mrp:p.mrp||'', unit:p.unit, stock:p.stock, lowStockThreshold:p.lowStockThreshold||10, isActive:p.isActive }); setModal(true) }

  const save = async () => {
    if (!form.name || !form.price || !form.stock) { toast.error('Fill all required fields.'); return }
    setSaving(true)
    try {
      const fd = new FormData()
      Object.entries(form).forEach(([k,v]) => fd.append(k, v))
      if (editP) { await shopkeeperAPI.updateProduct(editP._id, fd); toast.success('Product updated!') }
      else       { await shopkeeperAPI.createProduct(fd);           toast.success('Product added!') }
      refetch(); setModal(false)
    } catch {} finally { setSaving(false) }
  }

  const del = async () => {
    try { await shopkeeperAPI.deleteProduct(delTarget._id); toast.success('Deleted.'); refetch(); setDel(null) } catch {}
  }

  const toggle = async (p) => {
    try { await shopkeeperAPI.toggleProduct(p._id); refetch() } catch {}
  }

  return (
    <div className="space-y-5">
      <PageHeader title="Products" subtitle={`${data?.total || 0} products`} action={<button onClick={openAdd} className="btn-primary"><TbPlus /> Add Product</button>} />
      <div className="card flex gap-3"><SearchInput value={search} onChange={setSearch} placeholder="Search products…" className="flex-1" /></div>

      {loading ? (
        <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">{[1,2,3,4,5,6].map(i => <div key={i} className="shimmer h-52 rounded-2xl" />)}</div>
      ) : products.length === 0 ? <EmptyState emoji="📦" title="No products yet" description="Add your first product to start selling." action={<button onClick={openAdd} className="btn-primary">Add Product</button>} /> : (
        <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4 animate-stagger">
          {products.map(p => (
            <div key={p._id} className={clsx('card-hover relative', !p.isActive && 'opacity-60')}>
              {p.stock <= (p.lowStockThreshold || 10) && <div className="absolute top-3 right-3 badge-danger">Low Stock</div>}
              <div className="w-full h-28 bg-gradient-to-br from-slate-100 to-slate-200 rounded-xl mb-3 flex items-center justify-center"><TbPackage className="text-4xl text-slate-300" /></div>
              <h3 className="font-display font-semibold text-slate-800 text-sm">{p.name}</h3>
              <p className="text-xs text-slate-400 mt-0.5">{p.category} · {p.unit}</p>
              <div className="flex items-center gap-2 mt-2">
                <span className="text-primary-600 font-bold">₹{p.price}</span>
                {p.mrp > p.price && <span className="text-slate-400 line-through text-xs">₹{p.mrp}</span>}
                {p.mrp > p.price && <span className="badge-success text-[10px]">{Math.round((1-p.price/p.mrp)*100)}%</span>}
              </div>
              <p className={clsx('text-xs mt-1', p.stock <= (p.lowStockThreshold||10) ? 'text-rose-500 font-medium' : 'text-slate-500')}>Stock: {p.stock}</p>
              <div className="flex gap-2 mt-3 pt-3 border-t border-slate-100">
                <button onClick={() => toggle(p)} className="btn-ghost btn-sm flex-1 justify-center">{p.isActive ? <TbToggleRight className="text-primary-500 text-base" /> : <TbToggleLeft className="text-base" />}{p.isActive ? 'Active' : 'Off'}</button>
                <button onClick={() => openEdit(p)} className="btn-ghost btn-sm flex-1 justify-center"><TbEdit /> Edit</button>
                <button onClick={() => setDel(p)} className="p-1.5 text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"><TbTrash /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={modal} onClose={() => setModal(false)} title={editP ? 'Edit Product' : 'Add Product'}
        footer={<><button onClick={() => setModal(false)} className="btn-secondary">Cancel</button><button onClick={save} disabled={saving} className="btn-primary">{saving ? <Spinner size="sm" /> : editP ? 'Update' : 'Add'}</button></>}>
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2"><FormField label="Name" required><input type="text" className="form-input" value={form.name} onChange={e => setForm(p => ({...p,name:e.target.value}))} /></FormField></div>
          <FormField label="Category"><select className="form-input" value={form.category} onChange={e => setForm(p => ({...p,category:e.target.value}))}><option value="">Select…</option>{PROD_CATEGORIES.map(c => <option key={c}>{c}</option>)}</select></FormField>
          <FormField label="Unit (e.g. 500g, 1kg)" required><input type="text" className="form-input" value={form.unit} onChange={e => setForm(p => ({...p,unit:e.target.value}))} /></FormField>
          <FormField label="Price (₹)" required><input type="number" className="form-input" value={form.price} onChange={e => setForm(p => ({...p,price:e.target.value}))} /></FormField>
          <FormField label="MRP (₹)"><input type="number" className="form-input" value={form.mrp} onChange={e => setForm(p => ({...p,mrp:e.target.value}))} /></FormField>
          <FormField label="Stock Qty" required><input type="number" className="form-input" value={form.stock} onChange={e => setForm(p => ({...p,stock:e.target.value}))} /></FormField>
          <FormField label="Low Stock Alert"><input type="number" className="form-input" value={form.lowStockThreshold} onChange={e => setForm(p => ({...p,lowStockThreshold:e.target.value}))} /></FormField>
        </div>
      </Modal>

      <ConfirmDialog open={!!delTarget} onClose={() => setDel(null)} onConfirm={del} title="Delete Product" message={`Permanently delete "${delTarget?.name}"?`} confirmLabel="Delete" danger />
    </div>
  )
}

// ══════════════════════════════════════════════════════════
//  SHOP ORDERS
// ══════════════════════════════════════════════════════════
// ── Assign Delivery Modal ──────────────────────────────────
function AssignDeliveryModal({ order, onClose, onDone }) {
  const [selectedRider, setSelectedRider] = useState(order?.deliveryPersonId?._id || order?.deliveryPersonId || '')
  const [saving, setSaving] = useState(false)
  const [autoSaving, setAutoSaving] = useState(false)

  const { data: ridersData, loading: ridersLoading } = useAsync(() => shopkeeperAPI.deliveryRiders())
  const riders = ridersData?.riders || []

  // Manual assign + optionally advance status to out_for_delivery
  const handleManualAssign = async () => {
    if (!selectedRider) { toast.error('Please select a delivery rider.'); return }
    setSaving(true)
    try {
      await shopkeeperAPI.assignDelivery(order._id, { deliveryPersonId: selectedRider })
      // If order is still in preparing, advance it to out_for_delivery
      if (order.status === 'preparing') {
        await shopkeeperAPI.updateOrder(order._id, { status: 'out_for_delivery' })
      }
      toast.success('Rider assigned & order dispatched! 🚴')
      onDone()
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Assignment failed.')
    } finally {
      setSaving(false)
    }
  }

  // Auto assign (backend picks least-loaded rider)
  const handleAutoAssign = async () => {
    setAutoSaving(true)
    try {
      const res = await shopkeeperAPI.autoAssign(order._id)
      // Advance to out_for_delivery if still preparing
      if (order.status === 'preparing') {
        await shopkeeperAPI.updateOrder(order._id, { status: 'out_for_delivery' })
      }
      toast.success(res?.message || `Auto-assigned to ${res?.assignedTo?.name}! 🚀`)
      onDone()
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Auto-assign failed.')
    } finally {
      setAutoSaving(false)
    }
  }

  if (!order) return null

  return (
    <Modal open onClose={onClose} title={`Assign Rider — ${order.orderNumber}`} size="md">
      <div className="space-y-5">
        {/* Order summary */}
        <div className="bg-slate-50 rounded-xl p-3 text-sm space-y-1">
          <p className="text-slate-500">📍 {order.deliveryAddress?.fullAddress}</p>
          <p className="text-slate-500">👤 {order.userId?.name} {order.userId?.phone ? `· ${order.userId.phone}` : ''}</p>
          <p className="font-semibold text-slate-700">₹{order.total}</p>
        </div>

        {/* Current assignment */}
        {order.deliveryPersonId && (
          <div className="flex items-center gap-2 text-sm bg-blue-50 border border-blue-100 rounded-xl px-3 py-2">
            <TbTruck className="text-blue-500" />
            <span className="text-blue-700">Currently assigned to <strong>{order.deliveryPersonId?.name || 'a rider'}</strong></span>
          </div>
        )}

        {/* Auto-assign */}
        <div className="border border-dashed border-primary-200 rounded-xl p-4 space-y-2">
          <p className="font-semibold text-slate-700 text-sm flex items-center gap-2">
            ⚡ Auto-assign
          </p>
          <p className="text-xs text-slate-500">
            Automatically picks the rider with the fewest active deliveries right now.
          </p>
          <button
            onClick={handleAutoAssign}
            disabled={autoSaving || saving}
            className="btn-primary btn-sm w-full justify-center mt-1">
            {autoSaving ? <Spinner size="sm" /> : '⚡ Auto-assign Best Rider'}
          </button>
        </div>

        {/* Divider */}
        <div className="flex items-center gap-3">
          <div className="flex-1 h-px bg-slate-200" />
          <span className="text-xs text-slate-400 font-medium">or pick manually</span>
          <div className="flex-1 h-px bg-slate-200" />
        </div>

        {/* Manual rider picker */}
        {ridersLoading ? (
          <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="shimmer h-14 rounded-xl" />)}</div>
        ) : riders.length === 0 ? (
          <div className="text-center py-4 text-slate-400 text-sm">
            No active delivery riders in your team.{' '}
            <span className="text-primary-600">Add one from the Team page.</span>
          </div>
        ) : (
          <div className="space-y-2">
            {riders.map(r => (
              <label key={r._id}
                className={clsx(
                  'flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-colors',
                  selectedRider === r._id
                    ? 'border-primary-400 bg-primary-50'
                    : 'border-slate-200 hover:border-slate-300'
                )}>
                <input
                  type="radio"
                  name="rider"
                  value={r._id}
                  checked={selectedRider === r._id}
                  onChange={() => setSelectedRider(r._id)}
                  className="accent-primary-500"
                />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-slate-800 text-sm">{r.name}</p>
                  {r.phone && <p className="text-xs text-slate-500">{r.phone}</p>}
                </div>
                <span className={clsx(
                  'text-xs font-semibold px-2 py-0.5 rounded-full',
                  r.activeOrders === 0
                    ? 'bg-emerald-100 text-emerald-700'
                    : r.activeOrders <= 2
                      ? 'bg-amber-100 text-amber-700'
                      : 'bg-rose-100 text-rose-700'
                )}>
                  {r.activeOrders} active
                </span>
              </label>
            ))}
          </div>
        )}

        {riders.length > 0 && (
          <button
            onClick={handleManualAssign}
            disabled={saving || autoSaving || !selectedRider}
            className="btn-primary w-full justify-center">
            {saving ? <Spinner size="sm" /> : <><TbTruck /> Assign & Dispatch</>}
          </button>
        )}
      </div>
    </Modal>
  )
}

export function ShopOrders() {
  const [filter, setFilter]       = useState('all')
  const [page, setPage]           = useState(1)
  const [loadingId, setLoadingId] = useState(null)
  const [assignOrder, setAssignOrder] = useState(null)  // order being assigned

  const { data, loading, refetch } = useAsync(
    () => shopkeeperAPI.orders({ ...(filter !== 'all' && { status: filter }), page, limit: 10 }),
    [filter, page]
  )
  const orders = data?.orders || []

  // Advance status (non-dispatch transitions)
  const advance = async (id, status) => {
    setLoadingId(id)
    try {
      await shopkeeperAPI.updateOrder(id, { status })
      toast.success(`Order moved to "${STATUS_CFG[status]?.label || status}"`)
      refetch()
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to update order.')
    } finally {
      setLoadingId(null)
    }
  }

  return (
    <div className="space-y-5">
      <PageHeader title="Orders" subtitle={`${data?.total || 0} total orders`} />

      {/* Status filter tabs */}
      <div className="card flex gap-2 flex-wrap p-3">
        {['all','pending','confirmed','preparing','out_for_delivery','delivered','cancelled'].map(s => (
          <button key={s} onClick={() => { setFilter(s); setPage(1) }}
            className={clsx('btn btn-sm capitalize', filter === s ? 'btn-primary' : 'btn-secondary')}>
            {s === 'all' ? 'All' : STATUS_CFG[s]?.label || s}
          </button>
        ))}
      </div>

      {loading
        ? [1,2,3].map(i => <div key={i} className="shimmer h-52 rounded-2xl" />)
        : orders.length === 0
          ? <EmptyState emoji="📋" title="No orders" description="Orders will appear here." />
          : (
            <div className="space-y-4 animate-stagger">
              {orders.map(o => {
                const st = STATUS_CFG[o.status] || {}
                const isDispatch = st.next === 'out_for_delivery'  // preparing → dispatch
                const canReassign = o.status === 'out_for_delivery'

                return (
                  <div key={o._id} className="card space-y-3">
                    {/* Header */}
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-display font-bold text-slate-800">{o.orderNumber}</span>
                          <span className={st.cls}>{st.label}</span>
                        </div>
                        <p className="text-xs text-slate-400 mt-0.5">
                          {o.userId?.name}{o.userId?.phone ? ` · ${o.userId.phone}` : ''}
                        </p>
                      </div>
                      <p className="font-display font-bold text-primary-600 text-lg">₹{o.total}</p>
                    </div>

                    {/* Items */}
                    <div className="bg-slate-50 rounded-xl p-3 space-y-1">
                      {o.items.map((item, i) => (
                        <div key={i} className="flex justify-between text-sm">
                          <span className="text-slate-600">{item.name} × {item.qty}</span>
                          <span className="font-medium">₹{item.price * item.qty}</span>
                        </div>
                      ))}
                      <div className="flex justify-between text-xs text-slate-400 pt-2 border-t border-slate-200 mt-1">
                        <span>Delivery fee</span><span>₹{o.deliveryFee}</span>
                      </div>
                    </div>

                    {/* Address */}
                    <p className="text-xs text-slate-500 flex items-start gap-1">
                      <TbMapPin className="flex-shrink-0 mt-0.5" />
                      {o.deliveryAddress?.fullAddress}
                    </p>

                    {/* Assigned rider pill */}
                    {o.deliveryPersonId && (
                      <div className="flex items-center gap-2 text-xs bg-blue-50 border border-blue-100 rounded-lg px-3 py-1.5">
                        <TbTruck className="text-blue-500 flex-shrink-0" />
                        <span className="text-blue-700">
                          Assigned to <strong>{o.deliveryPersonId?.name || 'rider'}</strong>
                        </span>
                      </div>
                    )}

                    {/* Action buttons */}
                    <div className="flex gap-2">
                      {/* Dispatch (preparing → out_for_delivery) — opens assign modal */}
                      {isDispatch && (
                        <button
                          onClick={() => setAssignOrder(o)}
                          disabled={loadingId === o._id}
                          className="btn-primary btn-sm flex-1 justify-center">
                          {loadingId === o._id ? <Spinner size="sm" /> : <><TbTruck /> Assign & Dispatch</>}
                        </button>
                      )}

                      {/* Reassign button on out_for_delivery orders */}
                      {canReassign && (
                        <button
                          onClick={() => setAssignOrder(o)}
                          className="btn-outline btn-sm flex-shrink-0 justify-center">
                          <TbRefresh /> Reassign
                        </button>
                      )}

                      {/* Other status advances (non-dispatch) */}
                      {st.next && !isDispatch && (
                        <button
                          onClick={() => advance(o._id, st.next)}
                          disabled={loadingId === o._id}
                          className="btn-primary btn-sm flex-1 justify-center">
                          {loadingId === o._id ? <Spinner size="sm" /> : <><TbCheck />{st.nextLabel}</>}
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )
      }

      <Pagination page={page} total={Math.ceil((data?.total || 0) / 10)} onChange={setPage} />

      {/* Assign Delivery Modal */}
      {assignOrder && (
        <AssignDeliveryModal
          order={assignOrder}
          onClose={() => setAssignOrder(null)}
          onDone={() => { setAssignOrder(null); refetch() }}
        />
      )}
    </div>
  )
}

// ══════════════════════════════════════════════════════════
//  TEAM
// ══════════════════════════════════════════════════════════
const SUB_ROLES = ['delivery','stock','cashier','manager']

export function ShopTeam() {
  const [modal, setModal] = useState(false)
  const [form, setForm]   = useState({ name:'', email:'', phone:'', role:'delivery', password:'' })
  const [saving, setSaving] = useState(false)
  const [delTarget, setDel] = useState(null)

  const { data, loading, refetch } = useAsync(() => shopkeeperAPI.team())
  const team = data?.team || []

  const add = async () => {
    if (!form.name || !form.email) { toast.error('Name and email required.'); return }
    setSaving(true)
    try { await shopkeeperAPI.addMember(form); toast.success('Member added!'); refetch(); setModal(false); setForm({ name:'', email:'', phone:'', role:'delivery', password:'' }) } catch {} finally { setSaving(false) }
  }

  const remove = async () => {
    try { await shopkeeperAPI.removeMember(delTarget._id); toast.success('Removed.'); refetch(); setDel(null) } catch {}
  }

  const toggle = async (m) => {
    try { await shopkeeperAPI.updateMember(m._id, { isActive: !m.isActive }); refetch() } catch {}
  }

  const COLS = [
    { key:'name',     label:'Member',  render:(_,m) => <div className="flex items-center gap-3"><Avatar name={m.name} size="sm" /><div><p className="font-medium">{m.name}</p><p className="text-xs text-slate-400">{m.email}</p></div></div> },
    { key:'role',     label:'Role',    render:v => <span className="badge-neutral capitalize">{v}</span> },
    { key:'phone',    label:'Phone',   render:v => <span className="text-slate-500 text-xs">{v||'—'}</span> },
    { key:'isActive', label:'Status',  render:(v,m) => <button onClick={() => toggle(m)} className={clsx('relative inline-flex w-9 h-5 rounded-full transition-colors', v ? 'bg-primary-500' : 'bg-slate-200')}><span className={clsx('absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform', v && 'translate-x-4')} /></button> },
    { key:'_id',      label:'',        render:(_,m) => <button onClick={() => setDel(m)} className="text-rose-400 hover:text-rose-600"><TbTrash /></button> },
  ]

  return (
    <div className="space-y-5">
      <PageHeader title="My Team" subtitle={`${team.length} members`} action={<button onClick={() => setModal(true)} className="btn-primary"><TbPlus /> Add Member</button>} />
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {SUB_ROLES.map(r => <div key={r} className="card text-center"><p className="text-2xl font-display font-bold text-slate-800">{team.filter(m => m.role === r).length}</p><p className="text-xs text-slate-500 capitalize">{r}s</p></div>)}
      </div>
      <div className="card p-0 overflow-hidden"><DataTable columns={COLS} data={team} loading={loading} emptyMsg="No team members yet." /></div>

      <Modal open={modal} onClose={() => setModal(false)} title="Add Team Member"
        footer={<><button onClick={() => setModal(false)} className="btn-secondary">Cancel</button><button onClick={add} disabled={saving} className="btn-primary">{saving ? <Spinner size="sm" /> : 'Add Member'}</button></>}>
        <div className="space-y-4">
          {[['Full Name','name'],['Email','email'],['Phone','phone'],['Password (optional)','password']].map(([l,k]) => (
            <FormField key={k} label={l}><input type={k === 'password' ? 'password' : k === 'email' ? 'email' : 'text'} className="form-input" value={form[k]} onChange={e => setForm(p => ({...p,[k]:e.target.value}))} /></FormField>
          ))}
          <FormField label="Role">
            <div className="grid grid-cols-2 gap-2">
              {SUB_ROLES.map(r => <button key={r} type="button" onClick={() => setForm(p => ({...p,role:r}))} className={clsx('p-2.5 rounded-xl border-2 text-xs font-medium capitalize transition-all', form.role === r ? 'border-primary-500 bg-primary-50 text-primary-700' : 'border-slate-200 text-slate-600')}>{r}</button>)}
            </div>
          </FormField>
        </div>
      </Modal>
      <ConfirmDialog open={!!delTarget} onClose={() => setDel(null)} onConfirm={remove} title="Remove Member" message={`Remove ${delTarget?.name} from your team?`} confirmLabel="Remove" danger />
    </div>
  )
}

// ══════════════════════════════════════════════════════════
//  SHOP ANALYTICS
// ══════════════════════════════════════════════════════════
export function ShopAnalytics() {
  const { data, loading } = useAsync(() => shopkeeperAPI.analytics())
  const monthly   = data?.revenueByMonth    || []
  const topProds  = data?.topProducts       || []
  const byStatus  = data?.ordersByStatus    || []

  const revenueChart = { labels: monthly.map(m => `${m._id.month}/${m._id.year}`), datasets: [{ data: monthly.map(m => m.revenue), fill:true, borderColor:'#14b8a6', backgroundColor:'rgba(20,184,166,0.08)', tension:0.4, pointRadius:3 }] }
  const ordersChart  = { labels: monthly.map(m => `${m._id.month}/${m._id.year}`), datasets: [{ data: monthly.map(m => m.orders), backgroundColor:'#6366f140', borderColor:'#6366f1', borderWidth:2, borderRadius:8 }] }

  return (
    <div className="space-y-5">
      <PageHeader title="Analytics" subtitle="Your shop performance" />
      <div className="grid md:grid-cols-2 gap-4">
        <div className="card">{loading ? <div className="shimmer h-40 rounded-xl" /> : <><h3 className="font-display font-semibold text-slate-700 mb-4">Revenue Trend</h3><Line data={revenueChart} options={{ ...baseOpts, scales:{ ...baseOpts.scales, y:{ ...baseOpts.scales.y, ticks:{ ...baseOpts.scales.y.ticks, callback: v => `₹${(v/1000).toFixed(0)}k` } } } }} height={120} /></>}</div>
        <div className="card">{loading ? <div className="shimmer h-40 rounded-xl" /> : <><h3 className="font-display font-semibold text-slate-700 mb-4">Monthly Orders</h3><Bar data={ordersChart} options={baseOpts} height={120} /></>}</div>
      </div>
      <div className="card">
        <h3 className="font-display font-semibold text-slate-700 mb-4">Top Products</h3>
        {loading ? [1,2,3].map(i => <div key={i} className="shimmer h-10 rounded-xl mb-2" />) : topProds.map((p,i) => (
          <div key={p._id} className="flex items-center gap-3 py-2.5 border-b border-slate-100 last:border-0">
            <span className="w-6 h-6 bg-primary-100 text-primary-700 text-xs font-bold rounded-full flex items-center justify-center">{i+1}</span>
            <span className="flex-1 text-sm text-slate-700">{p.name}</span>
            <span className="text-xs text-slate-400">{p.totalSold} sold</span>
            <span className="text-primary-600 font-semibold text-sm">₹{p.price}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════
//  SHOP REVIEWS
// ══════════════════════════════════════════════════════════
export function ShopReviews() {
  const { data: shopData } = useAsync(() => shopkeeperAPI.myShop())
  const shopId = shopData?.shop?._id
  const { userAPI } = require('@services/api')
  const { data, loading } = useAsync(() => shopId ? userAPI.shopReviews(shopId) : Promise.resolve({ data: { reviews: [] } }), [shopId])
  const reviews = data?.reviews || []

  return (
    <div className="space-y-5">
      <PageHeader title="Customer Reviews" subtitle={`${data?.total || 0} reviews`} />
      {loading ? [1,2,3].map(i => <div key={i} className="shimmer h-24 rounded-2xl" />) :
       reviews.length === 0 ? <EmptyState emoji="⭐" title="No reviews yet" description="Reviews from customers will appear here." /> :
       <div className="space-y-3 animate-stagger">
         {reviews.map(r => (
           <div key={r._id} className="card">
             <div className="flex items-start gap-3">
               <Avatar name={r.userId?.name} size="sm" src={r.userId?.avatar} />
               <div className="flex-1">
                 <div className="flex items-center gap-2 flex-wrap"><span className="font-medium text-sm text-slate-700">{r.userId?.name}</span><span className="text-amber-400 text-sm">{'★'.repeat(r.rating)}{'☆'.repeat(5-r.rating)}</span><span className="text-slate-400 text-xs ml-auto">{r.createdAt?.slice(0,10)}</span></div>
                 {r.comment && <p className="text-sm text-slate-600 mt-1">{r.comment}</p>}
               </div>
             </div>
           </div>
         ))}
       </div>}
    </div>
  )
}
