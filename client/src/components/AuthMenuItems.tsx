import { useState } from 'react'
import { useAuth } from '../context/AuthContext.tsx'
import LoginModal from './LoginModal.tsx'
import RegisterModal from './RegisterModal.tsx'

export default function AuthMenuItems({ onNavigate }: { onNavigate: () => void }) {
  const { user, isLoading } = useAuth()
  const [modal, setModal] = useState<'login' | 'register' | null>(null)

  if (isLoading || user) return null

  return (
    <>
      <button
        className="nav-dropdown__item nav-dropdown__item--mobile-auth"
        role="menuitem"
        onClick={() => setModal('login')}
      >
        Log in
      </button>
      <button
        className="nav-dropdown__item nav-dropdown__item--mobile-auth"
        role="menuitem"
        onClick={() => setModal('register')}
      >
        Sign up
      </button>
      {modal === 'login' && <LoginModal onClose={() => { setModal(null); onNavigate() }} />}
      {modal === 'register' && <RegisterModal onClose={() => { setModal(null); onNavigate() }} />}
    </>
  )
}
