const axios = require('./server/node_modules/axios');

async function discoverWestmangaSource() {
  const urls = [
    "https://westmanga.tv/contents?q=solo",
    "https://westmanga.tv/manga/solo-leveling",
    "https://westmanga.tv/api/v1/content?query=solo",
    "https://westmanga.tv/search/solo",
    "https://westmanga.tv/contents?q=solo&_data=root"
  ];
  
  for (const url of urls) {
    try {
      console.log(`📡 Testing URL: ${url}`);
      const { data, headers } = await axios.get(url, {
        headers: { 
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
            'Accept': 'application/json, text/html',
            'X-Requested-With': 'XMLHttpRequest'
        },
        timeout: 5000
      });
      console.log(`✅ Success! Type: ${headers['content-type']}, Length: ${data.length}`);
      if (typeof data === 'string' && data.includes('view/')) {
          console.log("📄 FOUND CHAPTERS IN HTML!");
      }
      if (typeof data === 'object') {
          console.log("📄 FOUND JSON DATA!");
          console.log(JSON.stringify(data).substring(0, 500));
      }
    } catch (e) {
      console.log(`❌ Failed: ${url} (${e.message})`);
    }
  }
}

discoverWestmangaSource();
