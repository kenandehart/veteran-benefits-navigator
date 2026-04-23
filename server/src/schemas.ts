// Request-body schemas for every route that consumes a body.
// Shapes mirror the QuestionnaireAnswers / ServicePeriod interfaces in
// ../eligibility.ts; keep the two in sync when either side changes.
//
// All object schemas are strict (unknown keys rejected) so a client can't
// smuggle extra fields through — including the client-supplied
// matchedBenefitIds that registration and PUT /user/results used to trust.

import { z } from 'zod';

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

export const ServicePeriodSchema = z.strictObject({
  entryDate: z.string().regex(DATE_REGEX, 'must be YYYY-MM-DD'),
  separationDate: z.string().regex(DATE_REGEX, 'must be YYYY-MM-DD'),
  activeDuty: z.boolean(),
  officerOrEnlisted: z.enum(['officer', 'enlisted']),
  dischargeLevel: z.number().int().min(1).max(5),
  disabilityDischarge: z.boolean(),
  completedFullTerm: z.boolean(),
  hardshipOrEarlyOut: z.boolean(),
});

export const QuestionnaireAnswersSchema = z.strictObject({
  // min(1): eligibility engine iterates service periods; zero is meaningless.
  // max(20): caps engine cost and JSONB storage size. Real veterans rarely
  // exceed 3–4 periods.
  servicePeriods: z.array(ServicePeriodSchema).min(1).max(20),
  serviceConnectedCondition: z.boolean().nullable(),
  hasDisabilityRating: z.boolean().nullable(),
  disabilityRating: z.number().int().min(0).max(100).nullable(),
  adaptiveHousingCondition: z.boolean(),
  hasAutoGrantCondition: z.boolean(),
  incomeBelowLimit: z.boolean(),
  ageOrDisability: z.boolean(),
  purpleHeartPost911: z.boolean(),
  hadSGLI: z.boolean(),
  currentlyInVRE: z.boolean(),
  singleDisability100OrTDIU: z.boolean(),
  formerPOW: z.boolean(),
  servedInVietnam: z.boolean(),
});

// The schemas below use z.object (strip unknown keys) rather than
// z.strictObject. Current clients have been sending matchedBenefitIds on
// /register and /user/results; stripping lets the server quietly take over
// the recomputation without forcing a synchronized client deploy.
export const RegisterBodySchema = z.object({
  username: z
    .string()
    .min(3)
    .max(40)
    .regex(/^[a-zA-Z0-9._]+$/, 'letters, numbers, dots, underscores only'),
  password: z.string().min(10).max(200),
  email: z.email().optional(),
  answers: QuestionnaireAnswersSchema.optional(),
});

// Login is intentionally permissive on length — existing accounts pre-date
// the min(10) registration rule. Wrong credentials still fail auth as usual.
export const LoginBodySchema = z.object({
  username: z.string().min(1).max(40),
  password: z.string().min(1).max(200),
});

export const EmailUpdateSchema = z.object({
  email: z.email(),
});

export const UserResultsUpdateSchema = z.object({
  answers: QuestionnaireAnswersSchema,
});

// page_context is an enum stored as TEXT in the DB with a CHECK constraint.
// Keep this list in sync with the DB constraint when a new surface is added.
//
// strictObject is deliberate: user_id on feedback rows is derived from the
// session server-side, never from the client. Rejecting unknown fields (e.g.
// a client attempting to smuggle user_id=99) surfaces the attempt as a 400
// rather than silently stripping it.
export const FeedbackSchema = z.strictObject({
  comment: z.string().min(1).max(2000),
  email: z.email().optional(),
  page_context: z.enum(['results', 'footer']),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export type RegisterBody = z.infer<typeof RegisterBodySchema>;
export type LoginBody = z.infer<typeof LoginBodySchema>;
export type EmailUpdate = z.infer<typeof EmailUpdateSchema>;
export type QuestionnaireAnswers = z.infer<typeof QuestionnaireAnswersSchema>;
export type UserResultsUpdate = z.infer<typeof UserResultsUpdateSchema>;
export type FeedbackBody = z.infer<typeof FeedbackSchema>;
