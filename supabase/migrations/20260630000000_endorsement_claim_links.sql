-- Endorsement questionnaire — per-candidate claim links (2026 email campaign).
--
-- Each candidate invited to the endorsement questionnaire gets an OPAQUE token.
-- The email link carries only that token (…/endorsement-questionnaire-2026?token=…),
-- so the raw candidates.id UUID never appears in a forwardable URL. The page
-- resolves the token server-side to greet "Hi {first_name}" and, if the link was
-- forwarded to the wrong person, a "Not you?" control disclaims it.
--
-- All access is via SECURITY DEFINER RPCs; the table itself is RLS-locked with no
-- anon policies, so a guessed/forged token reveals nothing without a valid row.

create table if not exists public.endorsement_claim_links (
  id               uuid primary key default gen_random_uuid(),
  token            text not null unique,
  candidate_id     uuid not null references public.candidates(id) on delete cascade,
  campaign         text not null default 'endorsement-questionnaire-2026',
  created_at       timestamptz not null default now(),
  expires_at       timestamptz,
  sent_at          timestamptz,
  first_opened_at  timestamptz,
  claimed_at       timestamptz,
  disclaimed_at    timestamptz,
  disclaimed_count integer not null default 0,
  revoked          boolean not null default false
);

create index if not exists endorsement_claim_links_candidate_idx
  on public.endorsement_claim_links (candidate_id);

create unique index if not exists endorsement_claim_links_one_active_per_candidate
  on public.endorsement_claim_links (candidate_id, campaign)
  where revoked = false;

alter table public.endorsement_claim_links enable row level security;
-- Intentionally no anon/authenticated policies: reach the data only through the
-- SECURITY DEFINER functions below.

-- Resolve a token to the minimal candidate identity needed to greet + prefill.
-- Returns 0 rows for an unknown/expired/revoked token. Stamps first_opened_at.
create or replace function public.resolve_claim_token(p_token text)
returns table (
  candidate_id uuid,
  first_name   text,
  full_name    text,
  office       text,
  district     text
)
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.endorsement_claim_links l
     set first_opened_at = coalesce(l.first_opened_at, now())
   where l.token = p_token
     and l.revoked = false
     and (l.expires_at is null or l.expires_at > now());

  return query
  select c.id,
         coalesce(nullif(btrim(c.first_name), ''), split_part(c.name, ' ', 1)) as first_name,
         c.name,
         c.office,
         c.district
    from public.endorsement_claim_links l
    join public.candidates c on c.id = l.candidate_id
   where l.token = p_token
     and l.revoked = false
     and (l.expires_at is null or l.expires_at > now());
end;
$$;

revoke all on function public.resolve_claim_token(text) from public;
grant execute on function public.resolve_claim_token(text) to anon, authenticated;

-- "Not you?" — the wrong person opened a forwarded link. Flag it (so the CRM can
-- see the link was shared) without deleting it, then the page falls back to the
-- bare form so the visitor can still apply as themselves.
create or replace function public.disclaim_claim_token(p_token text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.endorsement_claim_links
     set disclaimed_at    = now(),
         disclaimed_count = disclaimed_count + 1
   where token = p_token
     and revoked = false;
end;
$$;

revoke all on function public.disclaim_claim_token(text) from public;
grant execute on function public.disclaim_claim_token(text) to anon, authenticated;
