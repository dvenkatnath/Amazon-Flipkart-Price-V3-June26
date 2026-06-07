
import { Card, CardContent } from "@/components/ui/card";
import { FileSpreadsheet, TrendingUp, TrendingDown } from "lucide-react";
import { ProcessingResult } from "@/types/processing";

interface ResultsSummaryCardsProps {
  results: ProcessingResult[];
}

export const ResultsSummaryCards = ({ results }: ResultsSummaryCardsProps) => {
  const successCount = results.filter(r => r.status === 'success').length;
  const higherPriceCount = results.filter(r => r.priceChange === 'higher').length;
  const lowerPriceCount = results.filter(r => r.priceChange === 'lower').length;

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Total Processed</p>
              <p className="text-2xl font-bold">{results.length}</p>
            </div>
            <FileSpreadsheet className="h-8 w-8 text-blue-600" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Successful</p>
              <p className="text-2xl font-bold text-green-600">{successCount}</p>
            </div>
            <TrendingUp className="h-8 w-8 text-green-600" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Higher Prices</p>
              <p className="text-2xl font-bold text-green-600">{higherPriceCount}</p>
            </div>
            <TrendingUp className="h-8 w-8 text-green-600" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Lower Prices</p>
              <p className="text-2xl font-bold text-red-600">{lowerPriceCount}</p>
            </div>
            <TrendingDown className="h-8 w-8 text-red-600" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
