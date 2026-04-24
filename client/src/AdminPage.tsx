import './App.css'
import { useCallback, useEffect, useState } from 'react'
import type { FormEvent } from 'react'

interface FeedbackRow {
  id: number
  comment: string
  email: string | null
  page_context: string
  metadata: unknown
  user_agent: string | null
  user_id: number | null
  submitted_at: string
}

interface FeedbackResponse {
  feedback: FeedbackRow[]
  stats: { total: number; last_7_days: number }
}

interface AccountRow {
  id: number
  username: string
  email: string | null
  created_at: string
  has_completed_questionnaire: boolean
  matched_benefit_count: number
  last_seen: string | null
  last_seen_adjusted: string | null
}

interface AccountsResponse {
  accounts: AccountRow[]
  total_count: number
}

interface AnalyticsResponse {
  total_pageviews: number
  unique_visitors: number
  total_accounts: number
  total_questionnaires_completed: number
  pageviews_by_day: { date: string; pageviews: number; unique_visitors: number }[]
  pageviews_by_month: { month: string; pageviews: number; unique_visitors: number }[]
  top_paths: { path: string; pageviews: number }[]
}

type Tab = 'overview' | 'analytics' | 'accounts' | 'feedback'

const COMMENT_PREVIEW_LEN = 180

// Inline styles — no CSS classes exist for tab navigation and App.css is
// off-limits for this change. Kept verbose-but-explicit here; if we grow
// more admin UI we should promote these to a class.
const tabBarStyle: React.CSSProperties = {
  display: 'flex',
  gap: '24px',
  borderBottom: '1px solid var(--border)',
  marginBottom: '24px',
}

function tabBtnStyle(active: boolean): React.CSSProperties {
  return {
    background: 'none',
    border: 'none',
    padding: '12px 2px',
    fontFamily: "'Source Sans 3', system-ui, sans-serif",
    fontSize: '0.95rem',
    fontWeight: active ? 600 : 400,
    color: 'var(--navy)',
    borderBottom: active ? '2px solid var(--navy)' : '2px solid transparent',
    marginBottom: '-1px',
    cursor: 'pointer',
  }
}

function formatDate(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleString()
}

function formatDay(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
}

function formatMonth(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'long' })
}

