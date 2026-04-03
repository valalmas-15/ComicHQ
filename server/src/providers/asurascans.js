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

      const $ = cheerio.load(html);
      let images = [];

      // Strategy 1: Extract from ts_reader JSON block (most reliable for order)
      const scripts = $("script").toArray();
      for (const script of scripts) {
        const content = $(script).html();
        if (content && (content.includes("ts_reader") || content.includes("ts_reader.params.images"))) {
          try {
            const match = content.match(/ts_reader\.params\.images\s*=\s*(\[[^\]]+\])/);
            if (match) {
              const parsed = JSON.parse(match[1]);
              if (Array.isArray(parsed) && parsed.length > 5) {
                return parsed.filter(u => u && u.startsWith('http')).map(u => u.trim());
              }
            }
          } catch (e) {
            console.error("JSON parse failed for ts_reader");
          }
        }
      }

      // Strategy 2: Traditional selectors from the reader area
      // We prioritize data-src/data-lazy-src over src for lazyload themes
      $("#readerarea img, .readerarea img, #chimg-ctn img").each((i, el) => {
        const src = $(el).attr("data-src") || $(el).attr("data-lazy-src") || $(el).attr("src");
        if (src && !src.includes("logo") && !src.includes("banner") && !src.includes("cover")) {
          const cleanSrc = src.trim();
          if (cleanSrc.startsWith('http') && !images.includes(cleanSrc)) {
            images.push(cleanSrc);
          }
        }
      });

      // Strategy 3: Regex fallback (only if few/no images found)
      if (images.length < 5) {
        const regexResults = html.match(
          /https:\/\/(?:cdn\.asurascans\.com\/asura-images|asura\.nacmanga\.com\/wp-content\/uploads|asuratoon\.com\/wp-content\/uploads)\/chapters\/[^"&\s(]+\.(?:webp|jpg|png|jpeg)/g
        );
        if (regexResults) {
          const unique = [...new Set(regexResults)];
          images = unique.filter(img => 
             !img.includes('logo') && 
             !img.includes('banner') &&
             !img.includes('cover')
          );
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
