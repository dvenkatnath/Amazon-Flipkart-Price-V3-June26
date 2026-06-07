export interface FlipkartApiResponse { }

import { FirecrawlService } from '@/utils/FirecrawlService';

// Helper: parse rupee strings and guard plausible range
const inRupeeRange = (v: number) => v >= 999 && v <= 5_000_000;
const parseRupee = (text: string | null | undefined): number | null => {
  if (!text) return null;
  const m = String(text).match(/(?:₹|&#8377;|Rs\.?)+\s*([\d,]+(?:\.\d{1,2})?)/i) || String(text).match(/([\d,]+(?:\.\d{1,2})?)/);
  if (!m || !m[1]) return null;
  const v = parseFloat(m[1].replace(/,/g, ''));
  return !isNaN(v) && inRupeeRange(v) ? v : null;
};

const appendPincodeToUrl = (url: string, pincode?: string): string => {
  if (!pincode) return url;
  try {
    const u = new URL(url);
    u.searchParams.set('pincode', String(pincode));
    return u.toString();
  } catch {
    return url;
  }
};

// Prefer Firecrawl v2 JSON schema scrape to reliably capture current price
const scrapePriceViaFirecrawlJson = async (productUrl: string, pincode?: string, expectedProductName?: string): Promise<number | string | null> => {
  const apiKey = FirecrawlService.getApiKey();
  if (!apiKey) return null;
  try {
    const resp = await fetch('https://api.firecrawl.dev/v2/scrape', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: appendPincodeToUrl(productUrl, pincode),
        onlyMainContent: true,
        maxAge: 172800000,
        // Try to hint location via cookie (may be ignored by Firecrawl/Flipkart)
        cookies: pincode ? [`pincode=${pincode}`] : undefined,
        parsers: [
          'pdf'
        ],
        formats: [
          {
            type: 'json',
            schema: {
              type: 'object',
              required: [],
              properties: {
                company_name: { type: 'string' },
                company_description: { type: 'string' },
                Price: { type: 'string' },
                MRP: { type: 'string' },
                'Offer Price': { type: 'string' },
              },
            },
          },
        ],
      }),
    });

    if (!resp.ok) {
      console.warn('[Flipkart JSON] Firecrawl /scrape failed:', resp.status, resp.statusText);
      return null;
    }

    const data = await resp.json();
    console.log('🔍 [Flipkart JSON] Raw /scrape response:', data);

    const findValue = (obj: any, key: string): string => {
      if (!obj || typeof obj !== 'object') return '';
      if (obj[key]) return String(obj[key]);
      for (const val of Object.values(obj)) {
        const res = findValue(val, key);
        if (res) return res;
      }
      return '';
    };

    const companyName = findValue(data, 'company_name');
    const companyDesc = findValue(data, 'company_description');

    if (expectedProductName && expectedProductName !== 'NA') {
      const expectedBrand = expectedProductName.split(' ')[0].toLowerCase().replace(/[^a-z0-9]/g, '');
      const scrapedCompany = companyName.toLowerCase().replace(/[^a-z0-9]/g, '');
      const scrapedDesc = companyDesc.toLowerCase();
      const urlBrand = productUrl.toLowerCase().replace(/[^a-z0-9-]/g, '');

      if (expectedBrand.length > 1 && !scrapedCompany.includes(expectedBrand) && !scrapedDesc.includes(expectedBrand) && !urlBrand.includes(expectedBrand)) {
        console.warn(`[Flipkart JSON] Product mismatch. Expected brand: ${expectedBrand}, but got company: ${companyName || 'unknown'}`);
        return "Not Available";
      }
    }

    const findPriceObject = (obj: any): any | null => {
      if (!obj || typeof obj !== 'object') return null;
      const keys = Object.keys(obj);
      if (keys.includes('Price') || keys.includes('MRP') || keys.includes('Offer Price')) return obj;
      for (const val of Object.values(obj)) {
        const res = findPriceObject(val as any);
        if (res) return res;
      }
      return null;
    };

    const priceObj = findPriceObject(data);
    if (!priceObj) return null;

    const offer = parseRupee(priceObj['Offer Price']);
    const price = parseRupee(priceObj['Price']);
    const mrp = parseRupee(priceObj['MRP']);

    console.log('📦 [Flipkart JSON] Parsed values from schema', {
      url: productUrl,
      offer_raw: priceObj['Offer Price'],
      price_raw: priceObj['Price'],
      mrp_raw: priceObj['MRP'],
      offer,
      price,
      mrp,
    });

    // Priority: Offer Price > Price > MRP (Offer Price represents the discounted selling price)
    let best: number | null = null;
    let source: 'Offer Price' | 'Price' | 'MRP' | 'none' = 'none';
    if (typeof offer === 'number') { best = offer; source = 'Offer Price'; }
    else if (typeof price === 'number') { best = price; source = 'Price'; }
    else if (typeof mrp === 'number') { best = mrp; source = 'MRP'; }

    if (typeof best === 'number' && inRupeeRange(best)) {
      console.log(`✅ [Flipkart JSON] Selected price: ₹${best}`);
      return best;
    }
    return null;
  } catch (error) {
    console.error('💥 [Flipkart JSON] Error scraping Firecrawl JSON:', error);
    return null;
  }
};

