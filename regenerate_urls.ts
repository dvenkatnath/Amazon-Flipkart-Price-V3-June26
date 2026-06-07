import xlsx from 'xlsx';

const FIRECRAWL_API_KEY = "fc-5d85427bd03946738cd9cbc8249067d2";

async function main() {
    console.log("Reading input.xlsx...");
    const workbook = xlsx.readFile('input.xlsx');
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = xlsx.utils.sheet_to_json(sheet, { defval: "" });

    console.log(`Found ${data.length} rows to search.`);
    for (let i = 0; i < data.length; i++) {
        const row: any = data[i];
        const productName = row['Product Name'] || row['Item_Name'] || row['Title'];

        console.log(`[${i + 1}/${data.length}] Searching Flipkart for: ${productName}`);

        try {
            const response = await fetch('https://api.firecrawl.dev/v1/search', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${FIRECRAWL_API_KEY}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    query: `site:flipkart.com ${productName}`,
                    pageOptions: { fetchPageContent: false }
                })
            });

            const result = await response.json();
            const firstResult = result?.data?.[0]?.url;

            if (firstResult && firstResult.includes('flipkart.com')) {
                row['Product_URL'] = firstResult;
                console.log(`  -> Found: ${firstResult}`);
            } else {
                row['Product_URL'] = "NA";
                console.log(`  -> Not found.`);
            }
        } catch (e: any) {
            row['Product_URL'] = "NA";
            console.log(`  -> Error: ${e.message}`);
        }

        // Small delay
        await new Promise(r => setTimeout(r, 500));
    }

    console.log("Writing to output.xlsx...");
    const newSheet = xlsx.utils.json_to_sheet(data);
    const newWorkbook = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(newWorkbook, newSheet, "Sheet1");
    // Overwrite output.xlsx so run_fix.ts can use it!
    xlsx.writeFile(newWorkbook, 'output.xlsx');
    console.log("Done! Run npx tsx run_fix.ts now.");
}

main().catch(console.error);
