// ─────────────────────────────────────────────────────────────────────────────
// Matrix API Extractor  —  amazon.in location-based price fetcher
// Wraps the Rainforest API: https://api.rainforestapi.com/request
//
// Key lessons from real API response analysis (May 2026):
//   1. Price path: product.buybox_winner.price.value  (primary)
//                  product.price.value                (fallback)
//      ⚠ There is NO product.main_price field — that was a bug.
//
//   2. Offers fallback: data.offers[] (NOT data.offers_results.offers[])
//      The offers endpoint returns data.offers[], and passing
//      offers_condition_new=true when that filter is unavailable returns 0 results.
//
//   3. Concurrency: ALL ASINs fired concurrently causes 429 rate limits
//      and Amazon bot-detection triggers. Use sequential requests with delay.
//
//   4. Timeout: No timeout = stalled requests hang indefinitely.
//      Use 15s AbortController.
// ─────────────────────────────────────────────────────────────────────────────

const RAINFOREST_ENDPOINT = 'https://api.rainforestapi.com/request';
const AMAZON_DOMAIN = 'amazon.in';
const TIMEOUT_MS = 15_000;
const REQUEST_DELAY_MS = 1_200; // Sequential delay — avoids rate limiting

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
    // ✅ Correct top-level price field (NOT main_price — that doesn't exist)
    price?: { value?: number; currency?: string; raw?: string };
    buybox_winner?: {
      price?: { value?: number; currency?: string; raw?: string };
      is_prime?: boolean;
      availability?: { type?: string; raw?: string };
    };
  };
  // ✅ Offers are under data.offers[] NOT data.offers_results.offers[]
  offers?: Array<{
    price?: { value?: number; raw?: string };
    condition?: { is_new?: boolean; title?: string };
    seller_name?: string;
    is_prime?: boolean;
  }>;
  available_filters?: {
    offers_condition_new?: boolean;
    offers_prime?: boolean;
    offers_free_shipping?: boolean;
  };
  pagination?: { offers_count?: number; total_results?: number };
}

// ── API key resolver ──────────────────────────────────────────────────────────

const resolveApiKey = (): string => {
  try {
    const saved = localStorage.getItem('priceBenchmarkSettings');
    const key = saved ? JSON.parse(saved).matrixApiKey : null;
    if (key?.trim()) return key.trim();
  } catch { /* ignore */ }
  return 'DBD1626523264DC5863B0272E2924438';
};

// ── Core fetcher with timeout ─────────────────────────────────────────────────

const fetchRainforest = async (
  params: Record<string, string>
): Promise<MatrixApiResponse> => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const url = `${RAINFOREST_ENDPOINT}?${new URLSearchParams(params)}`;
    const response = await fetch(url, {
      method: 'GET',
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      if (response.status === 402) throw new Error('API Payment Required');
      if (response.status === 401) throw new Error('API Unauthorized');
      if (response.status === 429) throw new Error('API Rate Limited');
      if (response.status === 404) throw new Error('ASIN Not Found');
      throw new Error(`HTTP ${response.status}`);
    }

    return response.json() as Promise<MatrixApiResponse>;
  } catch (err: any) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError') throw new Error('Request timed out after 15s');
    throw err;
  }
};

// ── Price extraction (step 1: type=product) ───────────────────────────────────

const extractProductPrice = (data: MatrixApiResponse): number | null => {
  // Buybox winner — only populated when item is in stock with an active seller
  const buybox = data.product?.buybox_winner?.price?.value;
  if (buybox && buybox > 0) {
    const avail = data.product?.buybox_winner?.availability?.type ?? 'unknown';
    console.log(`  ↳ [product] buybox_winner.price = ₹${buybox}  (availability: ${avail})`);
    return buybox;
  }

  // Top-level product.price — present on many listings even without buybox
  // ⚠ This is product.price.value, NOT product.main_price.value (that field doesn't exist)
  const topLevel = data.product?.price?.value;
  if (topLevel && topLevel > 0) {
    console.log(`  ↳ [product] product.price (top-level) = ₹${topLevel}`);
    return topLevel;
  }

  const availRaw = data.product?.buybox_winner?.availability?.raw ?? 'unknown';
  console.log(`  ↳ [product] No price found. Buybox availability: "${availRaw}"`);
  return null;
};

// ── Price extraction (step 2: type=offers fallback) ───────────────────────────

