# Endorsement Questionnaire 2026 — Proposal Bundle

**Status:** Proposed, not applied. Review and flip `status='active'` when ready.

## Files

| File | Purpose | Ready to apply? |
|---|---|---|
| `endorsement-questionnaire-2026.schema.json` | Form schema (questions format) | Yes — paste into seed SQL |
| `endorsement-questionnaire-2026.seed.sql` | INSERT into `public.form_schemas` | **No** — review first |
| `../../supabase/migrations/20260422000000_endorsement_questionnaire_link.sql` | Adds `candidate_id` FK + `candidate_endorsement_responses` view | **No** — review first |
| `../../src/app/endorsement-questionnaire-2026/page.tsx` (TO CREATE) | Dedicated landing route with hero | No — proposed, see below |
| `../../../my-bluebubbles-web/lib/screens/crm/widgets/endorsement_questionnaire_section.dart` | CRM rendering widget | Yes — just needs to be wired into `_buildIntelTab` |

## The `dob_is_young_dem` synthetic field

The schema uses `condition: { field: "dob_is_young_dem", value: "true" | "false" }` to branch pages 10 vs 11. That field is **derived**, not entered — it must be computed client-side from `date_of_birth` before the conditional evaluator runs.

### Patch to `FormContainer` (one of two options)

**Option A — minimal, schema-local:** add a `useEffect` inside `CustomFieldsStage.tsx` that watches `formData.date_of_birth` and writes a computed `dob_is_young_dem` back into `formData`. This keeps the change inside the normalizer layer and doesn't require new infrastructure.

```tsx
// inside CustomFieldsStage, after useState(formData)
useEffect(() => {
  const dob = formData.date_of_birth;
  if (!dob) return;
  const age = (Date.now() - new Date(dob as string).getTime()) / (365.25 * 24 * 3600 * 1000);
  const isYoungDem = age < 36;
  const flag = isYoungDem ? 'true' : 'false';
  if (formData.dob_is_young_dem !== flag) {
    setFormData((p) => ({ ...p, dob_is_young_dem: flag }));
  }
}, [formData.date_of_birth]);
```

**Option B — framework-level:** add a `computed_fields` array to the schema spec and a general evaluator. Bigger lift, reusable for other forms. Skip for now.

Go with Option A.

## Deployment checklist

1. [ ] Review `schema.json` — question wording, required flags, branching logic
2. [ ] Apply migration: `supabase/migrations/20260422000000_endorsement_questionnaire_link.sql`
3. [ ] Run seed SQL with `{{SCHEMA_JSON_GOES_HERE}}` replaced by the JSON contents (use `jq -c` to flatten)
4. [ ] Patch `CustomFieldsStage.tsx` with the `dob_is_young_dem` effect (Option A above)
5. [ ] Extend `/api/forms/[slug]/submit/route.ts` so that when `slug = 'endorsement-questionnaire-2026'` and request body contains `candidate_id`, the column is populated on insert
6. [ ] Create `src/app/endorsement-questionnaire-2026/page.tsx` (dedicated hero route) OR rely on generic `/[slug]` — test both
7. [ ] Flip `status` from `draft` to `active` in form_schemas
8. [ ] Wire `EndorsementQuestionnaireSection` into `_buildIntelTab()` inside `candidate_detail_screen.dart`
9. [ ] QA: submit as someone born 1995 (should hit Young Dem page), someone born 1975 (should hit Partner page), and the "primary vs D incumbent" conditional
10. [ ] Monitor first 10 submissions for schema corrections

## Submit route extension

```ts
// in /api/forms/[slug]/submit/route.ts, right after creating `submission`:
if (slug.startsWith('endorsement-questionnaire') && body.candidate_id) {
  await supabase
    .from('form_submissions')
    .update({ candidate_id: body.candidate_id })
    .eq('id', submission.id);
}
```

The candidate_id should be passed via a `?candidate_id=<uuid>` query param baked into the share link the CRM sends to each candidate.
