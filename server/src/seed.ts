import 'dotenv/config';
import pg from 'pg';

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const benefits = [
  {
    type: 'resource',
    category: 'disability compensation',
    name: 'Accredited Representatives', // id:1
    short_description: '',
    description:
      '3 types VA-accredited representatives are available to provide responsible, qualified representation on VA claims.',
    eligibility_summary:
      'Veterans with an other than dishonorable seperation may be eligible',
    url: 'https://www.va.gov/resources/va-accredited-representative-faqs/',
    is_active: false,
  },
  {
    type: 'benefit',
    category: 'disability compensation',
    name: 'Automobile Adaptive Equipment (AAE)', // id:2
    short_description: '',
    description:
      "This program prescribes and pays for adaptive equipment to allow an elgible person to safely operate and enter/exit from their personal vehicle.",
    eligibility_summary:
      'Veterans with certain mobility or vision disabilities may be eligible.',
    url: 'https://www.prosthetics.va.gov/psas/AAE.asp',
    is_active: false,
  },
  {
    type: 'benefit',
    category: 'housing',
    name: 'Specially Adapted Housing (SAH) grant', // id:3
    short_description: '',
    description:
      '1 of 3 types of adaptive housing grants for veterans with certain service-connected disabilities that allow them to buy or change a home to meet their needs and live more independently.',
    eligibility_summary:
      'Veterans with certain mobility or vision disabilities may be eligible.',
    url: 'https://www.va.gov/housing-assistance/disability-housing-grants/',
    is_active: false,
  },
  {
    type: 'benefit',
    category: 'housing',
    name: 'Special Home Adaptation (SHA) grant', // id:4
    short_description: '',
    description:
      '1 of 3 types of adaptive housing grants for veterans with certain service-connected disabilities that allow them to buy or change a home to meet their needs and live more independently.',
    eligibility_summary:
      'Veterans with loss of use of their hands, severe burns, or certain respiratory injuries may be eligible.',
    url: 'https://www.va.gov/housing-assistance/disability-housing-grants/',
    is_active: false,
  },
  {
    type: 'benefit',
    category: 'housing',
    name: 'Temporary Residence Adaptation (TRA) grant', // id:5
    short_description: '',
    description:
      '1 of 3 types of adaptive housing grants for veterans with certain service-connected disabilities that allow them to buy or change a home to meet their needs and live more independently.',
    eligibility_summary:
      "Veterans who qualify for an SAH or SHA grant and are temporarily living in a family member's home that needs changes to meet their needs may be eligible.",
    url: 'https://www.va.gov/housing-assistance/disability-housing-grants/',
    is_active: false,
  },
  {
    type: 'benefit',
    category: 'disability compensation',
    name: 'Agent Orange exposure and disability compensation', // id:6
    short_description: '',
    description:
      "Compensation for health conditions caused by exposure to the herbicide Agent Orange during a veteran's service.",
    eligibility_summary:
      "Veterans who served in a location that exposed them to Agent Orange and have a health condition caused by exposure to Agent Orange may be eligible.",
    url: 'https://www.va.gov/disability/eligibility/hazardous-materials-exposure/agent-orange/',
    is_active: false,
  },
    {
    type: 'benefit',
    category: 'disability compensation',
    name: 'Disability Compensation', // id:7
    short_description: 'Monthly tax-free payment for service-connected conditions',
    description:
      'Monthly tax free monetary benefit paid to Veterans with disabilities that are the result of a disease or injury incurred or aggravated during active military service.',
    eligibility_summary:
      'Veterans with an honorable or general discharge and a condition affecting the mind or body which can be connected to a period of active duty service may be eligible.',
    url: 'https://www.va.gov/disability/eligibility/',
    is_active: true,
  },
  {
    type: 'benefit',
    category: 'employment',
    name: 'Veteran Readiness and Employment (VR&E)', // id:8
    short_description: 'Career support for service-connected disabilites',
    description:
      'Helps veterans with service-connected disabilities prepare for, find, and maintain suitable employment, or achieve independence in daily living.',
    eligibility_summary:
      'Veterans with a service-connected disability rating of at least 10% may be eligible.',
    url: 'https://www.va.gov/careers-employment/vocational-rehabilitation/',
    is_active: true,
  },
  {
    type: 'benefit',
    category: 'housing',
    name: 'Adaptive Housing Grants', // id:9
    short_description: 'Funding to adapt a home for service-connected disabilites',
    description:
      'Grants for veterans with certain service-connected disabilities to buy or modify a home to meet their needs and live more independently. Includes SAH, SHA, and TRA grants.',
    eligibility_summary:
      'Veterans with certain service-connected disabilities affecting mobility may be eligible.',
    url: 'https://www.va.gov/housing-assistance/disability-housing-grants/',
    is_active: true,
  },
];

async function seed() {
  const client = await pool.connect();
  try {
    for (const benefit of benefits) {
      await client.query(
        `INSERT INTO benefits (type, category, name, short_description, description, eligibility_summary, url, is_active)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         ON CONFLICT (name) DO UPDATE SET
           type = EXCLUDED.type,
           category = EXCLUDED.category,
           short_description = EXCLUDED.short_description,
           description = EXCLUDED.description,
           eligibility_summary = EXCLUDED.eligibility_summary,
           url = EXCLUDED.url,
           is_active = EXCLUDED.is_active`,
        [
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