const extractOffersPrice = (data: MatrixApiResponse): number | null => {
  // ✅ Real API puts offers under data.offers[], NOT data.offers_results.offers[]
  const offers = data.offers ?? [];
  const total = data.pagination?.total_results ?? offers.length;
  console.log(`  ↳ [offers] total_results=${total}, in page=${offers.length}`);

  if (offers.length === 0) return null;

  // Prefer new condition
  const newPrices = offers
    .filter(o => o.condition?.is_new !== false)
    .map(o => o.price?.value)
    .filter((v): v is number => typeof v === 'number' && v > 0);

  if (newPrices.length > 0) {
    const lowest = Math.min(...newPrices);
    console.log(`  ↳ [offers] lowest NEW price from ${newPrices.length} offer(s) = ₹${lowest}`);
    return lowest;
  }

  // Fall back to any condition
  const allPrices = offers
    .map(o => o.price?.value)
    .filter((v): v is number => typeof v === 'number' && v > 0);

  if (allPrices.length > 0) {
    const lowest = Math.min(...allPrices);
    console.log(`  ↳ [offers] lowest ANY-CONDITION price = ₹${lowest}`);
    return lowest;
  }

  return null;
};

// ── ASIN resolution via product name search ───────────────────────────────────

export const searchAsinByProductName = async (
  productName: string,
  pincode?: string
): Promise<string> => {
  const settingsJson = localStorage.getItem('priceBenchmarkSettings');
  const settings = settingsJson ? JSON.parse(settingsJson) : {};
  const apiKey = settings.matrixApiKey?.trim() || 'DBD1626523264DC5863B0272E2924438';
  const deliveryPincode = pincode || settings.defaultPincode || '400001';
  const searchTerm = productName.replace(/\s+/g, ' ').trim();

  if (!searchTerm) return 'No product name provided';

  console.log(`  → Searching Amazon for: "${searchTerm}"`);

  try {
    const data = await fetchRainforest({
      api_key: apiKey,
      amazon_domain: AMAZON_DOMAIN,
      type: 'search',
      search_term: searchTerm,
      zip: deliveryPincode,
      location: 'India',
    });

    if (!data.request_info?.success) {
      return data.request_info?.message ?? 'Search request failed';
    }

    const results = data.search_results ?? [];
    if (results.length === 0) return 'No matching product found on Amazon';

    const match = results.find(r => r.asin) ?? results[0];
    if (!match.asin) return 'No ASIN in search results';

    console.log(`  ↳ [search] ASIN=${match.asin} | "${match.title?.slice(0, 60) ?? 'unknown'}"`);
    return match.asin;
  } catch (err: any) {
    return `Search Error: ${err.message}`;
  }
};

export const resolveAsinForRow = async (
  row: { asin?: string; productUrl?: string; productName?: string },
  pincode?: string
): Promise<string> => {
  if (row.asin?.trim()) return row.asin.trim();

  const productUrl = row.productUrl?.trim() ?? '';
  if (productUrl) {
    const asinMatch = productUrl.match(/\/dp\/([A-Z0-9]{10})|\/gp\/product\/([A-Z0-9]{10})|product\/([A-Z0-9]{10})/);
    const fromUrl = asinMatch ? (asinMatch[1] || asinMatch[2] || asinMatch[3]) : '';
    if (fromUrl) return fromUrl;
  }

  if (row.productName?.trim()) {
    const found = await searchAsinByProductName(row.productName, pincode);
    if (/^[A-Z0-9]{10}$/.test(found)) return found;
  }

  return '';
};

// ── Public: single ASIN ───────────────────────────────────────────────────────

