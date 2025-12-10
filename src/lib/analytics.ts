import { v4 as uuidv4 } from 'uuid';

const SESSION_TOKEN_KEY = 'vote_session_token';

export function getOrCreateSessionToken(): string {
  if (typeof window === 'undefined') return '';

  let token = sessionStorage.getItem(SESSION_TOKEN_KEY);
  if (!token) {
    token = uuidv4();
    sessionStorage.setItem(SESSION_TOKEN_KEY, token);
  }
  return token;
}

export function clearSessionToken(): void {
  if (typeof window === 'undefined') return;
  sessionStorage.removeItem(SESSION_TOKEN_KEY);
}
