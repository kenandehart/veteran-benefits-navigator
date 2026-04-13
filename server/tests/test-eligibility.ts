import { checkEligibility } from '../src/eligibility';

const BENEFIT_NAMES: Record<number, string> = {
4: "Post-9/11 GI Bill"
};


const testAnswers = {
  servicePeriods: [{
    entryDate: "2001-06-01",
    separationDate: "2001-10-11",
    activeDuty: true,
    officerOrEnlisted: "enlisted" as const,
    dischargeLevel: 1,
    disabilityDischarge: false,
    completedFullTerm: true
  },
  {
    entryDate: "2001-10-15",
    separationDate: "2001-12-13",
    activeDuty: true,
    officerOrEnlisted: "enlisted" as const,
    dischargeLevel: 1,
    disabilityDischarge: false,
    completedFullTerm: true
  }],
  serviceConnectedCondition: true,
  hasDisabilityRating: true,
  disabilityRating: 30,
  adaptiveHousingCondition: false,
  hasAutoGrantCondition: false,
  incomeBelowLimit: false,
  ageOrDisability: false,
  purpleHeartPost911: false,
  hadSGLI: false
};

const results = checkEligibility(testAnswers);
results.forEach(id => console.log(`${id}: ${BENEFIT_NAMES[id]}`));