# Form Sources — Ground Truth

Snapshots of the original Google Forms and current Supabase form_schemas rows, kept as source-of-truth for form migrations away from Google Forms.

## Files

| File | Source | Purpose |
|------|--------|---------|
| `google_membership_form.json` | Google Forms API (form `1EpSgVcYbELNRSh_SSZpV9zqa5OrtcMwPc80iDss0bTQ`) | Original "Interest Form" — 63 items across multiple sections |
| `google_chartering_form.json` | Google Forms API (form `1hlcMktMJPQ5Oxi9FyD1DhW-aPiZBJLGhnFwEp7QnxF0`) | Original "Chartering Form" — 37 items with 3 file-upload branches |
| `supabase_membership_schema.json` | `public.form_schemas` where slug='membership' | Current moydforms schema (64 fields, active) |
| `supabase_chartering_schema.json` | `public.form_schemas` where slug='chapter-chartering' | Current moydforms schema (39 questions, active, 3 pages with branching by `chapter_type`) |

## Parity Notes

### Membership Form (`/membership`)
The Google Form had 63 items; Supabase schema has 64 fields. Drift is minor (1 extra section header in the Supabase version). Membership form is live and accepting submissions as of this commit.

### Chapter Chartering Form (`/chapter-chartering`)
Google Form has 37 items; Supabase schema has 39 questions. The Supabase version **extends** the Google Form with:
- An extra "Would you like to upload your membership list now?" radio per chapter branch (county / highschool / college), with conditional file-upload visibility.
- Proper multi-path branching via `condition: { field: "chapter_type", value: "county|highschool|college" }` so the user only sees the branch relevant to their selected chapter type.

`page_count` was corrected from `1` to `3` (matches the actual page numbers 1/2/3 used in question objects) — the progress bar now reflects reality.

## Re-fetch Instructions

To refresh these files from source:

```bash
# From /Users/moyd
python3 <<'PY'
from google.oauth2 import service_account
from googleapiclient.discovery import build
import json

KEY='/Users/moyd/Desktop/MOYD/backend-everything-a599411a62b5.json'
SCOPES=['https://www.googleapis.com/auth/forms.body.readonly']
creds = service_account.Credentials.from_service_account_file(KEY, scopes=SCOPES).with_subject('andrew@moyoungdemocrats.org')
forms = build('forms','v1',credentials=creds, cache_discovery=False)

for name, fid in [
  ('membership', '1EpSgVcYbELNRSh_SSZpV9zqa5OrtcMwPc80iDss0bTQ'),
  ('chartering', '1hlcMktMJPQ5Oxi9FyD1DhW-aPiZBJLGhnFwEp7QnxF0'),
]:
    f = forms.forms().get(formId=fid).execute()
    out = f'moydforms/docs/form-sources/google_{name}_form.json'
    with open(out,'w') as o: json.dump(f, o, indent=2)
    print(f'wrote {out} ({len(f.get("items",[]))} items)')
PY
```
