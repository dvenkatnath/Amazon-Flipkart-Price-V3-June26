
import * as XLSX from 'xlsx';

export const parseExcelRowsFromStart = (workbook: XLSX.WorkBook) => {
  const rows: any[] = [];

  const firstSheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[firstSheetName];

  console.log(`Parsing fresh file data from sheet: ${firstSheetName}`);

  const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

  // Try to identify column structure from headers
  const headers = jsonData[0] as any[];
  console.log(`Excel headers:`, headers);

  // Find column indices dynamically
  let productNameIndex = -1;
  let sellingPriceIndex = -1;
  let productUrlIndex = -1;
  let asinIndex = -1;

  if (headers) {
    headers.forEach((header, index) => {
      const headerStr = header?.toString().toLowerCase() || '';

      if (headerStr.includes('product') && headerStr.includes('name')) {
        productNameIndex = index;
      } else if (headerStr.includes('selling') && headerStr.includes('price')) {
        sellingPriceIndex = index;
      } else if (headerStr.includes('price') && !headerStr.includes('mrp') && sellingPriceIndex === -1) {
        sellingPriceIndex = index;
      } else if (headerStr.includes('url') || headerStr.includes('link')) {
        productUrlIndex = index;
      } else if (headerStr.includes('asin')) {
        asinIndex = index;
      }
    });
  }

  // Fallback to assumed positions based on your file structure
  if (productNameIndex === -1) productNameIndex = 0; // Product Name
  if (asinIndex === -1) asinIndex = 2; // ASIN column
  if (sellingPriceIndex === -1) sellingPriceIndex = 5; // Selling_price
  if (productUrlIndex === -1) productUrlIndex = 9; // Product_URL (after new columns are inserted)

  console.log(`Column mapping: Product=${productNameIndex}, ASIN=${asinIndex}, Selling_Price=${sellingPriceIndex}, Product_URL=${productUrlIndex}`);

  console.log(`🆕 FRESH FILE PROCESSING: Starting from row 2 (after headers) - processing ALL valid data rows`);

  // Process rows starting from row 2 (index 1) - Skip only header row
  const startRow = 1; // Skip only header row (index 0)
  const maxRows = Math.min(jsonData.length, startRow + 1000); // Process up to 1000 rows

  console.log(`Processing rows ${startRow + 1} to ${maxRows} (Excel row numbers) - STARTING FROM FIRST DATA ROW`);

  for (let i = startRow; i < maxRows; i++) {
    const row = jsonData[i] as any[];

    // Skip empty rows or rows without product names
    if (!row || row.length === 0 || !row[productNameIndex]) {
      console.log(`⏭️  Row ${i + 1}: Skipping - empty or no product name`);
      continue;
    }

    try {
      const productName = row[productNameIndex]?.toString() || `Product ${i}`;
      const priceValue = row[sellingPriceIndex];
      const productUrl = row[productUrlIndex]?.toString() || '';

      // Extract ASIN from dedicated column or URL
      let asin = '';
      if (asinIndex !== -1 && row[asinIndex]) {
        asin = row[asinIndex].toString().trim();
      } else if (productUrl) {
        const asinMatch = productUrl.match(/\/dp\/([A-Z0-9]{10})|\/gp\/product\/([A-Z0-9]{10})|product\/([A-Z0-9]{10})/);
        asin = asinMatch ? (asinMatch[1] || asinMatch[2] || asinMatch[3]) : '';
      }

      // Better price parsing
      let sellingPrice = 0;
      if (priceValue !== undefined && priceValue !== null) {
        if (typeof priceValue === 'number') {
          sellingPrice = priceValue;
        } else {
          const priceStr = priceValue.toString()
            .replace(/[$₹€£¥,\s]/g, '')
            .replace(/[^\d.]/g, '');

          sellingPrice = parseFloat(priceStr);
        }
      }

      console.log(`Row ${i + 1} parsed: ${productName} - $${sellingPrice} - ${productUrl} - ASIN: ${asin}`);

      if (productName) {
        rows.push({
          productName,
          sellingPrice,
          productUrl,
          asin,
          rowIndex: i,
          row: i + 1 // Excel row number (1-based)
        });
        console.log(`✅ Row ${i + 1} ADDED for processing: ${productName} - ASIN: ${asin}`);
      } else {
        console.warn(`⚠️  Skipping row ${i + 1}: missing data - Product: "${productName}", Price: ${sellingPrice}, URL: "${productUrl}", ASIN: "${asin}"`);
      }
    } catch (error) {
      console.error(`❌ Error parsing row ${i + 1}:`, error);
    }
  }

  console.log(`Successfully parsed ${rows.length} valid rows for fresh file processing (starting from first data row)`);
  console.log(`Rows ready for processing: [${rows.map(r => r.row).join(', ')}]`);
  return rows;
};
