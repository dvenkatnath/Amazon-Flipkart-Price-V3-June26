
import { Progress } from "@/components/ui/progress";
import { Clock, Timer, Calendar } from "lucide-react";
import { ProcessingTiming } from "@/types/processing";

interface ProcessingProgressProps {
  processing: boolean;
  progress: number;
  currentOperation: string;
  currentPrice?: string | number;
  currentProductName?: string;
  timing?: ProcessingTiming;
}

export const ProcessingProgress = ({ 
  processing, 
  progress, 
  currentOperation, 
  currentPrice,
  currentProductName,
  timing 
}: ProcessingProgressProps) => {
  const formatPrice = (price: string | number | undefined) => {
    if (price === undefined) return "";
    if (typeof price === 'number') return `$${price.toFixed(2)}`;
    return price;
  };

  const formatTime = (date: Date | undefined) => {
    if (!date) return "--:--:--";
    return date.toLocaleTimeString();
  };

  const getElapsedTime = () => {
    if (!timing?.startTime) return "00:00:00";
    const now = timing.endTime || new Date();
    const elapsed = now.getTime() - timing.startTime.getTime();
    
    const seconds = Math.floor(elapsed / 1000) % 60;
    const minutes = Math.floor(elapsed / 60000) % 60;
    const hours = Math.floor(elapsed / 3600000);
    
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className="space-y-4">
      {/* Timing Information */}
      <div className="grid grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg">
        <div className="text-center">
          <div className="flex items-center justify-center gap-1 text-sm text-gray-600 mb-1">
            <Calendar className="h-4 w-4" />
            Start Time
          </div>
          <div className="font-mono text-sm font-semibold">
            {formatTime(timing?.startTime)}
          </div>
        </div>
        
        <div className="text-center">
          <div className="flex items-center justify-center gap-1 text-sm text-gray-600 mb-1">
            <Timer className="h-4 w-4" />
            Elapsed Time
          </div>
          <div className="font-mono text-sm font-semibold text-blue-600">
            {timing ? getElapsedTime() : "00:00:00"}
          </div>
        </div>
        
        <div className="text-center">
          <div className="flex items-center justify-center gap-1 text-sm text-gray-600 mb-1">
            <Clock className="h-4 w-4" />
            End Time
          </div>
          <div className="font-mono text-sm font-semibold">
            {formatTime(timing?.endTime)}
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      {processing && (
        <div className="space-y-3">
          <div className="space-y-1">
            <div className="flex justify-between text-sm">
              <span>Progress</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <Progress value={progress} className="w-full h-3" />
          </div>
          
          {currentOperation && (
            <p className="text-sm text-muted-foreground">{currentOperation}</p>
          )}

          {currentProductName && currentPrice !== undefined && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <div className="text-sm font-medium text-blue-800 mb-1">
                Latest Result: {currentProductName}
              </div>
              <div className="text-sm text-blue-700">
                Amazon Price: <span className="font-semibold">{formatPrice(currentPrice)}</span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
