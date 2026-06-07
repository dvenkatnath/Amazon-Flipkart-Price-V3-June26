
import { Button } from "@/components/ui/button";
import { FileSpreadsheet } from "lucide-react";
import { Link } from "react-router-dom";

const Index = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <img 
              src="/lovable-uploads/21797b74-e48b-48e9-bd6d-520b7c0516da.png" 
              alt="Customer Capital Logo" 
              className="h-12 w-auto"
            />
            <h1 className="text-4xl font-bold text-gray-900">E-commerce Price Benchmarking Hub</h1>
          </div>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto mb-6">
            Upload Excel files to benchmark your prices against Amazon and Flipkart automatically using our advanced pricing intelligence.
          </p>
          
          {/* Main Tool Card */}
          <div className="max-w-md mx-auto mb-8">
            <div className="bg-white rounded-lg shadow-md p-6 border">
              <h3 className="text-xl font-semibold mb-3">Excel Benchmarking Tool</h3>
              <p className="text-gray-600 mb-4">Upload Excel files to benchmark your prices against Amazon and Flipkart automatically.</p>
              <Link to="/benchmark" className="inline-block">
                <Button size="lg" className="w-full">
                  <FileSpreadsheet className="h-5 w-5 mr-2" />
                  Launch Benchmarking Tool
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
