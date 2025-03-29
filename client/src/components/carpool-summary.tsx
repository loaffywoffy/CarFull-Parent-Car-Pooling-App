import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { 
  Car, ArrowRight, ArrowLeft, MapPin, User, Calendar, Clock, 
  Users, HomeIcon, Building, Share2
} from "lucide-react";
import { type PartyGroup } from "@shared/schema";

interface CarpoolSummaryProps {
  partyGroupId: number;
}

export default function CarpoolSummary({ partyGroupId }: CarpoolSummaryProps) {
  // Fetch carpool data
  const { data: carpools, isLoading: carpoolsLoading } = useQuery({
    queryKey: [`/api/party-groups/${partyGroupId}/carpools`],
  });

  // Fetch party group data
  const { data: partyGroup } = useQuery<PartyGroup>({
    queryKey: [`/api/party-groups/${partyGroupId}`],
    enabled: !!partyGroupId,
  });

  if (carpoolsLoading) {
    return (
      <div className="flex items-center justify-center p-6 bg-white rounded-lg shadow">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-neutral-600">Loading carpool information...</p>
        </div>
      </div>
    );
  }

  const carpoolsArray = Array.isArray(carpools) ? carpools : [];

  if (carpoolsArray.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold mb-2 text-neutral-800">Carpool Summary</h2>
        <p className="text-neutral-600">No carpools have been arranged yet for this party.</p>
      </div>
    );
  }

  // Group carpools by direction
  const toPartyCarpools = carpoolsArray.filter((c: any) => c.canPickup || c.canBoth);
  const fromPartyCarpools = carpoolsArray.filter((c: any) => c.canDropoff || c.canBoth);

  // Function to get initials from a name
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(part => part[0])
      .join('')
      .toUpperCase();
  };

  // Function to describe dropoff preference in a user-friendly way
  const getDropoffPreferenceDescription = (preference: string) => {
    switch (preference) {
      case 'direct-home':
        return 'Driver will drop off each child directly at their home';
      case 'my-home':
        return 'Parents should collect children from driver\'s home';
      case 'central-point':
        return 'Driver will drop off at a central meeting point';
      default:
        return 'Not specified';
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6 mb-8">
      <div className="flex justify-between items-start mb-6">
        <div>
          <h2 className="text-xl font-semibold text-neutral-800">Carpool Summary</h2>
          <p className="text-neutral-600 text-sm mt-1">
            {partyGroup?.name || "Party"} - {partyGroup?.partyDate ? new Date(partyGroup.partyDate).toLocaleDateString() : ""}
          </p>
        </div>
        <Button variant="outline" size="sm" className="flex items-center gap-1">
          <Share2 className="h-4 w-4" />
          <span>Share</span>
        </Button>
      </div>

      {/* Party Details Card */}
      <Card className="mb-6 bg-gray-50">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <Calendar className="h-4 w-4 text-neutral-500" />
                <span className="text-sm font-medium">
                  {partyGroup?.partyDate ? new Date(partyGroup.partyDate).toLocaleDateString('en-US', { 
                    weekday: 'long', 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  }) : "Date not specified"}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-neutral-500" />
                <span className="text-sm">
                  {partyGroup?.targetArrivalTime || "Time not specified"}
                  {partyGroup?.endTime ? ` - ${partyGroup.endTime}` : ""}
                </span>
              </div>
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <MapPin className="h-4 w-4 text-neutral-500" />
                <span className="text-sm">
                  {partyGroup ? `${partyGroup.partyAddress}, ${partyGroup.partyCity}` : "Location not specified"}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-neutral-500" />
                <span className="text-sm">
                  {carpoolsArray.length > 0 ? `${carpoolsArray.length} carpool${carpoolsArray.length !== 1 ? 's' : ''} arranged` : "No carpools arranged"}
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* TO Party Carpools */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-4">
          <Badge variant="outline" className="bg-green-50 text-green-800 border-green-200 px-3 py-1">
            <ArrowRight className="h-4 w-4 mr-1" />
            <span>TO Party</span>
          </Badge>
          <h3 className="text-lg font-medium text-neutral-700">Pickup Arrangements</h3>
        </div>

        {toPartyCarpools.length === 0 ? (
          <Card className="mb-4">
            <CardContent className="p-4 text-center text-neutral-600">
              No carpools available for transportation to the party.
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {toPartyCarpools.map((carpool: any) => (
              <Card key={`to-${carpool.id}`} className="overflow-hidden">
                <CardHeader className="bg-green-50 p-3">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-9 w-9 bg-green-100 text-green-800">
                      <AvatarFallback>{getInitials(carpool.parentName)}</AvatarFallback>
                    </Avatar>
                    <div>
                      <CardTitle className="text-base">{carpool.parentName}</CardTitle>
                      <CardDescription className="text-xs">
                        {carpool.spacesAvailable} {carpool.spacesAvailable === 1 ? 'space' : 'spaces'} available (plus {carpool.childName})
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-3 text-sm">
                  <div className="flex items-start gap-3 mb-2">
                    <Car className="h-4 w-4 mt-1 text-neutral-500" />
                    <div>
                      <p className="font-medium mb-1">Pickup Information</p>
                      <p className="text-neutral-600 mb-1">
                        Driver will pick up children from their homes.
                      </p>
                      <p className="text-neutral-600">
                        <span className="font-medium">Arrival Time:</span> Approximately 15-20 minutes before party starts
                      </p>
                    </div>
                  </div>
                  <Separator className="my-2" />
                  <div className="flex items-start gap-3">
                    <User className="h-4 w-4 mt-1 text-neutral-500" />
                    <div>
                      <p className="font-medium mb-1">Contact Details</p>
                      <p className="text-neutral-600">{carpool.phoneNumber}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* FROM Party Carpools */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <Badge variant="outline" className="bg-blue-50 text-blue-800 border-blue-200 px-3 py-1">
            <ArrowLeft className="h-4 w-4 mr-1" />
            <span>FROM Party</span>
          </Badge>
          <h3 className="text-lg font-medium text-neutral-700">Dropoff Arrangements</h3>
        </div>

        {fromPartyCarpools.length === 0 ? (
          <Card className="mb-4">
            <CardContent className="p-4 text-center text-neutral-600">
              No carpools available for transportation from the party.
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {fromPartyCarpools.map((carpool: any) => (
                <Card key={`from-${carpool.id}`} className="overflow-hidden">
                  <CardHeader className="bg-blue-50 p-3">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-9 w-9 bg-blue-100 text-blue-800">
                        <AvatarFallback>{getInitials(carpool.parentName)}</AvatarFallback>
                      </Avatar>
                      <div>
                        <CardTitle className="text-base">{carpool.parentName}</CardTitle>
                        <CardDescription className="text-xs">
                          {carpool.returnSpacesAvailable || carpool.spacesAvailable} {(carpool.returnSpacesAvailable || carpool.spacesAvailable) === 1 ? 'space' : 'spaces'} available (plus {carpool.childName})
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-3 text-sm">
                    <div className="flex items-start gap-3 mb-2">
                      <Car className="h-4 w-4 mt-1 text-neutral-500" />
                      <div>
                        <p className="font-medium mb-1">Dropoff Information</p>
                        <div className="flex items-center gap-1 mb-1">
                          {carpool.dropoffPreference === 'direct-home' ? (
                            <HomeIcon className="h-3.5 w-3.5 text-neutral-500" />
                          ) : carpool.dropoffPreference === 'my-home' ? (
                            <HomeIcon className="h-3.5 w-3.5 text-neutral-500" />
                          ) : (
                            <Building className="h-3.5 w-3.5 text-neutral-500" />
                          )}
                          <p className="text-neutral-600">
                            {getDropoffPreferenceDescription(carpool.dropoffPreference || 'not-specified')}
                          </p>
                        </div>
                        {carpool.dropoffPreference === 'direct-home' && carpool.maxDistance && (
                          <p className="text-neutral-600 text-xs ml-4">
                            (Maximum {carpool.maxDistance} miles from driver's location)
                          </p>
                        )}
                        <p className="text-neutral-600 mt-1">
                          <span className="font-medium">Departure Time:</span> Right after the party ends
                        </p>
                      </div>
                    </div>
                    <Separator className="my-2" />
                    <div className="flex items-start gap-3">
                      <User className="h-4 w-4 mt-1 text-neutral-500" />
                      <div>
                        <p className="font-medium mb-1">Contact Details</p>
                        <p className="text-neutral-600">{carpool.phoneNumber}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}