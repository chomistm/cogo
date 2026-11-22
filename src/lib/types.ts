export type Trust = {
  id: string;
  full_name: string;
  avatar_url: string | null;
  role?: string;
  verification: string;
  verified_domain: string | null;
  rating_up: number;
  rating_count: number;
  thumbs_pct: number | null;
  badges: Record<string, number>;
  rides_done: number;
};

export type RouteStop = { stop_id: string; name: string; eta: string };

export type SearchRow = {
  ride_id: string;
  eta_from: string;
  eta_to: string;
  price: number;
  seats_left: number;
  vehicle: { make_model: string; color: string; plate: string };
  route: RouteStop[];
  driver: Trust;
};

export type StopRow = { id: string; name: string; district: string; hint: string | null };
export type CorridorRow = { id: number; name: string; stops: StopRow[] };
