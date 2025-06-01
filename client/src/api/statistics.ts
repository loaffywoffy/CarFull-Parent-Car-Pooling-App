import { apiRequest } from "@/lib/queryClient";

export interface CarpullStatistics {
  totalEvents: number;
  carpoolOffers: number;
  ridesAccepted: number;
  milesSaved: number;
  co2ReductionKg: number;
}

export async function getCarpullStatistics(): Promise<CarpullStatistics> {
  const response = await fetch("/api/statistics");
  return response.json();
}