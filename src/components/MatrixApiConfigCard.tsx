
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Key, Eye, EyeOff } from "lucide-react";

interface MatrixApiConfigCardProps {
  matrixApiKey: string;
  onApiKeyChange: (key: string) => void;
}

const MatrixApiConfigCard = ({ matrixApiKey, onApiKeyChange }: MatrixApiConfigCardProps) => {
  const [showApiKey, setShowApiKey] = useState(false);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Key className="h-5 w-5 text-green-600" />
          Matrix API configuration for Amazon
        </CardTitle>
        <CardDescription>
          Configure your Matrix API settings for Amazon price extraction
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="matrixApiKey">Matrix API Key</Label>
          <div className="relative">
            <Input
              id="matrixApiKey"
              type={showApiKey ? "text" : "password"}
              value={matrixApiKey}
              onChange={(e) => onApiKeyChange(e.target.value)}
              placeholder="Enter your Matrix API key"
              className="pr-10"
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
              onClick={() => setShowApiKey(!showApiKey)}
            >
              {showApiKey ? (
                <EyeOff className="h-4 w-4 text-gray-500" />
              ) : (
                <Eye className="h-4 w-4 text-gray-500" />
              )}
            </Button>
          </div>
          <div className="text-xs text-muted-foreground">
            Currently configured for amazon.in domain
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default MatrixApiConfigCard;
