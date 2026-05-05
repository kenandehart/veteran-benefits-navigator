import { useEffect, useId, useRef } from 'react'
import { createPortal } from 'react-dom'
import type { KeyboardEvent as ReactKeyboardEvent, ReactNode, RefObject } from 'react'

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

export interface ModalProps {
  children: ReactNode
  onClose: () => void
  /**
   * Id of a heading the consumer renders inside the modal. Used as the
   * aria-labelledby target so screen readers announce the dialog name.
   * Prefer this over `title` whenever the consumer already has a visible
   * heading.
   */
  titleId?: string
  /**
   * Fallback when the consumer has no visible heading. The Modal renders a
   * visually-hidden <h2> with this text and uses it as the aria-labelledby
   * target. Ignored if `titleId` is also provided.
   */
  title?: string
  /**
   * Ref to the element that opened the modal — populate it synchronously
   * from `event.currentTarget` in the click handler before flipping the
   * "modal open" state. Used to restore focus on close. Strongly
   * recommended: without it the Modal falls back to
   * `document.activeElement` captured at first render, which is
   * unreliable in Safari and Firefox where clicking a non-form button
   * does not move keyboard focus to it.
   */
  triggerRef?: RefObject<HTMLElement | null>
}

/**
 * Accessible dialog primitive.
 *
 * Handled internally:
 *   - role="dialog" + aria-modal="true" + aria-labelledby
 *   - focus moves into the modal on open and returns to the trigger on close
 *   - focus trap: Tab and Shift+Tab cycle through the modal's focusables
 *   - background `inert` (blocks tab order, pointer events, and AT for the
 *     rest of the app)
 *   - body scroll lock
 *   - Escape and backdrop click both close the modal
 *
 * Required from consumers:
 *   - One of `titleId` (preferred — points at a heading the consumer already
 *     renders) or `title` (Modal renders a visually-hidden heading).
 *   - `triggerRef` (recommended) — a parent-owned ref populated from
 *     `event.currentTarget` in the click handler that opens the modal.
 *     Reliable focus restoration depends on it. Falls back to
 *     `document.activeElement` at first render, which is unreliable in
 *     Safari and Firefox where clicking a non-form button does not move
 *     keyboard focus to it.
 *
 * Initial focus target:
 *   - If a child has React's `autoFocus` and that puts focus inside the modal
 *     before our effect runs, the Modal does not override it.
 *   - Otherwise the first focusable element in DOM order, falling back to the
 *     dialog itself if there are no focusables. The close button is the first
 *     DOM-order focusable, so modals without `autoFocus` start with focus on
 *     the close button — acceptable per WCAG; consumers that want a different
 *     initial target should add `autoFocus` to that element.
 */
export default function Modal({ children, onClose, titleId, title, triggerRef }: ModalProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  // Best-effort fallback: capture document.activeElement at first render,
  // before commit applies any `autoFocus`. This is unreliable in Safari
  // and Firefox where clicking a non-form button doesn't move keyboard
  // focus to it. Callers should prefer the `triggerRef` prop, which
  // overrides this value once we're past render (see effect below).
  const initialTriggerRef = useRef<HTMLElement | null>(
    typeof document !== 'undefined'
      ? (document.activeElement as HTMLElement | null)
      : null,
  )

  // Always called so hook order stays stable; only wired into the DOM
  // when `title` (and not `titleId`) is provided.
  const generatedTitleId = useId()
  const labelledById = titleId ?? (title ? generatedTitleId : undefined)

  // Override the fallback with the parent-supplied triggerRef (the
  // reliable path). Reading `triggerRef.current` during render would
  // violate react-hooks/refs, but the parent populates their ref
  // synchronously in the click handler, so the value is in place by the
  // time this effect runs after first commit.
  useEffect(() => {
    const fromProp = triggerRef?.current
    if (fromProp) {
      initialTriggerRef.current = fromProp
    }
  }, [triggerRef])

  // Move focus into the modal on open and return it on close. The "move
  // in" step is skipped when focus is already inside the modal so that a
  // child's `autoFocus` wins over our generic first-focusable fallback.
  useEffect(() => {
    const container = containerRef.current
    if (container && !container.contains(document.activeElement)) {
      const first = container.querySelector<HTMLElement>(FOCUSABLE_SELECTOR)
      ;(first ?? container).focus()
    }
    return () => {
      const trigger = initialTriggerRef.current
      if (!trigger) return
      // Defer the focus call to a microtask so it runs after every
      // sibling cleanup in this commit — most importantly the inert
      // effect's cleanup, which removes `inert` from #root. The trigger
      // lives inside #root, and `.focus()` on an element inside an
      // `inert` subtree is a silent no-op, so a synchronous call here
      // would leave focus on document.body. React runs effect cleanups
      // in declaration order, and this effect is declared before the
      // inert effect, so the inert cleanup has not yet run when this
      // cleanup fires.
      queueMicrotask(() => {
        if (document.body.contains(trigger)) {
          trigger.focus()
        }
      })
    }
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  // Body scroll lock — preserve any prior inline overflow value rather
  // than blanking it.
  useEffect(() => {
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previous
    }
  }, [])

  // The portal renders the modal as a sibling of #root, so making #root
  // inert isolates the modal from tab order, pointer events, and screen
  // readers. `inert` is Baseline-supported across all major browsers
  // since 2023.
  useEffect(() => {
    const root = document.getElementById('root')
    if (!root) return
    root.setAttribute('inert', '')
    return () => {
      root.removeAttribute('inert')
    }
  }, [])

  // Focus trap. Recompute focusables on every Tab keypress because the
  // modal's contents can change while open (errors appearing, submit
  // toggling between disabled and enabled, etc.).
  function handleKeyDown(e: ReactKeyboardEvent<HTMLDivElement>) {
    if (e.key !== 'Tab') return
    const container = containerRef.current
    if (!container) return
    const focusable = Array.from(
      container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
    )
    if (focusable.length === 0) {
      e.preventDefault()
      container.focus()
      return
    }
    const first = focusable[0]
    const last = focusable[focusable.length - 1]
    const active = document.activeElement
    if (e.shiftKey) {
      if (active === first || !container.contains(active)) {
        e.preventDefault()
        last.focus()
      }
    } else if (active === last) {
      e.preventDefault()
      first.focus()
    }
  }

  return createPortal(
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledById}
        ref={containerRef}
        tabIndex={-1}
        onClick={e => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        {title && !titleId && (
          <h2 id={generatedTitleId} className="sr-only">
            {title}
          </h2>
        )}
        <button className="modal-close" onClick={onClose} aria-label="Close">
          &times;
        </button>
        {children}
      </div>
    </div>,
    document.body,
  )
}
