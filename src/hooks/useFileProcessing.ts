
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { processExcelFile } from "@/utils/excelProcessor";
import { FirecrawlService } from "@/utils/FirecrawlService";
import { ProcessingResult, ProcessingState, ProcessingTiming } from "@/types/processing";

export const useFileProcessing = (onResultsReady: (results: ProcessingResult[], timing: ProcessingTiming) => void) => {
  const [state, setState] = useState<ProcessingState>({
    file: null,
    processing: false,
    progress: 0,
    currentOperation: "",
  });
  const [currentPrice, setCurrentPrice] = useState<string | number | undefined>();
  const [currentProductName, setCurrentProductName] = useState<string | undefined>();
  const [timing, setTiming] = useState<ProcessingTiming | undefined>();
  const { toast } = useToast();

  const setFile = (file: File | null) => {
    setState(prev => ({ ...prev, file }));
  };

  const setProcessing = (processing: boolean) => {
    setState(prev => ({ ...prev, processing }));
    if (!processing) {
      setCurrentPrice(undefined);
      setCurrentProductName(undefined);
    }
  };

  const setProgress = (progress: number) => {
    setState(prev => ({ ...prev, progress }));
  };

  const setCurrentOperation = (currentOperation: string) => {
    setState(prev => ({ ...prev, currentOperation }));
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      // Check if it's an Excel file
      const validExtensions = ['.xlsx', '.xls', '.csv'];
      const fileExtension = selectedFile.name.toLowerCase().substring(selectedFile.name.lastIndexOf('.'));
      
      if (validExtensions.includes(fileExtension)) {
        setFile(selectedFile);
        toast({
          title: "Excel File Selected",
          description: `Selected file: ${selectedFile.name}`,
        });
      } else {
        toast({
          title: "Invalid File Type",
          description: "Please select an Excel file (.xlsx, .xls, or .csv)",
          variant: "destructive",
        });
      }
    }
  };

  const processFile = async () => {
    if (!state.file) return;

    // Check for API key based on selected portal
    const settingsJson = localStorage.getItem('priceBenchmarkSettings');
    const settings = settingsJson ? JSON.parse(settingsJson) : {};
    const portal = settings.portal || 'amazon';
    
    if (portal === 'amazon' && !settings.matrixApiKey) {
      toast({
        title: "API Key Missing",
        description: "Please configure your Matrix API key in settings before processing.",
        variant: "destructive",
      });
      return;
    }

    if (portal === 'flipkart' && !FirecrawlService.getApiKey()) {
      toast({
        title: "Matrix API Key Missing",
        description: "Please configure your Matrix API key in settings before processing Flipkart products.",
        variant: "destructive",
      });
      return;
    }

    const startTime = new Date();
    setTiming({ startTime });
    setProcessing(true);
    setProgress(0);

    try {
      const progressCallback = (
        current: number, 
        total: number, 
        operation: string, 
        price?: string | number, 
        productName?: string
      ) => {
        setProgress((current / total) * 100);
        setCurrentOperation(operation);
        if (price !== undefined) setCurrentPrice(price);
        if (productName !== undefined) setCurrentProductName(productName);
      };

      const { results, timing: processedTiming } = await processExcelFile(state.file, settings, progressCallback);
      
      setTiming(processedTiming);
      onResultsReady(results, processedTiming);
      
      const successCount = results.filter(r => r.status === 'success').length;
      const portal = settings.portal || 'amazon';
      toast({
        title: "Processing Complete",
        description: `Successfully processed ${successCount} of ${results.length} items using ${portal.toUpperCase()} API`,
      });

    } catch (error) {
      console.error('Processing error:', error);
      toast({
        title: "Processing Error",
        description: (error as Error).message,
        variant: "destructive",
      });
      
      // Update timing even on error
      setTiming(prev => prev ? { ...prev, endTime: new Date() } : undefined);
    } finally {
      setProcessing(false);
      setProgress(0);
      setCurrentOperation("");
    }
  };

  return {
    ...state,
    currentPrice,
    currentProductName,
    timing,
    handleFileSelect,
    processFile,
  };
};
