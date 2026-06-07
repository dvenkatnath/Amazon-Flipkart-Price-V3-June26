
import { ResultsSummaryCards } from "@/components/ResultsSummaryCards";
import { ResultsTable } from "@/components/ResultsTable";
import { ProcessingResult, ProcessingTiming } from "@/types/processing";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle, FileSpreadsheet, Clock, Timer, Calendar } from "lucide-react";

interface ProcessingResultsProps {
  results: ProcessingResult[];
  timing?: ProcessingTiming | null;
  showOnlyDashboard?: boolean;
}

export const ProcessingResults = ({ results, timing, showOnlyDashboard = false }: ProcessingResultsProps) => {
  // Get settings to show output path
  const settingsJson = localStorage.getItem('priceBenchmarkSettings');
  const settings = settingsJson ? JSON.parse(settingsJson) : { outputPath: '/Users/user/Desktop/Output' };
  
  // Generate the output filename that was created
  const now = new Date();
  const year = now.getFullYear().toString().slice(-2);
  const month = (now.getMonth() + 1).toString().padStart(2, '0');
  const day = now.getDate().toString().padStart(2, '0');
  const hours = now.getHours().toString().padStart(2, '0');
  const minutes = now.getMinutes().toString().padStart(2, '0');
  const seconds = now.getSeconds().toString().padStart(2, '0');
  const outputFileName = `AMZ_${year}_${month}_${day}_${hours}${minutes}${seconds}.xlsx`;

  const formatTime = (date: Date | undefined) => {
    if (!date) return "Not available";
    return date.toLocaleString();
  };

  return (
    <div className="space-y-6">
      {/* Timing Information Card */}
      {timing && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Timer className="h-5 w-5 text-blue-600" />
              Processing Timing Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Calendar className="h-4 w-4 text-blue-600" />
                  <span className="font-medium text-blue-800">Start Time</span>
                </div>
                <div className="font-mono text-sm text-blue-700">
                  {formatTime(timing.startTime)}
                </div>
              </div>
              
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="h-4 w-4 text-green-600" />
                  <span className="font-medium text-green-800">End Time</span>
                </div>
                <div className="font-mono text-sm text-green-700">
                  {formatTime(timing.endTime)}
                </div>
              </div>
              
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Timer className="h-4 w-4 text-purple-600" />
                  <span className="font-medium text-purple-800">Total Elapsed</span>
                </div>
                <div className="font-mono text-lg font-bold text-purple-700">
                  {timing.elapsedTime || "Calculating..."}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Summary Cards */}
      <ResultsSummaryCards results={results} />

      {/* Auto-save Confirmation */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <CheckCircle className="h-6 w-6 text-green-600" />
            <div>
              <CardTitle className="text-green-700">Processing Complete - File Saved Automatically</CardTitle>
              <CardDescription>
                Results have been automatically saved with Amazon_Price and Benchmark_Price columns
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <FileSpreadsheet className="h-5 w-5 text-green-600 mt-0.5" />
              <div className="space-y-2">
                <div className="font-medium text-green-800">Output File Details:</div>
                <div className="text-sm text-green-700 space-y-1">
                  <div><strong>File:</strong> {outputFileName}</div>
                  <div><strong>Format:</strong> XLSX with color-coded cells (Green: {'>'}2% favorable, Red: {'<'}2% unfavorable)</div>
                  <div><strong>API:</strong> Matrix API for real-time Amazon pricing</div>
                </div>
              </div>
            </div>
          </div>
          
          <div className="mt-4 p-4 bg-gray-50 rounded-lg">
            <h4 className="font-medium mb-2 text-gray-700">File Structure:</h4>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• All original Excel data preserved</li>
              <li>• Amazon_Price column inserted before Product URL</li>
              <li>• Benchmark_Price column inserted before Product URL</li>
              <li>• Color coding: GREEN ({'>'}2% favorable), RED ({'<'}2% unfavorable), No color (within 2%)</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* Conditionally render results table */}
      {!showOnlyDashboard && (
        <ResultsTable results={results} />
      )}
    </div>
  );
};
