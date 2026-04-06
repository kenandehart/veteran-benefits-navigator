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
}

const SEPT_11_2001 = new Date('2001-09-11');

function daysAfterSept11(period: ServicePeriod): number {
  const end = new Date(period.separationDate);
  if (end < SEPT_11_2001) return 0;
  const start = new Date(period.entryDate);
  const effectiveStart = start < SEPT_11_2001 ? SEPT_11_2001 : start;
  return Math.floor((end.getTime() - effectiveStart.getTime()) / (1000 * 60 * 60 * 24));
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

    eligibleBenefitIds.push(req.benefit_id);
  }

  return eligibleBenefitIds;
}
