import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
const supabaseUrl = Deno.env.get("SUPABASE_URL");
const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS"
};
// ============================================================================
// PHONE UTILITIES
// ============================================================================
function normalizePhone(phone) {
  return phone.replace(/\D/g, '');
}
function formatPhoneE164(phone) {
  const digits = normalizePhone(phone);
  if (digits.length === 11 && digits.startsWith('1')) {
    return `+${digits}`;
  }
  if (digits.length === 10) {
    return `+1${digits}`;
  }
  if (phone.startsWith('+') && digits.length >= 10) {
    return `+${digits}`;
  }
  return `+1${digits}`;
}
function isValidPhone(phone) {
  const digits = normalizePhone(phone);
  return digits.length >= 10 && digits.length <= 15;
}
function generatePlaceholderEmail(phoneE164) {
  return `form_${phoneE164.replace('+', '')}@pending.moyd.org`;
}
function generatePlaceholderName(phoneE164) {
  return `Pending ${phoneE164}`;
}
function isPlaceholderEmail(email) {
  return email.endsWith('@pending.moyd.org');
}
function isPlaceholderName(name) {
  return name.startsWith('Pending +');
}
function generateSessionToken() {
  return crypto.randomUUID();
}
// Identity/prefill keys. Anything OUTSIDE this set is a real answer the
// respondent typed (a policy position, a committee choice, a signature, etc.).
const IDENTITY_FIELD_KEYS = new Set([
  'name',
  'full_name',
  'first_name',
  'last_name',
  'email',
  'email_address',
  'phone',
  'phone_number',
  'zip_code',
  'zipcode',
  'postal_code'
]);
// True if the submission's data map already holds any answer the respondent
// typed (i.e. a key that is not a pure identity/prefill field). Used to make
// `abandon` safe by construction: a row with real answers must never be
// marked abandoned by a stray unload beacon.
function hasRealAnswers(data) {
  if (!data || typeof data !== 'object') return false;
  return Object.keys(data).some((k)=>{
    if (IDENTITY_FIELD_KEYS.has(k.toLowerCase())) return false;
    const v = data[k];
    // treat empty string/null/undefined/empty array as "not answered"
    if (v === null || v === undefined || v === '') return false;
    if (Array.isArray(v) && v.length === 0) return false;
    return true;
  });
}
// ============================================================================
// DATABASE OPERATIONS
// ============================================================================
/**
 * Search for a person across all tables by phone number
 */ async function lookupPersonByPhone(phone) {
  const phoneE164 = formatPhoneE164(phone);
  const normalizedPhone = normalizePhone(phone);
  // Try to use the database function first
  const { data: result, error } = await supabase.rpc('find_or_create_subscriber_by_phone', {
    p_phone: phone,
    p_phone_e164: phoneE164,
    p_source: 'form'
  });
  if (error) {
    console.error('Error calling find_or_create_subscriber_by_phone:', error);
    // Fall back to manual lookup
    return await manualLookupAndCreate(phone, phoneE164);
  }
  if (result && result.length > 0) {
    const r = result[0];
    return {
      found: !r.is_new,
      subscriber_id: r.subscriber_id,
      member_id: r.member_id,
      donor_id: r.donor_id,
      is_new: r.is_new,
      name: r.name,
      email: r.email,
      phone: phone,
      phone_e164: phoneE164,
      zip_code: r.zip_code,
      address: r.address,
      city: r.city,
      state: r.state,
      source: r.source_type
    };
  }
  // Fall back to manual if no results
  return await manualLookupAndCreate(phone, phoneE164);
}
/**
 * Manual lookup and create if the RPC doesn't exist or fails
 * 
 * Table schemas:
 * - members: has phone, phone_e164, address, county (NO city, state, zip_code!)
 * - donors: has phone, phone_e164, address, city, state, zip_code
 * - event_attendees: has guest_phone, address, city, state, zip (NOT zip_code!)
 * - subscribers: has phone, phone_e164, address, city, state, zip_code
 */ async function manualLookupAndCreate(phone, phoneE164) {
  const normalizedPhone = normalizePhone(phone);
  // Also try without the +1 prefix (10 digits only)
  const phoneWithoutCountry = phoneE164.replace('+1', '');
  console.log('Manual lookup with phone variants:', {
    phone,
    phoneE164,
    normalizedPhone,
    phoneWithoutCountry
  });
  // =========================================================================
  // Search MEMBERS - has phone, phone_e164 columns
  // Note: members does NOT have city, state, zip_code columns!
  // =========================================================================
  let member = null;
  // Try phone_e164 column first (most reliable)
  const { data: memberByE164Col } = await supabase.from('members').select('*').eq('phone_e164', phoneE164).limit(1).maybeSingle();
  if (memberByE164Col) {
    member = memberByE164Col;
  } else {
    // Try phone column with various formats
    const { data: memberByPhone } = await supabase.from('members').select('*').eq('phone', normalizedPhone).limit(1).maybeSingle();
    if (memberByPhone) {
      member = memberByPhone;
    } else {
      const { data: memberByE164 } = await supabase.from('members').select('*').eq('phone', phoneE164).limit(1).maybeSingle();
      if (memberByE164) {
        member = memberByE164;
      } else {
        const { data: memberByWithoutCountry } = await supabase.from('members').select('*').eq('phone', phoneWithoutCountry).limit(1).maybeSingle();
        member = memberByWithoutCountry;
      }
    }
  }
  // =========================================================================
  // Search SUBSCRIBERS - has phone, phone_e164 columns
  // =========================================================================
  let subscriber = null;
  // Try phone_e164 column first
  const { data: subByE164Column } = await supabase.from('subscribers').select('*').eq('phone_e164', phoneE164).limit(1).maybeSingle();
  if (subByE164Column) {
    subscriber = subByE164Column;
  } else {
    const { data: subByPhone } = await supabase.from('subscribers').select('*').eq('phone', normalizedPhone).limit(1).maybeSingle();
    if (subByPhone) {
      subscriber = subByPhone;
    } else {
      const { data: subByE164 } = await supabase.from('subscribers').select('*').eq('phone', phoneE164).limit(1).maybeSingle();
      subscriber = subByE164;
    }
  }
  // =========================================================================
  // Search DONORS - has phone, phone_e164 columns
  // =========================================================================
  let donor = null;
  // Try phone_e164 column first
  const { data: donorByE164Col } = await supabase.from('donors').select('*').eq('phone_e164', phoneE164).limit(1).maybeSingle();
  if (donorByE164Col) {
    donor = donorByE164Col;
  } else {
    const { data: donorByPhone } = await supabase.from('donors').select('*').eq('phone', normalizedPhone).limit(1).maybeSingle();
    if (donorByPhone) {
      donor = donorByPhone;
    } else {
      const { data: donorByE164 } = await supabase.from('donors').select('*').eq('phone', phoneE164).limit(1).maybeSingle();
      donor = donorByE164;
    }
  }
  // =========================================================================
  // Search EVENT_ATTENDEES - has guest_phone column only (no phone_e164)
  // =========================================================================
  let attendee = null;
  const { data: attendeeByE164 } = await supabase.from('event_attendees').select('*').eq('guest_phone', phoneE164).limit(1).maybeSingle();
  if (attendeeByE164) {
    attendee = attendeeByE164;
  } else {
    const { data: attendeeByNormalized } = await supabase.from('event_attendees').select('*').eq('guest_phone', normalizedPhone).limit(1).maybeSingle();
    attendee = attendeeByNormalized;
  }
  console.log('Lookup results:', {
    foundMember: !!member,
    foundSubscriber: !!subscriber,
    foundDonor: !!donor,
    foundAttendee: !!attendee
  });
  // =========================================================================
  // Determine best source and build result
  // =========================================================================
  let foundSubscriberId = null;
  let foundMemberId = null;
  let foundDonorId = null;
  let name = null;
  let email = null;
  let zipCode = null;
  let address = null;
  let city = null;
  let state = null;
  let source = null;
  let isNew = false;
  // Priority 1: Member (but members don't have city/state/zip!)
  if (member) {
    foundMemberId = member.id;
    name = member.name;
    email = member.email;
    address = member.address;
    // Members don't have city, state, zip_code - leave as null
    source = 'member';
  }
  // Priority 2: Subscriber (has all address fields)
  if (subscriber) {
    foundSubscriberId = subscriber.id;
    foundMemberId = foundMemberId || subscriber.member_id;
    foundDonorId = subscriber.donor_id;
    name = name || subscriber.name;
    email = email || subscriber.email;
    zipCode = zipCode || subscriber.zip_code;
    address = address || subscriber.address;
    city = city || subscriber.city;
    state = state || subscriber.state;
    source = source || 'subscriber';
  }
  // Priority 3: Donor (has all address fields)
  if (donor && !foundSubscriberId && !foundMemberId) {
    foundDonorId = donor.id;
    foundMemberId = donor.member_id;
    name = name || donor.name;
    email = email || donor.email;
    zipCode = zipCode || donor.zip_code;
    address = address || donor.address;
    city = city || donor.city;
    state = state || donor.state;
    source = source || 'donor';
  }
  // Priority 4: Event attendee (has zip not zip_code!)
  if (attendee && !foundSubscriberId && !foundMemberId && !foundDonorId) {
    foundMemberId = attendee.member_id;
    name = name || attendee.guest_name;
    email = email || attendee.guest_email;
    zipCode = zipCode || attendee.zip; // Note: column is "zip" not "zip_code"
    address = address || attendee.address;
    city = city || attendee.city;
    state = state || attendee.state;
    source = source || 'event_attendee';
  }
  // If we found a member but no subscriber, try to get subscriber for that member
  if (foundMemberId && !foundSubscriberId) {
    const { data: memberSubscriber } = await supabase.from('subscribers').select('*').eq('member_id', foundMemberId).limit(1).maybeSingle();
    if (memberSubscriber) {
      foundSubscriberId = memberSubscriber.id;
      foundDonorId = foundDonorId || memberSubscriber.donor_id;
      // Get address info from subscriber if member didn't have it
      zipCode = zipCode || memberSubscriber.zip_code;
      city = city || memberSubscriber.city;
      state = state || memberSubscriber.state;
      address = address || memberSubscriber.address;
    }
  }
  console.log('After lookup, found:', {
    name,
    email,
    zipCode,
    city,
    state,
    source
  });
  // =========================================================================
  // If no subscriber found, create one with placeholder
  // =========================================================================
  if (!foundSubscriberId) {
    isNew = true;
    const placeholderEmail = email || generatePlaceholderEmail(phoneE164);
    const placeholderName = name || generatePlaceholderName(phoneE164);
    console.log('Creating new subscriber with:', {
      placeholderName,
      placeholderEmail,
      phoneE164
    });
    const { data: newSubscriber, error: createError } = await supabase.from('subscribers').insert({
      name: placeholderName,
      email: placeholderEmail,
      phone: phone,
      phone_e164: phoneE164,
      zip_code: zipCode,
      address: address,
      city: city,
      state: state,
      member_id: foundMemberId,
      donor_id: foundDonorId,
      source: 'form',
      subscription_status: 'pending',
      optin_date: new Date().toISOString()
    }).select('id').single();
    if (createError) {
      console.error('Error creating subscriber:', createError);
      throw new Error(`Failed to create subscriber: ${createError.message}`);
    }
    foundSubscriberId = newSubscriber.id;
    name = placeholderName;
    email = placeholderEmail;
    source = 'new';
  }
  return {
    found: !isNew,
    subscriber_id: foundSubscriberId,
    member_id: foundMemberId,
    donor_id: foundDonorId,
    is_new: isNew,
    name,
    email,
    phone,
    phone_e164: phoneE164,
    zip_code: zipCode,
    address,
    city,
    state,
    source
  };
}
/**
 * Find or create a form submission for this session
 */ async function findOrCreateSubmission(formId, subscriberId, memberId, phoneE164, sessionToken, ipAddress, userAgent) {
  // Reclaim any non-terminal row for this phone+form so a returning respondent
  // continues the SAME submission instead of forking a new one. We consider
  // in_progress rows AND abandoned rows that still hold real answers (an
  // abandoned-but-populated row means a prior false-abandon; resume it and
  // flip it back to in_progress rather than stranding those answers).
  const { data: candidates } = await supabase.from('form_submissions').select('id, status, data').eq('form_id', formId).eq('submitter_phone', phoneE164).in('status', [
    'in_progress',
    'abandoned'
  ]).order('created_at', {
    ascending: false
  });
  let existing = null;
  if (candidates && candidates.length > 0) {
    existing = candidates.find((c)=>c.status === 'in_progress') || candidates.find((c)=>c.status === 'abandoned' && hasRealAnswers(c.data)) || null;
  }
  if (existing) {
    // Resume it under the new session; restore in_progress if it was abandoned.
    await supabase.from('form_submissions').update({
      session_token: sessionToken,
      subscriber_id: subscriberId,
      member_id: memberId,
      status: 'in_progress',
      updated_at: new Date().toISOString()
    }).eq('id', existing.id);
    return existing.id;
  }
  // Create new submission
  const { data: newSubmission, error } = await supabase.from('form_submissions').insert({
    form_id: formId,
    subscriber_id: subscriberId,
    member_id: memberId,
    submitter_phone: phoneE164,
    session_token: sessionToken,
    status: 'in_progress',
    data: {},
    ip_address: ipAddress,
    user_agent: userAgent
  }).select('id').single();
  if (error) {
    console.error('Error creating submission:', error);
    throw new Error(`Failed to create submission: ${error.message}`);
  }
  return newSubmission.id;
}
/**
 * Record a form analytics event
 */ async function recordFormAnalytics(formId, eventType, options) {
  await supabase.from('form_analytics').insert({
    form_id: formId,
    submission_id: options.submissionId || null,
    subscriber_id: options.subscriberId || null,
    member_id: options.memberId || null,
    session_token: options.sessionToken || null,
    event_type: eventType,
    timestamp: new Date().toISOString(),
    ip_address: options.ipAddress || null,
    user_agent: options.userAgent || null,
    referrer: options.referrer || null,
    metadata: options.metadata || null
  });
}
/**
 * Record a field analytics event
 */ async function recordFieldAnalytics(formId, fieldId, eventType, options) {
  await supabase.from('form_field_analytics').insert({
    form_id: formId,
    field_id: fieldId,
    field_type: options.fieldType || null,
    submission_id: options.submissionId || null,
    subscriber_id: options.subscriberId || null,
    member_id: options.memberId || null,
    session_token: options.sessionToken || null,
    event_type: eventType,
    timestamp: new Date().toISOString(),
    metadata: options.metadata || null
  });
}
/**
 * Update subscriber with real values (replacing placeholders)
 */ async function updateSubscriber(subscriberId, updates) {
  // First get current subscriber to check for placeholders
  const { data: current } = await supabase.from('subscribers').select('name, email').eq('id', subscriberId).single();
  if (!current) {
    return {
      success: false
    };
  }
  const updateData = {};
  // Only update name if current is placeholder or new name is provided
  if (updates.name && (isPlaceholderName(current.name) || updates.name !== current.name)) {
    updateData.name = updates.name;
  }
  // Handle email update carefully (unique constraint)
  if (updates.email && updates.email !== current.email) {
    // Check if this email already exists
    const { data: existingWithEmail } = await supabase.from('subscribers').select('id').eq('email', updates.email.toLowerCase()).neq('id', subscriberId).maybeSingle();
    if (existingWithEmail) {
      // Email exists with different subscriber - return conflict info
      return {
        success: false,
        conflictSubscriberId: existingWithEmail.id
      };
    }
    // Safe to update email
    updateData.email = updates.email.toLowerCase();
    // If updating from placeholder, also update subscription status
    if (isPlaceholderEmail(current.email)) {
      updateData.subscription_status = 'subscribed';
    }
  }
  // Add other fields
  if (updates.zip_code) updateData.zip_code = updates.zip_code;
  if (updates.address) updateData.address = updates.address;
  if (updates.city) updateData.city = updates.city;
  if (updates.state) updateData.state = updates.state;
  if (Object.keys(updateData).length === 0) {
    return {
      success: true
    };
  }
  updateData.updated_at = new Date().toISOString();
  const { error } = await supabase.from('subscribers').update(updateData).eq('id', subscriberId);
  if (error) {
    console.error('Error updating subscriber:', error);
    return {
      success: false
    };
  }
  return {
    success: true
  };
}
// ============================================================================
// ACTION HANDLERS
// ============================================================================
/**
 * ACTION: init_session
 * Called when phone number is entered - creates subscriber and submission immediately
 */ async function handleInitSession(request) {
  const { form_id, phone, session_token, ip_address, user_agent, referrer } = request;
  // Validate
  if (!form_id) {
    throw new Error('form_id is required');
  }
  if (!phone || !isValidPhone(phone)) {
    throw new Error('Valid phone number is required');
  }
  // Verify form exists and is active
  const { data: form, error: formError } = await supabase.from('form_schemas').select('id, title, status').eq('id', form_id).maybeSingle();
  if (formError || !form) {
    throw new Error('Form not found');
  }
  if (form.status !== 'active') {
    throw new Error('Form is not active');
  }
  const phoneE164 = formatPhoneE164(phone);
  const newSessionToken = session_token || generateSessionToken();
  // Look up or create subscriber
  const personResult = await lookupPersonByPhone(phone);
  if (!personResult.subscriber_id) {
    throw new Error('Failed to create subscriber');
  }
  // Find or create submission
  const submissionId = await findOrCreateSubmission(form_id, personResult.subscriber_id, personResult.member_id, phoneE164, newSessionToken, ip_address, user_agent);
  // Record analytics
  await recordFormAnalytics(form_id, 'phone_entered', {
    submissionId,
    subscriberId: personResult.subscriber_id,
    memberId: personResult.member_id,
    sessionToken: newSessionToken,
    ipAddress: ip_address,
    userAgent: user_agent,
    referrer,
    metadata: {
      phone_e164: phoneE164,
      person_found: personResult.found,
      source: personResult.source
    }
  });
  if (personResult.found) {
    await recordFormAnalytics(form_id, 'identity_found', {
      submissionId,
      subscriberId: personResult.subscriber_id,
      memberId: personResult.member_id,
      sessionToken: newSessionToken,
      metadata: {
        source: personResult.source
      }
    });
  }
  // Determine if the prefill data is real or placeholder
  const isPlaceholder = personResult.is_new || isPlaceholderEmail(personResult.email || '') || isPlaceholderName(personResult.name || '');
  return {
    success: true,
    submission_id: submissionId,
    subscriber_id: personResult.subscriber_id,
    member_id: personResult.member_id,
    donor_id: personResult.donor_id,
    session_token: newSessionToken,
    person_found: personResult.found,
    prefill: {
      name: isPlaceholderName(personResult.name || '') ? null : personResult.name,
      email: isPlaceholderEmail(personResult.email || '') ? null : personResult.email,
      zip_code: personResult.zip_code,
      address: personResult.address,
      city: personResult.city,
      state: personResult.state
    },
    is_placeholder: isPlaceholder
  };
}
/**
 * ACTION: update_field
 * Called when any field is completed (on blur)
 */ async function handleUpdateField(request) {
  const { submission_id, session_token, field_key, field_value, field_type } = request;
  // Validate
  if (!submission_id || !session_token || !field_key) {
    throw new Error('submission_id, session_token, and field_key are required');
  }
  // Get submission and verify session
  const { data: submission, error: subError } = await supabase.from('form_submissions').select('id, form_id, subscriber_id, member_id, data, status').eq('id', submission_id).eq('session_token', session_token).single();
  if (subError || !submission) {
    throw new Error('Submission not found or session mismatch');
  }
  if (submission.status === 'submitted') {
    // Idempotent no-op: a late field autosave arriving after submit must not
    // 500 (that error used to spam the client). The submitted data is final.
    return {
      success: true,
      ignored: 'already_submitted'
    };
  }
  // Merge the new field value into existing data
  const updatedData = {
    ...submission.data || {},
    [field_key]: field_value
  };
  // Prepare submission update
  const submissionUpdate = {
    data: updatedData,
    updated_at: new Date().toISOString()
  };
  // Handle identity fields specially
  const identityFields = [
    'name',
    'full_name',
    'first_name',
    'email',
    'email_address',
    'zip_code',
    'zipcode',
    'postal_code'
  ];
  const isIdentityField = identityFields.includes(field_key.toLowerCase());
  if (isIdentityField && submission.subscriber_id) {
    // Map field key to subscriber field
    let subscriberField = null;
    let submissionField = null;
    if ([
      'name',
      'full_name',
      'first_name'
    ].includes(field_key.toLowerCase())) {
      subscriberField = 'name';
      submissionField = 'submitter_name';
    } else if ([
      'email',
      'email_address'
    ].includes(field_key.toLowerCase())) {
      subscriberField = 'email';
      submissionField = 'submitter_email';
    } else if ([
      'zip_code',
      'zipcode',
      'postal_code'
    ].includes(field_key.toLowerCase())) {
      subscriberField = 'zip_code';
    }
    // Update subscriber
    if (subscriberField && field_value) {
      const updateResult = await updateSubscriber(submission.subscriber_id, {
        [subscriberField]: field_value
      });
      if (!updateResult.success && updateResult.conflictSubscriberId) {
        // Email conflict - we might want to merge or handle differently
        // For now, just log it
        console.warn(`Email conflict: ${field_value} already exists with subscriber ${updateResult.conflictSubscriberId}`);
      }
    }
    // Update submission fields
    if (submissionField) {
      submissionUpdate[submissionField] = field_value;
    }
  }
  // Update submission
  await supabase.from('form_submissions').update(submissionUpdate).eq('id', submission_id);
  // Record field analytics
  await recordFieldAnalytics(submission.form_id, field_key, 'field_completed', {
    fieldType: field_type,
    submissionId: submission_id,
    subscriberId: submission.subscriber_id,
    memberId: submission.member_id,
    sessionToken: session_token,
    metadata: {
      is_identity_field: isIdentityField
    }
  });
  return {
    success: true
  };
}
/**
 * ACTION: submit
 * Called when form is submitted
 */ async function handleSubmit(request) {
  const { submission_id, session_token, final_data } = request;
  // Validate
  if (!submission_id || !session_token) {
    throw new Error('submission_id and session_token are required');
  }
  // Get submission and verify session
  const { data: submission, error: subError } = await supabase.from('form_submissions').select('id, form_id, subscriber_id, member_id, data, status, submitter_name, submitter_email').eq('id', submission_id).eq('session_token', session_token).single();
  if (subError || !submission) {
    throw new Error('Submission not found or session mismatch');
  }
  // IDEMPOTENT: a real last-page tap must never surface as an error. If this
  // same session already submitted (double-tap, retry, or a row previously
  // flipped to submitted), return success without re-writing. Not re-writing
  // avoids re-firing any AFTER-UPDATE side effects (e.g. thank-you email).
  if (submission.status === 'submitted') {
    return {
      success: true,
      submission_id,
      idempotent: true
    };
  }
  // Merge final data if provided. This is the authoritative last-page payload
  // and wins over the incrementally-saved per-field data.
  const mergedData = final_data ? {
    ...submission.data || {},
    ...final_data
  } : submission.data;
  // Update submission to submitted (scoped to this session). Any prior status
  // other than 'submitted' (in_progress, or an erroneously-abandoned row) is
  // promoted forward here, so an active submit always wins over a stray abandon.
  await supabase.from('form_submissions').update({
    data: mergedData,
    status: 'submitted',
    updated_at: new Date().toISOString()
  }).eq('id', submission_id).eq('session_token', session_token);
  // If subscriber still has placeholder values, try to update from submission data
  if (submission.subscriber_id) {
    const { data: subscriber } = await supabase.from('subscribers').select('name, email, subscription_status').eq('id', submission.subscriber_id).single();
    if (subscriber) {
      const updates = {};
      // Update subscription status to active
      if (subscriber.subscription_status === 'pending') {
        updates.subscription_status = 'subscribed';
      }
      // Get name and email from submission if subscriber has placeholders
      if (isPlaceholderName(subscriber.name) && submission.submitter_name) {
        updates.name = submission.submitter_name;
      }
      if (isPlaceholderEmail(subscriber.email) && submission.submitter_email) {
        updates.email = submission.submitter_email.toLowerCase();
      }
      if (Object.keys(updates).length > 0) {
        await supabase.from('subscribers').update(updates).eq('id', submission.subscriber_id);
      }
    }
  }
  // Record submit analytics
  await recordFormAnalytics(submission.form_id, 'submit', {
    submissionId: submission_id,
    subscriberId: submission.subscriber_id,
    memberId: submission.member_id,
    sessionToken: session_token,
    metadata: {
      final: true
    }
  });
  return {
    success: true,
    submission_id
  };
}
/**
 * ACTION: abandon
 * Called on a true page unload. Safe by construction:
 *  - scoped by session_token so one tab can never abandon another's row;
 *  - NEVER downgrades a row that already holds real answers (a half-filled
 *    survey must never become 'abandoned' just because the page unloaded).
 * Together with the client no longer firing abandon on mobile app-switch/lock
 * (useBeforeUnload), this makes the 2026-07 false-abandon cascade impossible.
 */ async function handleAbandon(request) {
  const { submission_id, session_token } = request;
  if (!submission_id) {
    throw new Error('submission_id is required');
  }
  if (!session_token) {
    // No session scope -> refuse to abandon anything. Fail safe.
    return {
      success: true
    };
  }
  // Get submission, scoped to this session only.
  const { data: submission } = await supabase.from('form_submissions').select('id, form_id, subscriber_id, member_id, status, data').eq('id', submission_id).eq('session_token', session_token).maybeSingle();
  if (!submission) {
    return {
      success: true
    }; // Already gone or not our session, that's fine
  }
  if (submission.status !== 'in_progress') {
    return {
      success: true
    }; // Not in progress (submitted/abandoned already), don't change
  }
  if (hasRealAnswers(submission.data)) {
    // The respondent has typed real answers. Leave it in_progress so the
    // data stays recoverable; do NOT mark abandoned.
    return {
      success: true,
      skipped: 'has_real_answers'
    };
  }
  // Only truly-empty in-progress rows (phone entered, nothing else) get here.
  await supabase.from('form_submissions').update({
    status: 'abandoned',
    updated_at: new Date().toISOString()
  }).eq('id', submission_id).eq('session_token', session_token);
  // Record abandon analytics
  await recordFormAnalytics(submission.form_id, 'abandon', {
    submissionId: submission_id,
    subscriberId: submission.subscriber_id,
    memberId: submission.member_id,
    sessionToken: session_token,
    metadata: {
      reason: 'user_initiated'
    }
  });
  return {
    success: true
  };
}
/**
 * ACTION: view
 * Called when form is first viewed (before phone entry)
 */ async function handleView(request) {
  const { form_id, ip_address, user_agent, referrer } = request;
  const sessionToken = request.session_token || generateSessionToken();
  if (!form_id) {
    throw new Error('form_id is required');
  }
  // Record view event
  await recordFormAnalytics(form_id, 'view', {
    sessionToken,
    ipAddress: ip_address,
    userAgent: user_agent,
    referrer
  });
  return {
    success: true,
    session_token: sessionToken
  };
}
/**
 * ACTION: lookup (backwards compatibility)
 * Just looks up a person by phone without creating anything
 */ async function handleLookup(phone) {
  if (!phone || !isValidPhone(phone)) {
    return {
      found: false,
      subscriber_id: null,
      member_id: null,
      donor_id: null,
      is_new: false,
      name: null,
      email: null,
      phone: null,
      phone_e164: null,
      zip_code: null,
      address: null,
      city: null,
      state: null,
      source: null
    };
  }
  const phoneE164 = formatPhoneE164(phone);
  const normalizedPhone = normalizePhone(phone);
  // Search without creating. Only digit-derived values (normalizedPhone,
  // phoneE164) are interpolated into the PostgREST filter; the raw request
  // string is never used here, so it cannot inject filter syntax.
  const { data: subscriber } = await supabase.from('subscribers').select('*').or(`phone.eq.${normalizedPhone},phone.eq.${phoneE164},phone_e164.eq.${phoneE164}`).not('email', 'ilike', '%@pending.moyd.org') // Exclude placeholders
  .limit(1).maybeSingle();
  if (subscriber) {
    return {
      found: true,
      subscriber_id: subscriber.id,
      member_id: subscriber.member_id,
      donor_id: subscriber.donor_id,
      is_new: false,
      name: subscriber.name,
      email: subscriber.email,
      phone: subscriber.phone,
      phone_e164: subscriber.phone_e164,
      zip_code: subscriber.zip_code,
      address: subscriber.address,
      city: subscriber.city,
      state: subscriber.state,
      source: 'subscriber'
    };
  }
  // Check other tables (digit-derived filter values only; no raw request string)
  const { data: member } = await supabase.from('members').select('*').or(`phone.eq.${phoneE164},phone.eq.${normalizedPhone}`).limit(1).maybeSingle();
  if (member) {
    return {
      found: true,
      subscriber_id: null,
      member_id: member.id,
      donor_id: member.donor_id,
      is_new: false,
      name: member.name,
      email: member.email,
      phone: member.phone,
      phone_e164: phoneE164,
      zip_code: member.zip_code,
      address: member.address,
      city: member.city,
      state: member.state,
      source: 'member'
    };
  }
  return {
    found: false,
    subscriber_id: null,
    member_id: null,
    donor_id: null,
    is_new: false,
    name: null,
    email: null,
    phone: phone,
    phone_e164: phoneE164,
    zip_code: null,
    address: null,
    city: null,
    state: null,
    source: null
  };
}
// ============================================================================
// MAIN REQUEST HANDLER
// ============================================================================
serve(async (req)=>{
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: corsHeaders
    });
  }
  try {
    const body = await req.json();
    const { action, ...data } = body;
    let result;
    switch(action){
      case 'view':
        result = await handleView(data);
        break;
      case 'init_session':
        result = await handleInitSession(data);
        break;
      case 'update_field':
        result = await handleUpdateField(data);
        break;
      case 'submit':
        result = await handleSubmit(data);
        break;
      case 'abandon':
        result = await handleAbandon(data);
        break;
      case 'lookup':
        result = await handleLookup(data.phone);
        break;
      default:
        return new Response(JSON.stringify({
          error: "Invalid action. Use 'view', 'init_session', 'update_field', 'submit', 'abandon', or 'lookup'",
          code: 'INVALID_ACTION'
        }), {
          status: 400,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json"
          }
        });
    }
    return new Response(JSON.stringify(result), {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json"
      }
    });
  } catch (error) {
    console.error("Error processing request:", error);
    return new Response(JSON.stringify({
      error: error.message || "Failed to process request",
      code: "INTERNAL_ERROR"
    }), {
      status: 500,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json"
      }
    });
  }
});
