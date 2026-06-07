
import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { Upload, Play, FileSpreadsheet } from "lucide-react";

interface FileUploadProps {
  file: File | null;
  processing: boolean;
  onFileSelect: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onProcessFile: () => void;
}

export const FileUpload = ({ file, processing, onFileSelect, onProcessFile }: FileUploadProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="space-y-4">
      <input
        type="file"
        ref={fileInputRef}
        onChange={onFileSelect}
        accept=".xlsx,.xls,.csv"
        className="hidden"
      />
      
      <Button
        onClick={() => fileInputRef.current?.click()}
        variant="outline"
        className="w-full h-12 border-2 border-dashed border-blue-300 hover:border-blue-500 hover:bg-blue-50"
        disabled={processing}
      >
        <div className="flex items-center gap-3">
          <FileSpreadsheet className="h-6 w-6 text-blue-600" />
          <div className="text-left">
            <div className="font-medium text-blue-700">
              {file ? `Selected: ${file.name}` : "Choose Excel File"}
            </div>
            <div className="text-xs text-blue-500">
              Supports .xlsx, .xls, .csv files only
            </div>
          </div>
        </div>
      </Button>

      {file && (
        <Button
          onClick={onProcessFile}
          disabled={processing}
          className="w-full h-12 bg-green-600 hover:bg-green-700 text-white font-medium"
        >
          {processing ? (
            <div className="flex items-center gap-2">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
              Processing...
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Play className="h-5 w-5" />
              Start Processing
            </div>
          )}
        </Button>
      )}
    </div>
  );
};
