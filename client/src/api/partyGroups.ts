import { apiRequest } from "@/lib/queryClient";
import type { InsertPartyGroup, PartyGroup } from "@shared/schema";

// Fetch all party groups
export async function getPartyGroups(): Promise<PartyGroup[]> {
  const response = await apiRequest("GET", "/api/party-groups");
  return response.json();
}

// Fetch a party group by ID
export async function getPartyGroupById(id: number): Promise<PartyGroup> {
  const response = await apiRequest("GET", `/api/party-groups/${id}`);
  return response.json();
}

// Fetch a party group by access code
export async function getPartyGroupByAccessCode(accessCode: string): Promise<PartyGroup> {
  const response = await apiRequest("GET", `/api/party-groups/code/${accessCode}`);
  return response.json();
}

// Create a new party group
export async function createPartyGroup(partyGroupData: InsertPartyGroup): Promise<PartyGroup> {
  const response = await apiRequest("POST", "/api/party-groups", partyGroupData);
  return response.json();
}

// Fetch all carpools for a party group
export async function getCarpoolsByPartyGroupId(partyGroupId: number) {
  const response = await apiRequest("GET", `/api/party-groups/${partyGroupId}/carpools`);
  return response.json();
}