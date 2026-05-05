import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'

interface FeedbackWidgetProps {
  pageContext: 'results' | 'footer'
  metadata?: object
}

const MAX_COMMENT_LEN = 2000
const POST_SUBMIT_LOCKOUT_MS = 30_000

type Status = 'idle' | 'submitting' | 'success' | 'error'

export default function FeedbackWidget({ pageContext, metadata }: FeedbackWidgetProps) {
  const [comment, setComment] = useState('')
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<Status>('idle')
  const [errorMessage, setErrorMessage] = useState('')
  const [commentMissingError, setCommentMissingError] = useState(false)
  const lockoutTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    return () => {
      if (lockoutTimer.current) clearTimeout(lockoutTimer.current)
    }
  }, [])

  const trimmedComment = comment.trim()
  const disabled = status === 'submitting' || status === 'success'

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (status === 'submitting' || status === 'success') return

    setErrorMessage('')
    setCommentMissingError(false)

    if (trimmedComment.length === 0) {
      setCommentMissingError(true)
      textareaRef.current?.focus()
      return
    }
    if (email && !/^.+@.+\..+$/.test(email)) {
      setStatus('error')
      setErrorMessage('Please enter a valid email address.')
      return
    }
    if (trimmedComment.length > MAX_COMMENT_LEN) {
      setStatus('error')
      setErrorMessage(`Comment must be ${MAX_COMMENT_LEN} characters or fewer.`)
      return
    }

    setStatus('submitting')

    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          comment: trimmedComment,
          email: email || undefined,
          page_context: pageContext,
          metadata,
        }),
      })

      if (res.ok) {
        setStatus('success')
        lockoutTimer.current = setTimeout(() => {
          setStatus('idle')
          setComment('')
          setEmail('')
        }, POST_SUBMIT_LOCKOUT_MS)
        return
      }

      // Map known failure modes to friendly messages.
      if (res.status === 429) {
        setErrorMessage("You've sent feedback several times recently. Please try again in a few minutes.")
      } else if (res.status === 400) {
        const body = await res.json().catch(() => ({}))
        setErrorMessage(body.error ?? 'Please check your entries and try again.')
      } else {
        setErrorMessage('Something went wrong sending your feedback. Please try again.')
      }
      setStatus('error')
    } catch {
      setErrorMessage('Network error. Please check your connection and try again.')
      setStatus('error')
    }
  }

  const remaining = MAX_COMMENT_LEN - comment.length
  const counterClass =
    remaining < 0
      ? 'feedback-widget__counter feedback-widget__counter--over'
      : 'feedback-widget__counter'

  if (status === 'success') {
    return (
      <div className="feedback-widget feedback-widget--success" role="status">
        <p className="feedback-widget__success">Thanks for the feedback.</p>
      </div>
    )
  }

  return (
    <form className="feedback-widget" onSubmit={handleSubmit} noValidate>
      <label className="feedback-widget__label">
        Share your feedback
        <textarea
          ref={textareaRef}
          className="feedback-widget__textarea"
          value={comment}
          onChange={(e) => {
            const next = e.target.value.slice(0, MAX_COMMENT_LEN)
            setComment(next)
            if (commentMissingError && next.trim().length > 0) {
              setCommentMissingError(false)
            }
          }}
          maxLength={MAX_COMMENT_LEN}
          rows={4}
          placeholder="What worked, what didn't, what's missing?"
          disabled={status === 'submitting'}
          aria-invalid={commentMissingError}
          aria-describedby={commentMissingError ? 'feedback-comment-error' : undefined}
          required
        />
        <div className="feedback-widget__textarea-meta">
          {commentMissingError && (
            <p id="feedback-comment-error" className="feedback-widget__error" role="alert">
              Please enter your feedback.
            </p>
          )}
          <span className={counterClass} aria-live="polite">
            {comment.length} / {MAX_COMMENT_LEN}
          </span>
        </div>
      </label>
      <label className="feedback-widget__label">
        Email <span className="feedback-widget__optional">(optional — if you'd like a reply)</span>
        <input
          className="q-input"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={status === 'submitting'}
        />
      </label>
      {status === 'error' && errorMessage && (
        <p className="feedback-widget__error" role="alert">{errorMessage}</p>
      )}
      <button className="cta-button" type="submit" disabled={disabled}>
        {status === 'submitting' ? 'Sending...' : 'Send'}
      </button>
    </form>
  )
}
