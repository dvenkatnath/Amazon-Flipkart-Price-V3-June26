
export interface ColumnIndices {
  priceColIndex: number | undefined;
  benchmarkColIndex: number | undefined;
  remarksColIndex: number | undefined;
  productUrlColIndex: number | undefined;
}

export const findColumnIndices = (originalHeaders: any[], portal: string = 'amazon'): ColumnIndices => {
  console.log(`Original headers: ${originalHeaders.join(', ')}`);
  const portalName = portal.toLowerCase();
  
  // Find existing column indices
  const existingProductUrlIndex = originalHeaders.findIndex(header => 
    header && header.toString().toLowerCase().includes('product_url')
  );
  
  // Look for both Amazon_Price and Flipkart_Price columns
  const priceIndex = originalHeaders.findIndex(header => {
    if (!header) return false;
    const headerStr = header.toString().toLowerCase();
    return headerStr.includes('amazon_price') || headerStr.includes('flipkart_price');
  });
  
  const benchmarkPriceIndex = originalHeaders.findIndex(header => 
    header && header.toString().toLowerCase().includes('benchmark_price')
  );
  
  const remarksIndex = originalHeaders.findIndex(header => 
    header && header.toString().toLowerCase().includes('remarks')
  );
  
  const hasPriceColumn = priceIndex !== -1;
  const hasBenchmarkPrice = benchmarkPriceIndex !== -1;
  const hasRemarks = remarksIndex !== -1;
  const hasProductUrl = existingProductUrlIndex !== -1;
  
  console.log(`${portalName}_Price column exists: ${hasPriceColumn} (index: ${priceIndex})`);
  console.log(`Benchmark_Price column exists: ${hasBenchmarkPrice} (index: ${benchmarkPriceIndex})`);
  console.log(`Remarks column exists: ${hasRemarks} (index: ${remarksIndex})`);
  console.log(`Product_URL column exists: ${hasProductUrl} (index: ${existingProductUrlIndex})`);
  
  return {
    priceColIndex: hasPriceColumn ? priceIndex : undefined,
    benchmarkColIndex: hasBenchmarkPrice ? benchmarkPriceIndex : undefined,
    remarksColIndex: hasRemarks ? remarksIndex : undefined,
    productUrlColIndex: hasProductUrl ? existingProductUrlIndex : undefined
  };
};

export const addMissingColumns = (
  originalHeaders: any[],  
  columnIndices: ColumnIndices,
  portal: string = 'amazon'
): { headers: any[], indices: ColumnIndices } => {
  const newHeaders = [...originalHeaders];
  const updatedIndices = { ...columnIndices };
  const portalName = portal.charAt(0).toUpperCase() + portal.slice(1);
  const priceColumnName = `${portalName}_Price`;
  
  // Find Product_URL index for insertion point
  let insertionPoint = newHeaders.length; // Default to end if Product_URL not found
  
  if (updatedIndices.productUrlColIndex !== undefined) {
    insertionPoint = updatedIndices.productUrlColIndex;
    console.log(`Found Product_URL at index ${insertionPoint}, will insert new columns before it`);
  } else {
    console.log(`Product_URL column not found, will add new columns at the end`);
  }
  
  // Insert columns in order: {Portal}_Price, Benchmark_Price, Remarks
  let columnsInserted = 0;
  
  // Add {Portal}_Price column if missing
  if (updatedIndices.priceColIndex === undefined) {
    newHeaders.splice(insertionPoint + columnsInserted, 0, priceColumnName);
    updatedIndices.priceColIndex = insertionPoint + columnsInserted;
    columnsInserted++;
    console.log(`Inserted ${priceColumnName} at index ${updatedIndices.priceColIndex}`);
  }
  
  // Add Benchmark_Price column if missing
  if (updatedIndices.benchmarkColIndex === undefined) {
    newHeaders.splice(insertionPoint + columnsInserted, 0, 'Benchmark_Price');
    updatedIndices.benchmarkColIndex = insertionPoint + columnsInserted;
    columnsInserted++;
    console.log(`Inserted Benchmark_Price at index ${updatedIndices.benchmarkColIndex}`);
  }
  
  // Add Remarks column if missing
  if (updatedIndices.remarksColIndex === undefined) {
    newHeaders.splice(insertionPoint + columnsInserted, 0, 'Remarks');
    updatedIndices.remarksColIndex = insertionPoint + columnsInserted;
    columnsInserted++;
    console.log(`Inserted Remarks at index ${updatedIndices.remarksColIndex}`);
  }
  
  // Update Product_URL index if it was shifted
  if (updatedIndices.productUrlColIndex !== undefined && columnsInserted > 0) {
    updatedIndices.productUrlColIndex = updatedIndices.productUrlColIndex + columnsInserted;
    console.log(`Updated Product_URL index to ${updatedIndices.productUrlColIndex}`);
  }
  
  console.log(`Final column order: ${newHeaders.join(', ')}`);
  console.log(`${priceColumnName} at index: ${updatedIndices.priceColIndex}`);
  console.log(`Benchmark_Price at index: ${updatedIndices.benchmarkColIndex}`);
  console.log(`Remarks at index: ${updatedIndices.remarksColIndex}`);
  console.log(`Product_URL at index: ${updatedIndices.productUrlColIndex}`);
  
  return { headers: newHeaders, indices: updatedIndices };
};
