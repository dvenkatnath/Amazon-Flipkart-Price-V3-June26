import * as xlsx from 'xlsx';
import * as fs from 'fs';

const workbook = xlsx.readFile('input.xlsx');
const sheetName = workbook.SheetNames[0];
const worksheet = workbook.Sheets[sheetName];
const data = xlsx.utils.sheet_to_json(worksheet);

console.log(`Found ${data.length} rows in input.xlsx`);
if (data.length > 0) {
    const urls = data.slice(0, 3).map(row => row.productUrl || row['Product URL'] || row.URL).filter(Boolean);
    console.log("URLs to test:", urls);
    console.log("First row data:", data[0]);
}
