import { useState } from 'react'
import { useAuth } from '../context/AuthContext.tsx'
import LoginModal from './LoginModal.tsx'
import RegisterModal from './RegisterModal.tsx'

export default function AuthButtons() {
  const { user, isLoading } = useAuth()
  const [modal, setModal] = useState<'login' | 'register' | null>(null)

  if (isLoading || user) return null

  return (
    <>
      <div className="header-auth">
        <button className="header-auth__btn" onClick={() => setModal('login')}>
          Log in
        </button>
        <button className="header-auth__btn header-auth__btn--primary" onClick={() => setModal('register')}>
          Sign up
        </button>
      </div>
      {modal === 'login' && <LoginModal onClose={() => setModal(null)} />}
      {modal === 'register' && <RegisterModal onClose={() => setModal(null)} />}
    </>
  )
}
