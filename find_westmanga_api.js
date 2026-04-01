const axios = require('./server/node_modules/axios');

async function findWestmangaAPI() {
  const urls = [
    "https://mgcrs.erioos.com/manga/solo-leveling",
    "https://westmanga.tv/api/v1/content?slug=solo-leveling",
    "https://westmanga.tv/api/manga/solo-leveling",
    "https://westmanga.tv/comic/solo-leveling?_data=root",
    "https://westmanga.tv/comic/solo-leveling?_data=routes%2Fcomic.%24slug"
  ];
  
  for (const url of urls) {
    try {
      console.log(`📡 Testing: ${url}`);
      const { data } = await axios.get(url, {
        headers: { 
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
            'Accept': 'application/json'
        },
        timeout: 3000
      });
      if (data) {
        console.log(`✅ Success on: ${url}`);
        console.log("📄 Preview:", JSON.stringify(data).substring(0, 300));
        return;
      }
    } catch (e) {
      console.log(`❌ Failed: ${url} (${e.message})`);
    }
  }
}

findWestmangaAPI();
