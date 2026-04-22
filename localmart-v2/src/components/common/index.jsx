import clsx from 'clsx'
import { HiSearch, HiX } from 'react-icons/hi'
import { TbLoader2 } from 'react-icons/tb'

// ── Avatar ────────────────────────────────────────────────
export function Avatar({ name, size = 'md', src, className = '' }) {
  const sz = { xs:'w-6 h-6 text-[10px]', sm:'w-8 h-8 text-xs', md:'w-10 h-10 text-sm', lg:'w-12 h-12 text-base', xl:'w-16 h-16 text-xl' }[size]
  const initials = name?.split(' ').map(n => n[0]).join('').slice(0,2).toUpperCase() || '?'
  if (src) return <img src={src} alt={name} className={`${sz} rounded-full object-cover flex-shrink-0 ${className}`} />
  return <div className={`${sz} rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white font-semibold flex-shrink-0 ${className}`}>{initials}</div>
}

// ── Spinner ───────────────────────────────────────────────
export function Spinner({ size = 'md', className = '' }) {
  const sz = { xs:'w-3 h-3', sm:'w-4 h-4', md:'w-6 h-6', lg:'w-10 h-10' }[size]
  return <TbLoader2 className={`${sz} animate-spin text-primary-500 ${className}`} />
}

// ── Loading screen ────────────────────────────────────────
export function LoadingScreen({ message = 'Loading…' }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-slate-50">
      <div className="w-12 h-12 bg-primary-500 rounded-2xl flex items-center justify-center animate-pulse">
        <span className="text-white text-xl font-bold font-display">L</span>
      </div>
      <Spinner size="md" />
      <p className="text-slate-500 text-sm">{message}</p>
    </div>
  )
}

