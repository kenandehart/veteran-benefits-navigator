-- Up Migration

--
-- Name: benefits; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.benefits (
    id integer NOT NULL,
    type character varying(20) NOT NULL,
    category character varying(50) NOT NULL,
    name character varying(255) NOT NULL,
    description text NOT NULL,
    eligibility_summary text,
    url character varying(500) NOT NULL,
    is_active boolean DEFAULT true,
    short_description text,
    application_guidance text,
    application_url text,
    eligibility_url text,
    slug text NOT NULL
);


--
-- Name: benefits_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE IF NOT EXISTS public.benefits_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: benefits_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.benefits_id_seq OWNED BY public.benefits.id;


--
-- Name: eligibility_requirements; Type: TABLE; Schema: public; Owner: -
--

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


--
-- Name: eligibility_requirements_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE IF NOT EXISTS public.eligibility_requirements_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: eligibility_requirements_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.eligibility_requirements_id_seq OWNED BY public.eligibility_requirements.id;


--
-- Name: feedback; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.feedback (
    id integer NOT NULL,
    comment text NOT NULL,
    email text,
    page_context text NOT NULL,
    metadata jsonb,
    user_agent text,
    submitted_at timestamp with time zone DEFAULT now() NOT NULL,
    user_id integer,
    CONSTRAINT feedback_comment_check CHECK (((char_length(comment) >= 1) AND (char_length(comment) <= 2000))),
    CONSTRAINT feedback_page_context_check CHECK ((page_context = ANY (ARRAY['results'::text, 'footer'::text])))
);


--
-- Name: feedback_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE IF NOT EXISTS public.feedback_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: feedback_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.feedback_id_seq OWNED BY public.feedback.id;


