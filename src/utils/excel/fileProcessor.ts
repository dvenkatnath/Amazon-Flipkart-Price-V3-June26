import * as XLSX from 'xlsx';
import { readExcelFile } from './excelReader';
import { saveResultsToOutput } from './excelWriter';
import { processRowsForPrices } from './priceProcessor';
import { generateOutputFileName } from './fileNameGenerator';
import { determineProcessingStrategy } from './processingStrategy';
import { ProcessingResult, ProcessingTiming } from '@/types/processing';

export interface ProcessingCoreResult {
  workbook: XLSX.WorkBook;
  allRowsData: any[][];
  strategy: any;
  startTime: Date;
}

export const processExcelFileCore = async (
  file: File,
  settings: any,
  progressCallback: (current: number, total: number, operation: string, price?: string | number, productName?: string) => void
): Promise<ProcessingCoreResult> => {
  
  const startTime = new Date();
  console.log(`=== Processing Started at ${startTime.toISOString()} ===`);
  console.log('Starting Excel file processing with strategy detection...');
  
  // Step 1: Read the complete input Excel file
  progressCallback(1, 100, "Reading input Excel file...");
  const workbook = await readExcelFile(file);
  
  // Step 2: Determine processing strategy based on existing columns (NO BACKUP)
  const strategy = determineProcessingStrategy(workbook, file.name, progressCallback, settings);
  
  // Get ALL data from the first sheet
  const firstSheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[firstSheetName];
  const allRowsData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];
  
  console.log(`Complete file contains ${allRowsData.length} total rows (including header)`);
  console.log(`Will skip first 5 empty rows and process from row 6 onwards`);
  
  return { workbook, allRowsData, strategy, startTime };
};

export const processValidRows = async (
  validProductRows: any[],
  settings: any,
  progressCallback: (current: number, total: number, operation: string, price?: string | number, productName?: string) => void
): Promise<ProcessingResult[]> => {
  // Use settings to determine how many rows to process from the starting point
  const rowsToProcess = Math.min(validProductRows.length, settings.rowsToProcess || 25);
  const rowsForProcessing = validProductRows.slice(0, rowsToProcess);
  
  console.log(`Will process ${rowsToProcess} rows as configured in settings`);
  console.log(`Processing Excel rows: ${rowsForProcessing.map(r => r.row).join(', ')}`);
  
  // Get portal setting from the passed settings
  const portal = settings.portal || 'amazon';
  
  // Step 5: Batch process selected rows for prices using selected portal API
  progressCallback(15, 100, `Processing ${rowsToProcess} products using ${portal.toUpperCase()} API...`);
  
  console.log(`Batch processing ${rowsToProcess} product rows for ${portal.toUpperCase()} prices...`);
  
  const batchProgressCallback = (completed: number, total: number, currentItem: string) => {
    const progressPercent = 15 + (completed / total) * 70;
    const itemType = portal === 'flipkart' ? 'URL' : 'ASIN';
    progressCallback(
      progressPercent, 
      100, 
      `Processing ${itemType} ${completed + 1}/${total}: ${currentItem}`,
      undefined,
      `${itemType}: ${currentItem}`
    );
  };
  
  return await processRowsForPrices(rowsForProcessing, settings, batchProgressCallback);
};

export const saveProcessingResults = async (
  results: ProcessingResult[],
  settings: any,
  workbook: XLSX.WorkBook,
  allRowsData: any[][],
  processedRowCount: number,
  progressCallback: (current: number, total: number, operation: string) => void
): Promise<string> => {
  // Step 6: Save complete file with all original rows plus updated columns
  progressCallback(90, 100, "Saving complete file with updates...");
  
  const portal = settings.portal || 'amazon';
  const outputFileName = generateOutputFileName(portal);
  console.log(`Output file will be: ${outputFileName}`);
  
  // Ensure outputPath is properly set
  const outputPath = settings.outputPath || '/Users/user/Desktop/Output';
  console.log(`Using output path: ${outputPath}`);
  
  await saveResultsToOutput(results, outputFileName, outputPath, workbook, allRowsData, processedRowCount, portal);
  
  return outputFileName;
};
