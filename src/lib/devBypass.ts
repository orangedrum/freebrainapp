/**
 * devBypass — shared utilities for admin dev-bypass mode.
 *
 * When an admin uses "Dev: switch role", a mock user with id='dev-user-id'
 * is created. This isn't a valid UUID, so ALL Supabase queries using it
 * fail with "invalid input syntax for type uuid".
 *
 * This module provides:
 *  - isDevBypassUser(userId): detect the fake UUID
 *  - markDevCheckIn(today): persist a simulated check-in to localStorage
 *  - getDevCheckInToday(): read whether a simulated check-in exists for today
 *
 * Every data hook should check isDevBypassUser() before hitting Supabase.
 */

const DEV_USER_ID = "dev-user-id";
const DEV_CHECKIN_KEY = "fb_dev_checkin_today";

// Mock patient IDs used when admin proxies as a BrainLover.
// These are NOT valid UUIDs, so they must never reach Supabase.
const DEV_PATIENT_PREFIX = "dev-patient-";

/** Returns true if the user ID is the fake dev-bypass UUID. */
export function isDevBypassUser(userId: string | undefined | null): boolean {
  if (!userId) return false;
  return userId === DEV_USER_ID || userId.startsWith(DEV_PATIENT_PREFIX);
}

/**
 * Returns true if we're in any dev-bypass scenario (admin proxy mode).
 * Checks both the user ID and the localStorage flag.
 */
export function isDevBypassMode(): boolean {
  return localStorage.getItem("dev_bypass_auth") === "true";
}

/**
 * Seed mock caregiver links for the dev-bypass BrainLover proxy.
 * Creates 2 mock FreeBrainers so the BrainLover dashboard shows data.
 * Also seeds a mock check-in for patient-1 so the status card works.
 * Idempotent — only seeds if the key doesn't already exist.
 */
export function seedDevCaregiverLinks(force = false): void {
  if (!force && !isDevBypassMode()) return;
  const key = `dev_caregiver_links_${DEV_USER_ID}`;
  const existing = JSON.parse(localStorage.getItem(key) || "[]");
  const defaultIds = [`${DEV_PATIENT_PREFIX}1`, `${DEV_PATIENT_PREFIX}2`];

  // Merge: ensure the 2 default mock patients exist, but NEVER overwrite
  // sub-accounts the user created during onboarding (dev-patient-<timestamp>).
  let changed = false;
  const merged = [...existing];
  for (const id of defaultIds) {
    if (!merged.some((l: any) => l.patient_id === id)) {
      merged.push({ patient_id: id, caregiver_id: DEV_USER_ID });
      changed = true;
    }
  }
  if (changed || existing.length === 0) {
    localStorage.setItem(key, JSON.stringify(merged));
    console.log(`[FB-DEBUG] seedDevCaregiverLinks: merged ${merged.length} patient links (force=${force})`);
  }

  // Also seed a mock team so the Love page team section renders
  seedDevTeam();

  // Seed patient profiles for the 2 default mock patients (if not already set)
  const defaultProfiles: Record<string, { display_name: string; conditions: string | null; location: string | null }> = {
    [`${DEV_PATIENT_PREFIX}1`]: { display_name: "Jean K.", conditions: "Parkinson's", location: "Austin, TX" },
    [`${DEV_PATIENT_PREFIX}2`]: { display_name: "Maria S.", conditions: "MS", location: "Dallas, TX" },
  };
  for (const [pid, info] of Object.entries(defaultProfiles)) {
    const profileKey = `dev_patient_profile_${pid}`;
    if (!localStorage.getItem(profileKey)) {
      localStorage.setItem(profileKey, JSON.stringify({
        id: pid,
        display_name: info.display_name,
        conditions: info.conditions,
        location: info.location,
        diagnosis_story: null,
        share_consent: false,
        total_score: 0,
      }));
    }
  }

  // ── Mock check-in for dev-patient-1 ──
  // Only seed on the VERY FIRST run (when the patient profile doesn't exist yet).
  // After that, respect admin resets — don't re-seed if the check-in was cleared.
  // The `force` param re-runs this function on every dashboard load, so we use
  // the profile key as a "has been initialized" guard.
  const d = new Date();
  const today = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  const checkinKey = `fb_mock_checkin_${DEV_PATIENT_PREFIX}1_${today}`;
  const checkinInitializedKey = `fb_mock_checkin_initialized_${DEV_PATIENT_PREFIX}1`;
  if (!localStorage.getItem(checkinInitializedKey)) {
    localStorage.setItem(checkinInitializedKey, "true");
    if (!localStorage.getItem(checkinKey)) {
      localStorage.setItem(
        checkinKey,
        JSON.stringify({
          moved: true,
          checkin_status: "moved",
          duration_minutes: 20,
          movement_type: "Stretching",
          checkin_date: today,
        })
      );
    }
  }

  // ── Sync existing localStorage data into mock Supabase tables ──
  seedMockTables();
}

