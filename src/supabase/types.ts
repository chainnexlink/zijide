export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      alerts: {
        Row: {
          affected_radius_km: number | null
          alert_type: string
          city: string | null
          country: string | null
          created_at: string | null
          description: string | null
          end_time: string | null
          id: string
          is_verified: boolean | null
          latitude: number | null
          longitude: number | null
          severity: string
          source: string | null
          start_time: string | null
          title: string
          updated_at: string | null
          is_active: boolean | null
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          affected_radius_km?: number | null
          alert_type: string
          city?: string | null
          country?: string | null
          created_at?: string | null
          description?: string | null
          end_time?: string | null
          id?: string
          is_active?: boolean | null
          is_verified?: boolean | null
          latitude?: number | null
          longitude?: number | null
          severity: string
          source?: string | null
          start_time?: string | null
          title: string
          updated_at?: string | null
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          affected_radius_km?: number | null
          alert_type?: string
          city?: string | null
          country?: string | null
          created_at?: string | null
          description?: string | null
          end_time?: string | null
          id?: string
          is_active?: boolean | null
          is_verified?: boolean | null
          latitude?: number | null
          longitude?: number | null
          severity?: string
          source?: string | null
          start_time?: string | null
          title?: string
          updated_at?: string | null
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "alerts_verified_by_fkey"
            columns: ["verified_by"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      announcements: {
        Row: {
          content: string
          created_at: string | null
          created_by: string | null
          end_at: string | null
          id: string
          is_active: boolean | null
          start_at: string | null
          title: string
          type: string | null
        }
        Insert: {
          content: string
          created_at?: string | null
          created_by?: string | null
          end_at?: string | null
          id?: string
          is_active?: boolean | null
          start_at?: string | null
          title: string
          type?: string | null
        }
        Update: {
          content?: string
          created_at?: string | null
          created_by?: string | null
          end_at?: string | null
          id?: string
          is_active?: boolean | null
          start_at?: string | null
          title?: string
          type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "announcements_created_by_fkey"
            columns: ["created_by"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      family_groups: {
        Row: {
          admin_id: string
          alert_sync_enabled: boolean | null
          created_at: string | null
          evacuation_meeting_lat: number | null
          evacuation_meeting_lng: number | null
          evacuation_meeting_point: string | null
          id: string
          invite_code: string
          location_sharing_enabled: boolean | null
          max_members: number | null
          name: string
          sos_sync_enabled: boolean | null
          updated_at: string | null
        }
        Insert: {
          admin_id: string
          alert_sync_enabled?: boolean | null
          created_at?: string | null
          evacuation_meeting_lat?: number | null
          evacuation_meeting_lng?: number | null
          evacuation_meeting_point?: string | null
          id?: string
          invite_code: string
          location_sharing_enabled?: boolean | null
          max_members?: number | null
          name: string
          sos_sync_enabled?: boolean | null
          updated_at?: string | null
        }
        Update: {
          admin_id?: string
          alert_sync_enabled?: boolean | null
          created_at?: string | null
          evacuation_meeting_lat?: number | null
          evacuation_meeting_lng?: number | null
          evacuation_meeting_point?: string | null
          id?: string
          invite_code?: string
          location_sharing_enabled?: boolean | null
          max_members?: number | null
          name?: string
          sos_sync_enabled?: boolean | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "family_groups_admin_id_fkey"
            columns: ["admin_id"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      family_members: {
        Row: {
          created_at: string | null
          family_id: string
          id: string
          is_online: boolean | null
          joined_at: string | null
          last_seen_at: string | null
          latitude: number | null
          longitude: number | null
          location_accuracy: number | null
          location_updated_at: string | null
          role: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          family_id: string
          id?: string
          is_online?: boolean | null
          joined_at?: string | null
          last_seen_at?: string | null
          latitude?: number | null
          longitude?: number | null
          location_accuracy?: number | null
          location_updated_at?: string | null
          role?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          family_id?: string
          id?: string
          is_online?: boolean | null
          joined_at?: string | null
          last_seen_at?: string | null
          latitude?: number | null
          longitude?: number | null
          location_accuracy?: number | null
          location_updated_at?: string | null
          role?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "family_members_family_id_fkey"
            columns: ["family_id"]
            referencedRelation: "family_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "family_members_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      invites: {
        Row: {
          created_at: string | null
          id: string
          invite_code: string
          invite_link: string | null
          invited_email: string | null
          invited_phone: string | null
          inviter_id: string
          registered_at: string | null
          reward_amount: number | null
          reward_given: boolean | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          invite_code: string
          invite_link?: string | null
          invited_email?: string | null
          invited_phone?: string | null
          inviter_id: string
          registered_at?: string | null
          reward_amount?: number | null
          reward_given?: boolean | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          invite_code?: string
          invite_link?: string | null
          invited_email?: string | null
          invited_phone?: string | null
          inviter_id?: string
          registered_at?: string | null
          reward_amount?: number | null
          reward_given?: boolean | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invites_inviter_id_fkey"
            columns: ["inviter_id"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      mutual_aid_responses: {
        Row: {
          arrived_at: string | null
          created_at: string | null
          id: string
          notes: string | null
          responded_at: string | null
          responder_id: string
          reward_amount: number | null
          sos_id: string
          status: string
          updated_at: string | null
          verified_at: string | null
        }
        Insert: {
          arrived_at?: string | null
          created_at?: string | null
          id?: string
          notes?: string | null
          responded_at?: string | null
          responder_id: string
          reward_amount?: number | null
          sos_id: string
          status?: string
          updated_at?: string | null
          verified_at?: string | null
        }
        Update: {
          arrived_at?: string | null
          created_at?: string | null
          id?: string
          notes?: string | null
          responded_at?: string | null
          responder_id?: string
          reward_amount?: number | null
          sos_id?: string
          status?: string
          updated_at?: string | null
          verified_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "mutual_aid_responses_responder_id_fkey"
            columns: ["responder_id"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mutual_aid_responses_sos_id_fkey"
            columns: ["sos_id"]
            referencedRelation: "sos_records"
            referencedColumns: ["id"]
          },
        ]
      }
      mutual_aid_subscriptions: {
        Row: {
          created_at: string | null
          id: string
          is_active: boolean | null
          last_reward_at: string | null
          subscribed_at: string | null
          total_rewards: number | null
          unsubscribed_at: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          last_reward_at?: string | null
          subscribed_at?: string | null
          total_rewards?: number | null
          unsubscribed_at?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          last_reward_at?: string | null
          subscribed_at?: string | null
          total_rewards?: number | null
          unsubscribed_at?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "mutual_aid_subscriptions_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          allergies: string | null
          avatar_url: string | null
          birth_date: string | null
          blood_type: string | null
          city: string | null
          country: string | null
          created_at: string | null
          current_medication: string | null
          device_id: string | null
          email: string | null
          emergency_contact_name: string | null
          emergency_contact_phone: string | null
          emergency_contact_relation: string | null
          gender: string | null
          id: string
          invite_code: string | null
          is_guest: boolean | null
          is_online: boolean | null
          language: string | null
          medical_history: string | null
          medical_notes: string | null
          nickname: string | null
          phone: string | null
          trial_ends_at: string | null
          updated_at: string | null
        }
        Insert: {
          allergies?: string | null
          avatar_url?: string | null
          birth_date?: string | null
          blood_type?: string | null
          city?: string | null
          country?: string | null
          created_at?: string | null
          current_medication?: string | null
          device_id?: string | null
          email?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          emergency_contact_relation?: string | null
          gender?: string | null
          id: string
          invite_code?: string | null
          is_guest?: boolean | null
          is_online?: boolean | null
          language?: string | null
          medical_history?: string | null
          medical_notes?: string | null
          nickname?: string | null
          phone?: string | null
          trial_ends_at?: string | null
          updated_at?: string | null
        }
        Update: {
          allergies?: string | null
          avatar_url?: string | null
          birth_date?: string | null
          blood_type?: string | null
          city?: string | null
          country?: string | null
          created_at?: string | null
          current_medication?: string | null
          device_id?: string | null
          email?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          emergency_contact_relation?: string | null
          gender?: string | null
          id?: string
          invite_code?: string | null
          is_guest?: boolean | null
          is_online?: boolean | null
          language?: string | null
          medical_history?: string | null
          medical_notes?: string | null
          nickname?: string | null
          phone?: string | null
          trial_ends_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      rescue_pending: {
        Row: {
          address: string | null
          admin_notes: string | null
          admin_notified_at: string | null
          admin_processed_at: string | null
          admin_processed_by: string | null
          alert_context: Json | null
          created_at: string | null
          id: string
          latitude: number | null
          longitude: number | null
          nearest_shelter_distance: number | null
          nearest_shelter_id: string | null
          nearest_shelter_name: string | null
          priority: number | null
          rescue_org_email: string | null
          rescue_org_name: string | null
          rescue_org_phone: string | null
          sos_id: string
          status: string
          updated_at: string | null
          user_email: string | null
          user_id: string
          user_phone: string | null
        }
        Insert: {
          address?: string | null
          admin_notes?: string | null
          admin_notified_at?: string | null
          admin_processed_at?: string | null
          admin_processed_by?: string | null
          alert_context?: Json | null
          created_at?: string | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          nearest_shelter_distance?: number | null
          nearest_shelter_id?: string | null
          nearest_shelter_name?: string | null
          priority?: number | null
          rescue_org_email?: string | null
          rescue_org_name?: string | null
          rescue_org_phone?: string | null
          sos_id: string
          status?: string
          updated_at?: string | null
          user_email?: string | null
          user_id: string
          user_phone?: string | null
        }
        Update: {
          address?: string | null
          admin_notes?: string | null
          admin_notified_at?: string | null
          admin_processed_at?: string | null
          admin_processed_by?: string | null
          alert_context?: Json | null
          created_at?: string | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          nearest_shelter_distance?: number | null
          nearest_shelter_id?: string | null
          nearest_shelter_name?: string | null
          priority?: number | null
          rescue_org_email?: string | null
          rescue_org_name?: string | null
          rescue_org_phone?: string | null
          sos_id?: string
          status?: string
          updated_at?: string | null
          user_email?: string | null
          user_id?: string
          user_phone?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "rescue_pending_admin_processed_by_fkey"
            columns: ["admin_processed_by"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rescue_pending_sos_id_fkey"
            columns: ["sos_id"]
            referencedRelation: "sos_records"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rescue_pending_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      shelters: {
        Row: {
          address: string | null
          capacity: number | null
          city: string | null
          country: string | null
          created_at: string | null
          current_occupancy: number | null
          description: string | null
          has_electricity: boolean | null
          has_medical: boolean | null
          has_rest_area: boolean | null
          has_toilet: boolean | null
          has_water: boolean | null
          id: string
          is_verified: boolean | null
          latitude: number
          longitude: number
          manager_name: string | null
          name: string
          opening_hours: string | null
          phone: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          capacity?: number | null
          city?: string | null
          country?: string | null
          created_at?: string | null
          current_occupancy?: number | null
          description?: string | null
          has_electricity?: boolean | null
          has_medical?: boolean | null
          has_rest_area?: boolean | null
          has_toilet?: boolean | null
          has_water?: boolean | null
          id?: string
          is_verified?: boolean | null
          latitude: number
          longitude: number
          manager_name?: string | null
          name: string
          opening_hours?: string | null
          phone?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          capacity?: number | null
          city?: string | null
          country?: string | null
          created_at?: string | null
          current_occupancy?: number | null
          description?: string | null
          has_electricity?: boolean | null
          has_medical?: boolean | null
          has_rest_area?: boolean | null
          has_toilet?: boolean | null
          has_water?: boolean | null
          id?: string
          is_verified?: boolean | null
          latitude?: number
          longitude?: number
          manager_name?: string | null
          name?: string
          opening_hours?: string | null
          phone?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      simulation_alerts: {
        Row: {
          acknowledged: boolean | null
          acknowledged_at: string | null
          alert_type: string
          city: string | null
          country: string | null
          created_at: string | null
          description: string | null
          distance: number | null
          id: string
          latitude: number | null
          longitude: number | null
          push_sent: boolean | null
          reliability_score: number | null
          severity: string
          sms_sent: boolean | null
          title: string
          trial_id: string
          user_id: string
        }
        Insert: {
          acknowledged?: boolean | null
          acknowledged_at?: string | null
          alert_type: string
          city?: string | null
          country?: string | null
          created_at?: string | null
          description?: string | null
          distance?: number | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          push_sent?: boolean | null
          reliability_score?: number | null
          severity: string
          sms_sent?: boolean | null
          title: string
          trial_id: string
          user_id: string
        }
        Update: {
          acknowledged?: boolean | null
          acknowledged_at?: string | null
          alert_type?: string
          city?: string | null
          country?: string | null
          created_at?: string | null
          description?: string | null
          distance?: number | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          push_sent?: boolean | null
          reliability_score?: number | null
          severity?: string
          sms_sent?: boolean | null
          title?: string
          trial_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "simulation_alerts_trial_id_fkey"
            columns: ["trial_id"]
            referencedRelation: "simulation_trials"
            referencedColumns: ["id"]
          },
        ]
      }
      simulation_notifications: {
        Row: {
          alert_id: string
          channel: string
          created_at: string | null
          delivered_at: string | null
          error_message: string | null
          id: string
          sent_at: string | null
          status: string
          user_id: string
        }
        Insert: {
          alert_id: string
          channel: string
          created_at?: string | null
          delivered_at?: string | null
          error_message?: string | null
          id?: string
          sent_at?: string | null
          status: string
          user_id: string
        }
        Update: {
          alert_id?: string
          channel?: string
          created_at?: string | null
          delivered_at?: string | null
          error_message?: string | null
          id?: string
          sent_at?: string | null
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "simulation_notifications_alert_id_fkey"
            columns: ["alert_id"]
            referencedRelation: "simulation_alerts"
            referencedColumns: ["id"]
          },
        ]
      }
      simulation_trials: {
        Row: {
          alert_count: number | null
          created_at: string | null
          expires_at: string
          id: string
          is_active: boolean | null
          last_alert_at: string | null
          started_at: string | null
          user_id: string
        }
        Insert: {
          alert_count?: number | null
          created_at?: string | null
          expires_at: string
          id?: string
          is_active?: boolean | null
          last_alert_at?: string | null
          started_at?: string | null
          user_id: string
        }
        Update: {
          alert_count?: number | null
          created_at?: string | null
          expires_at?: string
          id?: string
          is_active?: boolean | null
          last_alert_at?: string | null
          started_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      sms_codes: {
        Row: {
          code: string
          country_code: string
          created_at: string | null
          expires_at: string
          id: string
          phone: string
          used: boolean | null
        }
        Insert: {
          code: string
          country_code?: string
          created_at?: string | null
          expires_at?: string
          id?: string
          phone: string
          used?: boolean | null
        }
        Update: {
          code?: string
          country_code?: string
          created_at?: string | null
          expires_at?: string
          id?: string
          phone?: string
          used?: boolean | null
        }
        Relationships: []
      }
      sos_records: {
        Row: {
          address: string | null
          alert_type: string | null
          city: string | null
          confirmed_at: string | null
          confirmed_by: string | null
          country: string | null
          created_at: string | null
          id: string
          latitude: number | null
          longitude: number | null
          notes: string | null
          rescue_triggered_at: string | null
          rescue_triggered_by: string | null
          stage: number | null
          stage_started_at: string | null
          status: string
          trigger_method: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          address?: string | null
          alert_type?: string | null
          city?: string | null
          confirmed_at?: string | null
          confirmed_by?: string | null
          country?: string | null
          created_at?: string | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          notes?: string | null
          rescue_triggered_at?: string | null
          rescue_triggered_by?: string | null
          stage?: number | null
          stage_started_at?: string | null
          status?: string
          trigger_method: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          address?: string | null
          alert_type?: string | null
          city?: string | null
          confirmed_at?: string | null
          confirmed_by?: string | null
          country?: string | null
          created_at?: string | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          notes?: string | null
          rescue_triggered_at?: string | null
          rescue_triggered_by?: string | null
          stage?: number | null
          stage_started_at?: string | null
          status?: string
          trigger_method?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sos_records_rescue_triggered_by_fkey"
            columns: ["rescue_triggered_by"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sos_records_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      subscription_orders: {
        Row: {
          completed_at: string | null
          created_at: string | null
          discount_amount: number | null
          expires_at: string
          external_order_id: string | null
          final_price: number
          has_invite_discount: boolean | null
          id: string
          original_price: number
          payment_method: string | null
          plan_id: string
          status: string | null
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          discount_amount?: number | null
          expires_at?: string
          external_order_id?: string | null
          final_price: number
          has_invite_discount?: boolean | null
          id?: string
          original_price: number
          payment_method?: string | null
          plan_id: string
          status?: string | null
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          discount_amount?: number | null
          expires_at?: string
          external_order_id?: string | null
          final_price?: number
          has_invite_discount?: boolean | null
          id?: string
          original_price?: number
          payment_method?: string | null
          plan_id?: string
          status?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscription_orders_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          auto_renew: boolean | null
          created_at: string | null
          expires_at: string
          id: string
          plan_id: string
          started_at: string | null
          status: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          auto_renew?: boolean | null
          created_at?: string | null
          expires_at: string
          id?: string
          plan_id: string
          started_at?: string | null
          status?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          auto_renew?: boolean | null
          created_at?: string | null
          expires_at?: string
          id?: string
          plan_id?: string
          started_at?: string | null
          status?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_alert_settings: {
        Row: {
          alert_air_strike: boolean | null
          alert_artillery: boolean | null
          alert_conflict: boolean | null
          alert_curfew: boolean | null
          created_at: string | null
          dnd_enabled: boolean | null
          dnd_end_time: string | null
          dnd_start_time: string | null
          flash_enabled: boolean | null
          id: string
          monitor_radius_km: number | null
          push_enabled: boolean | null
          sound_enabled: boolean | null
          updated_at: string | null
          user_id: string
          vibration_enabled: boolean | null
        }
        Insert: {
          alert_air_strike?: boolean | null
          alert_artillery?: boolean | null
          alert_conflict?: boolean | null
          alert_curfew?: boolean | null
          created_at?: string | null
          dnd_enabled?: boolean | null
          dnd_end_time?: string | null
          dnd_start_time?: string | null
          flash_enabled?: boolean | null
          id?: string
          monitor_radius_km?: number | null
          push_enabled?: boolean | null
          sound_enabled?: boolean | null
          updated_at?: string | null
          user_id: string
          vibration_enabled?: boolean | null
        }
        Update: {
          alert_air_strike?: boolean | null
          alert_artillery?: boolean | null
          alert_conflict?: boolean | null
          alert_curfew?: boolean | null
          created_at?: string | null
          dnd_enabled?: boolean | null
          dnd_end_time?: string | null
          dnd_start_time?: string | null
          flash_enabled?: boolean | null
          id?: string
          monitor_radius_km?: number | null
          push_enabled?: boolean | null
          sound_enabled?: boolean | null
          updated_at?: string | null
          user_id?: string
          vibration_enabled?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "user_alert_settings_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      favorite_shelters: {
        Row: {
          created_at: string | null
          id: string
          shelter_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          shelter_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          shelter_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "favorite_shelters_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "favorite_shelters_shelter_id_fkey"
            columns: ["shelter_id"]
            referencedRelation: "shelters"
            referencedColumns: ["id"]
          },
        ]
      }
      shelter_update_logs: {
        Row: {
          changed_fields: Json | null
          created_at: string | null
          id: string
          shelter_id: string
          update_type: string
          updated_by: string | null
        }
        Insert: {
          changed_fields?: Json | null
          created_at?: string | null
          id?: string
          shelter_id: string
          update_type: string
          updated_by?: string | null
        }
        Update: {
          changed_fields?: Json | null
          created_at?: string | null
          id?: string
          shelter_id?: string
          update_type?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "shelter_update_logs_shelter_id_fkey"
            columns: ["shelter_id"]
            referencedRelation: "shelters"
            referencedColumns: ["id"]
          },
        ]
      }
      user_points: {
        Row: {
          id: string
          user_id: string
          balance: number
          total_earned: number
          total_spent: number
          updated_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          balance?: number
          total_earned?: number
          total_spent?: number
          updated_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          balance?: number
          total_earned?: number
          total_spent?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_points_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      point_transactions: {
        Row: {
          id: string
          user_id: string
          amount: number
          type: string
          reason: string | null
          reference_id: string | null
          created_by: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          amount: number
          type: string
          reason?: string | null
          reference_id?: string | null
          created_by?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          amount?: number
          type?: string
          reason?: string | null
          reference_id?: string | null
          created_by?: string | null
          created_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "point_transactions_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      city_alerts: {
        Row: {
          id: string
          city: string
          country: string | null
          alert_type: string
          severity: string
          description: string | null
          user_count: number
          trigger_threshold: number
          is_confirmed: boolean | null
          is_active: boolean | null
          first_report_time: string | null
          confirmed_at: string | null
          confirmed_by: string | null
          latitude: number | null
          longitude: number | null
          reward_granted: boolean | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          city: string
          country?: string | null
          alert_type?: string
          severity?: string
          description?: string | null
          user_count?: number
          trigger_threshold?: number
          is_confirmed?: boolean | null
          is_active?: boolean | null
          first_report_time?: string | null
          confirmed_at?: string | null
          confirmed_by?: string | null
          latitude?: number | null
          longitude?: number | null
          reward_granted?: boolean | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          city?: string
          country?: string | null
          alert_type?: string
          severity?: string
          description?: string | null
          user_count?: number
          trigger_threshold?: number
          is_confirmed?: boolean | null
          is_active?: boolean | null
          first_report_time?: string | null
          confirmed_at?: string | null
          confirmed_by?: string | null
          latitude?: number | null
          longitude?: number | null
          reward_granted?: boolean | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "city_alerts_confirmed_by_fkey"
            columns: ["confirmed_by"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      city_alert_reporters: {
        Row: {
          id: string
          city_alert_id: string
          user_id: string
          reported_at: string | null
          report_order: number
          reward_given: boolean | null
          reward_amount: number | null
        }
        Insert: {
          id?: string
          city_alert_id: string
          user_id: string
          reported_at?: string | null
          report_order?: number
          reward_given?: boolean | null
          reward_amount?: number | null
        }
        Update: {
          id?: string
          city_alert_id?: string
          user_id?: string
          reported_at?: string | null
          report_order?: number
          reward_given?: boolean | null
          reward_amount?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "city_alert_reporters_city_alert_id_fkey"
            columns: ["city_alert_id"]
            referencedRelation: "city_alerts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "city_alert_reporters_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      support_messages: {
        Row: {
          id: string
          user_id: string
          content: string
          sender_role: string
          admin_id: string | null
          is_read: boolean | null
          created_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          content: string
          sender_role: string
          admin_id?: string | null
          is_read?: boolean | null
          created_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          content?: string
          sender_role?: string
          admin_id?: string | null
          is_read?: boolean | null
          created_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "support_messages_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      city_alert_triggers: {
        Row: {
          id: string
          alert_id: string
          user_id: string
          city: string
          country: string | null
          trigger_rank: number
          trigger_time: string
          latitude: number | null
          longitude: number | null
          reward_points: number | null
          reward_granted: boolean | null
          reward_granted_at: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          alert_id: string
          user_id: string
          city: string
          country?: string | null
          trigger_rank: number
          trigger_time?: string
          latitude?: number | null
          longitude?: number | null
          reward_points?: number | null
          reward_granted?: boolean | null
          reward_granted_at?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          alert_id?: string
          user_id?: string
          city?: string
          country?: string | null
          trigger_rank?: number
          trigger_time?: string
          latitude?: number | null
          longitude?: number | null
          reward_points?: number | null
          reward_granted?: boolean | null
          reward_granted_at?: string | null
          created_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "city_alert_triggers_alert_id_fkey"
            columns: ["alert_id"]
            referencedRelation: "alerts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "city_alert_triggers_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      city_alert_summaries: {
        Row: {
          id: string
          alert_id: string
          city: string
          country: string | null
          total_triggers: number | null
          rewarded_count: number | null
          total_reward_points: number | null
          is_real_alert: boolean | null
          first_trigger_at: string | null
          last_trigger_at: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          alert_id: string
          city: string
          country?: string | null
          total_triggers?: number | null
          rewarded_count?: number | null
          total_reward_points?: number | null
          is_real_alert?: boolean | null
          first_trigger_at?: string | null
          last_trigger_at?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          alert_id?: string
          city?: string
          country?: string | null
          total_triggers?: number | null
          rewarded_count?: number | null
          total_reward_points?: number | null
          is_real_alert?: boolean | null
          first_trigger_at?: string | null
          last_trigger_at?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "city_alert_summaries_alert_id_fkey"
            columns: ["alert_id"]
            referencedRelation: "alerts"
            referencedColumns: ["id"]
          },
        ]
      }
      city_alert_reward_rules: {
        Row: {
          id: string
          rank_from: number
          rank_to: number
          reward_points: number
          is_active: boolean | null
          description: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          rank_from: number
          rank_to: number
          reward_points: number
          is_active?: boolean | null
          description?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          rank_from?: number
          rank_to?: number
          reward_points?: number
          is_active?: boolean | null
          description?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      customer_service_messages: {
        Row: {
          id: string
          user_id: string | null
          session_id: string
          sender_type: string
          admin_id: string | null
          message: string
          message_type: string | null
          is_read: boolean | null
          created_at: string | null
        }
        Insert: {
          id?: string
          user_id?: string | null
          session_id: string
          sender_type: string
          admin_id?: string | null
          message: string
          message_type?: string | null
          is_read?: boolean | null
          created_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string | null
          session_id?: string
          sender_type?: string
          admin_id?: string | null
          message?: string
          message_type?: string | null
          is_read?: boolean | null
          created_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customer_service_messages_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_service_sessions: {
        Row: {
          id: string
          session_id: string
          user_id: string | null
          user_name: string | null
          user_city: string | null
          status: string | null
          assigned_admin: string | null
          last_message_at: string | null
          unread_count: number | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          session_id: string
          user_id?: string | null
          user_name?: string | null
          user_city?: string | null
          status?: string | null
          assigned_admin?: string | null
          last_message_at?: string | null
          unread_count?: number | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          session_id?: string
          user_id?: string | null
          user_name?: string | null
          user_city?: string | null
          status?: string | null
          assigned_admin?: string | null
          last_message_at?: string | null
          unread_count?: number | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customer_service_sessions_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      binary_quantize: {
        Args: { "": string } | { "": unknown }
        Returns: unknown
      }
      halfvec_avg: {
        Args: { "": number[] }
        Returns: unknown
      }
      halfvec_out: {
        Args: { "": unknown }
        Returns: unknown
      }
      halfvec_send: {
        Args: { "": unknown }
        Returns: string
      }
      halfvec_typmod_in: {
        Args: { "": unknown[] }
        Returns: number
      }
      hnsw_bit_support: {
        Args: { "": unknown }
        Returns: unknown
      }
      hnsw_halfvec_support: {
        Args: { "": unknown }
        Returns: unknown
      }
      hnsw_rdsvec_support: {
        Args: { "": unknown }
        Returns: unknown
      }
      hnsw_sparsevec_support: {
        Args: { "": unknown }
        Returns: unknown
      }
      hnswhandler: {
        Args: { "": unknown }
        Returns: unknown
      }
      ivfflat_bit_support: {
        Args: { "": unknown }
        Returns: unknown
      }
      ivfflat_halfvec_support: {
        Args: { "": unknown }
        Returns: unknown
      }
      ivfflathandler: {
        Args: { "": unknown }
        Returns: unknown
      }
      l2_norm: {
        Args: { "": unknown } | { "": unknown }
        Returns: number
      }
      l2_normalize: {
        Args: { "": string } | { "": unknown } | { "": unknown }
        Returns: unknown
      }
      rds_float_normalize_i16: {
        Args: { "": unknown }
        Returns: unknown
      }
      rds_vector_norm: {
        Args: { "": string }
        Returns: number
      }
      sparsevec_out: {
        Args: { "": unknown }
        Returns: unknown
      }
      sparsevec_send: {
        Args: { "": unknown }
        Returns: string
      }
      sparsevec_typmod_in: {
        Args: { "": unknown[] }
        Returns: number
      }
      vector_avg: {
        Args: { "": number[] }
        Returns: string
      }
      vector_dims: {
        Args: { "": string } | { "": unknown }
        Returns: number
      }
      vector_norm: {
        Args: { "": string }
        Returns: number
      }
      vector_out: {
        Args: { "": string }
        Returns: unknown
      }
      vector_send: {
        Args: { "": string }
        Returns: string
      }
      vector_typmod_in: {
        Args: { "": unknown[] }
        Returns: number
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

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
