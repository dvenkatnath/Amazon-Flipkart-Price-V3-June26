import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Star, ExternalLink, Truck, AlertCircle } from "lucide-react";
import { SearchResult } from "@/types/search";

interface PriceResultsProps {
  searchResult: SearchResult;
}

export const PriceResults = ({ searchResult }: PriceResultsProps) => {
  const { productName, prices } = searchResult;
  
  // Sort prices by total cost (price + shipping)
  const sortedPrices = [...prices].sort((a, b) => {
    const totalA = a.price + (a.shipping || 0);
    const totalB = b.price + (b.shipping || 0);
    return totalA - totalB;
  });

  const lowestPrice = sortedPrices[0];
  const highestPrice = sortedPrices[sortedPrices.length - 1];
  const savings = (highestPrice.price + (highestPrice.shipping || 0)) - (lowestPrice.price + (lowestPrice.shipping || 0));

  const getAvailabilityColor = (availability: string) => {
    switch (availability) {
      case 'in-stock':
        return 'bg-green-100 text-green-800';
      case 'limited':
        return 'bg-yellow-100 text-yellow-800';
      case 'out-of-stock':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatAvailability = (availability: string) => {
    switch (availability) {
      case 'in-stock':
        return 'In Stock';
      case 'limited':
        return 'Limited Stock';
      case 'out-of-stock':
        return 'Out of Stock';
      default:
        return 'Unknown';
    }
  };

  return (
    <div className="space-y-6">
      <Card className="bg-gradient-to-r from-green-50 to-emerald-50 border-green-200">
        <CardHeader>
          <CardTitle className="text-2xl text-green-800">
            Results for "{productName}"
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-sm text-gray-600">Best Price</p>
              <p className="text-2xl font-bold text-green-600">
                ${(lowestPrice.price + (lowestPrice.shipping || 0)).toFixed(2)}
              </p>
              <p className="text-sm text-gray-500">at {lowestPrice.retailer}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Price Range</p>
              <p className="text-lg font-semibold">
                ${sortedPrices[0].price.toFixed(2)} - ${sortedPrices[sortedPrices.length - 1].price.toFixed(2)}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Max Savings</p>
              <p className="text-2xl font-bold text-blue-600">
                ${savings.toFixed(2)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4">
        {sortedPrices.map((price, index) => (
          <Card key={price.id} className={index === 0 ? "ring-2 ring-green-500 shadow-lg" : ""}>
            <CardContent className="p-6">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-xl font-semibold">{price.retailer}</h3>
                    {index === 0 && (
                      <Badge className="bg-green-500 text-white">Best Deal</Badge>
                    )}
                    <Badge className={getAvailabilityColor(price.availability)}>
                      {formatAvailability(price.availability)}
                    </Badge>
                  </div>
                  
                  <div className="flex items-center gap-4 text-sm text-gray-600 mb-2">
                    {price.rating && (
                      <div className="flex items-center gap-1">
                        <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                        <span>{price.rating}/5</span>
                      </div>
                    )}
                    <div className="flex items-center gap-1">
                      <Truck className="h-4 w-4" />
                      <span>
                        {price.shipping === 0 ? 'Free Shipping' : `$${price.shipping?.toFixed(2)} shipping`}
                      </span>
                    </div>
                  </div>
                  
                  <p className="text-xs text-gray-500">
                    Last updated: {price.lastUpdated.toLocaleString()}
                  </p>
                </div>

                <div className="flex flex-col lg:flex-row items-start lg:items-center gap-4">
                  <div className="text-right">
                    <p className="text-3xl font-bold">${price.price.toFixed(2)}</p>
                    {price.shipping && price.shipping > 0 && (
                      <p className="text-sm text-gray-500">+ ${price.shipping.toFixed(2)} shipping</p>
                    )}
                    <p className="text-lg font-semibold text-gray-700">
                      Total: ${(price.price + (price.shipping || 0)).toFixed(2)}
                    </p>
                  </div>
                  
                  <Button 
                    className="w-full lg:w-auto"
                    disabled={price.availability === 'out-of-stock'}
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    View Deal
                  </Button>
                </div>
              </div>
              
              {price.availability === 'out-of-stock' && (
                <div className="mt-4 flex items-center gap-2 text-red-600 bg-red-50 p-3 rounded-lg">
                  <AlertCircle className="h-5 w-5" />
                  <span className="text-sm">This item is currently out of stock at this retailer.</span>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};
