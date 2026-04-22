import { useState, useEffect, useCallback, useRef } from 'react'

// ── useAsync — run any async fn with loading/error state ──
export function useAsync(asyncFn, deps = [], runImmediately = true) {
  const [state, setState] = useState({ data: null, loading: runImmediately, error: null })
  const mountedRef = useRef(true)

  useEffect(() => { mountedRef.current = true; return () => { mountedRef.current = false } }, [])

  const execute = useCallback(async (...args) => {
    setState(p => ({ ...p, loading: true, error: null }))
    try {
      const result = await asyncFn(...args)
      if (mountedRef.current) setState({ data: result?.data ?? result, loading: false, error: null })
      return result
    } catch (err) {
      if (mountedRef.current) setState(p => ({ ...p, loading: false, error: err?.response?.data?.message || err.message }))
      throw err
    }
  }, deps) // eslint-disable-line

  useEffect(() => { if (runImmediately) execute() }, []) // eslint-disable-line

  const setData = useCallback(d => setState(p => ({ ...p, data: d })), [])

  return { ...state, execute, setData, refetch: execute }
}

// ── useDebounce ───────────────────────────────────────────
export function useDebounce(value, delay = 400) {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(t)
  }, [value, delay])
  return debounced
}

// ── useToggle ─────────────────────────────────────────────
export function useToggle(init = false) {
  const [on, set] = useState(init)
  const toggle = useCallback(() => set(v => !v), [])
  const setOn   = useCallback(() => set(true), [])
  const setOff  = useCallback(() => set(false), [])
  return [on, { toggle, setOn, setOff }]
}

// ── usePagination ─────────────────────────────────────────
export function usePagination(items = [], pageSize = 10) {
  const [page, setPage] = useState(1)
  const total  = Math.ceil(items.length / pageSize)
  const paged  = items.slice((page - 1) * pageSize, page * pageSize)
  return { page, setPage, total, paged, hasNext: page < total, hasPrev: page > 1 }
}

// ── useGeolocation ────────────────────────────────────────
export function useGeolocation() {
  const [state, setState] = useState({ lat: 10.7867, lng: 76.6548, error: null, loading: true })
  useEffect(() => {
    if (!navigator.geolocation) {
      setState(p => ({ ...p, loading: false, error: 'Geolocation not supported' }))
      return
    }
    navigator.geolocation.getCurrentPosition(
      pos => setState({ lat: pos.coords.latitude, lng: pos.coords.longitude, error: null, loading: false }),
      ()  => setState(p => ({ ...p, loading: false })) // use default coords on error
    )
  }, [])
  return state
}

// ── useLocalStorage ───────────────────────────────────────
export function useLocalStorage(key, init) {
  const [val, setVal] = useState(() => {
    try { const s = localStorage.getItem(key); return s ? JSON.parse(s) : init }
    catch { return init }
  })
  const set = useCallback(v => { setVal(v); try { localStorage.setItem(key, JSON.stringify(v)) } catch {} }, [key])
  return [val, set]
}

// ── useIntersection (lazy load / infinite scroll) ─────────
export function useIntersection(ref, options = {}) {
  const [isIntersecting, setIntersecting] = useState(false)
  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => setIntersecting(e.isIntersecting), options)
    if (ref.current) obs.observe(ref.current)
    return () => obs.disconnect()
  }, [ref]) // eslint-disable-line
  return isIntersecting
}

// ── useMediaQuery ─────────────────────────────────────────
export function useMediaQuery(query) {
  const [matches, setMatches] = useState(() => window.matchMedia(query).matches)
  useEffect(() => {
    const mq = window.matchMedia(query)
    const h = e => setMatches(e.matches)
    mq.addEventListener('change', h)
    return () => mq.removeEventListener('change', h)
  }, [query])
  return matches
}

export const isMobile = () => window.innerWidth < 768
