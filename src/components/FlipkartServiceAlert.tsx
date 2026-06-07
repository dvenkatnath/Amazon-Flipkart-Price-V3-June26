import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Info } from "lucide-react";

const FlipkartServiceAlert = () => {
  return (
    <Alert>
      <Info className="h-4 w-4" />
      <AlertTitle>Flipkart Scraping Enabled</AlertTitle>
      <AlertDescription>
        Flipkart price extraction now uses Matrix API. Please set your Matrix API key in Settings. Location-specific pricing may vary by product.
      </AlertDescription>
    </Alert>
  );
};

export default FlipkartServiceAlert;
