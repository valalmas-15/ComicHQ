const axios = require('axios');
const cheerio = require('cheerio');
const GenericWPProvider = require('./genericProvider');

class Komiku extends GenericWPProvider {
  constructor() {
    super("Komiku", "https://komiku.id", {
      item: ".listupd .bs, .bsx, .bge",
      title: ".tt, h3",
      link: "a",
      image: "img",
      searchPath: "/?post_type=manga&s="
    });
    this.mirrors = ["https://komiku.id", "https://komiku.online", "https://komiku.org"];
  }

  async search(query) {
    try {
      // 🚀 Use WP JSON API to bypass Cloudflare search protection
      const apiUrl = `${this.baseUrl}/wp-json/wp/v2/search?search=${encodeURIComponent(query)}&subtype=manga&per_page=10`;
      const { data: apiResults } = await axios.get(apiUrl, {
        headers: { 'User-Agent': 'Mozilla/5.0' }
      });

      // Enrich API results with page data from .id mirror (Batch)
      return await Promise.all(apiResults.map(async (item) => {
        try {
          // Switch to stable mirror for detail fetching
          const detailUrl = item.url.replace('komiku.org', 'komiku.online').replace('secure.komikid.org', 'komiku.id');
          const { data: html } = await axios.get(detailUrl, {
            headers: { 'User-Agent': 'Mozilla/5.0' },
            timeout: 5000
          });
          const $ = cheerio.load(html);
          
          const title = item.title || $('.judul h1').text().trim();
          const thumbnail = $('.ims img').attr('src') || $('.bgei img').attr('src') || $('.post-item img').first().attr('src');
          const latest = $('.new1').first().text().trim();
          
          let type = 'manga';
          const typeText = $('.isi').text().toLowerCase();
          if (typeText.includes('manhwa')) type = 'manhwa';
          else if (typeText.includes('manhua')) type = 'manhua';

          return {
            title,
            source_id: item.url, // Original URL for consistency
            thumbnail,
            provider: this.name,
            latest_chapter: latest || 'New',
            type
          };
        } catch (e) {
          return {
            title: item.title,
            source_id: item.url,
            provider: this.name,
            type: 'manga'
          };
        }
      }));
    } catch (error) {
      // 🛸 Scraper Fallback if API fails
      try {
        const url = `${this.baseUrl}/?post_type=manga&s=${encodeURIComponent(query)}`;
        const { data } = await axios.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
        const $ = cheerio.load(data);
        return $('.bge').map((i, el) => {
          const a = $(el).find('.kan a');
          return {
            title: a.find('h3').text().trim(),
            source_id: a.attr('href'),
            thumbnail: $(el).find('.bgei img').attr('src'),
            provider: this.name,
            latest_chapter: $(el).find('.new1').text().trim(),
            type: $(el).text().toLowerCase().includes('manhwa') ? 'manhwa' : 'manga'
          };
        }).get().filter(Boolean);
      } catch (e) {
        console.error(`${this.name} Both API and Scraper failed:`, e.message);
        return [];
      }
    }
  }

  async getChapters(mangaUrl) {
    try {
      // Normalize URL to a stable mirror
      let currentUrl = mangaUrl
        .replace('komiku.org', 'komiku.online')
        .replace('secure.komikid.org', 'komiku.id')
        .replace('komikid.org', 'komiku.id');

      const { data } = await axios.get(currentUrl, {
        headers: { 'User-Agent': 'Mozilla/5.0', 'Referer': 'https://komiku.id/' }
      });
      const $ = cheerio.load(data);
      
      // 1. Try modern .eplister layout
      let chapters = $('.eplister li, #chapterlist li').map((i, el) => {
          const a = $(el).find('a').first();
          return {
              id: a.attr('href'),
              title: $(el).find('.chapternum, .chapter-title').text().trim() || a.text().trim(),
              updated_at: $(el).find('.chapterdate').text().trim()
          };
      }).get();

      // 2. Try older table-based Daftar_Chapter
      if (!chapters.length) {
          chapters = $('#Daftar_Chapter tr, .cl-item').map((i, tr) => {
              const a = $(tr).find('.judulseries a').first() || $(tr).find('a').first();
              if (!a.length) return null;
              
              let href = a.attr('href');
              if (href && !href.startsWith('http')) href = this.baseUrl + href;

              return {
                  id: href,
                  title: a.text().trim(),
                  updated_at: $(tr).find('.tanggalseries, .chapter-date').text().trim()
              };
          }).get();
      }

      return chapters.map(c => {
          if (!c.title || c.title.length < 2) {
              const slug = c.id.split('/').filter(Boolean).pop();
              c.title = slug.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
          }
          return c;
      }).filter(c => c.id);
    } catch (e) { 
        console.error("Komiku Chapters Error:", e.message);
        return []; 
    }
  }

  async getPages(chapterUrl) {
    try {
      const { data } = await axios.get(chapterUrl, {
        headers: { 'User-Agent': 'Mozilla/5.0', 'Referer': this.baseUrl }
      });
      const $ = cheerio.load(data);
      return $('#Baca_Komik img').map((i, img) => {
          const src = $(img).attr('src') || $(img).attr('data-src');
          return src;
      }).get().filter(img => img && img.startsWith('http'));
    } catch (e) { return []; }
  }
}

module.exports = new Komiku();
