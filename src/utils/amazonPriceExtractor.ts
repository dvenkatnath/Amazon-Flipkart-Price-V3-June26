
export const extractAmazonPrice = async (productUrl: string): Promise<number | string> => {
  try {
    console.log(`Starting Amazon price extraction for: ${productUrl}`);
    
    // Validate URL format
    if (!productUrl || (!productUrl.includes('amazon') && !productUrl.startsWith('B0'))) {
      console.log('Invalid Amazon URL provided');
      return 'Invalid Amazon URL format';
    }
    
    // Convert ASIN to full Amazon URL if needed
    let fullUrl = productUrl;
    if (productUrl.startsWith('B0') && productUrl.length === 10) {
      fullUrl = `https://www.amazon.com/dp/${productUrl}`;
      console.log(`Converted ASIN to full URL: ${fullUrl}`);
    }
    
    // Extract ASIN from URL for reference
    const asinMatch = fullUrl.match(/\/dp\/([A-Z0-9]{10})|\/gp\/product\/([A-Z0-9]{10})|product\/([A-Z0-9]{10})/);
    const asin = asinMatch ? (asinMatch[1] || asinMatch[2] || asinMatch[3]) : null;
    console.log(`Extracted ASIN: ${asin}`);
    
    // Try multiple extraction methods in sequence
    const extractionMethods = [
      () => tryProxyExtraction(fullUrl),
      () => tryAlternativeProxy(fullUrl),
      () => tryDirectFetch(fullUrl),
    ];
    
    for (let i = 0; i < extractionMethods.length; i++) {
      try {
        console.log(`Trying extraction method ${i + 1}...`);
        const result = await extractionMethods[i]();
        if (result && typeof result === 'number' && result > 0) {
          console.log(`✅ Extraction SUCCESS with method ${i + 1}: $${result}`);
          return result;
        }
      } catch (error) {
        console.log(`Method ${i + 1} failed:`, error.message);
        continue;
      }
    }
    
    // If all methods fail, return a descriptive error
    console.log('❌ All extraction methods failed - Amazon blocking detected');
    return 'Amazon access blocked - unable to extract price';
    
  } catch (error) {
    console.error('Critical error in Amazon price extraction:', error);
    return `Extraction Error: ${error.message}`;
  }
};

