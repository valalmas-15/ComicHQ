const axios = require('./server/node_modules/axios');

async function findWestmangaJSON() {
  const url = "https://westmanga.tv/contents?q=solo";
  const { data } = await axios.get(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36' }
  });
  
  console.log("📄 Shell length:", data.length);
  // Find strings like 'results' or 'items' or 'solo' inside JS scripts
  const scripts = data.match(/<script.*?>([\s\S]*?)<\/script>/g) || [];
  for (const s of scripts) {
      if (s.includes('solo')) {
          console.log("✅ Found 'solo' in a script tag!");
          console.log("📄 Snippet:", s.substring(s.indexOf('solo') - 50, s.indexOf('solo') + 100));
      }
  }
}
findWestmangaJSON();
