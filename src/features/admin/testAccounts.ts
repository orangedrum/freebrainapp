// Statically documented test accounts for the FreeBrain app.
// Source of truth: the SQL queries in docs/test-accounts.md.
// To refresh: re-run those queries against Supabase, then update this file
// (the admin panel and the doc stay in sync by being regenerated together).

export type TestRole = "admin" | "freebrainer" | "caregiver";

export interface TestLink {
  name: string;
  email?: string;
  kind: "linked" | "managed";
}

export interface TestAccount {
  email: string;
  role: TestRole;
  name: string | null;
  onboarding: boolean | null;
  links: TestLink[];
}

export const TEST_ACCOUNTS: TestAccount[] = [
  {
    email: "jeankaluza@gmail.com",
    role: "admin",
    name: "jeankaluza",
    onboarding: true,
    links: [],
  },
  {
    email: "jeankaluza+freebrainer@gmail.com",
    role: "freebrainer",
    name: "JeanBrain",
    onboarding: true,
    links: [
      { name: "jeankaluza+brainlover@gmail.com", email: "jeankaluza+brainlover@gmail.com", kind: "linked" },
    ],
  },
  {
    email: "jeankaluza+brainlover@gmail.com",
    role: "caregiver",
    name: null,
    onboarding: null,
    links: [{ name: "JeanBrain", email: "jeankaluza+freebrainer@gmail.com", kind: "linked" }],
  },
  {
    email: "jeankaluza+brainlover_subog@gmail.com",
    role: "caregiver",
    name: "Brainlover Sub OG",
    onboarding: true,
    links: [{ name: "Freebrainer Sub", kind: "managed" }],
  },
  {
    email: "jeankaluza+brainlover3@gmail.com",
    role: "caregiver",
    name: null,
    onboarding: null,
    links: [{ name: "Johnny smithers", kind: "managed" }],
  },
  {
    email: "jeankaluza+bl1sub@gmail.com",
    role: "caregiver",
    name: "Sub Brainlover1",
    onboarding: true,
    links: [],
  },
  {
    email: "jeankaluza+bl2sub@gmail.com",
    role: "caregiver",
    name: "Brainlover Sub 2",
    onboarding: true,
    links: [],
  },
  {
    email: "jeankaluza+laurenog@gmail.com",
    role: "caregiver",
    name: "LaurenOG",
    onboarding: true,
    links: [],
  },
];