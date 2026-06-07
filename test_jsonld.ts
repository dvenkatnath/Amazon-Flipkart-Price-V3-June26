import { FirecrawlService } from './src/utils/FirecrawlService.js';
import { DOMParser } from 'xmldom'; // or just use a regex for now if domparser isn't installed

global.localStorage = {
    getItem: () => "fc-5d85427bd03946738cd9cbc8249067d2",
    setItem: () => { }
} as any;

async function test() {
    const url = "https://www.flipkart.com/glen-bread-maker-atta-kneader-fully-automatic-black-3039-3039/p/itmccba051775342";
    const crawl = await FirecrawlService.crawlWebsite(url);
    if (crawl.success && crawl.data) {
        const payload: any = crawl.data;
        const html = payload.data?.[0]?.html;
        if (html) {
            // Just regex the JSON-LD blocks
            const scriptMatches = [...html.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];
            console.log(`Found ${scriptMatches.length} JSON-LD scripts.`);
            for (let i = 0; i < scriptMatches.length; i++) {
                console.log(`\nScript ${i + 1}:`);
                console.log(scriptMatches[i][1].substring(0, 300) + "...");
            }
        }
    }
}

test().catch(console.error);
