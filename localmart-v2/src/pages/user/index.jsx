import { useState, useCallback, useEffect, useRef } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import {
  TbSearch, TbMapPin, TbStar, TbClock, TbTruck, TbPlus, TbMinus, TbTrash,
  TbShoppingCart, TbCheck, TbArrowLeft, TbX, TbEdit, TbPhone, TbMail,
  TbHeart, TbPackage, TbList, TbFilter, TbCurrentLocation, TbLoader2,
  TbReceipt, TbChevronRight, TbHome, TbBriefcase, TbMapPinFilled,
  TbGps, TbAlertCircle, TbShield, TbCircleCheck,
} from 'react-icons/tb'
import { EmptyState, Spinner, Avatar, FormField, Modal, Pagination } from '@components/common'
import { useAsync, useDebounce, useGeolocation, useToggle } from '@hooks'
import { userAPI, authAPI } from '@services/api'
import { useCart } from '@context/CartContext'
import { useAuth } from '@context/AuthContext'
import toast from 'react-hot-toast'
import clsx from 'clsx'

const CAT_MAP = {
  grocery:    { icon:'🛒', color:'bg-green-100 text-green-700',    label:'Grocery'     },
  salon:      { icon:'✂️', color:'bg-purple-100 text-purple-700',  label:'Salon'       },
  pharmacy:   { icon:'💊', color:'bg-blue-100 text-blue-700',      label:'Pharmacy'    },
  bakery:     { icon:'🍞', color:'bg-yellow-100 text-yellow-700',  label:'Bakery'      },
  restaurant: { icon:'🍽️', color:'bg-red-100 text-red-700',        label:'Restaurant'  },
  electronics:{ icon:'📱', color:'bg-indigo-100 text-indigo-700',  label:'Electronics' },
  clothing:   { icon:'👕', color:'bg-pink-100 text-pink-700',      label:'Clothing'    },
  hardware:   { icon:'🔧', color:'bg-orange-100 text-orange-700',  label:'Hardware'    },
  stationery: { icon:'📚', color:'bg-teal-100 text-teal-700',      label:'Stationery'  },
  other:      { icon:'🏪', color:'bg-slate-100 text-slate-600',    label:'Other'       },
}

const ORDER_STATUS = {
  pending:          { label:'Order Placed',     color:'text-amber-500',   bg:'bg-amber-50',   step:1 },
  confirmed:        { label:'Confirmed',         color:'text-blue-500',    bg:'bg-blue-50',    step:2 },
  preparing:        { label:'Preparing',         color:'text-blue-500',    bg:'bg-blue-50',    step:3 },
  out_for_delivery: { label:'Out for Delivery',  color:'text-violet-500',  bg:'bg-violet-50',  step:4 },
  delivered:        { label:'Delivered',          color:'text-emerald-500', bg:'bg-emerald-50', step:5 },
  cancelled:        { label:'Cancelled',          color:'text-rose-500',    bg:'bg-rose-50',    step:0 },
}

const PAYMENT_METHODS = [
  { id:'upi',  label:'UPI',        icon:'📲', desc:'Pay via UPI' },
  { id:'card', label:'Card',       icon:'💳', desc:'Debit/Credit' },
  { id:'cash', label:'Cash',       icon:'💵', desc:'Pay on delivery' },
]

const ADDRESS_LABELS = [
  { id:'Home',  label:'🏠 Home'  },
  { id:'Work',  label:'💼 Work'  },
  { id:'Other', label:'📍 Other' },
]

