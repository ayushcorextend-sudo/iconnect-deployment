Initialising login role...
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
    PostgrestVersion: "14.4"
  }
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      activity_logs: {
        Row: {
          activity_type: string
          created_at: string | null
          duration_minutes: number | null
          id: string
          reference_id: string | null
          score_delta: number | null
          user_id: string | null
        }
        Insert: {
          activity_type: string
          created_at?: string | null
          duration_minutes?: number | null
          id?: string
          reference_id?: string | null
          score_delta?: number | null
          user_id?: string | null
        }
        Update: {
          activity_type?: string
          created_at?: string | null
          duration_minutes?: number | null
          id?: string
          reference_id?: string | null
          score_delta?: number | null
          user_id?: string | null
        }
        Relationships: []
      }
      admin_webinars: {
        Row: {
          created_at: string | null
          created_by: string | null
          description: string | null
          duration_min: number | null
          id: string
          is_active: boolean | null
          join_url: string | null
          scheduled_at: string
          speaker: string | null
          title: string
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          duration_min?: number | null
          id?: string
          is_active?: boolean | null
          join_url?: string | null
          scheduled_at: string
          speaker?: string | null
          title: string
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          duration_min?: number | null
          id?: string
          is_active?: boolean | null
          join_url?: string | null
          scheduled_at?: string
          speaker?: string | null
          title?: string
        }
        Relationships: []
      }
      app_settings: {
        Row: {
          key: string
          updated_at: string | null
          value: string | null
        }
        Insert: {
          key: string
          updated_at?: string | null
          value?: string | null
        }
        Update: {
          key?: string
          updated_at?: string | null
          value?: string | null
        }
        Relationships: []
      }
      arena_answers: {
        Row: {
          answered_at: string
          arena_id: string
          chosen_key: string | null
          id: string
          is_correct: boolean | null
          participant_id: string
          points_awarded: number
          question_id: string
        }
        Insert: {
          answered_at?: string
          arena_id: string
          chosen_key?: string | null
          id?: string
          is_correct?: boolean | null
          participant_id: string
          points_awarded?: number
          question_id: string
        }
        Update: {
          answered_at?: string
          arena_id?: string
          chosen_key?: string | null
          id?: string
          is_correct?: boolean | null
          participant_id?: string
          points_awarded?: number
          question_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "arena_answers_arena_id_fkey"
            columns: ["arena_id"]
            isOneToOne: false
            referencedRelation: "live_arenas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "arena_answers_participant_id_fkey"
            columns: ["participant_id"]
            isOneToOne: false
            referencedRelation: "arena_participants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "arena_answers_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "quiz_questions"
            referencedColumns: ["id"]
          },
        ]
      }
      arena_participants: {
        Row: {
          arena_id: string
          display_name: string
          id: string
          joined_at: string
          score: number
          user_id: string
        }
        Insert: {
          arena_id: string
          display_name: string
          id?: string
          joined_at?: string
          score?: number
          user_id: string
        }
        Update: {
          arena_id?: string
          display_name?: string
          id?: string
          joined_at?: string
          score?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "arena_participants_arena_id_fkey"
            columns: ["arena_id"]
            isOneToOne: false
            referencedRelation: "live_arenas"
            referencedColumns: ["id"]
          },
        ]
      }
      artifacts: {
        Row: {
          access: string | null
          created_at: string | null
          date: string | null
          description: string | null
          downloads: number | null
          emoji: string | null
          file_url: string | null
          id: number
          pages: number | null
          rejection_reason: string | null
          size: string | null
          status: string | null
          subject: string | null
          thumbnail_url: string | null
          title: string | null
          type: string | null
          uploaded_by: string | null
          uploaded_by_id: string | null
        }
        Insert: {
          access?: string | null
          created_at?: string | null
          date?: string | null
          description?: string | null
          downloads?: number | null
          emoji?: string | null
          file_url?: string | null
          id?: number
          pages?: number | null
          rejection_reason?: string | null
          size?: string | null
          status?: string | null
          subject?: string | null
          thumbnail_url?: string | null
          title?: string | null
          type?: string | null
          uploaded_by?: string | null
          uploaded_by_id?: string | null
        }
        Update: {
          access?: string | null
          created_at?: string | null
          date?: string | null
          description?: string | null
          downloads?: number | null
          emoji?: string | null
          file_url?: string | null
          id?: number
          pages?: number | null
          rejection_reason?: string | null
          size?: string | null
          status?: string | null
          subject?: string | null
          thumbnail_url?: string | null
          title?: string | null
          type?: string | null
          uploaded_by?: string | null
          uploaded_by_id?: string | null
        }
        Relationships: []
      }
      audit_logs: {
        Row: {
          action: string
          actor_email: string | null
          actor_id: string | null
          created_at: string | null
          details: Json | null
          id: string
          ip_address: string | null
          resource: string | null
          resource_id: string | null
        }
        Insert: {
          action: string
          actor_email?: string | null
          actor_id?: string | null
          created_at?: string | null
          details?: Json | null
          id?: string
          ip_address?: string | null
          resource?: string | null
          resource_id?: string | null
        }
        Update: {
          action?: string
          actor_email?: string | null
          actor_id?: string | null
          created_at?: string | null
          details?: Json | null
          id?: string
          ip_address?: string | null
          resource?: string | null
          resource_id?: string | null
        }
        Relationships: []
      }
      calendar_diary: {
        Row: {
          created_at: string | null
          date: string
          entries: Json | null
          goals_met: boolean | null
          id: number
          mood: string | null
          notes: string | null
          personal_notes: string | null
          study_hours: number | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          date: string
          entries?: Json | null
          goals_met?: boolean | null
          id?: number
          mood?: string | null
          notes?: string | null
          personal_notes?: string | null
          study_hours?: number | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          date?: string
          entries?: Json | null
          goals_met?: boolean | null
          id?: number
          mood?: string | null
          notes?: string | null
          personal_notes?: string | null
          study_hours?: number | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "calendar_diary_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      clinical_logs: {
        Row: {
          case_title: string
          created_at: string | null
          diagnosis: string | null
          difficulty: string | null
          id: number
          key_learnings: string | null
          learning_points: string | null
          logged_at: string | null
          presentation: string | null
          speciality: string | null
          tags: string[] | null
          user_id: string | null
        }
        Insert: {
          case_title: string
          created_at?: string | null
          diagnosis?: string | null
          difficulty?: string | null
          id?: number
          key_learnings?: string | null
          learning_points?: string | null
          logged_at?: string | null
          presentation?: string | null
          speciality?: string | null
          tags?: string[] | null
          user_id?: string | null
        }
        Update: {
          case_title?: string
          created_at?: string | null
          diagnosis?: string | null
          difficulty?: string | null
          id?: number
          key_learnings?: string | null
          learning_points?: string | null
          logged_at?: string | null
          presentation?: string | null
          speciality?: string | null
          tags?: string[] | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clinical_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      colleges: {
        Row: {
          id: number
          name: string
          state: string | null
        }
        Insert: {
          id?: number
          name: string
          state?: string | null
        }
        Update: {
          id?: number
          name?: string
          state?: string | null
        }
        Relationships: []
      }
      conferences: {
        Row: {
          created_at: string | null
          created_by: string | null
          description: string | null
          end_date: string
          id: string
          is_featured: boolean | null
          location: string
          organizer: string
          registration_url: string | null
          speciality: string | null
          start_date: string
          title: string
          website_url: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          end_date: string
          id?: string
          is_featured?: boolean | null
          location: string
          organizer: string
          registration_url?: string | null
          speciality?: string | null
          start_date: string
          title: string
          website_url?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          end_date?: string
          id?: string
          is_featured?: boolean | null
          location?: string
          organizer?: string
          registration_url?: string | null
          speciality?: string | null
          start_date?: string
          title?: string
          website_url?: string | null
        }
        Relationships: []
      }
      doubt_replies: {
        Row: {
          body: string
          created_at: string
          doubt_id: string
          id: string
          is_official: boolean
          user_id: string
        }
        Insert: {
          body: string
          created_at?: string
          doubt_id: string
          id?: string
          is_official?: boolean
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          doubt_id?: string
          id?: string
          is_official?: boolean
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "doubt_replies_doubt_id_fkey"
            columns: ["doubt_id"]
            isOneToOne: false
            referencedRelation: "doubts"
            referencedColumns: ["id"]
          },
        ]
      }
      doubts: {
        Row: {
          body: string
          created_at: string
          id: string
          status: string
          subject: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          status?: string
          subject?: string | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          status?: string
          subject?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      exam_attempts: {
        Row: {
          answers: Json | null
          attempted_at: string | null
          id: string
          score: number
          subject_id: number | null
          total: number
          user_id: string | null
        }
        Insert: {
          answers?: Json | null
          attempted_at?: string | null
          id?: string
          score?: number
          subject_id?: number | null
          total?: number
          user_id?: string | null
        }
        Update: {
          answers?: Json | null
          attempted_at?: string | null
          id?: string
          score?: number
          subject_id?: number | null
          total?: number
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "exam_attempts_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "exam_subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      exam_questions: {
        Row: {
          correct: string
          created_at: string | null
          difficulty: string | null
          explanation: string | null
          id: string
          option_a: string
          option_b: string
          option_c: string
          option_d: string
          question: string
          source: string | null
          subject_id: number | null
        }
        Insert: {
          correct: string
          created_at?: string | null
          difficulty?: string | null
          explanation?: string | null
          id?: string
          option_a: string
          option_b: string
          option_c: string
          option_d: string
          question: string
          source?: string | null
          subject_id?: number | null
        }
        Update: {
          correct?: string
          created_at?: string | null
          difficulty?: string | null
          explanation?: string | null
          id?: string
          option_a?: string
          option_b?: string
          option_c?: string
          option_d?: string
          question?: string
          source?: string | null
          subject_id?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "exam_questions_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "exam_subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      exam_sets: {
        Row: {
          created_at: string | null
          created_by: string | null
          description: string | null
          difficulty: string | null
          id: number
          is_published: boolean | null
          question_count: number | null
          subject_id: number | null
          time_limit_mins: number | null
          title: string
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          difficulty?: string | null
          id?: number
          is_published?: boolean | null
          question_count?: number | null
          subject_id?: number | null
          time_limit_mins?: number | null
          title: string
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          difficulty?: string | null
          id?: number
          is_published?: boolean | null
          question_count?: number | null
          subject_id?: number | null
          time_limit_mins?: number | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "exam_sets_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exam_sets_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "exam_subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      exam_subjects: {
        Row: {
          icon: string | null
          id: number
          name: string
          question_count: number | null
        }
        Insert: {
          icon?: string | null
          id?: number
          name: string
          question_count?: number | null
        }
        Update: {
          icon?: string | null
          id?: number
          name?: string
          question_count?: number | null
        }
        Relationships: []
      }
      flashcard_decks: {
        Row: {
          approved_by: string | null
          created_at: string
          created_by: string
          description: string | null
          id: string
          rejection_note: string | null
          status: string
          subject: string
          title: string
          updated_at: string
        }
        Insert: {
          approved_by?: string | null
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          rejection_note?: string | null
          status?: string
          subject: string
          title: string
          updated_at?: string
        }
        Update: {
          approved_by?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          rejection_note?: string | null
          status?: string
          subject?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      flashcards: {
        Row: {
          back: string
          created_at: string
          deck_id: string
          front: string
          id: string
          sort_order: number
        }
        Insert: {
          back: string
          created_at?: string
          deck_id: string
          front: string
          id?: string
          sort_order?: number
        }
        Update: {
          back?: string
          created_at?: string
          deck_id?: string
          front?: string
          id?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "flashcards_deck_id_fkey"
            columns: ["deck_id"]
            isOneToOne: false
            referencedRelation: "flashcard_decks"
            referencedColumns: ["id"]
          },
        ]
      }
      idempotency_keys: {
        Row: {
          created_at: string | null
          id: string
          key: string
          result: Json | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          key: string
          result?: Json | null
        }
        Update: {
          created_at?: string | null
          id?: string
          key?: string
          result?: Json | null
        }
        Relationships: []
      }
      live_arenas: {
        Row: {
          created_at: string
          current_q: number
          host_id: string
          id: string
          pin: string
          question_started_at: string | null
          quiz_id: string
          scheduled_at: string | null
          status: string
        }
        Insert: {
          created_at?: string
          current_q?: number
          host_id: string
          id?: string
          pin: string
          question_started_at?: string | null
          quiz_id: string
          scheduled_at?: string | null
          status?: string
        }
        Update: {
          created_at?: string
          current_q?: number
          host_id?: string
          id?: string
          pin?: string
          question_started_at?: string | null
          quiz_id?: string
          scheduled_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "live_arenas_quiz_id_fkey"
            columns: ["quiz_id"]
            isOneToOne: false
            referencedRelation: "quizzes"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_preferences: {
        Row: {
          admin_messages: boolean | null
          email_enabled: boolean | null
          in_app_enabled: boolean | null
          leaderboard_changes: boolean | null
          new_ebook: boolean | null
          quiz_available: boolean | null
          sms_enabled: boolean | null
          study_group_invites: boolean | null
          updated_at: string | null
          user_id: string
          webinar_reminders: boolean | null
          welcome_msg: boolean | null
          whatsapp_enabled: boolean | null
        }
        Insert: {
          admin_messages?: boolean | null
          email_enabled?: boolean | null
          in_app_enabled?: boolean | null
          leaderboard_changes?: boolean | null
          new_ebook?: boolean | null
          quiz_available?: boolean | null
          sms_enabled?: boolean | null
          study_group_invites?: boolean | null
          updated_at?: string | null
          user_id: string
          webinar_reminders?: boolean | null
          welcome_msg?: boolean | null
          whatsapp_enabled?: boolean | null
        }
        Update: {
          admin_messages?: boolean | null
          email_enabled?: boolean | null
          in_app_enabled?: boolean | null
          leaderboard_changes?: boolean | null
          new_ebook?: boolean | null
          quiz_available?: boolean | null
          sms_enabled?: boolean | null
          study_group_invites?: boolean | null
          updated_at?: string | null
          user_id?: string
          webinar_reminders?: boolean | null
          welcome_msg?: boolean | null
          whatsapp_enabled?: boolean | null
        }
        Relationships: []
      }
      notifications: {
        Row: {
          body: string | null
          channel: string | null
          created_at: string | null
          icon: string | null
          id: string
          is_read: boolean | null
          sender_id: string | null
          title: string
          type: string | null
          user_id: string | null
        }
        Insert: {
          body?: string | null
          channel?: string | null
          created_at?: string | null
          icon?: string | null
          id?: string
          is_read?: boolean | null
          sender_id?: string | null
          title: string
          type?: string | null
          user_id?: string | null
        }
        Update: {
          body?: string | null
          channel?: string | null
          created_at?: string | null
          icon?: string | null
          id?: string
          is_read?: boolean | null
          sender_id?: string | null
          title?: string
          type?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notifications_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      personal_targets: {
        Row: {
          created_at: string | null
          id: string
          target_type: string
          target_value: number | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          target_type: string
          target_value?: number | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          target_type?: string
          target_value?: number | null
          user_id?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          college: string | null
          college_id: number | null
          created_at: string | null
          district: string | null
          dob: string | null
          email: string | null
          fellowship_duration: string | null
          fellowship_institution: string | null
          fellowship_name: string | null
          hometown: string | null
          id: string
          is_verified: boolean | null
          joining_year: number | null
          mci_number: string | null
          name: string | null
          neet_rank: string | null
          onboarding_complete: boolean | null
          passout_year: number | null
          phone: string | null
          place_of_study: string | null
          program: string | null
          registration_certificate_url: string | null
          rejection_reason: string | null
          role: string | null
          speciality: string | null
          speciality_id: number | null
          state: string | null
          state_medical_council: string | null
          status: string | null
          super_college: string | null
          super_place: string | null
          super_spec_type: string | null
          super_speciality: string | null
          super_year: number | null
          verification_submitted_at: string | null
          verified: boolean | null
          zone: string | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          college?: string | null
          college_id?: number | null
          created_at?: string | null
          district?: string | null
          dob?: string | null
          email?: string | null
          fellowship_duration?: string | null
          fellowship_institution?: string | null
          fellowship_name?: string | null
          hometown?: string | null
          id: string
          is_verified?: boolean | null
          joining_year?: number | null
          mci_number?: string | null
          name?: string | null
          neet_rank?: string | null
          onboarding_complete?: boolean | null
          passout_year?: number | null
          phone?: string | null
          place_of_study?: string | null
          program?: string | null
          registration_certificate_url?: string | null
          rejection_reason?: string | null
          role?: string | null
          speciality?: string | null
          speciality_id?: number | null
          state?: string | null
          state_medical_council?: string | null
          status?: string | null
          super_college?: string | null
          super_place?: string | null
          super_spec_type?: string | null
          super_speciality?: string | null
          super_year?: number | null
          verification_submitted_at?: string | null
          verified?: boolean | null
          zone?: string | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          college?: string | null
          college_id?: number | null
          created_at?: string | null
          district?: string | null
          dob?: string | null
          email?: string | null
          fellowship_duration?: string | null
          fellowship_institution?: string | null
          fellowship_name?: string | null
          hometown?: string | null
          id?: string
          is_verified?: boolean | null
          joining_year?: number | null
          mci_number?: string | null
          name?: string | null
          neet_rank?: string | null
          onboarding_complete?: boolean | null
          passout_year?: number | null
          phone?: string | null
          place_of_study?: string | null
          program?: string | null
          registration_certificate_url?: string | null
          rejection_reason?: string | null
          role?: string | null
          speciality?: string | null
          speciality_id?: number | null
          state?: string | null
          state_medical_council?: string | null
          status?: string | null
          super_college?: string | null
          super_place?: string | null
          super_spec_type?: string | null
          super_speciality?: string | null
          super_year?: number | null
          verification_submitted_at?: string | null
          verified?: boolean | null
          zone?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_college_id_fkey"
            columns: ["college_id"]
            isOneToOne: false
            referencedRelation: "colleges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_speciality_id_fkey"
            columns: ["speciality_id"]
            isOneToOne: false
            referencedRelation: "specialities"
            referencedColumns: ["id"]
          },
        ]
      }
      quiz_attempts: {
        Row: {
          answers: Json
          finished_at: string | null
          id: string
          quiz_id: string
          score: number
          started_at: string
          total: number
          user_id: string
        }
        Insert: {
          answers?: Json
          finished_at?: string | null
          id?: string
          quiz_id: string
          score?: number
          started_at?: string
          total?: number
          user_id: string
        }
        Update: {
          answers?: Json
          finished_at?: string | null
          id?: string
          quiz_id?: string
          score?: number
          started_at?: string
          total?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "quiz_attempts_quiz_id_fkey"
            columns: ["quiz_id"]
            isOneToOne: false
            referencedRelation: "quizzes"
            referencedColumns: ["id"]
          },
        ]
      }
      quiz_questions: {
        Row: {
          correct_key: string
          created_at: string
          explanation: string | null
          id: string
          options: Json
          quiz_id: string
          sort_order: number
          stem: string
        }
        Insert: {
          correct_key: string
          created_at?: string
          explanation?: string | null
          id?: string
          options?: Json
          quiz_id: string
          sort_order?: number
          stem: string
        }
        Update: {
          correct_key?: string
          created_at?: string
          explanation?: string | null
          id?: string
          options?: Json
          quiz_id?: string
          sort_order?: number
          stem?: string
        }
        Relationships: [
          {
            foreignKeyName: "quiz_questions_quiz_id_fkey"
            columns: ["quiz_id"]
            isOneToOne: false
            referencedRelation: "quizzes"
            referencedColumns: ["id"]
          },
        ]
      }
      quizzes: {
        Row: {
          approved_by: string | null
          created_at: string
          created_by: string
          description: string | null
          id: string
          rejection_note: string | null
          status: string
          subject: string
          time_limit_sec: number
          title: string
          updated_at: string
        }
        Insert: {
          approved_by?: string | null
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          rejection_note?: string | null
          status?: string
          subject: string
          time_limit_sec?: number
          title: string
          updated_at?: string
        }
        Update: {
          approved_by?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          rejection_note?: string | null
          status?: string
          subject?: string
          time_limit_sec?: number
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      reading_progress: {
        Row: {
          ai_quiz_score: number | null
          artifact_id: number | null
          id: string
          is_completed: boolean | null
          last_read_at: string | null
          user_id: string | null
        }
        Insert: {
          ai_quiz_score?: number | null
          artifact_id?: number | null
          id?: string
          is_completed?: boolean | null
          last_read_at?: string | null
          user_id?: string | null
        }
        Update: {
          ai_quiz_score?: number | null
          artifact_id?: number | null
          id?: string
          is_completed?: boolean | null
          last_read_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reading_progress_artifact_id_fkey"
            columns: ["artifact_id"]
            isOneToOne: false
            referencedRelation: "artifacts"
            referencedColumns: ["id"]
          },
        ]
      }
      schema_versions: {
        Row: {
          applied_at: string | null
          name: string
          version: number
        }
        Insert: {
          applied_at?: string | null
          name: string
          version: number
        }
        Update: {
          applied_at?: string | null
          name?: string
          version?: number
        }
        Relationships: []
      }
      score_rules: {
        Row: {
          activity_type: string
          description: string | null
          points: number
          score_delta: number
        }
        Insert: {
          activity_type: string
          description?: string | null
          points?: number
          score_delta?: number
        }
        Update: {
          activity_type?: string
          description?: string | null
          points?: number
          score_delta?: number
        }
        Relationships: []
      }
      smart_notes: {
        Row: {
          ai_summary: string
          artifact_id: number | null
          created_at: string | null
          id: string
          is_starred: boolean
          original_text: string
          user_id: string | null
        }
        Insert: {
          ai_summary: string
          artifact_id?: number | null
          created_at?: string | null
          id?: string
          is_starred?: boolean
          original_text: string
          user_id?: string | null
        }
        Update: {
          ai_summary?: string
          artifact_id?: number | null
          created_at?: string | null
          id?: string
          is_starred?: boolean
          original_text?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "smart_notes_artifact_id_fkey"
            columns: ["artifact_id"]
            isOneToOne: false
            referencedRelation: "artifacts"
            referencedColumns: ["id"]
          },
        ]
      }
      spaced_repetition_cards: {
        Row: {
          back: string
          created_at: string | null
          difficulty: string | null
          easiness: number | null
          front: string
          id: string
          interval: number | null
          last_reviewed_at: string | null
          next_review_at: string
          repetitions: number | null
          source_question_id: string | null
          subject: string | null
          user_id: string
        }
        Insert: {
          back: string
          created_at?: string | null
          difficulty?: string | null
          easiness?: number | null
          front: string
          id?: string
          interval?: number | null
          last_reviewed_at?: string | null
          next_review_at?: string
          repetitions?: number | null
          source_question_id?: string | null
          subject?: string | null
          user_id: string
        }
        Update: {
          back?: string
          created_at?: string | null
          difficulty?: string | null
          easiness?: number | null
          front?: string
          id?: string
          interval?: number | null
          last_reviewed_at?: string | null
          next_review_at?: string
          repetitions?: number | null
          source_question_id?: string | null
          subject?: string | null
          user_id?: string
        }
        Relationships: []
      }
      specialities: {
        Row: {
          id: number
          name: string
        }
        Insert: {
          id?: number
          name: string
        }
        Update: {
          id?: number
          name?: string
        }
        Relationships: []
      }
      study_plan_history: {
        Row: {
          ai_generated: boolean | null
          completed_tasks: Json | null
          created_at: string | null
          generated_at: string | null
          id: number
          is_active: boolean | null
          plan: Json | null
          plan_data: Json
          tasks: Json | null
          updated_at: string | null
          user_id: string | null
          week_start: string | null
        }
        Insert: {
          ai_generated?: boolean | null
          completed_tasks?: Json | null
          created_at?: string | null
          generated_at?: string | null
          id?: number
          is_active?: boolean | null
          plan?: Json | null
          plan_data: Json
          tasks?: Json | null
          updated_at?: string | null
          user_id?: string | null
          week_start?: string | null
        }
        Update: {
          ai_generated?: boolean | null
          completed_tasks?: Json | null
          created_at?: string | null
          generated_at?: string | null
          id?: number
          is_active?: boolean | null
          plan?: Json | null
          plan_data?: Json
          tasks?: Json | null
          updated_at?: string | null
          user_id?: string | null
          week_start?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "study_plan_history_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      subject_completion: {
        Row: {
          completed: boolean | null
          completed_at: string | null
          created_at: string | null
          id: string
          progress: number | null
          subject: string
          user_id: string | null
        }
        Insert: {
          completed?: boolean | null
          completed_at?: string | null
          created_at?: string | null
          id?: string
          progress?: number | null
          subject: string
          user_id?: string | null
        }
        Update: {
          completed?: boolean | null
          completed_at?: string | null
          created_at?: string | null
          id?: string
          progress?: number | null
          subject?: string
          user_id?: string | null
        }
        Relationships: []
      }
      user_content_state: {
        Row: {
          artifact_id: number
          current_page: number
          is_bookmarked: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          artifact_id: number
          current_page?: number
          is_bookmarked?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          artifact_id?: number
          current_page?: number
          is_bookmarked?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_content_state_artifact_id_fkey"
            columns: ["artifact_id"]
            isOneToOne: false
            referencedRelation: "artifacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_content_state_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_notes: {
        Row: {
          artifact_id: string
          created_at: string | null
          highlight_text: string | null
          id: string
          note_content: string
          page_number: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          artifact_id: string
          created_at?: string | null
          highlight_text?: string | null
          id?: string
          note_content: string
          page_number?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          artifact_id?: string
          created_at?: string | null
          highlight_text?: string | null
          id?: string
          note_content?: string
          page_number?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_reminders: {
        Row: {
          channels: string[]
          dispatched: boolean
          event_time: string
          event_title: string
          id: string
          is_sent: boolean | null
          lead_minutes: number
          notify_email: boolean | null
          notify_inapp: boolean | null
          notify_sms: boolean | null
          remind_at: string | null
          remind_before_mins: number | null
          user_id: string | null
        }
        Insert: {
          channels?: string[]
          dispatched?: boolean
          event_time: string
          event_title: string
          id?: string
          is_sent?: boolean | null
          lead_minutes?: number
          notify_email?: boolean | null
          notify_inapp?: boolean | null
          notify_sms?: boolean | null
          remind_at?: string | null
          remind_before_mins?: number | null
          user_id?: string | null
        }
        Update: {
          channels?: string[]
          dispatched?: boolean
          event_time?: string
          event_title?: string
          id?: string
          is_sent?: boolean | null
          lead_minutes?: number
          notify_email?: boolean | null
          notify_inapp?: boolean | null
          notify_sms?: boolean | null
          remind_at?: string | null
          remind_before_mins?: number | null
          user_id?: string | null
        }
        Relationships: []
      }
      user_scores: {
        Row: {
          quiz_score: number | null
          reading_score: number | null
          total_score: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          quiz_score?: number | null
          reading_score?: number | null
          total_score?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          quiz_score?: number | null
          reading_score?: number | null
          total_score?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_study_persona: {
        Row: {
          created_at: string | null
          exam_date: string | null
          goals: string | null
          learning_style: string | null
          peak_hours: string | null
          preferred_subjects: string[] | null
          strong_areas: string[] | null
          strong_subjects: string[] | null
          study_hours_per_day: number | null
          updated_at: string | null
          user_id: string
          weak_areas: string[] | null
          weak_subjects: string[] | null
          weekly_goal_hours: number | null
        }
        Insert: {
          created_at?: string | null
          exam_date?: string | null
          goals?: string | null
          learning_style?: string | null
          peak_hours?: string | null
          preferred_subjects?: string[] | null
          strong_areas?: string[] | null
          strong_subjects?: string[] | null
          study_hours_per_day?: number | null
          updated_at?: string | null
          user_id: string
          weak_areas?: string[] | null
          weak_subjects?: string[] | null
          weekly_goal_hours?: number | null
        }
        Update: {
          created_at?: string | null
          exam_date?: string | null
          goals?: string | null
          learning_style?: string | null
          peak_hours?: string | null
          preferred_subjects?: string[] | null
          strong_areas?: string[] | null
          strong_subjects?: string[] | null
          study_hours_per_day?: number | null
          updated_at?: string | null
          user_id?: string
          weak_areas?: string[] | null
          weak_subjects?: string[] | null
          weekly_goal_hours?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "user_study_persona_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      video_lectures: {
        Row: {
          approved_by: string | null
          created_at: string
          created_by: string
          description: string | null
          duration_sec: number | null
          id: string
          rejection_note: string | null
          status: string
          subject: string
          thumbnail_url: string | null
          title: string
          updated_at: string
          video_url: string
        }
        Insert: {
          approved_by?: string | null
          created_at?: string
          created_by: string
          description?: string | null
          duration_sec?: number | null
          id?: string
          rejection_note?: string | null
          status?: string
          subject: string
          thumbnail_url?: string | null
          title: string
          updated_at?: string
          video_url: string
        }
        Update: {
          approved_by?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          duration_sec?: number | null
          id?: string
          rejection_note?: string | null
          status?: string
          subject?: string
          thumbnail_url?: string | null
          title?: string
          updated_at?: string
          video_url?: string
        }
        Relationships: []
      }
      webinar_registrations: {
        Row: {
          created_at: string | null
          id: string
          user_id: string | null
          webinar_date: string | null
          webinar_id: string | null
          webinar_title: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          user_id?: string | null
          webinar_date?: string | null
          webinar_id?: string | null
          webinar_title?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          user_id?: string | null
          webinar_date?: string | null
          webinar_id?: string | null
          webinar_title?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      custom_access_token_hook: { Args: { event: Json }; Returns: Json }
      get_exam_server_time: { Args: never; Returns: Json }
      server_now: { Args: never; Returns: string }
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const
A new version of Supabase CLI is available: v2.78.1 (currently installed v2.75.0)
We recommend updating regularly for new features and bug fixes: https://supabase.com/docs/guides/cli/getting-started#updating-the-supabase-cli
