import 'dotenv/config';
import pg from 'pg';

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const benefits = [
    {
    id: 1,
    type: 'benefit',
    category: 'disability compensation',
    name: 'Disability Compensation',
    short_description: 'Monthly tax-free payment for service-connected conditions',
    description:
      'Monthly tax free monetary benefit paid to Veterans with disabilities that are the result of a disease or injury incurred or aggravated during active military service.',
    eligibility_summary:
      'Veterans with an honorable or general discharge and a condition affecting the mind or body which can be connected to a period of active duty service may be eligible.',
    url: 'https://www.va.gov/disability/eligibility/',
    is_active: true,
  },
  {
    id: 2,
    type: 'benefit',
    category: 'employment',
    name: 'Veteran Readiness and Employment (VR&E)',
    short_description: 'Career support for service-connected disabilites',
    description:
      'Helps veterans with service-connected disabilities prepare for, find, and maintain suitable employment, or achieve independence in daily living.',
    eligibility_summary:
      'Veterans with a service-connected disability rating of at least 10% may be eligible.',
    url: 'https://www.va.gov/careers-employment/vocational-rehabilitation/',
    is_active: true,
  },
  {
    id: 3,
    type: 'benefit',
    category: 'housing',
    name: 'Adaptive Housing Grants',
    short_description: 'Funding to adapt a home for service-connected disabilites',
    description:
      'Grants for veterans with certain service-connected disabilities to buy or modify a home to meet their needs and live more independently. Includes SAH, SHA, and TRA grants.',
    eligibility_summary:
      'Veterans with certain service-connected disabilities affecting mobility may be eligible.',
    url: 'https://www.va.gov/housing-assistance/disability-housing-grants/',
    is_active: true,
  },
  {
    id: 4,
    type: 'benefit',
    category: 'education',
    name: 'Post 9/11 GI Bill',
    short_description: 'Education and training benefits for post-9/11 veterans',
    description:
      'Helps pay for college, graduate school, and training programs for veterans who served on active duty after September 10, 2001. Benefits include tuition and fees, a monthly housing allowance, and a books and supplies stipend. The amount of benefit depends on length of active duty service.',
    eligibility_summary:
      'Veterans with an honorable discharge who served at least 90 days of active duty after September 10, 2001, may be eligible. Veterans with fewer days of service may also qualify with a Purple Heart or a service-connected disability.',
    url: 'https://www.va.gov/education/about-gi-bill-benefits/post-9-11/',
    is_active: true,
  },
    {
    id: 5,
    type: 'benefit',
    category: 'pension',
    name: 'Veterans Pension',
    short_description: 'Tax-free monthly payments for wartime veterans with limited income',
    description:
      'A tax-free monetary benefit for low-income wartime veterans who meet certain age or disability requirements. The benefit amount depends on the veteran’s income, number of dependents, and whether they need regular help with daily activities or are unable to leave the home.',
    eligibility_summary:
      'Wartime veterans with a discharge better than dishonorable, who meet service time requirements, have limited income and net worth, and are 65 or older or have a permanent disability may be eligible.',
    url: 'https://www.va.gov/pension/',
    is_active: true,
  },
  {
    id: 6,
    type: 'benefit',
    category: 'health care',
    name: 'VA Health Care',
    short_description: 'Comprehensive medical care for eligible veterans',
    description:
      'VA health care provides eligible veterans with a range of medical, mental health, and specialty services including preventive care, primary care, mental health services, and more.',
    eligibility_summary:
      'Veterans who served on active duty with a discharge other than dishonorable may be eligible if they served for at least two continuous years, were discharged due to a service-connected disability, or began service before September 7, 1980.',
    url: 'https://www.va.gov/health-care/eligibility/',
    is_active: true,
  },
  {
    id: 7,
    type: 'benefit',
    category: 'housing',
    name: 'VA Home Loan Guaranty',
    short_description: 'No down payment home loans backed by VA',
    description:
      'The VA Home Loan Guaranty program helps veterans purchase homes with no down payment, no private mortgage insurance, and competitive interest rates. VA guarantees a portion of the loan, which allows lenders to offer more favorable terms.',
    eligibility_summary:
      'Veterans who meet minimum active duty service requirements for their era of service and have a discharge that is not dishonorable may be eligible. National Guard and Reserve members with 6 creditable years of service may also qualify.',
    url: 'https://www.va.gov/housing-assistance/home-loans/eligibility/',
    is_active: true,
  },
  {
    id: 8,
    type: 'benefit',
    category: 'insurance',
    name: "Veterans' Group Life Insurance (VGLI)",
    short_description: 'Convert your military life insurance to a civilian policy after separation',
    description:
      "Veterans' Group Life Insurance allows veterans to convert their Servicemembers' Group Life Insurance (SGLI) coverage to a renewable term life insurance policy after leaving the military. Coverage is available in amounts up to the SGLI coverage amount held at separation. No health screening is required if you apply within 240 days of separation.",
    eligibility_summary:
      'Veterans who had SGLI coverage during service and are within 1 year and 120 days of separation may be eligible. Most service members are automatically enrolled in SGLI unless they specifically opted out.',
    url: 'https://www.va.gov/life-insurance/options-eligibility/vgli/',
    is_active: true,
  },
  {
    id: 9,
    type: 'benefit',
    category: 'disability',
    name: 'Automobile Allowance and Adaptive Equipment',
    short_description: 'Financial help to buy or adapt a vehicle if you have a service-connected disability affecting mobility or vision',
    description:
      'If you have a service-connected disability that prevents you from driving or limits your ability to get in and out of a vehicle, you may be eligible for a one-time grant toward the purchase of an automobile or other conveyance, adaptive equipment to modify a vehicle, or both. Adaptive equipment may include power steering, power brakes, power windows, power seats, wheelchair lifts, and other medically necessary modifications.',
    eligibility_summary:
      'You must have a service-connected disability resulting in the loss or permanent loss of use of one or both hands or feet, permanent vision impairment in both eyes, severe burn injuries limiting motion, ALS, or ankylosis of one or both knees or hips. You must have a VA disability rating.',
    url: 'https://www.va.gov/disability/eligibility/special-claims/automobile-allowance-adaptive-equipment/',
    is_active: true,
  },
  {
    id: 10,
    type: 'benefit',
    category: 'insurance',
    name: 'Veterans Affairs Life Insurance (VALife)',
    short_description: 'Guaranteed acceptance life insurance for veterans with a service-connected disability',
    description:
      'Veterans Affairs Life Insurance (VALife) is a guaranteed acceptance whole life insurance program for veterans with service-connected disabilities. Coverage is available in amounts up to $40,000 in $10,000 increments. If you meet the eligibility requirements, your application is automatically approved with no health screening required. Full coverage begins 2 years after you apply.',
    eligibility_summary:
      'You must have a VA service-connected disability rating. Any rating from 0% to 100% qualifies. There is no time limit to apply after receiving your disability rating.',
    url: 'https://www.va.gov/life-insurance/options-eligibility/valife/',
    is_active: true,
  },
  {
    id: 11,
    type: 'benefit',
    category: 'health care',
    name: 'VA Dental Care',
    short_description: 'Free dental care for veterans meeting specific eligibility criteria',
    description:
      'VA provides comprehensive dental care to certain qualifying veterans, including services like cleanings, fillings, extractions, dentures, and oral surgery.',
    eligibility_summary:
      'Veterans may qualify based on a service-connected dental condition, a 100% service-connected disability rating (single condition or TDIU), former prisoner of war status, recent separation from 90+ days of active duty during the Persian Gulf War era, or active participation in a VR&E program.',
    url: 'https://www.va.gov/health-care/about-va-health-benefits/dental-care/',
    is_active: true,
  }
];

async function seed() {
  const client = await pool.connect();
  try {
    for (const benefit of benefits) {
      await client.query(
        `INSERT INTO benefits (id, type, category, name, short_description, description, eligibility_summary, url, is_active)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         ON CONFLICT (name) DO UPDATE SET
           id = EXCLUDED.id,
           type = EXCLUDED.type,
           category = EXCLUDED.category,
           short_description = EXCLUDED.short_description,
           description = EXCLUDED.description,
           eligibility_summary = EXCLUDED.eligibility_summary,
           url = EXCLUDED.url,
           is_active = EXCLUDED.is_active`,
        [
          benefit.id,
          benefit.type,
          benefit.category,
          benefit.name,
          benefit.short_description,
          benefit.description,
          benefit.eligibility_summary,
          benefit.url,
          benefit.is_active,
        ]
      );
    }
    await client.query("SELECT setval('benefits_id_seq', (SELECT MAX(id) FROM benefits))");
    console.log(`Seeded ${benefits.length} benefits successfully.`);
  } catch (err) {
    console.error('Error seeding benefits:', err);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

seed();
