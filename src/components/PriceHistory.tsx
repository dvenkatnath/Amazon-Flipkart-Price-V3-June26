import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Clock, TrendingDown, TrendingUp } from "lucide-react";
import { SearchResult } from "@/types/search";

interface PriceHistoryProps {
  searchResults: SearchResult[];
  onSelectResult: (result: SearchResult) => void;
}

export const PriceHistory = ({ searchResults, onSelectResult }: PriceHistoryProps) => {
  if (searchResults.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-600 mb-2">No Search History</h3>
          <p className="text-gray-500">Your recent price comparisons will appear here.</p>
        </CardContent>
      </Card>
    );
  }

  const getBestPrice = (result: SearchResult) => {
    return Math.min(...result.prices.map(p => p.price + (p.shipping || 0)));
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Search History
          </CardTitle>
        </CardHeader>
      </Card>

      {searchResults.map((result, index) => {
        const bestPrice = getBestPrice(result);
        const priceChange = index < searchResults.length - 1 
          ? bestPrice - getBestPrice(searchResults[index + 1])
          : 0;

        return (
          <Card key={`${result.searchQuery}-${result.timestamp.getTime()}`} className="hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="flex-1">
                  <h3 className="font-semibold text-lg mb-1">{result.productName}</h3>
                  <p className="text-sm text-gray-500 mb-2">
                    Searched on {result.timestamp.toLocaleDateString()} at {result.timestamp.toLocaleTimeString()}
                  </p>
                  <div className="flex items-center gap-3">
                    <Badge variant="outline">
                      {result.prices.length} retailers found
                    </Badge>
                    <div className="flex items-center gap-1 text-sm">
                      <span className="font-medium">Best price: ${bestPrice.toFixed(2)}</span>
                      {priceChange !== 0 && (
                        <span className={`flex items-center gap-1 ${priceChange > 0 ? 'text-red-500' : 'text-green-500'}`}>
                          {priceChange > 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                          ${Math.abs(priceChange).toFixed(2)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                
                <Button 
                  variant="outline"
                  onClick={() => onSelectResult(result)}
                  className="w-full sm:w-auto"
                >
                  View Results
                </Button>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};
