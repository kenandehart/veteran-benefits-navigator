-- Up Migration

-- The eligibility_requirements table was retired during the eligibility refactor.
-- Eligibility is now evaluated directly from questionnaire answers in
-- server/src/eligibility.ts; no application code reads from this table. CASCADE
-- removes the FK to benefits, the table's own sequence, default, and PK.

DROP TABLE IF EXISTS public.eligibility_requirements CASCADE;


-- Down Migration

-- WARNING: this restores STRUCTURE ONLY. Any rows that were in the table at the
-- time of the Up migration are not recovered. Use this Down only to revert an
-- immediate mistake before any dependent state has accumulated; it is not a
-- recovery mechanism. The block below is copied verbatim from migration
-- 1777426662076_baseline-schema.sql so the recreated schema is identical.

CREATE TABLE IF NOT EXISTS public.eligibility_requirements (
    id integer NOT NULL,
    benefit_id integer,
    active_duty_service boolean,
    service_connected_condition boolean,
    min_discharge_level integer,
    min_disability_rating integer,
    adaptive_housing_condition boolean,
    post_911_90_days boolean,
    post_911_30_days boolean,
    purple_heart boolean,
    pension_service_req boolean,
    income_below_limit boolean,
    age_or_disability boolean,
    min_continuous_days integer,
    service_disability_discharge boolean,
    entry_before_date date,
    home_loan_service_req boolean,
    vgli_service_req boolean,
    auto_grant_condition boolean
);

CREATE SEQUENCE IF NOT EXISTS public.eligibility_requirements_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.eligibility_requirements_id_seq OWNED BY public.eligibility_requirements.id;

ALTER TABLE ONLY public.eligibility_requirements ALTER COLUMN id SET DEFAULT nextval('public.eligibility_requirements_id_seq'::regclass);

ALTER TABLE ONLY public.eligibility_requirements
    ADD CONSTRAINT eligibility_requirements_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.eligibility_requirements
    ADD CONSTRAINT eligibility_requirements_benefit_id_fkey FOREIGN KEY (benefit_id) REFERENCES public.benefits(id);
