
import { findColumnIndices, addMissingColumns, ColumnIndices } from './columnHelpers';

export const processHeaders = (allRowsData: any[][], portal: string = 'amazon'): { 
  headers: any[], 
  columnIndices: ColumnIndices 
} => {
  if (allRowsData.length === 0) {
    return { headers: [], columnIndices: { priceColIndex: undefined, benchmarkColIndex: undefined, remarksColIndex: undefined, productUrlColIndex: undefined } };
  }
  
  const originalHeaders = allRowsData[0] as any[];
  const columnIndices = findColumnIndices(originalHeaders, portal);
  const portalName = portal.charAt(0).toUpperCase() + portal.slice(1);
  
  // Check if all columns exist
  const allColumnsExist = columnIndices.priceColIndex !== undefined && 
                         columnIndices.benchmarkColIndex !== undefined && 
                         columnIndices.remarksColIndex !== undefined && 
                         columnIndices.productUrlColIndex !== undefined;
  
  let finalHeaders: any[];
  let finalIndices: ColumnIndices;
  
  if (allColumnsExist) {
    finalHeaders = [...originalHeaders];
    finalIndices = columnIndices;
    console.log(`Using existing ${portalName}_Price, Benchmark_Price, Remarks, and Product_URL columns`);
  } else {
    const result = addMissingColumns(originalHeaders, columnIndices, portal);
    finalHeaders = result.headers;
    finalIndices = result.indices;
  }
  
  console.log(`Final headers: ${finalHeaders.join(', ')}`);
  console.log(`${portalName}_Price at index: ${finalIndices.priceColIndex}`);
  console.log(`Benchmark_Price at index: ${finalIndices.benchmarkColIndex}`);
  console.log(`Remarks at index: ${finalIndices.remarksColIndex}`);
  console.log(`Product_URL at index: ${finalIndices.productUrlColIndex}`);
  
  return { headers: finalHeaders, columnIndices: finalIndices };
};
