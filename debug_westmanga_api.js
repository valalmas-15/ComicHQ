const Westmanga = require('./server/src/providers/westmanga');
const axios = require('./server/node_modules/axios');

async function testAPI() {
  const slug = "solo-leveling";
  const url = `https://mgcrs.erioos.com/manga/${slug}`; // My guess
  console.log(`📡 Fetching API Guess: ${url}`);
  try {
    const { data } = await axios.get(url, {
      headers: { 
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
        'Origin': 'https://westmanga.tv',
        'Referer': 'https://westmanga.tv/'
      }
    });

    console.log("📄 API Success! Preview:", JSON.stringify(data).substring(0, 500));
  } catch (e) {
    console.error("❌ Failed API Guess (Manga):", e.message);
  }
}

testAPI();
