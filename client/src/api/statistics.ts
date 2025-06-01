import { apiRequest } from "@/lib/queryClient";

export interface KidpoolStatistics {
  totalEvents: number;
  carpoolOffers: number;
  ridesAccepted: number;
  milesSaved: number;
  co2ReductionKg: number;
}

export async function getKidpoolStatistics(): Promise<KidpoolStatistics> {
  const response = await fetch("/api/statistics");
  return response.json();
}