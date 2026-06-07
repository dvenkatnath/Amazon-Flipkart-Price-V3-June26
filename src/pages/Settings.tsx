
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Settings as SettingsIcon } from "lucide-react";
import { Link } from "react-router-dom";
import { getCityPincodes } from "@/utils/matrixApiExtractor";
import FlipkartServiceAlert from "@/components/FlipkartServiceAlert";
import LocationConfigCard from "@/components/LocationConfigCard";
import MatrixApiConfigCard from "@/components/MatrixApiConfigCard";
import AppConfigCard from "@/components/AppConfigCard";
import FirecrawlApiConfigCard from "@/components/FirecrawlApiConfigCard";

interface AppSettings {
  inputPath: string;
  diffPercent: number;
  rowsToProcess: number;
  proxy?: string;
  portal?: string;
  matrixApiKey?: string;
  defaultPincode?: string;
  selectedCity?: string;
}

const Settings = () => {
  const [settings, setSettings] = useState<AppSettings>({
    inputPath: "/Users/user/Desktop/Input",
    diffPercent: 2,
    rowsToProcess: 10,
    proxy: "",
    portal: "amazon",
    matrixApiKey: "DBD1626523264DC5863B0272E2924438",
    defaultPincode: "400001",
    selectedCity: "Mumbai"
  });
  const { toast } = useToast();

  // Get city PIN codes from the utility function
  const cityPincodes = getCityPincodes();

  useEffect(() => {
    // Load settings from localStorage
    const savedSettings = localStorage.getItem('priceBenchmarkSettings');
    if (savedSettings) {
      const parsed = JSON.parse(savedSettings);
      // Set default API key if not present
      if (!parsed.matrixApiKey) {
        parsed.matrixApiKey = "DBD1626523264DC5863B0272E2924438";
      }
      // Set default location if not present
      if (!parsed.defaultPincode) {
        parsed.defaultPincode = "400001";
        parsed.selectedCity = "Mumbai";
      }
      setSettings(parsed);
    }
  }, []);

  const handleSave = () => {
    try {
      if (settings.diffPercent <= 0) {
        throw new Error("Difference % must be positive");
      }
      if (settings.rowsToProcess <= 0) {
        throw new Error("Rows to Process must be a positive integer");
      }
      if (!settings.matrixApiKey?.trim()) {
        throw new Error("Matrix API Key is required");
      }
      if (!settings.defaultPincode?.trim()) {
        throw new Error("PIN code is required");
      }

      localStorage.setItem('priceBenchmarkSettings', JSON.stringify(settings));
      
      toast({
        title: "Settings Saved",
        description: `Settings saved with delivery location: ${settings.selectedCity} (${settings.defaultPincode})`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: (error as Error).message,
        variant: "destructive",
      });
    }
  };

  const updateSetting = (key: keyof AppSettings, value: string | number) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const handleCityChange = (city: string) => {
    const pincode = cityPincodes[city] || "400001";
    setSettings(prev => ({
      ...prev,
      selectedCity: city,
      defaultPincode: pincode
    }));
  };

  const handleCustomPincode = (pincode: string) => {
    // Find if this PIN code matches any city
    const matchingCity = Object.entries(cityPincodes).find(([_, pin]) => pin === pincode)?.[0];
    setSettings(prev => ({
      ...prev,
      defaultPincode: pincode,
      selectedCity: matchingCity || "Custom"
    }));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center gap-4 mb-8">
          <Link to="/">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Home
            </Button>
          </Link>
          <div className="flex items-center gap-3">
            <SettingsIcon className="h-8 w-8 text-blue-600" />
            <h1 className="text-3xl font-bold text-gray-900">Benchmarking Settings</h1>
          </div>
        </div>

        <div className="max-w-2xl mx-auto space-y-6">
          <FlipkartServiceAlert />
          
          <LocationConfigCard
            selectedCity={settings.selectedCity || "Mumbai"}
            defaultPincode={settings.defaultPincode || "400001"}
            cityPincodes={cityPincodes}
            onCityChange={handleCityChange}
            onPincodeChange={handleCustomPincode}
          />

          <MatrixApiConfigCard
            matrixApiKey={settings.matrixApiKey || ""}
            onApiKeyChange={(key) => updateSetting('matrixApiKey', key)}
          />

          <FirecrawlApiConfigCard />

          <AppConfigCard
            inputPath={settings.inputPath}
            diffPercent={settings.diffPercent}
            rowsToProcess={settings.rowsToProcess}
            proxy={settings.proxy || ""}
            portal={settings.portal || "amazon"}
            onInputPathChange={(path) => updateSetting('inputPath', path)}
            onDiffPercentChange={(percent) => updateSetting('diffPercent', percent)}
            onRowsToProcessChange={(rows) => updateSetting('rowsToProcess', rows)}
            onProxyChange={(proxy) => updateSetting('proxy', proxy)}
            onPortalChange={(portal) => updateSetting('portal', portal)}
            onSave={handleSave}
          />
        </div>
      </div>
    </div>
  );
};

export default Settings;
