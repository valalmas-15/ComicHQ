const axios = require('axios');
const cheerio = require('cheerio');

async function test() {
  const url = 'https://komiku.id/?s=solo';
  console.log('Fetching:', url);
  try {
    const { data } = await axios.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    const $ = cheerio.load(data);
    console.log('BGE Items:', $('.bge').length);
    if ($('.bge').length > 0) {
       console.log('Thumbnail 0:', $('.bge img').attr('src') || $('.bge img').attr('data-src'));
    }
  } catch (e) {
    console.log('Error:', e.message);
  }
}
test();
