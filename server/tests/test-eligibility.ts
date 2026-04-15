import { checkEligibility } from '../src/eligibility';

const BENEFIT_NAMES: Record<number, string> = {
4: "Post-9/11 GI Bill",
6: "VA Health Care",
10: "VA Life Insurance",
1: "Disability Compensation",
9: "Adaptive Automobile Grant"
};


const testAnswers = {
  servicePeriods: [{
    entryDate: "2001-10-18",
    separationDate: "2003-10-19",
    activeDuty: true,
    officerOrEnlisted: "enlisted" as const,
    dischargeLevel: 1,
    disabilityDischarge: false,
    completedFullTerm: false,
    hardshipOrEarlyOut: false
  }],
  serviceConnectedCondition: false,
  hasDisabilityRating: true,
  disabilityRating: 30,
  adaptiveHousingCondition: false,
  hasAutoGrantCondition: true,
  incomeBelowLimit: false,
  ageOrDisability: false,
  purpleHeartPost911: false,
  hadSGLI: false
};

const results = checkEligibility(testAnswers);
results.forEach(id => console.log(`${id}: ${BENEFIT_NAMES[id]}`));