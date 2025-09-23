export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      attendance: {
        Row: {
          clock_in: string | null
          clock_out: string | null
          created_at: string
          date: string
          emp_id: string
          id: string
          notes: string | null
          status: string
          updated_at: string
        }
        Insert: {
          clock_in?: string | null
          clock_out?: string | null
          created_at?: string
          date?: string
          emp_id: string
          id?: string
          notes?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          clock_in?: string | null
          clock_out?: string | null
          created_at?: string
          date?: string
          emp_id?: string
          id?: string
          notes?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "attendance_emp_fk"
            columns: ["emp_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["emp_id"]
          },
        ]
      }
      departments: {
        Row: {
          created_at: string
          dept_head_id: string | null
          dept_id: string
          dept_name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          dept_head_id?: string | null
          dept_id?: string
          dept_name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          dept_head_id?: string | null
          dept_id?: string
          dept_name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_dept_head"
            columns: ["dept_head_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["emp_id"]
          },
        ]
      }
      designations: {
        Row: {
          created_at: string
          designation_id: string
          designation_name: string
          level: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          designation_id?: string
          designation_name: string
          level?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          designation_id?: string
          designation_name?: string
          level?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      employees: {
        Row: {
          address: string | null
          created_at: string
          department_id: string | null
          designation_id: string | null
          dob: string | null
          doj: string
          email: string
          emp_id: string
          first_name: string
          gender: string | null
          last_name: string
          phone: string | null
          role_id: string | null
          salary: number | null
          status: string
          updated_at: string
          user_id: string | null
          username: string
        }
        Insert: {
          address?: string | null
          created_at?: string
          department_id?: string | null
          designation_id?: string | null
          dob?: string | null
          doj?: string
          email: string
          emp_id?: string
          first_name: string
          gender?: string | null
          last_name: string
          phone?: string | null
          role_id?: string | null
          salary?: number | null
          status?: string
          updated_at?: string
          user_id?: string | null
          username: string
        }
        Update: {
          address?: string | null
          created_at?: string
          department_id?: string | null
          designation_id?: string | null
          dob?: string | null
          doj?: string
          email?: string
          emp_id?: string
          first_name?: string
          gender?: string | null
          last_name?: string
          phone?: string | null
          role_id?: string | null
          salary?: number | null
          status?: string
          updated_at?: string
          user_id?: string | null
          username?: string
        }
        Relationships: [
          {
            foreignKeyName: "employees_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["dept_id"]
          },
          {
            foreignKeyName: "employees_designation_id_fkey"
            columns: ["designation_id"]
            isOneToOne: false
            referencedRelation: "designations"
            referencedColumns: ["designation_id"]
          },
          {
            foreignKeyName: "employees_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["role_id"]
          },
        ]
      }
      employment_history: {
        Row: {
          approved_by: string | null
          change_reason: string | null
          created_at: string
          emp_id: string
          end_date: string | null
          history_id: string
          new_dept_id: string
          new_designation_id: string
          old_dept_id: string | null
          old_designation_id: string | null
          recommended_by: string | null
          remarks: string | null
          reviewed_by: string | null
          start_date: string
          updated_at: string
        }
        Insert: {
          approved_by?: string | null
          change_reason?: string | null
          created_at?: string
          emp_id: string
          end_date?: string | null
          history_id?: string
          new_dept_id: string
          new_designation_id: string
          old_dept_id?: string | null
          old_designation_id?: string | null
          recommended_by?: string | null
          remarks?: string | null
          reviewed_by?: string | null
          start_date?: string
          updated_at?: string
        }
        Update: {
          approved_by?: string | null
          change_reason?: string | null
          created_at?: string
          emp_id?: string
          end_date?: string | null
          history_id?: string
          new_dept_id?: string
          new_designation_id?: string
          old_dept_id?: string | null
          old_designation_id?: string | null
          recommended_by?: string | null
          remarks?: string | null
          reviewed_by?: string | null
          start_date?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "employment_history_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["emp_id"]
          },
          {
            foreignKeyName: "employment_history_emp_id_fkey"
            columns: ["emp_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["emp_id"]
          },
          {
            foreignKeyName: "employment_history_new_dept_id_fkey"
            columns: ["new_dept_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["dept_id"]
          },
          {
            foreignKeyName: "employment_history_new_designation_id_fkey"
            columns: ["new_designation_id"]
            isOneToOne: false
            referencedRelation: "designations"
            referencedColumns: ["designation_id"]
          },
          {
            foreignKeyName: "employment_history_old_dept_id_fkey"
            columns: ["old_dept_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["dept_id"]
          },
          {
            foreignKeyName: "employment_history_old_designation_id_fkey"
            columns: ["old_designation_id"]
            isOneToOne: false
            referencedRelation: "designations"
            referencedColumns: ["designation_id"]
          },
          {
            foreignKeyName: "employment_history_recommended_by_fkey"
            columns: ["recommended_by"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["emp_id"]
          },
          {
            foreignKeyName: "employment_history_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["emp_id"]
          },
        ]
      }
      leave_requests: {
        Row: {
          created_at: string
          dept_head_comments: string | null
          dept_review_date: string | null
          emp_id: string
          end_date: string
          hr_comments: string | null
          hr_review_date: string | null
          leave_id: string
          leave_type: string
          reason: string
          reviewed_by_dept_head: string | null
          reviewed_by_hr: string | null
          start_date: string
          status: string
          total_days: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          dept_head_comments?: string | null
          dept_review_date?: string | null
          emp_id: string
          end_date: string
          hr_comments?: string | null
          hr_review_date?: string | null
          leave_id?: string
          leave_type: string
          reason: string
          reviewed_by_dept_head?: string | null
          reviewed_by_hr?: string | null
          start_date: string
          status?: string
          total_days: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          dept_head_comments?: string | null
          dept_review_date?: string | null
          emp_id?: string
          end_date?: string
          hr_comments?: string | null
          hr_review_date?: string | null
          leave_id?: string
          leave_type?: string
          reason?: string
          reviewed_by_dept_head?: string | null
          reviewed_by_hr?: string | null
          start_date?: string
          status?: string
          total_days?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "leave_requests_emp_id_fkey"
            columns: ["emp_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["emp_id"]
          },
          {
            foreignKeyName: "leave_requests_reviewed_by_dept_head_fkey"
            columns: ["reviewed_by_dept_head"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["emp_id"]
          },
          {
            foreignKeyName: "leave_requests_reviewed_by_hr_fkey"
            columns: ["reviewed_by_hr"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["emp_id"]
          },
        ]
      }
      roles: {
        Row: {
          created_at: string
          description: string | null
          role_id: string
          role_name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          role_id?: string
          role_name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          role_id?: string
          role_name?: string
          updated_at?: string
        }
        Relationships: []
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

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
