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
  stats: {
    total: number
    last_7_days: number
  }
}

const COMMENT_PREVIEW_LEN = 180

// Basic auth credentials are held only in component state so a browser
// refresh re-prompts. There's no point persisting them: any long-lived store
// would be worse for security than typing the password again.
export default function AdminFeedbackPage() {
  const [username, setUsername] = useState('admin')
  const [password, setPassword] = useState('')
  const [authHeader, setAuthHeader] = useState<string | null>(null)

  const [data, setData] = useState<FeedbackResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [expandedComments, setExpandedComments] = useState<Set<number>>(new Set())
  const [expandedMetadata, setExpandedMetadata] = useState<Set<number>>(new Set())

  const fetchFeedback = useCallback(async (header: string) => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/admin/feedback', {
        headers: { Authorization: header },
      })
      if (res.status === 401) {
        setAuthHeader(null)
        setError('Incorrect username or password.')
        return
      }
      if (!res.ok) {
        setError(`Request failed (${res.status}).`)
        return
      }
      const body: FeedbackResponse = await res.json()
      setData(body)
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (authHeader) fetchFeedback(authHeader)
  }, [authHeader, fetchFeedback])

  function handleLogin(e: FormEvent) {
    e.preventDefault()
    const header = 'Basic ' + btoa(`${username}:${password}`)
    setAuthHeader(header)
  }

  function toggle(set: Set<number>, setFn: (s: Set<number>) => void, id: number) {
    const next = new Set(set)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setFn(next)
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
            {error && <p className="modal-error">{error}</p>}
            <button className="cta-button" type="submit">Sign in</button>
          </form>
        </main>
      </div>
    )
  }

  return (
    <div className="page">
      <main className="admin-feedback-main">
        <h1 className="admin-feedback__title">Feedback</h1>

        {loading && <p className="admin-feedback__muted">Loading…</p>}
        {error && <p className="modal-error">{error}</p>}

        {data && (
          <>
            <div className="admin-feedback__stats">
              <div className="admin-feedback__stat">
                <span className="admin-feedback__stat-label">Total</span>
                <span className="admin-feedback__stat-value">{data.stats.total}</span>
              </div>
              <div className="admin-feedback__stat">
                <span className="admin-feedback__stat-label">Last 7 days</span>
                <span className="admin-feedback__stat-value">{data.stats.last_7_days}</span>
              </div>
            </div>

            {data.feedback.length === 0 ? (
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
                    {data.feedback.map((row) => {
                      const commentExpanded = expandedComments.has(row.id)
                      const metadataExpanded = expandedMetadata.has(row.id)
                      const needsTruncation = row.comment.length > COMMENT_PREVIEW_LEN
                      const displayComment =
                        commentExpanded || !needsTruncation
                          ? row.comment
                          : row.comment.slice(0, COMMENT_PREVIEW_LEN) + '…'
                      return (
                        <tr key={row.id}>
                          <td className="admin-feedback__ts">
                            {new Date(row.submitted_at).toLocaleString()}
                          </td>
                          <td>{row.page_context}</td>
                          <td>
                            {row.user_id === null ? (
                              <span className="admin-feedback__muted">anonymous</span>
                            ) : (
                              row.user_id
                            )}
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
    </div>
  )
}