// ══════════════════════════════════════════════════════════
//  USER HOME
// ══════════════════════════════════════════════════════════
export function UserHome() {
  const { user }  = useAuth()
  const [search, setSearch] = useState('')
  const [selCat, setSelCat] = useState(null)
  const dSearch             = useDebounce(search, 500)

  const [coords, setCoords] = useState({ lat: null, lng: null, loading: true })
  const [shops, setShops]   = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!navigator.geolocation) {
      setCoords({ lat: null, lng: null, loading: false })
      return
    }
    navigator.geolocation.getCurrentPosition(
      pos => setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude, loading: false }),
      ()  => setCoords({ lat: null, lng: null, loading: false }),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    )
  }, [])

  useEffect(() => {
    if (coords.loading || !coords.lat || !coords.lng) return
    let cancelled = false
    setLoading(true)
    userAPI.nearbyShops({
      lat: coords.lat, lng: coords.lng, radius: 15,
      ...(selCat  && { category: selCat }),
      ...(dSearch && { search: dSearch }),
    })
      .then(res => { if (!cancelled) setShops(res?.data?.shops || res?.shops || []) })
      .catch(()  => { if (!cancelled) setShops([]) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [coords.loading, coords.lat, coords.lng, selCat, dSearch])

  return (
    <div className="bg-slate-50 min-h-full">
      <div className="bg-gradient-to-br from-slate-900 via-primary-800 to-primary-600 px-4 pt-4 pb-10">
        <p className="text-white/60 text-xs mb-1 flex items-center gap-1">
          <TbMapPin className="text-xs" /> Near you
        </p>
        <h1 className="text-white font-display font-bold text-xl leading-tight">
          Hi {user?.name?.split(' ')[0]} 👋
        </h1>
        <p className="text-white/70 text-sm mt-0.5 mb-4">What are you looking for today?</p>
        <div className="relative">
          <TbSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-lg pointer-events-none" />
          <input
            type="text"
            className="w-full rounded-2xl border-0 pl-10 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-white/40 bg-white shadow-lg"
            placeholder="Search shops, groceries, salons…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
              <TbX />
            </button>
          )}
        </div>
      </div>

      <div className="px-4 -mt-4">
        <div className="flex gap-2 overflow-x-auto pb-3 scrollbar-hide">
          <button
            onClick={() => setSelCat(null)}
            className={clsx('flex-shrink-0 px-4 py-2 rounded-full text-xs font-semibold transition-all border whitespace-nowrap',
              !selCat ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-600 border-slate-200')}
          >All</button>
          {Object.entries(CAT_MAP).map(([k, v]) => (
            <button key={k} onClick={() => setSelCat(selCat === k ? null : k)}
              className={clsx('flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-semibold transition-all border whitespace-nowrap',
                selCat === k ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-600 border-slate-200')}>
              <span>{v.icon}</span> {v.label}
            </button>
          ))}
        </div>

        {!search && !selCat && (
          <div className="mb-5">
            <h2 className="font-display font-bold text-slate-800 text-base mb-3">Quick Access</h2>
            <div className="grid grid-cols-3 gap-2">
              {[
                { cat:'grocery',  label:'Order Groceries', emoji:'🛒', from:'from-teal-500',   to:'to-emerald-600' },
                { cat:'salon',    label:'Book Salon',       emoji:'✂️', from:'from-violet-500', to:'to-purple-600'  },
                { cat:'pharmacy', label:'Buy Medicines',    emoji:'💊', from:'from-blue-500',   to:'to-cyan-600'    },
              ].map(t => (
                <button key={t.cat} onClick={() => setSelCat(t.cat)}
                  className={`bg-gradient-to-br ${t.from} ${t.to} rounded-2xl p-3 text-left`}>
                  <span className="text-2xl block mb-1">{t.emoji}</span>
                  <p className="text-white font-semibold text-xs leading-tight">{t.label}</p>
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="pb-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-display font-bold text-slate-800 text-base">
              {selCat ? CAT_MAP[selCat]?.label + ' Shops' : search ? `Results for "${search}"` : 'Shops Near You'}
            </h2>
            <Link to="/app/map" className="text-xs text-primary-600 font-semibold">Map ›</Link>
          </div>

          {coords.loading || loading ? (
            <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="shimmer h-24 rounded-2xl" />)}</div>
          ) : shops.length === 0 ? (
            <EmptyState emoji="🔍" title="No shops found" description="Try a different search or category." />
          ) : (
            <div className="space-y-3">
              {shops.map(shop => {
                const cat = CAT_MAP[shop.category] || CAT_MAP.other
                return (
                  <Link key={shop._id} to={`/app/shop/${shop._id}`}>
                    <div className="bg-white rounded-2xl shadow-card flex gap-3 p-3 hover:shadow-md transition-all active:scale-[0.98]">
                      <div className={clsx('w-14 h-14 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0', cat.color)}>
                        {cat.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-1">
                          <h3 className="font-display font-semibold text-slate-800 text-sm leading-tight">{shop.name}</h3>
                          {shop.ratingsAverage > 0 && (
                            <div className="flex items-center gap-0.5 flex-shrink-0 ml-1">
                              <TbStar className="text-amber-400 text-xs" />
                              <span className="text-xs font-semibold text-slate-600">{shop.ratingsAverage}</span>
                            </div>
                          )}
                        </div>
                        <p className="text-xs text-slate-400 mt-0.5 truncate">{shop.address?.full}</p>
                        <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                          {shop.distance !== undefined && (
                            <span className="flex items-center gap-0.5 text-[10px] text-slate-400">
                              <TbMapPin className="text-xs" />{shop.distance} km
                            </span>
                          )}
                          {shop.deliveryEnabled && (
                            <span className="flex items-center gap-0.5 text-[10px] text-teal-600 font-medium">
                              <TbTruck className="text-xs" />Delivery
                            </span>
                          )}
                          <span className={clsx('w-1.5 h-1.5 rounded-full ml-auto flex-shrink-0',
                            shop.isOpen ? 'bg-emerald-400' : 'bg-slate-300')} />
                        </div>
                      </div>
                    </div>
                  </Link>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════
//  SHOP DETAIL
// ══════════════════════════════════════════════════════════
export function UserShopDetail() {
  const { id }  = useParams()
  const { addItem, items, updateQty, shopId: cartShopId } = useCart()
  const [selCat, setSelCat]   = useState('all')
  const [adding, setAdding]   = useState(null)

  const { data, loading } = useAsync(() => userAPI.shopById(id), [id])
  const { data: revData  } = useAsync(() => userAPI.shopReviews(id), [id])

  const shop     = data?.shop
  const products = data?.products || []
  const reviews  = revData?.reviews || []
  const cat      = shop ? (CAT_MAP[shop.category] || CAT_MAP.other) : null
  const categories = ['all', ...new Set(products.map(p => p.category))]
  const filtered   = selCat === 'all' ? products : products.filter(p => p.category === selCat)

  const getQty = (pid) => items.find(i => (i.productId?._id || i.productId) === pid)?.qty || 0

  const handleAdd = async (product) => {
    setAdding(product._id)
    await addItem(product._id, shop._id)
    setAdding(null)
  }

  const cartItems = items.filter(i => (i.productId?.shopId || shop?._id) === shop?._id || cartShopId === shop?._id)

  if (loading) return (
    <div>
      <div className="shimmer h-44 w-full" />
      <div className="px-4 space-y-3 mt-4">{[1,2,3,4].map(i => <div key={i} className="shimmer h-20 rounded-2xl" />)}</div>
    </div>
  )

  if (!shop) return <EmptyState emoji="🔍" title="Shop not found" />

  return (
    <div className="min-h-full bg-slate-50">
      <div className={clsx('relative h-44', cat?.color)}>
        <div className="absolute inset-0 flex items-center justify-center text-8xl opacity-10">{cat?.icon}</div>
        <Link to="/app" className="absolute top-3 left-3 w-9 h-9 bg-white/90 backdrop-blur rounded-full flex items-center justify-center shadow-sm">
          <TbArrowLeft className="text-slate-700" />
        </Link>
      </div>

      <div className="px-4">
        <div className="bg-white rounded-3xl shadow-card -mt-6 p-4 relative z-10">
          <div className="flex items-start gap-3">
            <div className={clsx('w-14 h-14 rounded-2xl flex items-center justify-center text-3xl flex-shrink-0', cat?.color)}>{cat?.icon}</div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="font-display font-bold text-slate-800 text-lg leading-tight">{shop.name}</h1>
                <div className={clsx('w-2 h-2 rounded-full flex-shrink-0', shop.isOpen ? 'bg-emerald-400' : 'bg-slate-300')} />
              </div>
              {shop.description && <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{shop.description}</p>}
            </div>
          </div>
          <div className="flex flex-wrap gap-3 mt-3 text-xs text-slate-500">
            {shop.ratingsAverage > 0 && <span className="flex items-center gap-1"><TbStar className="text-amber-400" />{shop.ratingsAverage} ({shop.ratingsCount})</span>}
            {shop.deliveryEnabled && <span className="flex items-center gap-1 text-teal-600 font-medium"><TbTruck />Free above ₹{shop.freeDeliveryAbove}</span>}
            {shop.minOrderAmount > 0 && <span>Min ₹{shop.minOrderAmount}</span>}
          </div>
          {shop.address?.full && <p className="flex items-center gap-1 mt-2 text-xs text-slate-400"><TbMapPin className="flex-shrink-0 text-xs" />{shop.address.full}</p>}
        </div>

        {categories.length > 1 && (
          <div className="flex gap-2 overflow-x-auto py-3 scrollbar-hide">
            {categories.map(c => (
              <button key={c} onClick={() => setSelCat(c)}
                className={clsx('flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-all border capitalize',
                  selCat === c ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-600 border-slate-200')}>
                {c}
              </button>
            ))}
          </div>
        )}

        <div className="mt-1 space-y-2 pb-6">
          {filtered.map(product => {
            const qty = getQty(product._id)
            return (
              <div key={product._id} className="bg-white rounded-2xl p-3 flex gap-3 shadow-card">
                <div className={clsx('w-16 h-16 rounded-xl flex items-center justify-center flex-shrink-0 text-2xl', cat?.color)}>{cat?.icon}</div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-slate-800 text-sm">{product.name}</h3>
                  <p className="text-xs text-slate-400">{product.unit}</p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="text-primary-600 font-bold text-base">₹{product.price}</span>
                    {product.mrp > product.price && <span className="text-slate-400 line-through text-xs">₹{product.mrp}</span>}
                    {product.discount > 0 && <span className="badge-success text-[10px]">{product.discount}%</span>}
                  </div>
                </div>
                {qty === 0 ? (
                  <button onClick={() => handleAdd(product)} disabled={adding === product._id}
                    className="self-center btn-primary btn-sm flex-shrink-0">
                    {adding === product._id ? <Spinner size="xs" /> : <><TbPlus />Add</>}
                  </button>
                ) : (
                  <div className="self-center flex items-center gap-2 bg-primary-50 border border-primary-200 rounded-xl px-2 py-1 flex-shrink-0">
                    <button onClick={() => updateQty(product._id, qty - 1)} className="w-6 h-6 flex items-center justify-center rounded-lg bg-white shadow-sm"><TbMinus className="text-xs text-slate-700" /></button>
                    <span className="text-sm font-bold text-primary-700 w-5 text-center">{qty}</span>
                    <button onClick={() => updateQty(product._id, qty + 1)} className="w-6 h-6 flex items-center justify-center rounded-lg bg-primary-500 text-white shadow-sm"><TbPlus className="text-xs" /></button>
                  </div>
                )}
              </div>
            )
          })}
          {filtered.length === 0 && <EmptyState emoji="📭" title="No products here" description="Try a different category." />}
        </div>

        {reviews.length > 0 && (
          <div className="mb-6">
            <h2 className="font-display font-bold text-slate-800 text-base mb-3">Reviews</h2>
            <div className="space-y-2">
              {reviews.slice(0, 3).map(r => (
                <div key={r._id} className="bg-white rounded-2xl p-3 shadow-card">
                  <div className="flex items-center gap-2">
                    <Avatar name={r.userId?.name} size="xs" src={r.userId?.avatar} />
                    <span className="font-medium text-sm text-slate-700">{r.userId?.name}</span>
                    <span className="text-amber-400 text-xs">{'★'.repeat(r.rating)}</span>
                    <span className="text-slate-400 text-xs ml-auto">{r.createdAt?.slice(0,10)}</span>
                  </div>
                  {r.comment && <p className="text-xs text-slate-500 mt-1 ml-7">{r.comment}</p>}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {cartItems.length > 0 && (
        <div className="fixed bottom-20 inset-x-4 z-30">
          <Link to="/app/cart"
            className="flex items-center justify-between bg-primary-500 hover:bg-primary-600 text-white px-5 py-4 rounded-2xl shadow-glow transition-all active:scale-[0.98]">
            <span className="bg-white/20 rounded-lg px-2.5 py-0.5 text-xs font-bold">{cartItems.reduce((s,i)=>s+i.qty,0)} items</span>
            <span className="font-semibold">View Cart</span>
            <TbShoppingCart className="text-xl" />
          </Link>
        </div>
      )}
    </div>
  )
}

// ══════════════════════════════════════════════════════════
//  CART  — redesigned with GPS address
// ══════════════════════════════════════════════════════════
export function UserCart() {
  const { items, updateQty, removeItem, clearCart, total, itemCount, shopId } = useCart()
  const navigate = useNavigate()

  const [payMode, setPayMode]       = useState('cash')
  const [address, setAddress]       = useState('')
  const [landmark, setLandmark]     = useState('')
  const [addrLabel, setAddrLabel]   = useState('Home')
  const [coords, setCoords]         = useState(null)
  const [geoLoading, setGeoLoading] = useState(false)
  const [geoError, setGeoError]     = useState('')
  const [geocoded, setGeocoded]     = useState(false)
  const [placing, setPlacing]       = useState(false)
  const [done, setDone]             = useState(false)
   const [notes, setNotes]           = useState('') 

  const { data: shopData } = useAsync(() => shopId ? userAPI.shopById(shopId) : Promise.resolve(null), [shopId])
  const shop = shopData?.shop

  const deliveryFee = total >= (shop?.freeDeliveryAbove || Infinity) ? 0 : (shop?.deliveryFee || 30)
  const grandTotal  = total + deliveryFee

 const useCurrentLocation = useCallback(async () => {
    if (!navigator.geolocation) {
      setGeoError('Geolocation is not supported by your browser.')
      return
    }
    setGeoLoading(true)
    setGeoError('')

    // First try: high-accuracy GPS (may take up to 15s)
    const tryGPS = (highAccuracy) =>
      new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: highAccuracy,
          timeout:            highAccuracy ? 15000 : 8000,
          maximumAge:         0,               // never use cached position
        })
      })

    try {
      let pos
      try {
        pos = await tryGPS(true)               // attempt real GPS first
      } catch (err) {
        if (err.code === 1) throw err          // permission denied — no point retrying
        pos = await tryGPS(false)              // fall back to network location
      }

      const { latitude: lat, longitude: lng, accuracy } = pos.coords
      setCoords({ lat, lng, accuracy })

      // Warn user if accuracy is poor (WiFi/cell tower level)
      if (accuracy > 100) {
        setGeoError(
          `Location accuracy is low (~${Math.round(accuracy)} m). ` +
          'Enable GPS / move outdoors for a precise pin, or type your address manually.'
        )
      } else {
        setGeoError('')
      }

      try {
        const res  = await fetch(
          `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`,
          { headers: { 'Accept-Language': 'en' } }
        )
        const data = await res.json()
        if (data?.display_name) setAddress(data.display_name)
      } catch { /* keep existing address */ }

      setGeocoded(true)
      setGeoLoading(false)
      toast.success(
        accuracy <= 100
          ? `Location detected! (±${Math.round(accuracy)} m)`
          : 'Approximate location detected — accuracy low.'
      )
    } catch (err) {
      setGeoLoading(false)
      setGeoError(
        err.code === 1
          ? 'Location permission denied. Please allow access or type your address.'
          : 'Could not get your location. Please type your address manually.'
      )
    }
  }, [])

  const placeOrder = async () => {
    if (!address.trim()) { toast.error('Please enter or detect your delivery address.'); return }
    if (total < (shop?.minOrderAmount || 0)) { toast.error(`Minimum order is ₹${shop.minOrderAmount}.`); return }
    setPlacing(true)
    try {
      await userAPI.placeOrder({
        paymentMethod: payMode,
        notes,                                 // wire up a notes field if you add one later
        deliveryAddress: {
          fullAddress: address,
          label:       addrLabel,
          landmark:    landmark || undefined,
          // send flat fields — backend reads deliveryAddress.lat / .lng
          ...(coords && {
            lat: coords.lat,
            lng: coords.lng,
          }),
        },
      })
      clearCart()
      setDone(true)
      setTimeout(() => navigate('/app/orders'), 1800)
    } catch { /* axios interceptor shows toast */ }
    finally { setPlacing(false) }
  }

  if (done) return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] p-8 text-center gap-4">
      <div className="w-24 h-24 bg-emerald-100 rounded-full flex items-center justify-center">
        <TbCheck className="text-emerald-500 text-5xl" />
      </div>
      <div>
        <h2 className="font-display font-bold text-slate-800 text-2xl mb-1">Order placed! 🎉</h2>
        <p className="text-slate-500 text-sm">Redirecting to your orders…</p>
      </div>
    </div>
  )

  if (itemCount === 0) return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] p-8 text-center gap-3">
      <div className="text-7xl">🛒</div>
      <h2 className="font-display font-bold text-slate-800 text-xl">Your cart is empty</h2>
      <p className="text-slate-500 text-sm">Add items from a nearby shop to get started.</p>
      <Link to="/app" className="btn-primary mt-2">Browse Shops</Link>
    </div>
  )

  const getProduct = (item) => item.productId || {}

  return (
    <div className="min-h-full bg-slate-50">

      {/* Header */}
      <div className="bg-white px-4 py-3 flex items-center gap-3 border-b border-slate-100 sticky top-0 z-20">
        <Link to="/app" className="text-slate-600"><TbArrowLeft className="text-xl" /></Link>
        <div className="flex-1">
          <h1 className="font-display font-bold text-slate-800 leading-tight">Your Cart</h1>
          <p className="text-xs text-slate-400">{itemCount} item{itemCount !== 1 ? 's' : ''} · {shop?.name || '…'}</p>
        </div>
        <button onClick={clearCart}
          className="text-xs text-rose-400 hover:text-rose-600 font-medium px-2 py-1 rounded-lg hover:bg-rose-50 transition-colors">
          Clear all
        </button>
      </div>

      <div className="px-4 pt-4 space-y-4 pb-36">

        {/* Shop banner */}
        {shop && (
          <div className="bg-gradient-to-r from-primary-600 to-primary-500 rounded-2xl p-4 flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl flex-shrink-0 bg-white/20">
              {CAT_MAP[shop.category]?.icon}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-white text-sm">{shop.name}</p>
              <p className="text-white/60 text-xs truncate">{shop.address?.full}</p>
            </div>
            {shop.deliveryEnabled && (
              <div className="text-right flex-shrink-0">
                <p className="text-white text-xs font-medium flex items-center gap-1 justify-end">
                  <TbTruck className="text-sm" /> Delivery
                </p>
                <p className="text-white/60 text-[10px]">{deliveryFee === 0 ? 'Free' : `₹${deliveryFee}`}</p>
              </div>
            )}
          </div>
        )}

        {/* Cart Items */}
        <div className="bg-white rounded-2xl shadow-card overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-2">
            <TbShoppingCart className="text-primary-500" />
            <h3 className="font-semibold text-slate-700 text-sm">Items in Cart</h3>
          </div>

          {items.map((item, idx) => {
            const p = getProduct(item)
            const lineTotal = (item.price ?? p.price ?? 0) * item.qty
            return (
              <div key={p._id || item.productId || idx}
                className={clsx('flex gap-3 p-4', idx > 0 && 'border-t border-slate-100')}>
                <div className={clsx('w-14 h-14 rounded-xl flex items-center justify-center text-2xl flex-shrink-0',
                  CAT_MAP[shop?.category]?.color || 'bg-slate-100')}>
                  {CAT_MAP[shop?.category]?.icon || '🛒'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-slate-800 text-sm leading-tight">{p.name || 'Product'}</p>
                  {p.unit && <p className="text-xs text-slate-400 mt-0.5">{p.unit}</p>}
                  <p className="text-primary-600 font-bold text-sm mt-1">₹{lineTotal}</p>
                </div>
                <div className="flex flex-col items-end gap-2 flex-shrink-0">
                  <button onClick={() => removeItem(p._id || item.productId)}
                    className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-300 hover:text-rose-400 hover:bg-rose-50 transition-colors">
                    <TbTrash className="text-base" />
                  </button>
                  <div className="flex items-center gap-1.5 bg-primary-50 border border-primary-200 rounded-xl px-2 py-1">
                    <button onClick={() => updateQty(p._id || item.productId, item.qty - 1)}
                      className="w-6 h-6 flex items-center justify-center rounded-lg bg-white shadow-sm border border-slate-100">
                      <TbMinus className="text-[11px] text-slate-700" />
                    </button>
                    <span className="text-sm font-bold text-primary-700 w-5 text-center">{item.qty}</span>
                    <button onClick={() => updateQty(p._id || item.productId, item.qty + 1)}
                      className="w-6 h-6 flex items-center justify-center rounded-lg bg-primary-500 text-white shadow-sm">
                      <TbPlus className="text-[11px]" />
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* Delivery Address */}
        <div className="bg-white rounded-2xl shadow-card overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-2">
            <TbMapPin className="text-rose-500" />
            <h3 className="font-semibold text-slate-700 text-sm">Delivery Address</h3>
            {coords && (
              <span className="ml-auto flex items-center gap-1 text-[10px] font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                <TbGps className="text-xs" /> GPS linked
              </span>
            )}
          </div>

          <div className="p-4 space-y-3">
            {/* Address labels */}
            <div className="flex gap-2">
              {ADDRESS_LABELS.map(({ id, label }) => (
                <button key={id} onClick={() => setAddrLabel(id)}
                  className={clsx(
                    'flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border-2 transition-all',
                    addrLabel === id
                      ? 'border-primary-500 bg-primary-50 text-primary-700'
                      : 'border-slate-200 text-slate-500 hover:border-slate-300'
                  )}>
                  {label}
                </button>
              ))}
            </div>

            {/* GPS button */}
            <button
              onClick={useCurrentLocation}
              disabled={geoLoading}
              className={clsx(
                'w-full flex items-center gap-3 px-4 py-3 rounded-xl border-2 transition-all text-left',
                geocoded
                  ? 'border-emerald-400 bg-emerald-50'
                  : 'border-dashed border-primary-300 bg-primary-50 hover:border-primary-400'
              )}>
              <div className={clsx('w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0',
                geocoded ? 'bg-emerald-100' : 'bg-primary-100')}>
                {geoLoading
                  ? <TbLoader2 className={clsx('text-xl animate-spin', geocoded ? 'text-emerald-600' : 'text-primary-600')} />
                  : geocoded
                    ? <TbCheck className="text-xl text-emerald-600" />
                    : <TbCurrentLocation className="text-xl text-primary-600" />
                }
              </div>
              <div className="flex-1">
                <p className={clsx('text-sm font-semibold', geocoded ? 'text-emerald-700' : 'text-primary-700')}>
                  {geoLoading ? 'Detecting location…' : geocoded ? 'Location detected ✓' : 'Use my current location'}
                </p>
                <p className={clsx('text-xs mt-0.5', geocoded ? 'text-emerald-600' : 'text-primary-500 opacity-80')}>
                  {geoLoading
                    ? 'Getting GPS coordinates…'
                    : geocoded && coords
  ? `±${Math.round(coords.accuracy ?? 0)} m · ${coords.lat.toFixed(5)}, ${coords.lng.toFixed(5)}`
  : 'Tap to auto-fill address · delivery agent gets exact pin'}
                </p>
              </div>
            </button>

            {/* Geo error */}
            {geoError && (
              <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2.5 text-xs text-amber-700">
                <TbAlertCircle className="text-sm flex-shrink-0 mt-0.5" />
                <span>{geoError}</span>
              </div>
            )}

            {/* Full address */}
            <div>
              <label className="form-label text-xs">
                Full Address <span className="text-rose-500">*</span>
              </label>
              <textarea
                rows={3}
                className="form-input resize-none text-sm"
                value={address}
                onChange={e => setAddress(e.target.value)}
                placeholder="House / flat no., street, area, city, pincode…"
              />
            </div>

            {/* Landmark */}
            <div>
              <label className="form-label text-xs">
                Landmark <span className="text-slate-400 font-normal">(optional)</span>
              </label>
              <input
                type="text"
                className="form-input text-sm"
                value={landmark}
                onChange={e => setLandmark(e.target.value)}
                placeholder="Near temple, opposite school…"
              />
            </div>

            {/* Coordinate notice */}
            {coords && (
              <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5">
                <TbShield className="text-slate-400 text-sm flex-shrink-0" />
                <p className="text-[11px] text-slate-500 leading-tight">
                  GPS coordinates saved — delivery agent can navigate directly to your exact location.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Payment */}
        <div className="bg-white rounded-2xl shadow-card overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-2">
            <TbReceipt className="text-primary-500" />
            <h3 className="font-semibold text-slate-700 text-sm">Payment Method</h3>
          </div>
          <div className="p-4 space-y-2">
            {PAYMENT_METHODS.map(pm => (
              <button key={pm.id} onClick={() => setPayMode(pm.id)}
                className={clsx(
                  'w-full flex items-center gap-3 px-4 py-3 rounded-xl border-2 transition-all',
                  payMode === pm.id ? 'border-primary-500 bg-primary-50' : 'border-slate-200 hover:border-slate-300'
                )}>
                <span className="text-2xl">{pm.icon}</span>
                <div className="flex-1 text-left">
                  <p className={clsx('text-sm font-semibold', payMode === pm.id ? 'text-primary-700' : 'text-slate-700')}>{pm.label}</p>
                  <p className="text-xs text-slate-400">{pm.desc}</p>
                </div>
                <div className={clsx('w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all',
                  payMode === pm.id ? 'border-primary-500 bg-primary-500' : 'border-slate-300')}>
                  {payMode === pm.id && <div className="w-2 h-2 bg-white rounded-full" />}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Bill Summary */}
        <div className="bg-white rounded-2xl shadow-card overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-2">
            <TbReceipt className="text-slate-400" />
            <h3 className="font-semibold text-slate-700 text-sm">Bill Summary</h3>
          </div>
          <div className="p-4 space-y-2.5 text-sm">
            {items.map((i, idx) => {
              const p = getProduct(i)
              const lineTotal = (i.price ?? p.price ?? 0) * i.qty
              return (
                <div key={idx} className="flex justify-between text-slate-600">
                  <span className="truncate pr-2 flex-1">{p.name || 'Item'} <span className="text-slate-400">× {i.qty}</span></span>
                  <span className="font-medium flex-shrink-0">₹{lineTotal}</span>
                </div>
              )
            })}
            <div className="flex justify-between text-slate-400 text-xs pt-2 border-t border-slate-100">
              <span>Subtotal</span><span>₹{total}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-slate-400">Delivery fee</span>
              <span className={deliveryFee === 0 ? 'text-emerald-600 font-semibold' : 'text-slate-600'}>
                {deliveryFee === 0 ? '🎉 Free' : `₹${deliveryFee}`}
              </span>
            </div>

            {shop?.minOrderAmount > 0 && total < shop.minOrderAmount && (
              <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 text-xs text-amber-700 mt-1">
                <TbAlertCircle className="flex-shrink-0" />
                Add ₹{shop.minOrderAmount - total} more for minimum order (₹{shop.minOrderAmount})
              </div>
            )}

            <div className="flex justify-between font-display font-bold text-slate-800 text-lg pt-3 border-t-2 border-slate-100">
              <span>Total</span>
              <span className="text-primary-600">₹{grandTotal}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Sticky Checkout */}
      <div className="fixed bottom-16 inset-x-0 px-4 pb-3 pt-2 bg-white/95 backdrop-blur-md border-t border-slate-100 z-20">
        <div className="flex items-center justify-between mb-2 px-1 text-xs text-slate-400">
          <span>{itemCount} item{itemCount !== 1 ? 's' : ''}</span>
          <span>{payMode === 'cash' ? '💵 Cash on delivery' : payMode === 'upi' ? '📲 UPI' : '💳 Card'}</span>
        </div>
        <button
          onClick={placeOrder}
          disabled={placing || !address.trim()}
          className="btn-primary w-full justify-between py-4 rounded-2xl text-base shadow-glow disabled:opacity-60">
          <span className="font-display font-bold text-lg">₹{grandTotal}</span>
          <span className="font-semibold">Place Order</span>
          {placing ? <Spinner size="sm" /> : <TbCheck className="text-xl" />}
        </button>
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════
//  ORDERS
// ══════════════════════════════════════════════════════════
const ORDER_STEPS = ['Placed','Confirmed','Preparing','Out for Delivery','Delivered']
const STEP_IDX    = { pending:0, confirmed:1, preparing:2, out_for_delivery:3, delivered:4 }

export function UserOrders() {
  const [page, setPage] = useState(1)
  const { data, loading } = useAsync(() => userAPI.myOrders({ page, limit: 10 }), [page])
  const orders = data?.orders || []

  if (loading) return <div className="p-4 space-y-4">{[1,2,3].map(i => <div key={i} className="shimmer h-48 rounded-3xl" />)}</div>

  return (
    <div className="p-4 space-y-4 pb-6">
      <h1 className="font-display font-bold text-slate-800 text-xl">My Orders</h1>
      {orders.length === 0 ? (
        <EmptyState emoji="📦" title="No orders yet"
          description="Your order history will appear here."
          action={<Link to="/app" className="btn-primary">Start Shopping</Link>} />
      ) : orders.map(o => {
        const st   = ORDER_STATUS[o.status] || ORDER_STATUS.pending
        const step = STEP_IDX[o.status] ?? 0
        return (
          <div key={o._id} className="bg-white rounded-3xl shadow-card overflow-hidden">
            <div className={clsx('px-4 py-3 flex items-center gap-3', st.bg)}>
              <div className="flex-1">
                <p className={clsx('font-semibold text-sm', st.color)}>{st.label}</p>
                <p className="text-xs text-slate-500">{o.orderNumber} · {o.shopId?.name}</p>
              </div>
              <p className="font-display font-bold text-primary-600">₹{o.total}</p>
            </div>

            {o.status !== 'cancelled' && (
              <div className="px-4 py-3 border-b border-slate-100">
                <div className="flex items-center">
                  {ORDER_STEPS.map((s, i) => (
                    <div key={s} className="flex items-center flex-1 last:flex-none">
                      <div className={clsx('w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 transition-all',
                        i <= step ? 'bg-primary-500 text-white' : 'bg-slate-200 text-slate-400')}>
                        {i <= step ? '✓' : i + 1}
                      </div>
                      {i < ORDER_STEPS.length - 1 && <div className={clsx('flex-1 h-1 mx-1 rounded-full transition-all', i < step ? 'bg-primary-500' : 'bg-slate-200')} />}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="px-4 py-3">
              {o.items?.slice(0, 2).map((item, i) => (
                <div key={i} className="flex justify-between text-sm py-0.5">
                  <span className="text-slate-600">{item.name} × {item.qty}</span>
                  <span className="text-slate-700 font-medium">₹{item.price * item.qty}</span>
                </div>
              ))}
              {o.items?.length > 2 && <p className="text-xs text-slate-400 mt-1">+{o.items.length - 2} more items</p>}
            </div>

            <div className="px-4 py-3 bg-slate-50 flex items-center justify-between gap-3">
              <div className="text-xs text-slate-400">
                {o.createdAt ? new Date(o.createdAt).toLocaleString('en-IN',{dateStyle:'medium',timeStyle:'short'}) : ''}
              </div>
              <div className="flex gap-2 flex-wrap">
                <span className={clsx('badge', o.paymentStatus === 'paid' ? 'badge-success' : 'badge-warning')}>{o.paymentMethod}</span>
                {o.status === 'delivered' && <button className="badge-neutral hover:bg-slate-200 cursor-pointer">Reorder</button>}
              </div>
            </div>
          </div>
        )
      })}
      <Pagination page={page} total={Math.ceil((data?.total||0)/10)} onChange={setPage} />
    </div>
  )
}

// ══════════════════════════════════════════════════════════
//  MAP
// ══════════════════════════════════════════════════════════
export function UserMap() {
  const [coords, setCoords]   = useState({ lat: null, lng: null, loading: true })
  const [shops, setShops]     = useState([])
  const [loading, setLoading] = useState(false)
  const [selShop, setSelShop] = useState(null)
  const [search, setSearch]   = useState('')
  const [showList, setShowList] = useState(false)

  // ── Same GPS pattern as UserHome ──────────────────────────
  useEffect(() => {
    if (!navigator.geolocation) {
      setCoords({ lat: null, lng: null, loading: false })
      return
    }
    navigator.geolocation.getCurrentPosition(
      pos => setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude, loading: false }),
      ()  => setCoords({ lat: null, lng: null, loading: false }),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    )
  }, [])

  // ── Same API call pattern as UserHome ─────────────────────
  useEffect(() => {
    if (coords.loading || !coords.lat || !coords.lng) return
    let cancelled = false
    setLoading(true)
    userAPI.nearbyShops({ lat: coords.lat, lng: coords.lng, radius: 20 })
      .then(res => { if (!cancelled) setShops(res?.data?.shops || res?.shops || []) })
      .catch(()  => { if (!cancelled) setShops([]) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [coords.loading, coords.lat, coords.lng])

  const filtered = search
    ? shops.filter(s => s.name.toLowerCase().includes(search.toLowerCase()))
    : shops

  const focal  = selShop || (shops.length ? shops[0] : null)
  const mapLat = focal?.location?.coordinates?.[1] ?? coords.lat ?? 20.5937
  const mapLng = focal?.location?.coordinates?.[0] ?? coords.lng ?? 78.9629

  const getMapUrl = () => {
    const pad  = 0.03
    const bbox = `${mapLng - pad},${mapLat - pad},${mapLng + pad},${mapLat + pad}`
    return `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${mapLat}%2C${mapLng}`
  }

  const getDirectionsUrl = (shop) => {
    const lat    = shop?.location?.coordinates?.[1]
    const lng    = shop?.location?.coordinates?.[0]
    if (!lat || !lng) return '#'
    const origin = coords.lat ? `&origin=${coords.lat},${coords.lng}` : ''
    return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}${origin}`
  }

  if (coords.loading) return (
    <div className="flex flex-col items-center justify-center h-[calc(100dvh-7.5rem)] gap-3">
      <Spinner size="lg" />
      <p className="text-sm text-slate-500">Getting your location…</p>
    </div>
  )

  if (!coords.lat || !coords.lng) return (
    <div className="flex flex-col items-center justify-center h-[calc(100dvh-7.5rem)] gap-3 px-8 text-center">
      <div className="text-5xl">📍</div>
      <h3 className="font-display font-bold text-slate-800">Location needed</h3>
      <p className="text-sm text-slate-500">Please allow location access to see shops near you on the map.</p>
    </div>
  )

  return (
    <div className="relative h-[calc(100dvh-7.5rem)] overflow-hidden">

      {/* Map — re-renders when focal point changes */}
      <iframe
        key={`${mapLat.toFixed(5)}-${mapLng.toFixed(5)}`}
        title="Shops Map"
        src={getMapUrl()}
        className="w-full h-full border-0"
        loading="lazy"
      />

      {/* User coords badge */}
      <div className="absolute top-3 left-3 z-20 flex items-center gap-1.5 bg-white/90 backdrop-blur-sm border border-slate-200 rounded-full px-3 py-1.5 shadow-sm">
        <TbCurrentLocation className="text-primary-500 text-sm" />
        <span className="text-[11px] font-medium text-slate-600">
          {coords.lat.toFixed(4)}, {coords.lng.toFixed(4)}
        </span>
      </div>

      {/* Toggle list button */}
      <button
        onClick={() => setShowList(v => !v)}
        className="absolute top-3 right-3 btn-primary shadow-lg rounded-2xl z-20 flex items-center gap-2">
        <TbList />
        {showList ? 'Hide' : 'Shops'} ({shops.length})
      </button>

      {/* Shop list panel */}
      {showList && (
        <div className="absolute top-0 right-0 bottom-0 w-72 bg-white shadow-2xl overflow-hidden flex flex-col z-20">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
            <h3 className="font-display font-semibold text-slate-700">Nearby Shops</h3>
            <button onClick={() => setShowList(false)} className="text-slate-400 hover:text-slate-600">
              <TbX />
            </button>
          </div>
          <div className="px-3 py-2 border-b border-slate-100">
            <div className="relative">
              <TbSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm pointer-events-none" />
              <input
                type="text"
                className="form-input pl-8 text-sm"
                placeholder="Filter shops…"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
            {loading && (
              <div className="p-4 space-y-3">
                {[1,2,3].map(i => <div key={i} className="shimmer h-14 rounded-xl" />)}
              </div>
            )}
            {!loading && filtered.length === 0 && (
              <div className="p-6 text-center text-sm text-slate-400">No shops found nearby.</div>
            )}
            {!loading && filtered.map(s => {
              const cat  = CAT_MAP[s.category] || CAT_MAP.other
              const sLat = s.location?.coordinates?.[1]
              const sLng = s.location?.coordinates?.[0]
              return (
                <button
                  key={s._id}
                  onClick={() => { setSelShop(s); setShowList(false) }}
                  className={clsx(
                    'w-full flex gap-3 p-3 text-left hover:bg-slate-50 transition-colors',
                    selShop?._id === s._id && 'bg-primary-50'
                  )}>
                  <div className={clsx('w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0', cat.color)}>
                    {cat.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-slate-700 text-sm truncate">{s.name}</p>
                    <p className="text-xs text-slate-400 truncate">{s.address?.full}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      {s.ratingsAverage > 0 && (
                        <div className="flex items-center gap-0.5">
                          <TbStar className="text-amber-400 text-xs" />
                          <span className="text-xs text-slate-500">{s.ratingsAverage}</span>
                        </div>
                      )}
                      {s.distance !== undefined && (
                        <span className="text-[10px] text-slate-400">{s.distance} km</span>
                      )}
                      {sLat && sLng && (
                        <span className="text-[10px] text-slate-300 ml-auto font-mono">
                          {sLat.toFixed(3)}, {sLng.toFixed(3)}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Selected shop card */}
      {selShop && (
        <div className="absolute bottom-4 inset-x-4 z-20">
          <div className="bg-white rounded-3xl shadow-2xl p-4 animate-slide-up">
            <div className="flex items-start gap-3">
              <div className={clsx(
                'w-12 h-12 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0',
                CAT_MAP[selShop.category]?.color
              )}>
                {CAT_MAP[selShop.category]?.icon}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-display font-bold text-slate-800">{selShop.name}</h3>
                <p className="text-xs text-slate-400 truncate">{selShop.address?.full}</p>
                {selShop.location?.coordinates && (
                  <p className="text-[10px] text-slate-400 mt-0.5 font-mono">
                    📍 {selShop.location.coordinates[1].toFixed(5)}, {selShop.location.coordinates[0].toFixed(5)}
                  </p>
                )}
                {selShop.ratingsAverage > 0 && (
                  <div className="flex items-center gap-1 mt-1">
                    <TbStar className="text-amber-400 text-xs" />
                    <span className="text-xs font-medium text-slate-600">
                      {selShop.ratingsAverage} ({selShop.ratingsCount})
                    </span>
                  </div>
                )}
              </div>
              <button onClick={() => setSelShop(null)} className="text-slate-400 hover:text-slate-600 flex-shrink-0">
                <TbX />
              </button>
            </div>
            <div className="flex gap-2 mt-3">
              <Link to={`/app/shop/${selShop._id}`} className="btn-primary flex-1 justify-center text-sm py-2.5">
                View Shop
              </Link>
              <a
                href={getDirectionsUrl(selShop)}
                target="_blank"
                rel="noreferrer"
                className="btn-secondary flex-1 justify-center text-sm py-2.5">
                <TbMapPin /> Navigate
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ══════════════════════════════════════════════════════════
//  PROFILE
// ══════════════════════════════════════════════════════════
export function UserProfile() {
  const { user, logout, updateUser } = useAuth()
  const navigate = useNavigate()
  const [editing, setEditing] = useState(false)
  const [saving, setSaving]   = useState(false)
  const [form, setForm] = useState({ name: user?.name || '', phone: user?.phone || '' })

  const { data: ordData } = useAsync(() => userAPI.myOrders({ limit: 1 }))
  const totalOrders = ordData?.total || 0

  const handleLogout = async () => { await logout(); navigate('/login') }

  const saveProfile = async () => {
    setSaving(true)
    try {
      const fd = new FormData()
      Object.entries(form).forEach(([k,v]) => fd.append(k, v))
      const res = await authAPI.updateProfile(fd)
      updateUser(res.data.user)
      toast.success('Profile updated!')
      setEditing(false)
    } catch {} finally { setSaving(false) }
  }

  return (
    <div className="min-h-full bg-slate-50">
      <div className="bg-gradient-to-br from-slate-900 to-slate-800 px-4 pt-6 pb-20">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-white font-display font-bold text-xl">Profile</h1>
          <button onClick={handleLogout} className="text-slate-400 hover:text-white text-sm transition-colors">Logout</button>
        </div>
        <div className="flex items-center gap-4">
          <Avatar name={user?.name} size="xl" src={user?.avatar} className="ring-4 ring-white/20" />
          <div>
            <h2 className="text-white font-display font-bold text-xl">{user?.name}</h2>
            <p className="text-slate-400 text-sm">{user?.email}</p>
            <span className="badge badge-success mt-1 text-xs">Verified</span>
          </div>
        </div>
      </div>

      <div className="px-4 -mt-10 space-y-4 pb-8">
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white rounded-2xl p-4 text-center shadow-card">
            <p className="font-display font-bold text-slate-800 text-2xl">{totalOrders}</p>
            <p className="text-xs text-slate-400 mt-0.5">Total Orders</p>
          </div>
          <div className="bg-white rounded-2xl p-4 text-center shadow-card">
            <p className="font-display font-bold text-slate-800 text-2xl">⭐</p>
            <p className="text-xs text-slate-400 mt-0.5">Loyal Customer</p>
          </div>
        </div>

        <div className="bg-white rounded-3xl shadow-card p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display font-semibold text-slate-700">Personal Info</h3>
            {!editing
              ? <button onClick={() => setEditing(true)} className="btn-outline btn-sm"><TbEdit /> Edit</button>
              : <div className="flex gap-2">
                  <button onClick={() => setEditing(false)} className="btn-secondary btn-sm">Cancel</button>
                  <button onClick={saveProfile} disabled={saving} className="btn-primary btn-sm">{saving ? <Spinner size="xs" /> : 'Save'}</button>
                </div>}
          </div>
          {editing ? (
            <div className="space-y-3">
              <FormField label="Full Name"><input type="text" className="form-input" value={form.name} onChange={e => setForm(p=>({...p,name:e.target.value}))} /></FormField>
              <FormField label="Phone"><input type="tel" className="form-input" value={form.phone} onChange={e => setForm(p=>({...p,phone:e.target.value}))} /></FormField>
            </div>
          ) : (
            <div className="space-y-3">
              {[
                { icon:'👤', label:'Name',  value: user?.name  },
                { icon:'📧', label:'Email', value: user?.email },
                { icon:'📱', label:'Phone', value: user?.phone || 'Not set' },
              ].map(row => (
                <div key={row.label} className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-slate-100 rounded-xl flex items-center justify-center text-base flex-shrink-0">{row.icon}</div>
                  <div><p className="text-xs text-slate-400">{row.label}</p><p className="text-sm font-medium text-slate-700">{row.value}</p></div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-3xl shadow-card overflow-hidden">
          {[
            { icon:'📦', label:'My Orders',   sub:'View order history', to:'/app/orders' },
            { icon:'🗺️', label:'Explore Map', sub:'Find nearby shops',  to:'/app/map'    },
            { icon:'🛒', label:'Shop Now',     sub:'Browse all shops',   to:'/app'        },
          ].map((item, i) => (
            <Link key={item.to} to={item.to} className={clsx('flex items-center gap-3 px-4 py-3.5 hover:bg-slate-50 transition-colors', i > 0 && 'border-t border-slate-100')}>
              <div className="w-9 h-9 bg-slate-100 rounded-xl flex items-center justify-center text-base flex-shrink-0">{item.icon}</div>
              <div className="flex-1"><p className="text-sm font-medium text-slate-700">{item.label}</p><p className="text-xs text-slate-400">{item.sub}</p></div>
              <span className="text-slate-300">›</span>
            </Link>
          ))}
        </div>

        <button onClick={handleLogout} className="btn-danger w-full justify-center py-3 rounded-2xl">Sign Out</button>
      </div>
    </div>
  )
}
