import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getPartyGroups } from "../api/partyGroups";
import { getCarpools } from "../api/carpools";
import { Carpool, CarpoolRequest, PartyGroup } from "@shared/schema";
import { useQuery } from "@tanstack/react-query";
import { 
  TrendingUpIcon, 
  UsersIcon, 
  CarIcon, 
  MapPinIcon, 
  LeafIcon
} from "lucide-react";

// Constants for metrics calculations
const AVG_CAR_CO2_G_PER_KM = 192; // Average car CO2 emissions in g/km
const AVG_TRAVEL_DISTANCE_KM = 15; // Assumed average travel distance in km per carpool
const MILES_TO_KM = 1.60934; // Conversion factor from miles to kilometers

export default function MetricsDashboard() {
  // States for metrics
  const [totalGroups, setTotalGroups] = useState(0);
  const [totalOffers, setTotalOffers] = useState(0);
  const [totalRidesTaken, setTotalRidesTaken] = useState(0);
  const [totalMilesTraveled, setTotalMilesTraveled] = useState(0);
  const [totalCO2Saved, setTotalCO2Saved] = useState(0);

  // Query party groups data
  const { data: partyGroups } = useQuery<PartyGroup[]>({
    queryKey: ['/api/party-groups'],
    queryFn: getPartyGroups
  });

  // Query carpools data
  const { data: carpools } = useQuery<Carpool[]>({
    queryKey: ['/api/carpools'],
    queryFn: getCarpools
  });

  // Calculate metrics when data changes
  useEffect(() => {
    if (partyGroups) {
      setTotalGroups(partyGroups.length);
    }

    if (carpools) {
      // Total carpool offers
      setTotalOffers(carpools.length);
      
      // Calculate estimated rides taken, miles traveled, and CO2 saved
      let rides = 0;
      
      carpools.forEach(carpool => {
        // Estimate rides based on available spaces for both ways
        const pickupSpaces = carpool.spacesAvailable || 0;
        const returnSpaces = carpool.returnSpacesAvailable || 0;
        
        // Assume 75% utilization of offered spaces
        rides += Math.round((pickupSpaces + returnSpaces) * 0.75);
      });
      
      setTotalRidesTaken(rides);
      
      // Estimate miles traveled (each ride is assumed to be the average distance)
      const milesEstimate = rides * (AVG_TRAVEL_DISTANCE_KM / MILES_TO_KM);
      setTotalMilesTraveled(Math.round(milesEstimate));
      
      // Calculate CO2 saved
      // Formula: Each shared ride saves one car trip
      // CO2 saved = Rides * Distance in km * CO2 emissions per km
      const co2SavedGrams = rides * AVG_TRAVEL_DISTANCE_KM * AVG_CAR_CO2_G_PER_KM;
      // Convert to kg for display
      setTotalCO2Saved(Math.round(co2SavedGrams / 1000));
    }
  }, [partyGroups, carpools]);

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold tracking-tight">Impact Dashboard</h2>
      <p className="text-muted-foreground">
        See the positive impact our carpooling initiative is making!
      </p>
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Party Groups</CardTitle>
            <UsersIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalGroups}</div>
            <p className="text-xs text-muted-foreground">
              Total groups created
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Carpool Offers</CardTitle>
            <CarIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalOffers}</div>
            <p className="text-xs text-muted-foreground">
              Available carpool options
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Rides Taken</CardTitle>
            <TrendingUpIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalRidesTaken}</div>
            <p className="text-xs text-muted-foreground">
              Estimated shared journeys
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Miles Saved</CardTitle>
            <MapPinIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalMilesTraveled}</div>
            <p className="text-xs text-muted-foreground">
              Estimated miles of travel saved
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">CO₂ Saved</CardTitle>
            <LeafIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalCO2Saved} kg</div>
            <p className="text-xs text-muted-foreground">
              Estimated carbon emissions reduction
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}