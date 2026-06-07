
import { parseExcelRows } from './excel/excelReader';
import { parseExcelRowsFromStart } from './excel/freshFileProcessor';
import { processExcelFileCore, processValidRows, saveProcessingResults } from './excel/fileProcessor';
import { formatElapsedTime, logProcessingSummary } from './excel/processingUtils';
import { ProcessingResult, ProcessingTiming } from '@/types/processing';

export const processExcelFile = async (
  file: File,
  settings: any,
  progressCallback: (current: number, total: number, operation: string, price?: string | number, productName?: string) => void
): Promise<{ results: ProcessingResult[], timing: ProcessingTiming }> => {
  
  // Step 1-2: Core file processing and strategy determination
  const { workbook, allRowsData, strategy, startTime } = await processExcelFileCore(file, settings, progressCallback);
  
  // Step 3: Parse rows based on strategy
  progressCallback(8, 100, "Analyzing rows for processing...");
  
  let validProductRows;
  const portal = (settings.portal || 'amazon').toLowerCase();
  if (strategy.needsColumnCreation || strategy.startFromFirstRow) {
    console.log(`🆕 FRESH PROCESSING: Starting from first data row (creating new columns or processing fresh file)`);
    validProductRows = parseExcelRowsFromStart(workbook);
  } else {
    const priceCol = portal === 'flipkart' ? 'Flipkart_Price' : 'Amazon_Price';
    console.log(`🔄 INCREMENTAL PROCESSING: Starting from first empty ${priceCol} row`);
    validProductRows = parseExcelRows(workbook, portal, settings);
  }
  
  console.log(`Found ${validProductRows.length} rows ready for processing`);
  
  // Step 4: Create output file structure
  progressCallback(10, 100, "Creating output file structure...");
  
  // Step 5: Process rows for prices
  const results = await processValidRows(validProductRows, settings, progressCallback);
  
  // Step 6: Save results
  const outputFileName = await saveProcessingResults(
    results, 
    settings, 
    workbook, 
    allRowsData, 
    validProductRows.slice(0, Math.min(validProductRows.length, settings.rowsToProcess || 25)).length,
    progressCallback
  );
  
  const endTime = new Date();
  const elapsedMs = endTime.getTime() - startTime.getTime();
  const elapsedTime = formatElapsedTime(elapsedMs);
  
  progressCallback(100, 100, "File processing finished!");
  
  // Log summary
  logProcessingSummary(
    results, 
    allRowsData, 
    strategy, 
    outputFileName, 
    settings.outputPath || '/Users/user/Desktop/Output',
    startTime, 
    endTime
  );
  
  const timing: ProcessingTiming = {
    startTime,
    endTime,
    elapsedTime
  };
  
  return { results, timing };
};

// Re-export types for backward compatibility
export type { ProcessingResult, ProcessingTiming } from '@/types/processing';
