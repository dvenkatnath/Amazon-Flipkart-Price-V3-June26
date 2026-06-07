
import * as XLSX from 'xlsx';
import { ProcessingResult } from '@/types/processing';

export const applyColumnWidths = (worksheet: XLSX.WorkSheet) => {
  const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');
  
  // Set column widths for better visibility
  const colWidths = [];
  for (let i = 0; i <= range.e.c; i++) {
    if (i === range.e.c - 4) { // Amazon_Price column (4th from end)
      colWidths.push({ wch: 15 });
    } else if (i === range.e.c - 3) { // Benchmark_Price column (3rd from end)
      colWidths.push({ wch: 18 });
    } else if (i === range.e.c - 2) { // Remarks column (2nd from end)
      colWidths.push({ wch: 20 });
    } else {
      colWidths.push({ wch: 20 });
    }
  }
  worksheet['!cols'] = colWidths;
};

export const applyColorCoding = (
  worksheet: XLSX.WorkSheet, 
  results: ProcessingResult[]
) => {
  console.log('\n=== Applying Color Coding ===');
  
  if (!worksheet['!ref']) {
    console.log('No worksheet reference found, skipping color coding');
    return;
  }
  
  const range = XLSX.utils.decode_range(worksheet['!ref']);
  console.log(`Worksheet range: ${worksheet['!ref']}, columns: ${range.e.c + 1}, rows: ${range.e.r + 1}`);
  
  // Find the Benchmark_Price column by checking header row
  let benchmarkColIndex = -1;
  
  // Check header row (row 0) for Benchmark_Price column
  for (let col = 0; col <= range.e.c; col++) {
    const headerCellAddress = XLSX.utils.encode_cell({ r: 0, c: col });
    const headerCell = worksheet[headerCellAddress];
    
    if (headerCell && headerCell.v && 
        typeof headerCell.v === 'string' && 
        headerCell.v.toLowerCase().includes('benchmark_price')) {
      benchmarkColIndex = col;
      console.log(`Found Benchmark_Price column at index: ${benchmarkColIndex}`);
      break;
    }
  }
  
  if (benchmarkColIndex === -1) {
    console.log('Could not find Benchmark_Price column, skipping color coding');
    return;
  }
  
  // Apply colors to each result based on priceChange
  results.forEach((result) => {
    const rowIndex = result.row; // This is the 1-based row number from the original data
    const cellAddress = XLSX.utils.encode_cell({ r: rowIndex, c: benchmarkColIndex });
    
    console.log(`Processing row ${rowIndex}: ${result.productName}`);
    
    // Only apply color if Amazon price is available and we have a price change classification
    if (typeof result.amazonPrice === 'number' && result.priceChange) {
      const benchmarkPrice = result.amazonPrice - result.originalPrice;
      
      // Make sure the cell exists with the benchmark price value
      if (!worksheet[cellAddress]) {
        console.log(`Creating cell ${cellAddress} with value ${benchmarkPrice}`);
        worksheet[cellAddress] = { 
          v: benchmarkPrice, 
          t: 'n'
        };
      }
      
      // Apply color using conditional formatting approach that Excel recognizes better
      if (result.priceChange === 'higher') {
        // Higher prices - LIGHT GREEN - using a format Excel will recognize
        worksheet[cellAddress].s = {
          fill: {
            patternType: 'solid',
            fgColor: { rgb: 'C6EFCE' },
            bgColor: { rgb: 'C6EFCE' }
          },
          font: {
            color: { rgb: '006100' }
          },
          numFmt: '#,##0.00'
        };
        console.log(`✅ Applied LIGHT GREEN to ${cellAddress} - Higher price`);
      } else if (result.priceChange === 'lower') {
        // Lower prices - LIGHT RED - using a format Excel will recognize
        worksheet[cellAddress].s = {
          fill: {
            patternType: 'solid',
            fgColor: { rgb: 'FFC7CE' },
            bgColor: { rgb: 'FFC7CE' }
          },
          font: {
            color: { rgb: '9C0006' }
          },
          numFmt: '#,##0.00'
        };
        console.log(`✅ Applied LIGHT RED to ${cellAddress} - Lower price`);
      }
      
      console.log(`Cell ${cellAddress} styling:`, JSON.stringify(worksheet[cellAddress].s));
    } else {
      console.log(`Row ${result.row}: No color coding - price unavailable or no price change classification`);
    }
  });
  
  console.log('Color coding application completed');
};
