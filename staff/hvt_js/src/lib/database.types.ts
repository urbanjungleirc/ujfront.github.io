/**
 * Database types generated from Supabase schema
 * This file should be regenerated after schema changes using:
 * npx supabase gen types typescript --local > src/lib/database.types.ts
 */

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
      sessions: {
        Row: {
          id: string
          name: string
          date: string
          grade_range: string[]
          scoring_config: Json
          status: 'active' | 'archived'
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          date: string
          grade_range: string[]
          scoring_config: Json
          status?: 'active' | 'archived'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          date?: string
          grade_range?: string[]
          scoring_config?: Json
          status?: 'active' | 'archived'
          created_at?: string
          updated_at?: string
        }
      }
      climbers: {
        Row: {
          id: string
          name: string
          email: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          email?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          email?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      session_climbers: {
        Row: {
          session_id: string
          climber_id: string
          joined_at: string
        }
        Insert: {
          session_id: string
          climber_id: string
          joined_at?: string
        }
        Update: {
          session_id?: string
          climber_id?: string
          joined_at?: string
        }
      }
      attempts: {
        Row: {
          id: string
          session_id: string
          climber_id: string
          grade: string
          send_type: 'flash' | 'top' | 'attempt'
          count: number
          updated_at: string
        }
        Insert: {
          id?: string
          session_id: string
          climber_id: string
          grade: string
          send_type: 'flash' | 'top' | 'attempt'
          count?: number
          updated_at?: string
        }
        Update: {
          id?: string
          session_id?: string
          climber_id?: string
          grade?: string
          send_type?: 'flash' | 'top' | 'attempt'
          count?: number
          updated_at?: string
        }
      }
      class_lists: {
        Row: {
          id: string
          name: string
          climber_ids: string[]
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          climber_ids: string[]
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          climber_ids?: string[]
          created_at?: string
          updated_at?: string
        }
      }
    }
    Views: {}
    Functions: {
      calculate_climber_score: {
        Args: {
          p_session_id: string
          p_climber_id: string
        }
        Returns: number
      }
    }
    Enums: {}
  }
}
