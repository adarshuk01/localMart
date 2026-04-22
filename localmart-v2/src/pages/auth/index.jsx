import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '@context/AuthContext'
import { HiOutlineShoppingBag, HiOutlineLockClosed, HiOutlineMail, HiOutlineUser, HiOutlinePhone } from 'react-icons/hi'
import { TbMapPin, TbBuilding, TbTruck, TbUser, TbShield, TbLoader2 } from 'react-icons/tb'
import { Spinner } from '@components/common'
import toast from 'react-hot-toast'
import clsx from 'clsx'

const ROLE_PATH = { admin:'/admin', shopkeeper:'/shop', delivery:'/delivery', user:'/app', stock:'/delivery', cashier:'/delivery', manager:'/shop' }

const DEMO = [
  { label:'Admin',       email:'admin@localmart.in',    icon:'🛡️', hint:'Full platform access' },
  { label:'Shopkeeper',  email:'shop@greenleaf.in',     icon:'🏪', hint:'Manage shop & products' },
  { label:'Delivery',    email:'delivery@greenleaf.in', icon:'🚲', hint:'View & complete orders' },
  { label:'User',        email:'user@example.com',      icon:'👤', hint:'Browse & order' },
]

// ── LOGIN PAGE ────────────────────────────────────────────
export function LoginPage() {
  const { login } = useAuth()
  const navigate  = useNavigate()
  const [form, setForm] = useState({ email: '', password: '' })
  const [loading, setLoading] = useState(false)

  const handleLogin = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const user = await login(form.email, form.password)
      toast.success(`Welcome, ${user.name}! 👋`)
      navigate(ROLE_PATH[user.role] || '/login')
    } catch {} finally { setLoading(false) }
  }

  const quickLogin = async (email) => {
    setLoading(true)
    try {
      const user = await login(email, 'Admin@123') || await login(email, 'Shop@1234') || await login(email, 'User@1234')
      toast.success(`Logged in as ${user.name}`)
      navigate(ROLE_PATH[user.role] || '/login')
    } catch {
      // try other passwords
      const passwords = ['Admin@123','Shop@1234','User@1234','Delivery@123']
      for (const pw of passwords) {
        try {
          const user = await login(email, pw)
          toast.success(`Logged in as ${user.name}`)
          navigate(ROLE_PATH[user.role] || '/login')
          return
        } catch {}
      }
    } finally { setLoading(false) }
  }

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      {/* Left panel */}
      <div className="hidden lg:flex flex-col justify-between w-[420px] xl:w-[480px] flex-shrink-0 bg-navy-900 p-10 relative overflow-hidden">
        <div className="absolute inset-0 opacity-30" style={{background:'radial-gradient(at 40% 20%, #0f766e 0px, transparent 50%), radial-gradient(at 80% 0%, #4f46e5 0px, transparent 50%)'}} />
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-12">
            <div className="w-10 h-10 bg-primary-500 rounded-xl flex items-center justify-center"><HiOutlineShoppingBag className="text-white text-xl" /></div>
            <span className="text-white font-display font-bold text-xl">LocalMart</span>
          </div>
          <h1 className="text-4xl font-display font-bold text-white leading-tight mb-4">Your neighbourhood,<br /><span className="text-primary-400">at your fingertips.</span></h1>
          <p className="text-slate-400 text-sm leading-relaxed">Discover local shops, order groceries, book salon appointments — all in one platform.</p>
        </div>
        <div className="relative z-10 space-y-2">
          {[
            { icon:TbShield,   label:'Admin Portal',     color:'from-violet-600 to-indigo-600' },
            { icon:TbBuilding, label:'Shopkeeper Panel',  color:'from-teal-500 to-emerald-600'  },
            { icon:TbTruck,    label:'Delivery Panel',    color:'from-orange-500 to-amber-500'  },
            { icon:TbUser,     label:'User App',          color:'from-blue-500 to-cyan-500'     },
          ].map(r => {
            const Icon = r.icon
            return (
              <div key={r.label} className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/10">
                <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${r.color} flex items-center justify-center flex-shrink-0`}><Icon className="text-white text-sm" /></div>
                <span className="text-slate-300 text-sm">{r.label}</span>
              </div>
            )
          })}
        </div>
        <div className="relative z-10 flex items-center gap-2 text-slate-600 text-xs"><TbMapPin /> Palakkad · Kerala · India</div>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center p-6 md:p-10">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="flex items-center gap-2 mb-8 lg:hidden">
            <div className="w-8 h-8 bg-primary-500 rounded-lg flex items-center justify-center"><HiOutlineShoppingBag className="text-white text-sm" /></div>
            <span className="font-display font-bold text-slate-800">LocalMart</span>
          </div>

          <h2 className="text-2xl font-display font-bold text-slate-800 mb-1">Sign in</h2>
          <p className="text-slate-500 text-sm mb-6">Enter your credentials to continue.</p>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="form-label">Email</label>
              <div className="relative">
                <HiOutlineMail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input type="email" required className="form-input pl-10" placeholder="you@example.com" value={form.email} onChange={e => setForm(p => ({...p, email:e.target.value}))} />
              </div>
            </div>
            <div>
              <label className="form-label">Password</label>
              <div className="relative">
                <HiOutlineLockClosed className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input type="password" required className="form-input pl-10" placeholder="••••••••" value={form.password} onChange={e => setForm(p => ({...p, password:e.target.value}))} />
              </div>
            </div>
            <button type="submit" className="btn-primary w-full justify-center py-3" disabled={loading}>
              {loading ? <TbLoader2 className="animate-spin" /> : 'Sign In'}
            </button>
          </form>

          <div className="mt-5 text-center text-sm text-slate-500">
            Don't have an account? <Link to="/register" className="text-primary-600 font-medium hover:underline">Register</Link>
          </div>

          {/* Demo accounts */}
          <div className="mt-8">
            <div className="flex items-center gap-3 mb-3">
              <div className="flex-1 h-px bg-slate-200" />
              <span className="text-xs text-slate-400 whitespace-nowrap">Quick Demo Login</span>
              <div className="flex-1 h-px bg-slate-200" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              {DEMO.map(d => (
                <button key={d.email} onClick={() => quickLogin(d.email)} disabled={loading}
                  className="flex items-center gap-2 p-3 rounded-xl border border-slate-200 hover:border-primary-300 hover:bg-primary-50 transition-all text-left group disabled:opacity-50">
                  <span className="text-lg">{d.icon}</span>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-slate-700 truncate">{d.label}</p>
                    <p className="text-[10px] text-slate-400 truncate">{d.hint}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── REGISTER PAGE ─────────────────────────────────────────
export function RegisterPage() {
  const { register } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ name:'', email:'', phone:'', password:'', confirmPassword:'', role:'user' })
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (form.password !== form.confirmPassword) { toast.error('Passwords do not match.'); return }
    if (form.password.length < 8) { toast.error('Password must be at least 8 characters.'); return }
    setLoading(true)
    try {
      const user = await register({ name:form.name, email:form.email, phone:form.phone, password:form.password, role:form.role })
      toast.success('Account created!')
      navigate(ROLE_PATH[user.role] || '/app')
    } catch {} finally { setLoading(false) }
  }

  const F = (label, key, type='text', placeholder='') => (
    <div>
      <label className="form-label">{label}</label>
      <input type={type} className="form-input" placeholder={placeholder} value={form[key]} onChange={e => setForm(p => ({...p, [key]:e.target.value}))} required />
    </div>
  )

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-slate-50">
      <div className="w-full max-w-md">
        <div className="flex items-center gap-2 mb-8">
          <Link to="/login" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary-500 rounded-lg flex items-center justify-center"><HiOutlineShoppingBag className="text-white text-sm" /></div>
            <span className="font-display font-bold text-slate-800">LocalMart</span>
          </Link>
        </div>

        <h2 className="text-2xl font-display font-bold text-slate-800 mb-1">Create account</h2>
        <p className="text-slate-500 text-sm mb-6">Join your local community marketplace.</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          {F('Full Name', 'name', 'text', 'Arjun Nair')}
          {F('Email',     'email', 'email', 'arjun@example.com')}
          {F('Phone',     'phone', 'tel',   '+91 98765 43210')}

          <div>
            <label className="form-label">Account Type</label>
            <div className="grid grid-cols-2 gap-2">
              {[{v:'user',label:'Customer',icon:'👤'},{v:'shopkeeper',label:'Shop Owner',icon:'🏪'}].map(r => (
                <button key={r.v} type="button" onClick={() => setForm(p => ({...p, role:r.v}))}
                  className={clsx('flex items-center gap-2 p-3 rounded-xl border-2 text-sm font-medium transition-all',
                    form.role === r.v ? 'border-primary-500 bg-primary-50 text-primary-700' : 'border-slate-200 text-slate-600 hover:border-slate-300')}>
                  <span>{r.icon}</span> {r.label}
                </button>
              ))}
            </div>
          </div>

          {F('Password', 'password', 'password', 'Min 8 characters')}
          {F('Confirm Password', 'confirmPassword', 'password', 'Re-enter password')}

          <button type="submit" className="btn-primary w-full justify-center py-3" disabled={loading}>
            {loading ? <TbLoader2 className="animate-spin" /> : 'Create Account'}
          </button>
        </form>

        <p className="mt-5 text-center text-sm text-slate-500">
          Already have an account? <Link to="/login" className="text-primary-600 font-medium hover:underline">Sign in</Link>
        </p>
      </div>
    </div>
  )
}
