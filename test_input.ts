import * as xlsx from 'xlsx';
import { extractPricesFromFlipkartApi, extractPriceFromFlipkartApi } from './src/utils/flipkartApiExtractor.js';
import * as fs from 'fs';

const workbook = xlsx.readFile('input.xlsx');
const sheetName = workbook.SheetNames[0];
const worksheet = workbook.Sheets[sheetName];
const data = xlsx.utils.sheet_to_json(worksheet);

console.log(`Found ${data.length} rows in input.xlsx`);
if (data.length > 0) {
  console.log("First row:", data[0]);
  
  // Just print the first 3 URLs
  const urls = data.slice(0, 3).map((row: any) => row.productUrl || row['Product URL'] || row.URL).filter(Boolean);
  console.log("URLs to test:", urls);
}
