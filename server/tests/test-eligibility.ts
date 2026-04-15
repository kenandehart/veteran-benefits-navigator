import { checkEligibility } from '../src/eligibility';

const BENEFIT_NAMES: Record<number, string> = {
4: "Post-9/11 GI Bill",
6: "VA Health Care",
10: "VA Life Insurance",
1: "Disability Compensation",
9: "Adaptive Automobile Grant",
3: "Adapted Housing Grant",
2: "VR&E",
8: "VGLI"
};


const testAnswers = {
  servicePeriods: [{
    entryDate: "2024-11-16",
    separationDate: "2024-12-16",
    activeDuty: false,
    officerOrEnlisted: "enlisted" as const,
    dischargeLevel: 1,
    disabilityDischarge: false,
    completedFullTerm: false,
    hardshipOrEarlyOut: false
  }],
  serviceConnectedCondition: false,
  hasDisabilityRating: false,
  disabilityRating: 10,
  adaptiveHousingCondition: true,
  hasAutoGrantCondition: true,
  incomeBelowLimit: false,
  ageOrDisability: false,
  purpleHeartPost911: false,
  hadSGLI: false
};

const results = checkEligibility(testAnswers);
results.forEach(id => console.log(`${id}: ${BENEFIT_NAMES[id]}`));