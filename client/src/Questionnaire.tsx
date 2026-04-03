import { useState } from 'react';
import './App.css';

interface ServicePeriod {
  entryDate: string;
  separationDate: string;
  activeDuty: boolean;
  dischargeLevel: number;
}

interface QuestionnaireAnswers {
  servicePeriods: ServicePeriod[];
  serviceConnectedCondition: boolean | null;
  hasDisabilityRating: boolean | null;
  disabilityRating: number | null;
  adaptiveHousingCondition: boolean;
}

type Step =
  | 'entry-date'
  | 'separation-date'
  | 'active-duty'
  | 'discharge'
  | 'add-another'
  | 'service-connected'
  | 'has-rating'
  | 'rating-value'
  | 'housing-condition'
  | 'housing-ownership';

interface Snapshot {
  step: Step;
  currentServicePeriod: Partial<ServicePeriod>;
  answers: QuestionnaireAnswers;
  housingOwnershipSelection: boolean | null;
}

const STEP_SECTIONS: Record<Step, string> = {
  'entry-date':        'Service History',
  'separation-date':   'Service History',
  'active-duty':       'Service History',
  'discharge':         'Service History',
  'add-another':       'Service History',
  'service-connected': 'Health & Disability',
  'has-rating':        'Health & Disability',
  'rating-value':      'Health & Disability',
  'housing-condition': 'Housing',
  'housing-ownership': 'Housing',
};

const DISCHARGE_OPTIONS = [
  { label: 'Honorable', value: 1 },
  { label: 'General (Under Honorable Conditions)', value: 2 },
  { label: 'Other Than Honorable', value: 3 },
  { label: 'Bad Conduct', value: 4 },
  { label: 'Dishonorable', value: 5 },
];

const RATING_OPTIONS = [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100];

const INITIAL_ANSWERS: QuestionnaireAnswers = {
  servicePeriods: [],
  serviceConnectedCondition: null,
  hasDisabilityRating: null,
  disabilityRating: null,
  adaptiveHousingCondition: false,
};

