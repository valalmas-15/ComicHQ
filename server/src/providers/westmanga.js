const axios = require("axios");
const GenericWPProvider = require("./genericProvider");

class Westmanga extends GenericWPProvider {
  constructor() {
    super("Westmanga", "https://westmanga.tv", {
      item: 'div.grid div.overflow-hidden',
      title: 'p.font-medium',
      link: 'a[href*="/comic/"]',
      image: 'a[href*="/comic/"] img',
      chapter: 'div[data-slot="card"] a',
      searchPath: '/contents?q='
    });
  }

  async search(query) {
    try {
      const url = `https://data.westmanga.tv/api/contents?q=${encodeURIComponent(query).replace(/%20/g, '+')}&page=1&per_page=40&project=false`;
      console.log(`📡 [Westmanga API] Searching: ${url}`);
      
      const { data } = await axios.get(url, {
        headers: { 
          'User-Agent': 'Mozilla/5.0',
          'Referer': 'https://westmanga.tv/',
          'Accept': 'application/json'
        }
      });

      if (!data || !data.data) return [];

      return data.data.map(item => ({
        provider: this.name,
        title: item.title,
        link: `${this.baseUrl}/comic/${item.slug}`,
        source_id: `${this.baseUrl}/comic/${item.slug}`,
        image: item.cover || '',
        source: this.baseUrl,
        latest_chapter: item.lastChapters && item.lastChapters[0] ? `Ch. ${item.lastChapters[0].number}` : null
      }));
    } catch (error) {
      console.error(`❌ [Westmanga API] Search Failed:`, error.message);
      // Fallback to generic WP search if API fails
      return super.search(query);
    }
  }

  async getChapters(mangaUrl) {
    try {
      const slug = mangaUrl.split('/').filter(Boolean).pop();
      const apiUrl = `https://data.westmanga.tv/api/comic/${slug}`;
      console.log(`📡 [Westmanga API] Chapters: ${apiUrl}`);

      const { data } = await axios.get(apiUrl, {
        headers: { 
          'User-Agent': 'Mozilla/5.0',
          'Referer': 'https://westmanga.tv/',
          'Accept': 'application/json'
        }
      });

      if (!data || !data.data || !data.data.chapters) return [];

      return data.data.chapters.map(c => ({
        id: `${this.baseUrl}/view/${c.slug}`,
        title: `Chapter ${c.number}`,
        updated_at: c.formatted_date || ''
      }));
    } catch (error) {
      console.error(`❌ [Westmanga API] Chapters Failed:`, error.message);
      return super.getChapters(mangaUrl);
    }
  }

  async getPages(chapterUrl) {
    try {
      const slug = chapterUrl.split('/').filter(Boolean).pop();
      // Updated endpoint: /api/v/ instead of /api/view/
      const apiUrl = `https://data.westmanga.tv/api/v/${slug}`;
      console.log(`📡 [Westmanga API] Pages: ${apiUrl}`);

      const { data } = await axios.get(apiUrl, {
        headers: { 
          'User-Agent': 'Mozilla/5.0',
          'Referer': 'https://westmanga.tv/',
          'Accept': 'application/json'
        },
        timeout: 10000
      });

      if (data && data.data && data.data.images && data.data.images.length > 0) {
        console.log(`✅ [Westmanga API] Success: ${data.data.images.length} pages.`);
        return data.data.images;
      }
    } catch (error) {
      console.error(`❌ [Westmanga API] Pages Failed:`, error.message);
    }

    // Modern Scraping Fallback for React/Remix layouts
    console.log(`📡 [Westmanga Scraper] Fetching: ${chapterUrl}`);
    try {
       const { data: html } = await axios.get(chapterUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
            'Referer': this.baseUrl,
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8'
          },
          timeout: 15000
       });
       
       const $ = cheerio.load(html);
       
       // Strong priority for images with explicit page numbering in 'alt'
       let images = $("img[alt^='Page '], img[alt^='page '], img[alt*='page_']")
          .map((i, el) => $(el).attr("src") || $(el).attr("data-src") || $(el).attr("data-lazy-src"))
          .get()
          .filter(img => img && img.startsWith("http"));

       // Second priority: main container for images
       if (images.length === 0) {
          const containerSelectors = '.flex-col.items-center.mb-4 img, #readerarea img, div[data-slot="canvas"] img, div.relative.flex.justify-center img';
          images = $(containerSelectors)
            .map((i, el) => $(el).attr("src") || $(el).attr("data-src") || $(el).attr("data-lazy-src"))
            .get()
            .filter(img => img && img.startsWith("http") && !img.includes("ads") && !img.includes("logo") && !img.includes("gif"));
       }

       if (images.length > 0) {
          console.log(`✅ [Westmanga Scraper] Found ${images.length} pages.`);
          return images;
       }
    } catch (e) {
       console.error(`❌ [Westmanga Scraper] Failed:`, e.message);
    }

    return super.getPages(chapterUrl);
  }
}

module.exports = new Westmanga();
