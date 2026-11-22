import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Trust } from "@/lib/types";
import { RideView, type RideData } from "./RideView";

export default async function RidePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const uid = user!.id;

  const [{ data: ride }, { data: stops }, { data: bookings }] = await Promise.all([
    supabase.from("rides").select("id,driver_id,status,departure_at,seats_total,seats_left,price_credits,vehicles(make_model,color,plate)").eq("id", id).maybeSingle(),
    supabase.from("ride_stops").select("seq,eta,stop_id,stops(name,hint)").eq("ride_id", id).order("seq"),
    supabase.from("bookings").select("id,passenger_id,status,pickup_stop_id,dropoff_stop_id,price_credits").eq("ride_id", id).neq("status", "cancelled"),
  ]);
  if (!ride) notFound();

  const people = [ride.driver_id, ...(bookings ?? []).map((b) => b.passenger_id)];
  const [{ data: trust }, { data: myRatings }] = await Promise.all([
    supabase.from("profile_trust").select("*").in("id", people),
    supabase.from("ratings").select("booking_id").eq("rater_id", uid).in("booking_id", (bookings ?? []).map((b) => b.id).concat("00000000-0000-0000-0000-000000000000")),
  ]);
  const byId = new Map((trust as Trust[] | null ?? []).map((t) => [t.id, t]));

  const data: RideData = {
    id: ride.id,
    status: ride.status,
    departure_at: ride.departure_at,
    seats_total: ride.seats_total,
    seats_left: ride.seats_left,
    price: Number(ride.price_credits),
    vehicle: ride.vehicles as unknown as RideData["vehicle"],
    driver: byId.get(ride.driver_id)!,
    isDriver: ride.driver_id === uid,
    stops: (stops ?? []).map((s) => ({ id: s.stop_id, eta: s.eta, ...(s.stops as unknown as { name: string; hint: string | null }) })),
    bookings: (bookings ?? []).map((b) => ({
      id: b.id, status: b.status, pickup: b.pickup_stop_id, dropoff: b.dropoff_stop_id, price: Number(b.price_credits),
      passenger: byId.get(b.passenger_id)!, rated: (myRatings ?? []).some((r) => r.booking_id === b.id),
      mine: b.passenger_id === uid,
    })),
  };
  return <RideView data={data} />;
}
