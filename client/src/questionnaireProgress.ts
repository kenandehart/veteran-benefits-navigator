// Shared accessor for the in-progress questionnaire localStorage state.
// Both the Questionnaire (which owns the storage) and the LandingPage (which
// needs to surface a "Continue" affordance) read from the same keys, so the
// list lives here.

const STORAGE_KEYS = [
  'vbn_step_v2',
  'vbn_answers_v2',
  'vbn_history_v2',
  'vbn_housing_condition_v2',
  'vbn_progress_v2',
  'vbn_current_service_period_v2',
];

const HISTORY_KEY = 'vbn_history_v2';

// History entries are pushed only when the user clicks Next and commits a
// step. The other keys are written as soon as the questionnaire mounts (state
// initializers run useEffects that persist the fallback values), so a
// non-empty history is the only authoritative "user has progress to resume"
// signal.
export function hasInProgressQuestionnaire(): boolean {
  let raw: string | null;
  try {
    raw = localStorage.getItem(HISTORY_KEY);
  } catch {
    return false;
  }
  if (raw === null) return false;
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0;
  } catch {
    return false;
  }
}

export function clearInProgressQuestionnaire(): void {
  STORAGE_KEYS.forEach((key) => {
    try {
      localStorage.removeItem(key);
    } catch {}
  });
}
