// ─────────────────────────────────────────────────────────────────────────────
// Matrix API Extractor  —  amazon.in location-based price fetcher
// Wraps the Rainforest API: https://api.rainforestapi.com/request
//
// Performance design (June 2026):
//
//   BATCH STRATEGY: Small concurrent windows (3 at a time), NOT fully sequential
//   and NOT all-at-once.
//     - Pure sequential + 1.2s delay = ~8.5s × N (too slow, was ~85s for 10 rows)
//     - All concurrent          = 429 rate-limit + Amazon bot-trigger (broken)
//     - Window of 3 concurrent  = ~3× speedup with no rate-limit risk
//       10 rows → ~4 windows → ~35s instead of ~85s
//
//   OFFERS FALLBACK: type=offers only fires when type=product returns no price.
//   Most in-stock items return a price on the first call, so Step 2 is rare.
//
//   ASIN RESOLUTION: type=search for rows with no ASIN fires in parallel with
//   price lookups for rows that already have an ASIN, not before them.
//
//   TIMEOUT: 12s per request (Rainforest averages 1–8s; 12s catches stragglers
//   without hanging forever).
//
//   DELAY between windows: 300ms (enough to avoid burst-detection, not punishing).
// ─────────────────────────────────────────────────────────────────────────────

// Proxied via server.mjs — Rainforest API only allows browser CORS from localhost:5173
const RAINFOREST_ENDPOINT = '/api/rainforest';
const AMAZON_DOMAIN       = 'amazon.in';
const TIMEOUT_MS          = 12_000;   // per-request timeout
const CONCURRENT_WINDOW   = 3;        // requests in flight at once
const WINDOW_DELAY_MS     = 300;      // pause between windows

// ── Interfaces ────────────────────────────────────────────────────────────────

export interface MatrixSearchResult {
  asin?: string;
  title?: string;
  link?: string;
  price?: { value?: number; currency?: string; raw?: string };
}

export interface MatrixApiResponse {
  request_info: {
    success: boolean;
    message?: string;
    credits_used?: number;
    credits_remaining?: number;
  };
  search_results?: MatrixSearchResult[];
  product?: {
    title?: string;
    asin?: string;
    price?: { value?: number; currency?: string; raw?: string };
    buybox_winner?: {
      price?: { value?: number; currency?: string; raw?: string };
      is_prime?: boolean;
      availability?: { type?: string; raw?: string };
    };
  };
  // Offers are at data.offers[] — NOT data.offers_results.offers[]
  offers?: Array<{
    price?: { value?: number; raw?: string };
    condition?: { is_new?: boolean; title?: string };
    seller_name?: string;
    is_prime?: boolean;
  }>;
  available_filters?: {
    offers_condition_new?: boolean;
    offers_prime?: boolean;
  };
  pagination?: { offers_count?: number; total_results?: number };
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const getSettings = () => {
  try {
    const s = localStorage.getItem('priceBenchmarkSettings');
    return s ? JSON.parse(s) : {};
  } catch { return {}; }
};

const getApiKey = (): string => {
  const key = getSettings().matrixApiKey?.trim();
  return key || 'DBD1626523264DC5863B0272E2924438';
};

const sleep = (ms: number) => new Promise<void>(r => setTimeout(r, ms));

// ── Core fetcher ──────────────────────────────────────────────────────────────

const fetchRainforest = async (
  params: Record<string, string>
): Promise<MatrixApiResponse> => {
  const controller = new AbortController();
  const timeoutId  = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const resp = await fetch(
      `${RAINFOREST_ENDPOINT}?${new URLSearchParams(params)}`,
      { method: 'GET', signal: controller.signal, headers: { Accept: 'application/json' } }
    );
    clearTimeout(timeoutId);
    if (!resp.ok) {
      if (resp.status === 402) throw new Error('API Payment Required');
      if (resp.status === 401) throw new Error('API Unauthorized');
      if (resp.status === 429) throw new Error('API Rate Limited');
      if (resp.status === 404) throw new Error('ASIN Not Found');
      throw new Error(`HTTP ${resp.status}`);
    }
    return resp.json() as Promise<MatrixApiResponse>;
  } catch (err: any) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError') throw new Error('Request timed out');
    throw err;
  }
};

