# Design elevation — 2026-04-23

Scope: endorsement questionnaire + membership form. Bring both to knockout
quality without disturbing the `CustomFieldsStage` consumer contract or the
submit pipeline.

## Summary of changes

### Typography + brand
- Added `Fraunces` (variable optical serif) via Google Fonts. Reserved for
  form titles, section headers, and hero moments. Body + UI stays on
  Montserrat.
- Added Tailwind `font-display` alias (Fraunces) and an `moyd.{unity,
  sunrise, momentum, slate}` brand palette without disturbing the existing
  `primary` / `gold` scales.

### Progressive-form renderer (`CustomFieldsStage.tsx`)
- Now honors v2 endorsement schema metadata: `policy_area`, `weight`,
  `type: true_false`, `type: long_text`. No wire-format change — the
  renderer reads these if present and falls back cleanly when absent.
- Two new specialty widgets dispatch from `renderField`:
  - `TrueFalseToggle` — pill-pair, side-by-side layout for binary
    policy questions. Positive/negative visual distinction but *not*
    red/green (picking "False" on a negatively framed prompt is often
    MOYD-aligned).
  - `PromptCardTextArea` — editorial card for the narrative "Why are you
    running for office?" prompt. Serif display, autosize textarea, live
    character counter + min-length guidance.
- Policy-area breadcrumb: replaces the bare "Step 3 of 12" with
  "Step 3 of 12 · Healthcare & Reproductive Rights" on policy-tagged
  pages. Snake_case area keys map to display labels in
  `POLICY_AREA_LABELS`.
- Section header upgrade: serif display face, policy-area eyebrow,
  gold rule.
- localStorage autosave via new `useFormAutosave` hook + a
  `RestoreDraftBanner` that surfaces "Pick up where you left off?" on
  next load. Opt-in via `autosaveKey` prop; 14-day expiry; cleared on
  successful submit.
- Accessibility: added `aria-live` validation summary, progressbar ARIA,
  `role="radiogroup"` on the T/F toggle, visible focus rings, `noValidate`
  on the form element so browser-native error UIs don't collide with the
  custom inline validators.

### FormContainer
- Header refresh: serif display title, MOYD unity + sunrise accent rule,
  "Missouri Young Democrats" eyebrow. Fallback for forms that don't pass
  a custom hero.
- New `heroOverride` + `autosaveKey` props — both opt-in, backward
  compatible.

### Endorsement questionnaire
- Client shell now passes `autosaveKey = endorsement-questionnaire-2026:${candidate_id | 'anon'}`
  so a candidate resuming from the same CRM share link lands on their
  own draft.
- Hero (already built) retained.

### Membership
- New `/membership/page.tsx` route + `MembershipHero` + `MembershipFormClient`.
  The generic `[slug]` catchall used to serve this URL — it dropped first-time
  visitors straight into phone entry with zero brand moment. Now we render a
  marketing splash ("Join the movement") before handing off to the same
  FormContainer renderer. `?start=1` is an escape hatch for SMS blasts.
- `/membership/success/page.tsx` rewritten as a real welcome moment:
  serif "Welcome to the movement" hero, timeline of what happens next,
  sunrise gradient CTA to the member portal, event CTA.
- `autosaveKey = membership:anon` — shared slug-scoped drawer since we
  don't have a per-user identifier until phone entry.

### Generic SuccessMessage
- Editorial serif "Thank you." + MOYD unity/sunrise/momentum accent rule +
  ambient sunrise blur. Used by any form without a custom success route
  (e.g. chapter-chartering, endorsement questionnaire).

## Files created
- `src/hooks/useFormAutosave.ts` — localStorage draft persistence
  (debounced writes, 14-day expiry, schema-version invalidation support)
- `src/components/progressive-form/RestoreDraftBanner.tsx` — "Pick up
  where you left off?" restore UI
- `src/components/progressive-form/PolicyAreaBreadcrumb.tsx` — policy-area
  breadcrumb + label dictionary
- `src/components/form-fields/TrueFalseToggle.tsx` — pill-pair binary toggle
- `src/components/form-fields/PromptCardTextArea.tsx` — editorial card
  textarea for narrative prompts
- `src/app/membership/page.tsx` — membership landing route
- `src/app/membership/MembershipHero.tsx` — marketing hero
- `src/app/membership/MembershipFormClient.tsx` — client shell with
  hero + deep-link handling

## Files modified
- `tailwind.config.ts` — Fraunces display alias + moyd brand palette
- `src/app/layout.tsx` — Fraunces Google Font load
- `src/components/progressive-form/CustomFieldsStage.tsx` — policy-area
  breadcrumb, T/F + prompt-card dispatch, autosave wiring, aria-live
  summary, schema v2 metadata plumbing, section-header upgrade
- `src/components/progressive-form/FormContainer.tsx` — editorial header,
  `heroOverride` + `autosaveKey` props
- `src/components/progressive-form/SuccessMessage.tsx` — editorial
  thank-you with serif display
- `src/app/endorsement-questionnaire-2026/EndorsementFormClient.tsx` —
  passes `autosaveKey`
- `src/app/membership/success/page.tsx` — rewritten welcome screen

## Build status
`npm run build` — PASS. All 8 static pages generate; no TypeScript errors.
New `/membership` route + existing `/endorsement-questionnaire-2026` route
both dynamic (ƒ) with reasonable first-load JS (178 kB).

## Smoke test
Started `PORT=3001 npm run dev` — both `/membership` and
`/endorsement-questionnaire-2026` return HTTP 200. Visual verification left
to the Vercel preview deploy (branches are unpushed, per the task brief).

## Mobile verification approach
- Single-column layout verified on the styling level (existing max-w-5xl /
  max-w-2xl containers were preserved; new hero grids fall to
  `grid-cols-1` on mobile).
- Sticky bottom nav (`.sticky-bottom-nav`) was already in place.
- Focus rings are explicit on every new interactive element; tap targets
  stay ≥44px.
- Real device testing is a follow-up once the Vercel preview is live.

## Follow-ups (separate PR)
1. Wire v2 endorsement schema into `form_schemas` (currently a proposal
   in `docs/proposals/`). Once it's live, the new policy-area breadcrumb
   will self-populate.
2. Once phone-entry happens, rebind the membership `autosaveKey` from
   `membership:anon` to `membership:<phone_e164>` so multiple users on a
   shared device don't clobber each other's drafts.
3. Add a chapter-map thumbnail to the chapter select step (needs design
   asset + new `ChapterSelect` card component; out of scope today).
4. Prefers-reduced-motion pass on `framer-motion` variants — the existing
   CSS `@media (prefers-reduced-motion)` block handles the shimmer/marquee
   but the spring transitions on motion components would benefit from
   explicit `useReducedMotion()` guards.
5. Playwright smoke test covering:
   - Restore banner hydrates correctly
   - T/F toggle keyboard navigation
   - Prompt-card min-length guidance updates live
   - `?start=1` deep-link bypasses hero on both routes
