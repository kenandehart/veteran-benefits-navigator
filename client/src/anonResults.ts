const RESULTS_KEY = 'vbn_results_v1';

export interface AnonResultsSnapshot {
  answers: unknown;
  completedAt: string;
}

export function readAnonResults(): AnonResultsSnapshot | null {
  let raw: string | null;
  try {
    raw = localStorage.getItem(RESULTS_KEY);
  } catch {
    return null;
  }
  if (raw === null) return null;
  try {
    const parsed = JSON.parse(raw);
    if (
      parsed &&
      typeof parsed === 'object' &&
      'answers' in parsed &&
      'completedAt' in parsed &&
      typeof (parsed as { completedAt: unknown }).completedAt === 'string'
    ) {
      return parsed as AnonResultsSnapshot;
    }
  } catch {
    // fall through to cleanup
  }
  try {
    localStorage.removeItem(RESULTS_KEY);
  } catch {}
  return null;
}

export function writeAnonResults(answers: unknown): void {
  try {
    localStorage.setItem(
      RESULTS_KEY,
      JSON.stringify({ answers, completedAt: new Date().toISOString() }),
    );
  } catch {}
}

export function clearAnonResults(): void {
  try {
    localStorage.removeItem(RESULTS_KEY);
  } catch {}
}

export function hasAnonResults(): boolean {
  return readAnonResults() !== null;
}
