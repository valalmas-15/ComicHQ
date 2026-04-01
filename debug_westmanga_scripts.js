const axios = require('./server/node_modules/axios');

async function dumpScripts() {
  const url = "https://westmanga.tv/comic/solo-leveling/";
  try {
    const { data } = await axios.get(url, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36' }
    });
    console.log("📄 Raw Shell length:", data.length);
    const scriptCount = (data.match(/<script/g) || []).length;
    console.log("📄 Script count:", scriptCount);
    
    // Look for data objects like 'JSON.parse' or '__NEXT_DATA__' or 'manga'
    if (data.includes('JSON.parse')) console.log("✅ HTML contains 'JSON.parse'");
    if (data.includes('content')) console.log("✅ HTML contains 'content'");
    if (data.includes('images')) console.log("✅ HTML contains 'images'");
    
    // Find the longest script
    const scripts = data.match(/<script.*?>([\s\S]*?)<\/script>/g) || [];
    const longest = scripts.reduce((a, b) => a.length > b.length ? a : b, "");
    console.log("📄 Longest script size:", longest.length);
    console.log("📄 Longest script snippet:", longest.substring(0, 500));
  } catch (e) {
    console.error("❌ Failed:", e.message);
  }
}

dumpScripts();
