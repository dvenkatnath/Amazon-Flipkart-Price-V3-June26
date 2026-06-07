
import * as XLSX from 'xlsx';

export interface ExcelRow {
  productName: string;
  sellingPrice: number;
  productUrl: string;
  asin?: string;
  rowIndex: number;
  existingAmazonPrice?: string | number;
  row: number;
}

export const readExcelFile = async (file: File): Promise<XLSX.WorkBook> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        console.log(`Successfully read Excel file: ${file.name}`);
        console.log(`Sheet names: ${workbook.SheetNames.join(', ')}`);
        resolve(workbook);
      } catch (error) {
        console.error('Error reading Excel file:', error);
        reject(error);
      }
    };
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
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

const shouldProcessRow = (priceValue: any, portal: string): boolean => {
  // Process if price cell is truly empty
  if (isEmptyValue(priceValue)) {
    return true;
  }

  // For Amazon only: process if the cell contains a URL (legacy inputs)
  if (portal === 'amazon') {
    if (isAmazonUrl(priceValue)) {
      return true;
    }
  }

  // Otherwise, don't process (has a valid value or status)
  return false;
};

export const parseExcelRows = (workbook: XLSX.WorkBook, portal: string = 'amazon', settings?: any): ExcelRow[] => {
  const rows: ExcelRow[] = [];
  const portalName = portal.toLowerCase();
  const priceColLabel = portalName === 'flipkart' ? 'Flipkart_Price' : 'Amazon_Price';

  const firstSheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[firstSheetName];

  console.log(`Parsing data from sheet: ${firstSheetName} for portal: ${portalName}`);
  console.log(`Looking for price column: ${priceColLabel}`);
  const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

  console.log(`Raw Excel data preview:`, jsonData.slice(0, 8));

  // Find column indices dynamically
  const headers = jsonData[0] as any[];
  console.log(`Excel headers:`, headers);

  let productNameIndex = -1;
  let sellingPriceIndex = -1;
  let productUrlIndex = -1;
  let asinIndex = -1;
  let priceIndex = -1;

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
      } else if (
        (portalName === 'amazon' && headerStr.includes('amazon') && headerStr.includes('price')) ||
        (portalName === 'flipkart' && headerStr.includes('flipkart') && headerStr.includes('price'))
      ) {
        priceIndex = index;
      }
    });
  }

  // Your file structure mapping
  if (productNameIndex === -1) productNameIndex = 0; // Product Name
  if (asinIndex === -1) asinIndex = 2; // ASIN  
  if (sellingPriceIndex === -1) sellingPriceIndex = 5; // Selling_price
  if (productUrlIndex === -1) productUrlIndex = 6; // Product_URL

  console.log(`Column mapping: Product=${productNameIndex}, ASIN=${asinIndex}, Selling_Price=${sellingPriceIndex}, Product_URL=${productUrlIndex}, ${priceColLabel}=${priceIndex}`);

  // Determine limit based on settings (defaults to 25)
  const rowsToProcess = Math.max(1, Math.min(Number(settings?.rowsToProcess) || 25, 1000));

  // Find the first row that needs processing (first empty price cell for the selected portal)
  let startSearchFromRow = 1; // Skip header
  if (priceIndex !== -1) {
    for (let i = 1; i < jsonData.length; i++) {
      const row = jsonData[i] as any[];
      if (!row || row.length === 0) continue;
      const priceCellValue = row[priceIndex];
      if (shouldProcessRow(priceCellValue, portalName)) {
        startSearchFromRow = i;
        break;
      }
    }
  }

  console.log(`🚀 PROCESSING: Starting from row ${startSearchFromRow + 1}, will process rows where ${priceColLabel} is empty${portalName === 'amazon' ? ' or contains URLs' : ''}`);

  const maxRows = Math.min(jsonData.length, startSearchFromRow + 1000);

  console.log(`🎯 PROCESSING: Scanning rows ${startSearchFromRow + 1} to ${maxRows} for processing eligibility (limit ${rowsToProcess} rows)`);

  for (let i = startSearchFromRow; i < maxRows; i++) {
    if (rows.length >= rowsToProcess) {
      console.log(`⏹️  Reached configured limit of ${rowsToProcess} rows. Stopping scan.`);
      break;
    }
    const row = jsonData[i] as any[];

    // Skip empty rows or rows without product names
    if (!row || row.length === 0 || !row[productNameIndex]) {
      console.log(`⏭️  Row ${i + 1}: Skipping - empty or no product name`);
      continue;
    }

    // Check Price column to determine if row should be processed
    let priceCellValue: any = null;
    let eligibleForProcessing = false;

    if (priceIndex !== -1 && priceIndex < row.length) {
      priceCellValue = row[priceIndex];
      eligibleForProcessing = shouldProcessRow(priceCellValue, portalName);

      if (eligibleForProcessing) {
        if (isEmptyValue(priceCellValue)) {
          console.log(`✅ Row ${i + 1}: ELIGIBLE - ${priceColLabel} is empty`);
        } else if (portalName === 'amazon' && isAmazonUrl(priceCellValue)) {
          console.log(`✅ Row ${i + 1}: ELIGIBLE - ${priceColLabel} contains URL: ${priceCellValue.toString().substring(0, 50)}...`);
        }
      } else {
        console.log(`⏭️  Row ${i + 1}: SKIPPING - ${priceColLabel} has valid value: ${priceCellValue}`);
        continue;
      }
    } else {
      // No price column exists yet - process this row
      eligibleForProcessing = true;
      console.log(`✅ Row ${i + 1}: ELIGIBLE - No ${priceColLabel} column exists`);
    }

    if (!eligibleForProcessing) {
      continue;
    }

    try {
      const productName = row[productNameIndex]?.toString() || `Product ${i}`;
      const priceValue = row[sellingPriceIndex];
      let productUrl = row[productUrlIndex]?.toString() || '';

      // For Amazon: If price cell contains a URL and Product_URL is empty, use it
      if (portalName === 'amazon' && isAmazonUrl(priceCellValue) && !productUrl) {
        productUrl = priceCellValue.toString();
        console.log(`Row ${i + 1}: Using ${priceColLabel} URL as Product_URL: ${productUrl.substring(0, 50)}...`);
      }

      // Extract ASIN from dedicated column or URL
      let asin = '';
      if (asinIndex !== -1 && row[asinIndex]) {
        asin = row[asinIndex].toString().trim();
      } else if (productUrl) {
        const asinMatch = productUrl.match(/\/dp\/([A-Z0-9]{10})|\/gp\/product\/([A-Z0-9]{10})|product\/([A-Z0-9]{10})/);
        asin = asinMatch ? (asinMatch[1] || asinMatch[2] || asinMatch[3]) : '';
      }

      // Parse selling price
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

      console.log(`✅ Row ${i + 1} READY for processing: ${productName} - $${sellingPrice} - ASIN: ${asin}`);

      if (productName && (sellingPrice > 0 || portalName === 'flipkart')) {
        rows.push({
          productName,
          sellingPrice,
          productUrl,
          asin,
          rowIndex: i,
          row: i + 1
        });
      } else {
        console.warn(`⚠️  Skipping row ${i + 1}: missing required data - Product: "${productName}", Price: ${sellingPrice}`);
      }
    } catch (error) {
      console.error(`❌ Error parsing row ${i + 1}:`, error);
    }
  }

  console.log(`\n📊 PROCESSING SUMMARY:`);
  console.log(`- Total rows eligible for processing: ${rows.length}`);
  console.log(`- Row numbers to process: [${rows.map(r => r.row).join(', ')}]`);
  console.log(`- Only rows with empty ${priceColLabel}${portalName === 'amazon' ? ' or URLs in Amazon_Price' : ''} will be processed`);
  console.log(`- Existing ${priceColLabel} values (numbers, 0, NA, unavailable) will be preserved`);

  return rows;
};