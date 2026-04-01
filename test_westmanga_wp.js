const axios = require('./server/node_modules/axios');

async function testWPMirrorSearch() {
  const url = "https://westmanga.org/?s=solo";
  console.log(`📡 Testing WP Mirror: ${url}`);
  try {
    const { data } = await axios.get(url, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36' }
    });
    console.log("📄 Success! Length:", data.length);
    if (data.includes('bsx') || data.includes('listupd')) {
        console.log("✅ FOUND WP SEARCH RESULTS!");
    } else {
        console.log("❌ No WP results found.");
    }
  } catch (e) {
    console.error("❌ Failed:", e.message);
  }
}

testWPMirrorSearch();
