import { extractPriceFromFlipkartApi } from './src/utils/flipkartApiExtractor.js';
import { FirecrawlService } from './src/utils/FirecrawlService.js';
import * as fs from 'fs';

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
    // Testing the google pixel URL
    const url = "https://www.flipkart.com/google-pixel-9-pro-fold-obsidian-256-gb/p/itmf2257436fd888?pid=MOBH2HJGBGAWCUGE";
    const pincode = "600001";

    console.log(`Testing: ${url} with pincode ${pincode}`);
    const crawl = await FirecrawlService.crawlWebsite(url + "&pincode=" + pincode);
    if (crawl.success && crawl.data) {
        const payload: any = crawl.data;
        const md = payload.data?.[0]?.markdown;
        if (md) {
            fs.writeFileSync('pixel_debug.md', md, 'utf-8');
            console.log("Wrote markdown to pixel_debug.md");
        }
    }

    const price = await extractPriceFromFlipkartApi(url, pincode, "Google Pixel 9 Pro Fold");
    console.log("Final Price:", price);
}

main().catch(console.error);
