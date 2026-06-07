import xlsx from 'xlsx';

const urls = [
    "https://www.flipkart.com/casio-mtp-1302da-7avdf-enticer-men-analog-watch/p/itm9b3b563bde883?pid=WATHGXZJSEFXPBXS&marketplace=FLIPKART",
    "https://www.flipkart.com/marq-flipkart-2026-model-1-ton-3-star-split-inverter-5-in-1-convertible-turbo-cool-technology-ac/p/itmf09b29ad1d248?pid=ACNHGCG5KXYME36M&marketplace=FLIPKART&q=Samsung+AR50F18D1XH+1.5+Ton+3+Star+Inverter+Split+AC",
    "https://www.flipkart.com/samsung-2023-model-1-5-ton-3-star-split-inverter-wi-fi-ac/p/itm1cf9c083a4548?pid=ACNHBYHDBTFTVTHY&lid=LSTACNHBYHDBTFTVTHYNXIROZ&marketplace=FLIPKART&q=Samsung+AR50F19D1XH+1.5+Ton+3+Star+2025+Inverter+Split+AC&store=j9e%2Fabm%2Fc54&srno=s_1_1&otracker=search&fm=organic&iid=3b803123-eb20-476c-95bd-17098902a3d9.ACNHBYHDBTFTVTHY.SEARCH&ppt=None&ppn=None&ssid=q69lpl4v4g0000001773909329676&qH=c9ca27d80442d260&ov_redirect=true",
    "https://www.flipkart.com/lg-20-l-i-wave-technology-health-plus-indian-cuisine-solo-microwave-oven/p/itmf3rygebb6pbk7?pid=MRCF2UQHF5FPDXGP&marketplace=FLIPKART",
    "https://www.flipkart.com/samsung-galaxy-s25-edge-5g-titanium-silver-256-gb/p/itm58d92f4e3af14?pid=MOBHBXJHADAZRFQJ&marketplace=FLIPKART&ov_redirect=true",
    "https://www.flipkart.com/samsung-galaxy-s25-edge-5g-titanium-jetblack-256-gb/p/itmc91f3f202a90f?pid=MOBHBXJHFGGJFW5C&lid=LSTMOBHBXJHFGGJFW5CLKP407&marketplace=FLIPKART&q=Samsung+Galaxy+S25+Edge+5G+%2812+GB+RAM%29+%28256+GB%2C+Titanium+JetBlack%29&store=tyy%2F4io&srno=s_1_1&otracker=search&fm=organic&iid=8f635389-2634-4b98-bb97-4c0f8c6b4298.MOBHBXJHFGGJFW5C.SEARCH&ppt=None&ppn=None&ssid=1h88xemi9s0000001773906259566&qH=21db44024d875bcc&ov_redirect=true",
    "https://www.flipkart.com/samsung-galaxy-s24-exynos-5g-onyx-black-512-gb/p/itm8915b78ddf95a?pid=MOBGX2F3FEUH6PKS&marketplace=FLIPKART&q=Samsung+Galaxy+S24+5G+%288+GB+RAM%29+%28512+GB%2C+Onxy+Black%29&store=tyy%2F4io&srno=s_1_1&otracker=search&fm=organic&iid=111ae851-7a78-41f5-a3f4-bc7fb6cf0ef4.MOBGX2F3FEUH6PKS.SEARCH&ppt=None&ppn=None&ssid=te7ump52kg0000001773827919752&qH=10aec55159d06e48&ov_redirect=true",
    "https://www.flipkart.com/qubo-smart-air-purifier-q200-200-sqft-hepa-13-app-voice-control-room/p/itm37552517f58d6?pid=APFGVYTYAHANWGZZ&lid=LSTAPFGVYTYAHANWGZZFB5UM8&marketplace=FLIPKART&q=Dyson+Cool+Gen1+TP10+Air+Purifier&store=j9e%2Fabm%2F3o4&srno=s_1_1&otracker=search&fm=organic&iid=en_QikQ63mPWdy4-40IxLFx91X5zhp2ffmKE7JroSJp11hR83hNFk7YuyPk2hn6obdOUKAcgyXdyjD1ox0RQYdrO04IsYyWu-Pj9cxFjFAoaLk%3D&ppt=None&ppn=None&ssid=ko92wsekzk0000001773828077807&qH=07ca020065b53ee3&ov_redirect=true",
    "https://www.flipkart.com/usha-18-l-room-personal-air-cooler/p/itmbd35106339b8e?pid=AICGCFXVNXJFY3TY&marketplace=FLIPKART",
    "https://www.flipkart.com/usha-22-l-tower-air-cooler/p/itmd7da623bc0e14?pid=AICEUSX3FTP6JDWU"
];

async function main() {
    console.log("Reading input.xlsx...");
    const workbook = xlsx.readFile('input.xlsx');
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = xlsx.utils.sheet_to_json(sheet, { defval: "" });

    for (let i = 0; i < data.length; i++) {
        const row: any = data[i];
        if (i < urls.length) {
            row['Product_URL'] = urls[i];
            console.log(`[Row ${i + 1}] Restored URL from logs`);
        } else {
            row['Product_URL'] = "NA";
        }
    }

    console.log("Writing to output.xlsx...");
    const newSheet = xlsx.utils.json_to_sheet(data);
    const newWorkbook = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(newWorkbook, newSheet, "Sheet1");
    xlsx.writeFile(newWorkbook, 'output.xlsx');
    console.log("Done! You can now run fix.ts");
}

main().catch(console.error);
