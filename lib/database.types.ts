export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type HabitKind = 'daily_commitment' | 'extra_win'

export type Database = {
  public: {
    Tables: {
      daily_spending: {
        Row: {
          amount: number
          created_at: string
          id: string
          spend_date: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          spend_date: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          spend_date?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      habit_entries: {
        Row: {
          completed: boolean
          created_at: string
          entry_date: string
          habit_id: string
          id: string
          note: string | null
          numeric_value: number | null
          updated_at: string
        }
        Insert: {
          completed?: boolean
          created_at?: string
          entry_date: string
          habit_id: string
          id?: string
          note?: string | null
          numeric_value?: number | null
          updated_at?: string
        }
        Update: {
          completed?: boolean
          created_at?: string
          entry_date?: string
          habit_id?: string
          id?: string
          note?: string | null
          numeric_value?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'habit_entries_habit_id_fkey'
            columns: ['habit_id']
            isOneToOne: false
            referencedRelation: 'habits'
            referencedColumns: ['id']
          },
        ]
      }
      habits: {
        Row: {
          archived_at: string | null
          color: string | null
          created_at: string
          description: string | null
          habit_kind: HabitKind
          id: string
          metric_kind: string
          metric_unit: string | null
          name: string
          schedule: Json
          user_id: string
        }
        Insert: {
          archived_at?: string | null
          color?: string | null
          created_at?: string
          description?: string | null
          habit_kind?: HabitKind
          id?: string
          metric_kind?: string
          metric_unit?: string | null
          name: string
          schedule?: Json
          user_id: string
        }
        Update: {
          archived_at?: string | null
          color?: string | null
          created_at?: string
          description?: string | null
          habit_kind?: HabitKind
          id?: string
          metric_kind?: string
          metric_unit?: string | null
          name?: string
          schedule?: Json
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}
