const axios = require('axios');

const mirrors = [
  "https://manganato.com",
  "https://chapmanganato.to",
  "https://readmanganato.info",
  "https://readmangabat.com",
  "https://mangabat.com",
  "https://m.mangabat.com",
  "https://www.mangabats.com"
];

async function testMirrors() {
  for (const m of mirrors) {
    try {
      console.log(`Testing ${m}...`);
      const res = await axios.get(m, { 
        headers: { 'User-Agent': 'Mozilla/5.0' },
        timeout: 5000 
      });
      console.log(`  OK (${res.status}) - Title contains: ${res.data.includes('<title>') ? res.data.match(/<title>(.*?)<\/title>/)[1] : 'unknown'}`);
    } catch (e) {
      console.log(`  Failed: ${e.message}`);
    }
  }
}

testMirrors();
