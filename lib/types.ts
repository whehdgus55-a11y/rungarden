export type RunLog = {
  id: string;
  user_id: string;
  plant_name: string;
  distance_km: number;
  duration_min: number | null;
  memo: string | null;
  created_at: string;
};

export type UserPlant = {
  id: string;
  user_id: string;
  plant_name: string;
  growth_percent: number;
  harvest_count: number;
  harvested_distance_km: number;
  created_at: string;
  updated_at: string;
};
