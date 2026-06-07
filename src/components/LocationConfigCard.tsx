
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MapPin } from "lucide-react";

interface LocationConfigCardProps {
  selectedCity: string;
  defaultPincode: string;
  cityPincodes: Record<string, string>;
  onCityChange: (city: string) => void;
  onPincodeChange: (pincode: string) => void;
}

const LocationConfigCard = ({
  selectedCity,
  defaultPincode,
  cityPincodes,
  onCityChange,
  onPincodeChange
}: LocationConfigCardProps) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MapPin className="h-5 w-5 text-blue-600" />
          Delivery Location Configuration
        </CardTitle>
        <CardDescription>
          Select your preferred delivery location for location-based pricing
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="citySelect">Select City</Label>
          <Select
            value={selectedCity}
            onValueChange={onCityChange}
          >
            <SelectTrigger id="citySelect">
              <SelectValue placeholder="Select a city" />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(cityPincodes).map(([city, pincode]) => (
                <SelectItem key={city} value={city}>
                  {city} ({pincode})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="defaultPincode">PIN Code</Label>
          <Input
            id="defaultPincode"
            value={defaultPincode}
            onChange={(e) => onPincodeChange(e.target.value)}
            placeholder="Enter PIN code"
            maxLength={6}
          />
          <div className="text-xs text-muted-foreground">
            Current location: {selectedCity} ({defaultPincode})
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default LocationConfigCard;
