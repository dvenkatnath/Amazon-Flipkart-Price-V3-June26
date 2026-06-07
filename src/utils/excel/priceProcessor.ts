import { extractPricesFromMatrixApi, resolveAsinForRow } from '../matrixApiExtractor';
import { extractPricesFromFlipkartApi } from '../flipkartApiExtractor';
import { ProcessingResult } from '@/types/processing';

export const processRowsForPrices = async (
  rows: any[],
  settings: any,
  progressCallback: (completed: number, total: number, currentAsin: string) => void
): Promise<ProcessingResult[]> => {
  const deliveryPincode = settings.defaultPincode || '';
  const portal = (settings.portal || 'amazon').toLowerCase();

  console.log(`\n=== ${portal.toUpperCase()} BATCH: ${rows.length} rows | PIN: ${deliveryPincode} ===`);

  let priceResults: Record<string, any> = {};

  if (portal === 'flipkart') {
    // ── Flipkart path (unchanged) ──────────────────────────────────────────
    const productUrls = rows
      .map(row => ({ url: row.productUrl || '', productName: row.productName }))
      .filter(item => item.url || item.productName);
    priceResults = await extractPricesFromFlipkartApi(productUrls, progressCallback, deliveryPincode);

  } else {
    // ── Amazon path ────────────────────────────────────────────────────────
    //
    // ASIN resolution + price fetching are pipelined:
    //
    //   Rows WITH asin    → go straight into the price batch
    //   Rows WITHOUT asin → resolved in parallel (type=search), then
    //                        their asin is injected into the rows array
    //                        so the price batch can use them.
    //
    // This avoids the old pattern of "resolve all missing ASINs sequentially
    // first, THEN fetch all prices" which doubled wall-clock time when
    // many rows lacked ASINs.

    const rowsNeedingAsin  = rows.filter(r => !r.asin?.trim());
    const rowsWithAsin     = rows.filter(r =>  r.asin?.trim());

    let resolvePromise: Promise<void> = Promise.resolve();

    if (rowsNeedingAsin.length > 0) {
      console.log(`🔍 Resolving ${rowsNeedingAsin.length} missing ASINs in parallel with price fetching...`);

      // Fire ASIN resolution concurrently (doesn't count against price-fetch rate limits
      // because type=search hits a different Rainforest endpoint pool)
      resolvePromise = Promise.all(
        rowsNeedingAsin.map(async (row, i) => {
          const asin = await resolveAsinForRow(row, deliveryPincode);
          if (asin) {
            row.asin = asin;
            console.log(`  ✓ Row ${row.row}: "${row.productName}" → ${asin}`);
          } else {
            console.log(`  ✗ Row ${row.row}: could not resolve ASIN for "${row.productName}"`);
          }
        })
      ).then(() => undefined);
    }

    // Start price fetching for rows that already have ASINs immediately,
    // then wait for ASIN resolution to complete and fetch the resolved ones
    const knownAsins = rowsWithAsin.map(r => r.asin).filter(Boolean);

    // Run both concurrently: known-ASIN price fetching + missing-ASIN resolution
    const [knownPriceResults] = await Promise.all([
      knownAsins.length > 0
        ? extractPricesFromMatrixApi(knownAsins, progressCallback, deliveryPincode)
        : Promise.resolve({}),
      resolvePromise,
    ]);

    // Now fetch prices for rows whose ASINs were just resolved
    const resolvedAsins = rowsNeedingAsin.map(r => r.asin).filter(Boolean);
    let resolvedPriceResults: Record<string, number | string> = {};
    if (resolvedAsins.length > 0) {
      console.log(`\n[Matrix] Fetching prices for ${resolvedAsins.length} resolved ASINs...`);
      resolvedPriceResults = await extractPricesFromMatrixApi(resolvedAsins, progressCallback, deliveryPincode);
    }

    priceResults = { ...knownPriceResults, ...resolvedPriceResults };
  }

  // ── Map results back to rows ───────────────────────────────────────────────
  const results: ProcessingResult[] = rows.map(row => {
    const identifier = portal === 'flipkart' ? (row.productUrl || row.productName) : row.asin;
    let extractedPrice: number | string | undefined;
    let fetchedUrl = row.productUrl;

    if (portal === 'flipkart') {
      extractedPrice = priceResults[identifier]?.price;
      fetchedUrl = fetchedUrl || priceResults[identifier]?.fetchedUrl;
    } else {
      extractedPrice = priceResults[identifier];
    }

    let benchmarkPrice: number | null = null;
    let status: 'success' | 'not_found' | 'processing' = 'not_found';
    let priceChange: 'higher' | 'lower' | 'similar' | undefined;
    let remarksValue = '';

    if (typeof extractedPrice === 'number') {
      benchmarkPrice = extractedPrice - row.sellingPrice;
      status = 'success';
      const thresh = row.sellingPrice * 0.02;
      if      (benchmarkPrice >  thresh) { priceChange = 'higher'; remarksValue = 'Favourable'; }
      else if (benchmarkPrice < -thresh) { priceChange = 'lower';  remarksValue = 'Unfavourable'; }
      else                               { priceChange = 'similar'; remarksValue = ''; }
      console.log(`Row ${row.row}: ₹${extractedPrice} (${portal}) | ₹${row.sellingPrice} (sell) | diff ₹${benchmarkPrice} → ${remarksValue || 'Similar'}`);
    } else {
      const reason = !row.asin
        ? 'No ASIN — add ASIN/Product_URL or use searchable product name'
        : (extractedPrice ?? 'Currently Unavailable');
      remarksValue = typeof reason === 'string' ? reason : 'Currently Unavailable';
      console.log(`Row ${row.row}: no price — ${remarksValue}`);
    }

    return {
      row:           row.row,
      productName:   row.productName,
      originalPrice: row.sellingPrice,
      amazonPrice:   typeof extractedPrice === 'number' ? extractedPrice : (remarksValue || extractedPrice),
      benchmarkPrice,
      status,
      priceChange,
      productUrl:    fetchedUrl || (portal === 'amazon' ? `https://amazon.in/dp/${row.asin}` : row.productUrl),
      asin:          portal === 'amazon' ? row.asin : undefined,
      remarks:       remarksValue,
    };
  });

  const ok   = results.filter(r => r.status === 'success').length;
  const fail = results.length - ok;
  console.log(`\n=== DONE: ✅ ${ok}/${rows.length} | ❌ ${fail}/${rows.length} ===`);
  return results;
};
