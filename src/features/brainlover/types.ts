export interface PatientLink {
  user_id: string;
  display_name: string;
  share_consent: boolean;
  email?: string;
  avatar_url?: string;
  /** True if this FreeBrainer is a managed sub-account (BrainLover runs their account). */
  isManaged?: boolean;
}
