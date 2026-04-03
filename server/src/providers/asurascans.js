const axios = require('axios');
const cheerio = require('cheerio');
const GenericWPProvider = require('./genericProvider');

class AsuraScans extends GenericWPProvider {
  constructor() {
    super("Asura Scans", "https://asuratoon.com", {
      item: ".listupd .bs, .bsx, .series-card, .grid > a, .divide-y > div, a.flex.gap-3",
      title: ".tt, h3, .font-medium, .text-sm.font-bold, .text-sm.font-semibold",
      link: "a",
      image: "img",
      searchPath: "/?s="
    });
    this.mirrors = [
      "https://asuratoon.com",
      "https://asuracomic.net",
      "https://asurascans.com"
    ];
  }

  async getPages(chapterUrl) {
    try {
      console.log(`📡 [Asura Scans Scraper] Fetching: ${chapterUrl}`);
      const { data: html } = await axios.get(chapterUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
          'Referer': this.baseUrl,
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8'
        },
        timeout: 15000
      });

      // Strategy 1: Standard Search
      const $ = cheerio.load(html);
      let images = $(".main-reading-area img, #readerarea img, .w-full.flex-col img, .flex.flex-col.items-center img")
        .map((i, el) => $(el).attr("src") || $(el).attr("data-src") || $(el).attr("data-lazy-src"))
        .get()
        .filter(img => img && img.startsWith("http") && !img.includes('logo') && !img.includes('banner'));

      // Strategy 2: Robust Regex for Streamed/Encoded URLs (common on Remix-style Asura pages)
      if (images.length < 5) {
        console.log(`🎨 [Asura Scans] DOM Extraction found only ${images.length} images. Trying cleaned Regex...`);
        
        const cleanHtml = html.replace(/&quot;/g, '"');
        
        const regexes = [
          /https:\/\/cdn\.asurascans\.com\/asura-images\/chapters\/[^"&\s(]+\.webp/g,
          /https:\/\/asura\.nacmanga\.com\/wp-content\/uploads\/[^"&\s(]+\.(?:webp|jpg|png|jpeg)/g
        ];

        let regexResults = [];
        for (const re of regexes) {
           const matches = cleanHtml.match(re);
           if (matches && matches.length > 3) {
              regexResults = [...regexResults, ...matches];
           }
        }

        const filtered = [...new Set(regexResults)]
           .filter(img => 
             !img.includes('logo') && 
             !img.includes('banner') && 
             !img.includes('cover')
           ); // REMOVED SORT - matches stay in document order

        if (filtered.length > 0) {
           console.log(`✅ [Asura Scans] Regex extract found ${filtered.length} images.`);
           return filtered;
        }
      }

      if (images.length > 0) return images;
    } catch (e) {
      console.error(`❌ [Asura Scans] Failed:`, e.message);
    }
    return super.getPages(chapterUrl);
  }
}

module.exports = new AsuraScans();
