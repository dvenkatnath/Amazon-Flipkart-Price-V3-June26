import xlsx from 'xlsx';

const FIRECRAWL_API_KEY = "fc-5d85427bd03946738cd9cbc8249067d2";

async function delay(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function searchFlipkart(productName: string): Promise<string | null> {
    const cleanName = productName.replace(/[^\w\s]/g, ' ').replace(/\s+/g, ' ').trim();
    const searchUrl = `https://www.flipkart.com/search?q=${encodeURIComponent(cleanName)}`;

    try {
        const resp = await fetch('https://api.firecrawl.dev/v1/scrape', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${FIRECRAWL_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                url: searchUrl,
                formats: ['markdown'],
                onlyMainContent: true
            })
        });

        const result = await resp.json();

        if (result.success && result.data && result.data.markdown) {
            const md = result.data.markdown;
            // Look for paths like /apple-iphone-15-black-128-gb/p/itm... or https://www.flipkart.com/...
            const linkRegex = /\]\((?:https:\/\/www\.flipkart\.com)?\/?([a-zA-Z0-9-]+\/p\/[a-zA-Z0-9]+.*?)\)/g;
            let match;
            while ((match = linkRegex.exec(md)) !== null) {
                const link = match[1];
                if (!link.includes('page=') && link.includes('/p/')) {
                    return `https://www.flipkart.com/${link}`;
                }
            }
        }

    } catch (e: any) {
        console.error(`Error searching ${productName}:`, e.message);
    }
    return null;
}

async function main() {
    console.log("Reading output.xlsx...");
    const workbook = xlsx.readFile('output.xlsx');
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = xlsx.utils.sheet_to_json(sheet, { defval: "" });

    let updated = 0;

    for (let i = 0; i < data.length; i++) {
        const row: any = data[i];
        const existingUrl = row['Product_URL'];

        if (!existingUrl || existingUrl === 'NA' || !existingUrl.startsWith('http')) {
            const productName = row['Product Name'] || row['Item_Name'] || row['Title'];
            console.log(`[${i + 1}/${data.length}] Searching Flipkart directly for: ${productName}`);

            const foundUrl = await searchFlipkart(productName);
            if (foundUrl) {
                console.log(`  -> Found: ${foundUrl}`);
                row['Product_URL'] = foundUrl;
                updated++;
            } else {
                console.log(`  -> Not found.`);
            }
            await delay(1000);
        }
    }

    if (updated > 0) {
        console.log(`Writing to output.xlsx with ${updated} new URLs...`);
        const newSheet = xlsx.utils.json_to_sheet(data);
        const newWorkbook = xlsx.utils.book_new();
        xlsx.utils.book_append_sheet(newWorkbook, newSheet, "Sheet1");
        xlsx.writeFile(newWorkbook, 'output.xlsx');
        console.log("Done! You can now run fix.ts");
    } else {
        console.log("No new URLs found.");
    }
}

main().catch(console.error);
