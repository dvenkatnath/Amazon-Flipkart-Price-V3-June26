import FirecrawlApp from '@mendable/firecrawl-js';

interface ErrorResponse {
  success: false;
  error: string;
}

interface CrawlStatusResponse {
  success: true;
  status: string;
  completed: number;
  total: number;
  creditsUsed: number;
  expiresAt: string;
  data: any[];
}

export type CrawlResponse = CrawlStatusResponse | ErrorResponse;

export class FirecrawlService {
  private static API_KEY_STORAGE_KEY = 'firecrawl_api_key';
  private static firecrawlApp: FirecrawlApp | null = null;

  static saveApiKey(apiKey: string): void {
    localStorage.setItem(this.API_KEY_STORAGE_KEY, apiKey);
    this.firecrawlApp = new FirecrawlApp({ apiKey });
    console.log('🔥 Firecrawl API key saved successfully');
  }

  static getApiKey(): string | null {
    // Return provided key or check localStorage
    const providedKey = "fc-5d85427bd03946738cd9cbc8249067d2";
    const storedKey = localStorage.getItem(this.API_KEY_STORAGE_KEY);
    return storedKey || providedKey;
  }

  static async testApiKey(apiKey: string): Promise<boolean> {
    try {
      console.log('🧪 Testing Firecrawl API key');
      this.firecrawlApp = new FirecrawlApp({ apiKey });
      const testResponse = await this.firecrawlApp.crawlUrl('https://example.com', { limit: 1 });
      return (testResponse as any)?.success === true;
    } catch (error) {
      console.error('Error testing Firecrawl API key:', error);
      return false;
    }
  }

  static async crawlWebsite(url: string): Promise<{ success: boolean; error?: string; data?: CrawlResponse }> {
    const apiKey = this.getApiKey();
    if (!apiKey) {
      return { success: false, error: 'Firecrawl API key not set' };
    }

    try {
      if (!this.firecrawlApp) {
        this.firecrawlApp = new FirecrawlApp({ apiKey });
      }

      console.log('🌐 Crawling URL via Firecrawl:', url);
      const crawlResponse = await this.firecrawlApp.crawlUrl(url, {
        limit: 1,
        scrapeOptions: { formats: ['html', 'markdown'] }
      }) as CrawlResponse;

      if (!(crawlResponse as any)?.success) {
        const err = (crawlResponse as any)?.error || 'Unknown error';
        return { success: false, error: err };
      }

      return { success: true, data: crawlResponse };
    } catch (error) {
      console.error('Error during Firecrawl crawl:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Failed to connect to Firecrawl API' };
    }
  }

  static async searchFlipkartUrl(productName: string): Promise<string | null> {
    const apiKey = this.getApiKey();
    if (!apiKey) return null;

    try {
      const cleanName = productName.replace(/[^\w\s]/g, ' ').replace(/\s+/g, ' ').trim();
      const searchUrl = `https://www.flipkart.com/search?q=${encodeURIComponent(cleanName)}`;
      console.log(`🌐 [FirecrawlService] Searching Flipkart for: ${cleanName}`);

      const resp = await fetch('https://api.firecrawl.dev/v1/scrape', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          url: searchUrl,
          formats: ['markdown'],
          onlyMainContent: true
        })
      });

      const result = await resp.json();

      if (result.success && result.data && result.data.markdown) {
        const md = result.data.markdown;
        const linkRegex = /\]\((?:https:\/\/www\.flipkart\.com)?\/?([a-zA-Z0-9-]+\/p\/[a-zA-Z0-9]+.*?)\)/g;
        let match;
        while ((match = linkRegex.exec(md)) !== null) {
          const link = match[1];
          if (!link.includes('page=') && link.includes('/p/')) {
            return `https://www.flipkart.com/${link}`;
          }
        }
      }
      return null;
    } catch (err) {
      console.error('Error during Firecrawl search:', err);
      return null;
    }
  }
}
