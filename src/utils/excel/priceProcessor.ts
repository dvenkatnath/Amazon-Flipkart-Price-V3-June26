
import { extractPricesFromMatrixApi, resolveAsinForRow } from '../matrixApiExtractor';
import { extractPricesFromFlipkartApi } from '../flipkartApiExtractor';
import { ProcessingResult } from '@/types/processing';

export const processRowsForPrices = async (
  rows: any[],
  settings: any,
  progressCallback: (completed: number, total: number, currentAsin: string) => void
): Promise<ProcessingResult[]> => {
  // Get delivery PIN code and portal from settings
  const deliveryPincode = settings.defaultPincode || '';
  const portal = settings.portal || 'amazon'; // Default to Amazon

  console.log(`\n=== ${portal.toUpperCase()} BATCH PROCESSING ${rows.length} ROWS ===`);
  console.log(`Processing rows: ${rows.map(r => r.row).join(', ')}`);
  console.log(`📍 Using delivery PIN code: ${deliveryPincode}`);
  console.log(`🛒 Using portal: ${portal.toUpperCase()}`);

  let priceResults: Record<string, any> = {};

  if (portal === 'flipkart') {
    // Extract all Product URLs and Names for Flipkart processing (needed for mismatch validation)
    const productUrls = rows.map(row => ({
      url: row.productUrl || '',
      productName: row.productName
    })).filter(item => item.url || item.productName);
    console.log(`📋 [Price Processor] Extracted ${productUrls.length} Flipkart items for processing`);
    console.log(`📋 [Price Processor] Sample items:`, productUrls.slice(0, 2));
    console.log(`📋 [Price Processor] Calling extractPricesFromFlipkartApi...`);

    // Batch process all URLs using Flipkart via Firecrawl
    priceResults = await extractPricesFromFlipkartApi(productUrls, progressCallback, deliveryPincode);
    console.log(`📋 [Price Processor] Flipkart extraction completed. Results:`, Object.keys(priceResults).length);
  } else {
    const missingAsinRows = rows.filter(row => !row.asin?.trim());
    if (missingAsinRows.length > 0) {
      console.log(`🔍 ${missingAsinRows.length}/${rows.length} rows missing ASIN — searching by product name...`);
      for (let i = 0; i < missingAsinRows.length; i++) {
        const row = missingAsinRows[i];
        progressCallback?.(
          i,
          missingAsinRows.length,
          `Resolving ASIN ${i + 1}/${missingAsinRows.length}: ${row.productName}`
        );

        const resolvedAsin = await resolveAsinForRow(row, deliveryPincode);
        if (resolvedAsin) {
          row.asin = resolvedAsin;
          console.log(`  ✓ Row ${row.row}: "${row.productName}" → ${resolvedAsin}`);
        } else {
          console.log(`  ✗ Row ${row.row}: Could not resolve ASIN for "${row.productName}"`);
        }
      }
    }

    const asins = rows.map(row => row.asin).filter(asin => asin);
    console.log(`Extracted ${asins.length} ASINs for location-based batch processing`);

    if (asins.length === 0) {
      console.warn('⚠️ No ASINs available — add ASIN/Product_URL columns or ensure product names are searchable');
    } else {
      priceResults = await extractPricesFromMatrixApi(asins, progressCallback, deliveryPincode);
    }
  }

  // Convert to ProcessingResult format - ENSURE PROPER ROW NUMBERS
  const results: ProcessingResult[] = rows.map((row, index) => {
    const identifier = portal === 'flipkart' ? (row.productUrl || row.productName) : row.asin;

    let extractedPrice: number | string | undefined;
    let fetchedUrl = row.productUrl;

    if (portal === 'flipkart') {
      extractedPrice = priceResults[identifier]?.price;
      fetchedUrl = fetchedUrl || priceResults[identifier]?.fetchedUrl;
    } else {
      extractedPrice = priceResults[identifier];
    }

    // Use the actual Excel row number from the parsed data
    const actualRowNumber = row.row;

    let benchmarkPrice: number | null = null;
    let status: 'success' | 'not_found' | 'processing' = 'not_found';
    let priceChange: 'higher' | 'lower' | 'similar' | undefined;
    let remarksValue: string = '';

    if (typeof extractedPrice === 'number') {
      // Calculate benchmark price: Portal_Price - Selling_Price
      benchmarkPrice = extractedPrice - row.sellingPrice;
      status = 'success';

      // Calculate price change based on 2% threshold
      const twoPercentThreshold = row.sellingPrice * 0.02;

      if (benchmarkPrice > twoPercentThreshold) {
        priceChange = 'higher'; // Portal price is significantly higher than selling price
        remarksValue = 'Favourable';
      } else if (benchmarkPrice < -twoPercentThreshold) {
        priceChange = 'lower'; // Portal price is significantly lower than selling price
        remarksValue = 'Unfavourable';
      } else {
        priceChange = 'similar'; // Within 2% threshold
        remarksValue = '';
      }

      const pinInfo = portal === 'flipkart' ? '' : ` (PIN: ${deliveryPincode})`;
      console.log(`Excel Row ${actualRowNumber}: ${portal}=$${extractedPrice}${pinInfo}, Selling=$${row.sellingPrice}, Benchmark=$${benchmarkPrice}, Change=${priceChange}, Remarks=${remarksValue}`);
    } else {
      const failureReason = !row.asin
        ? 'No ASIN — add ASIN/Product_URL or use a searchable product name'
        : extractedPrice ?? 'Currently Unavailable';
      console.log(`Excel Row ${actualRowNumber}: Location-based price extraction failed - ${failureReason}`);
      remarksValue = typeof failureReason === 'string' ? failureReason : 'Currently Unavailable';
    }

    const result: ProcessingResult = {
      row: actualRowNumber, // Use the actual Excel row number
      productName: row.productName,
      originalPrice: row.sellingPrice,
      amazonPrice: typeof extractedPrice === 'number' ? extractedPrice : (remarksValue || extractedPrice),
      benchmarkPrice: benchmarkPrice,
      status: status,
      priceChange: priceChange,
      productUrl: fetchedUrl || (portal === 'amazon' ? `https://amazon.in/dp/${row.asin}` : row.productUrl),
      asin: portal === 'amazon' ? row.asin : undefined,
      remarks: remarksValue
    };

    return result;
  });

  const successCount = results.filter(r => r.status === 'success').length;
  const failureCount = results.filter(r => r.status !== 'success').length;
  const higherCount = results.filter(r => r.priceChange === 'higher').length;
  const lowerCount = results.filter(r => r.priceChange === 'lower').length;

  console.log(`\n=== ${portal.toUpperCase()} BATCH PROCESSING COMPLETE ===`);
  console.log(`📍 Delivery PIN code used: ${deliveryPincode}`);
  console.log(`🛒 Portal used: ${portal.toUpperCase()}`);
  console.log(`✅ Successfully processed: ${successCount}/${rows.length}`);
  console.log(`❌ Failed to process: ${failureCount}/${rows.length}`);
  console.log(`📈 Higher prices (>2% favorable): ${higherCount}`);
  console.log(`📉 Lower prices (>2% unfavorable): ${lowerCount}`);
  console.log(`📊 Processed Excel rows: ${results.map(r => r.row).join(', ')}`);

  return results;
};
