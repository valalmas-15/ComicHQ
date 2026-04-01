const Westmanga = require('./server/src/providers/westmanga');
const axios = require('./server/node_modules/axios');

async function debugHTML() {
  const url = "https://westmanga.tv/comic/solo-leveling/";
  console.log(`📡 Fetching RAW HTML from: ${url}`);
  try {
    const { data } = await axios.get(url, {
      headers: { 
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
      }
    });

    console.log("📄 Content found:", data.includes('view/solo-leveling') ? "✅ YES (Has Chapters)" : "❌ NO (Empty List/CSR)");
    if (!data.includes('view/solo-leveling')) {
        console.log("📄 Root div check:", data.includes('id="root"') ? "✅ 'root' div exists" : "❌ No 'root' div");
        console.log("📄 Snippet of div root:", data.substring(data.indexOf('<div id="root">'), data.indexOf('<div id="root">') + 200));
    }
  } catch (e) {
    console.error("❌ Failed:", e.message);
  }
}

debugHTML();
