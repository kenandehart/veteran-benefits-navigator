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
    post_911_90_days: null,
    post_911_30_days: null,
    purple_heart: null,
  },
  {
    benefit_id: 8, // Veteran Readiness and Employment (VR&E)
    active_duty_service: true,
    service_connected_condition: true,
    min_discharge_level: 2,
    min_disability_rating: 10, // must have rating >= 10
    adaptive_housing_condition: null,
    post_911_90_days: null,
    post_911_30_days: null,
    purple_heart: null,
  },
  {
    benefit_id: 9, // Adaptive Housing Grants
    active_duty_service: true,
    service_connected_condition: true,
    min_discharge_level: 2,
    min_disability_rating: null, // no rating requirement
    adaptive_housing_condition: true,
    post_911_90_days: null,
    post_911_30_days: null,
    purple_heart: null,
  },
  {
    benefit_id: 28, //Post 9-11 GI Bill
                    //Path 1, 90 days aggregate service
    active_duty_service: null,
    service_connected_condition: null,
    min_discharge_level: null,
    min_disability_rating: null,
    adaptive_housing_condition: null,
    post_911_90_days: true, //Compound calculation performed by eligibility checker
    post_911_30_days: null,
    purple_heart: null,
  },
  {
    benefit_id: 28, //Post 9-11 GI Bill
                    //Path 2, Purple Heart
    active_duty_service: null,
    service_connected_condition: null,
    min_discharge_level: 1,
    min_disability_rating: null,
    adaptive_housing_condition: null,
    post_911_90_days: null,
    post_911_30_days: null,
    purple_heart: true,
  },
  {
    benefit_id: 28, //Post 9-11 GI Bill
                    //Path 3, 30 days continuous service
    active_duty_service: null,
    service_connected_condition: true,
    min_discharge_level: null,
    min_disability_rating: null,
    adaptive_housing_condition: null,
    post_911_90_days: null, //Compound calculation performed by eligibility checker
    post_911_30_days: true,
    purple_heart: null,
  },
];

async function seed() {
  const client = await pool.connect();
  try {
    await client.query('DELETE FROM eligibility_requirements');
    await client.query("SELECT setval('eligibility_requirements_id_seq', 1, false)");
    for (const requirement of requirements) {
      await client.query(
        `INSERT INTO eligibility_requirements (benefit_id, active_duty_service, service_connected_condition,
                                              min_discharge_level, min_disability_rating, adaptive_housing_condition,
                                              post_911_90_days, purple_heart, post_911_30_days)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
          requirement.benefit_id,
          requirement.active_duty_service,
          requirement.service_connected_condition,
          requirement.min_discharge_level,
          requirement.min_disability_rating,
          requirement.adaptive_housing_condition,
          requirement.post_911_90_days,
          requirement.purple_heart,
          requirement.post_911_30_days,
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

