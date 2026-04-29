interface ServicePeriod {
  entryDate: string;
  separationDate: string;
  activeDuty: boolean;
  officerOrEnlisted: 'officer' | 'enlisted';
  dischargeLevel: number;
  disabilityDischarge: boolean;
  completedFullTerm: boolean;
  hardshipOrEarlyOut: boolean;
}

interface QuestionnaireAnswers {
  servicePeriods: ServicePeriod[];
  serviceConnectedCondition: boolean | null;
  hasDisabilityRating: boolean | null;
  disabilityRating: number | null;
  adaptiveHousingCondition: boolean;
  hasAutoGrantCondition: boolean;
  incomeBelowLimit: boolean;
  ageOrDisability: boolean;
  purpleHeartPost911: boolean;
  hadSGLI: boolean;
  currentlyInVRE: boolean;
  paidAtTotalDisabilityRate: boolean;
  formerPOW: boolean;
  servedInVietnam: boolean;
}

const SEPT_11_2001 = new Date('2001-09-11');
const SEPT_8_1980  = new Date('1980-09-08');
const OCT_17_1981  = new Date('1981-10-17');

const WWII_START      = new Date('1940-09-16');
const WWII_END        = new Date('1947-07-25');
const POST_WWII_END   = new Date('1950-06-26');
const KOREAN_END      = new Date('1955-01-31');
const POST_KOREAN_END = new Date('1964-08-04');
const VIETNAM_END     = new Date('1975-05-07');
const POST_VN_END_ENL = new Date('1980-09-07'); // Post-Vietnam end, enlisted
const POST_VN_END_OFF = new Date('1981-10-16'); // Post-Vietnam end, officers
const TRANS_START_ENL = new Date('1980-09-08'); // Transition start, enlisted
const TRANS_START_OFF = new Date('1981-10-17'); // Transition start, officers
const TRANS_END       = new Date('1990-08-01');
const GULF_WAR_START  = new Date('1990-08-02');
const VIETNAM_IN_COUNTRY_START = new Date('1955-11-01');

// Vietnam wartime window for pension purposes is split: in-country veterans
// get the wider window starting 1961-02-28; everyone else starts 1964-08-05.
// (1955-11-01 above is the Home Loan in-country eligibility threshold — a
// different rule, kept distinct.)
const VIETNAM_WARTIME_IN_COUNTRY_START = new Date('1961-02-28');
const VIETNAM_WARTIME_OUTSIDE_START    = new Date('1964-08-05');

// Wartime windows that do not depend on where the veteran served. The
// Vietnam window is selected per-veteran inside overlapsWartime().
const WARTIME_PERIODS: Array<{ start: Date; end: Date | null }> = [
  { start: new Date('1941-12-07'), end: new Date('1946-12-31') }, // WWII
  { start: new Date('1950-06-27'), end: new Date('1955-01-31') }, // Korea
  { start: new Date('1990-08-02'), end: null },                   // Gulf War (open-ended)
];

function daysAfterSept11(period: ServicePeriod): number {
  const end = new Date(period.separationDate);
  if (end < SEPT_11_2001) return 0;
  const start = new Date(period.entryDate);
  const effectiveStart = start < SEPT_11_2001 ? SEPT_11_2001 : start;
  return Math.floor((end.getTime() - effectiveStart.getTime()) / (1000 * 60 * 60 * 24));
}

function periodDays(period: ServicePeriod): number {
  const entry = new Date(period.entryDate);
  const sep   = new Date(period.separationDate);
  return Math.floor((sep.getTime() - entry.getTime()) / (1000 * 60 * 60 * 24));
}

function overlapsWartime(period: ServicePeriod, servedInVietnam: boolean): boolean {
  const entry = new Date(period.entryDate);
  const sep   = new Date(period.separationDate);
  const vietnamStart = servedInVietnam
    ? VIETNAM_WARTIME_IN_COUNTRY_START
    : VIETNAM_WARTIME_OUTSIDE_START;
  const windows: Array<{ start: Date; end: Date | null }> = [
    ...WARTIME_PERIODS,
    { start: vietnamStart, end: VIETNAM_END },
  ];
  return windows.some(wt => {
    if (sep < wt.start) return false;
    if (wt.end !== null && entry > wt.end) return false;
    return true;
  });
}

