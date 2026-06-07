
import * as XLSX from 'xlsx';
import { ProcessingResult } from '@/types/processing';
import { downloadExcelFile } from './fileOperations';
import { applyColumnWidths, applyColorCoding } from './excelFormatting';
import { createExcelDataStructure, logProcessingSummary } from './dataTransformation';

export const saveResultsToOutput = async (
  results: ProcessingResult[], 
  fileName: string, 
  outputPath: string,
  originalWorkbook: XLSX.WorkBook,
  allRowsData: any[][],
  processedRowCount: number,
  portal: string = 'amazon'
) => {
  console.log(`\n=== Saving Complete File ===`);
  console.log(`Output file: ${outputPath}/${fileName}`);
  const portalName = portal.charAt(0).toUpperCase() + portal.slice(1);
  console.log(`Format: XLSX with ${portalName}_Price and Benchmark_Price columns`);
  console.log(`Total rows in file: ${allRowsData.length}`);
  console.log(`Processed rows: ${processedRowCount}`);
  
  try {
    // Create a new workbook
    const newWorkbook = XLSX.utils.book_new();
    
    // Create new data structure with additional columns
    const newData = createExcelDataStructure(results, allRowsData, processedRowCount, portal);
    
    // Create worksheet from new data
    const newSheet = XLSX.utils.aoa_to_sheet(newData);
    
    // Apply formatting
    applyColumnWidths(newSheet);
    applyColorCoding(newSheet, results);
    
    // Add sheet to workbook
    XLSX.utils.book_append_sheet(newWorkbook, newSheet, 'Results');
    
    // Download the file
    downloadExcelFile(newWorkbook, fileName);
    
    // Log summary
    logProcessingSummary(results, allRowsData, processedRowCount, fileName, portal);
    
  } catch (error) {
    console.error('Error saving complete results file:', error);
    throw error;
  }
};
