const axios = require('axios');
const cheerio = require('cheerio');
const BaseProvider = require('./baseProvider');
const qs = require('qs');

class Ikiru extends BaseProvider {
  constructor() {
    super("Ikiru", "https://02.ikiru.wtf");
  }

  async search(query) {
    try {
      // 1. Get the latest nonce from the homepage
      const homeRes = await axios.get(this.baseUrl, { 
        headers: { 'User-Agent': 'Mozilla/5.0' } 
      });
      const $home = cheerio.load(homeRes.data);
      const nonceMatch = homeRes.data.match(/nonce=([a-z0-9]+)/);
      const nonce = nonceMatch ? nonceMatch[1] : '7a8418890e'; // Fallback
      
      // 2. Perform the HTMX-style POST search
      const searchUrl = `${this.baseUrl}/wp-admin/admin-ajax.php?action=search&nonce=${nonce}`;
      const { data } = await axios.post(searchUrl, 
        qs.stringify({ query: query }),
        { 
          headers: { 
            'User-Agent': 'Mozilla/5.0',
            'Content-Type': 'application/x-www-form-urlencoded',
            'Referer': this.baseUrl,
            'HX-Request': 'true',
            'HX-Target': 'searchModalContent'
          }
        }
      );

      const $ = cheerio.load(data);
      const items = $('a[href*="/manga/"], a[href*="/series/"]').get();

      // 🧙‍♂️ Background Detail Fetching (Concurrent) for Flag and Chapter info
      return await Promise.all(items.map(async (el) => {
        const title = $(el).find('h3').text().trim();
        const href = $(el).attr('href');
        const img = $(el).find('img').first();
        const thumbnail = img.attr('src') || img.attr('data-src');

        if (!title || !href) return null;

        let type = 'manga';
        let latest_chapter = '';

        try {
          const { data: detailData } = await axios.get(href, { 
            headers: { 'User-Agent': 'Mozilla/5.0' },
            timeout: 5000 
          });
          const $detail = cheerio.load(detailData);
          
          // Detect Type
          const typeBox = $detail('div.flex.gap-2:contains("Type")').text().toLowerCase();
          if (typeBox.includes('manhwa')) type = 'manhwa';
          else if (typeBox.includes('manhua')) type = 'manhua';
          else if (typeBox.includes('manga')) type = 'manga';

          // Extract manga_id to get latest chapter via AJAX
          const hxGet = $detail('[hx-trigger="getChapterList"]').attr('hx-get');
          const idMatch = hxGet ? hxGet.match(/manga_id=([0-9]+)/) : detailData.match(/manga_id=([0-9]+)/);
          const mangaId = idMatch ? idMatch[1] : null;

          if (mangaId) {
            const ajaxUrl = `${this.baseUrl}/wp-admin/admin-ajax.php?action=chapter_list&manga_id=${mangaId}&page=1`;
            const { data: ajaxHtml } = await axios.get(ajaxUrl, { 
              headers: { 'User-Agent': 'Mozilla/5.0' },
              timeout: 3000
            });
            const $ajax = cheerio.load(ajaxHtml);
            const firstCh = $ajax('div.font-medium span').first().text().trim();
            if (firstCh) latest_chapter = firstCh.startsWith('Chapter') ? firstCh : `Chapter ${firstCh}`;
          }
        } catch (e) { }

        return {
          title: title.replace(/\s+/g, ' '),
          source_id: href,
          thumbnail,
          provider: this.name,
          latest_chapter,
          type
        };
      }));
    } catch (error) {
      console.error(`${this.name} Search Error:`, error.message);
      return [];
    }
  }

  async getChapters(mangaUrl) {
    try {
      // 1. Get the manga detail page to find the manga_id for AJAX
      const { data: html } = await axios.get(mangaUrl, { 
        headers: { 'User-Agent': 'Mozilla/5.0' } 
      });
      const $ = cheerio.load(html);
      
      // 2. Extract manga_id from hx-get="...manga_id=123..."
      const hxGet = $('[hx-trigger="getChapterList"]').attr('hx-get');
      const idMatch = hxGet ? hxGet.match(/manga_id=([0-9]+)/) : html.match(/manga_id=([0-9]+)/);
      const mangaId = idMatch ? idMatch[1] : null;

      if (!mangaId) {
         // Fallback to standard WP selection if no AJAX
         return $('.cl-item, .item-chapter').map((i, el) => {
           const a = $(el).find('a');
           return {
             id: a.attr('href'),
             title: $(el).text().trim().replace(/\s+/g, ' '),
             updated_at: $(el).find('.chapter-date').text().trim()
           };
         }).get().filter(c => c.id);
      }

      // 3. Fetch chapter list via AJAX
      const ajaxUrl = `https://02.ikiru.wtf/wp-admin/admin-ajax.php?action=chapter_list&manga_id=${mangaId}&page=1`;
      const { data: ajaxHtml } = await axios.get(ajaxUrl, { 
        headers: { 'User-Agent': 'Mozilla/5.0', 'Referer': mangaUrl } 
      });

      const $ajax = cheerio.load(ajaxHtml);
      return $ajax('a[href*="/chapter"]').map((i, el) => {
        const title = $(el).find('div.font-medium span').text().trim() || $(el).attr('data-chapter-number') || 'Chapter';
        const date = $(el).find('time').text().trim();

        return {
          id: $(el).attr('href'),
          title: title.startsWith('Chapter') ? title : `Chapter ${title}`,
          updated_at: date
        };
      }).get().filter(c => c.id && c.title);
    } catch (e) { 
      console.error(`${this.name} Chapters Error:`, e.message);
      return []; 
    }
  }

  async getPages(chapterUrl) {
     try {
       const { data } = await axios.get(chapterUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } });
       const $ = cheerio.load(data);
       // Selectors covering standard Madara, MangaStream, and Ikiru's custom Tailwind theme
       const selectors = '.w-full.flex-col.justify-center.items-center img, #readerarea img, .reading-content img, .page-break img';
       
       return $(selectors).map((i, el) => {
           return $(el).attr('src') || $(el).attr('data-src') || $(el).attr('data-lazy-src');
       }).get()
       .filter(Boolean)
       .filter(src => !src.includes('logo') && !src.includes('banner') && !src.endsWith('.gif'));
     } catch(e) { return []; }
  }
}

module.exports = new Ikiru();
