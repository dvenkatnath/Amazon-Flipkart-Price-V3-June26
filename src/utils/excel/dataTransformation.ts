
import { ProcessingResult } from '@/types/processing';
import { processHeaders } from './headerProcessor';
import { createResultsMap, processDataRow } from './rowProcessor';
import { logProcessingSummary } from './summaryLogger';

export const createExcelDataStructure = (
  results: ProcessingResult[], 
  allRowsData: any[][],
  processedRowCount: number,
  portal: string = 'amazon'
): any[][] => {
  console.log(`Creating Excel data structure with ${allRowsData.length} total rows`);
  console.log(`Processing results for ${results.length} processed rows`);
  
  const newData: any[][] = [];
  
  // Process headers first
  const { headers, columnIndices } = processHeaders(allRowsData, portal);
  newData.push(headers);
  
  // Create a map of row numbers to results for faster lookup
  const resultsByRow = createResultsMap(results);
  
  // Process all data rows
  for (let i = 1; i < allRowsData.length; i++) {
    const originalRow = allRowsData[i] as any[] || [];
    
    // The actual Excel row number is i + 1 (because allRowsData[0] is header)
    const excelRowNumber = i + 1;
    const result = resultsByRow.get(excelRowNumber);
    
    const newRow = processDataRow(
      originalRow,
      excelRowNumber,
      result,
      processedRowCount,
      columnIndices,
      portal
    );
    
    newData.push(newRow);
  }
  
  console.log(`\n=== Data Structure Creation Complete ===`);
  console.log(`Total rows in output: ${newData.length}`);
  console.log(`Results mapped: ${resultsByRow.size}`);
  
  return newData;
};

export { logProcessingSummary };
