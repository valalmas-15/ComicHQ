const axios = require('axios');
const { SocksProxyAgent } = require('socks-proxy-agent');

class BaseProvider {
  constructor(name, baseUrl) {
    this.name = name;
    this.baseUrl = baseUrl;
    
    const proxyUrl = process.env.SOCKS_PROXY_URL;
    this.proxyAgent = proxyUrl ? new SocksProxyAgent(proxyUrl) : null;
  }

  async fetch(url, options = {}) {
    const config = {
      ...options,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
        ...options.headers
      }
    };

    if (this.proxyAgent) {
      config.httpAgent = this.proxyAgent;
      config.httpsAgent = this.proxyAgent;
    }

    return axios.get(url, config);
  }

  // Template yang wajib di-override di file ekstensi
  async search(query) { throw new Error("Search not implemented"); }
  async getChapters(mangaId) { throw new Error("Chapters not implemented"); }
  async getPages(chapterId) { throw new Error("Pages not implemented"); }
}
module.exports = BaseProvider;
