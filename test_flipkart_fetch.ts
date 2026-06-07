async function testFetch() {
    const url = "https://www.flipkart.com/apple-iphone-15-black-128-gb/p/itm6ac6485515ae4?pid=MOBGTAGPTB3VS24W";
    const resp = await fetch(url, {
        headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
        }
    });

    if (resp.status === 200) {
        const text = await resp.text();
        const priceMatch = text.match(/<div class="Nx9bqj CxhGGd">([^<]+)<\/div>/) || text.match(/₹[0-9,]+/);
        console.log("Success! Extracted price:", priceMatch ? priceMatch[0] : "Not found in HTML");
        console.log("Length:", text.length);
    } else {
        console.log("Failed with status:", resp.status);
    }
}
testFetch().catch(console.dir);