// Basic auth credentials are held only in component state so a browser
// refresh re-prompts. There's no point persisting them: any long-lived store
// would be worse for security than typing the password again.
export default function AdminPage() {
  const [username, setUsername] = useState('admin')
  const [password, setPassword] = useState('')
  const [authHeader, setAuthHeader] = useState<string | null>(null)
  const [loginError, setLoginError] = useState('')

  const [activeTab, setActiveTab] = useState<Tab>('overview')

  const [analytics, setAnalytics] = useState<AnalyticsResponse | null>(null)
  const [accounts, setAccounts] = useState<AccountsResponse | null>(null)
  const [feedback, setFeedback] = useState<FeedbackResponse | null>(null)

  const [loading, setLoading] = useState<'analytics' | 'accounts' | 'feedback' | null>(null)
  const [error, setError] = useState('')

  const [expandedComments, setExpandedComments] = useState<Set<number>>(new Set())
  const [expandedMetadata, setExpandedMetadata] = useState<Set<number>>(new Set())

  const [deleteTarget, setDeleteTarget] = useState<AccountRow | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState('')

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [])

  const apiFetch = useCallback(
    async (path: string, init: RequestInit = {}) => {
      if (!authHeader) throw new Error('not authenticated')
      const headers = new Headers(init.headers)
      headers.set('Authorization', authHeader)
      const res = await fetch(path, { ...init, headers })
      if (res.status === 401) {
        setAuthHeader(null)
        setLoginError('Session rejected. Please sign in again.')
        throw new Error('unauthorized')
      }
      return res
    },
    [authHeader],
  )

  const loadAnalytics = useCallback(async () => {
    setLoading('analytics')
    setError('')
    try {
      const res = await apiFetch('/api/admin/analytics')
      if (!res.ok) {
        setError(`Request failed (${res.status}).`)
        return
      }
      setAnalytics(await res.json())
    } catch {
      // 401 handled in apiFetch; network errors land here
      setError((prev) => prev || 'Network error. Please try again.')
    } finally {
      setLoading(null)
    }
  }, [apiFetch])

  const loadAccounts = useCallback(async () => {
    setLoading('accounts')
    setError('')
    try {
      const res = await apiFetch('/api/admin/accounts')
      if (!res.ok) {
        setError(`Request failed (${res.status}).`)
        return
      }
      setAccounts(await res.json())
    } catch {
      setError((prev) => prev || 'Network error. Please try again.')
    } finally {
      setLoading(null)
    }
  }, [apiFetch])

  const loadFeedback = useCallback(async () => {
    setLoading('feedback')
    setError('')
    try {
      const res = await apiFetch('/api/admin/feedback')
      if (!res.ok) {
        setError(`Request failed (${res.status}).`)
        return
      }
      setFeedback(await res.json())
    } catch {
      setError((prev) => prev || 'Network error. Please try again.')
    } finally {
      setLoading(null)
    }
  }, [apiFetch])

  // Every tab refetches on activation. The data these tabs show (accounts,
  // feedback, pageviews) can change while the admin is in the dashboard, so
  // caching would show stale numbers. Each load overwrites its cache state,
  // which is still used by the render logic below.
  useEffect(() => {
    if (!authHeader) return
    if (activeTab === 'overview' || activeTab === 'analytics') loadAnalytics()
    else if (activeTab === 'accounts') loadAccounts()
    else if (activeTab === 'feedback') loadFeedback()
  }, [authHeader, activeTab, loadAnalytics, loadAccounts, loadFeedback])

  function handleLogin(e: FormEvent) {
    e.preventDefault()
    setLoginError('')
    const header = 'Basic ' + btoa(`${username}:${password}`)
    setAuthHeader(header)
  }

  function toggle(set: Set<number>, setFn: (s: Set<number>) => void, id: number) {
    const next = new Set(set)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setFn(next)
  }

  async function confirmDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    setDeleteError('')
    try {
      const res = await apiFetch(`/api/admin/accounts/${deleteTarget.id}`, { method: 'DELETE' })
      if (!res.ok) {
        setDeleteError(`Delete failed (${res.status}).`)
        return
      }
      setAccounts((prev) =>
        prev ? { accounts: prev.accounts.filter((a) => a.id !== deleteTarget.id), total_count: prev.total_count - 1 } : prev,
      )
      setDeleteTarget(null)
    } catch {
      setDeleteError('Network error. Please try again.')
    } finally {
      setDeleting(false)
    }
  }

  if (!authHeader) {
    return (
      <div className="page">
        <main className="admin-feedback-main admin-feedback-main--login">
          <form className="admin-login" onSubmit={handleLogin}>
            <h1 className="admin-login__title">Admin sign in</h1>
            <label className="modal-label">
              Username
              <input
                className="q-input"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoFocus
                required
              />
            </label>
            <label className="modal-label">
              Password
              <input
                className="q-input"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </label>
            {loginError && <p className="modal-error">{loginError}</p>}
            <button className="cta-button" type="submit">Sign in</button>
          </form>
        </main>
      </div>
    )
  }

  const tabs: { key: Tab; label: string }[] = [
    { key: 'overview', label: 'Overview' },
    { key: 'analytics', label: 'Analytics' },
    { key: 'accounts', label: 'Accounts' },
    { key: 'feedback', label: 'Feedback' },
  ]

  return (
    <div className="page">
      <main className="admin-feedback-main">
        <h1 className="admin-feedback__title">Admin</h1>

        <div style={tabBarStyle} role="tablist">
          {tabs.map((t) => (
            <button
              key={t.key}
              type="button"
              role="tab"
              aria-selected={activeTab === t.key}
              style={tabBtnStyle(activeTab === t.key)}
              onClick={() => setActiveTab(t.key)}
            >
              {t.label}
            </button>
          ))}
        </div>

        {error && <p className="modal-error">{error}</p>}
        {loading && <p className="admin-feedback__muted">Loading…</p>}

        {activeTab === 'overview' && analytics && (
          <div className="admin-feedback__stats">
            <div className="admin-feedback__stat">
              <span className="admin-feedback__stat-label">Accounts</span>
              <span className="admin-feedback__stat-value">{analytics.total_accounts}</span>
            </div>
            <div className="admin-feedback__stat">
              <span className="admin-feedback__stat-label">Questionnaires completed</span>
              <span className="admin-feedback__stat-value">{analytics.total_questionnaires_completed}</span>
            </div>
            <div className="admin-feedback__stat">
              <span className="admin-feedback__stat-label">Total pageviews</span>
              <span className="admin-feedback__stat-value">{analytics.total_pageviews}</span>
            </div>
            <div className="admin-feedback__stat">
              <span className="admin-feedback__stat-label">Unique visitors</span>
              <span className="admin-feedback__stat-value">{analytics.unique_visitors}</span>
            </div>
          </div>
        )}

        {activeTab === 'analytics' && analytics && (
          <>
            <div className="admin-feedback__stats">
              <div className="admin-feedback__stat">
                <span className="admin-feedback__stat-label">Total pageviews</span>
                <span className="admin-feedback__stat-value">{analytics.total_pageviews}</span>
              </div>
              <div className="admin-feedback__stat">
                <span className="admin-feedback__stat-label">Unique visitors</span>
                <span className="admin-feedback__stat-value">{analytics.unique_visitors}</span>
              </div>
            </div>

            <h2 className="admin-feedback__title" style={{ fontSize: '1.1rem', marginTop: '32px' }}>Last 30 days (by day)</h2>
            {analytics.pageviews_by_day.length === 0 ? (
              <p className="admin-feedback__muted">No data.</p>
            ) : (
              <div className="admin-feedback__table-wrap">
                <table className="admin-feedback__table">
                  <thead>
                    <tr><th>Date</th><th>Pageviews</th><th>Unique visitors</th></tr>
                  </thead>
                  <tbody>
                    {analytics.pageviews_by_day.map((row) => (
                      <tr key={row.date}>
                        <td>{formatDay(row.date)}</td>
                        <td>{row.pageviews}</td>
                        <td>{row.unique_visitors}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <h2 className="admin-feedback__title" style={{ fontSize: '1.1rem', marginTop: '32px' }}>Last 12 months (by month)</h2>
            {analytics.pageviews_by_month.length === 0 ? (
              <p className="admin-feedback__muted">No data.</p>
            ) : (
              <div className="admin-feedback__table-wrap">
                <table className="admin-feedback__table">
                  <thead>
                    <tr><th>Month</th><th>Pageviews</th><th>Unique visitors</th></tr>
                  </thead>
                  <tbody>
                    {analytics.pageviews_by_month.map((row) => (
                      <tr key={row.month}>
                        <td>{formatMonth(row.month)}</td>
                        <td>{row.pageviews}</td>
                        <td>{row.unique_visitors}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <h2 className="admin-feedback__title" style={{ fontSize: '1.1rem', marginTop: '32px' }}>Top paths (all time)</h2>
            {analytics.top_paths.length === 0 ? (
              <p className="admin-feedback__muted">No data.</p>
            ) : (
              <div className="admin-feedback__table-wrap">
                <table className="admin-feedback__table">
                  <thead>
                    <tr><th>Path</th><th>Pageviews</th></tr>
                  </thead>
                  <tbody>
                    {analytics.top_paths.map((row) => (
                      <tr key={row.path}>
                        <td>{row.path}</td>
                        <td>{row.pageviews}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}

        {activeTab === 'accounts' && accounts && (
          <>
            <div className="admin-feedback__stats">
              <div className="admin-feedback__stat">
                <span className="admin-feedback__stat-label">Total accounts</span>
                <span className="admin-feedback__stat-value">{accounts.total_count}</span>
              </div>
            </div>

            {accounts.accounts.length === 0 ? (
              <p className="admin-feedback__muted">No accounts yet.</p>
            ) : (
              <div className="admin-feedback__table-wrap">
                <table className="admin-feedback__table">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Username</th>
                      <th>Email</th>
                      <th>Created</th>
                      <th>Questionnaire</th>
                      <th>Matches</th>
                      <th>Last seen</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {accounts.accounts.map((row) => (
                      <tr key={row.id}>
                        <td>{row.id}</td>
                        <td>{row.username}</td>
                        <td>{row.email ?? <span className="admin-feedback__muted">—</span>}</td>
                        <td className="admin-feedback__ts">{formatDate(row.created_at)}</td>
                        <td>{row.has_completed_questionnaire ? 'Yes' : 'No'}</td>
                        <td>{row.matched_benefit_count}</td>
                        <td className="admin-feedback__ts">{formatDate(row.last_seen_adjusted)}</td>
                        <td>
                          <button
                            type="button"
                            className="admin-feedback__toggle"
                            onClick={() => { setDeleteTarget(row); setDeleteError('') }}
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}

        {activeTab === 'feedback' && feedback && (
          <>
            <div className="admin-feedback__stats">
              <div className="admin-feedback__stat">
                <span className="admin-feedback__stat-label">Total</span>
                <span className="admin-feedback__stat-value">{feedback.stats.total}</span>
              </div>
              <div className="admin-feedback__stat">
                <span className="admin-feedback__stat-label">Last 7 days</span>
                <span className="admin-feedback__stat-value">{feedback.stats.last_7_days}</span>
              </div>
            </div>

            {feedback.feedback.length === 0 ? (
              <p className="admin-feedback__muted">No feedback yet.</p>
            ) : (
              <div className="admin-feedback__table-wrap">
                <table className="admin-feedback__table">
                  <thead>
                    <tr>
                      <th>Submitted</th>
                      <th>Page</th>
                      <th>User</th>
                      <th>Email</th>
                      <th>Comment</th>
                      <th>Metadata</th>
                    </tr>
                  </thead>
                  <tbody>
                    {feedback.feedback.map((row) => {
                      const commentExpanded = expandedComments.has(row.id)
                      const metadataExpanded = expandedMetadata.has(row.id)
                      const needsTruncation = row.comment.length > COMMENT_PREVIEW_LEN
                      const displayComment =
                        commentExpanded || !needsTruncation
                          ? row.comment
                          : row.comment.slice(0, COMMENT_PREVIEW_LEN) + '…'
                      return (
                        <tr key={row.id}>
                          <td className="admin-feedback__ts">{formatDate(row.submitted_at)}</td>
                          <td>{row.page_context}</td>
                          <td>
                            {row.user_id === null
                              ? <span className="admin-feedback__muted">anonymous</span>
                              : row.user_id}
                          </td>
                          <td>{row.email ?? <span className="admin-feedback__muted">—</span>}</td>
                          <td className="admin-feedback__comment">
                            <span>{displayComment}</span>
                            {needsTruncation && (
                              <button
                                type="button"
                                className="admin-feedback__toggle"
                                onClick={() => toggle(expandedComments, setExpandedComments, row.id)}
                              >
                                {commentExpanded ? 'Collapse' : 'Expand'}
                              </button>
                            )}
                          </td>
                          <td>
                            {row.metadata == null ? (
                              <span className="admin-feedback__muted">—</span>
                            ) : (
                              <>
                                <button
                                  type="button"
                                  className="admin-feedback__toggle"
                                  onClick={() => toggle(expandedMetadata, setExpandedMetadata, row.id)}
                                >
                                  {metadataExpanded ? 'Hide' : 'Show'}
                                </button>
                                {metadataExpanded && (
                                  <pre className="admin-feedback__metadata">
                                    {JSON.stringify(row.metadata, null, 2)}
                                  </pre>
                                )}
                              </>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </main>

      {deleteTarget && (
        <div className="dialog-overlay" onClick={() => !deleting && setDeleteTarget(null)}>
          <div className="dialog" onClick={(e) => e.stopPropagation()}>
            <h2 className="dialog__title">Delete account?</h2>
            <p className="dialog__body">
              This permanently deletes <strong>{deleteTarget.username}</strong> (id {deleteTarget.id}),
              their saved questionnaire, and their active sessions. Their feedback rows stay but
              get their user_id cleared. This cannot be undone.
            </p>
            {deleteError && <p className="modal-error">{deleteError}</p>}
            <div className="dialog__actions">
              <button
                className="dialog__cancel"
                onClick={() => setDeleteTarget(null)}
                disabled={deleting}
              >
                Cancel
              </button>
              <button
                className="cta-button"
                onClick={confirmDelete}
                disabled={deleting}
              >
                {deleting ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
