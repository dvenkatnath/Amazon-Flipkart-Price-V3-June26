
import * as XLSX from 'xlsx';
import { generateOutputFileName } from './fileNameGenerator';
import { downloadExcelFile } from './fileOperations';

export interface ColumnCheck {
  hasAmazonPrice: boolean;
  hasFlipkartPrice: boolean;
  hasBenchmarkPrice: boolean;
  hasRemarks: boolean;
  isProcessedFile: boolean;
}

export const checkExistingColumns = (workbook: XLSX.WorkBook): ColumnCheck => {
  const firstSheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[firstSheetName];
  const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
  
  if (jsonData.length === 0) {
    return { hasAmazonPrice: false, hasFlipkartPrice: false, hasBenchmarkPrice: false, hasRemarks: false, isProcessedFile: false };
  }
  
  const headers = jsonData[0] as any[];
  console.log(`🔍 COLUMN CHECK: Checking existing columns in headers: [${headers.join(', ')}]`);
  
  const hasAmazonPrice = headers.some(header => 
    header && header.toString().toLowerCase().includes('amazon_price')
  );
  
  const hasFlipkartPrice = headers.some(header => 
    header && header.toString().toLowerCase().includes('flipkart_price')
  );
  
  const hasBenchmarkPrice = headers.some(header => 
    header && header.toString().toLowerCase().includes('benchmark_price')
  );
  
  const hasRemarks = headers.some(header => 
    header && header.toString().toLowerCase().includes('remarks')
  );
  
  const isProcessedFile = (hasAmazonPrice || hasFlipkartPrice) && hasBenchmarkPrice && hasRemarks;
  
  console.log(`Column check results:`);
  console.log(`- Amazon_Price exists: ${hasAmazonPrice}`);
  console.log(`- Flipkart_Price exists: ${hasFlipkartPrice}`);
  console.log(`- Benchmark_Price exists: ${hasBenchmarkPrice}`);
  console.log(`- Remarks exists: ${hasRemarks}`);
  console.log(`- Is processed file: ${isProcessedFile}`);
  
  return { hasAmazonPrice, hasFlipkartPrice, hasBenchmarkPrice, hasRemarks, isProcessedFile };
};

export const createBackupFile = (
  workbook: XLSX.WorkBook, 
  originalFileName: string, 
  settings: any = {}
): string => {
  console.log(`Creating backup of processed file: ${originalFileName}`);
  
  // Generate backup filename with current naming convention
  const portal = settings.portal || 'amazon';
  const backupFileName = generateOutputFileName(portal);
  console.log(`Backup filename: ${backupFileName}`);
  
  // Create a copy of the workbook for backup
  const backupWorkbook = XLSX.utils.book_new();
  
  // Copy all sheets from original to backup
  workbook.SheetNames.forEach(sheetName => {
    const originalSheet = workbook.Sheets[sheetName];
    // Convert sheet to JSON and ensure it's typed as array of arrays
    const copiedSheetData = XLSX.utils.sheet_to_json(originalSheet, { header: 1 }) as any[][];
    const newSheet = XLSX.utils.aoa_to_sheet(copiedSheetData);
    XLSX.utils.book_append_sheet(backupWorkbook, newSheet, sheetName);
  });
  
  // Download the backup file
  downloadExcelFile(backupWorkbook, backupFileName);
  
  console.log(`✅ Backup file saved as: ${backupFileName}`);
  console.log(`✅ Backup saved to: ${settings.outputPath || 'Default location'}/${backupFileName}`);
  
  return backupFileName;
};
