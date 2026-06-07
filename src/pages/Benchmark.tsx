

import { useState } from "react";
import { FileProcessor } from "@/components/FileProcessor";
import { ProcessingResults } from "@/components/ProcessingResults";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Settings, ArrowLeft } from "lucide-react";
import { ProcessingResult, ProcessingTiming } from "@/types/processing";

const Benchmark = () => {
  const [results, setResults] = useState<ProcessingResult[] | null>(null);
  const [timing, setTiming] = useState<ProcessingTiming | null>(null);

  const handleResultsReady = (newResults: ProcessingResult[], newTiming: ProcessingTiming) => {
    setResults(newResults);
    setTiming(newTiming);
  };

  const resetResults = () => {
    setResults(null);
    setTiming(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4 w-full">
            <Link to="/">
              <Button variant="outline" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Home
              </Button>
            </Link>
            <div className="flex items-center justify-center gap-2 flex-1 ml-8">
              <img 
                src="/lovable-uploads/21797b74-e48b-48e9-bd6d-520b7c0516da.png" 
                alt="Customer Capital Logo" 
                className="h-16 w-auto"
              />
              <h1 className="text-2xl font-bold text-gray-900">Price Benchmarking Tool - Ver 2.0</h1>
            </div>
          </div>
          
          <div className="flex gap-2">
            <Link to="/settings">
              <Button variant="outline">
                <Settings className="h-4 w-4 mr-2" />
                Settings
              </Button>
            </Link>
            {results && (
              <Button onClick={resetResults} variant="outline">
                New Process
              </Button>
            )}
          </div>
        </div>

        <div className="max-w-7xl mx-auto">
          {!results ? (
            <div className="max-w-2xl mx-auto">
              <FileProcessor onResultsReady={handleResultsReady} />
              
              <div className="mt-8 p-6 bg-white rounded-lg shadow-sm border">
                <h3 className="text-lg font-semibold mb-4">How it works:</h3>
                <ol className="list-decimal list-inside space-y-2 text-sm text-gray-600">
                  <li>Configure your Matrix API key in settings</li>
                  <li>Upload an Excel file with product data (ASIN column preferred)</li>
                  <li>The tool processes up to 100 rows and extracts ASINs</li>
                  <li>Real-time prices are fetched using Matrix API</li>
                  <li>Benchmark prices are calculated (Price - Selling price)</li>
                  <li>Results with {'>'}2% difference are color-coded (Green: favorable, Red: unfavorable)</li>
                  <li>Complete file is saved with new Price and Benchmark_Price columns</li>
                  <li>Processing timing is tracked and displayed</li>
                </ol>
              </div>
            </div>
          ) : (
            <ProcessingResults results={results} timing={timing} showOnlyDashboard={true} />
          )}
        </div>

        <footer className="text-center mt-12 py-6 text-sm text-gray-500">
          Powered by Matrix API: Real-time Amazon Price Intelligence
        </footer>
      </div>
    </div>
  );
};

export default Benchmark;

