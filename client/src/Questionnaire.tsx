import { useState, useEffect } from 'react';
import './App.css';

function getStored<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw !== null ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

const STORAGE_KEYS = ['vbn_step', 'vbn_answers', 'vbn_history', 'vbn_eligibleBenefits', 'vbn_selectedBenefit'];

function clearQuestionnaireStorage() {
  STORAGE_KEYS.forEach(k => { try { localStorage.removeItem(k); } catch {} });
}

interface Benefit {
  id: number;
  name: string;
  category: string;
  short_description: string;
  description: string;
  eligibility_summary: string;
  url: string;
}

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

function Questionnaire({ onGoHome }: { onGoHome: () => void }) {
  const [currentStep, setCurrentStep] = useState<Step>(() => getStored('vbn_step', 'entry-date'));
  const [currentServicePeriod, setCurrentServicePeriod] = useState<Partial<ServicePeriod>>({});
  const [answers, setAnswers] = useState<QuestionnaireAnswers>(() => getStored('vbn_answers', INITIAL_ANSWERS));
  const [history, setHistory] = useState<Snapshot[]>(() => getStored('vbn_history', []));
  const [showTooltip, setShowTooltip] = useState(false);
  const [eligibleBenefits, setEligibleBenefits] = useState<Benefit[] | null>(() => getStored('vbn_eligibleBenefits', null));
  const [selectedBenefit, setSelectedBenefit] = useState<Benefit | null>(() => getStored('vbn_selectedBenefit', null));
  const [showMenu, setShowMenu] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  useEffect(() => { try { localStorage.setItem('vbn_step', JSON.stringify(currentStep)); } catch {} }, [currentStep]);
  useEffect(() => { try { localStorage.setItem('vbn_answers', JSON.stringify(answers)); } catch {} }, [answers]);
  useEffect(() => { try { localStorage.setItem('vbn_history', JSON.stringify(history)); } catch {} }, [history]);
  useEffect(() => { try { localStorage.setItem('vbn_eligibleBenefits', JSON.stringify(eligibleBenefits)); } catch {} }, [eligibleBenefits]);
  useEffect(() => { try { localStorage.setItem('vbn_selectedBenefit', JSON.stringify(selectedBenefit)); } catch {} }, [selectedBenefit]);

  const isFirstPeriod = answers.servicePeriods.length === 0;

  function goHome() {
    clearQuestionnaireStorage();
    onGoHome();
  }

  function handleGoHome() {
    setShowMenu(false);
    const hasProgress = history.length > 0 || eligibleBenefits !== null || selectedBenefit !== null;
    if (hasProgress) {
      setShowConfirmDialog(true);
    } else {
      goHome();
    }
  }

  function takeSnapshot(): Snapshot {
    return {
      step: currentStep,
      currentServicePeriod: { ...currentServicePeriod },
      answers: { ...answers, servicePeriods: [...answers.servicePeriods] },
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
    setShowTooltip(false);
  }

  async function handleSubmit(finalAnswers: QuestionnaireAnswers) {
    setAnswers(finalAnswers);

    try {
      const response = await fetch('https://ideal-couscous-x5j95j49rrqwf6x56-3000.app.github.dev/questionnaire', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(finalAnswers),
      });

      if (!response.ok) {
        throw new Error(`Server responded with ${response.status}`);
      }

      const data = await response.json();
      setEligibleBenefits(data.eligibleBenefits);
    } catch (error) {
      console.error('Failed to submit questionnaire:', error);
    }
  }

  const siteHeader = (
    <>
      {showMenu && <div className="menu-backdrop" onClick={() => setShowMenu(false)} />}
      <header className="header">
        <div className="header-menu">
          <button
            className="menu-btn"
            onClick={() => setShowMenu(v => !v)}
            aria-label="Open navigation menu"
            aria-expanded={showMenu}
          >
            <span className="menu-btn__bar" />
            <span className="menu-btn__bar" />
            <span className="menu-btn__bar" />
          </button>
          {showMenu && (
            <div className="nav-dropdown" role="menu">
              <button className="nav-dropdown__item" role="menuitem" onClick={handleGoHome}>
                Home
              </button>
            </div>
          )}
        </div>
        <span className="wordmark">Benefits Navigator</span>
      </header>
    </>
  );

  const confirmDialog = showConfirmDialog && (
    <div className="dialog-overlay" onClick={() => setShowConfirmDialog(false)}>
      <div className="dialog" onClick={e => e.stopPropagation()}>
        <h2 className="dialog__title">Leave questionnaire?</h2>
        <p className="dialog__body">
          Your answers have not been saved and will be lost if you leave. Are you sure you want to return to the home page?
        </p>
        <div className="dialog__actions">
          <button className="dialog__cancel" onClick={() => setShowConfirmDialog(false)}>
            Cancel
          </button>
          <button
            className="cta-button"
            onClick={() => { setShowConfirmDialog(false); goHome(); }}
          >
            Leave anyway
          </button>
        </div>
      </div>
    </div>
  );

  if (selectedBenefit !== null) {
    return (
      <div className="page">
        {siteHeader}
        <main className="detail-main">
          <div className="benefit-detail">
            <button className="benefit-detail__back" onClick={() => setSelectedBenefit(null)}>
              ← Back
            </button>
            <h1 className="benefit-detail__name">{selectedBenefit.name}</h1>
            <div className="benefit-detail__section">
              <h2 className="benefit-detail__section-label">About this benefit</h2>
              <p className="benefit-detail__section-text">{selectedBenefit.description}</p>
            </div>
            <div className="benefit-detail__section">
              <h2 className="benefit-detail__section-label">Who may be eligible</h2>
              <p className="benefit-detail__section-text">{selectedBenefit.eligibility_summary}</p>
            </div>
            <a
              href={selectedBenefit.url}
              target="_blank"
              rel="noopener noreferrer"
              className="cta-button benefit-detail__link"
            >
              Visit official resource →
            </a>
          </div>
        </main>
        {confirmDialog}
        <footer className="footer"></footer>
      </div>
    );
  }

  if (eligibleBenefits !== null) {
    return (
      <div className="page">
        {siteHeader}
        <main className="results-main">
          {eligibleBenefits.length === 0 ? (
            <div className="no-results">
              <p>We weren't able to find any matching benefits based on your answers.</p>
              <p>Your situation may still qualify you for benefits not yet covered by this tool. Consider reaching out to a VA-accredited representative for a full review.</p>
              <button className="cta-button" onClick={goHome}>Return to home page</button>
            </div>
          ) : (
            <>
              <h1 className="results-heading">Benefits you may be eligible for</h1>
              <div className="benefits-grid">
                {eligibleBenefits.map(benefit => (
                  <button
                    key={benefit.id}
                    className="benefit-tile"
                    onClick={() => setSelectedBenefit(benefit)}
                  >
                    <span className="benefit-tile__name">{benefit.name}</span>
                    {benefit.short_description && (
                      <span className="benefit-tile__desc">{benefit.short_description}</span>
                    )}
                  </button>
                ))}
              </div>
            </>
          )}
        </main>
        {confirmDialog}
        <footer className="footer"></footer>
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
              style={{ marginLeft: 'auto' }}
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
              style={{ marginLeft: 'auto' }}
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
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', width: '100%', justifyItems: 'center' }}>
            <button
              className="cta-button"
              onClick={() => advance('discharge', { ...currentServicePeriod, activeDuty: false })}
            >
              No
            </button>
            <button
              className="cta-button"
              onClick={() => advance('discharge', { ...currentServicePeriod, activeDuty: true })}
            >
              Yes
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
              style={{ marginLeft: 'auto' }}
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
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', width: '100%', justifyItems: 'center' }}>
            <button
              className="cta-button"
              onClick={() => {
                const updatedAnswers = {
                  ...answers,
                  servicePeriods: [...answers.servicePeriods, completedPeriod],
                };
                advance('has-rating', {}, updatedAnswers);
              }}
            >
              No
            </button>
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
              onClick={() => advance('housing-condition', undefined, { ...answers, serviceConnectedCondition: null })}
            >
              I'm not sure
            </button>
            <button
              className="cta-button"
              onClick={() => advance('housing-condition', undefined, { ...answers, serviceConnectedCondition: false })}
            >
              No
            </button>
            <button
              className="cta-button"
              onClick={() => advance('housing-condition', undefined, { ...answers, serviceConnectedCondition: true })}
            >
              Yes
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
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', width: '100%', justifyItems: 'center' }}>
            <button
              className="cta-button"
              onClick={() => advance('service-connected', undefined, { ...answers, hasDisabilityRating: false })}
            >
              No
            </button>
            <button
              className="cta-button"
              onClick={() => advance('rating-value', undefined, { ...answers, hasDisabilityRating: true })}
            >
              Yes
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
              onClick={() => advance('housing-condition', undefined, { ...answers, serviceConnectedCondition: true })}
              disabled={answers.disabilityRating === null}
              style={{ marginLeft: 'auto' }}
            >
              Next
            </button>
          </div>
        </>
      );
      break;
    }

    case 'housing-condition': {
      const QUALIFYING_CONDITIONS = [
        'The loss, or loss of use, of more than one limb',
        'The loss or loss of use of both hands',
        'The loss, or loss of use, of a lower leg along with the residuals (lasting effects) of an organic (natural) disease or injury',
        'Blindness in both eyes (with 20/200 visual acuity or less)',
        'Certain severe burns',
        'Certain respiratory or breathing injuries',
        'The loss, or loss of use, of one lower extremity (foot or leg) after September 11, 2001, which makes it so you can\'t balance or walk without the help of braces, crutches, canes, or a wheelchair',
      ];
      stepContent = (
        <>
          <label className="q-label">Do you have any of the following conditions?</label>
          <div className="conditions-wrapper">
            <ul className="conditions-list">
              {QUALIFYING_CONDITIONS.map((condition, i) => (
                <li key={i} className="conditions-list__item">{condition}</li>
              ))}
            </ul>
            <div className="conditions-fade" aria-hidden="true" />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', width: '100%', justifyItems: 'center' }}>
            <button
              className="cta-button"
              onClick={() => handleSubmit({ ...answers, adaptiveHousingCondition: false })}
            >
              No
            </button>
            <button
              className="cta-button"
              onClick={() => advance('housing-ownership')}
            >
              Yes
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
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', width: '100%', justifyItems: 'center' }}>
            <button
              className="cta-button"
              onClick={() => handleSubmit({ ...answers, adaptiveHousingCondition: false })}
            >
              No
            </button>
            <button
              className="cta-button"
              onClick={() => handleSubmit({ ...answers, adaptiveHousingCondition: true })}
            >
              Yes
            </button>
          </div>
          {backButton}
        </>
      );
      break;
    }
  }

  return (
    <div className="page">
      {siteHeader}

      <main className="q-main">
        <div className="q-card">
          <div className="q-progress-text">{section}</div>
          {stepContent}
        </div>
      </main>

      {confirmDialog}
      <footer className="footer"></footer>
    </div>
  );
}

export default Questionnaire;