function Questionnaire() {
  const [currentStep, setCurrentStep] = useState<Step>('entry-date');
  const [currentServicePeriod, setCurrentServicePeriod] = useState<Partial<ServicePeriod>>({});
  const [answers, setAnswers] = useState<QuestionnaireAnswers>(INITIAL_ANSWERS);
  const [history, setHistory] = useState<Snapshot[]>([]);
  const [showTooltip, setShowTooltip] = useState(false);
  const [housingOwnershipSelection, setHousingOwnershipSelection] = useState<boolean | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const isFirstPeriod = answers.servicePeriods.length === 0;

  function takeSnapshot(): Snapshot {
    return {
      step: currentStep,
      currentServicePeriod: { ...currentServicePeriod },
      answers: { ...answers, servicePeriods: [...answers.servicePeriods] },
      housingOwnershipSelection,
    };
  }

  function advance(
    nextStep: Step,
    updatedServicePeriod?: Partial<ServicePeriod>,
    updatedAnswers?: QuestionnaireAnswers,
  ) {
    setHistory(h => [...h, takeSnapshot()]);
    setCurrentStep(nextStep);
    if (updatedServicePeriod !== undefined) setCurrentServicePeriod(updatedServicePeriod);
    if (updatedAnswers !== undefined) setAnswers(updatedAnswers);
    setShowTooltip(false);
  }

  function goBack() {
    const prev = history[history.length - 1];
    if (!prev) return;
    setHistory(h => h.slice(0, -1));
    setCurrentStep(prev.step);
    setCurrentServicePeriod(prev.currentServicePeriod);
    setAnswers(prev.answers);
    setHousingOwnershipSelection(prev.housingOwnershipSelection);
    setShowTooltip(false);
  }

  function handleSubmit(finalAnswers: QuestionnaireAnswers) {
    setAnswers(finalAnswers);
    setSubmitted(true);
  }

  if (submitted) {
    return (
      <div className="page">
        <header className="header">
          <span className="wordmark">Benefits Navigator</span>
        </header>
        <main className="q-main">
          <div className="q-card">
            <p className="q-label">Thank you — your answers have been submitted.</p>
          </div>
        </main>
        <footer className="footer">
          <p>Built for veterans, by veterans.</p>
        </footer>
      </div>
    );
  }

  const showBack = history.length > 0;
  const section = STEP_SECTIONS[currentStep];

  const backButton = (
    <button
      onClick={goBack}
      style={{
        background: 'none',
        border: 'none',
        color: 'var(--text-muted)',
        cursor: 'pointer',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        fontSize: '0.95rem',
        padding: '14px 0',
      }}
    >
      ← Back
    </button>
  );

  // Inline style for a yes/no selection button
  function selectionButtonStyle(selected: boolean): React.CSSProperties {
    return selected
      ? { outline: '3px solid var(--gold)', outlineOffset: '2px' }
      : {};
  }

  let stepContent: React.ReactNode;

  switch (currentStep) {
    case 'entry-date': {
      const label = isFirstPeriod
        ? 'What is the date of entry for your first period of service?'
        : 'What is the date of entry for this period of service?';
      stepContent = (
        <>
          <label className="q-label" htmlFor="q-input">{label}</label>
          <input
            id="q-input"
            type="date"
            className="q-input"
            value={currentServicePeriod.entryDate ?? ''}
            onChange={e => setCurrentServicePeriod(p => ({ ...p, entryDate: e.target.value }))}
          />
          <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
            {showBack && backButton}
            <button
              className="cta-button q-next-btn"
              onClick={() => advance('separation-date')}
              disabled={!currentServicePeriod.entryDate}
            >
              Next
            </button>
          </div>
        </>
      );
      break;
    }

    case 'separation-date': {
      stepContent = (
        <>
          <label className="q-label" htmlFor="q-input">
            What is the date of separation for this period of service?
          </label>
          <input
            id="q-input"
            type="date"
            className="q-input"
            value={currentServicePeriod.separationDate ?? ''}
            onChange={e => setCurrentServicePeriod(p => ({ ...p, separationDate: e.target.value }))}
          />
          <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
            {backButton}
            <button
              className="cta-button q-next-btn"
              onClick={() => advance('active-duty')}
              disabled={!currentServicePeriod.separationDate}
            >
              Next
            </button>
          </div>
        </>
      );
      break;
    }

    case 'active-duty': {
      stepContent = (
        <>
          <label className="q-label">Was this period of service active duty?</label>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              className="cta-button"
              onClick={() => advance('discharge', { ...currentServicePeriod, activeDuty: true })}
            >
              Yes
            </button>
            <button
              className="cta-button"
              onClick={() => advance('discharge', { ...currentServicePeriod, activeDuty: false })}
            >
              No
            </button>
          </div>
          {backButton}
        </>
      );
      break;
    }

    case 'discharge': {
      stepContent = (
        <>
          <label className="q-label" htmlFor="q-input">
            What was your characterization of discharge for this period of service?
          </label>
          <select
            id="q-input"
            className="q-input q-select"
            value={currentServicePeriod.dischargeLevel ?? ''}
            onChange={e => setCurrentServicePeriod(p => ({ ...p, dischargeLevel: Number(e.target.value) }))}
          >
            <option value="">Select one…</option>
            {DISCHARGE_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
          <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
            {backButton}
            <button
              className="cta-button q-next-btn"
              onClick={() => advance('add-another')}
              disabled={!currentServicePeriod.dischargeLevel}
            >
              Next
            </button>
          </div>
        </>
      );
      break;
    }

    case 'add-another': {
      const completedPeriod = currentServicePeriod as ServicePeriod;
      stepContent = (
        <>
          <label className="q-label">Would you like to add another period of service?</label>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              className="cta-button"
              onClick={() => {
                const updatedAnswers = {
                  ...answers,
                  servicePeriods: [...answers.servicePeriods, completedPeriod],
                };
                advance('entry-date', {}, updatedAnswers);
              }}
            >
              Yes
            </button>
            <button
              className="cta-button"
              onClick={() => {
                const updatedAnswers = {
                  ...answers,
                  servicePeriods: [...answers.servicePeriods, completedPeriod],
                };
                advance('service-connected', {}, updatedAnswers);
              }}
            >
              No
            </button>
          </div>
          {backButton}
        </>
      );
      break;
    }

    case 'service-connected': {
      stepContent = (
        <>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
            <label className="q-label">
              Do you have a current illness or injury that affects your mind or body and is related to your service?
            </label>
            <div style={{ position: 'relative', flexShrink: 0, marginTop: '4px' }}>
              <button
                onClick={() => setShowTooltip(v => !v)}
                aria-label="More information"
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '1.1rem',
                  color: 'var(--gold)',
                  padding: '0',
                  lineHeight: 1,
                }}
              >
                ⓘ
              </button>
              {showTooltip && (
                <div
                  role="tooltip"
                  style={{
                    position: 'absolute',
                    top: '1.6rem',
                    right: 0,
                    width: '280px',
                    background: 'var(--navy)',
                    color: '#fff',
                    borderRadius: '4px',
                    padding: '12px 16px',
                    fontFamily: 'system-ui, -apple-system, sans-serif',
                    fontSize: '0.85rem',
                    lineHeight: 1.5,
                    zIndex: 10,
                    boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
                  }}
                >
                  This includes physical injuries, chronic conditions, and mental health conditions like PTSD, anxiety, or depression that began or worsened during your service. If you're unsure, that's okay — the VA can help determine this.
                </div>
              )}
            </div>
          </div>
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <button
              className="cta-button"
              onClick={() => advance('has-rating', undefined, { ...answers, serviceConnectedCondition: true })}
            >
              Yes
            </button>
            <button
              className="cta-button"
              onClick={() => advance('housing-condition', undefined, { ...answers, serviceConnectedCondition: false })}
            >
              No
            </button>
            <button
              className="cta-button"
              onClick={() => advance('has-rating', undefined, { ...answers, serviceConnectedCondition: null })}
            >
              I'm not sure
            </button>
          </div>
          {backButton}
        </>
      );
      break;
    }

    case 'has-rating': {
      stepContent = (
        <>
          <label className="q-label">Do you have a current VA disability rating?</label>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              className="cta-button"
              onClick={() => advance('rating-value', undefined, { ...answers, hasDisabilityRating: true })}
            >
              Yes
            </button>
            <button
              className="cta-button"
              onClick={() => advance('housing-condition', undefined, { ...answers, hasDisabilityRating: false })}
            >
              No
            </button>
          </div>
          {backButton}
        </>
      );
      break;
    }

    case 'rating-value': {
      stepContent = (
        <>
          <label className="q-label" htmlFor="q-input">What is your current VA disability rating?</label>
          <select
            id="q-input"
            className="q-input q-select"
            value={answers.disabilityRating ?? ''}
            onChange={e => setAnswers(a => ({ ...a, disabilityRating: Number(e.target.value) }))}
          >
            <option value="">Select one…</option>
            {RATING_OPTIONS.map(v => (
              <option key={v} value={v}>{v}%</option>
            ))}
          </select>
          <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
            {backButton}
            <button
              className="cta-button q-next-btn"
              onClick={() => advance('housing-condition')}
              disabled={answers.disabilityRating === null}
            >
              Next
            </button>
          </div>
        </>
      );
      break;
    }

    case 'housing-condition': {
      stepContent = (
        <>
          <label className="q-label">Do you have any of the following conditions?</label>
          <p style={{ fontFamily: 'system-ui, -apple-system, sans-serif', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
            [ list of qualifying conditions will be added ]
          </p>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              className="cta-button"
              onClick={() => advance('housing-ownership')}
            >
              Yes
            </button>
            <button
              className="cta-button"
              onClick={() => handleSubmit({ ...answers, adaptiveHousingCondition: false })}
            >
              No
            </button>
          </div>
          {backButton}
        </>
      );
      break;
    }

    case 'housing-ownership': {
      stepContent = (
        <>
          <label className="q-label">
            Are you currently living in, or planning to live in, a home that you or a family member own or will own?
          </label>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              className="cta-button"
              style={selectionButtonStyle(housingOwnershipSelection === true)}
              onClick={() => setHousingOwnershipSelection(true)}
            >
              Yes
            </button>
            <button
              className="cta-button"
              style={selectionButtonStyle(housingOwnershipSelection === false)}
              onClick={() => setHousingOwnershipSelection(false)}
            >
              No
            </button>
          </div>
          <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
            {backButton}
            <button
              className="cta-button q-next-btn"
              onClick={() => handleSubmit({ ...answers, adaptiveHousingCondition: housingOwnershipSelection === true })}
              disabled={housingOwnershipSelection === null}
            >
              See My Benefits
            </button>
          </div>
        </>
      );
      break;
    }
  }

  return (
    <div className="page">
      <header className="header">
        <span className="wordmark">Benefits Navigator</span>
      </header>

      <main className="q-main">
        <div className="q-card">
          <div className="q-progress-text">{section}</div>
          {stepContent}
        </div>
      </main>

      <footer className="footer">
        <p>Built for veterans, by veterans.</p>
      </footer>
    </div>
  );
}

export default Questionnaire;
