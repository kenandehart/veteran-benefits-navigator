import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import './App.css';
import Footer from './Footer';

function getStored<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw !== null ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

const STORAGE_KEYS = ['vbn_step', 'vbn_answers', 'vbn_history'];

function clearQuestionnaireStorage() {
  STORAGE_KEYS.forEach(k => { try { localStorage.removeItem(k); } catch {} });
}

interface ServicePeriod {
  entryDate: string;
  separationDate: string;
  activeDuty: boolean;
  officerOrEnlisted: 'officer' | 'enlisted';
  dischargeLevel: number;
  disabilityDischarge?: boolean;
  completedFullTerm?: boolean;
}

interface QuestionnaireAnswers {
  servicePeriods: ServicePeriod[];
  serviceConnectedCondition: boolean | null;
  hasDisabilityRating: boolean | null;
  disabilityRating: number | null;
  adaptiveHousingCondition: boolean;
  incomeBelowLimit: boolean;
  ageOrDisability: boolean;
  purpleHeartPost911: boolean;
  hadSGLI: boolean;
}

type Step =
  | 'entry-date'
  | 'separation-date'
  | 'active-duty'
  | 'officer-enlisted'
  | 'discharge'
  | 'disability-discharge'
  | 'completed-full-term'
  | 'activation-periods'
  | 'activation-guidance'
  | 'add-another'
  | 'service-connected'
  | 'has-rating'
  | 'rating-value'
  | 'sgli-coverage'
  | 'housing-condition'
  | 'housing-ownership'
  | 'income-limit'
  | 'age-disability'
  | 'purple-heart';

interface Snapshot {
  step: Step;
  currentServicePeriod: Partial<ServicePeriod>;
  answers: QuestionnaireAnswers;
}

const STEP_SECTIONS: Record<Step, string> = {
  'entry-date':        'Service History',
  'separation-date':   'Service History',
  'active-duty':       'Service History',
  'officer-enlisted':  'Service History',
  'discharge':             'Service History',
  'disability-discharge':  'Service History',
  'completed-full-term':   'Service History',
  'activation-periods':    'Service History',
  'activation-guidance':   'Service History',
  'add-another':           'Service History',
  'service-connected': 'Health & Disability',
  'has-rating':        'Health & Disability',
  'rating-value':      'Health & Disability',
  'sgli-coverage':     'Insurance',
  'housing-condition': 'Housing',
  'housing-ownership': 'Housing',
  'income-limit':      'Financial',
  'age-disability':    'Financial',
  'purple-heart':      'Health & Disability',
};

const DISCHARGE_OPTIONS = [
  { label: 'Honorable', value: 1 },
  { label: 'General (Under Honorable Conditions)', value: 2 },
  { label: 'Other Than Honorable', value: 3 },
  { label: 'Bad Conduct', value: 4 },
  { label: 'Dishonorable', value: 5 },
];

const RATING_OPTIONS = [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100];

// Parses "MM/DD/YYYY" → { month, day, year } or null if invalid.
function parseDateText(text: string): { month: number; day: number; year: number } | null {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(text.trim());
  if (!match) return null;
  const month = parseInt(match[1], 10);
  const day   = parseInt(match[2], 10);
  const year  = parseInt(match[3], 10);
  if (month < 1 || month > 12) return null;
  if (day < 1 || day > 31) return null;
  if (year < 1900 || year > 2100) return null;
  // Let Date validate the exact day (e.g. Feb 30 is invalid)
  const d = new Date(year, month - 1, day);
  if (d.getFullYear() !== year || d.getMonth() !== month - 1 || d.getDate() !== day) return null;
  return { month, day, year };
}

function validateEntryDate(iso: string): string {
  if (!iso) return '';
  const [y, m, d] = iso.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (date > today) return 'Entry date cannot be in the future.';
  return '';
}

function validateSeparationDate(iso: string, entryIso: string): string {
  if (!iso) return '';
  const [y, m, d] = iso.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (date > today) return 'Separation date cannot be in the future.';
  if (entryIso) {
    const [ey, em, ed] = entryIso.split('-').map(Number);
    const entryDate = new Date(ey, em - 1, ed);
    if (date < entryDate) return 'Separation date cannot be before the entry date.';
  }
  return '';
}

