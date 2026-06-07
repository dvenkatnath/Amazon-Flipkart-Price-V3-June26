
export const generateOutputFileName = (portal: string = 'amazon'): string => {
  // Generate filename: AMZ_YY_MM_DD_HHMMSS.xlsx or FLP_YY_MM_DD_HHMMSS.xlsx
  const now = new Date();
  const year = now.getFullYear().toString().slice(-2);
  const month = (now.getMonth() + 1).toString().padStart(2, '0');
  const day = now.getDate().toString().padStart(2, '0');
  const hours = now.getHours().toString().padStart(2, '0');
  const minutes = now.getMinutes().toString().padStart(2, '0');
  const seconds = now.getSeconds().toString().padStart(2, '0');
  
  const prefix = portal === 'flipkart' ? 'FLP' : 'AMZ';
  return `${prefix}_${year}_${month}_${day}_${hours}${minutes}${seconds}.xlsx`;
};
