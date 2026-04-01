const axios = require('axios');
const cheerio = require('cheerio');

async function testDDG() {
  try {
    const { data } = await axios.get('https://html.duckduckgo.com/html/?q=site:softkomik.co+solo', {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
    });
    const $ = cheerio.load(data);
    const links = [];
    $('.result__url').each((i, el) => {
      links.push($(el).text().trim());
    });
    console.log('Results:', links);
  } catch (e) {
    console.log('Error:', e.message);
  }
}
testDDG();
