import { useState } from 'react'
import type { FormEvent } from 'react'
import { useAuth } from '../context/AuthContext.tsx'
import Modal from './Modal.tsx'

interface RegisterModalProps {
  onClose: () => void
  answers?: unknown
  matchedBenefitIds?: number[]
  onSuccess?: () => void
}

export default function RegisterModal({ onClose, answers, matchedBenefitIds, onSuccess }: RegisterModalProps) {
  const { register } = useAuth()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    if (password.length < 10) {
      setError('Password must be at least 10 characters.')
      return
    }
    if (email && !/^.+@.+\..+$/.test(email)) {
      setError('Please enter a valid email address')
      return
    }
    setSubmitting(true)
    try {
      await register(username, password, email || undefined, answers, matchedBenefitIds)
      if (onSuccess) onSuccess()
      else onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal onClose={onClose}>
      <h2 className="modal-title">Sign up</h2>
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
            minLength={10}
            required
          />
          <span className="modal-helper">Must be at least 10 characters.</span>
        </label>
        <label className="modal-label">
          Email <span className="modal-optional">(optional)</span>
          <input
            className="q-input"
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
          />
          <span className="modal-helper">
            Adding an email lets you recover your account if you forget your password.
          </span>
        </label>
        {error && <p className="modal-error">{error}</p>}
        <button className="cta-button" type="submit" disabled={submitting}>
          {submitting ? 'Creating account...' : 'Sign up'}
        </button>
      </form>
    </Modal>
  )
}
