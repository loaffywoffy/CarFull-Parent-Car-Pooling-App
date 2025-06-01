import { apiRequest } from "@/lib/queryClient";

export interface CarpoolStatistics {
  totalEvents: number;
  carpoolOffers: number;
  ridesAccepted: number;
  milesSaved: number;
  co2ReductionKg: number;
}

export async function getCarpoolStatistics(): Promise<CarpoolStatistics> {
  const response = await fetch("/api/statistics");
  return response.json();
}