
import { checkExistingColumns, ColumnCheck } from './fileBackup';
import * as XLSX from 'xlsx';

export interface ProcessingStrategy {
  shouldCreateBackup: boolean;
  startFromFirstRow: boolean;
  needsColumnCreation: boolean;
  backupFileName?: string;
}

export const determineProcessingStrategy = (
  workbook: XLSX.WorkBook, 
  originalFileName: string,
  progressCallback: (current: number, total: number, operation: string) => void,
  settings: any = {}
): ProcessingStrategy => {
  console.log(`\n=== Determining Processing Strategy ===`);
  console.log(`Settings passed: portal=${settings?.portal}`);
  
  progressCallback(2, 100, "Checking existing columns...");
  
  // Check for existing columns
  const columnCheck: ColumnCheck = checkExistingColumns(workbook);
  console.log(`Column check results: Amazon=${columnCheck.hasAmazonPrice}, Flipkart=${columnCheck.hasFlipkartPrice}, Benchmark=${columnCheck.hasBenchmarkPrice}, Remarks=${columnCheck.hasRemarks}, IsProcessed=${columnCheck.isProcessedFile}`);
  
  let strategy: ProcessingStrategy = {
    shouldCreateBackup: false,
    startFromFirstRow: false,
    needsColumnCreation: false
  };
  
  if (columnCheck.isProcessedFile) {
    // Previously processed file - start from first empty {Portal}_Price
    const detectedPortal = columnCheck.hasFlipkartPrice ? 'flipkart' : 'amazon';
    const priceColName = detectedPortal === 'flipkart' ? 'Flipkart_Price' : 'Amazon_Price';
    console.log(`📄 PREVIOUSLY PROCESSED FILE DETECTED`);
    console.log(`- File contains ${priceColName}, Benchmark_Price, and Remarks columns`);
    console.log(`- Will skip rows with existing ${priceColName} values`);
    console.log(`- Will start from first empty ${priceColName} cell`);
    
    strategy = {
      shouldCreateBackup: false,
      startFromFirstRow: false, // Will find first empty price cell
      needsColumnCreation: false
    };
    
  } else {
    // Fresh file without processing columns
    const desiredPortal = (settings?.portal || 'amazon').toLowerCase();
    const desiredPriceCol = desiredPortal === 'flipkart' ? 'Flipkart_Price' : 'Amazon_Price';
    console.log(`📋 FRESH FILE DETECTED`);
    console.log(`- Missing processing columns (${desiredPriceCol}, Benchmark_Price, Remarks)`);
    console.log(`- Will create new columns before Product_URL`);
    console.log(`- Will start processing from row 6 (skipping first 5 empty rows)`);
    
    strategy = {
      shouldCreateBackup: false,
      startFromFirstRow: true, // Start from first data row since all price cells will be empty
      needsColumnCreation: true
    };
  }
  
  const summaryPortal = (settings?.portal || (columnCheck.hasFlipkartPrice ? 'flipkart' : 'amazon')).toLowerCase();
  const summaryPriceCol = summaryPortal === 'flipkart' ? 'Flipkart_Price' : 'Amazon_Price';
  console.log(`\n=== Processing Strategy Selected ===`);
  console.log(`- Create backup: ${strategy.shouldCreateBackup}`);
  console.log(`- Start from first row: ${strategy.startFromFirstRow}`);
  console.log(`- Create columns: ${strategy.needsColumnCreation}`);
  console.log(`- Will skip rows with existing ${summaryPriceCol} values`);
  
  return strategy;
};