// Method 1: Primary proxy with enhanced headers
const tryProxyExtraction = async (fullUrl: string): Promise<number | null> => {
  console.log('Method 1: Enhanced proxy extraction...');
  
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 8000); // 8 second timeout
  
  try {
    const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(fullUrl)}`;
    
    const response = await fetch(proxyUrl, {
      method: 'GET',
      signal: controller.signal,
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });
    
    clearTimeout(timeoutId);
    
    if (response.ok) {
      const data = await response.json();
      const htmlContent = data.contents;
      
      console.log(`Proxy response received, HTML length: ${htmlContent?.length || 0}`);
      
      if (htmlContent && htmlContent.length > 1000) {
        const price = extractPriceFromHTML(htmlContent);
        if (price && price > 0) {
          return price;
        }
      }
    }
    
    console.log('Enhanced proxy method returned insufficient data');
    return null;
    
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
};

// Method 2: Alternative proxy service
const tryAlternativeProxy = async (fullUrl: string): Promise<number | null> => {
  console.log('Method 2: Alternative proxy service...');
  
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
  
  try {
    const proxyUrl = `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(fullUrl)}`;
    
    const response = await fetch(proxyUrl, {
      method: 'GET',
      signal: controller.signal,
      headers: {
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate, br',
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.1 Safari/605.1.15',
        'Cache-Control': 'no-cache'
      }
    });
    
    clearTimeout(timeoutId);
    
    if (response.ok) {
      const htmlContent = await response.text();
      console.log(`Alternative proxy response received, length: ${htmlContent.length}`);
      
      if (htmlContent && htmlContent.length > 1000) {
        const price = extractPriceFromHTML(htmlContent);
        if (price && price > 0) {
          return price;
        }
      }
    }
    
    console.log('Alternative proxy method failed');
    return null;
    
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
};

// Method 3: Direct fetch attempt (will likely be blocked but worth trying)
const tryDirectFetch = async (fullUrl: string): Promise<number | null> => {
  console.log('Method 3: Direct fetch attempt...');
  
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
  
  try {
    const response = await fetch(fullUrl, {
      method: 'GET',
      signal: controller.signal,
      mode: 'cors',
      headers: {
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    
    clearTimeout(timeoutId);
    
    if (response.ok) {
      const htmlContent = await response.text();
      console.log(`Direct fetch response received, length: ${htmlContent.length}`);
      
      const price = extractPriceFromHTML(htmlContent);
      if (price && price > 0) {
        return price;
      }
    }
    
    console.log('Direct fetch method failed');
    return null;
    
  } catch (error) {
    clearTimeout(timeoutId);
    console.log('Direct fetch blocked by CORS (expected)');
    throw error;
  }
};

// Enhanced price extraction from HTML with better selectors and fallbacks
const extractPriceFromHTML = (htmlContent: string): number | null => {
  try {
    console.log('Parsing HTML for price information...');
    
    // First try to parse as DOM
    let doc: Document;
    try {
      const parser = new DOMParser();
      doc = parser.parseFromString(htmlContent, 'text/html');
    } catch (error) {
      console.log('DOM parsing failed, falling back to regex...');
      return extractPriceWithRegex(htmlContent);
    }
    
    // Updated Amazon price selectors (comprehensive list)
    const priceSelectors = [
      '.a-price .a-offscreen',
      '.a-price-whole',
      '.a-price .a-price-whole',
      '.a-price.a-text-price.a-size-medium.apexPriceToPay .a-offscreen',
      '.a-price.a-text-price.a-size-base .a-offscreen',
      '#priceblock_dealprice',
      '#priceblock_ourprice',
      '.a-price-range .a-price .a-offscreen',
      '[data-a-price-amount]',
      '.a-text-price .a-offscreen',
      '.a-price.a-text-price .a-offscreen',
      'span.a-price-symbol + span.a-price-whole',
      '.a-button-selected .a-color-price',
      '#apex_desktop .a-price .a-offscreen',
      '.a-price-current .a-offscreen',
      '.a-price.a-text-price.a-color-price .a-offscreen',
      '.a-section [data-a-price-amount]'
    ];
    
    // Try each selector
    for (const selector of priceSelectors) {
      const elements = doc.querySelectorAll(selector);
      console.log(`Selector "${selector}": Found ${elements.length} elements`);
      
      for (const element of elements) {
        let priceText = element.textContent || element.getAttribute('data-a-price-amount') || '';
        
        if (priceText) {
          console.log(`Found price text: "${priceText}"`);
          const price = parsePriceString(priceText);
          
          if (price && price > 0 && price < 50000) { // Reasonable price range
            console.log(`✅ Successfully parsed price: $${price}`);
            return price;
          }
        }
      }
    }
    
    // Fallback to regex if DOM selectors fail
    console.log('DOM selectors failed, trying regex fallback...');
    return extractPriceWithRegex(htmlContent);
    
  } catch (error) {
    console.error('Error parsing HTML for price:', error);
    return extractPriceWithRegex(htmlContent);
  }
};

// Regex-based price extraction as fallback
const extractPriceWithRegex = (htmlContent: string): number | null => {
  console.log('Using regex-based price extraction...');
  
  const pricePatterns = [
    /["']priceAmount["']\s*:\s*(\d+\.?\d*)/gi,
    /["']price["']\s*:\s*["']?\$?(\d+\.?\d*)["']?/gi,
    /\$(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)/g,
    /USD\s*(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)/gi,
    /"a-price-amount">(\d+\.?\d*)</gi,
    /data-a-price-amount="(\d+\.?\d*)"/gi
  ];
  
  for (const pattern of pricePatterns) {
    const matches = Array.from(htmlContent.matchAll(pattern));
    if (matches.length > 0) {
      console.log(`Found ${matches.length} matches with pattern: ${pattern}`);
      
      for (const match of matches) {
        const priceStr = match[1];
        const price = parsePriceString(priceStr);
        if (price && price > 0.99 && price < 10000) {
          console.log(`✅ Regex extraction found valid price: $${price}`);
          return price;
        }
      }
    }
  }
  
  console.log('❌ No valid price found with regex patterns');
  return null;
};

// Improved price string parsing
const parsePriceString = (priceStr: string): number | null => {
  if (!priceStr) return null;
  
  // Remove currency symbols, commas, and extra whitespace
  const cleanPrice = priceStr
    .replace(/[$£€¥₹,\s]/g, '')
    .replace(/USD|CAD|GBP|EUR/gi, '')
    .replace(/[^\d.]/g, '')
    .trim();
  
  const price = parseFloat(cleanPrice);
  
  // Validate the parsed price
  if (isNaN(price) || price <= 0) {
    return null;
  }
  
  return price;
};

// Helper function to validate Amazon URLs
export const validateAmazonUrl = (url: string): boolean => {
  try {
    if (url.startsWith('B0') && url.length === 10) {
      return true; // Valid ASIN
    }
    const urlObj = new URL(url);
    return urlObj.hostname.includes('amazon');
  } catch {
    return false;
  }
};