function meetsVGLIDateWindow(periods: ServicePeriod[]): boolean {
  const today = new Date();
  const WINDOW_MS = 485 * 24 * 60 * 60 * 1000;
  return periods.some(period => {
    const sepDate = new Date(period.separationDate);
    const diff = Math.abs(today.getTime() - sepDate.getTime());
    if (diff > WINDOW_MS) return false;
    const entryDate = new Date(period.entryDate);
    const days = Math.floor((sepDate.getTime() - entryDate.getTime()) / (1000 * 60 * 60 * 24));
    if (period.activeDuty) return days >= 31;
    return true;
  });
}

function toISO(month: number, day: number, year: number): string {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function isoToDisplay(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  return m ? `${m[2]}/${m[3]}/${m[1]}` : '';
}

// Accepts value/onChange in ISO format (YYYY-MM-DD or '').
function DateInput({ id, value, onChange }: { id: string; value: string; onChange: (v: string) => void }) {
  const [mode, setMode] = useState<'picker' | 'text'>('picker');
  const [textValue, setTextValue] = useState('');
  const [touched, setTouched] = useState(false);

  function switchToText() {
    setTextValue(value ? isoToDisplay(value) : '');
    setTouched(false);
    setMode('text');
  }

  function switchToPicker() {
    setMode('picker');
  }

  function handleTextChange(raw: string) {
    // Strip non-digits, cap at 8, then re-insert slashes
    const digits = raw.replace(/\D/g, '').slice(0, 8);
    let formatted = digits;
    if (digits.length > 4) {
      formatted = `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
    } else if (digits.length > 2) {
      formatted = `${digits.slice(0, 2)}/${digits.slice(2)}`;
    }
    setTextValue(formatted);
    const parsed = parseDateText(formatted);
    onChange(parsed ? toISO(parsed.month, parsed.day, parsed.year) : '');
  }

  const isInvalid = touched && textValue.length > 0 && !parseDateText(textValue);

  if (mode === 'picker') {
    return (
      <div className="date-input-wrapper">
        <input
          id={id}
          type="date"
          className="q-input"
          value={value}
          onChange={e => onChange(e.target.value)}
        />
        <button type="button" className="date-mode-toggle" onClick={switchToText}>
          Type date manually
        </button>
      </div>
    );
  }

  return (
    <div className="date-input-wrapper">
      <input
        id={id}
        type="text"
        inputMode="numeric"
        className={`q-input${isInvalid ? ' q-input--error' : ''}`}
        value={textValue}
        placeholder="MM/DD/YYYY"
        maxLength={10}
        onChange={e => handleTextChange(e.target.value)}
        onBlur={() => setTouched(true)}
        aria-invalid={isInvalid}
        aria-describedby={isInvalid ? `${id}-error` : undefined}
      />
      {isInvalid && (
        <p id={`${id}-error`} className="date-input-error" role="alert">
          Please enter a valid date (MM/DD/YYYY).
        </p>
      )}
      <button type="button" className="date-mode-toggle" onClick={switchToPicker}>
        Use date picker instead
      </button>
    </div>
  );
}

const INITIAL_ANSWERS: QuestionnaireAnswers = {
  servicePeriods: [],
  serviceConnectedCondition: null,
  hasDisabilityRating: null,
  disabilityRating: null,
  adaptiveHousingCondition: false,
  incomeBelowLimit: false,
  ageOrDisability: false,
  purpleHeartPost911: false,
  hadSGLI: false,
};

function Questionnaire() {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState<Step>(() => getStored('vbn_step', 'entry-date'));
  const [currentServicePeriod, setCurrentServicePeriod] = useState<Partial<ServicePeriod>>({});
  const [answers, setAnswers] = useState<QuestionnaireAnswers>(() => getStored('vbn_answers', INITIAL_ANSWERS));
  const [history, setHistory] = useState<Snapshot[]>(() => getStored('vbn_history', []));
  const [showTooltip, setShowTooltip] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState('/');

  const serviceConnectedTooltipRef = useRef<HTMLDivElement>(null);
  const incomeLimitTooltipRef = useRef<HTMLDivElement>(null);
  const sgliTooltipRef = useRef<HTMLDivElement>(null);

  useEffect(() => { try { localStorage.setItem('vbn_step', JSON.stringify(currentStep)); } catch {} }, [currentStep]);
  useEffect(() => { try { localStorage.setItem('vbn_answers', JSON.stringify(answers)); } catch {} }, [answers]);
  useEffect(() => { try { localStorage.setItem('vbn_history', JSON.stringify(history)); } catch {} }, [history]);

  useEffect(() => {
    if (!showTooltip) return;
    function handleOutsideClick(e: MouseEvent) {
      const target = e.target as Node;
      if (
        !serviceConnectedTooltipRef.current?.contains(target) &&
        !incomeLimitTooltipRef.current?.contains(target) &&
        !sgliTooltipRef.current?.contains(target)
      ) {
        setShowTooltip(false);
      }
    }
    document.addEventListener('click', handleOutsideClick);
    return () => document.removeEventListener('click', handleOutsideClick);
  }, [showTooltip]);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key !== 'Enter') return;
      if ((e.target as HTMLElement).tagName === 'BUTTON') return;

      switch (currentStep) {
        case 'entry-date': {
          const error = validateEntryDate(currentServicePeriod.entryDate ?? '');
          if (currentServicePeriod.entryDate && !error) advance('separation-date');
          break;
        }
        case 'separation-date': {
          const error = validateSeparationDate(
            currentServicePeriod.separationDate ?? '',
            currentServicePeriod.entryDate ?? '',
          );
          if (currentServicePeriod.separationDate && !error) advance('active-duty');
          break;
        }
        case 'discharge': {
          if (currentServicePeriod.dischargeLevel) advance('completed-full-term');
          break;
        }
        case 'rating-value': {
          if (answers.disabilityRating !== null) {
            advance('housing-condition', undefined, { ...answers, serviceConnectedCondition: true });
          }
          break;
        }
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [currentStep, currentServicePeriod, answers]);

  const isFirstPeriod = answers.servicePeriods.length === 0;

  function goHome() {
    clearQuestionnaireStorage();
    navigate(pendingNavigation);
  }

  function handleGoHome() {
    setShowMenu(false);
    const hasProgress = history.length > 0;
    if (hasProgress) {
      setPendingNavigation('/');
      setShowConfirmDialog(true);
    } else {
      clearQuestionnaireStorage();
      navigate('/');
    }
  }

  function handleNavTo(path: string) {
    setShowMenu(false);
    const hasProgress = history.length > 0;
    if (hasProgress) {
      setPendingNavigation(path);
      setShowConfirmDialog(true);
    } else {
      clearQuestionnaireStorage();
      navigate(path);
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
      const response = await fetch('/api/questionnaire', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(finalAnswers),
      });

      if (!response.ok) {
        throw new Error(`Server responded with ${response.status}`);
      }

      const data = await response.json();
      clearQuestionnaireStorage();
      navigate('/results', { state: { eligibleBenefits: data.eligibleBenefits } });
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
              <button className="nav-dropdown__item" role="menuitem" onClick={() => handleNavTo('/benefits')}>
                Benefits
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
        width: 'fit-content',
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
      const entryDateError = validateEntryDate(currentServicePeriod.entryDate ?? '');
      stepContent = (
        <>
          <label className="q-label" htmlFor="q-input">{label}</label>
          <DateInput
            id="q-input"
            value={currentServicePeriod.entryDate ?? ''}
            onChange={v => setCurrentServicePeriod(p => ({ ...p, entryDate: v }))}
          />
          {entryDateError && (
            <p role="alert" style={{ color: '#b91c1c', fontSize: '0.85rem', margin: '4px 0 0', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
              {entryDateError}
            </p>
          )}
          <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
            {showBack && backButton}
            <button
              className="cta-button q-next-btn"
              onClick={() => advance('separation-date')}
              disabled={!currentServicePeriod.entryDate || !!entryDateError}
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
      const sepDateError = validateSeparationDate(
        currentServicePeriod.separationDate ?? '',
        currentServicePeriod.entryDate ?? '',
      );
      stepContent = (
        <>
          <label className="q-label" htmlFor="q-input">
            What is the date of separation for this period of service?
          </label>
          <DateInput
            id="q-input"
            value={currentServicePeriod.separationDate ?? ''}
            onChange={v => setCurrentServicePeriod(p => ({ ...p, separationDate: v }))}
          />
          {sepDateError && (
            <p role="alert" style={{ color: '#b91c1c', fontSize: '0.85rem', margin: '4px 0 0', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
              {sepDateError}
            </p>
          )}
          <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
            {backButton}
            <button
              className="cta-button q-next-btn"
              onClick={() => advance('active-duty')}
              disabled={!currentServicePeriod.separationDate || !!sepDateError}
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
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', width: '100%', justifyItems: 'center' }} className="yn-row">
            <button
              className="cta-button"
              onClick={() => advance('officer-enlisted', { ...currentServicePeriod, activeDuty: false })}
            >
              No
            </button>
            <button
              className="cta-button"
              onClick={() => advance('officer-enlisted', { ...currentServicePeriod, activeDuty: true })}
            >
              Yes
            </button>
          </div>
          {backButton}
        </>
      );
      break;
    }

    case 'officer-enlisted': {
      stepContent = (
        <>
          <label className="q-label">Did you start this period of service as an officer or enlisted?</label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', width: '100%', justifyItems: 'center' }} className="yn-row">
            <button
              className="cta-button"
              onClick={() => advance('discharge', { ...currentServicePeriod, officerOrEnlisted: 'enlisted' })}
            >
              Enlisted
            </button>
            <button
              className="cta-button"
              onClick={() => advance('discharge', { ...currentServicePeriod, officerOrEnlisted: 'officer' })}
            >
              Officer
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
              onClick={() => advance('completed-full-term')}
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

    case 'disability-discharge': {
      stepContent = (
        <>
          <label className="q-label">
            Were you discharged from this period of service specifically due to a service-connected disability?
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', width: '100%', justifyItems: 'center' }} className="yn-row">
            <button
              className="cta-button"
              onClick={() => advance(currentServicePeriod.activeDuty ? 'add-another' : 'activation-periods', { ...currentServicePeriod, disabilityDischarge: false })}
            >
              No
            </button>
            <button
              className="cta-button"
              onClick={() => advance(currentServicePeriod.activeDuty ? 'add-another' : 'activation-periods', { ...currentServicePeriod, disabilityDischarge: true })}
            >
              Yes
            </button>
          </div>
          {backButton}
        </>
      );
      break;
    }

    case 'completed-full-term': {
      stepContent = (
        <>
          <label className="q-label">
            Did you complete the full term of service for this period?
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', width: '100%', justifyItems: 'center' }} className="yn-row">
            <button
              className="cta-button"
              onClick={() => advance('disability-discharge', { ...currentServicePeriod, completedFullTerm: false })}
            >
              No
            </button>
            <button
              className="cta-button"
              onClick={() => advance('disability-discharge', { ...currentServicePeriod, completedFullTerm: true })}
            >
              Yes
            </button>
          </div>
          {backButton}
        </>
      );
      break;
    }

    case 'activation-periods': {
      stepContent = (
        <>
          <label className="q-label">
            Were you activated for federal active duty service (not including training) during this period?
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', width: '100%', justifyItems: 'center' }} className="yn-row">
            <button
              className="cta-button"
              onClick={() => advance('add-another')}
            >
              No
            </button>
            <button
              className="cta-button"
              onClick={() => advance('activation-guidance')}
            >
              Yes
            </button>
          </div>
          {backButton}
        </>
      );
      break;
    }

    case 'activation-guidance': {
      stepContent = (
        <>
          <p className="q-label">
            Please add each activation as a separate period of service when prompted. This helps us accurately determine your eligibility.
          </p>
          <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
            {backButton}
            <button
              className="cta-button q-next-btn"
              onClick={() => advance('add-another')}
              style={{ marginLeft: 'auto' }}
            >
              Continue
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
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', width: '100%', justifyItems: 'center' }} className="yn-row">
            <button
              className="cta-button"
              onClick={() => {
                const updatedAnswers = {
                  ...answers,
                  servicePeriods: [...answers.servicePeriods, completedPeriod],
                };
                const showSGLI = meetsVGLIDateWindow(updatedAnswers.servicePeriods);
                advance(
                  showSGLI ? 'sgli-coverage' : 'has-rating',
                  {},
                  showSGLI ? updatedAnswers : { ...updatedAnswers, hadSGLI: false }
                );
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
            <div ref={serviceConnectedTooltipRef} style={{ position: 'relative', flexShrink: 0, marginTop: '4px' }}>
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
              onClick={() => advance('income-limit', undefined, { ...answers, serviceConnectedCondition: null, adaptiveHousingCondition: false })}
            >
              I'm not sure
            </button>
            <button
              className="cta-button"
              onClick={() => advance('income-limit', undefined, { ...answers, serviceConnectedCondition: false, adaptiveHousingCondition: false })}
            >
              No
            </button>
            <button
              className="cta-button"
              onClick={() => advance('income-limit', undefined, { ...answers, serviceConnectedCondition: true, adaptiveHousingCondition: false })}
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
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', width: '100%', justifyItems: 'center' }} className="yn-row">
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

    case 'sgli-coverage': {
      const nextStep = 'has-rating';
      stepContent = (
        <>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
            <label className="q-label">
              Did you have Servicemembers' Group Life Insurance (SGLI) coverage during your service?
            </label>
            <div ref={sgliTooltipRef} style={{ position: 'relative', flexShrink: 0, marginTop: '4px' }}>
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
                  Most service members are automatically enrolled in SGLI unless they specifically opted out. If you're unsure, you likely had it.
                </div>
              )}
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', width: '100%', justifyItems: 'center' }} className="yn-row">
            <button
              className="cta-button"
              onClick={() => advance(nextStep, undefined, { ...answers, hadSGLI: false })}
            >
              No
            </button>
            <button
              className="cta-button"
              onClick={() => advance(nextStep, undefined, { ...answers, hadSGLI: true })}
            >
              Yes
            </button>
          </div>
          {backButton}
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
          <label className="q-label">Do your service-connected disabilities include any of the following?</label>
          <div className="conditions-wrapper">
            <ul className="conditions-list">
              {QUALIFYING_CONDITIONS.map((condition, i) => (
                <li key={i} className="conditions-list__item">{condition}</li>
              ))}
            </ul>
            <div className="conditions-fade" aria-hidden="true" />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', width: '100%', justifyItems: 'center' }} className="yn-row">
            <button
              className="cta-button"
              onClick={() => advance('income-limit', undefined, { ...answers, adaptiveHousingCondition: false })}
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

    case 'purple-heart': {
      stepContent = (
        <>
          <label className="q-label">Were you awarded a Purple Heart on or after September 11, 2001?</label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', width: '100%', justifyItems: 'center' }} className="yn-row">
            <button
              className="cta-button"
              onClick={() => handleSubmit({ ...answers, purpleHeartPost911: false })}
            >
              No
            </button>
            <button
              className="cta-button"
              onClick={() => handleSubmit({ ...answers, purpleHeartPost911: true })}
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
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', width: '100%', justifyItems: 'center' }} className="yn-row">
            <button
              className="cta-button"
              onClick={() => advance('income-limit', undefined, { ...answers, adaptiveHousingCondition: false })}
            >
              No
            </button>
            <button
              className="cta-button"
              onClick={() => advance('income-limit', undefined, { ...answers, adaptiveHousingCondition: true })}
            >
              Yes
            </button>
          </div>
          {backButton}
        </>
      );
      break;
    }

    case 'income-limit': {
      stepContent = (
        <>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
            <label className="q-label">
              Is your combined net worth and annual income below $163,699?
            </label>
            <div ref={incomeLimitTooltipRef} style={{ position: 'relative', flexShrink: 0, marginTop: '4px' }}>
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
                  This includes all assets except your primary residence and personal vehicle. The VA adjusts this threshold annually.
                </div>
              )}
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', width: '100%', justifyItems: 'center' }} className="yn-row">
            <button
              className="cta-button"
              onClick={() => advance('age-disability', undefined, { ...answers, incomeBelowLimit: false })}
            >
              No
            </button>
            <button
              className="cta-button"
              onClick={() => advance('age-disability', undefined, { ...answers, incomeBelowLimit: true })}
            >
              Yes
            </button>
          </div>
          {backButton}
        </>
      );
      break;
    }

    case 'age-disability': {
      const AGE_DISABILITY_CONDITIONS = [
        'You are 65 years old or older',
        'You have a permanent and total disability',
        'You are a patient in a nursing home receiving long-term care for a disability',
        'You are receiving Social Security Disability Insurance or Supplemental Security Income',
      ];
      stepContent = (
        <>
          <label className="q-label">Are any of the following true?</label>
          <ul style={{ fontFamily: 'system-ui, -apple-system, sans-serif', fontSize: '0.95rem', color: 'var(--text)', margin: '0 0 16px', paddingLeft: '1.25rem', lineHeight: 1.6 }}>
            {AGE_DISABILITY_CONDITIONS.map((condition, i) => (
              <li key={i}>{condition}</li>
            ))}
          </ul>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', width: '100%', justifyItems: 'center' }} className="yn-row">
            <button
              className="cta-button"
              onClick={() => advance('purple-heart', undefined, { ...answers, ageOrDisability: false })}
            >
              No
            </button>
            <button
              className="cta-button"
              onClick={() => advance('purple-heart', undefined, { ...answers, ageOrDisability: true })}
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
      <Footer />
    </div>
  );
}

export default Questionnaire;
