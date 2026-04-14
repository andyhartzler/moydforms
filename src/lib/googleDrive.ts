// Minimal Google Drive upload client backed by a service-account JWT.
// Paired with googleSheets.ts — same auth path, different Google API.
//
// Used to dual-write chartering file uploads to the Drive folders the
// pre-moydforms Zapier pipeline wrote to, so the historical file archive
// stays continuous.

import crypto from 'node:crypto';

const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const SCOPE = 'https://www.googleapis.com/auth/drive.file';

// Folder IDs live inside the "Chartering Form (File responses)" parent
// folder (13P6YbA9OrJmcCFBBwgKfnb8_rI92ENtIvgCeRe7pqjYGbvmZkuHB8BAeViNA7Ndr_br3VsGp).
// Map each chartering form field_id to the matching subfolder.
// Enumerated via drive.files.list on 2026-04-14 — see
// google_workspace_access.md memory entry.
export const CHARTERING_FIELD_TO_FOLDER: Record<string, string> = {
  county_governing_documents: '1nFyCaiBkRPXFyjl28gLZuhyxYl7VBkPbrSIwC9WoJF3kMGwfku_aJGlt4GybDaEPg-WNsFUq',
  county_officers_list: '1bGSZJcGgTdBxJfa0dj1QwLxhGwNga3t0K9jBN6692wlyy4obq-Ne_ry7vrw9CChEdkDEJCR0',
  county_membership_list: '1mZwPAyI_yUFdMHLn7xESmkGOprao0wx23z1Z1WuWEaKBGVv0rkpT_h5KI2uin9kU0EArj8nc',
  hs_governing_documents: '1zJm9JKl1xjf0414dP-u0B815HNmNo-45W3ejGKf2_EPSf9rH4fWW0SJFftiIavM7dx6YYcJj',
  hs_officers_list: '17BH5i4_8f81n1uMb63HP9HtlHDteQqESw4Tuw0KIxlB24N2llv0CJqgnjDjfNqEMC1M7ckxt',
  hs_membership_list: '1_u07c1KBVQgy7HDB6U0KUrF74scbBDt9DezaWxt9Oz90EdXgggtuq8o5cMc6sJpwNyfA3xuh',
  college_governing_documents: '1X3vuLJAnpQjp4ER3088rvf0DKwfRcP29c_Oju0ihPahD9bNgDaC7H8qXnyY9U1Wjsmp7J-zK',
  college_officers_list: '1cwa6Znk4I1-TI6-13XFAJ4gbcqqxOVWo7eI61TsIdR2yNKKeXG4yomIzX4hgzj2zHhYwUqV9',
  college_membership_list: '14J43ydZU1ypXqdXbF-vcVaF0inMhCjeW582o0YEFqAcFbHH-oXS23lx3OEsjjZUpI6e35zAX',
};

interface ServiceAccountKey {
  client_email: string;
  private_key: string;
}

function loadKey(): ServiceAccountKey | null {
  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    return { client_email: parsed.client_email, private_key: parsed.private_key };
  } catch {
    return null;
  }
}

function base64url(input: Buffer | string): string {
  return Buffer.from(input)
    .toString('base64')
    .replace(/=+$/, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

async function getAccessToken(): Promise<string | null> {
  const key = loadKey();
  if (!key) return null;
  const subject = process.env.GOOGLE_DWD_SUBJECT || 'andrew@moyoungdemocrats.org';
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: 'RS256', typ: 'JWT' };
  const claim = {
    iss: key.client_email,
    scope: SCOPE,
    aud: TOKEN_URL,
    sub: subject,
    iat: now,
    exp: now + 3600,
  };
  const signingInput = `${base64url(JSON.stringify(header))}.${base64url(JSON.stringify(claim))}`;
  const signer = crypto.createSign('RSA-SHA256');
  signer.update(signingInput);
  const jwt = `${signingInput}.${base64url(signer.sign(key.private_key))}`;

  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
  });
  if (!res.ok) {
    console.error('[googleDrive] token exchange failed', res.status);
    return null;
  }
  const json = (await res.json()) as { access_token?: string };
  return json.access_token || null;
}

export interface DriveUploadResult {
  id: string;
  name: string;
  webViewLink?: string;
}

/**
 * Upload a file to a Drive folder using multipart/related.
 * Returns the new file id + metadata, or null on any failure. Never throws.
 */
export async function uploadToDriveFolder(
  folderId: string,
  fileName: string,
  contentType: string,
  bytes: ArrayBuffer | Uint8Array
): Promise<DriveUploadResult | null> {
  const token = await getAccessToken();
  if (!token) {
    console.warn('[googleDrive] no token — skipping upload');
    return null;
  }

  const boundary = `moydforms-${crypto.randomBytes(8).toString('hex')}`;
  const metadata = {
    name: fileName,
    parents: [folderId],
    // Supports shared drives if the folder lives in one
  };
  const metadataPart = Buffer.from(
    `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}\r\n`
  );
  const contentPart = Buffer.from(
    `--${boundary}\r\nContent-Type: ${contentType || 'application/octet-stream'}\r\n\r\n`
  );
  const body = Buffer.concat([
    metadataPart,
    contentPart,
    Buffer.from(bytes as ArrayBuffer),
    Buffer.from(`\r\n--${boundary}--\r\n`),
  ]);

  const url =
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&supportsAllDrives=true&fields=id,name,webViewLink';

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': `multipart/related; boundary=${boundary}`,
        'Content-Length': String(body.byteLength),
      },
      body,
    });
    if (!res.ok) {
      const text = await res.text();
      console.error('[googleDrive] upload failed', res.status, text.slice(0, 200));
      return null;
    }
    return (await res.json()) as DriveUploadResult;
  } catch (err) {
    console.error('[googleDrive] upload threw', err);
    return null;
  }
}

/**
 * Continuity dual-write: if the form field has a corresponding Drive folder
 * (currently only the 9 chartering file_upload fields), upload the same
 * bytes that were just stored in Supabase. Fire-and-forget — never rejects.
 */
export async function dualWriteToDriveFolder(
  fieldId: string,
  fileName: string,
  contentType: string,
  bytes: ArrayBuffer | Uint8Array
): Promise<DriveUploadResult | null> {
  const folderId = CHARTERING_FIELD_TO_FOLDER[fieldId];
  if (!folderId) return null;
  return uploadToDriveFolder(folderId, fileName, contentType, bytes);
}
