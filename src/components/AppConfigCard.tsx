
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Save } from "lucide-react";

interface AppConfigCardProps {
  inputPath: string;
  diffPercent: number;
  rowsToProcess: number;
  proxy: string;
  portal: string;
  onInputPathChange: (path: string) => void;
  onDiffPercentChange: (percent: number) => void;
  onRowsToProcessChange: (rows: number) => void;
  onProxyChange: (proxy: string) => void;
  onPortalChange: (portal: string) => void;
  onSave: () => void;
}

const AppConfigCard = ({
  inputPath,
  diffPercent,
  rowsToProcess,
  proxy,
  portal,
  onInputPathChange,
  onDiffPercentChange,
  onRowsToProcessChange,
  onProxyChange,
  onPortalChange,
  onSave
}: AppConfigCardProps) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Application Configuration</CardTitle>
        <CardDescription>
          Configure processing parameters and other settings for the benchmarking tool.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="portal">E-commerce Portal</Label>
          <Select value={portal} onValueChange={onPortalChange}>
            <SelectTrigger>
              <SelectValue placeholder="Select portal" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="amazon">Amazon India</SelectItem>
              <SelectItem value="flipkart">Flipkart</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="inputPath">Input Path</Label>
          <Input
            id="inputPath"
            value={inputPath}
            onChange={(e) => onInputPathChange(e.target.value)}
            placeholder="/path/to/input/folder"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="diffPercent">Difference % Threshold</Label>
            <Input
              id="diffPercent"
              type="number"
              step="0.1"
              min="0"
              value={diffPercent}
              onChange={(e) => onDiffPercentChange(parseFloat(e.target.value) || 0)}
              placeholder="2.0"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="rowsToProcess">Rows to Process</Label>
            <Input
              id="rowsToProcess"
              type="number"
              min="1"
              value={rowsToProcess}
              onChange={(e) => onRowsToProcessChange(parseInt(e.target.value) || 1)}
              placeholder="10"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="proxy">Proxy (Optional)</Label>
          <Input
            id="proxy"
            value={proxy}
            onChange={(e) => onProxyChange(e.target.value)}
            placeholder="ip:port or user:pass@ip:port"
          />
        </div>

        <Button onClick={onSave} className="w-full">
          <Save className="h-4 w-4 mr-2" />
          Save Settings
        </Button>
      </CardContent>
    </Card>
  );
};

export default AppConfigCard;
