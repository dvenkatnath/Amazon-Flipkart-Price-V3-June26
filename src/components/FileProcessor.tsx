
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FileSpreadsheet, Settings as SettingsIcon, AlertCircle, AlertTriangle } from "lucide-react";
import { useFileProcessing } from "@/hooks/useFileProcessing";
import { FileUpload } from "@/components/FileUpload";
import { ProcessingProgress } from "@/components/ProcessingProgress";
import { FileProcessorProps } from "@/types/processing";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

export const FileProcessor = ({ onResultsReady }: FileProcessorProps) => {
  const {
    file,
    processing,
    progress,
    currentOperation,
    currentPrice,
    currentProductName,
    timing,
    handleFileSelect,
    processFile,
  } = useFileProcessing(onResultsReady);

  // Check if Matrix API key is configured
  const settingsJson = localStorage.getItem('priceBenchmarkSettings');
  const settings = settingsJson ? JSON.parse(settingsJson) : {};
  const hasApiKey = !!settings.matrixApiKey;

  return (
    <Card>
      <CardHeader className="text-center">
        <CardTitle className="flex items-center justify-center gap-2">
          <FileSpreadsheet className="h-5 w-5" />
          Excel File Processing with Matrix API
        </CardTitle>
        <CardDescription>
          Upload an Excel file to start price benchmarking
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!hasApiKey && (
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-orange-600 mt-0.5" />
              <div className="flex-1">
                <div className="font-medium text-orange-800">API Key Required</div>
                <div className="text-sm text-orange-700 mb-3">
                  Matrix API key is required for price extraction. Please configure it in settings.
                </div>
                <Link to="/settings">
                  <Button size="sm" variant="outline" className="border-orange-300 text-orange-700 hover:bg-orange-100">
                    <SettingsIcon className="h-4 w-4 mr-2" />
                    Configure API Settings
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        )}

        {hasApiKey && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-blue-600 mt-0.5" />
              <div className="flex-1">
                <div className="font-medium text-blue-800">API Status Notice</div>
                <div className="text-sm text-blue-700">
                  If you see "API Payment Required" or "API Account Suspended" errors, please check your Matrix API account status and billing.
                </div>
              </div>
            </div>
          </div>
        )}

        <FileUpload
          file={file}
          processing={processing}
          onFileSelect={handleFileSelect}
          onProcessFile={processFile}
        />

        <ProcessingProgress
          processing={processing}
          progress={progress}
          currentOperation={currentOperation}
          currentPrice={currentPrice}
          currentProductName={currentProductName}
          timing={timing}
        />
      </CardContent>
    </Card>
  );
};
