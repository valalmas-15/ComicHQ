const axios = require('axios');
const cheerio = require('cheerio');

async function debugWestmanga() {
  const url = "https://westmanga.tv/comic/solo-leveling/";
  console.log(`📡 Debugging: ${url}`);
  try {
    const { data } = await axios.get(url, {
      headers: { 
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
      }
    });

    console.log("📄 HTML Length:", data.length);
    console.log("📄 HTML Snippet (Start):", data.substring(0, 500));
    
    // Look for 'divide-y', 'data-slot', or any chapter-like link
    if (data.includes('divide-y')) console.log("✅ HTML contains 'divide-y'");
    if (data.includes('data-slot')) console.log("✅ HTML contains 'data-slot'");
    if (data.includes('solo-leveling-chapter')) console.log("✅ HTML contains 'solo-leveling-chapter'");
    
    const $ = cheerio.load(data);
    const links = $('a').map((i, el) => $(el).attr('href')).get();
    const chapterLink = links.find(l => l && l.includes('chapter'));
    console.log("🔗 Sample Chapter Link found:", chapterLink || "NOT FOUND");

  } catch (e) {
    console.error("❌ Failed:", e.message);
  }
}

debugWestmanga();
