
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface SearchFormProps {
  onSearch: (query: string) => void;
  isLoading: boolean;
}

export const SearchForm = ({ onSearch, isLoading }: SearchFormProps) => {
  const [query, setQuery] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      onSearch(query.trim());
    }
  };

  const popularSearches = [
    "iPhone 15 Pro",
    "Samsung Galaxy S24",
    "Nintendo Switch",
    "AirPods Pro",
    "MacBook Air M3"
  ];

  return (
    <Card className="w-full max-w-4xl mx-auto shadow-lg">
      <CardContent className="p-6">
        <form onSubmit={handleSubmit} className="flex gap-4 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
            <Input
              type="text"
              placeholder="Enter product name (e.g., iPhone 15, Samsung TV, Nike Air Max...)"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-10 h-12 text-lg"
              disabled={isLoading}
            />
          </div>
          <Button 
            type="submit" 
            disabled={!query.trim() || isLoading}
            className="h-12 px-8 text-lg"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin mr-2" />
                Searching...
              </>
            ) : (
              <>
                <Search className="h-5 w-5 mr-2" />
                Compare Prices
              </>
            )}
          </Button>
        </form>

        <div className="space-y-3">
          <h3 className="text-sm font-medium text-gray-700">Popular Searches:</h3>
          <div className="flex flex-wrap gap-2">
            {popularSearches.map((search) => (
              <button
                key={search}
                onClick={() => !isLoading && onSearch(search)}
                disabled={isLoading}
                className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {search}
              </button>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
