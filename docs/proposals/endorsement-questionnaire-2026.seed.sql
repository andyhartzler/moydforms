-- ============================================================================
-- SEED: Insert endorsement-questionnaire-2026 into public.form_schemas
-- Status: PROPOSED — DO NOT APPLY WITHOUT REVIEW
-- Depends on: 20260422000000_endorsement_questionnaire_link.sql (migration)
-- ============================================================================
--
-- The schema JSON lives at docs/proposals/endorsement-questionnaire-2026.schema.json.
-- This SQL reads it via psql's \lo_import pattern OR you can paste inline.
-- Below is the inline version for portability.
--
-- IMPORTANT: page 10 and 11 branching depends on a synthetic field
-- `dob_is_young_dem` that must be computed client-side from `date_of_birth`
-- before the conditional evaluator runs. See the FormContainer hook patch
-- documented in docs/proposals/endorsement-questionnaire-2026.README.md.
-- ============================================================================

INSERT INTO public.form_schemas (
  slug,
  title,
  description,
  form_type,
  schema,
  status,
  page_count,
  public_form,
  preview_text,
  settings,
  show_back_button
)
VALUES (
  'endorsement-questionnaire-2026',
  'MOYD 2026 Endorsement Questionnaire',
  'Missouri Young Democrats candidate endorsement application. Branches into a Young Dem track and a Partner Candidate track based on date of birth.',
  'registration',
  -- Paste the contents of endorsement-questionnaire-2026.schema.json here
  -- as the value of :schema_json when running via psql:
  --   psql ... -v schema_json="$(cat docs/proposals/endorsement-questionnaire-2026.schema.json | jq -c .)"
  -- Or replace the placeholder below with the literal JSON.
  '{{SCHEMA_JSON_GOES_HERE}}'::jsonb,
  'draft',  -- flip to 'active' after review
  12,
  true,
  'Tell MOYD why we should endorse you for 2026. Takes ~20 minutes.',
  jsonb_build_object(
    'submit_label', 'Submit my application',
    'require_certification', true,
    'confirmation_title', 'Thank you for applying.',
    'confirmation_body', 'Our endorsement committee will review your application within two weeks. Expect a call.',
    'track_gate_field', 'date_of_birth',
    'track_gate_age_cutoff', 36
  )
)
ON CONFLICT (slug) DO UPDATE
  SET schema = EXCLUDED.schema,
      description = EXCLUDED.description,
      page_count = EXCLUDED.page_count,
      settings = EXCLUDED.settings,
      updated_at = now();