/**
 * Sync existing localStorage data into mock Supabase table format.
 * The mock client reads from `dev_table_<tableName>` keys.
 * This function translates the legacy localStorage keys into that format.
 * Called automatically by seedDevCaregiverLinks() and on app startup.
 */
export function seedMockTables(): void {
  // ── caregiver_links ──
  const linksRaw = localStorage.getItem(`dev_caregiver_links_${DEV_USER_ID}`);
  if (linksRaw) {
    try {
      const links = JSON.parse(linksRaw);
      const tableRows = links.map((l: any) => ({
        id: `cl-${l.patient_id}`,
        caregiver_id: l.caregiver_id || DEV_USER_ID,
        patient_id: l.patient_id,
      }));
      localStorage.setItem("dev_table_caregiver_links", JSON.stringify(tableRows));
    } catch (e) {}
  }

  // ── profiles (for the dev admin user + all mock patients) ──
  const profiles: any[] = [];
  // Admin profile
  profiles.push({
    user_id: DEV_USER_ID,
    display_name: "Dev Admin",
    avatar_url: "",
    location: "",
    diagnosis_story: "",
    favorite_movements: [],
    wearable_connected: false,
    share_consent: false,
    locale: "en",
    deletion_scheduled_at: null,
    caregiver_type: "personal",
    total_score: 420,
  });
  // Patient profiles from localStorage
  const linksParsed = JSON.parse(linksRaw || "[]");
  for (const link of linksParsed) {
    const pid = link.patient_id;
    const profileRaw = localStorage.getItem(`dev_patient_profile_${pid}`);
    if (profileRaw) {
      try {
        const p = JSON.parse(profileRaw);
        profiles.push({
          user_id: pid,
          display_name: p.display_name || "FreeBrainer",
          avatar_url: p.avatar_url || "",
          location: p.location || "",
          diagnosis_story: p.diagnosis_story || "",
          favorite_movements: [],
          wearable_connected: false,
          share_consent: p.share_consent || false,
          locale: "en",
          deletion_scheduled_at: p.deletion_scheduled_at || null,
          caregiver_type: "",
          total_score: p.total_score || 0,
          conditions: p.conditions || null,
        });
      } catch (e) {}
    }
  }
  localStorage.setItem("dev_table_profiles", JSON.stringify(profiles));

  // ── managed_freebrainers ──
  const managed: any[] = [];
  for (const link of linksParsed) {
    const pid = link.patient_id;
    const profileRaw = localStorage.getItem(`dev_patient_profile_${pid}`);
    if (profileRaw) {
      try {
        const p = JSON.parse(profileRaw);
        if (p.is_managed || pid.startsWith(DEV_PATIENT_PREFIX)) {
          managed.push({
            id: pid,
            managed_by: DEV_USER_ID,
            display_name: p.display_name || "FreeBrainer",
            avatar_url: p.avatar_url || "",
            share_consent: p.share_consent || false,
            deletion_scheduled_at: p.deletion_scheduled_at || null,
            conditions: p.conditions || null,
            location: p.location || null,
          });
        }
      } catch (e) {}
    }
  }
  localStorage.setItem("dev_table_managed_freebrainers", JSON.stringify(managed));

  // ── teams ──
  const teamRaw = localStorage.getItem(`dev_team_${DEV_USER_ID}`);
  if (teamRaw) {
    try {
      const team = JSON.parse(teamRaw);
      localStorage.setItem("dev_table_teams", JSON.stringify([team]));
      // team_members: link the dev user to the team
      const members = [
        { id: "tm-dev", team_id: team.id, user_id: DEV_USER_ID },
      ];
      // Also link all patients to the team
      for (const link of linksParsed) {
        members.push({
          id: `tm-${link.patient_id}`,
          team_id: team.id,
          user_id: link.patient_id,
        });
      }
      localStorage.setItem("dev_table_team_members", JSON.stringify(members));
    } catch (e) {}
  }

  // ── daily_checkins ──
  const checkins: any[] = [];
  const d = new Date();
  const today = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  // Check for mock checkins for each patient
  for (const link of linksParsed) {
    const pid = link.patient_id;
    const checkinKey = `fb_mock_checkin_${pid}_${today}`;
    const checkinRaw = localStorage.getItem(checkinKey);
    if (checkinRaw) {
      try {
        const c = JSON.parse(checkinRaw);
        checkins.push({
          id: `ck-${pid}-${today}`,
          user_id: pid,
          checkin_date: today,
          created_at: new Date().toISOString(),
          moved: c.moved,
          checkin_status: c.checkin_status,
          duration_minutes: c.duration_minutes || 0,
          movement_type: c.movement_type || "",
          notes: c.notes || "",
          points_earned: c.points_earned || 50,
          aha_insight: c.aha_insight || null,
        });
      } catch (e) {}
    }
  }
  // Also check the dev check-in flag
  if (localStorage.getItem(DEV_CHECKIN_KEY) === today) {
    checkins.push({
      id: `ck-dev-${today}`,
      user_id: DEV_USER_ID,
      checkin_date: today,
      created_at: new Date().toISOString(),
      moved: true,
      checkin_status: "moved",
      duration_minutes: 20,
      movement_type: "Stretching",
      notes: "",
      points_earned: 50,
      aha_insight: null,
    });
  }
  // Merge with any existing checkins in the mock table
  const existingCheckins = JSON.parse(localStorage.getItem("dev_table_daily_checkins") || "[]");
  const checkinIds = new Set(checkins.map((c) => c.id));
  const merged = [...checkins, ...existingCheckins.filter((c: any) => !checkinIds.has(c.id))];
  localStorage.setItem("dev_table_daily_checkins", JSON.stringify(merged));

  // ── user_roles ──
  localStorage.setItem("dev_table_user_roles", JSON.stringify([
    { id: "ur-dev", user_id: DEV_USER_ID, role: "freebrainer" },
    ...linksParsed.map((l: any) => ({ id: `ur-${l.patient_id}`, user_id: l.patient_id, role: "freebrainer" })),
  ]));

  // ── community_posts (empty — no mock posts) ──
  if (!localStorage.getItem("dev_table_community_posts")) {
    localStorage.setItem("dev_table_community_posts", "[]");
  }

  // ── activity_log ──
  // Sync from existing localStorage activity logs
  const activityLogs: any[] = [];
  for (const link of linksParsed) {
    const pid = link.patient_id;
    const logRaw = localStorage.getItem(`fb_activity_log_${pid}`);
    if (logRaw) {
      try {
        const logs = JSON.parse(logRaw);
        logs.forEach((l: any) => {
          activityLogs.push({
            id: l.id || genId(),
            freebrainer_id: pid,
            brainlover_id: l.brainlover_id || DEV_USER_ID,
            content: l.content,
            created_at: l.created_at || new Date().toISOString(),
          });
        });
      } catch (e) {}
    }
  }
  if (activityLogs.length > 0) {
    localStorage.setItem("dev_table_activity_log", JSON.stringify(activityLogs));
  }

  // ── brainlover_notes ──
  const notes: any[] = [];
  for (const link of linksParsed) {
    const pid = link.patient_id;
    const notesRaw = localStorage.getItem(`fb_bl_notes_${pid}`);
    if (notesRaw) {
      try {
        const parsed = JSON.parse(notesRaw);
        parsed.forEach((n: any) => {
          notes.push({
            id: n.id || genId(),
            freebrainer_id: pid,
            author_id: n.author_id || DEV_USER_ID,
            content: n.content,
            created_at: n.created_at || new Date().toISOString(),
          });
        });
      } catch (e) {}
    }
  }
  if (notes.length > 0) {
    localStorage.setItem("dev_table_brainlover_notes", JSON.stringify(notes));
  }

  // ── brainlover_support ──
  if (!localStorage.getItem("dev_table_brainlover_support")) {
    localStorage.setItem("dev_table_brainlover_support", "[]");
  }

  // ── brainlover_interactions ──
  if (!localStorage.getItem("dev_table_brainlover_interactions")) {
    localStorage.setItem("dev_table_brainlover_interactions", "[]");
  }

  // ── medical_profiles ──
  const medProfiles: any[] = [];
  for (const link of linksParsed) {
    const pid = link.patient_id;
    const profileRaw = localStorage.getItem(`dev_patient_profile_${pid}`);
    if (profileRaw) {
      try {
        const p = JSON.parse(profileRaw);
        if (p.conditions) {
          medProfiles.push({
            user_id: pid,
            neurological_condition: p.conditions,
          });
        }
      } catch (e) {}
    }
  }
  localStorage.setItem("dev_table_medical_profiles", JSON.stringify(medProfiles));
}

