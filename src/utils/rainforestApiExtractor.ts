// Basic Rainforest extractor (legacy — main logic is in matrixApiExtractor.ts)
// Fixed: product.main_price does not exist; correct fallback is product.price.value

export interface RainforestApiResponse {
  request_info: {
    success: boolean;
    message?: string;
  };
  product?: {
    price?: { value?: number; currency?: string; raw?: string };
    buybox_winner?: {
      price?: { value?: number; currency?: string; raw?: string };
      availability?: { type?: string; raw?: string };
    };
  };
  offers?: Array<{
    price?: { value?: number };
    condition?: { is_new?: boolean };
  }>;
}

export const extractPriceFromRainforestApi = async (asin: string): Promise<number | string> => {
  try {
    const apiKey = 'DBD1626523264DC5863B0272E2924438';
    const params = new URLSearchParams({
      api_key: apiKey,
      type: 'product',
      amazon_domain: 'amazon.in',
      asin,
    });

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15_000);

    const response = await fetch(`/api/rainforest?${params}`, {
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    });
    clearTimeout(timeoutId);

    if (!response.ok) return `API Error: ${response.status}`;

    const data: RainforestApiResponse = await response.json();

    if (!data.request_info?.success) return 'API request failed';

    // ✅ Correct price paths (main_price doesn't exist in the real API)
    const price =
      data.product?.buybox_winner?.price?.value ??
      data.product?.price?.value;

    if (price && price > 0) return price;
    return 'Price not available';

  } catch (err: any) {
    if (err.name === 'AbortError') return 'Request timed out';
    return `Error: ${err.message}`;
  }
};
