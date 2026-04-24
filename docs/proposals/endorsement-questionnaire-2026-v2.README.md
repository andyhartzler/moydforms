# Endorsement Questionnaire 2026 — v2 Alignment-Scoring Proposal

**Status:** PROPOSAL. Not applied to Supabase. v1 (the biographical + campaign-readiness form) stays live while this v2 alignment form is reviewed.

**Slug:** `endorsement-questionnaire-2026-v2`
**Based on:** MOYD 2025 Policy Platform, adopted November 11, 2025 (Obsidian: `Organization/Policy Platform.md`)

## What this is

A focused policy-alignment questionnaire with one open-ended narrative question and 64 scored questions (18 multiple-choice, 46 true/false). It gauges where a candidate falls on the intra-Democratic ideological spectrum (progressive → moderate → conservative Democrat) by measuring alignment with MOYD's adopted platform on a per-policy-area basis.

This is a companion form to v1, not a replacement. v1 collects biographical info, race context, campaign readiness, and references. v2 replaces v1's short "where you stand" section (pages 5 of v1) with a deeper, scored instrument.

## Scoring methodology — weighted aligned-count

Each scored question has:
- `policy_area` — one of 14 areas (economy_labor, healthcare, education, environment_climate, civil_rights_lgbtq, reproductive_rights, criminal_justice, democracy_voting, housing, immigration, gun_policy, tax_fiscal, foreign_policy, youth_specific)
- `moyd_aligned_answer` — the single value (T/F) or array of acceptable MC option values that match the MOYD platform
- `weight` — integer 1-5 where 5 = core platform plank, 1 = style/emphasis
- `spectrum_contribution` — informational tag for the progressive↔conservative axis

### Overall score (0-100)

```
overall_score = (sum of weights of aligned answers) / (sum of all weights) * 100
```

Sum of all scored weights in this schema = **247**. If a candidate gave the MOYD-aligned answer on every question, they score 100. If they missed two weight-5 questions, they drop to ~96. If they miss all weight-5 and weight-4 questions, they drop to ~27 (very unlikely for any Democrat).

### Per-policy-area sub-scores

Same formula restricted to questions with a given `policy_area` tag. The endorsement committee can identify candidates who are strong overall but weak on, say, criminal justice — and ask targeted follow-up questions before deciding.

### Interpretation bands (default)

| Score | Label |
|---|---|
| 85–100 | Strongly aligned — Progressive |
| 70–84  | Aligned — Progressive-leaning |
| 55–69  | Mixed — Moderate Democrat |
| 40–54  | Weakly aligned — Conservative Democrat |
| 0–39   | Not aligned with MOYD platform |

These are committee-tunable. Bands appear in `scoring.interpretation_bands` in the schema.

### Why this method and not IRT or DW-NOMINATE?

DW-NOMINATE and W-NOMINATE extract ideal points from a large corpus of actual roll-call votes. Candidates filling out an endorsement form have no roll-call record to analyze; we'd be inventing item-response parameters with zero training data. Item-response theory (IRT) has the same problem. Weighted aligned-count is what Progressive Punch, Vote Smart's issue scoring, ADA scorecards, Indivisible questionnaires, and Working Families Party questionnaires all use in practice. It is transparent ("you scored 72 because you missed questions X, Y, Z"), auditable, and does not require training data the endorsement committee does not have.

### Research sources

- Keith Poole & Howard Rosenthal, DW-NOMINATE / W-NOMINATE methodology (voteview.com)
- Progressive Punch (weighted roll-call scoring)
- Vote Smart Political Courage Test (issue-position questionnaire)
- Americans for Democratic Action (ADA) annual scorecard methodology
- Heritage Action / Club for Growth scorecards (used only as reverse-alignment anchors in question wording)
- Indivisible endorsement questionnaire templates (distributed via indivisible.org)
- Working Families Party candidate questionnaire (workingfamilies.org)
- Our Revolution and Democracy for America endorsement surveys

## Schema shape

Top level keys the moydforms `CustomFieldsStage` and its downstream consumers will read:

```json
{
  "slug": "endorsement-questionnaire-2026-v2",
  "title": "...",
  "version": 2,
  "status": "proposal",
  "scoring": { methodology, spectrum_axes, max_score, interpretation_bands, weights_legend },
  "policy_areas": [ 15 strings ],
  "questions": [ 65 objects ]
}
```

Every question has the v1-compatible fields `id`, `question_type`, `text`, `required`, plus v2 scoring fields: `type` (schema-level `true_false` / `multiple_choice` / `long_text`), `policy_area`, `weight`, `moyd_aligned_answer`, `spectrum_contribution`, and per-option `aligned` + `spectrum` flags.

