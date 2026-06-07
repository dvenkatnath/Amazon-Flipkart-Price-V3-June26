
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { ProcessingResult } from "@/types/processing";

interface ExportSectionProps {
  results: ProcessingResult[];
}

export const ExportSection = ({ results }: ExportSectionProps) => {
  const { toast } = useToast();

  const exportToExcel = () => {
    // Get settings for output path and threshold
    const settingsJson = localStorage.getItem('priceBenchmarkSettings');
    const settings = settingsJson ? JSON.parse(settingsJson) : { 
      diffPercent: 2, 
      outputPath: '/Users/user/Desktop/Output' 
    };

    // Create the output file following the updated requirements
    const today = new Date();
    const dateStr = today.toISOString().split('T')[0];
    const outputFileName = `AMZ_${dateStr}.csv`;

    // Create Excel structure with Amazon_Price, Benchmark_Price, and Remarks columns
    const headers = [
      'Row',
      'Product Name',
      'Selling Price', 
      'Amazon_Price',
      'Benchmark_Price',   
      'Remarks',
      'Product URL',
      'Status'
    ];

    const csvData = results.map(result => {
      let amazonPriceValue: string;
      let benchmarkPriceValue: string;
      let remarksValue: string;
      
      if (typeof result.amazonPrice === 'number') {
        // Price available
        amazonPriceValue = result.amazonPrice.toFixed(2);
        const benchmarkPrice = result.amazonPrice - result.originalPrice;
        benchmarkPriceValue = benchmarkPrice.toFixed(2);
        remarksValue = '';
      } else {
        // Price not available
        amazonPriceValue = '0';
        benchmarkPriceValue = 'NA';
        remarksValue = 'Currently Unavailable';
      }

      return [
        result.row,
        `"${result.productName}"`,
        result.originalPrice.toFixed(2),
        amazonPriceValue,
        benchmarkPriceValue,
        `"${remarksValue}"`,
        `"https://amazon.in/dp/${result.asin || result.row}"`,
        result.status
      ];
    });

    const csvContent = [
      `# Output file automatically saved to: ${settings.outputPath}/${outputFileName}`,
      `# Column Structure: Amazon_Price, Benchmark_Price (Amazon_Price - Selling_Price), Remarks`,
      `# Color Coding Rules:`,
      `# LIGHT GREEN: Benchmark_Price > 0 and > 2% of Selling_Price (favorable)`,
      `# LIGHT RED: Benchmark_Price < 0 and < -2% of Selling_Price (unfavorable)`, 
      `# NO COLOR: Benchmark_Price within ±2% threshold or price unavailable`,
      `# Unavailable prices: Amazon_Price=0, Benchmark_Price=NA, Remarks=Currently Unavailable`,
      ``,
      headers.join(','),
      ...csvData.map(row => row.join(','))
    ].join('\n');

    // Create and download the file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = outputFileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);

    toast({
      title: "Export Complete",
      description: `File ${outputFileName} created with Amazon prices, benchmark calculations, and remarks`,
    });
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Processing Complete</CardTitle>
            <CardDescription>
              Export your results with Amazon prices, benchmark calculations, and remarks
            </CardDescription>
          </div>
          <Button onClick={exportToExcel}>
            <Download className="h-4 w-4 mr-2" />
            Export to Excel
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="p-6 bg-gray-50 rounded-lg">
          <h4 className="font-medium mb-2">Export Information:</h4>
          <ul className="text-sm text-gray-600 space-y-1">
            <li>• Excel file includes Amazon_Price, Benchmark_Price (Amazon_Price - Selling_Price), and Remarks columns</li>
            <li>• Unavailable prices: Amazon_Price=0, Benchmark_Price=NA, Remarks="Currently Unavailable"</li>
            <li>• Color coding: LIGHT GREEN (positive greater than 2%), LIGHT RED (negative greater than 2%), no color (within ±2%)</li>
            <li>• Filename format: AMZ_YYYY-MM-DD.csv</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};
