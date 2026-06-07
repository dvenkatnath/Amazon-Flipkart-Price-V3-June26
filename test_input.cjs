const xlsx = require('xlsx');

const workbook = xlsx.readFile('input.xlsx');
const sheetName = workbook.SheetNames[0];
const worksheet = workbook.Sheets[sheetName];

// Get headers directly
const headers = xlsx.utils.sheet_to_json(worksheet, { header: 1 })[0];
console.log("Actual headers:", headers);

// Find ANY row with a URL
const data = xlsx.utils.sheet_to_json(worksheet, { defval: "" });
console.log("Number of rows:", data.length);
if (data.length > 0) {
    const rowWithUrl = data.find(r =>
        Object.keys(r).some(k =>
            (k.toLowerCase().includes('url') || k.toLowerCase().includes('link')) &&
            r[k].toString().includes('http')
        )
    );
    if (rowWithUrl) {
        console.log("Found row with URL:", rowWithUrl);
    } else {
        console.log("NO URL FOUND IN ANY ROW!");
    }
}
