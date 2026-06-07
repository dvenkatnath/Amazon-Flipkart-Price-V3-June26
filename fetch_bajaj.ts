import { FirecrawlService } from './src/utils/FirecrawlService.js';
import * as fs from 'fs';

// Setup Mock DOM/localStorage to satisfy FirecrawlService
global.localStorage = {
    getItem: () => "fc-5d85427bd03946738cd9cbc8249067d2",
    setItem: () => { }
} as any;

async function fetchOne(name: string, filename: string) {
    console.log(`Searching for: ${name}`);
    const url = await FirecrawlService.searchFlipkartUrl(name);
    console.log(`Found URL: ${url}`);
    if (!url) return;
    const pincode = "600001";
    const crawl = await FirecrawlService.crawlWebsite(url + "&pincode=" + pincode);
    if (crawl.success && crawl.data) {
        const payload: any = crawl.data;
        const md = payload.data?.[0]?.markdown;
        if (md) {
            fs.writeFileSync(filename, md, 'utf-8');
            console.log(`Wrote markdown to ${filename}`);
        }
    }
}

fetchOne('Bajaj Ninja Series Quartz 750W', 'bajaj_final_debug.md').catch(console.error);
