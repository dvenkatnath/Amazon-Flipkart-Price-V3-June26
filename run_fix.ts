import xlsx from 'xlsx';
import { extractPricesFromFlipkartApi } from './src/utils/flipkartApiExtractor.js';
import { FirecrawlService } from './src/utils/FirecrawlService.js';

// Setup Mock DOM/localStorage to satisfy FirecrawlService if needed
global.localStorage = {
    getItem: () => "fc-5d85427bd03946738cd9cbc8249067d2",
    setItem: () => { }
} as any;
global.DOMParser = class DOMParser {
    parseFromString() {
        return {
            querySelectorAll: () => [],
            querySelector: () => null
        };
    }
} as any;

async function main() {
    const workbook = xlsx.readFile('input_new.xlsx');
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = xlsx.utils.sheet_to_json(sheet, { defval: "" });

    const urlsToProcess: { url: string; productName?: string }[] = [];
    const rowsToProcess = [];

    for (let i = 0; i < data.length; i++) {
        const row = data[i] as any;
        const pName = row['Product Name'] || row['Item_Name'] || row['Product_Name'] || row['Title'];
        const pUrl = row['Product_URL'] === 'NA' ? '' : (row['Product_URL'] || '');

        if (pName) {
            urlsToProcess.push({ url: pUrl, productName: pName });
            rowsToProcess.push(row);
        }
    }

    console.log(`Found ${urlsToProcess.length} URLs to process with the fixed flipkartApiExtractor.ts...`);

    // Run the batch price extraction using the FIXED logic
    const priceResults = await extractPricesFromFlipkartApi(
        urlsToProcess as any,
        (current, total, url) => console.log(`[${current + 1}/${total}] Processing ${url}`)
    );

    // Update rows
    for (const row of rowsToProcess) {
        const resultItem = priceResults[row['Product_URL'] || row['Product Name']];
        const freshPrice = resultItem?.price;

        if (typeof freshPrice === 'number') {
            row['Flipkart_Price'] = freshPrice;
            if (resultItem?.fetchedUrl && resultItem.fetchedUrl !== row['Product_URL']) {
                row['Product_URL'] = resultItem.fetchedUrl; // Automatically update URL if we discovered it via search
            }
            const sp = typeof row['Selling_price'] === 'number' ? row['Selling_price'] : parseFloat(row['Selling_price']);
            if (!isNaN(sp)) {
                row['Benchmark_Price'] = Math.abs(freshPrice - sp);
                row['Remarks'] = sp > freshPrice ? "Our Price is Higher" : "Our Price is Lower/Match";
            }
        } else if (freshPrice === "Not Available") {
            row['Flipkart_Price'] = "Not Available";
            row['Remarks'] = "Product Mismatch or Not Found";
        } else {
            row['Remarks'] = `Scrape Error: ${freshPrice}`;
        }
    }

    // Write final_output.xlsx
    const newSheet = xlsx.utils.json_to_sheet(data);
    const newWorkbook = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(newWorkbook, newSheet, "Sheet1");
    xlsx.writeFile(newWorkbook, 'final_output_new.xlsx');
    console.log("Generated final_output_new.xlsx using the fixed extractor!");
}

main().catch(console.error);
