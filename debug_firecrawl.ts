import * as fs from 'fs';

const FIRECRAWL_API_KEY = "fc-5d85427bd03946738cd9cbc8249067d2";

async function debug() {
    const q = encodeURIComponent("Apple iPhone 15 (128 GB, Black)");
    console.log(`Searching for: ${q}`);
    const resp = await fetch('https://api.firecrawl.dev/v1/scrape', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${FIRECRAWL_API_KEY}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            url: `https://www.flipkart.com/search?q=${q}`,
            formats: ['markdown'],
            onlyMainContent: true
        })
    });

    const result = await resp.json();
    fs.writeFileSync('debug_markdown.md', result?.data?.markdown || "No markdown");
    console.log("Wrote to debug_markdown.md");
}

debug().catch(console.error);
