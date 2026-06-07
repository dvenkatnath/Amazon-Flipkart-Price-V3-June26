import * as fs from 'fs';

function extractBetterPriceFromMarkdown(md: string): number | string {
    const inRange = (v: number) => v >= 999 && v <= 5_000_000;
    const lines = md.split(/\r?\n/);

    // Strategy: find the first line that starts with '# ' (H1 product title)
    // Then scan forward for the first valid price
    let titleIndex = -1;
    for (let i = 0; i < lines.length; i++) {
        if (lines[i].trim().startsWith('# ')) {
            titleIndex = i;
            break;
        }
    }

    // If we couldn't find an H1, fallback to searching the whole file for the FIRST occurrence of a large standalone numeric price.
    let startIndex = titleIndex >= 0 ? titleIndex : 0;

    for (let i = startIndex; i < lines.length; i++) {
        const line = lines[i];
        if (!line) continue;

        // Match a price on this line. Examples: "₹1,72,999", "Buy at ₹1,68,999"
        const m = line.match(/(?:₹|&#8377;|Rs\.?)+\s*([\d,]+(?:\.\d{1,2})?)/i);
        if (m && m[1]) {
            const v = parseFloat(m[1].replace(/,/g, ''));
            if (!isNaN(v) && inRange(v)) {
                return v;
            }
        }
    }

    return "Not Available";
}

const md = fs.readFileSync('pixel_debug.md', 'utf-8');
console.log("Extracted:", extractBetterPriceFromMarkdown(md));
