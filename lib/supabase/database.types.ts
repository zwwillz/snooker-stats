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
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      snooker_breaks: {
        Row: {
          break_seq: number
          break_value: number
          created_at: string
          frame_id: string | null
          frame_no: number
          id: string
          is_century: boolean | null
          is_maximum: boolean | null
          match_id: string
          player_id: string
          source_name: string | null
          source_updated_at: string | null
          updated_at: string
        }
        Insert: {
          break_seq?: number
          break_value: number
          created_at?: string
          frame_id?: string | null
          frame_no: number
          id?: string
          is_century?: boolean | null
          is_maximum?: boolean | null
          match_id: string
          player_id: string
          source_name?: string | null
          source_updated_at?: string | null
          updated_at?: string
        }
        Update: {
          break_seq?: number
          break_value?: number
          created_at?: string
          frame_id?: string | null
          frame_no?: number
          id?: string
          is_century?: boolean | null
          is_maximum?: boolean | null
          match_id?: string
          player_id?: string
          source_name?: string | null
          source_updated_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "snooker_breaks_frame_id_fkey"
            columns: ["frame_id"]
            isOneToOne: false
            referencedRelation: "snooker_frames"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "snooker_breaks_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "snooker_matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "snooker_breaks_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "snooker_players"
            referencedColumns: ["id"]
          },
        ]
      }
      snooker_event_entries: {
        Row: {
          created_at: string
          entry_type: string
          event_id: string
          id: string
          player_id: string
          raw: Json
          source_name: string
          source_updated_at: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          entry_type?: string
          event_id: string
          id?: string
          player_id: string
          raw?: Json
          source_name?: string
          source_updated_at?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          entry_type?: string
          event_id?: string
          id?: string
          player_id?: string
          raw?: Json
          source_name?: string
          source_updated_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "snooker_event_entries_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "snooker_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "snooker_event_entries_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "snooker_players"
            referencedColumns: ["id"]
          },
        ]
      }
      snooker_event_prizes: {
        Row: {
          amount: number
          created_at: string
          currency: string
          event_id: string
          id: string
          is_total: boolean
          label_en: string | null
          label_zh: string
          prize_key: string
          sort_order: number
          source_name: string
          source_updated_at: string | null
          source_url: string | null
          updated_at: string
        }
        Insert: {
          amount: number
          created_at?: string
          currency?: string
          event_id: string
          id?: string
          is_total?: boolean
          label_en?: string | null
          label_zh: string
          prize_key: string
          sort_order?: number
          source_name?: string
          source_updated_at?: string | null
          source_url?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string
          event_id?: string
          id?: string
          is_total?: boolean
          label_en?: string | null
          label_zh?: string
          prize_key?: string
          sort_order?: number
          source_name?: string
          source_updated_at?: string | null
          source_url?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "snooker_event_prizes_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "snooker_events"
            referencedColumns: ["id"]
          },
        ]
      }
      snooker_event_series: {
        Row: {
          created_at: string
          end_date: string | null
          event_type: string | null
          id: string
          name_en: string
          name_zh: string
          season: string
          slug: string
          source_name: string | null
          source_series_id: string | null
          start_date: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          end_date?: string | null
          event_type?: string | null
          id?: string
          name_en: string
          name_zh: string
          season: string
          slug: string
          source_name?: string | null
          source_series_id?: string | null
          start_date?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          end_date?: string | null
          event_type?: string | null
          id?: string
          name_en?: string
          name_zh?: string
          season?: string
          slug?: string
          source_name?: string | null
          source_series_id?: string | null
          start_date?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      snooker_events: {
        Row: {
          city_zh: string | null
          country_zh: string | null
          created_at: string
          currency: string | null
          data_ready: boolean
          end_date: string | null
          event_stage: string
          event_type: string
          expected_match_count: number | null
          id: string
          name_en: string
          name_zh: string
          previous_champion_name_zh: string | null
          previous_champion_player_id: string | null
          previous_champion_year: number | null
          ranking_event: boolean | null
          ranking_status: string
          referee_zh: string | null
          runner_up_prize: number | null
          season: string
          series_id: string
          slug: string
          source_event_id: string | null
          source_name: string | null
          source_updated_at: string | null
          source_url: string | null
          sponsor_name: string | null
          stage_name_en: string
          stage_name_zh: string
          stage_order: number
          start_date: string | null
          status: string
          type_zh: string | null
          updated_at: string
          venue_en: string | null
          venue_zh: string | null
          winner_prize: number | null
        }
        Insert: {
          city_zh?: string | null
          country_zh?: string | null
          created_at?: string
          currency?: string | null
          data_ready?: boolean
          end_date?: string | null
          event_stage?: string
          event_type?: string
          expected_match_count?: number | null
          id?: string
          name_en: string
          name_zh: string
          previous_champion_name_zh?: string | null
          previous_champion_player_id?: string | null
          previous_champion_year?: number | null
          ranking_event?: boolean | null
          ranking_status?: string
          referee_zh?: string | null
          runner_up_prize?: number | null
          season: string
          series_id: string
          slug: string
          source_event_id?: string | null
          source_name?: string | null
          source_updated_at?: string | null
          source_url?: string | null
          sponsor_name?: string | null
          stage_name_en: string
          stage_name_zh: string
          stage_order: number
          start_date?: string | null
          status: string
          type_zh?: string | null
          updated_at?: string
          venue_en?: string | null
          venue_zh?: string | null
          winner_prize?: number | null
        }
        Update: {
          city_zh?: string | null
          country_zh?: string | null
          created_at?: string
          currency?: string | null
          data_ready?: boolean
          end_date?: string | null
          event_stage?: string
          event_type?: string
          expected_match_count?: number | null
          id?: string
          name_en?: string
          name_zh?: string
          previous_champion_name_zh?: string | null
          previous_champion_player_id?: string | null
          previous_champion_year?: number | null
          ranking_event?: boolean | null
          ranking_status?: string
          referee_zh?: string | null
          runner_up_prize?: number | null
          season?: string
          series_id?: string
          slug?: string
          source_event_id?: string | null
          source_name?: string | null
          source_updated_at?: string | null
          source_url?: string | null
          sponsor_name?: string | null
          stage_name_en?: string
          stage_name_zh?: string
          stage_order?: number
          start_date?: string | null
          status?: string
          type_zh?: string | null
          updated_at?: string
          venue_en?: string | null
          venue_zh?: string | null
          winner_prize?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "snooker_events_previous_champion_player_id_fkey"
            columns: ["previous_champion_player_id"]
            isOneToOne: false
            referencedRelation: "snooker_players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "snooker_events_series_id_fkey"
            columns: ["series_id"]
            isOneToOne: false
            referencedRelation: "snooker_event_series"
            referencedColumns: ["id"]
          },
        ]
      }
      snooker_frames: {
        Row: {
          break1: number | null
          break2: number | null
          frame_no: number
          id: string
          match_id: string
          note: string | null
          score1: number
          score2: number
          source_updated_at: string | null
          status: string
          updated_at: string
        }
        Insert: {
          break1?: number | null
          break2?: number | null
          frame_no: number
          id?: string
          match_id: string
          note?: string | null
          score1?: number
          score2?: number
          source_updated_at?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          break1?: number | null
          break2?: number | null
          frame_no?: number
          id?: string
          match_id?: string
          note?: string | null
          score1?: number
          score2?: number
          source_updated_at?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "snooker_frames_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "snooker_matches"
            referencedColumns: ["id"]
          },
        ]
      }
      snooker_manual_overrides: {
        Row: {
          created_at: string
          created_by: string | null
          entity_id: string
          entity_type: string
          field_name: string
          id: string
          is_active: boolean
          override_value: Json
          reason: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          entity_id: string
          entity_type: string
          field_name: string
          id?: string
          is_active?: boolean
          override_value: Json
          reason?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          entity_id?: string
          entity_type?: string
          field_name?: string
          id?: string
          is_active?: boolean
          override_value?: Json
          reason?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      snooker_match_head_to_head: {
        Row: {
          created_at: string
          match_id: string
          meetings_before: number
          player1_frames: number
          player1_id: string
          player1_wins: number
          player2_frames: number
          player2_id: string
          player2_wins: number
          recent_meetings: Json
          source_name: string
          source_updated_at: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          match_id: string
          meetings_before?: number
          player1_frames?: number
          player1_id: string
          player1_wins?: number
          player2_frames?: number
          player2_id: string
          player2_wins?: number
          recent_meetings?: Json
          source_name?: string
          source_updated_at?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          match_id?: string
          meetings_before?: number
          player1_frames?: number
          player1_id?: string
          player1_wins?: number
          player2_frames?: number
          player2_id?: string
          player2_wins?: number
          recent_meetings?: Json
          source_name?: string
          source_updated_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "snooker_match_head_to_head_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: true
            referencedRelation: "snooker_matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "snooker_match_head_to_head_player1_id_fkey"
            columns: ["player1_id"]
            isOneToOne: false
            referencedRelation: "snooker_players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "snooker_match_head_to_head_player2_id_fkey"
            columns: ["player2_id"]
            isOneToOne: false
            referencedRelation: "snooker_players"
            referencedColumns: ["id"]
          },
        ]
      }
      snooker_match_statistics: {
        Row: {
          average_break: number | null
          average_shot_time_seconds: number | null
          breaks_100_plus: number | null
          breaks_50_plus: number | null
          created_at: string
          highest_break: number | null
          id: string
          match_id: string
          player_id: string
          pot_rate: number | null
          raw: Json | null
          shots_taken: number | null
          side: string
          source_name: string
          source_updated_at: string | null
          time_on_table_pct: number | null
          total_points: number | null
          updated_at: string
        }
        Insert: {
          average_break?: number | null
          average_shot_time_seconds?: number | null
          breaks_100_plus?: number | null
          breaks_50_plus?: number | null
          created_at?: string
          highest_break?: number | null
          id?: string
          match_id: string
          player_id: string
          pot_rate?: number | null
          raw?: Json | null
          shots_taken?: number | null
          side: string
          source_name?: string
          source_updated_at?: string | null
          time_on_table_pct?: number | null
          total_points?: number | null
          updated_at?: string
        }
        Update: {
          average_break?: number | null
          average_shot_time_seconds?: number | null
          breaks_100_plus?: number | null
          breaks_50_plus?: number | null
          created_at?: string
          highest_break?: number | null
          id?: string
          match_id?: string
          player_id?: string
          pot_rate?: number | null
          raw?: Json | null
          shots_taken?: number | null
          side?: string
          source_name?: string
          source_updated_at?: string | null
          time_on_table_pct?: number | null
          total_points?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "snooker_match_statistics_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "snooker_matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "snooker_match_statistics_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "snooker_players"
            referencedColumns: ["id"]
          },
        ]
      }
      snooker_matches: {
        Row: {
          best_of: number | null
          completed_detected_at: string | null
          created_at: string
          current_break: number | null
          event_id: string
          frames_complete: boolean
          id: string
          live_frame_no: number | null
          match_no: number | null
          note: string | null
          player1_id: string | null
          player2_id: string | null
          realtime_finalized_at: string | null
          round_id: string | null
          scheduled_at: string | null
          score1: number | null
          score2: number | null
          session_label_zh: string | null
          source_match_id: string | null
          source_status: string | null
          source_status_meta: string | null
          source_updated_at: string | null
          status: string
          updated_at: string
          winner_id: string | null
        }
        Insert: {
          best_of?: number | null
          completed_detected_at?: string | null
          created_at?: string
          current_break?: number | null
          event_id: string
          frames_complete?: boolean
          id?: string
          live_frame_no?: number | null
          match_no?: number | null
          note?: string | null
          player1_id?: string | null
          player2_id?: string | null
          realtime_finalized_at?: string | null
          round_id?: string | null
          scheduled_at?: string | null
          score1?: number | null
          score2?: number | null
          session_label_zh?: string | null
          source_match_id?: string | null
          source_status?: string | null
          source_status_meta?: string | null
          source_updated_at?: string | null
          status: string
          updated_at?: string
          winner_id?: string | null
        }
        Update: {
          best_of?: number | null
          completed_detected_at?: string | null
          created_at?: string
          current_break?: number | null
          event_id?: string
          frames_complete?: boolean
          id?: string
          live_frame_no?: number | null
          match_no?: number | null
          note?: string | null
          player1_id?: string | null
          player2_id?: string | null
          realtime_finalized_at?: string | null
          round_id?: string | null
          scheduled_at?: string | null
          score1?: number | null
          score2?: number | null
          session_label_zh?: string | null
          source_match_id?: string | null
          source_status?: string | null
          source_status_meta?: string | null
          source_updated_at?: string | null
          status?: string
          updated_at?: string
          winner_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "snooker_matches_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "snooker_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "snooker_matches_player1_id_fkey"
            columns: ["player1_id"]
            isOneToOne: false
            referencedRelation: "snooker_players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "snooker_matches_player2_id_fkey"
            columns: ["player2_id"]
            isOneToOne: false
            referencedRelation: "snooker_players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "snooker_matches_round_id_fkey"
            columns: ["round_id"]
            isOneToOne: false
            referencedRelation: "snooker_rounds"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "snooker_matches_winner_id_fkey"
            columns: ["winner_id"]
            isOneToOne: false
            referencedRelation: "snooker_players"
            referencedColumns: ["id"]
          },
        ]
      }
      snooker_ops_action_logs: {
        Row: {
          action: string
          admin_id: string | null
          error_message: string | null
          finished_at: string | null
          id: number
          payload: Json
          result: Json | null
          started_at: string
          status: string
        }
        Insert: {
          action: string
          admin_id?: string | null
          error_message?: string | null
          finished_at?: string | null
          id?: number
          payload?: Json
          result?: Json | null
          started_at?: string
          status: string
        }
        Update: {
          action?: string
          admin_id?: string | null
          error_message?: string | null
          finished_at?: string | null
          id?: number
          payload?: Json
          result?: Json | null
          started_at?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "snooker_ops_action_logs_admin_id_fkey"
            columns: ["admin_id"]
            isOneToOne: false
            referencedRelation: "snooker_ops_admins"
            referencedColumns: ["id"]
          },
        ]
      }
      snooker_ops_admins: {
        Row: {
          created_at: string
          display_name: string
          id: string
          last_login_at: string | null
          must_change_password: boolean
          password_changed_at: string | null
          password_hash: string
          status: string
          updated_at: string
          username: string
        }
        Insert: {
          created_at?: string
          display_name?: string
          id?: string
          last_login_at?: string | null
          must_change_password?: boolean
          password_changed_at?: string | null
          password_hash: string
          status?: string
          updated_at?: string
          username: string
        }
        Update: {
          created_at?: string
          display_name?: string
          id?: string
          last_login_at?: string | null
          must_change_password?: boolean
          password_changed_at?: string | null
          password_hash?: string
          status?: string
          updated_at?: string
          username?: string
        }
        Relationships: []
      }
      snooker_ops_login_attempts: {
        Row: {
          attempted_at: string
          id: number
          ip_address: string | null
          success: boolean
          user_agent: string | null
          username_key: string
        }
        Insert: {
          attempted_at?: string
          id?: number
          ip_address?: string | null
          success: boolean
          user_agent?: string | null
          username_key: string
        }
        Update: {
          attempted_at?: string
          id?: number
          ip_address?: string | null
          success?: boolean
          user_agent?: string | null
          username_key?: string
        }
        Relationships: []
      }
      snooker_ops_sessions: {
        Row: {
          admin_id: string
          created_at: string
          expires_at: string
          id: string
          ip_address: string | null
          last_seen_at: string
          token_hash: string
          user_agent: string | null
        }
        Insert: {
          admin_id: string
          created_at?: string
          expires_at: string
          id?: string
          ip_address?: string | null
          last_seen_at?: string
          token_hash: string
          user_agent?: string | null
        }
        Update: {
          admin_id?: string
          created_at?: string
          expires_at?: string
          id?: string
          ip_address?: string | null
          last_seen_at?: string
          token_hash?: string
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "snooker_ops_sessions_admin_id_fkey"
            columns: ["admin_id"]
            isOneToOne: false
            referencedRelation: "snooker_ops_admins"
            referencedColumns: ["id"]
          },
        ]
      }
      snooker_player_career_aggregates: {
        Row: {
          aggregation_version: string
          breaks_100_plus: number
          breaks_50_plus: number
          calculated_at: string
          data_through: string | null
          event_entities_played: number
          finals: number
          first_season: string | null
          frame_data_coverage_pct: number | null
          frame_data_matches: number
          frame_win_rate: number | null
          frames_lost: number
          frames_won: number
          highest_break: number | null
          is_career_complete: boolean
          last_season: string | null
          masters_titles: number
          match_entries: number
          match_win_rate: number | null
          matches_drawn: number
          matches_lost: number
          matches_played: number
          matches_won: number
          maximums: number
          player_id: string
          ranking_finals: number
          ranking_titles: number
          seasons_played: number
          titles_total: number
          triple_crown_titles: number
          uk_championship_titles: number
          walkovers_lost: number
          walkovers_won: number
          warehouse_end_season: string | null
          warehouse_start_season: string | null
          world_championship_titles: number
        }
        Insert: {
          aggregation_version: string
          breaks_100_plus?: number
          breaks_50_plus?: number
          calculated_at?: string
          data_through?: string | null
          event_entities_played?: number
          finals?: number
          first_season?: string | null
          frame_data_coverage_pct?: number | null
          frame_data_matches?: number
          frame_win_rate?: number | null
          frames_lost?: number
          frames_won?: number
          highest_break?: number | null
          is_career_complete?: boolean
          last_season?: string | null
          masters_titles?: number
          match_entries?: number
          match_win_rate?: number | null
          matches_drawn?: number
          matches_lost?: number
          matches_played?: number
          matches_won?: number
          maximums?: number
          player_id: string
          ranking_finals?: number
          ranking_titles?: number
          seasons_played?: number
          titles_total?: number
          triple_crown_titles?: number
          uk_championship_titles?: number
          walkovers_lost?: number
          walkovers_won?: number
          warehouse_end_season?: string | null
          warehouse_start_season?: string | null
          world_championship_titles?: number
        }
        Update: {
          aggregation_version?: string
          breaks_100_plus?: number
          breaks_50_plus?: number
          calculated_at?: string
          data_through?: string | null
          event_entities_played?: number
          finals?: number
          first_season?: string | null
          frame_data_coverage_pct?: number | null
          frame_data_matches?: number
          frame_win_rate?: number | null
          frames_lost?: number
          frames_won?: number
          highest_break?: number | null
          is_career_complete?: boolean
          last_season?: string | null
          masters_titles?: number
          match_entries?: number
          match_win_rate?: number | null
          matches_drawn?: number
          matches_lost?: number
          matches_played?: number
          matches_won?: number
          maximums?: number
          player_id?: string
          ranking_finals?: number
          ranking_titles?: number
          seasons_played?: number
          titles_total?: number
          triple_crown_titles?: number
          uk_championship_titles?: number
          walkovers_lost?: number
          walkovers_won?: number
          warehouse_end_season?: string | null
          warehouse_start_season?: string | null
          world_championship_titles?: number
        }
        Relationships: [
          {
            foreignKeyName: "snooker_player_career_aggregates_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: true
            referencedRelation: "snooker_players"
            referencedColumns: ["id"]
          },
        ]
      }
      snooker_player_career_highlights: {
        Row: {
          created_at: string
          description_en: string
          description_zh: string | null
          highlight_year: number | null
          id: string
          player_id: string
          sequence_no: number
          source_name: string
          source_updated_at: string | null
          translation_updated_at: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          description_en: string
          description_zh?: string | null
          highlight_year?: number | null
          id?: string
          player_id: string
          sequence_no: number
          source_name?: string
          source_updated_at?: string | null
          translation_updated_at?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          description_en?: string
          description_zh?: string | null
          highlight_year?: number | null
          id?: string
          player_id?: string
          sequence_no?: number
          source_name?: string
          source_updated_at?: string | null
          translation_updated_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "snooker_player_career_highlights_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "snooker_players"
            referencedColumns: ["id"]
          },
        ]
      }
      snooker_player_career_stats: {
        Row: {
          career_147s: number | null
          career_triple_crown: boolean | null
          created_at: string
          hide_stats: boolean
          highest_ranking: number | null
          last_tournament_win: string | null
          last_tournament_win_zh: string | null
          masters_titles: number | null
          player_id: string
          profile_current_ranking: number | null
          ranking_finals: number | null
          ranking_titles: number | null
          raw: Json
          source_name: string
          source_updated_at: string | null
          translation_updated_at: string | null
          triple_crown_titles: number | null
          uk_championship_titles: number | null
          updated_at: string
          world_championship_titles: number | null
        }
        Insert: {
          career_147s?: number | null
          career_triple_crown?: boolean | null
          created_at?: string
          hide_stats?: boolean
          highest_ranking?: number | null
          last_tournament_win?: string | null
          last_tournament_win_zh?: string | null
          masters_titles?: number | null
          player_id: string
          profile_current_ranking?: number | null
          ranking_finals?: number | null
          ranking_titles?: number | null
          raw?: Json
          source_name?: string
          source_updated_at?: string | null
          translation_updated_at?: string | null
          triple_crown_titles?: number | null
          uk_championship_titles?: number | null
          updated_at?: string
          world_championship_titles?: number | null
        }
        Update: {
          career_147s?: number | null
          career_triple_crown?: boolean | null
          created_at?: string
          hide_stats?: boolean
          highest_ranking?: number | null
          last_tournament_win?: string | null
          last_tournament_win_zh?: string | null
          masters_titles?: number | null
          player_id?: string
          profile_current_ranking?: number | null
          ranking_finals?: number | null
          ranking_titles?: number | null
          raw?: Json
          source_name?: string
          source_updated_at?: string | null
          translation_updated_at?: string | null
          triple_crown_titles?: number | null
          uk_championship_titles?: number | null
          updated_at?: string
          world_championship_titles?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "snooker_player_career_stats_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: true
            referencedRelation: "snooker_players"
            referencedColumns: ["id"]
          },
        ]
      }
      snooker_player_event_aggregates: {
        Row: {
          aggregation_version: string
          breaks_100_plus: number
          breaks_50_plus: number
          calculated_at: string
          data_through: string | null
          event_family: string
          event_id: string
          event_is_ranking: boolean
          frame_data_coverage_pct: number | null
          frame_data_matches: number
          frame_win_rate: number | null
          frames_lost: number
          frames_won: number
          highest_break: number | null
          is_champion: boolean
          is_runner_up: boolean
          is_triple_crown_event: boolean
          last_recorded_round_en: string | null
          last_recorded_round_zh: string | null
          match_entries: number
          matches_drawn: number
          matches_lost: number
          matches_played: number
          matches_won: number
          maximums: number
          player_id: string
          season: string
          walkovers_lost: number
          walkovers_won: number
        }
        Insert: {
          aggregation_version: string
          breaks_100_plus?: number
          breaks_50_plus?: number
          calculated_at?: string
          data_through?: string | null
          event_family?: string
          event_id: string
          event_is_ranking?: boolean
          frame_data_coverage_pct?: number | null
          frame_data_matches?: number
          frame_win_rate?: number | null
          frames_lost?: number
          frames_won?: number
          highest_break?: number | null
          is_champion?: boolean
          is_runner_up?: boolean
          is_triple_crown_event?: boolean
          last_recorded_round_en?: string | null
          last_recorded_round_zh?: string | null
          match_entries?: number
          matches_drawn?: number
          matches_lost?: number
          matches_played?: number
          matches_won?: number
          maximums?: number
          player_id: string
          season: string
          walkovers_lost?: number
          walkovers_won?: number
        }
        Update: {
          aggregation_version?: string
          breaks_100_plus?: number
          breaks_50_plus?: number
          calculated_at?: string
          data_through?: string | null
          event_family?: string
          event_id?: string
          event_is_ranking?: boolean
          frame_data_coverage_pct?: number | null
          frame_data_matches?: number
          frame_win_rate?: number | null
          frames_lost?: number
          frames_won?: number
          highest_break?: number | null
          is_champion?: boolean
          is_runner_up?: boolean
          is_triple_crown_event?: boolean
          last_recorded_round_en?: string | null
          last_recorded_round_zh?: string | null
          match_entries?: number
          matches_drawn?: number
          matches_lost?: number
          matches_played?: number
          matches_won?: number
          maximums?: number
          player_id?: string
          season?: string
          walkovers_lost?: number
          walkovers_won?: number
        }
        Relationships: [
          {
            foreignKeyName: "snooker_player_event_aggregates_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "snooker_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "snooker_player_event_aggregates_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "snooker_players"
            referencedColumns: ["id"]
          },
        ]
      }
      snooker_player_h2h_aggregates: {
        Row: {
          aggregation_version: string
          calculated_at: string
          draws: number
          first_meeting_date: string | null
          last_meeting_date: string | null
          match_records: number
          meetings_played: number
          player_high_frames: number
          player_high_id: string
          player_high_walkovers: number
          player_high_wins: number
          player_low_frames: number
          player_low_id: string
          player_low_walkovers: number
          player_low_wins: number
        }
        Insert: {
          aggregation_version: string
          calculated_at?: string
          draws?: number
          first_meeting_date?: string | null
          last_meeting_date?: string | null
          match_records?: number
          meetings_played?: number
          player_high_frames?: number
          player_high_id: string
          player_high_walkovers?: number
          player_high_wins?: number
          player_low_frames?: number
          player_low_id: string
          player_low_walkovers?: number
          player_low_wins?: number
        }
        Update: {
          aggregation_version?: string
          calculated_at?: string
          draws?: number
          first_meeting_date?: string | null
          last_meeting_date?: string | null
          match_records?: number
          meetings_played?: number
          player_high_frames?: number
          player_high_id?: string
          player_high_walkovers?: number
          player_high_wins?: number
          player_low_frames?: number
          player_low_id?: string
          player_low_walkovers?: number
          player_low_wins?: number
        }
        Relationships: [
          {
            foreignKeyName: "snooker_player_h2h_aggregates_player_high_id_fkey"
            columns: ["player_high_id"]
            isOneToOne: false
            referencedRelation: "snooker_players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "snooker_player_h2h_aggregates_player_low_id_fkey"
            columns: ["player_low_id"]
            isOneToOne: false
            referencedRelation: "snooker_players"
            referencedColumns: ["id"]
          },
        ]
      }
      snooker_player_names: {
        Row: {
          aliases: string[]
          created_at: string
          display_name: string
          id: string
          locale: string
          player_id: string
          reviewed_at: string | null
          short_name: string | null
          source_name: string | null
          status: string
          updated_at: string
        }
        Insert: {
          aliases?: string[]
          created_at?: string
          display_name: string
          id?: string
          locale: string
          player_id: string
          reviewed_at?: string | null
          short_name?: string | null
          source_name?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          aliases?: string[]
          created_at?: string
          display_name?: string
          id?: string
          locale?: string
          player_id?: string
          reviewed_at?: string | null
          short_name?: string | null
          source_name?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "snooker_player_names_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "snooker_players"
            referencedColumns: ["id"]
          },
        ]
      }
      snooker_player_profile_details: {
        Row: {
          biography_html_en: string | null
          biography_html_zh: string | null
          created_at: string
          nickname_en: string | null
          nickname_zh: string | null
          player_id: string
          quote_en: string | null
          quote_source_en: string | null
          quote_source_zh: string | null
          quote_zh: string | null
          raw: Json
          source_name: string
          source_updated_at: string | null
          sponsors: Json
          translation_updated_at: string | null
          updated_at: string
        }
        Insert: {
          biography_html_en?: string | null
          biography_html_zh?: string | null
          created_at?: string
          nickname_en?: string | null
          nickname_zh?: string | null
          player_id: string
          quote_en?: string | null
          quote_source_en?: string | null
          quote_source_zh?: string | null
          quote_zh?: string | null
          raw?: Json
          source_name?: string
          source_updated_at?: string | null
          sponsors?: Json
          translation_updated_at?: string | null
          updated_at?: string
        }
        Update: {
          biography_html_en?: string | null
          biography_html_zh?: string | null
          created_at?: string
          nickname_en?: string | null
          nickname_zh?: string | null
          player_id?: string
          quote_en?: string | null
          quote_source_en?: string | null
          quote_source_zh?: string | null
          quote_zh?: string | null
          raw?: Json
          source_name?: string
          source_updated_at?: string | null
          sponsors?: Json
          translation_updated_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "snooker_player_profile_details_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: true
            referencedRelation: "snooker_players"
            referencedColumns: ["id"]
          },
        ]
      }
      snooker_player_season_aggregates: {
        Row: {
          aggregation_version: string
          breaks_100_plus: number
          breaks_50_plus: number
          calculated_at: string
          data_through: string | null
          event_entities_played: number
          finals: number
          frame_data_coverage_pct: number | null
          frame_data_matches: number
          frame_win_rate: number | null
          frames_lost: number
          frames_won: number
          highest_break: number | null
          is_final: boolean
          masters_titles: number
          match_entries: number
          match_win_rate: number | null
          matches_drawn: number
          matches_lost: number
          matches_played: number
          matches_won: number
          maximums: number
          player_id: string
          ranking_finals: number
          ranking_titles: number
          season: string
          season_start_year: number
          titles_total: number
          triple_crown_titles: number
          uk_championship_titles: number
          walkovers_lost: number
          walkovers_won: number
          world_championship_titles: number
        }
        Insert: {
          aggregation_version: string
          breaks_100_plus?: number
          breaks_50_plus?: number
          calculated_at?: string
          data_through?: string | null
          event_entities_played?: number
          finals?: number
          frame_data_coverage_pct?: number | null
          frame_data_matches?: number
          frame_win_rate?: number | null
          frames_lost?: number
          frames_won?: number
          highest_break?: number | null
          is_final?: boolean
          masters_titles?: number
          match_entries?: number
          match_win_rate?: number | null
          matches_drawn?: number
          matches_lost?: number
          matches_played?: number
          matches_won?: number
          maximums?: number
          player_id: string
          ranking_finals?: number
          ranking_titles?: number
          season: string
          season_start_year: number
          titles_total?: number
          triple_crown_titles?: number
          uk_championship_titles?: number
          walkovers_lost?: number
          walkovers_won?: number
          world_championship_titles?: number
        }
        Update: {
          aggregation_version?: string
          breaks_100_plus?: number
          breaks_50_plus?: number
          calculated_at?: string
          data_through?: string | null
          event_entities_played?: number
          finals?: number
          frame_data_coverage_pct?: number | null
          frame_data_matches?: number
          frame_win_rate?: number | null
          frames_lost?: number
          frames_won?: number
          highest_break?: number | null
          is_final?: boolean
          masters_titles?: number
          match_entries?: number
          match_win_rate?: number | null
          matches_drawn?: number
          matches_lost?: number
          matches_played?: number
          matches_won?: number
          maximums?: number
          player_id?: string
          ranking_finals?: number
          ranking_titles?: number
          season?: string
          season_start_year?: number
          titles_total?: number
          triple_crown_titles?: number
          uk_championship_titles?: number
          walkovers_lost?: number
          walkovers_won?: number
          world_championship_titles?: number
        }
        Relationships: [
          {
            foreignKeyName: "snooker_player_season_aggregates_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "snooker_players"
            referencedColumns: ["id"]
          },
        ]
      }
      snooker_player_season_stats: {
        Row: {
          average_break: number | null
          average_shot_time: number | null
          breaks_100_plus: number | null
          breaks_50_plus: number | null
          created_at: string
          highest_break: number | null
          id: string
          is_final: boolean
          match_win_rate: number | null
          matches_played: number | null
          matches_won: number | null
          player_id: string
          points_scored: number | null
          ranking: number | null
          raw: Json
          season_147s: number | null
          season_label: string
          season_start_year: number
          source_name: string
          source_updated_at: string | null
          tournaments_won: number | null
          updated_at: string
        }
        Insert: {
          average_break?: number | null
          average_shot_time?: number | null
          breaks_100_plus?: number | null
          breaks_50_plus?: number | null
          created_at?: string
          highest_break?: number | null
          id?: string
          is_final?: boolean
          match_win_rate?: number | null
          matches_played?: number | null
          matches_won?: number | null
          player_id: string
          points_scored?: number | null
          ranking?: number | null
          raw?: Json
          season_147s?: number | null
          season_label: string
          season_start_year: number
          source_name?: string
          source_updated_at?: string | null
          tournaments_won?: number | null
          updated_at?: string
        }
        Update: {
          average_break?: number | null
          average_shot_time?: number | null
          breaks_100_plus?: number | null
          breaks_50_plus?: number | null
          created_at?: string
          highest_break?: number | null
          id?: string
          is_final?: boolean
          match_win_rate?: number | null
          matches_played?: number | null
          matches_won?: number | null
          player_id?: string
          points_scored?: number | null
          ranking?: number | null
          raw?: Json
          season_147s?: number | null
          season_label?: string
          season_start_year?: number
          source_name?: string
          source_updated_at?: string | null
          tournaments_won?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "snooker_player_season_stats_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "snooker_players"
            referencedColumns: ["id"]
          },
        ]
      }
      snooker_player_titles: {
        Row: {
          aggregation_version: string
          calculated_at: string
          event_family: string
          event_id: string
          event_type: string | null
          is_masters: boolean
          is_ranking_title: boolean
          is_triple_crown_title: boolean
          is_uk_championship: boolean
          is_world_championship: boolean
          player_id: string
          season: string
          title_date: string | null
        }
        Insert: {
          aggregation_version: string
          calculated_at?: string
          event_family?: string
          event_id: string
          event_type?: string | null
          is_masters?: boolean
          is_ranking_title?: boolean
          is_triple_crown_title?: boolean
          is_uk_championship?: boolean
          is_world_championship?: boolean
          player_id: string
          season: string
          title_date?: string | null
        }
        Update: {
          aggregation_version?: string
          calculated_at?: string
          event_family?: string
          event_id?: string
          event_type?: string | null
          is_masters?: boolean
          is_ranking_title?: boolean
          is_triple_crown_title?: boolean
          is_uk_championship?: boolean
          is_world_championship?: boolean
          player_id?: string
          season?: string
          title_date?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "snooker_player_titles_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "snooker_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "snooker_player_titles_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "snooker_players"
            referencedColumns: ["id"]
          },
        ]
      }
      snooker_players: {
        Row: {
          avatar_credit: string | null
          avatar_license: string | null
          avatar_source: string | null
          avatar_url: string | null
          country_code: string | null
          created_at: string
          current_rank: number | null
          date_of_birth: string | null
          id: string
          is_current_tour: boolean
          name_en: string
          name_zh: string
          nationality_zh: string | null
          player_status: string
          profile_source: string | null
          ranking_points: number | null
          short_name_en: string | null
          short_name_zh: string | null
          slug: string
          tour_season: string | null
          tour_status: string
          turned_pro: number | null
          updated_at: string
          wst_published: boolean | null
        }
        Insert: {
          avatar_credit?: string | null
          avatar_license?: string | null
          avatar_source?: string | null
          avatar_url?: string | null
          country_code?: string | null
          created_at?: string
          current_rank?: number | null
          date_of_birth?: string | null
          id?: string
          is_current_tour?: boolean
          name_en: string
          name_zh: string
          nationality_zh?: string | null
          player_status?: string
          profile_source?: string | null
          ranking_points?: number | null
          short_name_en?: string | null
          short_name_zh?: string | null
          slug: string
          tour_season?: string | null
          tour_status?: string
          turned_pro?: number | null
          updated_at?: string
          wst_published?: boolean | null
        }
        Update: {
          avatar_credit?: string | null
          avatar_license?: string | null
          avatar_source?: string | null
          avatar_url?: string | null
          country_code?: string | null
          created_at?: string
          current_rank?: number | null
          date_of_birth?: string | null
          id?: string
          is_current_tour?: boolean
          name_en?: string
          name_zh?: string
          nationality_zh?: string | null
          player_status?: string
          profile_source?: string | null
          ranking_points?: number | null
          short_name_en?: string | null
          short_name_zh?: string | null
          slug?: string
          tour_season?: string | null
          tour_status?: string
          turned_pro?: number | null
          updated_at?: string
          wst_published?: boolean | null
        }
        Relationships: []
      }
      snooker_ranking_lists: {
        Row: {
          created_at: string
          cutoff_date: string | null
          description_zh: string | null
          id: string
          is_current: boolean
          is_live: boolean
          latest_captured_at: string | null
          list_key: string
          meta: Json
          qualification_limit: number | null
          ranking_group: string
          ranking_type: string
          season: string
          source_external_id: string | null
          source_name: string
          source_url: string | null
          sync_status: string
          title_en: string
          title_zh: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          cutoff_date?: string | null
          description_zh?: string | null
          id?: string
          is_current?: boolean
          is_live?: boolean
          latest_captured_at?: string | null
          list_key: string
          meta?: Json
          qualification_limit?: number | null
          ranking_group: string
          ranking_type: string
          season: string
          source_external_id?: string | null
          source_name: string
          source_url?: string | null
          sync_status?: string
          title_en: string
          title_zh: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          cutoff_date?: string | null
          description_zh?: string | null
          id?: string
          is_current?: boolean
          is_live?: boolean
          latest_captured_at?: string | null
          list_key?: string
          meta?: Json
          qualification_limit?: number | null
          ranking_group?: string
          ranking_type?: string
          season?: string
          source_external_id?: string | null
          source_name?: string
          source_url?: string | null
          sync_status?: string
          title_en?: string
          title_zh?: string
          updated_at?: string
        }
        Relationships: []
      }
      snooker_ranking_snapshots: {
        Row: {
          captured_at: string
          cutoff_date: string | null
          id: string
          meta: Json
          player_id: string
          points: number
          previous_rank: number | null
          rank: number
          rank_change: number | null
          ranking_list_id: string
          ranking_money: number
          ranking_type: string
          season: string
          source_name: string | null
          source_player_name: string | null
          source_url: string | null
        }
        Insert: {
          captured_at: string
          cutoff_date?: string | null
          id?: string
          meta?: Json
          player_id: string
          points: number
          previous_rank?: number | null
          rank: number
          rank_change?: number | null
          ranking_list_id: string
          ranking_money: number
          ranking_type: string
          season: string
          source_name?: string | null
          source_player_name?: string | null
          source_url?: string | null
        }
        Update: {
          captured_at?: string
          cutoff_date?: string | null
          id?: string
          meta?: Json
          player_id?: string
          points?: number
          previous_rank?: number | null
          rank?: number
          rank_change?: number | null
          ranking_list_id?: string
          ranking_money?: number
          ranking_type?: string
          season?: string
          source_name?: string | null
          source_player_name?: string | null
          source_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "snooker_ranking_snapshots_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "snooker_players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "snooker_ranking_snapshots_ranking_list_id_fkey"
            columns: ["ranking_list_id"]
            isOneToOne: false
            referencedRelation: "snooker_ranking_lists"
            referencedColumns: ["id"]
          },
        ]
      }
      snooker_ranking_sync_conflicts: {
        Row: {
          captured_at: string
          conflict_type: string
          created_at: string
          details: Json
          id: string
          ranking_list_id: string | null
          ranking_type: string
          resolved_at: string | null
          resolved_player_id: string | null
          source_money: number | null
          source_name: string
          source_player_name: string | null
          source_rank: number | null
        }
        Insert: {
          captured_at?: string
          conflict_type: string
          created_at?: string
          details?: Json
          id?: string
          ranking_list_id?: string | null
          ranking_type: string
          resolved_at?: string | null
          resolved_player_id?: string | null
          source_money?: number | null
          source_name: string
          source_player_name?: string | null
          source_rank?: number | null
        }
        Update: {
          captured_at?: string
          conflict_type?: string
          created_at?: string
          details?: Json
          id?: string
          ranking_list_id?: string | null
          ranking_type?: string
          resolved_at?: string | null
          resolved_player_id?: string | null
          source_money?: number | null
          source_name?: string
          source_player_name?: string | null
          source_rank?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "snooker_ranking_sync_conflicts_ranking_list_id_fkey"
            columns: ["ranking_list_id"]
            isOneToOne: false
            referencedRelation: "snooker_ranking_lists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "snooker_ranking_sync_conflicts_resolved_player_id_fkey"
            columns: ["resolved_player_id"]
            isOneToOne: false
            referencedRelation: "snooker_players"
            referencedColumns: ["id"]
          },
        ]
      }
      snooker_rounds: {
        Row: {
          best_of: number | null
          event_id: string
          id: string
          label_en: string | null
          label_zh: string
          loser_prize: number | null
          round_key: string
          sort_order: number
        }
        Insert: {
          best_of?: number | null
          event_id: string
          id?: string
          label_en?: string | null
          label_zh: string
          loser_prize?: number | null
          round_key: string
          sort_order: number
        }
        Update: {
          best_of?: number | null
          event_id?: string
          id?: string
          label_en?: string | null
          label_zh?: string
          loser_prize?: number | null
          round_key?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "snooker_rounds_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "snooker_events"
            referencedColumns: ["id"]
          },
        ]
      }
      snooker_source_entity_map: {
        Row: {
          confidence: number | null
          created_at: string
          entity_id: string
          entity_type: string
          id: string
          mapping_status: string
          source_id: string
          source_name: string
          source_url: string | null
          updated_at: string
        }
        Insert: {
          confidence?: number | null
          created_at?: string
          entity_id: string
          entity_type: string
          id?: string
          mapping_status?: string
          source_id: string
          source_name: string
          source_url?: string | null
          updated_at?: string
        }
        Update: {
          confidence?: number | null
          created_at?: string
          entity_id?: string
          entity_type?: string
          id?: string
          mapping_status?: string
          source_id?: string
          source_name?: string
          source_url?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      snooker_sync_manual_queue: {
        Row: {
          error_message: string | null
          finished_at: string | null
          id: number
          job_key: string
          raw_error: string | null
          requested_at: string
          requested_by: string | null
          result: Json
          started_at: string | null
          status: string
        }
        Insert: {
          error_message?: string | null
          finished_at?: string | null
          id?: never
          job_key: string
          raw_error?: string | null
          requested_at?: string
          requested_by?: string | null
          result?: Json
          started_at?: string | null
          status?: string
        }
        Update: {
          error_message?: string | null
          finished_at?: string | null
          id?: never
          job_key?: string
          raw_error?: string | null
          requested_at?: string
          requested_by?: string | null
          result?: Json
          started_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "snooker_sync_manual_queue_job_key_fkey"
            columns: ["job_key"]
            isOneToOne: false
            referencedRelation: "snooker_sync_policies"
            referencedColumns: ["job_key"]
          },
          {
            foreignKeyName: "snooker_sync_manual_queue_requested_by_fkey"
            columns: ["requested_by"]
            isOneToOne: false
            referencedRelation: "snooker_ops_admins"
            referencedColumns: ["id"]
          },
        ]
      }
      snooker_sync_policies: {
        Row: {
          allowed_intervals: Json
          configurable: boolean
          description_zh: string | null
          display_name_zh: string | null
          enabled: boolean
          group_key: string
          interval_seconds: number
          job_key: string
          notes: string | null
          prestart_interval_seconds: number | null
          prestart_window_minutes: number | null
          schedule_mode: string
          skip_finalized_matches: boolean
          sort_order: number
          source_name: string | null
          updated_at: string
          write_only_on_change: boolean
        }
        Insert: {
          allowed_intervals?: Json
          configurable?: boolean
          description_zh?: string | null
          display_name_zh?: string | null
          enabled?: boolean
          group_key?: string
          interval_seconds: number
          job_key: string
          notes?: string | null
          prestart_interval_seconds?: number | null
          prestart_window_minutes?: number | null
          schedule_mode?: string
          skip_finalized_matches?: boolean
          sort_order?: number
          source_name?: string | null
          updated_at?: string
          write_only_on_change?: boolean
        }
        Update: {
          allowed_intervals?: Json
          configurable?: boolean
          description_zh?: string | null
          display_name_zh?: string | null
          enabled?: boolean
          group_key?: string
          interval_seconds?: number
          job_key?: string
          notes?: string | null
          prestart_interval_seconds?: number | null
          prestart_window_minutes?: number | null
          schedule_mode?: string
          skip_finalized_matches?: boolean
          sort_order?: number
          source_name?: string | null
          updated_at?: string
          write_only_on_change?: boolean
        }
        Relationships: []
      }
      snooker_sync_runs: {
        Row: {
          changed_count: number | null
          error_message: string | null
          event_id: string | null
          fetched_count: number | null
          finished_at: string | null
          id: string
          job_type: string
          meta: Json
          source_name: string
          started_at: string
          status: string
        }
        Insert: {
          changed_count?: number | null
          error_message?: string | null
          event_id?: string | null
          fetched_count?: number | null
          finished_at?: string | null
          id?: string
          job_type: string
          meta?: Json
          source_name: string
          started_at?: string
          status: string
        }
        Update: {
          changed_count?: number | null
          error_message?: string | null
          event_id?: string | null
          fetched_count?: number | null
          finished_at?: string | null
          id?: string
          job_type?: string
          meta?: Json
          source_name?: string
          started_at?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "snooker_sync_runs_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "snooker_events"
            referencedColumns: ["id"]
          },
        ]
      }
      snooker_sync_task_state: {
        Row: {
          consecutive_failures: number
          job_key: string
          last_change_at: string | null
          last_changed_count: number | null
          last_duration_ms: number | null
          last_error: string | null
          last_fetched_count: number | null
          last_finished_at: string | null
          last_message: string | null
          last_result: Json
          last_started_at: string | null
          last_status: string | null
          last_success_at: string | null
          next_run_at: string | null
          updated_at: string
        }
        Insert: {
          consecutive_failures?: number
          job_key: string
          last_change_at?: string | null
          last_changed_count?: number | null
          last_duration_ms?: number | null
          last_error?: string | null
          last_fetched_count?: number | null
          last_finished_at?: string | null
          last_message?: string | null
          last_result?: Json
          last_started_at?: string | null
          last_status?: string | null
          last_success_at?: string | null
          next_run_at?: string | null
          updated_at?: string
        }
        Update: {
          consecutive_failures?: number
          job_key?: string
          last_change_at?: string | null
          last_changed_count?: number | null
          last_duration_ms?: number | null
          last_error?: string | null
          last_fetched_count?: number | null
          last_finished_at?: string | null
          last_message?: string | null
          last_result?: Json
          last_started_at?: string | null
          last_status?: string | null
          last_success_at?: string | null
          next_run_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "snooker_sync_task_state_job_key_fkey"
            columns: ["job_key"]
            isOneToOne: true
            referencedRelation: "snooker_sync_policies"
            referencedColumns: ["job_key"]
          },
        ]
      }
      snooker_visit_logs: {
        Row: {
          created_at: string
          device: string
          event_label: string
          id: string
          ip_address: string | null
          page_label: string
          path: string
          referrer: string
          region: string
          user_agent: string
          visitor_id: string
        }
        Insert: {
          created_at?: string
          device?: string
          event_label?: string
          id?: string
          ip_address?: string | null
          page_label?: string
          path: string
          referrer?: string
          region?: string
          user_agent?: string
          visitor_id: string
        }
        Update: {
          created_at?: string
          device?: string
          event_label?: string
          id?: string
          ip_address?: string | null
          page_label?: string
          path?: string
          referrer?: string
          region?: string
          user_agent?: string
          visitor_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      snooker_latest_rankings: {
        Row: {
          captured_at: string | null
          cutoff_date: string | null
          id: string | null
          list_cutoff_date: string | null
          list_key: string | null
          meta: Json | null
          player_id: string | null
          points: number | null
          previous_rank: number | null
          qualification_limit: number | null
          rank: number | null
          rank_change: number | null
          ranking_group: string | null
          ranking_list_id: string | null
          ranking_money: number | null
          ranking_type: string | null
          season: string | null
          source_name: string | null
          source_player_name: string | null
          source_url: string | null
          title_en: string | null
          title_zh: string | null
        }
        Relationships: [
          {
            foreignKeyName: "snooker_ranking_snapshots_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "snooker_players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "snooker_ranking_snapshots_ranking_list_id_fkey"
            columns: ["ranking_list_id"]
            isOneToOne: false
            referencedRelation: "snooker_ranking_lists"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      snooker_backfill_wst_match_detail: {
        Args: { p_match_id: string }
        Returns: Json
      }
      snooker_backfill_wst_match_detail_v2: {
        Args: { p_match_id: string }
        Returns: Json
      }
      snooker_find_player_id: { Args: { p_name: string }; Returns: string }
      snooker_live_sync_cycle: { Args: never; Returns: Json }
      snooker_normalize_person_name: {
        Args: { p_name: string }
        Returns: string
      }
      snooker_ops_change_password: {
        Args: { p_new_password: string; p_token: string }
        Returns: Json
      }
      snooker_ops_login: {
        Args: {
          p_ip?: string
          p_password: string
          p_user_agent?: string
          p_username: string
        }
        Returns: Json
      }
      snooker_ops_logout: { Args: { p_token: string }; Returns: Json }
      snooker_ops_run_action: {
        Args: { p_action: string; p_payload?: Json; p_token: string }
        Returns: Json
      }
      snooker_ops_session: { Args: { p_token: string }; Returns: Json }
      snooker_ops_snapshot: { Args: { p_token: string }; Returns: Json }
      snooker_player_detail_public: { Args: { p_slug: string }; Returns: Json }
      snooker_post_match_finalize_cycle: { Args: never; Returns: Json }
      snooker_refresh_match_h2h: { Args: { p_match_id: string }; Returns: Json }
      snooker_sync_wst_match_frames: {
        Args: { p_match_id: string }
        Returns: Json
      }
      snooker_sync_wst_tournament: {
        Args: { p_wst_tournament_id: string }
        Returns: Json
      }
      snooker_upcoming_schedule_sync_cycle: { Args: never; Returns: Json }
      snooker_visit_list: {
        Args: {
          p_from: string
          p_limit?: number
          p_offset?: number
          p_query?: string
          p_to: string
        }
        Returns: {
          createdAt: string
          device: string
          eventLabel: string
          id: string
          ipAddress: string
          pageLabel: string
          path: string
          region: string
          visitorId: string
        }[]
      }
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
