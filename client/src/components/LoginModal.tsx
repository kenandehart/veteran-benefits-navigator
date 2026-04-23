import { useState } from 'react'
import type { FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.tsx'
import Modal from './Modal.tsx'

interface LoginModalProps {
  onClose: () => void
}

export default function LoginModal({ onClose }: LoginModalProps) {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      const loggedInUser = await login(username, password)
      onClose()
      if (loggedInUser.hasResults) navigate('/dashboard')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal onClose={onClose}>
      <h2 className="modal-title">Log in</h2>
      <form className="modal-form" onSubmit={handleSubmit}>
        <label className="modal-label">
          Username
          <input
            className="q-input"
            type="text"
            value={username}
            onChange={e => setUsername(e.target.value)}
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
            onChange={e => setPassword(e.target.value)}
            required
          />
        </label>
        {error && <p className="modal-error">{error}</p>}
        <button className="cta-button" type="submit" disabled={submitting}>
          {submitting ? 'Logging in...' : 'Log in'}
        </button>
        <button
          type="button"
          className="modal-forgot-link"
          onClick={() => { onClose(); navigate('/forgot-password') }}
          style={{
            background: 'none',
            border: 'none',
            padding: '4px 0',
            marginTop: '4px',
            alignSelf: 'center',
            color: 'var(--navy)',
            textDecoration: 'underline',
            fontFamily: "'Source Sans 3', system-ui, sans-serif",
            fontSize: '0.9rem',
            cursor: 'pointer',
          }}
        >
          Forgot your password?
        </button>
      </form>
    </Modal>
  )
}