// ── EmptyState ────────────────────────────────────────────
export function EmptyState({ icon: Icon, emoji, title, description, action, className = '' }) {
  return (
    <div className={`flex flex-col items-center justify-center py-14 text-center px-4 ${className}`}>
      {emoji && <div className="text-5xl mb-3">{emoji}</div>}
      {Icon && !emoji && <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mb-3"><Icon className="text-3xl text-slate-300" /></div>}
      <h3 className="font-display font-semibold text-slate-700 text-base mb-1">{title}</h3>
      {description && <p className="text-sm text-slate-400 max-w-xs mb-4">{description}</p>}
      {action}
    </div>
  )
}

// ── SearchInput ───────────────────────────────────────────
export function SearchInput({ value, onChange, placeholder = 'Search…', className = '', onClear }) {
  return (
    <div className={`relative ${className}`}>
      <HiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-base pointer-events-none" />
      <input type="text" className="form-input pl-10 pr-9 w-full" placeholder={placeholder} value={value} onChange={e => onChange(e.target.value)} />
      {value && <button onClick={() => { onChange(''); onClear?.() }} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"><HiX /></button>}
    </div>
  )
}

// ── PageHeader ────────────────────────────────────────────
export function PageHeader({ title, subtitle, action, back }) {
  return (
    <div className="page-header">
      <div className="flex items-start gap-3">
        {back}
        <div>
          <h1 className="page-title">{title}</h1>
          {subtitle && <p className="page-subtitle">{subtitle}</p>}
        </div>
      </div>
      {action && <div className="flex-shrink-0">{action}</div>}
    </div>
  )
}

// ── StatCard ──────────────────────────────────────────────
export function StatCard({ icon: Icon, label, value, sub, iconBg = 'bg-primary-100', iconColor = 'text-primary-600', trend, loading, className }) {
  if (loading) return <div className="stat-card"><div className="shimmer w-11 h-11 rounded-xl" /><div className="flex-1 space-y-2"><div className="shimmer h-3 w-20" /><div className="shimmer h-7 w-16" /></div></div>
  return (
    <div className={clsx('stat-card', className)}>
      <div className={clsx('stat-icon', iconBg)}><Icon className={clsx('text-xl', iconColor)} /></div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-slate-500 font-medium uppercase tracking-wide truncate">{label}</p>
        <p className="text-2xl font-display font-bold text-slate-800 leading-tight">{value}</p>
        {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
        {trend !== undefined && <p className={clsx('text-xs font-medium mt-0.5', trend >= 0 ? 'text-emerald-600' : 'text-rose-500')}>{trend >= 0 ? '▲' : '▼'} {Math.abs(trend)}%</p>}
      </div>
    </div>
  )
}

// ── Modal ─────────────────────────────────────────────────
export function Modal({ open, onClose, title, children, size = 'md', footer }) {
  if (!open) return null
  const sizeMap = { sm:'max-w-md', md:'max-w-lg', lg:'max-w-2xl', xl:'max-w-4xl' }
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />
      <div className={clsx('relative w-full bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl animate-slide-up', sizeMap[size])}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <h3 className="font-display font-semibold text-slate-800 text-base">{title}</h3>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-slate-100 transition-colors"><HiX className="text-slate-500" /></button>
        </div>
        <div className="px-5 py-4 max-h-[65vh] overflow-y-auto">{children}</div>
        {footer && <div className="flex items-center justify-end gap-3 px-5 py-4 border-t border-slate-100">{footer}</div>}
      </div>
    </div>
  )
}

// ── Toggle ────────────────────────────────────────────────
export function Toggle({ checked, onChange, size = 'md' }) {
  const track = { sm:'w-9 h-5', md:'w-11 h-6' }[size]
  const thumb = { sm:'w-4 h-4', md:'w-5 h-5' }[size]
  const translate = { sm:'translate-x-4', md:'translate-x-5' }[size]
  return (
    <button role="switch" aria-checked={checked} onClick={() => onChange(!checked)}
      className={clsx('relative inline-flex flex-shrink-0 rounded-full transition-colors duration-200', track, checked ? 'bg-primary-500' : 'bg-slate-200')}>
      <span className={clsx('absolute top-0.5 left-0.5 bg-white rounded-full shadow transition-transform duration-200', thumb, checked && translate)} />
    </button>
  )
}

// ── ConfirmDialog ─────────────────────────────────────────
export function ConfirmDialog({ open, onClose, onConfirm, title, message, confirmLabel = 'Confirm', danger = false, loading }) {
  return (
    <Modal open={open} onClose={onClose} title={title} size="sm"
      footer={<>
        <button onClick={onClose} className="btn-secondary" disabled={loading}>Cancel</button>
        <button onClick={onConfirm} className={danger ? 'btn-danger' : 'btn-primary'} disabled={loading}>
          {loading ? <Spinner size="sm" /> : confirmLabel}
        </button>
      </>}>
      <p className="text-slate-600 text-sm">{message}</p>
    </Modal>
  )
}

// ── DataTable ─────────────────────────────────────────────
export function DataTable({ columns, data, emptyMsg = 'No records found.', loading }) {
  if (loading) return (
    <div className="table-wrapper">
      <table className="data-table">
        <thead><tr>{columns.map(c => <th key={c.key}>{c.label}</th>)}</tr></thead>
        <tbody>{[1,2,3].map(i => <tr key={i}>{columns.map(c => <td key={c.key}><div className="shimmer h-4 rounded" /></td>)}</tr>)}</tbody>
      </table>
    </div>
  )
  return (
    <div className="table-wrapper">
      <table className="data-table">
        <thead><tr>{columns.map(c => <th key={c.key}>{c.label}</th>)}</tr></thead>
        <tbody>
          {!data?.length ? <tr><td colSpan={columns.length} className="text-center py-12 text-slate-400 text-sm">{emptyMsg}</td></tr>
          : data.map((row, i) => <tr key={row._id || row.id || i}>{columns.map(c => <td key={c.key}>{c.render ? c.render(row[c.key], row) : row[c.key]}</td>)}</tr>)}
        </tbody>
      </table>
    </div>
  )
}

// ── FormField ─────────────────────────────────────────────
export function FormField({ label, error, children, required, hint }) {
  return (
    <div>
      {label && <label className="form-label">{label}{required && <span className="text-rose-500 ml-0.5">*</span>}</label>}
      {children}
      {hint  && <p className="text-xs text-slate-400 mt-1">{hint}</p>}
      {error && <p className="form-error">{error}</p>}
    </div>
  )
}

// ── ErrorAlert ────────────────────────────────────────────
export function ErrorAlert({ message, onRetry }) {
  if (!message) return null
  return (
    <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 flex items-start gap-3">
      <span className="text-rose-500 text-lg flex-shrink-0">⚠️</span>
      <div className="flex-1">
        <p className="text-rose-700 text-sm font-medium">{message}</p>
        {onRetry && <button onClick={onRetry} className="text-rose-600 text-xs underline mt-1">Try again</button>}
      </div>
    </div>
  )
}

// ── Pagination ────────────────────────────────────────────
export function Pagination({ page, total, onChange }) {
  if (total <= 1) return null
  return (
    <div className="flex items-center justify-center gap-2 pt-4">
      <button onClick={() => onChange(page - 1)} disabled={page <= 1} className="btn-secondary btn-sm disabled:opacity-40">← Prev</button>
      <span className="text-sm text-slate-600 px-3">Page {page} of {total}</span>
      <button onClick={() => onChange(page + 1)} disabled={page >= total} className="btn-secondary btn-sm disabled:opacity-40">Next →</button>
    </div>
  )
}
