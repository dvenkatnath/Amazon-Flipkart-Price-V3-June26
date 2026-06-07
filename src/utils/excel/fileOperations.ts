
import * as XLSX from 'xlsx';

// Helper function to convert string to ArrayBuffer
export function s2ab(s: string): ArrayBuffer {
  const buf = new ArrayBuffer(s.length);
  const view = new Uint8Array(buf);
  for (let i = 0; i < s.length; i++) {
    view[i] = s.charCodeAt(i) & 0xFF;
  }
  return buf;
}

export const downloadExcelFile = (workbook: XLSX.WorkBook, fileName: string) => {
  console.log(`Downloading Excel file: ${fileName}`);
  
  // Convert to binary string and automatically download
  const wbout = XLSX.write(workbook, { 
    bookType: 'xlsx', 
    type: 'binary',
    cellStyles: true // Enable cell styling
  });
  
  const blob = new Blob([s2ab(wbout)], { type: 'application/octet-stream' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  
  console.log(`File automatically downloaded as: ${fileName}`);
};
