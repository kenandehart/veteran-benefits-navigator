import './App.css'
import { useState } from 'react';
import Questionnaire from './Questionnaire';

function App() {
  const [currentView, setCurrentView] = useState('landing');
  if (currentView === 'questionnaire') {
    return <Questionnaire />;
  }
  return (
    <div className="page">
      <header className="header">
        <span className="wordmark">Benefits Navigator</span>
      </header>

      <main>
        <section className="hero">
          <h1 className="hero-headline">
            You've earned these benefits.<br />
            Let's make sure you get them.
          </h1>
          <p className="hero-body">
            Benefits Navigator helps veterans find the benefits they qualify for
            and walks them through the process of actually claiming them —
            step by step, at their own pace.
          </p>
          <button className="cta-button" onClick={() => setCurrentView('questionnaire')}>Get Started</button>
        </section>

        <section className="features">
          <div className="feature">
            <h2>Personalized to you</h2>
            <p>
              A short questionnaire builds your profile. We use it to surface
              the benefits most relevant to your situation — not an overwhelming
              list of everything that exists.
            </p>
          </div>
          <div className="feature">
            <h2>From discovery to claim</h2>
            <p>
              Knowing a benefit exists and knowing how to claim it are two
              different problems. This app addresses both. Each benefit comes
              with clear, plain-English next steps.
            </p>
          </div>
          <div className="feature">
            <h2>Your information, your control</h2>
            <p>
              No personally identifiable information required. We collect only
              what we need to help you, and nothing more.
            </p>
          </div>
        </section>
      </main>

      <footer className="footer"></footer>
    </div>
  )
}

export default App
