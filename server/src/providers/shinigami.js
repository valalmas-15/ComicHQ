const axios = require('axios');
const cheerio = require('cheerio');
const GenericWPProvider = require('./genericProvider');

class ShinigamiProvider extends GenericWPProvider {
  constructor() {
    super("Shinigami", "https://d.shinigami.asia", {});
    this.apiUrl = "https://api.shngm.io/v1";
    this.apiHeaders = {
      'Origin': 'https://d.shinigami.asia',
      'Referer': 'https://d.shinigami.asia/',
      'Accept': 'application/json, text/plain, */*',
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
    };
  }

  async search(query) {
    try {
      const { data: json } = await axios.get(`${this.apiUrl}/manga/list?q=${encodeURIComponent(query)}&page_size=30`, {
        headers: this.apiHeaders
      });

      if (json.retcode !== 0 || !json.data) return [];

      return json.data.map(item => ({
        title: item.title,
        source_id: item.manga_id, // Store Manga ID for API use
        thumbnail: item.cover_portrait_url || item.cover_image_url,
        provider: this.name,
        latest_chapter: item.latest_chapter_number ? `Chapter ${item.latest_chapter_number}` : '',
        type: (item.taxonomy?.Format?.[0]?.name || 'manga').toLowerCase()
      }));
    } catch (error) {
      console.error(`${this.name} API Search Error:`, error.message);
      return [];
    }
  }

  async getChapters(mangaId) {
    try {
      // If it's a full URL from old library, extract the ID or slug (but we prefer IDs now)
      // For now assume mangaId passed is the manga_id from search
      const { data: json } = await axios.get(`${this.apiUrl}/chapter/${mangaId}/list?page_size=500&sort_by=chapter_number&sort_order=desc`, {
        headers: this.apiHeaders
      });

      if (json.retcode !== 0 || !json.data) return [];

      return json.data.map(ch => ({
        id: ch.chapter_id,
        title: `Chapter ${ch.chapter_number}`,
        updated_at: new Date(ch.release_date).toLocaleDateString()
      }));
    } catch (e) { 
      console.error(`${this.name} API Chapters Error:`, e.message);
      return []; 
    }
  }

  async getPages(chapterId) {
    try {
      const { data: json } = await axios.get(`${this.apiUrl}/chapter/detail/${chapterId}`, {
        headers: this.apiHeaders
      });

      if (json.retcode !== 0 || !json.data) return [];

      const { base_url, chapter } = json.data;
      const path = chapter.path;
      
      return chapter.data.map(imgName => `${base_url}${path}${imgName}`);
    } catch (e) { 
      console.error(`${this.name} API Pages Error:`, e.message);
      return []; 
    }
  }
}

module.exports = new ShinigamiProvider();