`question_type` remains the render-time type (`radio`, `long_answer`) — unchanged from v1 so the existing `CustomFieldsStage` render switch does not need new cases. The scoring metadata is layered on top and does not affect rendering.

## How moydforms consumes this

Forms rendering (unchanged):
1. Form schema row lives in `public.form_schemas`, `questions` column = the JSON `questions` array from this file.
2. `CustomFieldsStage` renders each question by `question_type`. `radio` handles both true/false and multi-option. `long_answer` renders the one narrative question.
3. Submitted values go into `public.form_submissions.submission_data` keyed by question `id`.

## How the CRM consumes the scoring metadata

The scoring is computed client- or server-side at submission time (or when the endorsement committee opens the submission in the Flutter CRM). A scoring function takes the schema + the answers and produces:

```json
{
  "overall_score": 72,
  "overall_band": "Aligned — Progressive-leaning",
  "per_area": {
    "economy_labor":      { "score": 88, "aligned": 5, "total": 6, "weight_hit": 24, "weight_total": 27 },
    "healthcare":         { "score": 75, ... },
    ...
  },
  "missed_core_planks": [
    { "id": "tf_monda",        "weight": 5, "question": "I support the MONA ..." },
    { "id": "tf_end_cash_bail","weight": 5, "question": "I support abolishing cash bail ..." }
  ],
  "narrative": "... full text of the open_ended_why_running answer ..."
}
```

That computed object attaches to `candidate_endorsement_responses` (the v1 view) and renders in the Flutter endorsement section. No additional columns on `form_submissions` are required — the metadata lives alongside the submission as computed output.

## What changed vs v1

- v1 focused on biography, campaign readiness, and a 12-question policy snapshot. It is still the right form for the full endorsement application.
- v2 is a deeper policy-only instrument. Candidates who complete v1 are asked to also complete v2 after they pass the initial screen. The CRM links both via `candidate_id`.
- v2's scoring is committee-facing only. Candidates see their completed form; they do not see a score — the endorsement committee does.

## Deployment checklist (for after Andrew approves)

1. [ ] **Andrew review** — walk through all 65 questions. Flag any whose MOYD-aligned answer feels subjective or any that accidentally filter out loyal Democrats vs. measuring progressive-ness within the party.
2. [ ] **Policy & Advocacy Committee review** — this is the committee that adopted the 2025 platform. They should sanity-check the alignment mappings.
3. [ ] **Weight calibration** — Andrew can sweep through and bump weights up or down. The total weight (247 right now) is not a magic number; only the ratios matter.
4. [ ] **Interpretation bands** — confirm the 85/70/55/40 cut-points with the endorsement committee. Historical MOYD-endorsed candidates should mostly land 70+.
5. [ ] Generate `endorsement-questionnaire-2026-v2.seed.sql` — INSERT into `public.form_schemas` with `status='draft'`, `slug='endorsement-questionnaire-2026-v2'`, and the contents of this JSON file in the `questions` column. Pattern mirrors v1's `endorsement-questionnaire-2026.seed.sql`.
6. [ ] Write a pure-function scorer (TypeScript for moydforms, Dart for the Flutter CRM) that takes `(schema, submission)` → the computed scoring object described above. Unit-test against a sample "100% aligned" submission, "all moderate" submission, and "all conservative" submission.
7. [ ] Wire into `EndorsementQuestionnaireSection` in the Flutter CRM to render per-area scores + missed core planks next to the existing v1 answers.
8. [ ] Flip `status` to `active` in `form_schemas`. v1 stays active alongside it.
9. [ ] Soft launch — share v2 with three friendly pilot candidates. Validate their scores match committee intuition before full rollout.

## Approval checklist for Andrew

- [ ] Platform coverage — every plank from `Organization/Policy Platform.md` is represented
- [ ] No accidental "do you believe in science" filters — every question has at least one answer a loyal Democrat could reasonably pick
- [ ] Missouri-specific framing where the platform is Missouri-specific (grocery tax, SAPA, MONA, Amendment 3, Medicaid expansion, investor-owned utilities)
- [ ] Weights feel right — weight 5 only on platform-core items, weight 2 on emphasis items
- [ ] No duplicate questions measuring the same plank
- [ ] Interpretation bands are where Andrew wants them

## Files in this proposal

- `endorsement-questionnaire-2026-v2.schema.json` — the form schema + scoring metadata (65 questions)
- `endorsement-questionnaire-2026-v2.README.md` — this file

**Not yet created (intentional — requires approval first):**
- `endorsement-questionnaire-2026-v2.seed.sql` — INSERT into `form_schemas`
- Scorer function (TS in moydforms, Dart in CRM)
- Flutter widget wiring
