
import { ProcessingResult } from '@/types/processing';
import { ColumnIndices } from './columnHelpers';

export const createResultsMap = (results: ProcessingResult[]): Map<number, ProcessingResult> => {
  const resultsByRow = new Map<number, ProcessingResult>();
  results.forEach(result => {
    resultsByRow.set(result.row, result);
    console.log(`Mapped result for row ${result.row}: ${result.productName}`);
  });
  
  console.log(`Results row numbers: [${Array.from(resultsByRow.keys()).join(', ')}]`);
  return resultsByRow;
};

const isEmptyValue = (value: any): boolean => {
  return value === null || value === undefined || value === '' || 
         (typeof value === 'string' && value.trim() === '');
};

const isAmazonUrl = (value: any): boolean => {
  if (!value) return false;
  const str = value.toString();
  return str.includes('amazon.in') || str.includes('amazon.com');
};

const isFlipkartUrl = (value: any): boolean => {
  if (!value) return false;
  const str = value.toString();
  return str.includes('flipkart.com');
};

const isValidPrice = (value: any): boolean => {
  if (isEmptyValue(value)) return false;
  const str = value.toString().trim();
  
  // Check if it's a numeric value (including 0)
  const numericValue = parseFloat(str.replace(/[^\d.]/g, ''));
  if (!isNaN(numericValue) && numericValue >= 0) {
    return true;
  }
  
  // Check if it's status indicators we should preserve
  if (str === '0' || str.toLowerCase() === 'na' || 
      str.toLowerCase().includes('unavailable')) {
    return true;
  }
  
  return false;
};

export const processDataRow = (
  originalRow: any[],
  excelRowNumber: number,
  result: ProcessingResult | undefined,
  processedRowCount: number,
  columnIndices: ColumnIndices,
  portal: string = 'amazon'
): any[] => {
  // Create new row - copy all original data first
  const newRow: any[] = [...originalRow];
  const portalName = portal.charAt(0).toUpperCase() + portal.slice(1);
  
  // Ensure the row has enough columns to match the new header structure
  const requiredColumns = Math.max(
    (columnIndices.priceColIndex || 0) + 1,
    (columnIndices.benchmarkColIndex || 0) + 1,
    (columnIndices.remarksColIndex || 0) + 1,
    (columnIndices.productUrlColIndex || 0) + 1
  );
  
  while (newRow.length < requiredColumns) {
    newRow.push('');
  }
  
  // Get existing values from the original row
  let priceValue: string = '';
  let benchmarkPriceValue: string = '';
  let remarksValue: string = '';
  let productUrlValue: string = '';
  
  // Check existing price value
  if (columnIndices.priceColIndex !== undefined && originalRow[columnIndices.priceColIndex] !== undefined) {
    const existingPrice = originalRow[columnIndices.priceColIndex];
    
    if (isAmazonUrl(existingPrice) || isFlipkartUrl(existingPrice)) {
      // It's a URL - we should process this row and move URL to Product_URL if needed
      console.log(`Row ${excelRowNumber}: ${portalName}_Price contains URL - will replace with actual price`);
      
      // Move URL to Product_URL if Product_URL is empty
      if (columnIndices.productUrlColIndex !== undefined) {
        const existingProductUrl = originalRow[columnIndices.productUrlColIndex];
        if (isEmptyValue(existingProductUrl)) {
          productUrlValue = existingPrice.toString();
          console.log(`Row ${excelRowNumber}: MOVING URL from ${portalName}_Price to Product_URL`);
        } else {
          productUrlValue = existingProductUrl.toString();
        }
      }
    } else if (isValidPrice(existingPrice)) {
      // It's a valid price or status - preserve it
      priceValue = existingPrice.toString();
      console.log(`Row ${excelRowNumber}: PRESERVING existing ${portalName}_Price: ${priceValue}`);
    }
  }
  
  // Preserve other existing values
  if (columnIndices.benchmarkColIndex !== undefined && originalRow[columnIndices.benchmarkColIndex] !== undefined) {
    const existingBenchmarkPrice = originalRow[columnIndices.benchmarkColIndex];
    if (!isEmptyValue(existingBenchmarkPrice)) {
      benchmarkPriceValue = existingBenchmarkPrice.toString();
      console.log(`Row ${excelRowNumber}: PRESERVING existing Benchmark_Price: ${benchmarkPriceValue}`);
    }
  }
  
  if (columnIndices.remarksColIndex !== undefined && originalRow[columnIndices.remarksColIndex] !== undefined) {
    const existingRemarks = originalRow[columnIndices.remarksColIndex];
    if (!isEmptyValue(existingRemarks)) {
      remarksValue = existingRemarks.toString();
      console.log(`Row ${excelRowNumber}: PRESERVING existing Remarks: ${remarksValue}`);
    }
  }
  
  if (columnIndices.productUrlColIndex !== undefined && originalRow[columnIndices.productUrlColIndex] !== undefined) {
    const existingUrl = originalRow[columnIndices.productUrlColIndex];
    if (!isEmptyValue(existingUrl) && !productUrlValue) {
      productUrlValue = existingUrl.toString();
      console.log(`Row ${excelRowNumber}: PRESERVING existing Product_URL: ${productUrlValue}`);
    }
  }
  
  // Process the result if available (this means we got new data from API)
  if (result) {
    console.log(`Processing Excel row ${excelRowNumber}: Found result for ${result.productName}`);
    
    if (typeof result.amazonPrice === 'number' && result.amazonPrice > 0) {
      // Price available - update with actual price
      priceValue = result.amazonPrice.toString();
      
      // Calculate benchmark price: {Portal}_Price - Selling_Price
      const benchmarkPrice = result.amazonPrice - result.originalPrice;
      benchmarkPriceValue = benchmarkPrice.toString();
      remarksValue = result.remarks || '';
      
      console.log(`Excel row ${excelRowNumber}: NEW DATA - ${portalName} price: $${result.amazonPrice}, Selling price: $${result.originalPrice}, Benchmark: $${benchmarkPrice}, Remarks: ${remarksValue}`);
    } else {
      // Price not available - set to unavailable indicators
      priceValue = '0';
      benchmarkPriceValue = 'NA';
      remarksValue = 'Currently Unavailable';
      
      console.log(`Excel row ${excelRowNumber}: NEW DATA - Price not available - set ${portalName}_Price=0, Benchmark_Price=NA, Remarks=Currently Unavailable`);
    }
    
    // Set Product_URL if not already present and result has URL
    if (!productUrlValue && result.productUrl) {
      productUrlValue = result.productUrl;
      console.log(`Row ${excelRowNumber}: NEW DATA - Using result Product_URL: ${productUrlValue}`);
    }
  } else {
    console.log(`Excel row ${excelRowNumber}: Not processed - keeping existing values`);
  }
  
  // Update column values at their respective indices
  if (columnIndices.priceColIndex !== undefined) {
    newRow[columnIndices.priceColIndex] = priceValue;
  }
  if (columnIndices.benchmarkColIndex !== undefined) {
    newRow[columnIndices.benchmarkColIndex] = benchmarkPriceValue;
  }
  if (columnIndices.remarksColIndex !== undefined) {
    newRow[columnIndices.remarksColIndex] = remarksValue;
  }
  if (columnIndices.productUrlColIndex !== undefined) {
    newRow[columnIndices.productUrlColIndex] = productUrlValue;
  }
  
  return newRow;
};
