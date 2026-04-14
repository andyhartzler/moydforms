// POST /api/chartering/create-join-form
//
// Closes the gap left by the `process-chartering-submission` Supabase Edge
// Function: that function creates a row in `public.chapters` and records
// intended `membership_form_id` / `membership_form_slug` / `membership_form_url`
// values in the chartering submission's page_data, but it does NOT materialize
// the corresponding form_schemas row. Without that row, the auto-generated
// https://forms.moyoungdemocrats.org/join-<chapter-slug> URL 404s.
//
// This route runs server-side with the SUPABASE_SERVICE_ROLE_KEY and:
// 1. Upserts the form_schemas row (id-keyed, so it's idempotent)
// 2. Updates public.chapters with the slug/url so the CRM Finance / Chapters
//    views can surface the URL to staff
//
// Called by the moydforms client after processCharteringSubmission succeeds.
// Requires env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY.

import { NextRequest, NextResponse } from 'next/server';
import { buildJoinFormRow } from '@/lib/joinFormTemplate';

interface CreateJoinFormBody {
  formId: string;
  slug: string;
  url: string;
  chapterId: string;
  chapterName: string;
  submissionId?: string;
}

export async function POST(request: NextRequest) {
  let body: CreateJoinFormBody;
  try {
    body = (await request.json()) as CreateJoinFormBody;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { formId, slug, url, chapterId, chapterName } = body;
  if (!formId || !slug || !chapterId || !chapterName) {
    return NextResponse.json(
      { error: 'formId, slug, chapterId, chapterName are required' },
      { status: 400 }
    );
  }

  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) {
    return NextResponse.json(
      { error: 'Server not configured — SUPABASE_SERVICE_ROLE_KEY missing' },
      { status: 500 }
    );
  }

  const row = buildJoinFormRow(formId, slug, { chapterId, chapterName });

  // Upsert the form_schemas row — idempotent via primary key.
  const insertRes = await fetch(`${supabaseUrl}/rest/v1/form_schemas`, {
    method: 'POST',
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      'Content-Type': 'application/json',
      Prefer: 'resolution=merge-duplicates,return=minimal',
    },
    body: JSON.stringify(row),
  });

  if (!insertRes.ok) {
    const text = await insertRes.text();
    console.error('[create-join-form] upsert failed:', insertRes.status, text);
    return NextResponse.json(
      { error: 'Failed to create form_schemas row', detail: text.slice(0, 300) },
      { status: 500 }
    );
  }

  // Mirror the slug/url onto the chapters row so the CRM can display it.
  const chapterRes = await fetch(
    `${supabaseUrl}/rest/v1/chapters?id=eq.${encodeURIComponent(chapterId)}`,
    {
      method: 'PATCH',
      headers: {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
        'Content-Type': 'application/json',
        Prefer: 'return=minimal',
      },
      body: JSON.stringify({
        membership_form_slug: slug,
        membership_form_url: url,
      }),
    }
  );

  if (!chapterRes.ok) {
    const text = await chapterRes.text();
    // Not fatal — the form is live even if the chapter row wasn't updated.
    console.warn('[create-join-form] chapter update failed:', chapterRes.status, text);
  }

  return NextResponse.json({
    success: true,
    formId,
    slug,
    url,
  });
}