--
-- Name: page_views; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.page_views (
    id integer NOT NULL,
    visitor_id text NOT NULL,
    path text NOT NULL,
    viewed_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: page_views_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE IF NOT EXISTS public.page_views_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: page_views_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.page_views_id_seq OWNED BY public.page_views.id;


--
-- Name: password_reset_tokens; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.password_reset_tokens (
    id integer NOT NULL,
    user_id integer NOT NULL,
    token_hash character varying(64) NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    used_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: password_reset_tokens_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE IF NOT EXISTS public.password_reset_tokens_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: password_reset_tokens_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.password_reset_tokens_id_seq OWNED BY public.password_reset_tokens.id;


--
-- Name: questionnaire_completions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.questionnaire_completions (
    id integer NOT NULL,
    completed_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: questionnaire_completions_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE IF NOT EXISTS public.questionnaire_completions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: questionnaire_completions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.questionnaire_completions_id_seq OWNED BY public.questionnaire_completions.id;


--
-- Name: session; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.session (
    sid character varying NOT NULL,
    sess json NOT NULL,
    expire timestamp(6) without time zone NOT NULL
);


--
-- Name: user_questionnaire; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.user_questionnaire (
    id integer NOT NULL,
    user_id integer,
    answers jsonb NOT NULL,
    matched_benefit_ids jsonb NOT NULL,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


--
-- Name: user_questionnaire_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE IF NOT EXISTS public.user_questionnaire_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: user_questionnaire_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.user_questionnaire_id_seq OWNED BY public.user_questionnaire.id;


--
-- Name: users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.users (
    id integer NOT NULL,
    username character varying(50) NOT NULL,
    password_hash character varying(255) NOT NULL,
    email character varying(255),
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


--
-- Name: users_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE IF NOT EXISTS public.users_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;


--
-- Name: benefits id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.benefits ALTER COLUMN id SET DEFAULT nextval('public.benefits_id_seq'::regclass);


--
-- Name: eligibility_requirements id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.eligibility_requirements ALTER COLUMN id SET DEFAULT nextval('public.eligibility_requirements_id_seq'::regclass);


--
-- Name: feedback id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.feedback ALTER COLUMN id SET DEFAULT nextval('public.feedback_id_seq'::regclass);


--
-- Name: page_views id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.page_views ALTER COLUMN id SET DEFAULT nextval('public.page_views_id_seq'::regclass);


--
-- Name: password_reset_tokens id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.password_reset_tokens ALTER COLUMN id SET DEFAULT nextval('public.password_reset_tokens_id_seq'::regclass);


--
-- Name: questionnaire_completions id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.questionnaire_completions ALTER COLUMN id SET DEFAULT nextval('public.questionnaire_completions_id_seq'::regclass);


--
-- Name: user_questionnaire id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_questionnaire ALTER COLUMN id SET DEFAULT nextval('public.user_questionnaire_id_seq'::regclass);


--
-- Name: users id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);


--
-- Name: benefits benefits_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.benefits
    ADD CONSTRAINT benefits_name_key UNIQUE (name);


--
-- Name: benefits benefits_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.benefits
    ADD CONSTRAINT benefits_pkey PRIMARY KEY (id);


--
-- Name: benefits benefits_slug_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.benefits
    ADD CONSTRAINT benefits_slug_unique UNIQUE (slug);


--
-- Name: eligibility_requirements eligibility_requirements_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.eligibility_requirements
    ADD CONSTRAINT eligibility_requirements_pkey PRIMARY KEY (id);


--
-- Name: feedback feedback_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.feedback
    ADD CONSTRAINT feedback_pkey PRIMARY KEY (id);


--
-- Name: page_views page_views_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.page_views
    ADD CONSTRAINT page_views_pkey PRIMARY KEY (id);


--
-- Name: password_reset_tokens password_reset_tokens_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.password_reset_tokens
    ADD CONSTRAINT password_reset_tokens_pkey PRIMARY KEY (id);


--
-- Name: questionnaire_completions questionnaire_completions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.questionnaire_completions
    ADD CONSTRAINT questionnaire_completions_pkey PRIMARY KEY (id);


--
-- Name: session session_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.session
    ADD CONSTRAINT session_pkey PRIMARY KEY (sid);


--
-- Name: user_questionnaire user_questionnaire_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_questionnaire
    ADD CONSTRAINT user_questionnaire_pkey PRIMARY KEY (id);


--
-- Name: user_questionnaire user_questionnaire_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_questionnaire
    ADD CONSTRAINT user_questionnaire_user_id_key UNIQUE (user_id);


--
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: users users_username_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key UNIQUE (username);


--
-- Name: IDX_session_expire; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS "IDX_session_expire" ON public.session USING btree (expire);


--
-- Name: idx_feedback_page_context; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_feedback_page_context ON public.feedback USING btree (page_context);


--
-- Name: idx_feedback_submitted_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_feedback_submitted_at ON public.feedback USING btree (submitted_at DESC);


--
-- Name: idx_feedback_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_feedback_user_id ON public.feedback USING btree (user_id) WHERE (user_id IS NOT NULL);


--
-- Name: idx_page_views_viewed_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_page_views_viewed_at ON public.page_views USING btree (viewed_at);


--
-- Name: idx_page_views_visitor_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_page_views_visitor_id ON public.page_views USING btree (visitor_id);


--
-- Name: idx_password_reset_tokens_token_hash; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_token_hash ON public.password_reset_tokens USING btree (token_hash);


--
-- Name: idx_password_reset_tokens_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_user_id ON public.password_reset_tokens USING btree (user_id);


--
-- Name: idx_questionnaire_completions_completed_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_questionnaire_completions_completed_at ON public.questionnaire_completions USING btree (completed_at);


--
-- Name: eligibility_requirements eligibility_requirements_benefit_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.eligibility_requirements
    ADD CONSTRAINT eligibility_requirements_benefit_id_fkey FOREIGN KEY (benefit_id) REFERENCES public.benefits(id);


--
-- Name: feedback feedback_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.feedback
    ADD CONSTRAINT feedback_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: password_reset_tokens password_reset_tokens_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.password_reset_tokens
    ADD CONSTRAINT password_reset_tokens_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: user_questionnaire user_questionnaire_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_questionnaire
    ADD CONSTRAINT user_questionnaire_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


-- Down Migration

DROP TABLE IF EXISTS public.feedback CASCADE;
DROP TABLE IF EXISTS public.password_reset_tokens CASCADE;
DROP TABLE IF EXISTS public.user_questionnaire CASCADE;
DROP TABLE IF EXISTS public.questionnaire_completions CASCADE;
DROP TABLE IF EXISTS public.page_views CASCADE;
DROP TABLE IF EXISTS public.eligibility_requirements CASCADE;
DROP TABLE IF EXISTS public.session CASCADE;
DROP TABLE IF EXISTS public.users CASCADE;
DROP TABLE IF EXISTS public.benefits CASCADE;

DROP SEQUENCE IF EXISTS public.feedback_id_seq;
DROP SEQUENCE IF EXISTS public.password_reset_tokens_id_seq;
DROP SEQUENCE IF EXISTS public.user_questionnaire_id_seq;
DROP SEQUENCE IF EXISTS public.questionnaire_completions_id_seq;
DROP SEQUENCE IF EXISTS public.page_views_id_seq;
DROP SEQUENCE IF EXISTS public.eligibility_requirements_id_seq;
DROP SEQUENCE IF EXISTS public.users_id_seq;
DROP SEQUENCE IF EXISTS public.benefits_id_seq;
