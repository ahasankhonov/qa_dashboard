/**
 * Demo authentication utilities.
 * Replace validateCredentials() with a real API call when backend is ready.
 * Everything else (session cookie, context) stays the same.
 */

// ─── Demo credentials ─────────────────────────────────────────────────────────
const DEMO_EMAIL    = 'alikhon@bolderapps.com';
const DEMO_PASSWORD = 'Qwerty123';

export const AUTH_COOKIE = 'qa_session';

/** Validates credentials. Swap this function for a real fetch() when ready. */
export async function validateCredentials(
  email: string,
  password: string,
): Promise<{ ok: true } | { ok: false; message: string }> {
  // Simulate a brief network delay so the loading state is visible
  await new Promise((r) => setTimeout(r, 600));

  if (email.toLowerCase() === DEMO_EMAIL && password === DEMO_PASSWORD) {
    return { ok: true };
  }

  if (email.toLowerCase() !== DEMO_EMAIL) {
    return { ok: false, message: 'No account found with that email address.' };
  }

  return { ok: false, message: 'Incorrect password. Please try again.' };
}

/** Set a session cookie (expires when browser closes — no max-age). */
export function setSessionCookie(): void {
  document.cookie = `${AUTH_COOKIE}=1; path=/; SameSite=Lax`;
}

/** Remove the session cookie. */
export function clearSessionCookie(): void {
  document.cookie = `${AUTH_COOKIE}=; path=/; max-age=0`;
}

/** Read session from sessionStorage (faster than parsing cookie in React). */
export function readSession(): boolean {
  if (typeof window === 'undefined') return false;
  return sessionStorage.getItem(AUTH_COOKIE) === '1';
}

export function writeSession(): void {
  sessionStorage.setItem(AUTH_COOKIE, '1');
  setSessionCookie();
}

export function clearSession(): void {
  sessionStorage.removeItem(AUTH_COOKIE);
  clearSessionCookie();
}
