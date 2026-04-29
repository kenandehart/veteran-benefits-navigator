-- Up Migration

-- The questionnaire field `singleDisability100OrTDIU` was renamed to
-- `paidAtTotalDisabilityRate` to better match the question text it represents.
-- Existing rows in user_questionnaire.answers still use the old key, and the
-- server's strict schema rejects any payload that contains it. This migration
-- rewrites every existing row in place: it copies the boolean value to the new
-- key and drops the old key. Idempotent: rows that have already been migrated
-- (no longer contain the old key) are skipped by the WHERE clause.

UPDATE public.user_questionnaire
SET answers = jsonb_set(answers, '{paidAtTotalDisabilityRate}', answers -> 'singleDisability100OrTDIU')
            - 'singleDisability100OrTDIU'
WHERE answers ? 'singleDisability100OrTDIU';


-- Down Migration

-- Structural reversal of the rename. Any row that was written under the new
-- key `paidAtTotalDisabilityRate` during the period this migration was applied
-- (including new rows written after the rename) will have that key renamed
-- back to `singleDisability100OrTDIU`. That is the desired behavior for a
-- rollback: the schema goes back to the old name, so the data must follow.
-- Idempotent: rows that no longer have the new key are skipped.

UPDATE public.user_questionnaire
SET answers = jsonb_set(answers, '{singleDisability100OrTDIU}', answers -> 'paidAtTotalDisabilityRate')
            - 'paidAtTotalDisabilityRate'
WHERE answers ? 'paidAtTotalDisabilityRate';
