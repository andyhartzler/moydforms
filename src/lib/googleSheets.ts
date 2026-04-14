// Minimal Google Sheets client backed by a service-account JWT.
//
// Lives outside @google-cloud/googleapis so we don't pull a 15MB dep in
// just to append a row. Mints an RS256 JWT, exchanges for an access token,
// and POSTs to sheets.googleapis.com.
//
// Requires env var GOOGLE_SERVICE_ACCOUNT_JSON — the full JSON of a service
// account key file with Sheets scope authorized via domain-wide delegation.
// Impersonates GOOGLE_DWD_SUBJECT (defaults to andrew@moyoungdemocrats.org).

import crypto from 'node:crypto';

const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const SCOPE = 'https://www.googleapis.com/auth/spreadsheets';

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
  const signature = signer.sign(key.private_key);
  const jwt = `${signingInput}.${base64url(signature)}`;

  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
  });
  if (!res.ok) {
    console.error('[googleSheets] token exchange failed', res.status, await res.text());
    return null;
  }
  const json = (await res.json()) as { access_token?: string };
  return json.access_token || null;
}

export async function appendRow(
  spreadsheetId: string,
  worksheetTitle: string,
  row: Array<string | number | null>
): Promise<boolean> {
  const token = await getAccessToken();
  if (!token) {
    console.warn('[googleSheets] no access token — skipping append');
    return false;
  }

  const range = `${worksheetTitle}!A1`;
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(
    spreadsheetId
  )}/values/${encodeURIComponent(range)}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`;

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ values: [row] }),
  });
  if (!res.ok) {
    console.error('[googleSheets] append failed', res.status, await res.text());
    return false;
  }
  return true;
}
