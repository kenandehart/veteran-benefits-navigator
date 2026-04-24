import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

// Fires a pageview POST on every pathname change. /admin paths are skipped
// so an admin browsing the dashboard does not pollute their own analytics.
// Fire-and-forget: no retries, no error surfacing — a transient network
// blip or a rate-limit 429 simply drops that one event.
export function usePageViewTracking() {
  const { pathname } = useLocation()

  useEffect(() => {
    if (pathname.startsWith('/admin')) return

    fetch('/api/track/pageview', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ path: pathname }),
    }).catch(() => { /* fire-and-forget */ })
  }, [pathname])
}
