class BaseProvider {
  constructor(name, baseUrl) {
    this.name = name;
    this.baseUrl = baseUrl;
  }
  // Template yang wajib di-override di file ekstensi
  async search(query) { throw new Error("Search not implemented"); }
  async getChapters(mangaId) { throw new Error("Chapters not implemented"); }
  async getPages(chapterId) { throw new Error("Pages not implemented"); }
}
module.exports = BaseProvider;
