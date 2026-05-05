import { useRef, useState } from 'react'
import { useAuth } from '../context/AuthContext.tsx'
import LoginModal from './LoginModal.tsx'
import RegisterModal from './RegisterModal.tsx'

export default function AuthMenuItems({ onNavigate }: { onNavigate: () => void }) {
  const { user, isLoading } = useAuth()
  const [modal, setModal] = useState<'login' | 'register' | null>(null)
  // The trigger lives inside the dropdown menu, which onNavigate closes
  // when the modal closes. If the menu has unmounted by then, the Modal's
  // `document.body.contains(trigger)` guard skips the focus call rather
  // than focusing a detached node.
  const triggerRef = useRef<HTMLElement | null>(null)

  if (isLoading || user) return null

  return (
    <>
      <button
        className="nav-dropdown__item nav-dropdown__item--mobile-auth"
        role="menuitem"
        onClick={(e) => {
          triggerRef.current = e.currentTarget
          setModal('login')
        }}
      >
        Log in
      </button>
      <button
        className="nav-dropdown__item nav-dropdown__item--mobile-auth"
        role="menuitem"
        onClick={(e) => {
          triggerRef.current = e.currentTarget
          setModal('register')
        }}
      >
        Sign up
      </button>
      {modal === 'login' && (
        <LoginModal onClose={() => { setModal(null); onNavigate() }} triggerRef={triggerRef} />
      )}
      {modal === 'register' && (
        <RegisterModal onClose={() => { setModal(null); onNavigate() }} triggerRef={triggerRef} />
      )}
    </>
  )
}
