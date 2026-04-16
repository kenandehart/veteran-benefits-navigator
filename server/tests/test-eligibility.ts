import { checkEligibility } from '../src/eligibility';

const BENEFIT_NAMES: Record<number, string> = {
4: "Post-9/11 GI Bill",
6: "VA Health Care",
10: "VA Life Insurance",
1: "Disability Compensation",
9: "Adaptive Automobile Grant",
3: "Adapted Housing Grant",
2: "VR&E",
8: "VGLI",
5: "Pension"
};


const testAnswers = {
  servicePeriods: [{
    entryDate: "1968-03-15",
    separationDate: "1970-06-20",
    activeDuty: true,
    officerOrEnlisted: "enlisted" as const,
    dischargeLevel: 5,
    disabilityDischarge: false,
    completedFullTerm: true,
    hardshipOrEarlyOut: false
  },
  {
    entryDate: "1972-01-10",
    separationDate: "1974-08-25",
    activeDuty: true,
    officerOrEnlisted: "enlisted" as const,
    dischargeLevel: 1,
    disabilityDischarge: false,
    completedFullTerm: true,
    hardshipOrEarlyOut: false
  }],
  serviceConnectedCondition: false,
  hasDisabilityRating: false,
  disabilityRating: 10,
  adaptiveHousingCondition: true,
  hasAutoGrantCondition: true,
  incomeBelowLimit: true,
  ageOrDisability: true,
  purpleHeartPost911: false,
  hadSGLI: false
};

const results = checkEligibility(testAnswers);
results.forEach(id => console.log(`${id}: ${BENEFIT_NAMES[id]}`));