function checkPensionServiceReq(periods: ServicePeriod[], servedInVietnam: boolean): boolean {
  // VA's officer pension rule disqualifies any officer period that began
  // after 1981-10-16 if the veteran already had 24+ months of active-duty
  // service before that period started. Drop those periods up front so they
  // contribute to nothing downstream — wartime, totalDays, or path checks.
  // The veteran can still qualify on the strength of other periods.
  const eligible = periods.filter(p => {
    if (p.officerOrEnlisted !== 'officer') return true;
    const entry = new Date(p.entryDate);
    if (entry < OCT_17_1981) return true;
    const priorActiveDays = periods
      .filter(other => other !== p && new Date(other.separationDate) <= entry)
      .reduce((sum, other) => sum + periodDays(other), 0);
    return priorActiveDays < 730;
  });

  if (!eligible.some(p => overlapsWartime(p, servedInVietnam))) return false;

  const totalDays = eligible.reduce((sum, p) => sum + periodDays(p), 0);

  // Path A: pre-cutoff (90-day minimum)
  const hasPreCutoff = eligible.some(p => {
    const entry = new Date(p.entryDate);
    if (entry < SEPT_8_1980) return true;
    if (p.officerOrEnlisted === 'officer' && entry < OCT_17_1981) return true;
    return false;
  });
  if (hasPreCutoff && totalDays >= 90) return true;

  // Path B: post-cutoff (24-month / 730-day minimum)
  const hasPostCutoff = eligible.some(p => {
    const entry = new Date(p.entryDate);
    if (p.officerOrEnlisted === 'enlisted' && entry >= SEPT_8_1980) return true;
    if (p.officerOrEnlisted === 'officer' && entry >= OCT_17_1981) return true;
    return false;
  });
  if (hasPostCutoff) {
    if (totalDays >= 730) return true;
    if (eligible.some(p => p.completedFullTerm)) return true;
  }

  return false;
}

function checkHomeLoanServiceReq(answers: QuestionnaireAnswers): boolean {
  const active    = answers.servicePeriods.filter(p => p.activeDuty && p.dischargeLevel <= 2);
  const nonActive = answers.servicePeriods.filter(p => !p.activeDuty);

  // PATH 1: Era-based active duty service
  for (const p of active) {
    const entry = new Date(p.entryDate);
    const days  = periodDays(p);
    const isEnl = p.officerOrEnlisted === 'enlisted';

    // Vietnam in-country pre-check
    if (
      answers.servedInVietnam &&
      entry < VIETNAM_END &&
      new Date(p.separationDate) > VIETNAM_IN_COUNTRY_START &&
      days >= 90
    ) return true;

    if (entry >= WWII_START && entry <= WWII_END) {
      if (days >= 90) return true;
    } else if (entry > WWII_END && entry <= POST_WWII_END) {
      if (days >= 181) return true;
    } else if (entry > POST_WWII_END && entry <= KOREAN_END) {
      if (days >= 90) return true;
    } else if (entry > KOREAN_END && entry <= POST_KOREAN_END) {
      if (days >= 181) return true;
    } else if (entry > POST_KOREAN_END && entry <= VIETNAM_END) {
      if (days >= 90) return true;
    } else if (
      entry > VIETNAM_END &&
      ((isEnl && entry <= POST_VN_END_ENL) || (!isEnl && entry <= POST_VN_END_OFF))
    ) {
      if (days >= 181) return true;
    } else if (
      entry <= TRANS_END &&
      ((isEnl && entry >= TRANS_START_ENL) || (!isEnl && entry >= TRANS_START_OFF))
    ) {
      const min = (p.completedFullTerm || p.hardshipOrEarlyOut) ? 181 : 730;
      if (days >= min) return true;
    } else if (entry >= GULF_WAR_START) {
      const min = (p.completedFullTerm || p.hardshipOrEarlyOut) ? 90 : 730;
      if (days >= min) return true;
    }
  }

  // PATH 2: Discharged for service-connected disability
  if (active.some(p => p.disabilityDischarge === true)) return true;

  // PATH 3: Reserve/National Guard — ≥2190 total non-active days + at least one honorable
  const totalNonActiveDays = nonActive.reduce((sum, p) => sum + periodDays(p), 0);
  if (totalNonActiveDays >= 2190 && nonActive.some(p => p.dischargeLevel === 1)) return true;

  return false;
}

function checkHomeLoan(answers: QuestionnaireAnswers): boolean {
  return checkHomeLoanServiceReq(answers);
}

function inVGLIConversionWindow(periods: ServicePeriod[]): boolean {
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const WINDOW_MS = 485 * 24 * 60 * 60 * 1000;
  return periods.some(period => {
    const sepDate = new Date(period.separationDate);
    const diff = Math.abs(today.getTime() - sepDate.getTime());
    if (diff > WINDOW_MS) return false;
    if (period.activeDuty) return periodDays(period) >= 31;
    return true; // Condition B: any non-active-duty period within window
  });
}

function checkPension(answers: QuestionnaireAnswers): boolean {
  if (!answers.incomeBelowLimit) return false;
  if (!answers.ageOrDisability) return false;

  const qualifyingPeriods = answers.servicePeriods.filter(
    p => p.activeDuty && p.dischargeLevel <= 2
  );
  if (qualifyingPeriods.length === 0) return false;

  return checkPensionServiceReq(qualifyingPeriods, answers.servedInVietnam);
}

function checkVGLI(answers: QuestionnaireAnswers): boolean {
  if (!answers.hadSGLI) return false;
  return inVGLIConversionWindow(answers.servicePeriods);
}

