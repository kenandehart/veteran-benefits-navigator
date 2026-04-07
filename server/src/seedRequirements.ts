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
    benefit_id: 1, // Disability Compensation
    active_duty_service: true,
    service_connected_condition: true,
    min_discharge_level: 2,
    min_disability_rating: -1, // must NOT have a rating
    adaptive_housing_condition: null,
    auto_grant_condition: null,
    post_911_90_days: null,
    post_911_30_days: null,
    purple_heart: null,
    pension_service_req: null,
    income_below_limit: null,
    age_or_disability: null,
    min_continuous_days: null,
    service_disability_discharge: null,
    entry_before_date: null,
    home_loan_service_req: null,
    vgli_service_req: null,
  },
  {
    benefit_id: 2, // Veteran Readiness and Employment (VR&E)
    active_duty_service: true,
    service_connected_condition: true,
    min_discharge_level: 2,
    min_disability_rating: 10, // must have rating >= 10
    adaptive_housing_condition: null,
    auto_grant_condition: null,
    post_911_90_days: null,
    post_911_30_days: null,
    purple_heart: null,
    pension_service_req: null,
    income_below_limit: null,
    age_or_disability: null,
    min_continuous_days: null,
    service_disability_discharge: null,
    entry_before_date: null,
    home_loan_service_req: null,
    vgli_service_req: null,
  },
  {
    benefit_id: 3, // Adaptive Housing Grants
    active_duty_service: true,
    service_connected_condition: true,
    min_discharge_level: 2,
    min_disability_rating: null, // no rating requirement
    adaptive_housing_condition: true,
    auto_grant_condition: null,
    post_911_90_days: null,
    post_911_30_days: null,
    purple_heart: null,
    pension_service_req: null,
    income_below_limit: null,
    age_or_disability: null,
    min_continuous_days: null,
    service_disability_discharge: null,
    entry_before_date: null,
    home_loan_service_req: null,
    vgli_service_req: null,
  },
  {
    benefit_id: 4, //Post 9-11 GI Bill
                    //Path 1, 90 days aggregate service
    active_duty_service: null,
    service_connected_condition: null,
    min_discharge_level: null,
    min_disability_rating: null,
    adaptive_housing_condition: null,
    auto_grant_condition: null,
    post_911_90_days: true, //Compound calculation performed by eligibility checker
    post_911_30_days: null,
    purple_heart: null,
    pension_service_req: null,
    income_below_limit: null,
    age_or_disability: null,
    min_continuous_days: null,
    service_disability_discharge: null,
    entry_before_date: null,
    home_loan_service_req: null,
    vgli_service_req: null,
  },
  {
    benefit_id: 4, //Post 9-11 GI Bill
                    //Path 2, Purple Heart
    active_duty_service: null,
    service_connected_condition: null,
    min_discharge_level: 1,
    min_disability_rating: null,
    adaptive_housing_condition: null,
    auto_grant_condition: null,
    post_911_90_days: null,
    post_911_30_days: null,
    purple_heart: true,
    pension_service_req: null,
    income_below_limit: null,
    age_or_disability: null,
    min_continuous_days: null,
    service_disability_discharge: null,
    entry_before_date: null,
    home_loan_service_req: null,
    vgli_service_req: null,
  },
  {
    benefit_id: 4, //Post 9-11 GI Bill
                    //Path 3, 30 days continuous service
    active_duty_service: null,
    service_connected_condition: true,
    min_discharge_level: null,
    min_disability_rating: null,
    adaptive_housing_condition: null,
    auto_grant_condition: null,
    post_911_90_days: null,
    post_911_30_days: true, //Compound calculation performed by eligibility checker
    purple_heart: null,
    pension_service_req: null,
    income_below_limit: null,
    age_or_disability: null,
    min_continuous_days: null,
    service_disability_discharge: null,
    entry_before_date: null,
    home_loan_service_req: null,
    vgli_service_req: null,
  },
  {
    benefit_id: 5, //Veterans Pension
    active_duty_service: null,
    service_connected_condition: null,
    min_discharge_level: 4,
    min_disability_rating: null,
    adaptive_housing_condition: null,
    auto_grant_condition: null,
    post_911_90_days: null,
    post_911_30_days: null,
    purple_heart: null,
    pension_service_req: true,
    income_below_limit: true,
    age_or_disability: true,
    min_continuous_days: null,
    service_disability_discharge: null,
    entry_before_date: null,
    home_loan_service_req: null,
    vgli_service_req: null,
  },
  {
    benefit_id: 6, // VA Health Care
                   // Path 1: ≥730 continuous active duty days (24 months)
    active_duty_service: true,
    service_connected_condition: null,
    min_discharge_level: 4,
    min_disability_rating: null,
    adaptive_housing_condition: null,
    auto_grant_condition: null,
    post_911_90_days: null,
    post_911_30_days: null,
    purple_heart: null,
    pension_service_req: null,
    income_below_limit: null,
    age_or_disability: null,
    min_continuous_days: 730,
    service_disability_discharge: null,
    entry_before_date: null,
    home_loan_service_req: null,
    vgli_service_req: null,
  },
  {
    benefit_id: 6, // VA Health Care
                   // Path 2: discharged due to service-connected disability
    active_duty_service: true,
    service_connected_condition: null,
    min_discharge_level: 4,
    min_disability_rating: null,
    adaptive_housing_condition: null,
    auto_grant_condition: null,
    post_911_90_days: null,
    post_911_30_days: null,
    purple_heart: null,
    pension_service_req: null,
    income_below_limit: null,
    age_or_disability: null,
    min_continuous_days: null,
    service_disability_discharge: true,
    entry_before_date: null,
    home_loan_service_req: null,
    vgli_service_req: null,
  },
  {
    benefit_id: 6, // VA Health Care
                   // Path 3: entry date before September 7, 1980
    active_duty_service: true,
    service_connected_condition: null,
    min_discharge_level: 4,
    min_disability_rating: null,
    adaptive_housing_condition: null,
    auto_grant_condition: null,
    post_911_90_days: null,
    post_911_30_days: null,
    purple_heart: null,
    pension_service_req: null,
    income_below_limit: null,
    age_or_disability: null,
    min_continuous_days: null,
    service_disability_discharge: null,
    entry_before_date: '1980-09-07',
    home_loan_service_req: null,
    vgli_service_req: null,
  },
  {
    benefit_id: 7, // VA Home Loan Guaranty
    active_duty_service: null,
    service_connected_condition: null,
    min_discharge_level: 4,
    min_disability_rating: null,
    adaptive_housing_condition: null,
    auto_grant_condition: null,
    post_911_90_days: null,
    post_911_30_days: null,
    purple_heart: null,
    pension_service_req: null,
    income_below_limit: null,
    age_or_disability: null,
    min_continuous_days: null,
    service_disability_discharge: null,
    entry_before_date: null,
    home_loan_service_req: true,
    vgli_service_req: null,
  },
  {
    benefit_id: 8, // Veterans' Group Life Insurance (VGLI)
    active_duty_service: null,
    service_connected_condition: null,
    min_discharge_level: 4,
    min_disability_rating: null,
    adaptive_housing_condition: null,
    auto_grant_condition: null,
    post_911_90_days: null,
    post_911_30_days: null,
    purple_heart: null,
    pension_service_req: null,
    income_below_limit: null,
    age_or_disability: null,
    min_continuous_days: null,
    service_disability_discharge: null,
    entry_before_date: null,
    home_loan_service_req: null,
    vgli_service_req: true,
  },
  {
    benefit_id: 9, // Automobile Allowance and Adaptive Equipment
    active_duty_service: true,
    service_connected_condition: true,
    min_discharge_level: 2,
    min_disability_rating: 0,     // requires any VA rating (>= 0%)
    adaptive_housing_condition: null,
    auto_grant_condition: true,
    post_911_90_days: null,
    post_911_30_days: null,
    purple_heart: null,
    pension_service_req: null,
    income_below_limit: null,
    age_or_disability: null,
    min_continuous_days: null,
    service_disability_discharge: null,
    entry_before_date: null,
    home_loan_service_req: null,
    vgli_service_req: null,
  },
  {
    benefit_id: 10, // Veterans Affairs Life Insurance (VALife)
    active_duty_service: null,
    service_connected_condition: null,
    min_discharge_level: null,
    min_disability_rating: 0,     // requires any VA rating (>= 0%)
    adaptive_housing_condition: null,
    auto_grant_condition: null,
    post_911_90_days: null,
    post_911_30_days: null,
    purple_heart: null,
    pension_service_req: null,
    income_below_limit: null,
    age_or_disability: null,
    min_continuous_days: null,
    service_disability_discharge: null,
    entry_before_date: null,
    home_loan_service_req: null,
    vgli_service_req: null,
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
                                              auto_grant_condition,
                                              post_911_90_days, purple_heart, post_911_30_days, pension_service_req,
                                              income_below_limit, age_or_disability,
                                              min_continuous_days, service_disability_discharge, entry_before_date,
                                              home_loan_service_req, vgli_service_req)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)`,
        [
          requirement.benefit_id,
          requirement.active_duty_service,
          requirement.service_connected_condition,
          requirement.min_discharge_level,
          requirement.min_disability_rating,
          requirement.adaptive_housing_condition,
          requirement.auto_grant_condition,
          requirement.post_911_90_days,
          requirement.purple_heart,
          requirement.post_911_30_days,
          requirement.pension_service_req,
          requirement.income_below_limit,
          requirement.age_or_disability,
          requirement.min_continuous_days,
          requirement.service_disability_discharge,
          requirement.entry_before_date,
          requirement.home_loan_service_req,
          requirement.vgli_service_req,
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

