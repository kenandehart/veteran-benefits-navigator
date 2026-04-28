import 'dotenv/config';
import pg from 'pg';

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const benefits = [
    {
    id: 1,
    slug: 'disability-compensation',
    type: 'benefit',
    category: 'disability compensation',
    name: 'Disability Compensation',
    short_description: 'Monthly tax-free payment for service-connected conditions',
    description:
      'Monthly tax-free payments for veterans with disabilities caused or worsened by active military service.',
    eligibility_summary:
      'Veterans with an honorable or general discharge and a service-connected physical or mental condition may be eligible. Service-connected means the condition started during active service, was made worse by service, or developed afterward but can be linked to service.',
    url: 'https://www.va.gov/disability/',
    is_active: true,
    application_guidance:
      "File your claim online at VA.gov, by mail using VA Form 21-526EZ, in person at a VA regional office, or with the help of an accredited representative. Starting your claim online automatically sets your effective date, which is the day benefits could begin. Don’t delay filing even if you’re still gathering evidence. After you file, the VA may schedule a Compensation & Pension (C&P) exam to evaluate your condition; attending is essential to keep your claim moving. A Veterans Service Organization (VSO) representative can help you prepare and submit at no cost.",
    application_url: 'https://www.va.gov/disability/how-to-file-claim/',
    eligibility_url: 'https://www.va.gov/disability/eligibility/',
  },
  {
    id: 2,
    slug: 'veteran-readiness-employment',
    type: 'benefit',
    category: 'employment',
    name: 'Veteran Readiness and Employment (VR&E)',
    short_description: 'Career support for service-connected disabilites',
    description:
      'Employment and career support for veterans with service-connected disabilities, or independent living services for veterans whose disabilities prevent them from working.',
    eligibility_summary:
      'Veterans with a service-connected disability rating of at least 10% may be eligible.',
    url: 'https://www.va.gov/careers-employment/vocational-rehabilitation/',
    is_active: true,
    application_guidance:
      "Apply online at VA.gov or by submitting VA Form 28-1900 by mail, in person, or through an accredited representative. If you're eligible, the VA will invite you to an orientation and assign you a Vocational Rehabilitation Counselor (VRC) who determines your entitlement. You and your VRC then build an individualized plan that may include training, education, job placement support, or independent living services. Bring your DD-214 and any disability rating decisions when you meet your VRC.",
    application_url: 'https://www.va.gov/careers-employment/vocational-rehabilitation/how-to-apply/',
    eligibility_url: 'https://www.va.gov/careers-employment/vocational-rehabilitation/eligibility/',
  },
  {
    id: 3,
    slug: 'adaptive-housing-grants',
    type: 'benefit',
    category: 'housing',
    name: 'Adaptive Housing Grants',
    short_description: 'Funding to adapt a home for service-connected disabilites',
    description:
      'Grants for veterans with certain service-connected disabilities to buy or modify a home to meet their needs and live more independently. The program covers veterans with a range of disabilities in temporary or permanent housing.',
    eligibility_summary:
      'Veterans with certain permanent service-connected disabilities may be eligible. Qualifying conditions include limb loss or paralysis, severe vision impairment in both eyes, severe burns, or certain respiratory or neurological conditions like ALS.',
    url: 'https://www.va.gov/housing-assistance/disability-housing-grants/',
    is_active: true,
    application_guidance:
      "Apply online at VA.gov, by mail using VA Form 26-4555, or in person at a VA regional office. Once approved, the VA assigns a Specially Adapted Housing agent who works with you and your contractor to plan and approve the modifications. Grants can be used up to six times over your lifetime, so you don't need to spend the full amount on a single project. If you live temporarily in a family member's home, ask about the Temporary Residence Adaptation (TRA) grant when you apply.",
    application_url: 'https://www.va.gov/housing-assistance/disability-housing-grants/how-to-apply/',
    eligibility_url: 'https://www.va.gov/housing-assistance/disability-housing-grants/#grant-eligibility-for-your-per',
  },
  {
    id: 4,
    slug: 'post-9-11-gi-bill',
    type: 'benefit',
    category: 'education',
    name: 'Post 9/11 GI Bill',
    short_description: 'Education and training benefits for post-9/11 veterans',
    description:
      'Education benefits for veterans who served on active duty after September 10, 2001. Coverage includes tuition and fees, a monthly housing allowance, and a stipend for books and supplies. The amount received depends on length of service.',
    eligibility_summary:
      'Veterans with an honorable discharge who served at least 90 days of active duty after September 10, 2001, may be eligible. Those with fewer days of service may also qualify if they received a Purple Heart or were discharged with a service-connected disability.',
    url: 'https://www.va.gov/education/about-gi-bill-benefits/post-9-11/',
    is_active: true,
    application_guidance:
      "Apply online at VA.gov or by mailing VA Form 22-1990 to the regional processing office that serves your school. The VA typically issues a Certificate of Eligibility (COE) within 30 days; you’ll give a copy to your school’s VA certifying official to activate your benefits. Your benefit percentage depends on your qualifying active duty after September 10, 2001 and the type of program. If you’ve used another GI Bill benefit, switching to Post-9/11 may permanently change your remaining entitlement.",
    application_url: 'https://www.va.gov/education/how-to-apply/',
    eligibility_url: 'https://www.va.gov/education/about-gi-bill-benefits/post-9-11/#am-i-eligible-for-post-911-gi-',
  },
    {
    id: 5,
    slug: 'veterans-pension',
    type: 'benefit',
    category: 'pension',
    name: 'Veterans Pension',
    short_description: 'Tax-free monthly payments for wartime veterans with limited income',
    description:
      'A tax-free monthly payment for low-income wartime veterans who meet certain age or disability requirements. Payment amounts depend on income, dependents, and whether the veteran needs regular help with daily activities or is unable to leave the home.',
    eligibility_summary:
      'Wartime veterans with a discharge other than dishonorable may be eligible if they meet service time requirements, have limited income and net worth, and are 65 or older or have a permanent disability.',
    url: 'https://www.va.gov/pension/',
    is_active: true,
    application_guidance:
      "Apply online at VA.gov, by mail with VA Form 21P-527EZ to the Pension Management Center for your state, or in person at a VA regional office. Filing online automatically sets your effective date when you start the form, which can mean retroactive payments once your claim is approved. If you’re not ready to file a complete claim, submit an intent to file (VA Form 21-0966) first to lock in a start date. You then have one year to complete the application. You’ll need documentation of your income, assets, and military service; a VSO representative can help you prepare it all at no cost.",
    application_url: 'https://www.va.gov/pension/how-to-apply/',
    eligibility_url: 'https://www.va.gov/pension/eligibility/',
  },
  {
    id: 6,
    slug: 'va-health-care',
    type: 'benefit',
    category: 'health care',
    name: 'VA Health Care',
    short_description: 'Comprehensive medical care for eligible veterans',
    description:
      'Medical and mental health care for eligible veterans, including primary care, prescriptions, hospital services, and specialty treatment.',
    eligibility_summary:
      'Veterans with a discharge other than dishonorable may be eligible if they served at least two continuous years on active duty, were discharged due to a service-connected disability, or began service before September 8, 1980.',
    url: 'https://www.va.gov/health-care/',
    is_active: true,
    application_guidance:
      "Apply online at VA.gov, by phone at 877-222-8387, by mail using VA Form 10-10EZ, or in person at a VA medical center. You’ll need your DD-214 or other separation documents, plus information about any current health insurance. Once approved, the VA assigns you to one of eight priority groups and follows up with a welcome call to schedule your first appointment.",
    application_url: 'https://www.va.gov/health-care/how-to-apply/',
    eligibility_url: 'https://www.va.gov/health-care/eligibility/',
  },
  {
    id: 7,
    slug: 'va-home-loan-guaranty',
    type: 'benefit',
    category: 'housing',
    name: 'VA Home Loan Guaranty',
    short_description: 'No down payment home loans backed by VA',
    description:
      'The VA Home Loan Guaranty helps veterans purchase homes with no down payment, no private mortgage insurance, and competitive interest rates. The VA guarantees a portion of the loan, which lets lenders offer these terms.',
    eligibility_summary:
      'Veterans with a discharge other than dishonorable may be eligible if they meet the active duty service minimum for their era, were discharged due to a service-connected disability, or have at least six years of National Guard or Reserve service.',
    url: 'https://www.va.gov/housing-assistance/home-loans/',
    is_active: true,
    application_guidance:
      "The VA’s direct role in the home loan process is issuing your Certificate of Eligibility (COE), which proves to a lender that you qualify for a VA-backed loan. The fastest path is asking a VA-approved lender to pull your COE electronically; you can also request it yourself online at VA.gov or by mailing VA Form 26-1880. Once you have the COE, the rest of the process happens between you and your chosen lender. The VA does not lend the money or set home price limits, but does require the property to meet minimum standards.",
    application_url: 'https://www.va.gov/housing-assistance/home-loans/how-to-request-coe/',
    eligibility_url: 'https://www.va.gov/housing-assistance/home-loans/eligibility/',
  },
  {
    id: 8,
    slug: 'vgli',
    type: 'benefit',
    category: 'insurance',
    name: "Veterans' Group Life Insurance (VGLI)",
    short_description: 'Convert your military life insurance to a civilian policy after separation',
    description:
      "Renewable term life insurance for veterans converting from Servicemembers’ Group Life Insurance (SGLI) after leaving the military. Coverage is available in amounts up to the SGLI coverage held at separation.",
    eligibility_summary:
      'Veterans who had SGLI coverage during service and are within 1 year and 120 days of separation may be eligible. Most service members are automatically enrolled in SGLI unless they opted out.',
    url: 'https://www.va.gov/life-insurance/options-eligibility/vgli/',
    is_active: true,
    application_guidance:
      "VGLI is administered by the Office of Servicemembers’ Group Life Insurance (OSGLI) through Prudential, not the VA directly. Apply online through the OSGLI portal or by submitting form SGLV 8714 by mail or fax. The window matters: applying within 240 days of separation requires no health questions, while applying after day 240 requires proof of good health. After 1 year and 120 days from separation, you can no longer enroll, so don’t wait if you may want the coverage.",
    application_url: 'https://www.va.gov/life-insurance/options-eligibility/vgli/#how-do-i-get-these-benefits',
    eligibility_url: 'https://www.va.gov/life-insurance/options-eligibility/vgli/#am-i-eligible-for-veterans-gro',
  },
  {
    id: 9,
    slug: 'automobile-allowance',
    type: 'benefit',
    category: 'disability',
    name: 'Automobile Allowance and Adaptive Equipment',
    short_description: 'Financial help to buy or adapt a vehicle if you have a service-connected disability affecting mobility or vision',
    description:
      'A one-time grant toward the purchase of a vehicle, adaptive equipment to modify a vehicle, or both, for veterans with service-connected disabilities affecting mobility or vision. Adaptive equipment can include power steering, power brakes, lifts, and other modifications.',
    eligibility_summary:
      'Veterans with service-connected disabilities affecting mobility or vision may be eligible. Qualifying conditions include loss or loss of use of one or both hands or feet, permanent vision impairment in both eyes, severe burns that limit motion, ALS, or stiffened knees or hips.',
    url: 'https://www.va.gov/disability/eligibility/special-claims/automobile-allowance-adaptive-equipment/',
    is_active: true,
    application_guidance:
      "Submit VA Form 21-4502 to apply for the automobile allowance plus adaptive equipment, or VA Form 10-1394 if you only need adaptive equipment. Get VA approval before buying anything. Purchases made before approval may not be reimbursed. Once your seller completes their portion of the form and submits the invoice, the VA pays them directly. The vehicle allowance is a one-time lifetime benefit, but adaptive equipment can be approved repeatedly for repairs, replacements, and reinstallations.",
    application_url: 'https://www.va.gov/disability/eligibility/special-claims/automobile-allowance-adaptive-equipment#how-do-i-get-these-benefits',
    eligibility_url: 'https://www.va.gov/disability/eligibility/special-claims/automobile-allowance-adaptive-equipment/#am-i-eligible-for-these-benefi',
  },
  {
    id: 10,
    slug: 'valife',
    type: 'benefit',
    category: 'insurance',
    name: 'Veterans Affairs Life Insurance (VALife)',
    short_description: 'Guaranteed acceptance life insurance for veterans with a service-connected disability',
    description:
      'Guaranteed acceptance whole life insurance for veterans with service-connected disabilities. Coverage is available up to $40,000 in $10,000 increments. Full coverage begins two years after enrollment.',
    eligibility_summary:
      'Veterans with a VA service-connected disability rating of any percentage may be eligible. There is no time limit to apply after receiving the rating.',
    url: 'https://www.va.gov/life-insurance/options-eligibility/valife/',
    is_active: true,
    application_guidance:
      "Apply online through the VA Life Insurance portal at insurance.va.gov/VALIFE. Because VALife is guaranteed acceptance, you won’t answer any health questions and approval is typically immediate. You’ll need to submit your first premium payment when you apply, and your rate is locked in based on your age at enrollment. Full coverage begins two years after enrollment. If you die during that waiting period, your beneficiaries receive all premiums paid plus interest.",
    application_url: 'https://www.va.gov/life-insurance/options-eligibility/valife/#apply-for-valife',
    eligibility_url: 'https://www.va.gov/life-insurance/options-eligibility/valife/#eligibility-for-valife',
  },
  {
    id: 11,
    slug: 'va-dental-care',
    type: 'benefit',
    category: 'health care',
    name: 'VA Dental Care',
    short_description: 'Free dental care for veterans meeting specific eligibility criteria',
    description:
      'Dental care for qualifying veterans, including cleanings, fillings, extractions, dentures, and oral surgery.',
    eligibility_summary:
      'Veterans may qualify if they have a service-connected dental condition, a 100% service-connected disability rating, former prisoner of war status, recent separation from 90 or more days of active duty during the Persian Gulf War era, or active enrollment in VR&E.',
    url: 'https://www.va.gov/health-care/about-va-health-benefits/dental-care/',
    is_active: true,
    application_guidance:
      "There’s no separate dental application. You become eligible by enrolling in VA Health Care, after which the VA determines your dental class based on your service history, disability rating, and current circumstances. Apply online at VA.gov or by submitting VA Form 10-10EZ if you’re not already enrolled. Most enrolled veterans don’t qualify for free dental care, so review the dental benefits classes before assuming coverage. If you don’t qualify, the VA Dental Insurance Program (VADIP) offers discounted private dental insurance through Delta Dental or MetLife.",
    application_url: 'https://www.va.gov/health-care/apply-for-health-care-form-10-10ez/introduction',
    eligibility_url: 'https://www.va.gov/health-care/about-va-health-benefits/dental-care/#what-va-dental-care-benefits-d',
  }
];

async function seed() {
  const client = await pool.connect();
  try {
    for (const benefit of benefits) {
      await client.query(
        `INSERT INTO benefits (id, slug, type, category, name, short_description, description, eligibility_summary, url, is_active, application_guidance, application_url, eligibility_url)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
         ON CONFLICT (name) DO UPDATE SET
           id = EXCLUDED.id,
           slug = EXCLUDED.slug,
           type = EXCLUDED.type,
           category = EXCLUDED.category,
           short_description = EXCLUDED.short_description,
           description = EXCLUDED.description,
           eligibility_summary = EXCLUDED.eligibility_summary,
           url = EXCLUDED.url,
           is_active = EXCLUDED.is_active,
           application_guidance = EXCLUDED.application_guidance,
           application_url = EXCLUDED.application_url,
           eligibility_url = EXCLUDED.eligibility_url`,
        [
          benefit.id,
          benefit.slug,
          benefit.type,
          benefit.category,
          benefit.name,
          benefit.short_description,
          benefit.description,
          benefit.eligibility_summary,
          benefit.url,
          benefit.is_active,
          benefit.application_guidance,
          benefit.application_url,
          benefit.eligibility_url,
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
