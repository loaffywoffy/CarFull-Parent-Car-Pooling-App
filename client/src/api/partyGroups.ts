import { apiRequest } from "@/lib/queryClient";
import type { InsertPartyGroup, PartyGroup } from "@shared/schema";

// Fetch all party groups
export async function getPartyGroups() {
  return apiRequest("GET", "/api/party-groups");
}

// Fetch a party group by ID
export async function getPartyGroupById(id: number) {
  return apiRequest("GET", `/api/party-groups/${id}`);
}

// Fetch a party group by access code
export async function getPartyGroupByAccessCode(accessCode: string) {
  return apiRequest("GET", `/api/party-groups/code/${accessCode}`);
}

// Create a new party group
export async function createPartyGroup(partyGroupData: InsertPartyGroup) {
  return apiRequest("POST", "/api/party-groups", partyGroupData);
}

// Fetch all carpools for a party group
export async function getCarpoolsByPartyGroupId(partyGroupId: number) {
  return apiRequest("GET", `/api/party-groups/${partyGroupId}/carpools`);
}