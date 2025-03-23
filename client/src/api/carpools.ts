import { apiRequest } from "@/lib/queryClient";

export async function getCarpools() {
  const response = await apiRequest("GET", "/api/carpools");
  return response.json();
}

export async function getCarpoolById(id: number) {
  const response = await apiRequest("GET", `/api/carpools/${id}`);
  return response.json();
}

export async function getCarpoolRequests(carpoolId: number) {
  const response = await apiRequest("GET", `/api/carpools/${carpoolId}/requests`);
  return response.json();
}

export async function createCarpool(carpoolData: any) {
  const response = await apiRequest("POST", "/api/carpools", carpoolData);
  return response.json();
}

export async function createCarpoolRequest(requestData: any) {
  const response = await apiRequest("POST", "/api/carpool-requests", requestData);
  return response.json();
}