// ── Price extraction: type=product ───────────────────────────────────────────

const extractProductPrice = (data: MatrixApiResponse): number | null => {
  const buybox = data.product?.buybox_winner?.price?.value;
  if (buybox && buybox > 0) {
    console.log(`  ↳ buybox_winner.price = ₹${buybox}`);
    return buybox;
  }
  const top = data.product?.price?.value;
  if (top && top > 0) {
    console.log(`  ↳ product.price = ₹${top}`);
    return top;
  }
  const avail = data.product?.buybox_winner?.availability?.raw ?? 'unknown';
  console.log(`  ↳ no price (availability: "${avail}")`);
  return null;
};

// ── Price extraction: type=offers fallback ────────────────────────────────────

const extractOffersPrice = (data: MatrixApiResponse): number | null => {
  const offers = data.offers ?? [];
  console.log(`  ↳ [offers] ${data.pagination?.total_results ?? offers.length} total, ${offers.length} in page`);
  if (offers.length === 0) return null;

  const newPrices = offers
    .filter(o => o.condition?.is_new !== false)
    .map(o => o.price?.value)
    .filter((v): v is number => typeof v === 'number' && v > 0);
  if (newPrices.length > 0) {
    const lowest = Math.min(...newPrices);
    console.log(`  ↳ lowest new-condition price = ₹${lowest}`);
    return lowest;
  }

  const allPrices = offers
    .map(o => o.price?.value)
    .filter((v): v is number => typeof v === 'number' && v > 0);
  if (allPrices.length > 0) {
    const lowest = Math.min(...allPrices);
    console.log(`  ↳ lowest any-condition price = ₹${lowest}`);
    return lowest;
  }
  return null;
};

// ── ASIN resolution via product-name search ───────────────────────────────────

export const searchAsinByProductName = async (
  productName: string,
  pincode?: string
): Promise<string> => {
  const settings  = getSettings();
  const apiKey    = settings.matrixApiKey?.trim() || 'DBD1626523264DC5863B0272E2924438';
  const zip       = pincode || settings.defaultPincode || '400001';
  const term      = productName.replace(/\s+/g, ' ').trim();
  if (!term) return '';

  console.log(`  [search] "${term}"`);
  try {
    const data = await fetchRainforest({
      api_key: apiKey, amazon_domain: AMAZON_DOMAIN,
      type: 'search', search_term: term, zip, location: 'India',
    });
    if (!data.request_info?.success) return '';
    const match = (data.search_results ?? []).find(r => r.asin);
    if (match?.asin) {
      console.log(`  [search] → ${match.asin} | "${match.title?.slice(0, 50) ?? ''}"`);
      return match.asin;
    }
  } catch (err: any) {
    console.warn(`  [search] error: ${err.message}`);
  }
  return '';
};

export const resolveAsinForRow = async (
  row: { asin?: string; productUrl?: string; productName?: string },
  pincode?: string
): Promise<string> => {
  if (row.asin?.trim()) return row.asin.trim();

  const url = row.productUrl?.trim() ?? '';
  if (url) {
    const m = url.match(/\/dp\/([A-Z0-9]{10})|\/gp\/product\/([A-Z0-9]{10})|product\/([A-Z0-9]{10})/);
    if (m) return m[1] || m[2] || m[3];
  }

  if (row.productName?.trim()) {
    const found = await searchAsinByProductName(row.productName, pincode);
    if (/^[A-Z0-9]{10}$/.test(found)) return found;
  }
  return '';
};

// ── Single ASIN price fetch ───────────────────────────────────────────────────

