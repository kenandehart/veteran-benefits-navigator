import { useState } from 'react'
import Modal from './components/Modal.tsx'
import FeedbackWidget from './components/FeedbackWidget.tsx'

export default function Footer() {
  const [showFeedback, setShowFeedback] = useState(false)

  return (
    <footer className="footer">
      <p className="footer-disclaimer">
        This site is not affiliated with, endorsed by, or operated by the U.S. Department of Veterans Affairs (VA).
      </p>
      <button
        type="button"
        className="footer-link"
        onClick={() => setShowFeedback(true)}
      >
        Send feedback
      </button>
      {showFeedback && (
        <Modal onClose={() => setShowFeedback(false)}>
          <FeedbackWidget pageContext="footer" />
        </Modal>
      )}
    </footer>
  );
}
