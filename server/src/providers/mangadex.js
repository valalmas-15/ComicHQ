const axios = require('axios');
const BaseProvider = require('./baseProvider');

class MangaDex extends BaseProvider {
  constructor() {
    super("MangaDex", "https://mangadex.org");
    this.apiBase = "https://api.mangadex.org";
  }

  async search(query) {
    try {
      console.log(`📡 [MangaDex] Searching: ${query}`);
      const { data } = await axios.get(`${this.apiBase}/manga`, {
        params: {
          title: query,
          limit: 20,
          "contentRating[]": ["safe", "suggestive", "erotica"],
          "includes[]": ["cover_art", "author", "artist"],
          "order[relevance]": "desc"
        },
        headers: { 'User-Agent': 'Mozilla/5.0' }
      });
      
      if (!data || !data.data) return [];

      return data.data.map(manga => {
        const coverRel = manga.relationships.find(r => r.type === 'cover_art');
        const fileName = coverRel && coverRel.attributes ? coverRel.attributes.fileName : '';
        const thumbnail = fileName ? `https://uploads.mangadex.org/covers/${manga.id}/${fileName}.512.jpg` : null;
        
        const titleContent = manga.attributes.title.en || 
                             manga.attributes.title["ja-ro"] || 
                             Object.values(manga.attributes.title)[0] || 
                             "Unknown Title";

        const lang = manga.attributes.originalLanguage;
        let type = 'manga';
        if (lang === 'ko') type = 'manhwa';
        else if (lang === 'zh') type = 'manhua';

        return {
          title: titleContent,
          source_id: `https://mangadex.org/title/${manga.id}`,
          thumbnail,
          provider: this.name,
          type,
          latest_chapter: manga.attributes.lastChapter ? `Ch. ${manga.attributes.lastChapter}` : 'New'
        };
      });
    } catch (error) {
      console.error("❌ MangaDex Search Error:", error.message);
      return [];
    }
  }

  async getChapters(mangaUrl) {
    try {
      const mangaId = mangaUrl.match(/[a-f0-9-]{36}/i)?.[0];
      if (!mangaId) throw new Error("Invalid Manga ID");

      console.log(`📡 [MangaDex] Fetching chapters for: ${mangaId}`);
      
      // Try ID/EN first
      let response = await axios.get(`${this.apiBase}/manga/${mangaId}/feed`, {
        params: {
          limit: 500,
          "translatedLanguage[]": ["id", "en"],
          "order[chapter]": "desc",
          includeExternalUrl: 0
        },
        headers: { 'User-Agent': 'Mozilla/5.0' }
      });

      // If empty, try ALL languages
      if (!response.data || response.data.data.length === 0) {
        console.log(`📡 [MangaDex] No ID/EN chapters, trying all languages...`);
        response = await axios.get(`${this.apiBase}/manga/${mangaId}/feed`, {
            params: {
              limit: 500,
              "order[chapter]": "desc",
              includeExternalUrl: 0
            },
            headers: { 'User-Agent': 'Mozilla/5.0' }
        });
      }

      const { data } = response;
      if (!data || !data.data) return [];

      return data.data.map(c => {
        const chapter = c.attributes.chapter || "?";
        const title = c.attributes.title ? `: ${c.attributes.title}` : "";
        const langMap = {
            "id": "🇮🇩", "en": "🇬🇧", "ja": "🇯🇵", "ko": "🇰🇷", "zh": "🇨🇳",
            "pt-br": "🇧🇷", "es-la": "🇲🇽", "fr": "🇫🇷", "ru": "🇷🇺"
        };
        const lang = langMap[c.attributes.translatedLanguage] || `[${c.attributes.translatedLanguage.toUpperCase()}]`;
        
        return {
          id: c.id,
          title: `Ch. ${chapter}${title} ${lang}`,
          updated_at: new Date(c.attributes.readableAt).toLocaleDateString()
        };
      });
    } catch (error) {
      console.error("❌ MangaDex Chapters Error:", error.message);
      return [];
    }
  }

  async getPages(chapterId) {
    try {
      console.log(`📡 [MangaDex] Fetching pages for: ${chapterId}`);
      const { data } = await axios.get(`${this.apiBase}/at-home/server/${chapterId}`, {
        headers: { 'User-Agent': 'Mozilla/5.0' }
      });
      
      if (!data || !data.chapter) throw new Error("No chapter data");
      
      const { hash, data: images } = data.chapter;
      const baseUrl = data.baseUrl;
      
      return images.map(img => `${baseUrl}/data/${hash}/${img}`);
    } catch (error) {
      console.error("❌ MangaDex Pages Error:", error.message);
      return [];
    }
  }
}

module.exports = new MangaDex();
