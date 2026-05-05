import { useRef, useState } from 'react'
import { useAuth } from '../context/AuthContext.tsx'
import LoginModal from './LoginModal.tsx'
import RegisterModal from './RegisterModal.tsx'

export default function AuthButtons() {
  const { user, isLoading } = useAuth()
  const [modal, setModal] = useState<'login' | 'register' | null>(null)
  // Captured synchronously in onClick so the Modal can restore focus
  // here on close. document.activeElement is unreliable in Safari/Firefox
  // for non-form button clicks.
  const triggerRef = useRef<HTMLElement | null>(null)

  if (isLoading || user) return null

  return (
    <>
      <div className="header-auth">
        <button
          className="header-auth__btn"
          onClick={(e) => {
            triggerRef.current = e.currentTarget
            setModal('login')
          }}
        >
          Log in
        </button>
        <button
          className="header-auth__btn header-auth__btn--primary"
          onClick={(e) => {
            triggerRef.current = e.currentTarget
            setModal('register')
          }}
        >
          Sign up
        </button>
      </div>
      {modal === 'login' && <LoginModal onClose={() => setModal(null)} triggerRef={triggerRef} />}
      {modal === 'register' && <RegisterModal onClose={() => setModal(null)} triggerRef={triggerRef} />}
    </>
  )
}
