export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      daily_checkins: {
        Row: {
          id: string
          user_id: string
          checkin_date: string
          moved: boolean
          movement_type: string | null
          notes: string | null
          symptom_levels: Json | null
          points_earned: number | null
          checkin_status: 'moved' | 'rest_day' | 'flare_up' | null
          multiplier_active: boolean | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          checkin_date: string
          moved?: boolean
          movement_type?: string | null
          notes?: string | null
          symptom_levels?: Json | null
          points_earned?: number | null
          checkin_status?: 'moved' | 'rest_day' | 'flare_up' | null
          multiplier_active?: boolean | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          checkin_date?: string
          moved?: boolean
          movement_type?: string | null
          notes?: string | null
          symptom_levels?: Json | null
          points_earned?: number | null
          checkin_status?: 'moved' | 'rest_day' | 'flare_up' | null
          multiplier_active?: boolean | null
          created_at?: string
        }
      }
      keep_alive: {
        Row: {
          id: number
          created_at: string | null
        }
        Insert: {
          id?: number
          created_at?: string | null
        }
        Update: {
          id?: number
          created_at?: string | null
        }
      }
      medical_access_logs: {
        Row: {
          id: string
          accessed_user_id: string
          accessor_user_id: string
          access_reason: string
          access_type: string
          ip_address: string | null
          user_agent: string | null
          created_at: string
        }
        Insert: {
          id?: string
          accessed_user_id: string
          accessor_user_id: string
          access_reason: string
          access_type: string
          ip_address?: string | null
          user_agent?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          accessed_user_id?: string
          accessor_user_id?: string
          access_reason?: string
          access_type?: string
          ip_address?: string | null
          user_agent?: string | null
          created_at?: string
        }
      }
      medical_profiles: {
        Row: {
          id: string
          user_id: string
          neurological_condition: string | null
          condition_details: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          neurological_condition?: string | null
          condition_details?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          neurological_condition?: string | null
          condition_details?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      profiles: {
        Row: {
          id: string
          user_id: string
          display_name: string | null
          avatar_url: string | null
          location: string | null
          diagnosis_story: string | null
          favorite_movements: string[] | null
          locale: string | null
          caregiver_type: string | null
          facility_id: string | null
          wearable_connected: boolean | null
          share_consent: boolean | null
          onboarding_completed: boolean | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          display_name?: string | null
          avatar_url?: string | null
          location?: string | null
          diagnosis_story?: string | null
          favorite_movements?: string[] | null
          locale?: string | null
          caregiver_type?: string | null
          facility_id?: string | null
          wearable_connected?: boolean | null
          share_consent?: boolean | null
          onboarding_completed?: boolean | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          display_name?: string | null
          avatar_url?: string | null
          location?: string | null
          diagnosis_story?: string | null
          favorite_movements?: string[] | null
          locale?: string | null
          caregiver_type?: string | null
          facility_id?: string | null
          wearable_connected?: boolean | null
          share_consent?: boolean | null
          onboarding_completed?: boolean | null
          created_at?: string
          updated_at?: string
        }
      }
      resources: {
        Row: {
          id: string
          title: string
          description: string | null
          video_url: string | null
          thumbnail_url: string | null
          category: string | null
          created_by: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          title: string
          description?: string | null
          video_url?: string | null
          thumbnail_url?: string | null
          category?: string | null
          created_by: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          title?: string
          description?: string | null
          video_url?: string | null
          thumbnail_url?: string | null
          category?: string | null
          created_by?: string
          created_at?: string
          updated_at?: string
        }
      }
      caregiver_links: {
        Row: {
          id: string
          caregiver_id: string
          patient_id: string
          status: string
          created_at: string
        }
        Insert: {
          id?: string
          caregiver_id: string
          patient_id: string
          status?: string
          created_at?: string
        }
        Update: {
          id?: string
          caregiver_id?: string
          patient_id?: string
          status?: string
          created_at?: string
        }
      }
      community_posts: {
        Row: {
          id: string
          user_id: string
          posted_by_id: string
          video_url: string | null
          external_link: string | null
          content: string | null
          type: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          posted_by_id: string
          video_url?: string | null
          external_link?: string | null
          content?: string | null
          type?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          posted_by_id?: string
          video_url?: string | null
          external_link?: string | null
          content?: string | null
          type?: string | null
          created_at?: string
        }
      }
      team_members: {
        Row: {
          id: string
          team_id: string
          user_id: string
          joined_at: string
        }
        Insert: {
          id?: string
          team_id: string
          user_id: string
          joined_at?: string
        }
        Update: {
          id?: string
          team_id?: string
          user_id?: string
          joined_at?: string
        }
      }
      teams: {
        Row: {
          id: string
          name: string
          description: string | null
          created_by: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          created_by: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          created_by?: string
          created_at?: string
          updated_at?: string
        }
      }
      user_cheers: {
        Row: {
          id: string
          from_user_id: string
          to_user_id: string
          message: string | null
          created_at: string
        }
        Insert: {
          id?: string
          from_user_id: string
          to_user_id: string
          message?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          from_user_id?: string
          to_user_id?: string
          message?: string | null
          created_at?: string
        }
      }
      user_roles: {
        Row: {
          id: string
          user_id: string
          role: "user" | "admin" | "freebrainer" | "brainlover" | "pro"
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          role?: "user" | "admin" | "freebrainer" | "brainlover" | "pro"
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          role?: "user" | "admin" | "freebrainer" | "brainlover" | "pro"
          created_at?: string
        }
      }
      virtual_classes: {
        Row: {
          id: string
          caregiver_id: string
          title: string
          scheduled_time: string
          meet_link: string | null
          status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled'
          notes: string | null
          created_at: string
        }
        Insert: {
          id?: string
          caregiver_id: string
          title: string
          scheduled_time: string
          meet_link?: string | null
          status?: 'scheduled' | 'in_progress' | 'completed' | 'cancelled'
          notes?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          caregiver_id?: string
          title?: string
          scheduled_time?: string
          meet_link?: string | null
          status?: 'scheduled' | 'in_progress' | 'completed' | 'cancelled'
          notes?: string | null
          created_at?: string
        }
      }
      class_attendees: {
        Row: {
          id: string
          class_id: string
          patient_id: string
          attended: boolean
          created_at: string
        }
        Insert: {
          id?: string
          class_id: string
          patient_id: string
          attended?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          class_id?: string
          patient_id?: string
          attended?: boolean
          created_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
