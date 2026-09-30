/**
 * withTimeout — race any promise against a clock so network calls can never
 * pend forever. Supabase auth calls (getSession/getUser) have hung
 * indefinitely in the wild (notably Safari), freezing the app on its loading
 * screen with zero console output — a timeout converts that into a visible,
 * recoverable failure instead.
 */
export async function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
  label = "async op"
): Promise<{ ok: true; value: T } | { ok: false; reason: string }> {
  let timer: ReturnType<typeof setTimeout> | null = null;
  try {
    const value = await Promise.race([
      promise,
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms);
      }),
    ]);
    return { ok: true, value };
  } catch (e) {
    return { ok: false, reason: e instanceof Error ? e.message : String(e) };
  } finally {
    if (timer) clearTimeout(timer);
  }
}