function checkHousingGrant(answers: QuestionnaireAnswers): boolean {
  if (!answers.hasDisabilityRating) return false;
  if (!answers.adaptiveHousingCondition) return false;
  for (const period of answers.servicePeriods) {
    if (period.dischargeLevel <= 2) return true;
  }
  return false;
}

function checkAutomobileGrant(answers: QuestionnaireAnswers): boolean {
  if (answers.hasDisabilityRating && answers.hasAutoGrantCondition) return true;
  return false;
}

function checkDisabilityCompensation(answers: QuestionnaireAnswers): boolean {
  if(answers.hasDisabilityRating === true) return false;
  if(answers.serviceConnectedCondition === false) return false;
  for (const period of answers.servicePeriods) {
    if(period.dischargeLevel <= 2 && period.activeDuty === true) return true;
  }
  return false;
}

function checkVALife(answers: QuestionnaireAnswers): boolean {
  return answers.hasDisabilityRating === true;
}

function checkHealthCare(answers: QuestionnaireAnswers): boolean {
  for (const period of answers.servicePeriods) {
    if (!period.activeDuty) continue;
    if (period.dischargeLevel >= 3) continue; // stricter than General

    const entry = new Date(period.entryDate);
    const days = periodDays(period);

    // No minimum service requirement
    if (entry < SEPT_8_1980) return true;
    if (period.officerOrEnlisted === 'officer' && entry < OCT_17_1981) return true;
    if (period.disabilityDischarge) return true;
    if (period.hardshipOrEarlyOut) return true;

    // 24 Month minimum
    if (days >= 730 || period.completedFullTerm){
      if (period.officerOrEnlisted === 'enlisted' && entry >= SEPT_8_1980) return true;
      if (period.officerOrEnlisted === 'officer' && entry >= OCT_17_1981) return true;
    }
  }

  return false;
}

function checkPost911GIBill(answers: QuestionnaireAnswers): boolean {
  
  // If you served at least 90 days on active duty (either all at once or with breaks in service)
  // on or after September 11, 2001
  let totalDays = 0;
  
  for (const period of answers.servicePeriods){
    if(period.activeDuty && period.dischargeLevel === 1){
      totalDays += daysAfterSept11(period);
    }
  }

  if (totalDays >= 90) return true;

  // Or you received a Purple Heart on or after September 11, 2001, 
  // and were honorably discharged after any amount of service
  if(
    answers.purpleHeartPost911 && answers.servicePeriods.some(p => p.dischargeLevel === 1)
  ) return true;

  // Or you served for at least 30 continuous days (all at once, without a break in service)
  // on or after September 11, 2001,
  // and were honorably discharged with a service-connected disability
  for (const period of answers.servicePeriods) {
    if (
        period.activeDuty &&
        period.dischargeLevel === 1 &&
        period.disabilityDischarge &&
        daysAfterSept11(period) >= 30
    ) return true;
  }


  return false;
}

function checkVRE(answers: QuestionnaireAnswers): boolean {
  if (answers.currentlyInVRE) return false;
  const rating = answers.disabilityRating;
  if (rating === null || rating < 10) return false;
  for (const period of answers.servicePeriods) {
    if (period.dischargeLevel <= 2) return true;
  }
  return false;
}

function checkDental(answers: QuestionnaireAnswers): boolean {
  const hasValidDischarge = answers.servicePeriods.some(p => p.dischargeLevel < 5);
  if (!hasValidDischarge) return false;

  if (answers.formerPOW) return true;
  if (answers.paidAtTotalDisabilityRate) return true;
  if (answers.currentlyInVRE) return true;

  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const WINDOW_MS = 180 * 24 * 60 * 60 * 1000;
  for (const period of answers.servicePeriods) {
    if (!period.activeDuty) continue;
    if (period.dischargeLevel >= 5) continue;
    const entry = new Date(period.entryDate);
    if (entry < GULF_WAR_START) continue;
    if (periodDays(period) < 90 && !period.completedFullTerm) continue;
    const sepDate = new Date(period.separationDate);
    const diff = today.getTime() - sepDate.getTime();
    if (diff < 0) continue;
    if (diff > WINDOW_MS) continue;
    return true;
  }

  return false;
}

export function checkEligibility(answers: QuestionnaireAnswers): number[] {
  const matched: number[] = [];
  if (checkPost911GIBill(answers)) matched.push(4);
  if (checkHealthCare(answers)) matched.push(6);
  if (checkVALife(answers)) matched.push(10);
  if (checkDisabilityCompensation(answers)) matched.push(1);
  if (checkAutomobileGrant(answers)) matched.push(9);
  if (checkHousingGrant(answers)) matched.push(3);
  if (checkVRE(answers)) matched.push(2);
  if (checkVGLI(answers)) matched.push(8);
  if (checkPension(answers)) matched.push(5);
  if (checkHomeLoan(answers)) matched.push(7);
  if (checkDental(answers)) matched.push(11);
  return matched;
}
