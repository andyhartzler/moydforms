import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB default
const STORAGE_BUCKET = 'form-uploads';

export async function POST(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  const supabase = createClient();
  const { slug } = params;

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
    return NextResponse.json({ error: 'File size exceeds 10MB limit' }, { status: 400 });
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
    // Still return success since file is uploaded, just not recorded
  }

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
