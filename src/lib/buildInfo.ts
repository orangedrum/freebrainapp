/**
 * buildInfo — which build is running, in plain sight.
 *
 * Nontechnical testers can't read bundle hashes, so the short build stamp
 * renders in the dashboard footer. "Which build are you on?" now has a
 * one-line answer. FB_BUILD_TIME is baked at build time via vite.config
 * `define` (dev shows the live time, which is equally useful there).
 */
declare const __FB_BUILD_TIME__: string | undefined;

function computeBuildId(): string {
  try {
    if (typeof __FB_BUILD_TIME__ !== "undefined" && __FB_BUILD_TIME__) {
      const d = new Date(__FB_BUILD_TIME__);
      if (!isNaN(d.getTime())) {
        const pad = (n: number) => String(n).padStart(2, "0");
        return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
      }
    }
  } catch {
    /* fall through */
  }
  return "dev";
}

export const FB_BUILD_ID: string = computeBuildId();
