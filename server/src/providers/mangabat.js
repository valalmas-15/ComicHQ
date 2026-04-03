const axios = require('axios');
const cheerio = require('cheerio');
const BaseProvider = require('./baseProvider');

class Mangabat extends BaseProvider {
  constructor() {
    super("Mangabat", "https://www.mangabats.com");
    this.mirrors = [
      "https://chapmanganato.to",
      "https://manganato.com",
      "https://readmangabat.com"
    ];
  }

  async fetchWithFallback(path, query = '') {
    for (const mirror of this.mirrors) {
      try {
        const url = `${mirror}${path}${query ? encodeURIComponent(query.replace(/ /g, '_')) : ''}`;
        const { data } = await this.fetch(url, {
          headers: { 'Referer': mirror },
          timeout: 8000
        });
        if (data && (data.includes('story') || data.includes('chapter'))) return { data, baseUrl: mirror };
      } catch (e) {
        console.warn(`${this.name} Mirror ${mirror} failed:`, e.message);
      }
    }
    throw new Error("All mirrors failed or blocked");
  }

  async search(query) {
    try {
      const { data, baseUrl } = await this.fetchWithFallback('/search/story/', query);
      const $ = cheerio.load(data);
      
      const selectors = [
        '.story_item',          // mangabats
        '.search-story-item',   // manganato
        '.story-item'           // readmangabat
      ];

      let items = $();
      for (const sel of selectors) {
        items = $(sel);
        if (items.length > 0) break;
      }

      return items.map((i, el) => {
        const a = $(el).find('h3 a, .story_name a, .item-name').first();
        const title = a.text().trim();
        const href = a.attr('href');
        const imgEl = $(el).find('img');
        const thumbnail = imgEl.attr('src') || imgEl.attr('data-src') || imgEl.attr('lazy-src');
        
        // Latest Chapter
        let latest = '';
        const chLink = $(el).find('a[href*="/chapter-"]').first();
        if (chLink.length) latest = chLink.text().trim();

        // Type Detection (Keywords)
        let type = 'manga';
        const scanText = (title + ' ' + $(el).text()).toLowerCase();
        if (scanText.includes('manhwa') || scanText.includes('leveling') || scanText.includes('tower') || scanText.includes('ranker') || scanText.includes('regression')) {
          type = 'manhwa';
        } else if (scanText.includes('manhua') || scanText.includes('cultivation')) {
          type = 'manhua';
        }

        if (!title || !href) return null;

        return {
          title,
          source_id: href.startsWith('http') ? href : `${baseUrl}${href}`,
          thumbnail,
          provider: this.name,
          latest_chapter: latest,
          type
        };
      }).get().filter(Boolean);
    } catch (error) {
      console.error(`${this.name} Search Error:`, error.message);
      return [];
    }
  }

  async getChapters(mangaUrl) {
    try {
      const { data } = await this.fetch(mangaUrl, {
        headers: { 'Referer': 'https://www.mangabats.com/' }
      });
      const $ = cheerio.load(data);
      
      let chapters = $('.chapter-name, .chapter-list a, .list-chapter .chapter-name').map((i, el) => {
        const title = $(el).text().trim();
        const date = $(el).closest('div, li, row').find('.chapter-time, span').last().text().trim();
        return {
          id: $(el).attr('href'),
          title: title,
          updated_at: date || ''
        };
      }).get();

      if (chapters.length === 0) {
        chapters = $('a[href*="/chapter-"]').map((i, el) => ({
          id: $(el).attr('href'),
          title: $(el).text().trim(),
          updated_at: ''
        })).get();
      }

      return chapters.filter(c => c.id && c.id.includes('chapter'));
    } catch (error) {
      console.error(`${this.name} Chapters Error:`, error.message);
      return [];
    }
  }

  async getPages(chapterUrl) {
    try {
      const { data } = await this.fetch(chapterUrl, {
        headers: { 'Referer': 'https://www.mangabats.com/' }
      });
      const $ = cheerio.load(data);
      return $('.container-chapter-reader img, .img-content img, #v_content img, .v-content img').map((i, el) => {
        return $(el).attr('src') || $(el).attr('data-src') || $(el).attr('data-original') || $(el).attr('lazy-src');
      }).get().filter(img => img && img.startsWith('http') && !img.includes('logo') && !img.includes('banner'));
    } catch (error) {
      console.error(`${this.name} Pages Error:`, error.message);
      return [];
    }
  }
}

module.exports = new Mangabat();
