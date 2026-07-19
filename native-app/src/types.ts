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
