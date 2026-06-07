
import { TableCell, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { ProcessingResult } from "@/types/processing";

interface ResultsTableRowProps {
  result: ProcessingResult;
}

export const ResultsTableRow = ({ result }: ResultsTableRowProps) => {
  const formatPrice = (price: number | string) => {
    if (typeof price === 'number') {
      return `$${price.toFixed(2)}`;
    }
    return price;
  };

  const formatBenchmark = (benchmark: number | null) => {
    if (benchmark === null) return '-';
    const sign = benchmark >= 0 ? '+' : '';
    return `${sign}$${benchmark.toFixed(2)}`;
  };

  const getBenchmarkColor = (priceChange?: string, benchmark?: number | null) => {
    if (!priceChange || benchmark === null) return '';
    
    switch (priceChange) {
      case 'higher':
        return 'text-green-700 bg-green-100 font-semibold';
      case 'lower':
        return 'text-red-700 bg-red-100 font-semibold';
      default:
        return '';
    }
  };

  const getPriceChangeIcon = (priceChange?: string) => {
    switch (priceChange) {
      case 'higher':
        return <TrendingUp className="h-4 w-4 text-green-600" />;
      case 'lower':
        return <TrendingDown className="h-4 w-4 text-red-600" />;
      case 'similar':
        return <Minus className="h-4 w-4 text-gray-500" />;
      default:
        return null;
    }
  };

  return (
    <TableRow>
      <TableCell>{result.row}</TableCell>
      <TableCell className="font-medium">{result.productName}</TableCell>
      <TableCell>{formatPrice(result.originalPrice)}</TableCell>
      <TableCell>{formatPrice(result.amazonPrice)}</TableCell>
      <TableCell className={getBenchmarkColor(result.priceChange, result.benchmarkPrice)}>
        {formatBenchmark(result.benchmarkPrice)}
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-2">
          {getPriceChangeIcon(result.priceChange)}
          <span className="capitalize">{result.priceChange || '-'}</span>
        </div>
      </TableCell>
      <TableCell>
        <Badge variant={result.status === 'success' ? 'default' : 'destructive'}>
          {result.status === 'success' ? 'Success' : 'Not Found'}
        </Badge>
      </TableCell>
    </TableRow>
  );
};
