
export interface SearchResult {
  searchQuery: string;
  productName: string;
  timestamp: Date;
  prices: PriceInfo[];
}

export interface PriceInfo {
  id: string;
  retailer: string;
  price: number;
  shipping?: number;
  availability: 'in-stock' | 'limited' | 'out-of-stock';
  rating?: number;
  lastUpdated: Date;
}
