import 'dotenv/config';
import pg from 'pg';

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const requirements = [
  /*
  * Discharge Levels
  * 1 - Honorable
  * 2 - General (Under Honorable Conditions)
  * 3 - Other Than Honorable
  * 4 - Bad Conduct
  * 5 - Dishonorable
  */
  {
    benefit_id: 7, // Disability Compensation
    active_duty_service: true,
    service_connected_condition: true,
    min_discharge_level: 2,
    min_disability_rating: -1, // must NOT have a rating
    adaptive_housing_condition: null,
  },
  {
    benefit_id: 8, // Veteran Readiness and Employment (VR&E)
    active_duty_service: true,
    service_connected_condition: true,
    min_discharge_level: 2,
    min_disability_rating: 10, // must have rating >= 10
    adaptive_housing_condition: null,
  },
  {
    benefit_id: 9, // Adaptive Housing Grants
    active_duty_service: true,
    service_connected_condition: true,
    min_discharge_level: 2,
    min_disability_rating: null, // no rating requirement
    adaptive_housing_condition: true,
  },
];

async function seed() {
  const client = await pool.connect();
  try {
    await client.query('DELETE FROM eligibility_requirements');
    await client.query("SELECT setval('eligibility_requirements_id_seq', 1, false)");
    for (const requirement of requirements) {
      await client.query(
        `INSERT INTO eligibility_requirements (benefit_id, active_duty_service, service_connected_condition, min_discharge_level, min_disability_rating, adaptive_housing_condition)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          requirement.benefit_id,
          requirement.active_duty_service,
          requirement.service_connected_condition,
          requirement.min_discharge_level,
          requirement.min_disability_rating,
          requirement.adaptive_housing_condition,
        ]
      );
    }
    console.log(`Seeded ${requirements.length} eligibility requirements successfully.`);
  } catch (err) {
    console.error('Error seeding eligibility requirements:', err);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

seed();

