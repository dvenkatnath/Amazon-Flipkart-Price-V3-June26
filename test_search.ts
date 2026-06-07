import { FirecrawlService } from './src/utils/FirecrawlService.js';

// Setup Mock DOM/localStorage to satisfy FirecrawlService if needed
global.localStorage = {
    getItem: () => "fc-5d85427bd03946738cd9cbc8249067d2",
    setItem: () => { }
} as any;

async function main() {
    const pName = 'Front Load SERENA MBN 7012';
    console.log(`Searching for: ${pName}`);
    const url = await FirecrawlService.searchFlipkartUrl(pName);
    console.log("Result URL:", url);
}

main().catch(console.error);
