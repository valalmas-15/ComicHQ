const axios = require('axios');
const cheerio = require('cheerio');

async function test() {
  try {
    const { data } = await axios.get('https://komiku.org/?post_type=manga&s=solo', { 
      headers: { 'User-Agent': 'Mozilla/5.0' } 
    });
    const $ = cheerio.load(data);
    console.log('--- Komiku Debug ---');
    console.log('BGE Items:', $('.bge').length);
    console.log('BGEI Items:', $('.bgei').length);
    console.log('Post Items:', $('.post-item').length);
    
    if ($('.bge').length > 0) {
       console.log('First Title:', $('.bge h3').first().text().trim());
    }
  } catch (e) {
    console.log('Error:', e.message);
  }
}
test();
