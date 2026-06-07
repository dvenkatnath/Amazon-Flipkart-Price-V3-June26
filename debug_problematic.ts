
import xlsx from 'xlsx';
import { extractPricesFromFlipkartApi } from './src/utils/flipkartApiExtractor';
import * as fs from 'fs';

async function main() {
    console.log('--- STARTING TARGETED DEBUG ---');
    const workbook = xlsx.readFile('input .xlsx');
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const allRows = xlsx.utils.sheet_to_json(sheet, { defval: '' }) as any[];

    // User Rows 5, 6, 9, 11, 12, 13
    // Assuming Row 1 is header.
    // Row 5 -> Index 3
    // Row 6 -> Index 4
    // Row 9 -> Index 7
    // Row 11 -> Index 9
    // Row 12 -> Index 10
    // Row 13 -> Index 11
    const indices = [3, 4, 7, 9, 10, 11];

    console.log('Target Indices:', indices);
    const targets = indices.map(i => {
        const row = allRows[i];
        return {
            name: row['Product Name'],
            expectedSellingPrice: row['Selling_price'],
            expectedMrp: row['MRP'],
            index: i
        };
    });

    console.log('Processing Targets:', JSON.stringify(targets, null, 2));

    const items = targets.map(t => ({
        url: '', // Search by name
        productName: t.name
    }));

    console.log('Starting Flipkart extraction...');
    const results = await extractPricesFromFlipkartApi(items as any, (c, t, name) => {
        console.log(`[${c + 1}/${t}] Completed extraction for: ${name}`);
    });

    const finalReport = targets.map(t => {
        const key = t.name;
        const res = results[key];
        return {
            ...t,
            extractedPrice: res?.price,
            extractedUrl: res?.fetchedUrl,
            status: res?.price === 'Not Available' ? 'FAILED' : (res?.price === t.expectedSellingPrice ? 'MATCH' : 'MISMATCH')
        };
    });

    fs.writeFileSync('debug_problematic_results.json', JSON.stringify(finalReport, null, 2));
    console.log('--- DEBUG COMPLETE ---');
    console.table(finalReport);
}

main().catch(console.error);
