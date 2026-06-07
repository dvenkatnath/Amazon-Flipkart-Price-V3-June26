
export interface ProcessingResult {
  row: number;
  productName: string;
  originalPrice: number;
  amazonPrice: number | string;
  benchmarkPrice: number | null;
  status: 'success' | 'not_found' | 'processing';
  priceChange?: 'higher' | 'lower' | 'similar';
  productUrl: string;
  colorCode?: string;
  asin?: string;
  remarks?: string; // Add remarks field
}

export interface FileProcessorProps {
  onResultsReady: (results: ProcessingResult[], timing: ProcessingTiming) => void;
}

export interface ProcessingState {
  file: File | null;
  processing: boolean;
  progress: number;
  currentOperation: string;
}

export interface ProcessingTiming {
  startTime: Date;
  endTime?: Date;
  elapsedTime?: string;
}
