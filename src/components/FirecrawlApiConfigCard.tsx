import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Eye, EyeOff, Save } from "lucide-react";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { FirecrawlService } from "@/utils/FirecrawlService";

const FirecrawlApiConfigCard = () => {
  const { toast } = useToast();
  const [apiKey, setApiKey] = useState("");
  const [showKey, setShowKey] = useState(false);

  useEffect(() => {
    const existing = FirecrawlService.getApiKey();
    if (existing) setApiKey(existing);
  }, []);

  const handleSave = async () => {
    if (!apiKey.trim()) {
      toast({ title: "Error", description: "API key cannot be empty", variant: "destructive" });
      return;
    }

    FirecrawlService.saveApiKey(apiKey.trim());
    toast({ title: "Saved", description: "Matrix API key saved successfully" });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Matrix API Configuration for Flipkart</CardTitle>
        <CardDescription>
          Set your Matrix API key to enable Flipkart price extraction.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="firecrawlKey">API Key</Label>
          <div className="flex gap-2">
            <Input
              id="firecrawlKey"
              type={showKey ? "text" : "password"}
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="fc_live_xxx..."
            />
            <Button type="button" variant="outline" onClick={() => setShowKey((s) => !s)} aria-label="Toggle API key visibility">
              {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </Button>
          </div>
        </div>

        <Button onClick={handleSave} className="w-full">
          <Save className="h-4 w-4 mr-2" />
          Save API Key
        </Button>
      </CardContent>
    </Card>
  );
};

export default FirecrawlApiConfigCard;