function genId(): string {
  return `dev-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Seed a mock team for dev-bypass mode so the Love page team section renders.
 * Idempotent — only seeds if the key doesn't already exist.
 */
export function seedDevTeam(): void {
  const key = `dev_team_${DEV_USER_ID}`;
  if (!localStorage.getItem(key)) {
    localStorage.setItem(
      key,
      JSON.stringify({
        id: "dev-team",
        name: "Movement Warriors",
        slogan: "Every step counts",
        image_url: null,
        code: "DEV1234",
      })
    );
  }
}

/** Returns mock display names for dev-patient IDs. */
export function getDevPatientName(patientId: string): string | null {
  if (patientId === `${DEV_PATIENT_PREFIX}1`) return "Jean K.";
  if (patientId === `${DEV_PATIENT_PREFIX}2`) return "Maria S.";
  return null;
}

/** Returns today's date string (yyyy-MM-dd) in LOCAL time. */
function todayStr(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/**
 * Persist a simulated check-in for today.
 * Called by useCheckInData.submitCheckIn in dev-bypass mode.
 */
export function markDevCheckIn(): void {
  localStorage.setItem(DEV_CHECKIN_KEY, todayStr());
}

/**
 * Returns true if a simulated check-in exists for today.
 * Called by useOverviewData and useCheckInData.fetchTodayCheckIn.
 */
export function getDevCheckInToday(): boolean {
  return localStorage.getItem(DEV_CHECKIN_KEY) === todayStr();
}

/** Clears the simulated check-in (called by resetCheckIn in dev mode). */
export function clearDevCheckIn(): void {
  localStorage.removeItem(DEV_CHECKIN_KEY);
}

/**
 * Create a mock managed FreeBrainer sub-account in localStorage (dev-bypass mode).
 * Returns a fake patient ID and adds it to the caregiver links list.
 * This avoids hitting Supabase with an invalid UUID.
 */
export function createDevSubAccount(opts: {
  name: string;
  conditions?: string;
  location?: string;
  diagnosisStory?: string;
  photo?: string | null;
}): { id: string; name: string } {
  const idx = Date.now();
  const patientId = `${DEV_PATIENT_PREFIX}${idx}`;
  const name = opts.name.trim();

  // Add to caregiver links
  const key = `dev_caregiver_links_${DEV_USER_ID}`;
  const existing = JSON.parse(localStorage.getItem(key) || "[]");
  existing.push({ patient_id: patientId });
  localStorage.setItem(key, JSON.stringify(existing));

  // Store patient profile (use uploaded photo or DiceBear avatar)
  const profileKey = `dev_patient_profile_${patientId}`;
  const avatarUrl = opts.photo || `https://api.dicebear.com/10.x/critters/svg?seed=${encodeURIComponent(name)}`;
  localStorage.setItem(
    profileKey,
    JSON.stringify({
      id: patientId,
      display_name: name,
      avatar_url: avatarUrl,
      conditions: opts.conditions?.trim() || null,
      location: opts.location?.trim() || null,
      diagnosis_story: opts.diagnosisStory?.trim() || null,
      share_consent: false,
      total_score: 0,
    })
  );

  console.log(`[FB-DEBUG] createDevSubAccount: created mock patient ${patientId} (${name})`);

  return { id: patientId, name };
}