// Extract numeric price from a text blob (HTML/Markdown)
const extractPriceFromContent = (content: string, expectedProductName?: string): number | string => {
  if (!content) return 'Price Not Available';

  const inRange = (v: number) => v >= 999 && v <= 5_000_000;
  const parsePrice = (text: string | null | undefined): number | null => {
    if (!text) return null;
    const m = text.match(/(?:₹|&#8377;|Rs\.?)+\s*([\d,]+(?:\.\d{1,2})?)/i);
    if (!m || !m[1]) return null;
    const v = parseFloat(m[1].replace(/,/g, ''));
    return !isNaN(v) && inRange(v) ? v : null;
  };
  // 1) Try JSON-LD (most reliable on product pages)
  try {
    const doc = new DOMParser().parseFromString(content, 'text/html');
    const ldScripts = Array.from(
      doc.querySelectorAll('script[type="application/ld+json"],script[type="application/json+ld"],script[type*="ld+json"]')
    );
    for (const s of ldScripts) {
      const raw = s.textContent?.trim();
      if (!raw) continue;
      try {
        const data = JSON.parse(raw);
        const objs = data['@graph'] ? data['@graph'] : (Array.isArray(data) ? data : [data]);
        for (const obj of objs) {
          // Look for Product -> offers -> price
          const offers = obj?.offers || obj?.Offer || obj?.offer;
          if (offers) {
            const offerArr = Array.isArray(offers) ? offers : [offers];
            for (const off of offerArr) {
              const p = off?.price ?? off?.lowPrice ?? off?.highPrice;
              if (p) {
                const num = typeof p === 'number' ? p : parseFloat(String(p).replace(/,/g, ''));
                if (!isNaN(num) && inRange(num)) {
                  console.log(`✅ [Flipkart LD] Price from JSON-LD: ₹${num}`);
                  return num;
                }
              }
            }
          }
        }
      } catch (e) {
        // If JSON parse fails, try regex fallback inside the script text
        const m = raw.match(/"price"\s*:\s*"?([\d,]+(?:\.\d{1,2})?)"?/);
        if (m && m[1]) {
          const num = parseFloat(m[1].replace(/,/g, ''));
          if (inRange(num)) {
            console.log(`✅ [Flipkart LD] Price from JSON-LD (regex): ₹${num}`);
            return num;
          }
        }
      }
    }

    // 2) Query known Flipkart price selectors in DOM (ordered by confidence)
    const selectors = [
      'span._30jeq3._16Jk6d',
      'div._30jeq3._16Jk6d',
      'div[class*="aMaAEs"] span[class*="_16Jk6d"]',
      'span[class*="_30jeq3"]',
      'div[class*="_30jeq3"]',
      '[data-testid*="price"]',
      'div[class*="price"] span',
      'span[class*="Nx9bqj"]',
    ];

    for (const sel of selectors) {
      const el = doc.querySelector(sel);
      if (!el) continue;
      const p = parsePrice(el.textContent || '');
      if (p) {
        console.log(`✅ [Flipkart DOM] Price from selector "${sel}": ₹${p}`);
        return p;
      }
    }

    // 2b) Meta tag-based price extraction
    const metaSelectors = [
      'meta[itemprop="price"]',
      'meta[property="product:price:amount"]',
      'meta[property="og:price:amount"]',
      'meta[name="twitter:data1"]',
    ];
    for (const ms of metaSelectors) {
      const meta = doc.querySelector(ms) as HTMLMetaElement | null;
      const contentVal = meta?.getAttribute('content') || meta?.getAttribute('value') || meta?.textContent || '';
      const p = parsePrice(contentVal || '');
      if (p) {
        console.log(`✅ [Flipkart META] Price from "${ms}": ₹${p}`);
        return p;
      }
    }
  } catch (err) {
    console.warn('[Flipkart] DOM/JSON-LD parsing failed, falling back to regex scan');
  }

  // 3) Fallback: Logical Linear Markdown Parsing
  const lines = content.split(/\r?\n/);
  let titleIndex = -1;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line.startsWith('# ') && line.length > 15) {
      console.log(`📍 [Flipkart Extractor] Found title anchor at line ${i + 1}: ${line}`);
      titleIndex = i;
      break;
    }
  }

  const startIndex = titleIndex >= 0 ? titleIndex : 0;
  const candidates: { v: number, line: string }[] = [];

  for (let i = startIndex; i < Math.min(lines.length, startIndex + 50); i++) {
    const line = lines[i];
    if (!line) continue;
    const lowerLine = line.toLowerCase();

    // Skip EMI / PROTECT PROMISE FEES / AD-related keywords
    if (lowerLine.includes('/m') || lowerLine.includes('month') || lowerLine.includes('protection') || lowerLine.includes('fee')) {
      continue;
    }

    const m = line.match(/(?:₹|&#8377;|Rs\.?)+\s*([\d,]+(?:\.\d{1,2})?)/i);
    if (m && m[1]) {
      const v = parseFloat(m[1].replace(/,/g, ''));
      if (!isNaN(v) && inRange(v)) {
        candidates.push({ v, line: lowerLine });
      }
    }
  }

  if (candidates.length > 0) {
    if (candidates.length >= 2 && candidates[0].v > candidates[1].v * 1.15) {
      console.log(`✅ [Flipkart] Skipping MRP ₹${candidates[0].v}. Selecting SP: ₹${candidates[1].v}`);
      return candidates[1].v;
    }

    // Prefer standard Selling Price (the first found that isn't labeling a bank offer)
    for (const c of candidates) {
      if (!c.line.includes('buy at') && !c.line.includes('lowest price')) {
        console.log(`✅ [Flipkart] Picking Primary Selling Price: ₹${c.v}`);
        return c.v;
      }
    }
    return candidates[0].v;
  }

  return 'Price Not Available';
};

export const extractPriceFromFlipkartApi = async (productUrl: string, pincode?: string, expectedProductName?: string): Promise<number | string> => {
  try {
    console.log(`🔍 [Flipkart API] Starting extraction for URL: ${productUrl}`);
    console.log(`🔍 [Flipkart API] FirecrawlService available:`, typeof FirecrawlService);
    if (pincode) console.log(`📍 [Flipkart API] Using delivery PIN code: ${pincode}`);

    const crawl = await FirecrawlService.crawlWebsite(appendPincodeToUrl(productUrl, pincode));
    if (!crawl.success) {
      console.error('Flipkart crawl failed:', crawl.error);
      return `Service Error: ${crawl.error}`;
    }

    const payload: any = crawl.data;
    console.log('🔍 [DEBUG] Raw Firecrawl response:', JSON.stringify(payload, null, 2));

    // Gather all crawled pages
    const pages: any[] = Array.isArray(payload?.data) ? payload.data : [];
    const getPageUrl = (p: any): string => p?.url || p?.sourceUrl || p?.metadata?.url || '';

    const extractFromDoc = (docLike: any): number | string => {
      const html: string | undefined = docLike?.html;
      const md: string | undefined = docLike?.markdown;

      // 0) Brand Validation via Meta tags
      if (expectedProductName && expectedProductName !== 'NA') {
        const expectedBrand = expectedProductName.split(' ')[0].toLowerCase().replace(/[^a-z0-9]/g, '');
        const metaTitle = (docLike?.metadata?.ogTitle || docLike?.metadata?.title || '').toLowerCase();
        const metaDesc = (docLike?.metadata?.description || docLike?.metadata?.Description || '').toLowerCase();
        const urlBrand = productUrl.toLowerCase().replace(/[^a-z0-9-]/g, '');

        if (expectedBrand.length > 1 && !metaTitle.includes(expectedBrand) && !metaDesc.includes(expectedBrand) && !urlBrand.includes(expectedBrand)) {
          console.warn(`[Flipkart Validation] Product mismatch. Expected brand: ${expectedBrand}, but got title: ${metaTitle}`);
          return "Not Available";
        }
      }

      // 1) JSON-LD / Meta / DOM selectors
      const fromHtml = html ? extractPriceFromContent(html, expectedProductName) : undefined;
      if (typeof fromHtml === 'number') {
        console.log(`✅ [Firecrawl] Extracted price from HTML: ₹${fromHtml}`);
        return fromHtml;
      } else if (fromHtml === "Not Available") {
        return "Not Available";
      }

      const fromMd = md ? extractPriceFromContent(md, expectedProductName) : undefined;
      if (typeof fromMd === 'number') {
        console.log(`✅ [Firecrawl] Extracted price from Markdown: ₹${fromMd}`);
        return fromMd;
      }

      return 'Price Not Available';
    };

    // Choose the best matching page for the product URL (prefer exact product page)
    let bestPage: any | null = null;
    if (pages.length > 0) {
      const targetUrl = new URL(productUrl);
      const itmMatch = targetUrl.pathname.match(/\/p\/(itm[\w\d]+)/i);
      const itmId = itmMatch?.[1]?.toLowerCase();

      let bestScore = -1;
      for (const p of pages) {
        const pu = (getPageUrl(p) || '').toLowerCase();
        let score = 0;
        if (pu === productUrl.toLowerCase()) score += 4; // exact match
        if (itmId && pu.includes(itmId)) score += 3; // same item id
        if (pu.includes('/p/itm')) score += 2; // product page pattern
        if (pu.includes('flipkart.com')) score += 1; // same domain

        // Try canonical URL from HTML to boost score
        try {
          const h = p?.html as string | undefined;
          if (h) {
            const d = new DOMParser().parseFromString(h, 'text/html');
            const canonical = d.querySelector('link[rel="canonical"]')?.getAttribute('href')?.toLowerCase();
            if (canonical) {
              if (canonical === productUrl.toLowerCase()) score += 4;
              if (itmId && canonical.includes(itmId)) score += 3;
            }
          }
        } catch { }

        if (score > bestScore) {
          bestScore = score;
          bestPage = p;
        }
      }
      console.log('🔍 [DEBUG] Selected best page URL:', getPageUrl(bestPage));
    }

    // Try best page first
    if (bestPage) {
      const val = extractFromDoc(bestPage);
      if (typeof val === 'number') return val;
    }

    // Fallback: try all pages and choose the most plausible current price (prefer minimum among valid candidates)
    const candidates: number[] = [];
    for (const p of pages) {
      const v = extractFromDoc(p);
      if (typeof v === 'number') candidates.push(v);
    }
    if (candidates.length > 0) {
      const best = Math.min(...candidates);
      console.log(`✅ [Firecrawl] Fallback across pages: selected min candidate ₹${best} from ${candidates.length} candidates`, candidates);
      return best;
    }

    console.log('❌ [Firecrawl] No valid price found in any crawled page');
    return 'Price Not Available';
  } catch (error) {
    console.error(`💥 [Firecrawl] Error extracting price from Flipkart URL ${productUrl}:`, error);
    return `Network/Error: ${error instanceof Error ? error.message : 'Unknown error'}`;
  }
};

export const extractPricesFromFlipkartApi = async (
  productUrls: { url: string; productName?: string }[] | string[],
  progressCallback?: (completed: number, total: number, currentUrl: string) => void,
  pincode?: string,
): Promise<Record<string, { price: number | string, fetchedUrl: string }>> => {
  console.log(`\n=== FLIPKART API EXTRACTION STARTED ===`);
  console.log(`Items to process: ${productUrls.length}`);
  if (pincode) console.log(`📍 Using delivery PIN code: ${pincode}`);

  const results: Record<string, { price: number | string, fetchedUrl: string }> = {};
  const concurrentLimit = 5;

  for (let i = 0; i < productUrls.length; i += concurrentLimit) {
    const batch = productUrls.slice(i, i + concurrentLimit);
    const batchPromises = batch.map(async (item) => {
      const originalUrl = typeof item === 'string' ? item : item.url;
      const productName = typeof item === 'string' ? undefined : item.productName;
      progressCallback?.(i + batch.indexOf(item), productUrls.length, originalUrl || productName || 'Unknown');

      let targetUrl = originalUrl;
      if (!targetUrl || targetUrl === 'NA') {
        if (!productName) {
          return { id: originalUrl || productName || '', price: "No URL or Name", fetchedUrl: "" };
        }
        console.log(`🔍 [Flipkart API] No URL provided. Searching for: ${productName}`);
        targetUrl = await FirecrawlService.searchFlipkartUrl(productName) || '';
        if (!targetUrl) {
          return { id: originalUrl || productName || '', price: "Not Found In Search", fetchedUrl: "" };
        }
      }

      const price = await extractPriceFromFlipkartApi(targetUrl, pincode, productName);
      return { id: originalUrl || productName || '', price, fetchedUrl: targetUrl };
    });

    const batchResults = await Promise.all(batchPromises);
    batchResults.forEach(({ id, price, fetchedUrl }) => {
      if (id) results[id] = { price, fetchedUrl };
    });

    if (i + concurrentLimit < productUrls.length) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  const successCount = Object.values(results).filter(entry => typeof entry.price === 'number').length;
  console.log(`\n=== FLIPKART API EXTRACTION COMPLETE ===`);
  console.log(`Total items processed: ${productUrls.length}`);
  console.log(`Successful extractions: ${successCount}`);
  console.log(`Failed extractions: ${productUrls.length - successCount}`);

  return results;
};
