/**
 * resendCooldown — single source of truth for invite resend rate-limiting.
 *
 * Two-party onboarding (child waits on parent, parent waits on child) needs
 * resend CTAs that can't be spammed: after a send, the button shows a
 * "sent — try again in a few minutes" state for COOLDOWN_MS, then reverts to
 * a working button. Timestamps live in localStorage keyed by recipient email
 * (shared across tabs on the same browser).
 */
export const RESEND_COOLDOWN_MS = 5 * 60 * 1000;

function keyFor(recipientEmail: string): string {
  return `fb_resend_${recipientEmail.trim().toLowerCase()}`;
}

/** Milliseconds remaining before this recipient may be re-sent, or 0. */
export function resendCooldownRemaining(recipientEmail: string): number {
  try {
    const raw = localStorage.getItem(keyFor(recipientEmail));
    if (!raw) return 0;
    const remaining = parseInt(raw, 10) + RESEND_COOLDOWN_MS - Date.now();
    return remaining > 0 ? remaining : 0;
  } catch {
    return 0;
  }
}

/** Record a send now (starts the cooldown). */
export function markResent(recipientEmail: string): void {
  try {
    localStorage.setItem(keyFor(recipientEmail), String(Date.now()));
  } catch {
    /* ignore storage errors */
  }
}

/** Whole minutes (rounded up) remaining — for display. */
export function cooldownMinutesLeft(remainingMs: number): number {
  return Math.max(1, Math.ceil(remainingMs / 60000));
}
