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

interface EligibilityRequirement {
  id: number;
  benefit_id: number;
  active_duty_service: boolean;
  service_connected_condition: boolean;
  min_discharge_level: number;
  min_disability_rating: number | null;
  adaptive_housing_condition: boolean | null;
}

export function checkEligibility(
  answers: QuestionnaireAnswers,
  requirements: EligibilityRequirement[]
): number[] {
  const eligibleBenefitIds: number[] = [];

  for (const req of requirements) {
    const servicePasses = answers.servicePeriods.some((period) => {
      if (req.active_duty_service && !period.activeDuty) return false;
      if (period.dischargeLevel > req.min_discharge_level) return false;
      return true;
    });

    if (!servicePasses) continue;

    if (req.service_connected_condition && answers.serviceConnectedCondition === false) continue;

    if (req.min_disability_rating === -1) {
      if (answers.hasDisabilityRating !== false) continue;
    } else if (req.min_disability_rating !== null) {
      if (answers.disabilityRating === null || answers.disabilityRating < req.min_disability_rating) continue;
    }

    if (req.adaptive_housing_condition === true && !answers.adaptiveHousingCondition) continue;

    eligibleBenefitIds.push(req.benefit_id);
  }

  return eligibleBenefitIds;
}
