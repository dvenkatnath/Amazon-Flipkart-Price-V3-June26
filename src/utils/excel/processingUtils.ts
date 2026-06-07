
export const formatElapsedTime = (ms: number): string => {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  
  if (hours > 0) {
    return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
  } else if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  } else {
    return `${seconds}s`;
  }
};

export const logProcessingSummary = (
  results: any[],
  allRowsData: any[][],
  strategy: any,
  outputFileName: string,
  outputPath: string,
  startTime: Date,
  endTime: Date
) => {
  const elapsedMs = endTime.getTime() - startTime.getTime();
  const elapsedTime = formatElapsedTime(elapsedMs);
  
  console.log(`\n=== Processing Summary ===`);
  console.log(`Start Time: ${startTime.toLocaleString()}`);
  console.log(`End Time: ${endTime.toLocaleString()}`);
  console.log(`Elapsed Time: ${elapsedTime}`);
  console.log(`Processing Strategy: ${strategy.startFromFirstRow ? 'Fresh File' : 'Incremental Processing'}`);
  if (strategy.backupFileName) {
    console.log(`Backup File Created: ${strategy.backupFileName}`);
  }
  console.log(`Total rows in output file: ${allRowsData.length - 1}`);
  console.log(`Rows processed in this batch: ${results.length}`);
  console.log(`Excel rows processed: ${results.map(r => r.row).join(', ')}`);
  console.log(`Successful extractions: ${results.filter(r => r.status === 'success').length}`);
  console.log(`Output file: ${outputPath}/${outputFileName}`);
};
