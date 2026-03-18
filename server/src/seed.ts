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
    name: 'Accredited Representatives',
    description:
      '3 types VA-accredited representatives are available to provide responsible, qualified representation on VA claims.',
    eligibility_summary:
      'Veterans with an other than dishonorable seperation may be eligible',
    url: 'https://www.va.gov/resources/va-accredited-representative-faqs/',
    is_active: true,
  },
  {
    type: 'benefit',
    category: 'disability compensation',
    name: 'Automobile Adaptive Equipment (AAE)',
    description:
      "This program prescribes and pays for adaptive equipment to allow an elgible person to safely operate and enter/exit from their personal vehicle.",
    eligibility_summary:
      'Veterans with certain mobility or vision disabilities may be eligible.',
    url: 'https://www.prosthetics.va.gov/psas/AAE.asp',
    is_active: true,
  },
    {
    type: 'benefit',
    category: 'disability compensation',
    name: 'Specially Adapted Housing (SAH) grant',
    description:
      '1 of 3 types of adaptive housing grants for veterans with certain service-connected disabilities that allow them to buy or change a home to meet their needs and live more independently.',
    eligibility_summary:
      'Veterans with certain mobility or vision disabilities may be eligible.',
    url: 'https://www.va.gov/housing-assistance/disability-housing-grants/',
    is_active: true,
  },
];

async function seed() {
  const client = await pool.connect();
  try {
    await client.query('DELETE FROM benefits');
    await client.query("SELECT setval('benefits_id_seq', 1, false)");
    for (const benefit of benefits) {
      await client.query(
        `INSERT INTO benefits (type, category, name, description, eligibility_summary, url, is_active)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          benefit.type,
          benefit.category,
          benefit.name,
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