export const extractPriceFromMatrixApi = async (
  asin: string,
  pincode?: string
): Promise<number | string> => {
  const settings  = getSettings();
  const apiKey    = settings.matrixApiKey?.trim() || 'DBD1626523264DC5863B0272E2924438';
  const zip       = pincode || settings.defaultPincode || '400001';

  console.log(`[Matrix] ASIN: ${asin} | PIN: ${zip}`);
  const base = { api_key: apiKey, amazon_domain: AMAZON_DOMAIN, asin, zip, location: 'India' };

  try {
    // Step 1 — type=product (~5–8s, returns price for most in-stock items)
    const productData = await fetchRainforest({ ...base, type: 'product' });

    if (!productData.request_info?.success) {
      const msg = productData.request_info?.message ?? 'Unknown';
      if (msg.includes('suspended') || msg.includes('Trial'))   return 'API Account Suspended';
      if (msg.includes('payment')   || msg.includes('billing')) return 'API Payment Required';
      if (msg.includes('not found') || msg.includes('Not Found')) return 'Product Not Found';
      return `API Failed: ${msg}`;
    }

    const p1 = extractProductPrice(productData);
    if (p1) return p1;

    // Step 2 — type=offers fallback (only fires when Step 1 has no price)
    console.log(`  → no price from product, trying offers...`);
    const offersData = await fetchRainforest({ ...base, type: 'offers' });
    if (offersData.request_info?.success) {
      const p2 = extractOffersPrice(offersData);
      if (p2) return p2;
    }

    const availRaw = productData.product?.buybox_winner?.availability?.raw;
    return availRaw ? `Out of stock (${availRaw})` : 'Price Not Available';

  } catch (err: any) {
    return `Error: ${err.message}`;
  }
};

// ── Batch price fetch — windowed concurrency ──────────────────────────────────
//
// Strategy: process CONCURRENT_WINDOW (3) ASINs at a time.
//
// Time math for 10 ASINs, 7s average per call:
//   Pure sequential (old):        10 × (7s + 1.2s delay) = ~82s
//   Window-of-3 (new):             4 windows × (7s + 0.3s delay) = ~30s
//   All-concurrent (broken):       bursts 429s and bot-detection
//
// The 300ms window delay is just enough to avoid Rainforest's burst-detection
// without meaningfully adding to total time.

export const extractPricesFromMatrixApi = async (
  asins: string[],
  progressCallback?: (completed: number, total: number, currentAsin: string) => void,
  pincode?: string
): Promise<Record<string, number | string>> => {
  const results: Record<string, number | string> = {};
  const settings = getSettings();
  const zip      = pincode || settings.defaultPincode || '400001';
  const apiKey   = settings.matrixApiKey?.trim() || 'DBD1626523264DC5863B0272E2924438';

  console.log(`[Matrix] Batch: ${asins.length} ASINs | window=${CONCURRENT_WINDOW} | PIN: ${zip} | key: ${apiKey.slice(0, 8)}...`);

  let completed = 0;

  for (let i = 0; i < asins.length; i += CONCURRENT_WINDOW) {
    const window = asins.slice(i, i + CONCURRENT_WINDOW);

    // Fire the window concurrently
    const windowResults = await Promise.allSettled(
      window.map(asin => {
        progressCallback?.(completed, asins.length, asin);
        return extractPriceFromMatrixApi(asin, zip).then(price => ({ asin, price }));
      })
    );

    for (const r of windowResults) {
      const asin   = r.status === 'fulfilled' ? r.value.asin   : window[windowResults.indexOf(r)];
      const price  = r.status === 'fulfilled' ? r.value.price  : `Error: ${(r as any).reason?.message ?? 'failed'}`;
      results[asin] = price;
      completed++;
      progressCallback?.(completed, asins.length, asin);
      console.log(`  [${completed}/${asins.length}] ${asin} = ${price}`);
    }

    // Short pause between windows — avoids burst detection
    if (i + CONCURRENT_WINDOW < asins.length) {
      await sleep(WINDOW_DELAY_MS);
    }
  }

  const ok   = Object.values(results).filter(v => typeof v === 'number').length;
  const fail = asins.length - ok;
  console.log(`[Matrix] Done — ✅ ${ok}/${asins.length} found, ❌ ${fail} failed`);
  return results;
};

// ── City PIN codes ─────────────────────────────────────────────────────────────

export const getCityPincodes = (): Record<string, string> => ({
  'Mumbai':    '400001',
  'Delhi':     '110001',
  'Bangalore': '560001',
  'Hyderabad': '500001',
  'Chennai':   '600001',
  'Kolkata':   '700001',
  'Pune':      '411001',
  'Ahmedabad': '380001',
  'Jaipur':    '302001',
  'Lucknow':   '226001',
});