export const extractPriceFromMatrixApi = async (
  asin: string,
  pincode?: string
): Promise<number | string> => {
  const settingsJson = localStorage.getItem('priceBenchmarkSettings');
  const settings = settingsJson ? JSON.parse(settingsJson) : {};
  const apiKey = settings.matrixApiKey?.trim() || 'DBD1626523264DC5863B0272E2924438';
  const deliveryPincode = pincode || settings.defaultPincode || '400001';

  console.log(`\n[Matrix] ─── ASIN: ${asin} | PIN: ${deliveryPincode} ───`);

  const baseParams = {
    api_key: apiKey,
    amazon_domain: AMAZON_DOMAIN,
    asin,
    zip: deliveryPincode,
    location: 'India',
  };

  try {
    // ── Step 1: type=product ──────────────────────────────────────────────────
    console.log(`  → Step 1: type=product`);
    const productData = await fetchRainforest({ ...baseParams, type: 'product' });

    if (!productData.request_info?.success) {
      const msg = productData.request_info?.message ?? 'Unknown error';
      if (msg.includes('suspended') || msg.includes('Trial')) return 'API Account Suspended';
      if (msg.includes('payment') || msg.includes('billing')) return 'API Payment Required';
      if (msg.includes('not found') || msg.includes('Not Found')) return 'Product Not Found';
      return `API Request Failed: ${msg}`;
    }

    const productPrice = extractProductPrice(productData);
    if (productPrice) {
      console.log(`  ✓ Price: ₹${productPrice}`);
      return productPrice;
    }

    // ── Step 2: type=offers (no condition filter — avoids 0-result bug) ──────
    // ⚠ Never pass offers_condition_new=true blindly. Check available_filters first.
    //   If offers_condition_new is false in available_filters, passing that param
    //   returns 0 results even when used/other listings exist.
    console.log(`  → Step 2: type=offers (no condition filter)`);
    const offersData = await fetchRainforest({ ...baseParams, type: 'offers' });

    if (offersData.request_info?.success) {
      const offersPrice = extractOffersPrice(offersData);
      if (offersPrice) {
        console.log(`  ✓ Price via offers: ₹${offersPrice}`);
        return offersPrice;
      }
    }

    const availRaw = productData.product?.buybox_winner?.availability?.raw;
    const reason = availRaw ? `Out of stock (${availRaw})` : 'Price Not Available';
    console.log(`  ✗ All attempts failed. Reason: ${reason}`);
    return reason;

  } catch (err: any) {
    console.error(`  ✗ Error for ASIN ${asin}:`, err.message);
    return `Network Error: ${err.message}`;
  }
};

// ── Public: batch — SEQUENTIAL with delay ─────────────────────────────────────
//
// ⚠ CRITICAL FIX: Previous code used Promise.allSettled (all concurrent).
//   This blasted ALL requests simultaneously, triggering:
//     - 429 rate limiting from Rainforest API
//     - Amazon bot-detection (sudden burst of identical requests)
//   Switched to sequential with a small delay between requests.
//   Slightly slower but dramatically more reliable.

export const extractPricesFromMatrixApi = async (
  asins: string[],
  progressCallback?: (completed: number, total: number, currentAsin: string) => void,
  pincode?: string
): Promise<Record<string, number | string>> => {
  const results: Record<string, number | string> = {};

  const settingsJson = localStorage.getItem('priceBenchmarkSettings');
  const settings = settingsJson ? JSON.parse(settingsJson) : {};
  const deliveryPincode = pincode || settings.defaultPincode || '400001';
  const apiKey = settings.matrixApiKey?.trim() || 'DBD1626523264DC5863B0272E2924438';

  console.log(`\n[Matrix] Sequential batch: ${asins.length} ASINs | PIN: ${deliveryPincode} | Key: ${apiKey.substring(0, 8)}...`);
  console.log(`Using sequential requests with ${REQUEST_DELAY_MS}ms delay to avoid rate limiting`);

  for (let i = 0; i < asins.length; i++) {
    const asin = asins[i];
    progressCallback?.(i, asins.length, asin);

    try {
      results[asin] = await extractPriceFromMatrixApi(asin, deliveryPincode);
      console.log(`  [${i + 1}/${asins.length}] ${asin} = ${results[asin]}`);
    } catch (err: any) {
      results[asin] = `Error: ${err.message}`;
      console.error(`  [${i + 1}/${asins.length}] ${asin} failed:`, err.message);
    }

    // Sequential delay between requests
    if (i < asins.length - 1) {
      await new Promise(resolve => setTimeout(resolve, REQUEST_DELAY_MS));
    }
  }

  const successes = Object.values(results).filter(v => typeof v === 'number').length;
  const failures = asins.length - successes;
  console.log(`\n[Matrix] Batch done. ✅ ${successes}/${asins.length} prices found. ❌ ${failures} failed.`);

  if (progressCallback) {
    progressCallback(asins.length, asins.length, `Done — PIN: ${deliveryPincode}`);
  }

  return results;
};

// ── City PIN codes ────────────────────────────────────────────────────────────

export const getCityPincodes = (): Record<string, string> => ({
  'Mumbai': '400001',
  'Delhi': '110001',
  'Bangalore': '560001',
  'Hyderabad': '500001',
  'Chennai': '600001',
  'Kolkata': '700001',
  'Pune': '411001',
  'Ahmedabad': '380001',
  'Jaipur': '302001',
  'Lucknow': '226001',
});
