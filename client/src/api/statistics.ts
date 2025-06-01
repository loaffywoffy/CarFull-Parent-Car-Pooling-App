import { apiRequest } from "@/lib/queryClient";

export interface CarfullStatistics {
  totalEvents: number;
  carpoolOffers: number;
  ridesAccepted: number;
  milesSaved: number;
  co2ReductionKg: number;
}

export async function getCarfullStatistics(): Promise<CarfullStatistics> {
  const response = await fetch("/api/statistics");
  return response.json();
}