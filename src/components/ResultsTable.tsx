
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ResultsTableRow } from "@/components/ResultsTableRow";
import { ProcessingResult } from "@/types/processing";

interface ResultsTableProps {
  results: ProcessingResult[];
}

export const ResultsTable = ({ results }: ResultsTableProps) => {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Processing Results</CardTitle>
            <CardDescription>
              Detailed results of price benchmarking process
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Row</TableHead>
                <TableHead>Product Name</TableHead>
                <TableHead>Selling Price</TableHead>
                <TableHead>Portal Price</TableHead>
                <TableHead>Benchmark</TableHead>
                <TableHead>Change</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {results.map((result) => (
                <ResultsTableRow key={result.row} result={result} />
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};
