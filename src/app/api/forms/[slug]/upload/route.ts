import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { dualWriteToDriveFolder } from '@/lib/googleDrive';
import * as Sentry from '@sentry/nextjs';

// Supabase storage allows up to 5GB per object on paid plans; we cap at
// 250MB to align with the chartering form's max_size_mb setting.
const MAX_FILE_SIZE = 250 * 1024 * 1024;
const STORAGE_BUCKET = 'form-uploads';

export async function POST(
  request: NextRequest,
  { params }: { params: { slug: string } | Promise<{ slug: string }> }
) {
  const supabase = createClient();
  const { slug } = await params;

  // Find form by slug or ID
  let form;
  let error;

  ({ data: form, error } = await supabase
    .from('form_schemas')
    .select('id, status')
    .eq('slug', slug)
    .single());

  if (error || !form) {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (uuidRegex.test(slug)) {
      ({ data: form, error } = await supabase
        .from('form_schemas')
        .select('id, status')
        .eq('id', slug)
        .single());
    }
  }

  if (error || !form) {
    return NextResponse.json({ error: 'Form not found' }, { status: 404 });
  }

  if (form.status !== 'active') {
    return NextResponse.json({ error: 'Form is not active' }, { status: 400 });
  }

  // Parse form data
  let formData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: 'Invalid form data' }, { status: 400 });
  }

  const file = formData.get('file') as File | null;
  const fieldId = formData.get('fieldId') as string | null;

  if (!file) {
    return NextResponse.json({ error: 'No file provided' }, { status: 400 });
  }

  if (!fieldId) {
    return NextResponse.json({ error: 'Field ID is required' }, { status: 400 });
  }

  // Validate file size
  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json(
      { error: `File size exceeds ${Math.floor(MAX_FILE_SIZE / 1024 / 1024)}MB limit` },
      { status: 400 }
    );
  }

  // Generate unique file path
  const timestamp = Date.now();
  const safeFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
  const storagePath = `${form.id}/${fieldId}/${timestamp}_${safeFileName}`;

  // Upload file to Supabase Storage
  const buffer = await file.arrayBuffer();
  const { data: uploadData, error: uploadError } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(storagePath, buffer, {
      contentType: file.type,
      upsert: false,
    });

  if (uploadError) {
    console.error('Upload error:', uploadError);
    // The 2026-07-22 headshot outage (missing storage RLS policy on
    // form-uploads) failed exactly here for two days with no visibility.
    Sentry.captureException(
      new Error(`form upload to storage failed: ${uploadError.message}`),
      {
        extra: {
          slug,
          fieldId,
          fileName: file.name,
          fileType: file.type,
          fileSize: file.size,
        },
      }
    );
    return NextResponse.json({ error: 'Failed to upload file' }, { status: 500 });
  }

  // Get public URL
  const { data: urlData } = supabase.storage
    .from(STORAGE_BUCKET)
    .getPublicUrl(storagePath);

  // Check for authenticated user
  let memberId = null;
  let uploadedBy = null;

  const { data: { session } } = await supabase.auth.getSession();
  if (session) {
    uploadedBy = session.user.id;
    const { data: member } = await supabase
      .from('members')
      .select('id')
      .eq('user_id', session.user.id)
      .single();
    if (member) {
      memberId = member.id;
    }
  }

  // Record file in database
  const { data: fileRecord, error: recordError } = await supabase
    .from('form_files')
    .insert({
      form_id: form.id,
      field_id: fieldId,
      file_name: file.name,
      file_type: file.type,
      file_size: file.size,
      storage_path: storagePath,
      storage_bucket: STORAGE_BUCKET,
      public_url: urlData.publicUrl,
      uploaded_by: uploadedBy,
      member_id: memberId,
      metadata: {
        original_name: file.name,
        upload_timestamp: new Date().toISOString(),
      },
    })
    .select()
    .single();

  if (recordError) {
    console.error('File record error:', recordError);
    Sentry.captureException(
      new Error(`form_files record failed: ${recordError.message}`),
      { extra: { slug, fieldId, fileName: file.name } }
    );
    // Still return success since file is uploaded, just not recorded
  }

  // Continuity dual-write to the Google Drive folder the pre-moydforms
  // Zapier pipeline wrote to (chartering file uploads only — member list,
  // officers list, governing documents per chapter type). Fire-and-forget,
  // and serialize the buffer once so we reuse the bytes we already read.
  void dualWriteToDriveFolder(fieldId, file.name, file.type, buffer).catch(
    (err) => console.warn('[upload] Drive dual-write failed:', err)
  );

  return NextResponse.json({
    success: true,
    file_id: fileRecord?.id,
    url: urlData.publicUrl,
    path: storagePath,
    // Include file metadata for Edge Function processing
    file_name: file.name,
    file_size: file.size,
    mime_type: file.type,
    field_id: fieldId,
  });
}
