
import { ProcessingResult } from '@/types/processing';

export const logProcessingSummary = (
  results: ProcessingResult[],
  allRowsData: any[][],
  processedRowCount: number,
  fileName: string,
  portal: string = 'amazon'
) => {
  const successCount = results.filter(r => r.status === 'success').length;
  const unavailableCount = results.filter(r => typeof r.amazonPrice !== 'number').length;
  const portalName = portal.charAt(0).toUpperCase() + portal.slice(1);
  
  console.log(`\n=== File Save Summary ===`);
  console.log(`- Total rows in output file: ${allRowsData.length - 1}`);
  console.log(`- Rows processed for ${portalName} prices: ${processedRowCount}`);
  console.log(`- Successful price extractions: ${successCount}`);
  console.log(`- Price unavailable: ${unavailableCount}`);
  console.log(`- File automatically downloaded as: ${fileName}`);
  console.log(`- Column structure: Original columns + ${portalName}_Price + Benchmark_Price + Remarks + Product_URL`);
  console.log(`- Color coding applied to Benchmark_Price column based on 2% threshold`);
};
