import { useState } from 'react'
import { Link } from 'react-router-dom'
import Modal from './components/Modal.tsx'
import FeedbackWidget from './components/FeedbackWidget.tsx'

export default function Footer() {
  const [showFeedback, setShowFeedback] = useState(false)

  return (
    <footer className="footer">
      <p className="footer-disclaimer">
        This site is not affiliated with, endorsed by, or operated by the U.S. Department of Veterans Affairs (VA).
      </p>
      <div className="footer-links">
        <button
          type="button"
          className="footer-link"
          onClick={() => setShowFeedback(true)}
        >
          Send feedback
        </button>
        <Link to="/privacy" className="footer-link">
          Privacy policy
        </Link>
      </div>
      {showFeedback && (
        <Modal onClose={() => setShowFeedback(false)}>
          <FeedbackWidget pageContext="footer" />
        </Modal>
      )}
    </footer>
  );
}
