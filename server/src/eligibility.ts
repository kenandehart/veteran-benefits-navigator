interface ServicePeriod {
  entryDate: string;
  separationDate: string;
  activeDuty: boolean;
  officerOrEnlisted: 'officer' | 'enlisted';
  dischargeLevel: number;
  disabilityDischarge?: boolean;
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
}

interface EligibilityRequirement {
  id: number;
  benefit_id: number;
  active_duty_service: boolean | null;
  service_connected_condition: boolean | null;
  min_discharge_level: number | null;
  min_disability_rating: number | null;
  adaptive_housing_condition: boolean | null;
  purple_heart: boolean | null;
  post_911_90_days: boolean | null;
  post_911_30_days: boolean | null;
  pension_service_req: boolean | null;
  income_below_limit: boolean | null;
  age_or_disability: boolean | null;
  min_continuous_days: number | null;
  service_disability_discharge: boolean | null;
  entry_before_date: string | null;
}

const SEPT_11_2001 = new Date('2001-09-11');
const SEPT_8_1980  = new Date('1980-09-08');
const OCT_17_1981  = new Date('1981-10-17');

const WARTIME_PERIODS: Array<{ start: Date; end: Date | null }> = [
  { start: new Date('1941-12-07'), end: new Date('1946-12-31') },
  { start: new Date('1950-06-27'), end: new Date('1955-01-31') },
  { start: new Date('1955-11-01'), end: new Date('1975-05-07') },
  { start: new Date('1990-08-02'), end: null }, // Gulf War, no end date
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

function overlapsWartime(period: ServicePeriod): boolean {
  const entry = new Date(period.entryDate);
  const sep   = new Date(period.separationDate);
  return WARTIME_PERIODS.some(wt => {
    if (sep < wt.start) return false;
    if (wt.end !== null && entry > wt.end) return false;
    return true;
  });
}

function checkPensionServiceReq(periods: ServicePeriod[]): boolean {
  const active = periods.filter(p => p.activeDuty);
  const totalDays = active.reduce((sum, p) => sum + periodDays(p), 0);
  const hasWartimeOverlap = active.some(overlapsWartime);

  // Path A: any active period started before Sep 8 1980, ≥90 total days, wartime overlap
  if (
    active.some(p => new Date(p.entryDate) < SEPT_8_1980) &&
    totalDays >= 90 &&
    hasWartimeOverlap
  ) return true;

  // Path B: any active enlisted period started on/after Sep 8 1980, ≥730 total days, wartime overlap
  if (
    active.some(p => new Date(p.entryDate) >= SEPT_8_1980 && p.officerOrEnlisted === 'enlisted') &&
    totalDays >= 730 &&
    hasWartimeOverlap
  ) return true;

  // Path C: any officer period started after Oct 16 1981 where total active duty days
  // from prior service periods (separationDate before that officer period's entryDate) is < 730
  if (
    periods
      .filter(p => p.officerOrEnlisted === 'officer' && new Date(p.entryDate) >= OCT_17_1981)
      .some(officerPeriod => {
        const officerEntry = new Date(officerPeriod.entryDate);
        const priorActiveDays = periods
          .filter(p => p.activeDuty && new Date(p.separationDate) < officerEntry)
          .reduce((sum, p) => sum + periodDays(p), 0);
        return priorActiveDays < 730;
      })
  ) return true;

  return false;
}

export function checkEligibility(
  answers: QuestionnaireAnswers,
  requirements: EligibilityRequirement[]
): number[] {
  const eligibleBenefitIds: number[] = [];

  for (const req of requirements) {
    const servicePasses = answers.servicePeriods.some((period) => {
      if (req.active_duty_service === true && !period.activeDuty) return false;
      if (req.min_discharge_level !== null && period.dischargeLevel > req.min_discharge_level) return false;
      if (req.min_continuous_days !== null && periodDays(period) < req.min_continuous_days) return false;
      if (req.service_disability_discharge === true && period.disabilityDischarge !== true) return false;
      if (req.entry_before_date !== null && new Date(period.entryDate) >= new Date(req.entry_before_date)) return false;
      return true;
    });

    if (!servicePasses) continue;

    if (req.service_connected_condition === true && answers.serviceConnectedCondition === false) continue;

    if (req.min_disability_rating === -1) {
      if (answers.hasDisabilityRating !== false) continue;
    } else if (req.min_disability_rating !== null) {
      if (answers.disabilityRating === null || answers.disabilityRating < req.min_disability_rating) continue;
    }

    if (req.adaptive_housing_condition === true && !answers.adaptiveHousingCondition) continue;

    if (req.purple_heart === true && !answers.purpleHeartPost911) continue;

    if (req.post_911_90_days === true) {
      const qualifyingPeriods = answers.servicePeriods.filter(
        (p) => p.activeDuty && p.dischargeLevel === 1
      );
      const totalDays = qualifyingPeriods.reduce((sum, p) => sum + daysAfterSept11(p), 0);
      if (totalDays < 90) continue;
    }

    if (req.post_911_30_days === true) {
      const qualifyingPeriods = answers.servicePeriods.filter(
        (p) => p.activeDuty && p.dischargeLevel === 1
      );
      const passes = qualifyingPeriods.some((p) => daysAfterSept11(p) >= 30);
      if (!passes) continue;
    }

    if (req.pension_service_req === true && !checkPensionServiceReq(answers.servicePeriods)) continue;

    if (req.income_below_limit === true && !answers.incomeBelowLimit) continue;

    if (req.age_or_disability === true && !answers.ageOrDisability) continue;

    eligibleBenefitIds.push(req.benefit_id);
  }

  return eligibleBenefitIds;
}
