import { FirecrawlService } from './src/utils/FirecrawlService.js';
import * as fs from 'fs';

// Setup Mock DOM/localStorage to satisfy FirecrawlService
global.localStorage = {
    getItem: () => "fc-5d85427bd03946738cd9cbc8249067d2",
    setItem: () => { }
} as any;

async function fetchDebug(name: string, filename: string) {
    console.log(`Searching for: ${name}`);
    const url = await FirecrawlService.searchFlipkartUrl(name);
    if (!url) {
        console.log(`Could not find URL for ${name}`);
        return;
    }
    console.log(`Found URL for ${name}: ${url}`);
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

async function main() {
    await fetchDebug('Front Load SERENA MBN 7012', 'serena_7kg_debug.md');
    await fetchDebug('Google Pixel 9 Pro Fold', 'pixel_fold_debug.md');
    await fetchDebug('Front Load EXECUTIVE PLUS VSC 1014', 'exec_10kg_debug.md');
    await fetchDebug('Bajaj Ninja Series Quartz 750W', 'bajaj_juicer_debug.md');
}

main().catch(console.error);
