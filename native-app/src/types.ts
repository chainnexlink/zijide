export type AlertRow = {
  id: string;
  title: string;
  description: string | null;
  alert_type: string;
  severity: string;
  city: string | null;
  country: string | null;
  created_at: string | null;
  is_active: boolean | null;
  latitude?: number | null;
  longitude?: number | null;
  affected_radius_km?: number | null;
  start_time?: string | null;
  end_time?: string | null;
  source?: string | null;
  source_url?: string | null;
  is_verified?: boolean | null;
};

export type ShelterRow = {
  id: string;
  name: string;
  address: string | null;
  city: string | null;
  country: string | null;
  latitude: number;
  longitude: number;
  status: string | null;
  capacity: number | null;
  current_occupancy: number | null;
  has_water: boolean | null;
  has_medical: boolean | null;
  has_electricity?: boolean | null;
  has_toilet?: boolean | null;
  has_rest_area?: boolean | null;
  phone?: string | null;
  opening_hours?: string | null;
  updated_at?: string | null;
};

export type ProfileRow = {
  id: string;
  nickname: string | null;
  email: string | null;
  city: string | null;
  country: string | null;
  blood_type: string | null;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
};
